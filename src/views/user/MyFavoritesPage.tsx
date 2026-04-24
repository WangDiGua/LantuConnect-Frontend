import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  AppWindow,
  ArrowUpRight,
  Blocks,
  Bot,
  CalendarClock,
  Database,
  Heart,
  HeartOff,
  Loader2,
  Search,
  SlidersHorizontal,
  Star,
  Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { useMessage } from '../../components/common/Message';
import { userActivityService } from '../../api/services/user-activity.service';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import type { FavoriteItem } from '../../types/dto/user-activity';
import type { CatalogResourceDetailVO, ResourceType } from '../../types/dto/catalog';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { buildPath, buildUserResourceMarketUrl } from '../../constants/consoleRoutes';
import {
  btnPrimary,
  btnSecondary,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { nativeInputClass } from '../../utils/formFieldClasses';

type TabFilter = 'all' | ResourceType;
type SortKey = 'newest' | 'type' | 'name';
type DetailState = 'loaded' | 'missing' | 'error';

type EnrichedFavorite = FavoriteItem & {
  detail: CatalogResourceDetailVO | null;
  detailState: DetailState;
};

const TYPE_LABEL: Record<ResourceType, string> = {
  agent: 'Agent',
  skill: 'Skill',
  app: '应用',
  mcp: 'MCP',
  dataset: '数据集',
};

const TYPE_ORDER: TabFilter[] = ['all', 'agent', 'skill', 'app', 'mcp', 'dataset'];
const PAGE_DESC = '按收藏关系聚合目录资源，快速回到详情、联调与调用入口';

interface MyFavoritesPageProps {
  theme: Theme;
  fontSize: FontSize;
}

function typeIcon(type: ResourceType) {
  switch (type) {
    case 'agent':
      return Bot;
    case 'skill':
      return Wrench;
    case 'mcp':
      return Blocks;
    case 'dataset':
      return Database;
    case 'app':
    default:
      return AppWindow;
  }
}

function fallbackName(item: Pick<FavoriteItem, 'targetType' | 'targetId'>): string {
  return `${TYPE_LABEL[item.targetType]} #${item.targetId}`;
}

export const MyFavoritesPage: React.FC<MyFavoritesPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabFilter>('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [favorites, setFavorites] = useState<EnrichedFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const { showMessage } = useMessage();

  const fetchData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const rows = await userActivityService.getFavorites();
      const enriched = await Promise.all(rows.map(async (item): Promise<EnrichedFavorite> => {
        try {
          const detail = await resourceCatalogService.getByTypeAndId(item.targetType, item.targetId);
          return {
            ...item,
            displayName: detail.displayName || item.displayName || fallbackName(item),
            description: detail.description ?? item.description ?? '',
            icon: item.icon,
            detail,
            detailState: 'loaded',
          };
        } catch (error) {
          const status = typeof error === 'object' && error && 'response' in error
            ? Number((error as { response?: { status?: number } }).response?.status)
            : 0;
          return {
            ...item,
            displayName: item.displayName && item.displayName !== '-' ? item.displayName : fallbackName(item),
            description: item.description || '',
            detail: null,
            detailState: status === 404 ? 'missing' : 'error',
          };
        }
      }));
      setFavorites(enriched);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载收藏列表失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const counts = useMemo(() => {
    const map: Record<TabFilter, number> = { all: favorites.length, agent: 0, skill: 0, app: 0, mcp: 0, dataset: 0 };
    for (const item of favorites) map[item.targetType] += 1;
    return map;
  }, [favorites]);

  const unavailableCount = useMemo(
    () => favorites.filter((item) => item.detailState !== 'loaded').length,
    [favorites],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = favorites.filter((item) => {
      if (tab !== 'all' && item.targetType !== tab) return false;
      if (!q) return true;
      const detail = item.detail;
      const haystack = [
        item.displayName,
        item.description,
        detail?.resourceCode,
        detail?.createdByName,
        detail?.tags?.join(' '),
        TYPE_LABEL[item.targetType],
        String(item.targetId),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });

    return [...rows].sort((a, b) => {
      if (sortKey === 'type') {
        const byType = a.targetType.localeCompare(b.targetType);
        if (byType !== 0) return byType;
      }
      if (sortKey === 'name') {
        return a.displayName.localeCompare(b.displayName, 'zh-CN');
      }
      return new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime();
    });
  }, [favorites, query, sortKey, tab]);

  const handleRemoveFavorite = async (item: EnrichedFavorite) => {
    if (removingId) return;
    setRemovingId(item.id);
    try {
      await userActivityService.removeFavorite(item.id);
      setFavorites((prev) => prev.filter((row) => row.id !== item.id));
      showMessage(`已取消收藏「${item.displayName}」`, 'info');
    } catch {
      showMessage('取消收藏失败', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const openDetail = (item: EnrichedFavorite) => {
    navigate(buildUserResourceMarketUrl(item.targetType, { resourceId: item.targetId }));
  };

  const openGatewayTools = (item: EnrichedFavorite) => {
    const params = new URLSearchParams({
      resourceType: item.targetType,
      resourceId: String(item.targetId),
    });
    navigate(`${buildPath('user', 'developer-tools')}?${params.toString()}`);
  };

  const tabButton = (value: TabFilter) => {
    const active = tab === value;
    const label = value === 'all' ? '全部' : TYPE_LABEL[value];
    return (
      <button
        key={value}
        type="button"
        onClick={() => setTab(value)}
        className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
          active
            ? isDark
              ? 'bg-white text-slate-950'
              : 'bg-slate-950 text-white'
            : isDark
              ? 'bg-white/[0.06] text-lantu-text-secondary hover:bg-white/[0.1]'
              : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100'
        }`}
        aria-pressed={active}
      >
        <span>{label}</span>
        <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${
          active
            ? isDark ? 'bg-slate-950/10 text-slate-800' : 'bg-white/14 text-white'
            : isDark ? 'bg-white/[0.08] text-lantu-text-muted' : 'bg-slate-100 text-slate-500'
        }`}>
          {counts[value]}
        </span>
      </button>
    );
  };

  const toolbar = (
    <div className={`rounded-[1.5rem] border px-4 py-4 ${
      isDark ? 'border-white/[0.08] bg-white/[0.04]' : 'border-slate-200/70 bg-white'
    }`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {TYPE_ORDER.map(tabButton)}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-[16rem]">
            <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${textMuted(theme)}`} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名称、编码、作者或标签"
              className={`${nativeInputClass(theme)} min-h-10 pl-9`}
              aria-label="搜索收藏资源"
            />
          </label>
          <label className="relative">
            <SlidersHorizontal className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${textMuted(theme)}`} aria-hidden />
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className={`${nativeInputClass(theme)} min-h-10 min-w-[9rem] pl-9`}
              aria-label="收藏排序"
            >
              <option value="newest">最新收藏</option>
              <option value="type">资源类型</option>
              <option value="name">名称排序</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );

  const summary = !loading && !loadError ? (
    <div className="grid gap-3 md:grid-cols-3">
      {[
        { label: '收藏总数', value: favorites.length },
        { label: '可打开资源', value: favorites.length - unavailableCount },
        { label: '不可用收藏', value: unavailableCount },
      ].map((item) => (
        <div
          key={item.label}
          className={`rounded-[1.25rem] border px-4 py-3 ${
            isDark ? 'border-white/[0.08] bg-white/[0.04]' : 'border-slate-200/70 bg-white'
          }`}
        >
          <p className={`text-xs font-semibold ${textMuted(theme)}`}>{item.label}</p>
          <p className={`mt-1 text-2xl font-black tabular-nums ${textPrimary(theme)}`}>{item.value}</p>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Star}
      breadcrumbSegments={['工作台', '我的收藏'] as const}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        {summary}
        {loading ? (
          <PageSkeleton type="cards" />
        ) : loadError ? (
          <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载收藏" />
        ) : filtered.length === 0 ? (
          <div className={`flex min-h-[18rem] items-center justify-center rounded-[1.5rem] border ${
            isDark ? 'border-white/[0.08] bg-white/[0.04]' : 'border-slate-200/70 bg-white'
          }`}>
            <div className="text-center">
              <HeartOff size={40} className={`mx-auto mb-3 ${textMuted(theme)}`} aria-hidden />
              <p className={`text-sm font-semibold ${textSecondary(theme)}`}>没有匹配的收藏资源</p>
              <p className={`mt-1 text-xs ${textMuted(theme)}`}>可以调整类型筛选或搜索词</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((item) => {
              const detail = item.detail;
              const Icon = typeIcon(item.targetType);
              const isAvailable = item.detailState === 'loaded';
              const tags = detail?.tags?.slice(0, 3) ?? [];
              return (
                <article
                  key={item.id}
                  className={`relative flex min-h-[15rem] flex-col rounded-[1.5rem] border p-4 transition-colors ${
                    isDark
                      ? 'border-white/[0.08] bg-lantu-card hover:border-white/[0.14]'
                      : 'border-slate-200/80 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isDark ? 'bg-white/[0.06] text-lantu-text-secondary' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Icon size={20} strokeWidth={2.1} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                          isDark ? 'bg-white/[0.06] text-lantu-text-secondary' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {TYPE_LABEL[item.targetType]}
                        </span>
                        <span className={`font-mono text-xs ${textMuted(theme)}`}>#{item.targetId}</span>
                        {!isAvailable ? (
                          <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                            {item.detailState === 'missing' ? '已下架' : '详情异常'}
                          </span>
                        ) : null}
                      </div>
                      <h3 className={`mt-2 line-clamp-2 text-lg font-black leading-snug ${textPrimary(theme)}`}>
                        {item.displayName}
                      </h3>
                      <p className={`mt-2 line-clamp-2 text-sm leading-relaxed ${textSecondary(theme)}`}>
                        {item.description || (isAvailable ? '暂无简介' : '资源详情暂不可读取，可取消收藏或稍后重试。')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                          isDark ? 'bg-white/[0.05] text-lantu-text-muted' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className={`mt-auto grid gap-2 border-t pt-4 text-xs ${
                    isDark ? 'border-white/[0.08] text-lantu-text-muted' : 'border-slate-100 text-slate-500'
                  }`}>
                    <div className="flex min-w-0 items-center gap-2">
                      <CalendarClock size={14} className="shrink-0" aria-hidden />
                      <span className="truncate">收藏于 {formatDateTime(item.createTime)}</span>
                    </div>
                    {detail?.createdByName ? (
                      <div className="truncate">作者：{detail.createdByName}</div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDetail(item)}
                      disabled={!isAvailable}
                      className={`${btnPrimary} min-h-10 flex-1 disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      打开详情 <ArrowUpRight size={14} aria-hidden />
                    </button>
                    {item.targetType !== 'dataset' ? (
                      <button
                        type="button"
                        onClick={() => openGatewayTools(item)}
                        disabled={!isAvailable}
                        className={`${btnSecondary(theme)} min-h-10 disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        联调
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleRemoveFavorite(item)}
                      disabled={removingId === item.id}
                      className={`${btnSecondary(theme)} min-h-10 min-w-10 px-3 disabled:cursor-wait disabled:opacity-60`}
                      aria-label={`取消收藏 ${item.displayName}`}
                    >
                      {removingId === item.id ? (
                        <Loader2 size={16} className="animate-spin" aria-hidden />
                      ) : (
                        <Heart size={16} className="fill-current" aria-hidden />
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </MgmtPageShell>
  );
};
