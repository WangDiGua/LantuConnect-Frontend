import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  MessageSquare,
  Star,
  Tag,
  Eye,
  BarChart2,
  Sparkles,
  FileText,
  ExternalLink,
  Layers,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { SmartApp, EmbedType, AppStatus } from '../../types/dto/smart-app';
import { smartAppService } from '../../api/services/smart-app.service';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import type { ResourceCatalogItemVO } from '../../types/dto/catalog';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { btnPrimary, textPrimary, textMuted, textSecondary, techBadge, statusLabel, iconMuted } from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { MarketplaceListingCard, MarketplaceStatItem, MarketPlazaPageShell } from '../../components/market';
import type { MarketplaceStatusTone } from '../../components/market';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { buildPath } from '../../constants/consoleRoutes';
import {
  catalogAuthorDisplay,
  catalogPrimaryMetricLabel,
  catalogPrimaryMetricValue,
  catalogViewCountValue,
  formatMarketMetric,
} from '../../utils/marketMetrics';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const EMBED_BADGE: Record<EmbedType, { label: string; cls: string }> = {
  iframe: { label: '嵌入式', cls: 'text-blue-600 bg-blue-500/10' },
  redirect: { label: '外链', cls: 'text-amber-600 bg-amber-500/10' },
  micro_frontend: { label: '微前端', cls: 'text-neutral-900 bg-neutral-900/10' },
};
const SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
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

function appStatusPresentation(status: AppStatus): { label: string; tone: MarketplaceStatusTone } {
  return {
    label: statusLabel(status),
    tone: status === 'published' ? 'published' : status === 'draft' ? 'draft' : 'neutral',
  };
}

function safeText(v: unknown): string {
  return String(v ?? '');
}

