import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Clock,
  Heart,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Skill } from '../../types/dto/skill';
import type { AgentType, SourceType } from '../../types/dto/agent';
import { skillService } from '../../api/services/skill.service';
import { userActivityService } from '../../api/services/user-activity.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import type { ResourceBindingSummaryVO } from '../../types/dto/catalog';
import { BindingClosureSection } from '../../components/business/BindingClosureSection';
import { invokeService } from '../../api/services/invoke.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { isHostedSkill } from '../../utils/skillExecutionMode';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, techBadge } from '../../utils/uiClasses';
import { ResourceMarketDetailShell } from '../../components/market';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { Modal } from '../../components/common/Modal';
import { GatewayApiKeyInput } from '../../components/common/GatewayApiKeyInput';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { MarkdownView } from '../../components/common/MarkdownView';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

const TYPE_BADGE: Record<AgentType, { label: string; cls: string }> = {
  mcp: { label: 'MCP', cls: 'text-neutral-900 bg-neutral-900/10' },
  http_api: { label: 'HTTP API', cls: 'text-neutral-800 bg-neutral-800/10' },
  builtin: { label: '内置', cls: 'text-neutral-700 bg-neutral-700/10' },
  hosted_skill: { label: '托管技能', cls: 'text-fuchsia-900 bg-fuchsia-500/15 dark:text-fuchsia-200 dark:bg-fuchsia-500/20' },
};
const SOURCE_BADGE: Record<SourceType, { label: string; cls: string }> = {
  internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' },
  partner: { label: '合作方', cls: 'text-neutral-900 bg-neutral-900/10' },
  cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' },
};
const ICON_COLORS = ['bg-neutral-900', 'bg-neutral-800', 'bg-neutral-700', 'bg-stone-800', 'bg-zinc-800', 'bg-neutral-600', 'bg-slate-800', 'bg-neutral-950'];
function pickColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return ICON_COLORS[Math.abs(h) % ICON_COLORS.length];
}
function formatLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}
function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export interface SkillMarketDetailPageProps {
  resourceId: string;
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigateToList: () => void;
}

