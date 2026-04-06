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
  BookOpen,
  Plus,
  ShieldCheck,
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
  canvasBodyBg,
  consoleContentTopPad,
  mainScrollPadX,
  mainScrollPadBottom,
  btnPrimary,
  btnSecondary,
  iconMuted,
  textPrimary,
  textSecondary,
  textMuted,
  techBadge,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { MarketplaceListingCard, MarketplaceStatItem } from '../../components/market';
import { LantuSelect } from '../../components/common/LantuSelect';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { buildPath } from '../../constants/consoleRoutes';
import { MARKET_HERO_TITLE_CLASSES } from '../../constants/theme';
import { nativeInputClass } from '../../utils/formFieldClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const SOURCE_TABS: { value: DatasetSourceType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'department', label: '部门数据' },
  { value: 'knowledge', label: '知识库' },
  { value: 'third_party', label: '第三方' },
];

const DATA_SHAPE_TABS: { value: DatasetDataType | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'document', label: '文档' },
  { value: 'structured', label: '结构化' },
  { value: 'image', label: '图像' },
  { value: 'audio', label: '音频' },
  { value: 'video', label: '视频' },
  { value: 'mixed', label: '混合' },
];

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
  const [sourceFilter, setSourceFilter] = useState<DatasetSourceType | ''>('');
  const [dataTypeFilter, setDataTypeFilter] = useState<DatasetDataType | ''>('');
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
        ...(sourceFilter ? { sourceType: sourceFilter } : {}),
        ...(dataTypeFilter ? { dataType: dataTypeFilter } : {}),
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
  }, [showMessage, keyword, tagFilter, sourceFilter, dataTypeFilter, sortPreset]);

  useEffect(() => {
    const cleanup = loadDatasets();
    return cleanup;
  }, [loadDatasets]);

  /** 服务端筛选后，再按已返回行的来源/形态做一次客户端兜底（目录字段缺失时不展示误匹配项） */
  const displayed = useMemo(() => {
    let list = datasets;
    if (dataTypeFilter) {
      list = list.filter((d) => d.dataType === dataTypeFilter);
    }
    if (sourceFilter) {
      list = list.filter((d) => d.sourceType === sourceFilter);
    }
    return list;
  }, [datasets, dataTypeFilter, sourceFilter]);

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
            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 ${
              tagFilter === null
                ? isDark
                  ? 'bg-emerald-500/20 text-white'
                  : 'bg-emerald-100 text-emerald-950'
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
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 ${
                  active
                    ? isDark
                      ? 'bg-emerald-500/20 text-white'
                      : 'bg-emerald-100 text-emerald-950'
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
    listTotal != null ? `搜索数据集…（共 ${formatLabel(listTotal)} 条）` : '搜索数据集…';

  return (
    <div className={`w-full ${canvasBodyBg(theme)}`}>
      <div className={`${mainScrollPadX} ${mainScrollPadBottom} space-y-5 ${consoleContentTopPad}`}>
          {/* Hero */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`shrink-0 rounded-xl p-2.5 mt-0.5 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}
              >
                <Database size={24} className="text-emerald-500" />
              </div>
              <div className="min-w-0">
                <h1 className={`font-semibold tracking-tight ${MARKET_HERO_TITLE_CLASSES[fontSize]} ${textPrimary(theme)}`}>
                  {chromePageTitle || '数据集中心'}
                </h1>
                <p className={`mt-1 text-sm sm:text-[15px] max-w-2xl leading-relaxed ${textSecondary(theme)}`}>
                  浏览目录、resolve
                  元数据与评价；不提供统一网关 invoke。来源与数据形态以后台目录字段为准，若无字段则侧栏筛选可能较少命中。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                className={`${btnSecondary(theme)} inline-flex items-center gap-2`}
                onClick={() => navigate(buildPath('user', 'api-docs'))}
              >
                <BookOpen size={16} />
                接入与部署
              </button>
              <button
                type="button"
                className={`${btnPrimary} inline-flex items-center gap-2`}
                onClick={() => navigate(buildPath('user', 'dataset-register'))}
              >
                <Plus size={16} />
                发布数据集
              </button>
            </div>
          </div>

          {/* Feature strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BentoCard theme={theme} padding="sm">
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 rounded-lg p-2 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
                >
                  <FileSearch size={18} className="text-emerald-500" />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${textPrimary(theme)}`}>解析与元数据</div>
                  <p className={`text-xs mt-1 leading-relaxed ${textMuted(theme)}`}>
                    绑定 API Key 后使用目录 resolve 查看跳转或元数据说明。
                  </p>
                </div>
              </div>
            </BentoCard>
            <BentoCard theme={theme} padding="sm">
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 rounded-lg p-2 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
                >
                  <ShieldCheck size={18} className="text-emerald-500" />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${textPrimary(theme)}`}>授权与 Grant</div>
                  <p className={`text-xs mt-1 leading-relaxed ${textMuted(theme)}`}>
                    详情内可申请使用，由管理员审批后获得 resolve 等权限。
                  </p>
                </div>
              </div>
            </BentoCard>
            <BentoCard theme={theme} padding="sm">
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 rounded-lg p-2 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
                >
                  <Star size={18} className="text-amber-500" />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${textPrimary(theme)}`}>评分与评价</div>
                  <p className={`text-xs mt-1 leading-relaxed ${textMuted(theme)}`}>
                    上架资源支持评价；评分来自目录聚合数据。
                  </p>
                </div>
              </div>
            </BentoCard>
          </div>

          <div className="lg:flex lg:gap-8 lg:items-start">
            {/* Sidebar */}
            <aside
              className={`lg:w-[min(22%,300px)] shrink-0 mb-6 lg:mb-0 max-lg:max-h-[min(60vh,420px)] overflow-y-auto custom-scrollbar pr-1 space-y-6 ${
                isDark ? 'lg:border-r lg:border-white/[0.06] lg:pr-5' : 'lg:border-r lg:border-slate-200/80 lg:pr-5'
              }`}
            >
              <FilterSection title="数据形态">
                <div className="flex flex-col gap-1">
                  {DATA_SHAPE_TABS.map((tab) => (
                    <button
                      key={tab.value || 'all-shape'}
                      type="button"
                      aria-pressed={dataTypeFilter === tab.value}
                      onClick={() => setDataTypeFilter(tab.value)}
                      className={`min-h-10 w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 ${
                        dataTypeFilter === tab.value
                          ? isDark
                            ? 'bg-emerald-500/20 text-white'
                            : 'bg-emerald-100 text-emerald-950'
                          : `${textSecondary(theme)} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="来源">
                <div className="flex flex-col gap-1">
                  {SOURCE_TABS.map((tab) => (
                    <button
                      key={tab.value || 'all-src'}
                      type="button"
                      aria-pressed={sourceFilter === tab.value}
                      onClick={() => setSourceFilter(tab.value)}
                      className={`min-h-10 w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 ${
                        sourceFilter === tab.value
                          ? isDark
                            ? 'bg-emerald-500/20 text-white'
                            : 'bg-emerald-100 text-emerald-950'
                          : `${textSecondary(theme)} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              {catalogTags.length > 0 && (
                <FilterSection title="标签">
                  <p className={`text-xs leading-snug mb-2 ${textMuted(theme)}`}>
                    计数来自已上架列表快照（单页最多 100 条）；切换标签会重新请求目录。
                  </p>
                  <TagNav />
                </FilterSection>
              )}
            </aside>

            {/* Main */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 min-w-0 max-w-xl">
                  <Search
                    size={16}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`}
                  />
                  <input
                    type="search"
                    placeholder={searchPlaceholder}
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className={`${nativeInputClass(theme)} w-full pl-9 py-2.5 text-sm`}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium whitespace-nowrap ${textMuted(theme)}`}>排序</span>
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
              ) : displayed.length === 0 ? (
                <div className="text-center py-20">
                  <p className={`text-lg font-medium ${textMuted(theme)}`}>暂无匹配的数据集</p>
                  <p className={`text-sm mt-1 ${textMuted(theme)}`}>尝试调整搜索、侧栏筛选或排序</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayed.map((ds) => {
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
                        glow="emerald"
                        padding="md"
                        className="flex flex-col h-full"
                        onClick={() => navigate(buildPath('user', 'dataset-center', ds.id))}
                      >
                        <MarketplaceListingCard
                          theme={theme}
                          title={title}
                          statusChip={{ label: dtBadge.label, tone: 'accent' }}
                          trailing={(
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${iconColor}`}
                            >
                              <IconComp size={18} aria-hidden />
                            </div>
                          )}
                          metaRow={(
                            <>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${srcBadge.cls}`}>
                                {srcBadge.label}
                              </span>
                              <span className={techBadge(theme)}>{fmt}</span>
                              {(ds.tags ?? []).slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium ${
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
                          footerLeft={(
                            <span className="block truncate font-mono text-xs" title={String(ds.name ?? '')}>
                              @{ds.name}
                            </span>
                          )}
                          footerStats={(
                            <>
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
                              className={`${btnPrimary} !py-1.5 !px-3 !text-xs`}
                            >
                              查看详情
                            </button>
                          )}
                        />
                      </BentoCard>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};
