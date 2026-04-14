import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, Heart } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import { ResourceMarketDetailShell } from '../../components/market';
import { AgentReviews } from './AgentReviews';
import { buildPath } from '../../constants/consoleRoutes';
import { agentService } from '../../api/services/agent.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { invokeService } from '../../api/services/invoke.service';
import type { Agent } from '../../types/dto/agent';
import type { ResourceBindingSummaryVO } from '../../types/dto/catalog';
import { BindingClosureSection } from '../../components/business/BindingClosureSection';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, techBadge } from '../../utils/uiClasses';
import { MarkdownView } from '../../components/common/MarkdownView';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

export interface AgentMarketDetailPageProps {
  resourceId: string;
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onNavigateToList: () => void;
}

type AgentTestMode = 'gateway' | 'native';

function agentTrailingIcon(agent: Agent, isDark: boolean): React.ReactNode {
  const raw = agent.icon?.trim() || '';
  if (/^https?:\/\//i.test(raw)) {
    return (
      <img src={raw} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-black/10" loading="lazy" />
    );
  }
  const emoji = raw || '🤖';
  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl leading-none ${
        isDark ? 'bg-white/[0.06]' : 'bg-slate-100'
      }`}
    >
      {emoji}
    </div>
  );
}

function tryParseObject(
  text: string,
): { ok: true; data: Record<string, unknown>; message: '' } | { ok: false; data?: undefined; message: string } {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: 'JSON 必须是对象。' };
    }
    return { ok: true, data: parsed as Record<string, unknown>, message: '' };
  } catch {
    return { ok: false, message: 'JSON 格式不合法。' };
  }
}

function buildNativePayload(registrationProtocol: string, modelAlias: string): Record<string, unknown> {
  const prompt = 'hello';
  const normalizedProtocol = registrationProtocol.trim().toLowerCase();
  if (normalizedProtocol === 'bailian_compatible') {
    return {
      customized_model_id: modelAlias,
      input: [
        {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt,
            },
          ],
        },
      ],
      stream: false,
    };
  }
  if (normalizedProtocol === 'anthropic_messages') {
    return {
      model: modelAlias,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };
  }
  if (normalizedProtocol === 'gemini_generatecontent') {
    return {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };
  }
  if (normalizedProtocol === 'openai_compatible') {
    return {
      model: modelAlias,
      input: [
        {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt,
            },
          ],
        },
      ],
      stream: false,
    };
  }
  return {
    input: prompt,
  };
}

export const AgentMarketDetailPage: React.FC<AgentMarketDetailPageProps> = ({
  resourceId,
  theme,
  fontSize,
  themeColor: _themeColor,
  showMessage,
  onNavigateToList,
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [agent, setAgent] = useState<Agent | null>(null);
  const [bindingClosure, setBindingClosure] = useState<ResourceBindingSummaryVO[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tab, setTab] = useState<'intro' | 'capability' | 'reviews'>('intro');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();
  const [testMode, setTestMode] = useState<AgentTestMode>('gateway');
  const [gatewayPayloadText, setGatewayPayloadText] = useState('{\n  "input": "hello"\n}');
  const [gatewayTimeoutSec, setGatewayTimeoutSec] = useState(30);
  const [gatewayTraceId, setGatewayTraceId] = useState(() => `agent-${Date.now()}`);
  const [nativeBodyText, setNativeBodyText] = useState('{\n  "input": "hello"\n}');
  const [testingNow, setTestingNow] = useState(false);
  const [testResultText, setTestResultText] = useState('');
  const [testErrorText, setTestErrorText] = useState('');
  const [testStatusCode, setTestStatusCode] = useState<number | null>(null);
  const [testLatencyMs, setTestLatencyMs] = useState<number | null>(null);

  const WS_KEY = 'lantu_workspace_agents';
  const [workspaceAgents, setWorkspaceAgents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(WS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isInWorkspace = useCallback((id: string) => workspaceAgents.includes(id), [workspaceAgents]);

  const load = useCallback(async () => {
    const id = Number(resourceId);
    if (!Number.isFinite(id)) {
      setError(new Error('无效的智能体 ID'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, detail] = await Promise.all([
        agentService.getById(id),
        resourceCatalogService.getByTypeAndId('agent', String(id), 'closure').catch(() => null),
      ]);
      setAgent(data);
      setBindingClosure(detail?.bindingClosure);
    } catch (e) {
      setAgent(null);
      setBindingClosure(undefined);
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const author = useMemo(() => {
    if (!agent) return '';
    return (
      agent.createdByName?.trim()
      || (agent.createdBy != null ? `用户 #${agent.createdBy}` : '')
      || (agent.sourceType === 'internal' ? '校内团队' : agent.sourceType === 'partner' ? '合作伙伴' : '云服务')
    );
  }, [agent]);

  const ratingStr = useMemo(() => {
    if (!agent) return '—';
    if (agent.ratingAvg != null && Number.isFinite(agent.ratingAvg)) return agent.ratingAvg.toFixed(1);
    if (agent.qualityScore > 0) return (agent.qualityScore / 20).toFixed(1);
    return '—';
  }, [agent]);

  const usageLabel = useMemo(() => {
    if (!agent) return '0';
    return agent.callCount > 1000 ? `${(agent.callCount / 1000).toFixed(1)}K` : String(agent.callCount);
  }, [agent]);

  const tags = useMemo(() => {
    if (!agent) return [] as string[];
    return agent.tags?.length
      ? [...agent.tags]
      : agent.categoryName
        ? [agent.categoryName, agent.agentType]
        : [agent.agentType];
  }, [agent]);

  const registrationProtocol = useMemo(() => {
    if (!agent) return '';
    const raw = agent.specJson?.registrationProtocol;
    return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  }, [agent]);

  const modelAlias = useMemo(() => {
    if (!agent) return '';
    const raw = agent.specJson?.modelAlias;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return agent.agentName?.trim() || String(agent.id);
  }, [agent]);

  const upstreamEndpoint = useMemo(() => {
    if (!agent) return '';
    const raw = agent.endpoint || agent.specJson?.upstreamEndpoint || agent.specJson?.endpoint;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [agent]);

  const supportsNativeResponses = true;

  useEffect(() => {
    if (!agent) return;
    setNativeBodyText(JSON.stringify(buildNativePayload(registrationProtocol, modelAlias), null, 2));
  }, [agent, modelAlias, registrationProtocol]);

  const runGatewayInvokeTest = useCallback(async () => {
    if (!agent) return;
    const apiKey = gatewayApiKeyDraft.trim();
    if (!apiKey) {
      setTestErrorText('请先输入有效 X-Api-Key（需要 resolve + invoke scope）。');
      return;
    }
    const parsedPayload = tryParseObject(gatewayPayloadText);
    if (!parsedPayload.ok) {
      setTestErrorText(`统一 invoke payload 错误：${parsedPayload.message}`);
      return;
    }

    const timeout = Math.max(1, Math.min(120, Number(gatewayTimeoutSec) || 30));
    const traceId = gatewayTraceId.trim() || `agent-${Date.now()}`;
    const startedAt = Date.now();
    let stage: 'resolve' | 'invoke' = 'resolve';

    try {
      const resolved = await resourceCatalogService.resolve(
        { resourceType: 'agent', resourceId: String(agent.id) },
        { headers: { 'X-Api-Key': apiKey } },
      );
      stage = 'invoke';
      const invokeRes = await invokeService.invoke(
        {
          resourceType: 'agent',
          resourceId: String(agent.id),
          version: resolved.version || undefined,
          timeoutSec: timeout,
          payload: parsedPayload.data,
        },
        apiKey,
        traceId,
      );
      setTestStatusCode(Number(invokeRes.statusCode) || null);
      setTestLatencyMs(Number(invokeRes.latencyMs) || (Date.now() - startedAt));
      setTestResultText(invokeRes.body || '');
      showMessage('统一 invoke 调用完成', 'success');
    } catch (err) {
      setTestErrorText(mapInvokeFlowError(err, stage));
    }
  }, [agent, gatewayApiKeyDraft, gatewayPayloadText, gatewayTimeoutSec, gatewayTraceId, showMessage]);

  const runNativeResponsesTest = useCallback(async () => {
    if (!agent) return;
    const parsedBody = tryParseObject(nativeBodyText);
    if (!parsedBody.ok) {
      setTestErrorText(`协议原生请求体错误：${parsedBody.message}`);
      return;
    }

    const apiKey = gatewayApiKeyDraft.trim();
    if (!apiKey) {
      setTestErrorText('请先输入有效 X-Api-Key（需要 resolve + invoke scope）');
      return;
    }

    const nativePayload = { ...parsedBody.data };
    if (!nativePayload.model && modelAlias) {
      nativePayload.model = modelAlias;
    }
    if (!nativePayload.customized_model_id && registrationProtocol === 'bailian_compatible' && modelAlias) {
      nativePayload.customized_model_id = modelAlias;
    }

    const startedAt = Date.now();
    try {
      const resolved = await resourceCatalogService.resolve(
        { resourceType: 'agent', resourceId: String(agent.id) },
        { headers: { 'X-Api-Key': apiKey } },
      );
      const invokeRes = await invokeService.invoke(
        {
          resourceType: 'agent',
          resourceId: String(agent.id),
          version: resolved.version || undefined,
          timeoutSec: 30,
          payload: nativePayload,
        },
        apiKey,
        `native-${Date.now()}`,
      );
      setTestStatusCode(Number(invokeRes.statusCode) || null);
      setTestLatencyMs(Date.now() - startedAt);
      setTestResultText(invokeRes.body || '');
      if (Number(invokeRes.statusCode) >= 400) {
        setTestErrorText(`协议原生请求失败（HTTP ${invokeRes.statusCode}）`);
        return;
      }
      showMessage('协议原生请求完成', 'success');
    } catch (err) {
      setTestErrorText(err instanceof Error ? err.message : '协议原生请求失败');
    }
  }, [agent, nativeBodyText, modelAlias, gatewayApiKeyDraft, registrationProtocol, showMessage]);

  const runInlineTest = useCallback(async () => {
    setTestingNow(true);
    setTestErrorText('');
    setTestResultText('');
    setTestStatusCode(null);
    setTestLatencyMs(null);
    try {
      if (testMode === 'native' && supportsNativeResponses) {
        await runNativeResponsesTest();
      } else {
        await runGatewayInvokeTest();
      }
    } finally {
      setTestingNow(false);
    }
  }, [testMode, supportsNativeResponses, runNativeResponsesTest, runGatewayInvokeTest]);

  const addToWorkspace = async () => {
    if (!agent || isInWorkspace(String(agent.id))) return;
    setAdding(true);
    try {
      const { userActivityService } = await import('../../api/services/user-activity.service');
      await userActivityService.addFavorite('agent', Number(agent.id));
      setWorkspaceAgents((prev) => {
        const next = [...prev, String(agent.id)];
        try {
          localStorage.setItem(WS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showMessage(`已收藏「${agent.displayName}」`, 'success');
      setConfirmOpen(false);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '收藏失败', 'error');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <PageSkeleton type="detail" />;
  }
  if (error || !agent) {
    return (
      <div className="px-4 py-8">
        <PageError error={error ?? new Error('未找到智能体')} onRetry={() => void load()} retryLabel="重试" />
        <button type="button" className={`mt-4 ${btnSecondary(theme)}`} onClick={onNavigateToList}>
          返回市场
        </button>
      </div>
    );
  }

  const idStr = String(agent.id);

  return (
    <>
      <ResourceMarketDetailShell
        theme={theme}
        onBack={onNavigateToList}
        backLabel="返回智能体市场"
        titleBlock={(
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            {agentTrailingIcon(agent, isDark)}
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{agent.displayName}</h1>
              <div className={`flex flex-wrap items-center gap-2 text-xs ${textMuted(theme)}`}>
                <span>{author}</span>
                <span className="inline-flex items-center gap-0.5">
                  <Star size={12} className="fill-amber-500 text-amber-500" aria-hidden />
                  {ratingStr}
                </span>
                <span>{Math.max(0, Math.floor(Number(agent.reviewCount ?? 0)) || 0)} 条评价</span>
                <span>{usageLabel} 次调用</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className={techBadge(theme)}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        headerActions={(
          <>
            <button
              type="button"
              className={`${btnPrimary} min-h-11 ${isInWorkspace(idStr) ? 'cursor-not-allowed opacity-50' : ''}`}
              disabled={isInWorkspace(idStr)}
              onClick={() => !isInWorkspace(idStr) && setConfirmOpen(true)}
            >
              <Heart size={16} className={`shrink-0 ${isInWorkspace(idStr) ? 'fill-current' : ''}`} aria-hidden />
              {isInWorkspace(idStr) ? '已收藏' : '收藏'}
            </button>
          </>
        )}
        tabs={[
          { id: 'intro', label: '智能体介绍' },
          { id: 'capability', label: '能力说明' },
          { id: 'reviews', label: '评分评论', badge: Math.max(0, Math.floor(Number(agent.reviewCount ?? 0)) || 0) },
        ]}
        activeTabId={tab}
        onTabChange={(id) => setTab(id as 'intro' | 'capability' | 'reviews')}
        mainColumn={(
          <div
            className={`rounded-[28px] border p-6 shadow-[var(--shadow-card)] ${
              isDark ? 'border-white/10 bg-lantu-elevated' : 'border-transparent bg-white'
            }`}
          >
            {tab === 'intro' ? (
              <div className="space-y-4">
                {agent.serviceDetailMd?.trim() ? (
                  <MarkdownView value={agent.serviceDetailMd} className="text-sm" />
                ) : (
                  <p className={`text-sm ${textMuted(theme)}`}>
                    暂无详细介绍；资源所有方可在「资源注册」中填写「智能体介绍」，正文支持 Markdown。
                  </p>
                )}
                <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{agent.description || '暂无描述'}</p>
              </div>
            ) : tab === 'capability' ? (
              <div className="space-y-4">
                <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>
                  {agent.systemPrompt
                    ? (
                      <>
                        <span className={`font-semibold ${textPrimary(theme)}`}>系统提示（节选）</span>
                        <span className="mt-2 block whitespace-pre-wrap">{agent.systemPrompt}</span>
                      </>
                    )
                    : '该智能体未公开系统提示；接入与调用说明见 API 文档或资源详情。'}
                </p>
              </div>
            ) : (
              <AgentReviews agentId={Number(agent.id)} theme={theme} fontSize={fontSize} showMessage={showMessage} />
            )}
          </div>
        )}
        sidebarColumn={(
          <div
            className={`space-y-4 rounded-[28px] border p-5 shadow-[var(--shadow-card)] ${
              isDark ? 'border-white/10 bg-lantu-elevated' : 'border-transparent bg-white'
            }`}
          >
            <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>内置测试</h3>
            <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
              详情页直接测试智能体。统一 invoke 需要 X-Api-Key；协议原生模式会按注册协议生成请求体后再走网关。
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`${btnSecondary(theme)} ${testMode === 'gateway' ? 'ring-2 ring-sky-500/35' : ''}`}
                onClick={() => setTestMode('gateway')}
              >
                统一 invoke
              </button>
              <button
                type="button"
                className={`${btnSecondary(theme)} ${testMode === 'native' ? 'ring-2 ring-sky-500/35' : ''}`}
                onClick={() => setTestMode('native')}
                title="协议原生"
              >
                协议原生
              </button>
            </div>

            {testMode === 'gateway' ? (
              <div className="space-y-2">
                <label className={`block text-xs font-medium ${textSecondary(theme)}`}>X-Api-Key</label>
                <input
                  type="password"
                  value={gatewayApiKeyDraft}
                  onChange={(e) => setGatewayApiKeyDraft(e.target.value)}
                  className={nativeInputClass(theme)}
                  placeholder="nx-sk-..."
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block text-xs font-medium ${textSecondary(theme)}`}>Timeout(s)</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={gatewayTimeoutSec}
                      onChange={(e) => setGatewayTimeoutSec(Number(e.target.value) || 30)}
                      className={nativeInputClass(theme)}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${textSecondary(theme)}`}>TraceId</label>
                    <input
                      type="text"
                      value={gatewayTraceId}
                      onChange={(e) => setGatewayTraceId(e.target.value)}
                      className={nativeInputClass(theme)}
                    />
                  </div>
                </div>
                <label className={`block text-xs font-medium ${textSecondary(theme)}`}>Payload(JSON)</label>
                <AutoHeightTextarea
                  value={gatewayPayloadText}
                  onChange={(e) => setGatewayPayloadText(e.target.value)}
                  minRows={6}
                  maxRows={24}
                  className={`${nativeInputClass(theme)} font-mono text-xs`}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className={`text-xs ${textMuted(theme)}`}>
                  协议：<code className="font-mono">{registrationProtocol || 'unknown'}</code>，
                  上游：<code className="font-mono break-all">{upstreamEndpoint || '-'}</code>，
                  默认模型：<code className="font-mono">{modelAlias || '-'}</code>
                </p>
                <label className={`block text-xs font-medium ${textSecondary(theme)}`}>Request Body(JSON)</label>
                <AutoHeightTextarea
                  value={nativeBodyText}
                  onChange={(e) => setNativeBodyText(e.target.value)}
                  minRows={8}
                  maxRows={26}
                  className={`${nativeInputClass(theme)} font-mono text-xs`}
                />
              </div>
            )}

            <button
              type="button"
              className={`${btnPrimary} inline-flex w-full min-h-11 items-center justify-center gap-2`}
              onClick={() => void runInlineTest()}
              disabled={testingNow}
            >
              <Play size={14} aria-hidden />
              {testingNow ? '测试中...' : '执行测试'}
            </button>

            {testErrorText ? (
              <div className={`rounded-xl border px-3 py-2 text-xs ${isDark ? 'border-rose-500/25 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
                {testErrorText}
              </div>
            ) : null}

            {testResultText ? (
              <div className={`space-y-1 rounded-xl border px-3 py-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'}`}>
                <div className={`text-xs ${textMuted(theme)}`}>
                  {testStatusCode != null ? `HTTP ${testStatusCode}` : 'Response'}
                  {testLatencyMs != null ? ` · ${testLatencyMs}ms` : ''}
                </div>
                <pre className={`max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{testResultText}</pre>
              </div>
            ) : null}

            <button
              type="button"
              className={`${btnSecondary(theme)} inline-flex w-full min-h-11 items-center justify-center gap-2`}
              onClick={() => navigate(buildPath('user', 'my-favorites'))}
            >
              <Heart size={14} aria-hidden />
              我的收藏
            </button>
            <button
              type="button"
              className={`${btnPrimary} inline-flex w-full min-h-11 items-center justify-center`}
              onClick={() => navigate(buildPath('user', 'developer-docs'))}
            >
              打开 API 文档
            </button>
            <BindingClosureSection theme={theme} currentResourceId={idStr} items={bindingClosure} />
          </div>
        )}
      />

      {confirmOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            className={`max-w-md rounded-2xl border p-6 shadow-[var(--shadow-modal)] ${isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-add-title"
          >
            <h2 id="confirm-add-title" className={`text-lg font-bold ${textPrimary(theme)}`}>
              确认收藏
            </h2>
            <p className={`mt-2 text-sm ${textSecondary(theme)}`}>
              确认收藏「{agent.displayName}」？
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={btnSecondary(theme)} onClick={() => setConfirmOpen(false)}>
                取消
              </button>
              <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={adding} onClick={() => void addToWorkspace()}>
                {adding ? '处理中...' : '确认收藏'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