export const SkillMarketDetailPage: React.FC<SkillMarketDetailPageProps> = ({
  resourceId,
  theme,
  fontSize: _fontSize,
  themeColor: _themeColor,
  showMessage,
  onNavigateToList,
}) => {
  const isDark = theme === 'dark';
  const [skill, setSkill] = useState<Skill | null>(null);
  const [bindingClosure, setBindingClosure] = useState<ResourceBindingSummaryVO[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tab, setTab] = useState<'intro' | 'files' | 'reviews'>('intro');
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [useOpen, setUseOpen] = useState(false);
  const [useLoading, setUseLoading] = useState(false);
  const [useResult, setUseResult] = useState<string | null>(null);
  const [hostedInvokePayload, setHostedInvokePayload] = useState('{}');
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();

  const load = useCallback(async () => {
    const id = Number(resourceId);
    if (!Number.isFinite(id)) {
      setError(new Error('无效的技能 ID'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, detail] = await Promise.all([
        skillService.getById(id),
        resourceCatalogService.getByTypeAndId('skill', String(id), 'closure').catch(() => null),
      ]);
      setSkill(data);
      setBindingClosure(detail?.bindingClosure);
    } catch (e) {
      setSkill(null);
      setBindingClosure(undefined);
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFavorite = useCallback(async () => {
    if (!skill || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      await userActivityService.addFavorite('skill', Number(skill.id));
      showMessage?.('已加入我的收藏', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : '收藏失败';
      if (message.includes('FAVORITE_EXISTS') || message.includes('已收藏')) {
        showMessage?.('该资源已在收藏夹中', 'info');
      } else {
        showMessage?.(message, 'error');
      }
    } finally {
      setFavoriteLoading(false);
    }
  }, [skill, favoriteLoading, showMessage]);

  const handleExecute = useCallback(async () => {
    if (!skill) return;
    setUseLoading(true);
    setUseResult(null);
    const apiKey = gatewayApiKeyDraft.trim();
    if (!apiKey) {
      setUseResult('请先填写并绑定有效的 X-Api-Key（创建 Key 时的完整 secretPlain）');
      setUseLoading(false);
      return;
    }
    try {
      if (!isHostedSkill(skill)) {
        setUseResult('平台技能已统一为托管（hosted）执行，请刷新页面后重试。');
        return;
      }
      let payload: Record<string, unknown> = {};
      try {
        payload = hostedInvokePayload.trim() ? (JSON.parse(hostedInvokePayload) as Record<string, unknown>) : {};
        if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
          setUseResult('请求体须为 JSON 对象');
          return;
        }
      } catch {
        setUseResult('请求体须为合法 JSON');
        return;
      }
      try {
        const result = await invokeService.invoke(
          { resourceType: 'skill', resourceId: String(skill.id), payload },
          apiKey,
        );
        setUseResult(result.body ?? JSON.stringify(result, null, 2));
      } catch (err) {
        setUseResult(mapInvokeFlowError(err, 'invoke'));
      }
    } catch (e) {
      setUseResult(`操作失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setUseLoading(false);
    }
  }, [skill, gatewayApiKeyDraft, hostedInvokePayload]);

  if (loading) return <PageSkeleton type="detail" />;
  if (error || !skill) {
    return (
      <div className="px-4 py-8">
        <PageError error={error ?? new Error('未找到技能')} onRetry={() => void load()} retryLabel="重试" />
        <button type="button" className={`mt-4 ${btnSecondary(theme)}`} onClick={onNavigateToList}>
          返回市场
        </button>
      </div>
    );
  }

  return (
    <>
      <ResourceMarketDetailShell
        theme={theme}
        onBack={onNavigateToList}
        backLabel="返回技能市场"
        titleBlock={(
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${pickColor(skill.agentName)}`}>
              {(skill.displayName || skill.agentName).charAt(0)}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{skill.displayName}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`font-mono ${textMuted(theme)}`}>{skill.agentName}</span>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-fuchsia-900 bg-fuchsia-500/15 dark:text-fuchsia-200 dark:bg-fuchsia-500/20">
                  {TYPE_BADGE.hosted_skill.label}
                </span>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE[skill.sourceType].cls}`}>
                  {SOURCE_BADGE[skill.sourceType].label}
                </span>
              </div>
            </div>
          </div>
        )}
        headerActions={(
          <>
            <button
              type="button"
              className={`${btnSecondary(theme)} min-h-11`}
              disabled={favoriteLoading}
              onClick={() => void handleFavorite()}
            >
              {favoriteLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  收藏中…
                </>
              ) : (
                <>
                  <Heart size={14} />
                  收藏
                </>
              )}
            </button>
            <button
              type="button"
              className={`${btnPrimary} min-h-11`}
              onClick={() => {
                setUseOpen(true);
                setUseResult(null);
                setHostedInvokePayload('{}');
              }}
            >
              <Sparkles size={16} className="shrink-0" aria-hidden />
              试用 invoke
            </button>
          </>
        )}
        tabs={[
          { id: 'intro', label: '技能介绍' },
          { id: 'files', label: '参数与 Schema' },
          { id: 'reviews', label: '评分评论', badge: Number(skill.reviewCount ?? 0) },
        ]}
        activeTabId={tab}
        onTabChange={(id) => setTab(id as 'intro' | 'files' | 'reviews')}
        mainColumn={(
          <div
            className={`rounded-[28px] border p-6 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.02)] ${
              isDark ? 'border-white/10 bg-lantu-elevated' : 'border-transparent bg-white'
            }`}
          >
            {tab === 'intro' ? (
              <div className="space-y-4">
                {skill.serviceDetailMd?.trim() ? (
                  <MarkdownView value={skill.serviceDetailMd} className="text-sm" />
                ) : (
                  <p className={`text-sm ${textMuted(theme)}`}>
                    暂无详细介绍；资源所有方可在「资源注册」中填写「技能介绍」，正文支持 Markdown。
                  </p>
                )}
                <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{skill.description || '暂无描述'}</p>
                <div className={`flex flex-wrap gap-3 text-xs ${textMuted(theme)}`}>
                  <span>
                    创建者：
                    {resolvePersonDisplay({ names: [skill.createdByName], ids: [skill.createdBy ?? undefined] })}
                  </span>
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    <Star size={13} className="shrink-0 text-amber-500" aria-hidden />
                    目录评分
                    {' '}
                    {skill.ratingAvg != null ? skill.ratingAvg.toFixed(1) : '—'}
                    （
                    {skill.reviewCount ?? 0}
                    {' '}
                    条）
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity size={13} />
                    {formatCount(skill.callCount)}
                    {' '}
                    热度
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    {formatLatency(skill.avgLatencyMs)}
                  </span>
                  {skill.successRate > 0 && <span className="text-emerald-500">{skill.successRate}% 成功率</span>}
                  {skill.qualityScore > 0 && (
                    <span>
                      评分:
                      {skill.qualityScore}
                    </span>
                  )}
                  <span className="text-fuchsia-600 dark:text-fuchsia-300">平台托管 LLM · POST /invoke</span>
                  {skill.createTime && <span>创建: {formatDateTime(skill.createTime)}</span>}
                </div>
                {(skill.tags ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(skill.tags ?? []).map((tg) => (
                      <span key={tg} className={techBadge(theme)}>
                        {tg}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : tab === 'files' ? (
              <div className="space-y-4">
                <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>
                  平台技能均为托管执行，无本地 zip 制品；目录 spec 中含 <span className="font-mono text-xs">executionMode</span>、
                  <span className="font-mono text-xs">parametersSchema</span>、
                  <span className="font-mono text-xs">outputSchema</span>（若有）等。调用请使用顶部「试用 invoke」或{' '}
                  <span className="font-mono text-xs">POST /invoke</span>。
                </p>
                <div
                  className={`space-y-3 rounded-2xl border p-4 text-sm ${
                    isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
                  }`}
                >
                  <h4 className={`font-semibold ${textPrimary(theme)}`}>目录 spec 摘录</h4>
                  <pre
                    className={`max-h-64 overflow-auto rounded-lg p-3 text-xs ${
                      isDark ? 'bg-black/30 text-slate-200' : 'bg-white text-slate-800'
                    }`}
                  >
                    {JSON.stringify(skill.specJson ?? {}, null, 2)}
                  </pre>
                </div>
                {skill.parametersSchema && Object.keys(skill.parametersSchema).length > 0 ? (
                  <div
                    className={`space-y-2 rounded-2xl border p-4 text-sm ${
                      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
                    }`}
                  >
                    <h4 className={`font-semibold ${textPrimary(theme)}`}>parametersSchema</h4>
                    <pre
                      className={`max-h-48 overflow-auto rounded-lg p-3 text-xs ${
                        isDark ? 'bg-black/30 text-slate-200' : 'bg-white text-slate-800'
                      }`}
                    >
                      {JSON.stringify(skill.parametersSchema, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className={`flex items-center gap-2 text-base font-bold ${textPrimary(theme)}`}>
                  <MessageSquare size={18} className="text-neutral-800 dark:text-neutral-200" aria-hidden />
                  评分与评论
                </h3>
                <ResourceReviewsSection targetType="skill" targetId={skill.id} theme={theme} showMessage={showMessage} />
              </div>
            )}
          </div>
        )}
        sidebarColumn={(
          <div
            className={`space-y-3 rounded-[28px] border p-5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.02)] ${
              isDark ? 'border-white/10 bg-lantu-elevated' : 'border-transparent bg-white'
            }`}
          >
            <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>试用托管 invoke</h3>
            <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
              托管技能走 POST /invoke；须 X-Api-Key 含 invoke scope。也可点击顶部按钮打开对话框。
            </p>
            <button
              type="button"
              className={`${btnPrimary} w-full min-h-11 justify-center`}
              onClick={() => {
                setUseOpen(true);
                setUseResult(null);
                setHostedInvokePayload('{}');
              }}
            >
              打开 invoke 对话框
            </button>
            <BindingClosureSection theme={theme} currentResourceId={String(skill.id)} items={bindingClosure} />
          </div>
        )}
      />

      <Modal
        open={useOpen}
        onClose={() => setUseOpen(false)}
        title={`托管 invoke — ${skill.displayName}`}
        theme={theme}
        size="md"
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setUseOpen(false)}>
              关闭
            </button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={useLoading} onClick={() => void handleExecute()}>
              {useLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  处理中…
                </>
              ) : (
                <>POST /invoke</>
              )}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <GatewayApiKeyInput theme={theme} id="skill-detail-gateway-key" value={gatewayApiKeyDraft} onChange={setGatewayApiKeyDraft} />
          <>
            <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
              填写 JSON 请求体（通常与 parametersSchema 一致），将调用统一网关 invoke。
            </p>
            <AutoHeightTextarea
              id="skill-detail-hosted-payload"
              value={hostedInvokePayload}
              onChange={(e) => setHostedInvokePayload(e.target.value)}
              minRows={5}
              maxRows={20}
              className={`font-mono text-xs ${isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-900'} w-full rounded-xl border px-3 py-2`}
            />
          </>
          <p className={`text-xs ${textMuted(theme)}`}>{skill.description || '暂无描述'}</p>
          {useResult ? (
            <div
              className={`whitespace-pre-wrap rounded-xl border p-4 text-sm font-medium ${
                isDark ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {useResult}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
};
