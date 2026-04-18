import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  MessageSquare,
  Eye,
  BarChart2,
  Bot,
  Search,
  Sparkles,
  Network,
  Gauge,
  FileText,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import {
  MarketPlazaPageShell,
  MarketplaceListingCard,
  MarketplaceStatItem,
  ResourceMarketRuntimeBadges,
} from '../../components/market';
import { BentoCard } from '../../components/common/BentoCard';
import { Modal } from '../../components/common/Modal';
import { buildPath } from '../../constants/consoleRoutes';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { agentService } from '../../api/services/agent.service';
import type { Agent } from '../../types/dto/agent';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted, techBadge, statusLabel, iconMuted } from '../../utils/uiClasses';
import { formatMarketMetric } from '../../utils/marketMetrics';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import type { ResourceCatalogItemVO } from '../../types/dto/catalog';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { buildResourceMarketRuntimeState } from '../../utils/resourceMarketRuntime';
import { useSilentResourceRuntimeRefresh } from '../../hooks/useSilentResourceRuntimeRefresh';

export interface AgentMarketProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  showMessage: (content: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

interface MarketCard {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  description: string;
  author: string;
  tags: string[];
  callCount: number;
  viewCount: number;
  rating: string;
  reviewCount: number;
  observability?: Record<string, unknown>;
}

function agentCardTrailing(icon: string | null, isDark: boolean): React.ReactNode {
  const url = icon?.trim() ?? '';
  if (url && /^https?:\/\//i.test(url)) {
    return <img src={url} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-black/10" loading="lazy" />;
  }
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white ${isDark ? 'opacity-95' : ''}`}>
      <Bot size={17} aria-hidden />
    </div>
  );
}

function agentToCard(agent: Agent): MarketCard {
  const tags =
    agent.tags?.length
      ? [...agent.tags]
      : agent.categoryName
        ? [agent.categoryName, agent.agentType]
        : [agent.agentType];
  const authorFromCatalog =
    agent.createdByName?.trim() || (agent.createdBy != null ? `用户 #${agent.createdBy}` : '');
  const author =
    authorFromCatalog ||
    (agent.sourceType === 'internal' ? '校内团队' : agent.sourceType === 'partner' ? '合作伙伴' : '云服务');
  const ratingStr =
    agent.ratingAvg != null && Number.isFinite(agent.ratingAvg)
      ? agent.ratingAvg.toFixed(1)
      : agent.qualityScore > 0
        ? (agent.qualityScore / 20).toFixed(1)
        : '—';
  return {
    id: String(agent.id),
    name: agent.displayName,
    code: agent.agentName || String(agent.id),
    icon: agent.icon ?? null,
    description: agent.description,
    author,
    tags,
    callCount: Math.max(0, Math.floor(Number(agent.callCount ?? 0)) || 0),
    viewCount: Math.max(0, Math.floor(Number(agent.viewCount ?? 0)) || 0),
    rating: ratingStr,
    reviewCount: Math.max(0, Math.floor(Number(agent.reviewCount ?? 0)) || 0),
    observability: agent.observability,
  };
}

export const AgentMarket: React.FC<AgentMarketProps> = ({ theme, fontSize, themeColor: _themeColor, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [tagStatsRows, setTagStatsRows] = useState<ResourceCatalogItemVO[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    tagService
      .list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'agent')))
      .catch(() => setCatalogTags([]));
  }, []);

  useEffect(() => {
    resourceCatalogService
      .list({ resourceType: 'agent', status: 'published', page: 1, pageSize: 100 })
      .then((p) => setTagStatsRows(p.list))
      .catch(() => setTagStatsRows([]));
  }, []);

  useEffect(() => {
    if (!loading && !error && tagFilter == null) {
      void resourceCatalogService
        .list({ resourceType: 'agent', status: 'published', page: 1, pageSize: 100 })
        .then((p) => setTagStatsRows(p.list))
        .catch(() => {});
    }
  }, [loading, error, tagFilter]);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await agentService.list({
        status: 'published',
        page: 1,
        pageSize: 100,
        tags: tagFilter ? [tagFilter] : undefined,
      });
      setAgents(data.list);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('加载 Agent 市场失败');
      setError(e);
      showMessage(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [tagFilter, showMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  useSilentResourceRuntimeRefresh(
    async () => {
      const data = await agentService.list({
        status: 'published',
        page: 1,
        pageSize: 100,
        tags: tagFilter ? [tagFilter] : undefined,
      });
      setAgents(data.list);
    },
    { resourceType: 'agent' },
    { debounceMs: 500 },
  );

  useEffect(() => {
    if (catalogTags.length === 0 && tagFilter !== null) setTagFilter(null);
  }, [catalogTags.length, tagFilter]);

  const cards = useMemo(() => agents.map(agentToCard), [agents]);

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter((c) => {
      const blob = `${c.name} ${c.code} ${c.description} ${c.tags.join(' ')} ${c.author}`.toLowerCase();
      return blob.includes(term);
    });
  }, [cards, keyword]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of tagStatsRows) {
      for (const tg of r.tags ?? []) {
        map.set(tg, (map.get(tg) ?? 0) + 1);
      }
    }
    return map;
  }, [tagStatsRows]);

  const listCountLabel = tagStatsRows.length;

  const [confirmAgent, setConfirmAgent] = useState<MarketCard | null>(null);
  const [addingAgent, setAddingAgent] = useState(false);
  const WS_KEY = 'lantu_workspace_agents';
  const [workspaceAgents, setWorkspaceAgents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(WS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isInWorkspace = (id: string) => workspaceAgents.includes(id);

  const addToWorkspace = async (agent: MarketCard) => {
    if (isInWorkspace(agent.id)) return;
    setAddingAgent(true);
    try {
      const { userActivityService } = await import('../../api/services/user-activity.service');
      await userActivityService.addFavorite('agent', Number(agent.id));
      setWorkspaceAgents((prev) => {
        const next = [...prev, agent.id];
        try {
          localStorage.setItem(WS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      showMessage(`已收藏「${agent.name}」`, 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '收藏失败', 'error');
    } finally {
      setAddingAgent(false);
    }
  };

  const CategoryNav = ({ className }: { className?: string }) => (
    <nav aria-label="Agent 标签分类" className={className}>
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            aria-current={tagFilter === null ? 'true' : undefined}
            onClick={() => setTagFilter(null)}
            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
              tagFilter === null
                ? isDark
                  ? 'bg-violet-500/20 text-white'
                  : 'bg-violet-100 text-violet-950'
                : `${textSecondary(theme)} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`
            }`}
          >
            <span>全部</span>
            <span className={`tabular-nums text-xs font-medium ${textMuted(theme)}`}>{listCountLabel}</span>
          </button>
        </li>
        {catalogTags.map((t) => {
          const n = tagCounts.get(t.name) ?? 0;
          const active = tagFilter === t.name;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))}
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                  active
                    ? isDark
                      ? 'bg-violet-500/20 text-white'
                      : 'bg-violet-100 text-violet-950'
                    : `${textSecondary(theme)} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`
                }`}
              >
                <span className="min-w-0 truncate">{t.name}</span>
                <span className={`shrink-0 tabular-nums text-xs font-medium ${textMuted(theme)}`}>{n}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const searchPlaceholder =
    listCountLabel > 0
      ? `搜索智能体（本页已加载 ${agents.length} 条）…`
      : '搜索智能体名称、能力、编码或标签…';

  const plazaFeatures = [
    {
      variant: 'violet' as const,
      pill: '接入',
      pillIcon: Network,
      title: '统一目录 resolve',
      description: '与资源目录及网关策略一致；须有效 X-Api-Key 与 scope。',
    },
    {
      variant: 'cyan' as const,
      pill: '调用',
      pillIcon: Gauge,
      title: 'invoke 与观测',
      description: '支持网关 invoke；须有效 Key、scope 与资源已发布等网关条件。',
    },
    {
      variant: 'fuchsia' as const,
      pill: '治理',
      pillIcon: Star,
      title: '收藏与评价',
      description: '目录评分、评论与收藏打通工作区与活动中心。',
    },
  ] as const;

  return (
    <>
      <MarketPlazaPageShell
        theme={theme}
        fontSize={fontSize}
        heroIcon={Bot}
        kicker="Agent plaza"
        title={(
          <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
            {chromePageTitle || 'Agent 广场'}
          </span>
        )}
        description="浏览已发布智能体；试用依赖 resolve + invoke（须有效 Key 与 scope；已发布资源对具备 scope 的调用方开放）。"
        actions={(
          <>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'developer-docs'))}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                isDark ? 'border-white/[0.12] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200/80 bg-white text-slate-800 shadow-sm hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
              接入与调用
            </button>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'agent-register'))}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:text-sm"
            >
              发布 Agent
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            </button>
          </>
        )}
        features={plazaFeatures}
        tip={(
          <p>
            <strong className="font-semibold">{chromePageTitle || 'Agent 广场'}</strong>
            ：侧栏标签数量基于最近一次「全部」列表快照（单页最多 100 条）；筛选标签后列表为网关目录筛选结果。
          </p>
        )}
        sidebar={<CategoryNav className="hidden w-full shrink-0 lg:block lg:w-52 xl:w-56" />}
        main={(
          <>
            <div className="lg:hidden">
              <p className={`mb-2 text-xs font-semibold ${textMuted(theme)}`}>分类</p>
              <div
                className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Agent 标签"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tagFilter === null}
                  onClick={() => setTagFilter(null)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                    tagFilter === null
                      ? isDark
                        ? 'bg-violet-500/25 text-white'
                        : 'bg-violet-600 text-white'
                      : isDark
                        ? 'bg-white/[0.06] text-slate-300'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  全部
                  <span className="ml-1 tabular-nums opacity-80">({listCountLabel})</span>
                </button>
                {catalogTags.map((t) => {
                  const n = tagCounts.get(t.name) ?? 0;
                  const active = tagFilter === t.name;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))}
                      className={`max-w-[10rem] shrink-0 truncate rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                        active
                          ? isDark
                            ? 'bg-violet-500/25 text-white'
                            : 'bg-violet-600 text-white'
                          : isDark
                            ? 'bg-white/[0.06] text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.name}
                      <span className="ml-1 tabular-nums opacity-80">({n})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className={`shrink-0 text-sm font-semibold ${textPrimary(theme)}`}>
                Agent 服务
                {tagFilter != null && (
                  <span className={`ml-2 text-xs font-normal ${textMuted(theme)}`}>· {tagFilter}</span>
                )}
              </span>
              <div className="relative min-w-0 flex-1">
                <Search
                  className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${iconMuted(theme)}`}
                  aria-hidden
                />
                <input
                  type="search"
                  name="agent-market-search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={searchPlaceholder}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  aria-label="搜索智能体"
                  className={`min-h-12 w-full rounded-2xl border py-3 pl-12 pr-4 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
                    isDark
                      ? 'border-white/[0.1] bg-white/[0.05] text-white placeholder:text-slate-500'
                      : 'border-slate-200/90 bg-white text-slate-900 shadow-sm placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>

            {loading ? (
              <PageSkeleton type="cards" />
            ) : error ? (
              <PageError error={error} onRetry={() => void load()} retryLabel="重试加载 Agent 广场" />
            ) : filtered.length === 0 ? (
              <div className={`py-16 text-center text-sm ${textMuted(theme)}`}>暂无可用智能体</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((a) => {
                  const runtime = buildResourceMarketRuntimeState({
                    resourceType: 'agent',
                    observability: a.observability,
                  });
                  return (
                  <BentoCard
                    key={a.id}
                    theme={theme}
                    hover
                    glow="indigo"
                    padding="md"
                    className={`flex h-full flex-col ${runtime.interactionDisabled ? (isDark ? 'opacity-[0.92]' : 'opacity-95') : ''}`}
                    onClick={() => navigate(buildPath('user', 'agents-center', a.id))}
                  >
                    <MarketplaceListingCard
                      theme={theme}
                      title={a.name}
                      statusChip={{ label: statusLabel('published'), tone: 'published' }}
                      trailing={agentCardTrailing(a.icon, isDark)}
                      metaRow={(
                        <>
                          <ResourceMarketRuntimeBadges
                            theme={theme}
                            resourceType="agent"
                            observability={a.observability}
                          />
                          {a.tags.slice(0, 6).map((t) => (
                            <span key={t} className={techBadge(theme)}>
                              {t}
                            </span>
                          ))}
                        </>
                      )}
                      description={a.description}
                      descriptionClamp={3}
                      footerLeft={(
                        <div className="min-w-0 space-y-0.5">
                          <div className={`truncate text-xs ${textSecondary(theme)}`} title={a.author}>
                            作者：{a.author}
                          </div>
                          <span className="block truncate font-mono text-xs" title={`@${a.code}`}>
                            @{a.code}
                          </span>
                        </div>
                      )}
                      footerStats={(
                        <>
                          <MarketplaceStatItem icon={BarChart2} title="调用量">
                            {formatMarketMetric(a.callCount)}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Eye} title="浏览量">
                            {formatMarketMetric(a.viewCount)}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Star} title="评分">
                            {a.rating}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={MessageSquare} title="评论数">
                            {a.reviewCount}
                          </MarketplaceStatItem>
                        </>
                      )}
                      primaryAction={(
                        <>
                          <button
                            type="button"
                            className={`${btnSecondary(theme)} !px-3 !py-1.5 !text-xs ${isInWorkspace(a.id) ? 'cursor-not-allowed opacity-50' : ''}`}
                            disabled={isInWorkspace(a.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isInWorkspace(a.id)) setConfirmAgent(a);
                            }}
                          >
                            {isInWorkspace(a.id) ? '已收藏' : '收藏'}
                          </button>
                          <button
                            type="button"
                            className={`${btnPrimary} !px-3 !py-1.5 !text-xs disabled:cursor-not-allowed disabled:opacity-45`}
                            disabled={runtime.interactionDisabled}
                            title={runtime.interactionDisabled ? runtime.interactionHint : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (runtime.interactionDisabled) return;
                              navigate(buildPath('user', 'agents-center', a.id));
                            }}
                          >
                            查看与测试
                          </button>
                        </>
                      )}
                    />
                  </BentoCard>
                  );
                })}
              </div>
            )}
          </>
        )}
      />

      <Modal
        open={!!confirmAgent}
        onClose={() => setConfirmAgent(null)}
        title="确认收藏"
        theme={theme}
        size="sm"
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setConfirmAgent(null)}>
              取消
            </button>
            <button
              type="button"
              className={`${btnPrimary} disabled:opacity-50`}
              disabled={addingAgent}
              onClick={async () => {
                if (confirmAgent) {
                  await addToWorkspace(confirmAgent);
                  setConfirmAgent(null);
                }
              }}
            >
              {addingAgent ? '处理中…' : '确认收藏'}
            </button>
          </>
        )}
      >
        {confirmAgent ? <p className={`text-sm ${textSecondary(theme)}`}>确认收藏「{confirmAgent.name}」？</p> : null}
      </Modal>
    </>
  );
};