export const AppMarket: React.FC<Props> = ({ theme, fontSize, themeColor: _themeColor, showMessage }) => {
  const navigate = useNavigate();
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [tagStatsRows, setTagStatsRows] = useState<ResourceCatalogItemVO[]>([]);

  useEffect(() => {
    tagService
      .list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'app')))
      .catch(() => setCatalogTags([]));
  }, []);

  useEffect(() => {
    resourceCatalogService
      .list({ resourceType: 'app', status: 'published', page: 1, pageSize: 100 })
      .then((p) => setTagStatsRows(p.list))
      .catch(() => setTagStatsRows([]));
  }, []);

  useEffect(() => {
    if (!loading && !loadError && tagFilter == null) {
      void resourceCatalogService
        .list({ resourceType: 'app', status: 'published', page: 1, pageSize: 100 })
        .then((p) => setTagStatsRows(p.list))
        .catch(() => {});
    }
  }, [loading, loadError, tagFilter]);

  const loadApps = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void smartAppService
      .list({
        status: 'published',
        pageSize: 100,
        tags: tagFilter ? [tagFilter] : undefined,
      })
      .then((res) => {
        if (!cancelled) setApps(res.list);
      })
      .catch((err) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('加载应用列表失败');
          setLoadError(error);
          showMessage?.(error.message, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showMessage, tagFilter]);

  useEffect(() => {
    const cleanup = loadApps();
    return cleanup;
  }, [loadApps]);

  useEffect(() => {
    if (catalogTags.length === 0 && tagFilter !== null) setTagFilter(null);
  }, [catalogTags.length, tagFilter]);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return apps;
    const kw = keyword.toLowerCase();
    return apps.filter(
      (a) =>
        safeText(a.displayName).toLowerCase().includes(kw) ||
        safeText(a.appName).toLowerCase().includes(kw) ||
        safeText(a.description).toLowerCase().includes(kw) ||
        (a.tags ?? []).some((t) => t.toLowerCase().includes(kw)),
    );
  }, [apps, keyword]);

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

  const CategoryNav = ({ className }: { className?: string }) => (
    <nav aria-label="应用标签分类" className={className}>
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
    listCountLabel > 0 ? `搜索应用（本页已加载 ${apps.length} 条）…` : '搜索应用名称、编码或标签…';

  const plazaFeatures = [
    {
      variant: 'violet' as const,
      pill: '启动',
      pillIcon: ExternalLink,
      title: 'resolve 与 launch',
      description: '以目录 resolve 获取嵌入或跳转地址；_redirect 与 iframe 由 embedType 决定。',
    },
    {
      variant: 'cyan' as const,
      pill: '形态',
      pillIcon: Layers,
      title: '多种嵌入方式',
      description: '支持 iframe、微前端与外链重定向；统计以目录口径为准。',
    },
    {
      variant: 'fuchsia' as const,
      pill: '反馈',
      pillIcon: Star,
      title: '评分与评论',
      description: '上架应用支持评价，与资源目录数据打通。',
    },
  ] as const;

  return (
    <MarketPlazaPageShell
      theme={theme}
      fontSize={fontSize}
      heroIcon={LayoutGrid}
      kicker="App plaza"
      title={(
        <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
          {chromePageTitle || '应用集'}
        </span>
      )}
      description="浏览已发布智能应用；以 resolve 获取 launch 为主。未走网关 invoke 的打开可能不计入调用统计。"
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
            onClick={() => navigate(buildPath('user', 'app-register'))}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:text-sm"
          >
            发布应用
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </button>
        </>
      )}
      features={plazaFeatures}
      tip={(
        <p>
          <strong className="font-semibold">{chromePageTitle || '应用集'}</strong>
          ：侧栏标签计数基于最近一次「全部」列表快照（单页最多 100 条）；筛选标签后列表为接口筛选结果。
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
              aria-label="应用标签"
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
              应用服务
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
                name="app-market-search"
                autoComplete="off"
                spellCheck={false}
                placeholder={searchPlaceholder}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="搜索应用"
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
          ) : loadError ? (
            <PageError error={loadError} onRetry={() => { loadApps(); }} retryLabel="重试加载应用市场" />
          ) : filtered.length === 0 ? (
            <div className={`py-16 text-center text-sm ${textMuted(theme)}`}>
              <p className="text-lg font-medium">暂无匹配的应用</p>
              <p className="mt-1 text-sm">尝试调整搜索或标签筛选</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((app) => {
                const st = appStatusPresentation(app.status);
                return (
                  <BentoCard
                    key={app.id}
                    theme={theme}
                    hover
                    glow="indigo"
                    padding="md"
                    onClick={() => navigate(buildPath('user', 'apps-center', app.id))}
                    className="flex h-full flex-col"
                  >
                    <MarketplaceListingCard
                      theme={theme}
                      title={app.displayName}
                      statusChip={{ label: st.label, tone: st.tone }}
                      trailing={
                        app.icon ? (
                          <img src={app.icon} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-black/10" loading="lazy" />
                        ) : (
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white ${pickColor(app.appName)}`}
                          >
                            {(app.displayName || app.appName).charAt(0)}
                          </div>
                        )
                      }
                      metaRow={(
                        <>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${EMBED_BADGE[app.embedType].cls}`}>
                            {EMBED_BADGE[app.embedType].label}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).cls}`}
                          >
                            {(SOURCE_BADGE[app.sourceType as string] ?? SOURCE_BADGE.internal).label}
                          </span>
                          {(app.tags ?? []).slice(0, 4).map((tg) => (
                            <span key={tg} className={techBadge(theme)}>
                              {tg}
                            </span>
                          ))}
                        </>
                      )}
                      description={app.description || '暂无描述'}
                      descriptionClamp={3}
                      footerLeft={(
                        <div className="min-w-0 space-y-0.5">
                          <div className={`truncate text-xs ${textSecondary(theme)}`} title={catalogAuthorDisplay(app)}>
                            作者：{catalogAuthorDisplay(app)}
                          </div>
                          <span className="block truncate font-mono text-xs" title={`@${app.appName}`}>
                            @{app.appName}
                          </span>
                        </div>
                      )}
                      footerStats={(
                        <>
                          <MarketplaceStatItem icon={BarChart2} title={catalogPrimaryMetricLabel('app')}>
                            {formatMarketMetric(catalogPrimaryMetricValue('app', app))}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Eye} title="浏览量">
                            {formatMarketMetric(catalogViewCountValue(app))}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Star} title="目录评分">
                            {app.ratingAvg != null ? app.ratingAvg.toFixed(1) : '—'}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={MessageSquare} title="评论数">
                            {app.reviewCount ?? 0}
                          </MarketplaceStatItem>
                          {app.categoryName ? (
                            <MarketplaceStatItem icon={Tag} title="分类">
                              {app.categoryName}
                            </MarketplaceStatItem>
                          ) : null}
                        </>
                      )}
                      primaryAction={(
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(buildPath('user', 'apps-center', app.id));
                          }}
                          className={`${btnPrimary} !px-3 !py-1.5 !text-xs`}
                        >
                          查看与使用
                        </button>
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
  );
};
