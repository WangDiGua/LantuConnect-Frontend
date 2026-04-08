import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Database,
  FileText,
  Table2,
  Image,
  Mic,
  Video,
  Layers,
  HardDrive,
  FileSearch,
  MessageSquare,
  Star,
  Eye,
  Download,
  Sparkles,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { Dataset, DatasetSourceType, DatasetDataType } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import type { ResourceCatalogItemVO } from '../../types/dto/catalog';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import {
  btnPrimary,
  iconMuted,
  textPrimary,
  textSecondary,
  textMuted,
  techBadge,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { MarketplaceListingCard, MarketplaceStatItem, MarketPlazaPageShell } from '../../components/market';
import { LantuSelect } from '../../components/common/LantuSelect';
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

const SOURCE_BADGE: Record<DatasetSourceType, { label: string; cls: string }> = {
  department: { label: '部门数据', cls: 'text-blue-600 bg-blue-500/10' },
  knowledge: { label: '知识库', cls: 'text-emerald-600 bg-emerald-500/10' },
  third_party: { label: '第三方', cls: 'text-amber-600 bg-amber-500/10' },
};

const DATA_TYPE_BADGE: Record<DatasetDataType, { label: string; cls: string }> = {
  document: { label: '文档', cls: 'text-slate-600 bg-slate-500/10' },
  structured: { label: '结构化', cls: 'text-neutral-900 bg-neutral-900/10' },
  image: { label: '图像', cls: 'text-pink-600 bg-pink-500/10' },
  audio: { label: '音频', cls: 'text-orange-600 bg-orange-500/10' },
  video: { label: '视频', cls: 'text-red-600 bg-red-500/10' },
  mixed: { label: '混合', cls: 'text-neutral-900 bg-neutral-900/10' },
};

const DATA_TYPE_ICON: Record<DatasetDataType, React.ElementType> = {
  document: FileText,
  structured: Table2,
  image: Image,
  audio: Mic,
  video: Video,
  mixed: Layers,
};

const ICON_COLORS: Record<DatasetDataType, string> = {
  document: 'bg-neutral-700',
  structured: 'bg-neutral-900',
  image: 'bg-neutral-600',
  audio: 'bg-neutral-800',
  video: 'bg-neutral-500',
  mixed: 'bg-neutral-900',
};

type SortPreset = 'default' | 'published' | 'calls' | 'rating';

function sortPresetToQuery(preset: SortPreset): { sortBy?: 'callCount' | 'rating' | 'publishedAt' | 'name'; sortOrder?: 'asc' | 'desc' } {
  switch (preset) {
    case 'published':
      return { sortBy: 'publishedAt', sortOrder: 'desc' };
    case 'calls':
      return { sortBy: 'callCount', sortOrder: 'desc' };
    case 'rating':
      return { sortBy: 'rating', sortOrder: 'desc' };
    default:
      return {};
  }
}

function formatFileSize(bytes?: number): string {
  if (typeof bytes !== 'number' || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

function formatCount(n?: number): string {
  if (typeof n !== 'number' || n < 0) return '—';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString();
}

function formatLabel(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)} 万`;
  return n.toLocaleString('zh-CN');
}

export const DatasetMarket: React.FC<Props> = ({ theme, fontSize, themeColor: _themeColor, showMessage }) => {
  const navigate = useNavigate();
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [listTotal, setListTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [tagStatsRows, setTagStatsRows] = useState<ResourceCatalogItemVO[]>([]);
  const [sortPreset, setSortPreset] = useState<SortPreset>('default');

  useEffect(() => {
    tagService
      .list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'dataset')))
      .catch(() => setCatalogTags([]));
  }, []);

  useEffect(() => {
    resourceCatalogService
      .list({ resourceType: 'dataset', status: 'published', page: 1, pageSize: 100 })
      .then((p) => setTagStatsRows(p.list))
      .catch(() => setTagStatsRows([]));
  }, []);

  useEffect(() => {
    if (catalogTags.length === 0 && tagFilter !== null) setTagFilter(null);
  }, [catalogTags.length, tagFilter]);

  const loadDatasets = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const { sortBy, sortOrder } = sortPresetToQuery(sortPreset);
    void datasetService
      .list({
        status: 'published',
        pageSize: 100,
        keyword: keyword.trim() || undefined,
        tags: tagFilter ? [tagFilter] : undefined,
        ...(sortBy ? { sortBy, sortOrder } : {}),
      })
      .then((res) => {
        if (!cancelled) {
          setDatasets(res.list);
          setListTotal(res.total);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error('加载数据集失败');
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
  }, [showMessage, keyword, tagFilter, sortPreset]);

  useEffect(() => {
    const cleanup = loadDatasets();
    return cleanup;
  }, [loadDatasets]);

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

  const sortOptions = useMemo(
    () => [
      { value: 'default', label: '综合排序' },
      { value: 'published', label: '最新发布' },
      { value: 'calls', label: '调用量' },
      { value: 'rating', label: '评分' },
    ],
    [],
  );

  const FilterSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section aria-label={title}>
      <h3 className={`text-xs font-bold uppercase tracking-wide mb-2 ${textMuted(theme)}`}>{title}</h3>
      {children}
    </section>
  );

  const TagNav = () => (
    <nav aria-label="数据集标签">
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
    listTotal != null && listCountLabel > 0
      ? `搜索数据集（本页已加载 ${datasets.length} 条）…`
      : listTotal != null
        ? `搜索数据集…（共 ${formatLabel(listTotal)} 条）`
        : '搜索数据集名称、编码或标签…';

  const datasetFeatures = [
    {
      variant: 'violet' as const,
      pill: '接入',
      pillIcon: FileSearch,
      title: '解析与元数据',
      description: '绑定 API Key 后使用目录 resolve 查看跳转或数据说明。',
    },
    {
      variant: 'cyan' as const,
      pill: '目录',
      pillIcon: HardDrive,
      title: '标签与元数据',
      description: '筛选用标签库与登记一致；卡片仍展示数据形态、来源等结构化字段。',
    },
    {
      variant: 'fuchsia' as const,
      pill: '评价',
      pillIcon: Star,
      title: '评分与评价',
      description: '上架资源支持评价；评分来自目录聚合数据。',
    },
  ] as const;

  const desktopSidebar = (
    <aside className="hidden w-full shrink-0 space-y-6 lg:block lg:w-52 xl:w-56">
      <FilterSection title="标签">
        <p className={`mb-2 text-xs leading-snug ${textMuted(theme)}`}>
          与标签管理一致（含「通用」桶）；计数来自已上架列表快照（单页最多 100 条）。
        </p>
        <TagNav />
      </FilterSection>
    </aside>
  );

  return (
    <MarketPlazaPageShell
      theme={theme}
      fontSize={fontSize}
      heroIcon={Database}
      kicker="Dataset plaza"
      title={(
        <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
          {chromePageTitle || '数据集'}
        </span>
      )}
      description="浏览已发布数据集；以目录 resolve 与元数据为主，不提供统一网关 invoke。侧栏筛选与标签管理一致，形态与来源在卡片上展示。"
      actions={(
        <>
          <button
            type="button"
            onClick={() => navigate(buildPath('user', 'api-docs'))}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
              isDark ? 'border-white/[0.12] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200/80 bg-white text-slate-800 shadow-sm hover:bg-slate-50'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
            接入与部署
          </button>
          <button
            type="button"
            onClick={() => navigate(buildPath('user', 'dataset-register'))}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:text-sm"
          >
            发布数据集
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </button>
        </>
      )}
      features={datasetFeatures}
      tip={(
        <p>
          <strong className="font-semibold">{chromePageTitle || '数据集'}</strong>
          ：侧栏「标签」计数基于最近一次已上架目录快照（单页最多 100 条）；切换标签会重新请求列表。
        </p>
      )}
      sidebar={desktopSidebar}
      main={(
        <>
          <div className="space-y-3 lg:hidden">
            <div>
              <p className={`mb-2 text-xs font-semibold ${textMuted(theme)}`}>标签</p>
              <div
                className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="数据集标签"
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
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className={`shrink-0 text-sm font-semibold ${textPrimary(theme)}`}>
              数据集目录
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
                name="dataset-market-search"
                autoComplete="off"
                spellCheck={false}
                placeholder={searchPlaceholder}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="搜索数据集"
                className={`min-h-12 w-full rounded-2xl border py-3 pl-12 pr-4 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
                  isDark
                    ? 'border-white/[0.1] bg-white/[0.05] text-white placeholder:text-slate-500'
                    : 'border-slate-200/90 bg-white text-slate-900 shadow-sm placeholder:text-slate-400'
                }`}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:min-w-[10rem]">
              <span className={`whitespace-nowrap text-xs font-medium ${textMuted(theme)}`}>排序</span>
              <LantuSelect
                theme={theme}
                value={sortPreset}
                onChange={(v) => setSortPreset(v as SortPreset)}
                options={sortOptions}
                triggerClassName="!min-w-[8.5rem]"
              />
            </div>
          </div>

          {loading ? (
            <PageSkeleton type="cards" />
          ) : loadError ? (
            <PageError error={loadError} onRetry={() => { loadDatasets(); }} retryLabel="重试加载数据集" />
          ) : datasets.length === 0 ? (
            <div className={`py-16 text-center text-sm ${textMuted(theme)}`}>
              <p className={`text-lg font-medium ${textMuted(theme)}`}>暂无匹配的数据集</p>
              <p className={`mt-1 text-sm ${textMuted(theme)}`}>尝试调整搜索、筛选或排序</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {datasets.map((ds) => {
                const title = ds.displayName ?? ds.name;
                const sourceType = ds.sourceType ?? 'knowledge';
                const dataType = ds.dataType ?? 'mixed';
                const srcBadge = SOURCE_BADGE[sourceType] ?? { label: '—', cls: 'text-slate-600 bg-slate-500/10' };
                const dtBadge = DATA_TYPE_BADGE[dataType] ?? { label: '—', cls: 'text-slate-600 bg-slate-500/10' };
                const IconComp = DATA_TYPE_ICON[dataType] ?? FileText;
                const iconColor = ICON_COLORS[dataType] ?? 'bg-slate-500';
                const fmt = ds.format?.trim() ? ds.format.toUpperCase() : '—';
                return (
                  <BentoCard
                    key={ds.id}
                    theme={theme}
                    hover
                    glow="indigo"
                    padding="md"
                    className="flex h-full flex-col"
                    onClick={() => navigate(buildPath('user', 'dataset-center', ds.id))}
                  >
                    <MarketplaceListingCard
                      theme={theme}
                      title={title}
                      statusChip={{ label: dtBadge.label, tone: 'accent' }}
                      trailing={(
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${iconColor}`}>
                          <IconComp size={18} aria-hidden />
                        </div>
                      )}
                      metaRow={(
                        <>
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${srcBadge.cls}`}>
                            {srcBadge.label}
                          </span>
                          <span className={techBadge(theme)}>{fmt}</span>
                          {(ds.tags ?? []).slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${
                                isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                          {(ds.tags ?? []).length > 4 ? (
                            <span className={`text-xs ${textMuted(theme)}`}>+{(ds.tags ?? []).length - 4}</span>
                          ) : null}
                        </>
                      )}
                      description={ds.description || '暂无描述'}
                      descriptionClamp={3}
                      footerLeft={(
                        <div className="min-w-0 space-y-0.5">
                          <div className={`truncate text-xs ${textSecondary(theme)}`} title={catalogAuthorDisplay(ds)}>
                            作者：{catalogAuthorDisplay(ds)}
                          </div>
                          <span className="block truncate font-mono text-xs" title={String(ds.name ?? '')}>
                            @{ds.name}
                          </span>
                        </div>
                      )}
                      footerStats={(
                        <>
                          <MarketplaceStatItem icon={Download} title={catalogPrimaryMetricLabel('dataset')}>
                            {formatMarketMetric(catalogPrimaryMetricValue('dataset', ds))}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Eye} title="浏览量">
                            {formatMarketMetric(catalogViewCountValue(ds))}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={HardDrive} title="体积">
                            {formatFileSize(ds.fileSize)}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Table2} title="记录数">
                            {formatCount(ds.recordCount)}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={Star} title="目录评分">
                            {ds.ratingAvg != null ? ds.ratingAvg.toFixed(1) : '—'}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={MessageSquare} title="评论数">
                            {Number(ds.reviewCount ?? 0)}
                          </MarketplaceStatItem>
                        </>
                      )}
                      primaryAction={(
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(buildPath('user', 'dataset-center', ds.id));
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
