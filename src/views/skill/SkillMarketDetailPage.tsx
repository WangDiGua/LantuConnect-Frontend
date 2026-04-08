import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Clock,
  Download,
  Heart,
  Loader2,
  MessageSquare,
  Star,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Skill } from '../../types/dto/skill';
import type { AgentType, SourceType } from '../../types/dto/agent';
import { skillService } from '../../api/services/skill.service';
import { userActivityService } from '../../api/services/user-activity.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { fetchSkillPackBlobDownload, resolveSkillArtifactTarget } from '../../utils/skillArtifactDownload';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, techBadge } from '../../utils/uiClasses';
import { ResourceMarketDetailShell } from '../../components/market';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { Modal } from '../../components/common/Modal';
import { GatewayApiKeyInput } from '../../components/common/GatewayApiKeyInput';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import { ApiException } from '../../types/api';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { MarkdownView } from '../../components/common/MarkdownView';

const TYPE_BADGE: Record<AgentType, { label: string; cls: string }> = {
  mcp: { label: 'MCP', cls: 'text-neutral-900 bg-neutral-900/10' },
  http_api: { label: 'HTTP API', cls: 'text-neutral-800 bg-neutral-800/10' },
  builtin: { label: '内置', cls: 'text-neutral-700 bg-neutral-700/10' },
  skill_pack: { label: '技能包', cls: 'text-violet-900 bg-violet-500/15 dark:text-violet-200 dark:bg-violet-500/20' },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tab, setTab] = useState<'intro' | 'files' | 'reviews'>('intro');
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [useOpen, setUseOpen] = useState(false);
  const [useLoading, setUseLoading] = useState(false);
  const [useResult, setUseResult] = useState<string | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
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
      const data = await skillService.getById(id);
      setSkill(data);
    } catch (e) {
      setSkill(null);
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
      let resolved;
      try {
        resolved = await resourceCatalogService.resolve(
          { resourceType: 'skill', resourceId: String(skill.id) },
          { headers: { 'X-Api-Key': apiKey } },
        );
      } catch (err) {
        if (err instanceof ApiException && err.code === 1009) {
          setUseResult(err.message || '请绑定有效的 X-Api-Key（创建 Key 时的完整 secretPlain）');
        } else if (err instanceof ApiException && (err.status === 401 || err.code === 1002)) {
          setUseResult('请先选择有效 API Key');
        } else if (err instanceof ApiException && (err.status === 403 || err.code === 1003)) {
          setUseResult('你暂无该资源使用权限，请先申请授权');
        } else if (err instanceof Error && (err.message.includes('X-Api-Key') || err.message.includes('API Key'))) {
          setUseResult('请先填写并绑定 API Key');
        } else {
          setUseResult(`${mapInvokeFlowError(err, 'resolve')}\n请确认 Key 与 resolve 授权后重试`);
        }
        return;
      }
      if (resolved.invokeType === 'redirect' && resolved.endpoint) {
        if (!safeOpenHttpUrl(resolved.endpoint)) {
          setUseResult('无法打开该地址（仅支持 http/https）');
          return;
        }
        setUseResult(`该资源为跳转类型，已打开地址：${resolved.endpoint}`);
        return;
      }
      if (resolved.invokeType === 'metadata') {
        setUseResult(`目录返回元数据：${JSON.stringify(resolved.spec ?? {}, null, 2)}`);
        return;
      }
      if (resolved.invokeType === 'artifact') {
        const target = resolveSkillArtifactTarget(resolved);
        if (!target) {
          setUseResult('解析成功，但未找到可下载的制品地址。请确认技能已上传制品或联系管理员。');
          return;
        }
        if (target.mode === 'open_tab') {
          if (!safeOpenHttpUrl(target.url)) {
            setUseResult('公开制品地址无效（仅支持 http/https）');
            return;
          }
          setUseResult(`该技能为公开制品，已尝试打开直链。若未自动下载，请在新页面选择「另存为」。\n${target.url}`);
          return;
        }
        const safeName = `${(skill.displayName || skill.agentName || 'skill').replace(/[\\/:*?"<>|]+/g, '_')}.zip`;
        try {
          await fetchSkillPackBlobDownload(target.url, apiKey, safeName);
          setUseResult('已开始下载技能包（受控下载不计入网关 invoke 统计）。若被拦截，请检查浏览器下载权限。');
        } catch (e) {
          setUseResult(e instanceof Error ? e.message : '下载技能包失败');
        }
        return;
      }
      setUseResult(`解析返回类型：${resolved.invokeType ?? '未知'}。技能市场仅支持制品下载与目录信息，不提供统一 invoke。`);
    } catch (e) {
      setUseResult(`操作失败: ${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setUseLoading(false);
    }
  }, [skill, gatewayApiKeyDraft]);

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
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[skill.agentType].cls}`}>
                  {TYPE_BADGE[skill.agentType].label}
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
            <button type="button" className={`${btnPrimary} min-h-11`} onClick={() => { setUseOpen(true); setUseResult(null); }}>
              <Download size={16} className="shrink-0" aria-hidden />
              获取技能包
            </button>
          </>
        )}
        tabs={[
          { id: 'intro', label: '技能介绍' },
          { id: 'files', label: '技能文件' },
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
                  <span className="flex items-center gap-1 tabular-nums">
                    <Download size={13} className="shrink-0" aria-hidden />
                    {formatCount(skill.downloadCount ?? 0)}
                    {' '}
                    包下载
                  </span>
                  {skill.agentType !== 'skill_pack' ? (
                    <>
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
                    </>
                  ) : null}
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
                  以下为目录详情中的制品与清单字段（来自 GET /catalog/resources/skill/{'{id}'} 的 spec）。下载请绑定有效 X-Api-Key 后使用「获取技能包」完成 resolve。
                </p>
                <div
                  className={`space-y-3 rounded-2xl border p-4 text-sm ${
                    isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
                  }`}
                >
                  <h4 className={`font-semibold ${textPrimary(theme)}`}>清单与校验</h4>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {[
                      ['包格式', skill.specJson?.packFormat],
                      ['入口文档', skill.specJson?.entryDoc],
                      ['校验状态', skill.specJson?.packValidationStatus],
                      ['skillRootPath', skill.specJson?.skillRootPath],
                      ['artifactSha256', skill.specJson?.artifactSha256],
                      ['artifactDownloadApi', skill.specJson?.artifactDownloadApi],
                    ]
                      .filter(([, v]) => v != null && String(v).trim() !== '')
                      .map(([k, v]) => (
                        <div key={String(k)} className="min-w-0">
                          <dt className={`text-xs ${textMuted(theme)}`}>{String(k)}</dt>
                          <dd className={`mt-0.5 break-all font-mono text-xs ${textPrimary(theme)}`}>{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                  {skill.specJson?.manifest != null && typeof skill.specJson.manifest === 'object' ? (
                    <div>
                      <p className={`mb-1 text-xs font-medium ${textMuted(theme)}`}>manifest</p>
                      <pre
                        className={`max-h-48 overflow-auto rounded-lg p-3 text-xs ${
                          isDark ? 'bg-black/30 text-slate-200' : 'bg-white text-slate-800'
                        }`}
                      >
                        {JSON.stringify(skill.specJson.manifest as Record<string, unknown>, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                  {skill.parametersSchema && Object.keys(skill.parametersSchema).length > 0 ? (
                    <div>
                      <p className={`mb-1 text-xs font-medium ${textMuted(theme)}`}>parametersSchema</p>
                      <pre
                        className={`max-h-48 overflow-auto rounded-lg p-3 text-xs ${
                          isDark ? 'bg-black/30 text-slate-200' : 'bg-white text-slate-800'
                        }`}
                      >
                        {JSON.stringify(skill.parametersSchema, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                  {skill.specJson?.extra != null && typeof skill.specJson.extra === 'object' && Object.keys(skill.specJson.extra as object).length > 0 ? (
                    <div>
                      <p className={`mb-1 text-xs font-medium ${textMuted(theme)}`}>spec 附加信息</p>
                      <pre
                        className={`max-h-48 overflow-auto rounded-lg p-3 text-xs ${
                          isDark ? 'bg-black/30 text-slate-200' : 'bg-white text-slate-800'
                        }`}
                      >
                        {JSON.stringify(skill.specJson.extra as Record<string, unknown>, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
                <GatewayApiKeyInput theme={theme} id="skill-detail-gateway-key-files" value={gatewayApiKeyDraft} onChange={setGatewayApiKeyDraft} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${btnPrimary} min-h-11`}
                    onClick={() => {
                      setUseOpen(true);
                      setUseResult(null);
                    }}
                  >
                    <Download size={16} className="shrink-0" aria-hidden />
                    获取技能包
                  </button>
                  <button type="button" className={`${btnSecondary(theme)} min-h-11`} onClick={() => setGrantOpen(true)}>
                    申请 resolve 授权
                  </button>
                </div>
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
            <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>获取技能包</h3>
            <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
              使用目录 resolve 下载制品；须绑定有效 X-Api-Key。也可点击顶部「获取技能包」打开完整对话框。
            </p>
            <button type="button" className={`${btnPrimary} w-full min-h-11 justify-center`} onClick={() => { setUseOpen(true); setUseResult(null); }}>
              打开获取流程
            </button>
            <button type="button" className={`${btnSecondary(theme)} w-full min-h-11 justify-center`} onClick={() => setGrantOpen(true)}>
              申请 resolve 授权
            </button>
          </div>
        )}
      />

      <Modal
        open={useOpen}
        onClose={() => { setUseOpen(false); setGrantOpen(false); }}
        title={`获取技能包 — ${skill.displayName}`}
        theme={theme}
        size="md"
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setUseOpen(false)}>
              关闭
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => setGrantOpen(true)}>
              申请 resolve 授权
            </button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={useLoading} onClick={() => void handleExecute()}>
              {useLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  处理中…
                </>
              ) : (
                <>
                  <Download size={14} />
                  解析并下载
                </>
              )}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <GatewayApiKeyInput theme={theme} id="skill-detail-gateway-key" value={gatewayApiKeyDraft} onChange={setGatewayApiKeyDraft} />
          <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
            技能包通过目录解析后下载制品；不在此走统一网关 invoke。
          </p>
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

      <GrantApplicationModal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        theme={theme}
        resourceType="skill"
        resourceId={String(skill.id)}
        resourceName={skill.displayName}
        showMessage={showMessage}
      />
    </>
  );
};
