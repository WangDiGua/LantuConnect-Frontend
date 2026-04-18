import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  FileText,
  Heart,
  Loader2,
  MessageSquare,
  Star,
} from 'lucide-react';

import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Skill } from '../../types/dto/skill';
import type { AgentType, SourceType } from '../../types/dto/agent';
import { userActivityService } from '../../api/services/user-activity.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import type { ResourceBindingSummaryVO } from '../../types/dto/catalog';
import { BindingClosureSection } from '../../components/business/BindingClosureSection';
import {
  btnPrimary,
  btnSecondary,
  statusBadgeClass,
  statusDot,
  statusLabel,
  techBadge,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import {
  MarketDetailSectionCard,
  MarketDetailSidebarCard,
  MarketDetailStatusNotice,
  ResourceMarketDetailShell,
  ResourceMarketRuntimeBadges,
} from '../../components/market';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { MarkdownView } from '../../components/common/MarkdownView';
import { SkillQuickTestPanel } from '../../components/market/testing/SkillQuickTestPanel';
import { mapCatalogItemToSkill } from '../../api/services/skill.service';
import { buildResourceMarketRuntimeState } from '../../utils/resourceMarketRuntime';

const TYPE_BADGE: Record<AgentType, { label: string; cls: string }> = {
  mcp: { label: 'MCP', cls: 'text-neutral-900 bg-neutral-900/10' },
  http_api: { label: 'HTTP API', cls: 'text-neutral-800 bg-neutral-800/10' },
  builtin: { label: '内置', cls: 'text-neutral-700 bg-neutral-700/10' },
  context_skill: { label: 'Context 技能', cls: 'text-fuchsia-900 bg-fuchsia-500/15 dark:text-fuchsia-200 dark:bg-fuchsia-500/20' },
};

const SOURCE_BADGE: Record<SourceType, { label: string; cls: string }> = {
  internal: { label: '自研', cls: 'text-sky-600 bg-sky-500/10' },
  partner: { label: '合作方', cls: 'text-neutral-900 bg-neutral-900/10' },
  cloud: { label: '云服务', cls: 'text-cyan-600 bg-cyan-500/10' },
};

const ICON_COLORS = ['bg-neutral-900', 'bg-neutral-800', 'bg-neutral-700', 'bg-stone-800', 'bg-zinc-800', 'bg-neutral-600', 'bg-slate-800', 'bg-neutral-950'];

function pickColor(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

function formatLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function formatCount(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

type SkillDetailTab = 'detail' | 'testing' | 'schema' | 'reviews';

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
  const [tab, setTab] = useState<SkillDetailTab>('detail');
  const [favoriteLoading, setFavoriteLoading] = useState(false);

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
      const detail = await resourceCatalogService.getByTypeAndId('skill', String(id), 'observability,closure');
      setSkill(mapCatalogItemToSkill(detail));
      setBindingClosure(detail.bindingClosure);
    } catch (reason) {
      setSkill(null);
      setBindingClosure(undefined);
      setError(reason instanceof Error ? reason : new Error('加载失败'));
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
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '收藏失败';
      if (message.includes('FAVORITE_EXISTS') || message.includes('已收藏')) {
        showMessage?.('该资源已在收藏夹中', 'info');
      } else {
        showMessage?.(message, 'error');
      }
    } finally {
      setFavoriteLoading(false);
    }
  }, [skill, favoriteLoading, showMessage]);

  const reviewCount = useMemo(() => Math.max(0, Math.floor(Number(skill?.reviewCount ?? 0)) || 0), [skill?.reviewCount]);
  const creatorLabel = useMemo(() => {
    if (!skill) return '—';
    return resolvePersonDisplay({ names: [skill.createdByName], ids: [skill.createdBy ?? undefined] });
  }, [skill]);
  const typeBadge = useMemo(() => {
    if (!skill) return TYPE_BADGE.context_skill;
    return TYPE_BADGE[skill.agentType] ?? TYPE_BADGE.context_skill;
  }, [skill]);
  const sourceBadge = useMemo(() => {
    if (!skill) return SOURCE_BADGE.internal;
    return SOURCE_BADGE[skill.sourceType] ?? SOURCE_BADGE.internal;
  }, [skill]);
  const runtime = useMemo(() => {
    if (!skill) return null;
    return buildResourceMarketRuntimeState({
      resourceType: 'skill',
      executionMode: skill.executionMode,
      observability: skill.observability,
    });
  }, [skill]);

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

  const statusNotice =
    tab === 'detail'
      ? {
          title: '技能详情聚焦文档和市场信息',
          description: '第一屏只讲技能用途、作者、热度和标签，不再把 Schema、resolve 说明混进正文里。',
        }
      : tab === 'testing'
        ? {
            title: '试用验证工作区已经收进主内容区',
            description: '快速试用、resolve 预览和使用提示会在同一页完成，避免以前右侧栏功能过重。',
          }
        : tab === 'schema'
          ? {
              title: '参数 Schema 和 Context 规范单独成页',
              description: '这一页只保留规范说明、specJson 和 parametersSchema，适合接入同学做精读。',
            }
          : {
              title: '评分评论独立呈现',
              description: '真实用户反馈从正文中抽离出来，阅读体验会更接近 MCP 详情页。',
            };

  return (
    <ResourceMarketDetailShell
      theme={theme}
      onBack={onNavigateToList}
      backLabel="返回技能市场"
      titleBlock={(
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${pickColor(skill.agentName)}`}>
            {(skill.displayName || skill.agentName).charAt(0)}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`min-w-0 text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{skill.displayName}</h1>
                <span className={statusBadgeClass(skill.status ?? 'unknown', theme)}>
                  <span className={statusDot(skill.status ?? 'unknown')} />
                  {statusLabel(skill.status)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ResourceMarketRuntimeBadges
                  theme={theme}
                  resourceType="skill"
                  executionMode={skill.executionMode}
                  observability={skill.observability}
                />
              </div>
              <div className={`flex flex-wrap items-center gap-2 text-xs ${textMuted(theme)}`}>
              <span className="font-mono">@{skill.agentName}</span>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${typeBadge.cls}`}>
                {typeBadge.label}
              </span>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${sourceBadge.cls}`}>
                {sourceBadge.label}
              </span>
              <span className="inline-flex items-center gap-0.5">
                <Star size={12} className="fill-amber-500 text-amber-500" aria-hidden />
                {skill.ratingAvg != null ? skill.ratingAvg.toFixed(1) : '—'}
              </span>
              <span>{reviewCount} 条评论</span>
              <span>{formatCount(skill.callCount)} 热度</span>
            </div>
            {(skill.tags ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {(skill.tags ?? []).map((tag) => (
                  <span key={tag} className={techBadge(theme)}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
      headerActions={(
        <button
          type="button"
          className={`${btnSecondary(theme)} min-h-11`}
          disabled={favoriteLoading}
          onClick={() => void handleFavorite()}
        >
          {favoriteLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              收藏中...
            </>
          ) : (
            <>
              <Heart size={14} />
              收藏
            </>
          )}
        </button>
      )}
      tabs={[
        { id: 'detail', label: '技能详情' },
        { id: 'testing', label: '试用验证' },
        { id: 'schema', label: '参数 Schema' },
        { id: 'reviews', label: '评分评论', badge: reviewCount },
      ]}
      activeTabId={tab}
      onTabChange={(id) => setTab(id as SkillDetailTab)}
      mainColumn={(
        <div className="space-y-5">
          {runtime?.interactionState === 'resolve_only' ? (
            <MarketDetailStatusNotice
              theme={theme}
              tone="info"
              title="当前 Skill 为 Context 资源"
              description={runtime.interactionHint}
            />
          ) : null}
          {runtime?.interactionState === 'available' && runtime.supplementalHint ? (
            <MarketDetailStatusNotice
              theme={theme}
              tone="info"
              title="网关提示（可能因账号状态或调用策略而异）"
              description={runtime.supplementalHint}
            />
          ) : null}
          <MarketDetailStatusNotice theme={theme} title={statusNotice.title} description={statusNotice.description} />

          {tab === 'detail' ? (
            <>
              <MarketDetailSectionCard
                theme={theme}
                title="技能详情"
                description="保留 Markdown 说明、摘要和使用场景，让技能页回到“文档优先”的阅读方式。"
              >
                {skill.serviceDetailMd?.trim() ? (
                  <MarkdownView value={skill.serviceDetailMd} className="text-sm" />
                ) : (
                  <p className={`text-sm leading-relaxed ${textMuted(theme)}`}>
                    暂无详细介绍。资源所有方可以在技能注册页补充 Markdown 版的技能说明，用来解释适用场景、限制条件和输入约束。
                  </p>
                )}
                <div className={`mt-4 border-t pt-4 text-sm leading-relaxed ${textSecondary(theme)}`}>
                  {skill.description || '暂无补充描述。'}
                </div>
              </MarketDetailSectionCard>

              <MarketDetailSectionCard
                theme={theme}
                title="市场概览"
                description="把创建者、热度、成功率和 Context 规范提示拆成独立块，让正文不再承担所有说明。"
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-xs ${textMuted(theme)}`}>创建者</div>
                    <div className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{creatorLabel}</div>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-xs ${textMuted(theme)}`}>平均延迟</div>
                    <div className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{formatLatency(skill.avgLatencyMs)}</div>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-xs ${textMuted(theme)}`}>成功率</div>
                    <div className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{skill.successRate > 0 ? `${skill.successRate}%` : '—'}</div>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-xs ${textMuted(theme)}`}>质量分</div>
                    <div className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{skill.qualityScore > 0 ? skill.qualityScore : '—'}</div>
                  </div>
                </div>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className={`text-xs ${textMuted(theme)}`}>执行模式</dt>
                    <dd className={`mt-1 text-sm ${textPrimary(theme)}`}>{skill.executionMode || 'context'}</dd>
                  </div>
                  <div>
                    <dt className={`text-xs ${textMuted(theme)}`}>父级资源</dt>
                    <dd className={`mt-1 text-sm ${textPrimary(theme)}`}>{skill.parentName || '—'}</dd>
                  </div>
                  <div>
                    <dt className={`text-xs ${textMuted(theme)}`}>资源编码</dt>
                    <dd className={`mt-1 font-mono text-sm ${textPrimary(theme)}`}>{skill.agentName}</dd>
                  </div>
                  <div>
                    <dt className={`text-xs ${textMuted(theme)}`}>创建时间</dt>
                    <dd className={`mt-1 text-sm ${textPrimary(theme)}`}>{skill.createTime ? formatDateTime(skill.createTime) : '—'}</dd>
                  </div>
                </dl>
                <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${isDark ? 'border-fuchsia-500/20 bg-fuchsia-500/[0.06] text-fuchsia-100' : 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950'}`}>
                  Context Skill 通过 <code className="font-mono text-xs">POST /catalog/resolve</code> 获取完整上下文说明，不直接作为普通 invoke 资源使用。
                </div>
              </MarketDetailSectionCard>
            </>
          ) : null}

          {tab === 'testing' ? (
            <SkillQuickTestPanel theme={theme} skill={skill} bindingClosure={bindingClosure} showMessage={showMessage} />
          ) : null}

          {tab === 'schema' ? (
            <>
              <MarketDetailSectionCard
                theme={theme}
                title="Context 规范说明"
                description="这一块专门承接 Context Skill 的协议约束，帮助接入同学快速知道哪些字段来自 spec、哪些字段来自 parametersSchema。"
              >
                <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${isDark ? 'border-white/10 bg-black/20 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
                  技能当前通过 <code className="font-mono text-xs">executionMode=context</code> 暴露给目录系统，平台会在 resolve 时回传 <code className="font-mono text-xs">contextPrompt</code>、
                  <code className="font-mono text-xs">parametersSchema</code> 与绑定闭包，使用时不直接走普通 <code className="font-mono text-xs">POST /invoke</code>。
                </div>
                <div className={`mt-4 rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'}`}>
                  <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>specJson</h3>
                  <pre className={`mt-3 max-h-72 overflow-auto rounded-xl p-3 text-xs ${isDark ? 'bg-black/30 text-slate-200' : 'bg-white text-slate-800'}`}>
                    {JSON.stringify(skill.specJson ?? {}, null, 2)}
                  </pre>
                </div>
              </MarketDetailSectionCard>

              <MarketDetailSectionCard
                theme={theme}
                title="参数 Schema"
                description="把参数约束单独拎出来，避免它和说明文、Markdown 正文堆在同一块里。"
              >
                {skill.parametersSchema && Object.keys(skill.parametersSchema).length > 0 ? (
                  <pre className={`max-h-80 overflow-auto rounded-2xl border p-4 text-xs ${isDark ? 'border-white/10 bg-black/20 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
                    {JSON.stringify(skill.parametersSchema, null, 2)}
                  </pre>
                ) : (
                  <p className={`text-sm leading-relaxed ${textMuted(theme)}`}>当前资源没有额外的 parametersSchema，默认按最小 Context 规范运行。</p>
                )}
              </MarketDetailSectionCard>
            </>
          ) : null}

          {tab === 'reviews' ? (
            <MarketDetailSectionCard
              theme={theme}
              title="评分评论"
              description="把评论区独立出去，阅读体验会和 MCP 页保持一致，也方便后续继续增强互动能力。"
            >
              <h3 className={`flex items-center gap-2 text-base font-bold ${textPrimary(theme)}`}>
                <MessageSquare size={18} className="text-neutral-800 dark:text-neutral-200" aria-hidden />
                评分与评论
              </h3>
              <div className="mt-4">
                <ResourceReviewsSection targetType="skill" targetId={skill.id} theme={theme} showMessage={showMessage} />
              </div>
            </MarketDetailSectionCard>
          ) : null}
        </div>
      )}
      sidebarColumn={(
        <div className="space-y-4">
          <MarketDetailSidebarCard
            theme={theme}
            title="资源摘要"
            description="右侧栏只保留身份信息、依赖关系和接入提示，不再堆试用表单。"
          >
            <dl className="space-y-3 text-sm">
              <div>
                <dt className={`text-xs ${textMuted(theme)}`}>资源编码</dt>
                <dd className={`mt-1 font-mono ${textPrimary(theme)}`}>{skill.agentName}</dd>
              </div>
              <div>
                <dt className={`text-xs ${textMuted(theme)}`}>创建者</dt>
                <dd className={`mt-1 ${textPrimary(theme)}`}>{creatorLabel}</dd>
              </div>
              <div>
                <dt className={`text-xs ${textMuted(theme)}`}>执行模式</dt>
                <dd className={`mt-1 ${textPrimary(theme)}`}>{skill.executionMode || 'context'}</dd>
              </div>
              <div>
                <dt className={`text-xs ${textMuted(theme)}`}>描述</dt>
                <dd className={`mt-1 leading-relaxed ${textSecondary(theme)}`}>{skill.description || '暂无描述'}</dd>
              </div>
            </dl>
          </MarketDetailSidebarCard>

          <BindingClosureSection theme={theme} currentResourceId={String(skill.id)} items={bindingClosure} />

          <MarketDetailSidebarCard
            theme={theme}
            title="Context Skill 接入说明"
            description="试用验证和 resolve 预览已经收回主内容区，这里只保留最小的接入提醒。"
            className={isDark ? 'border-fuchsia-500/20 bg-fuchsia-500/[0.08]' : 'border-fuchsia-200 bg-fuchsia-50'}
          >
            <p className={`text-xs leading-relaxed ${isDark ? 'text-fuchsia-100/85' : 'text-fuchsia-950/80'}`}>
              Context Skill 主要通过目录 resolve 暴露参数和上下文信息。需要做试用或排查时，直接进入「试用验证」主区即可完成。
            </p>
              <button
                type="button"
                className={`mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  isDark ? 'bg-white/10 text-fuchsia-100 hover:bg-white/[0.14]' : 'bg-white text-fuchsia-900 hover:bg-fuchsia-100'
                }`}
                onClick={() => setTab('testing')}
              >
                <FileText size={14} aria-hidden />
                进入试用验证
              </button>
          </MarketDetailSidebarCard>
        </div>
      )}
    />
  );
};
