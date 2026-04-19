import React, { useMemo, useState, useEffect, useCallback, useDeferredValue } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { PaginatedData } from '../../types/api';
import { userActivityService } from '../../api/services/user-activity.service';
import type { UsageRecord, RecentUseItem } from '../../types/dto/user-activity';
import { PageError } from '../../components/common/PageError';
import { Pagination, SearchInput } from '../../components/common';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { bentoCard, btnGhost, pageBlockStack, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';

type TimeFilter = 'today' | '7d' | '30d';
type TypeFilter = 'all' | 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
type ViewMode = 'records' | 'recent';

interface UsageRecordsPageProps {
  theme: Theme;
  fontSize: FontSize;
  initialView?: ViewMode;
}

const TYPE_LABEL: Record<string, string> = {
  agent: 'Agent',
  skill: 'Skill',
  app: '应用',
  mcp: 'MCP',
  dataset: '数据集',
};
const PAGE_SIZE = 20;
const PAGE_DESC = '最近使用资源与调用明细统一查看';

function emptyPage<T>(): PaginatedData<T> {
  return {
    list: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
  };
}

export const UsageRecordsPage: React.FC<UsageRecordsPageProps> = ({ theme, fontSize, initialView = 'recent' }) => {
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());

  const [recordsPage, setRecordsPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
  useScrollPaginatedContentToTop(viewMode === 'records' ? recordsPage : recentPage);

  const [recordsData, setRecordsData] = useState<PaginatedData<UsageRecord>>(() => emptyPage<UsageRecord>());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const [recentData, setRecentData] = useState<PaginatedData<RecentUseItem>>(() => emptyPage<RecentUseItem>());
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<Error | null>(null);
  const [recentTypeFilter, setRecentTypeFilter] = useState<RecentUseItem['targetType'] | 'all'>('all');

  const breadcrumbSegments = useMemo(
    () => ['工作台', viewMode === 'records' ? '使用记录' : '最近使用'] as const,
    [viewMode],
  );

  const fetchData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const res = await userActivityService.getUsageRecords({
        page: recordsPage,
        pageSize: PAGE_SIZE,
        range: timeFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        keyword: deferredSearch || undefined,
      });
      setRecordsData(res);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载使用记录失败'));
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, recordsPage, timeFilter, typeFilter]);

  const fetchRecent = useCallback(async () => {
    setRecentError(null);
    setRecentLoading(true);
    try {
      const res = await userActivityService.getRecentUse({
        page: recentPage,
        pageSize: PAGE_SIZE,
        type: recentTypeFilter === 'all' ? undefined : recentTypeFilter,
      });
      setRecentData(res);
    } catch (err) {
      setRecentError(err instanceof Error ? err : new Error('加载最近使用失败'));
    } finally {
      setRecentLoading(false);
    }
  }, [recentPage, recentTypeFilter]);

  useEffect(() => {
    if (viewMode === 'records') {
      void fetchData();
    }
  }, [fetchData, viewMode]);

  useEffect(() => {
    if (viewMode === 'recent') {
      void fetchRecent();
    }
  }, [fetchRecent, viewMode]);

  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  const tabCls = (active: boolean) => `px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none active:scale-[0.97] ${
    active
      ? 'bg-neutral-900 text-white shadow-sm'
      : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;

  const usageRecordColumns = useMemo<MgmtDataTableColumn<UsageRecord>[]>(() => {
    const typeBadge = (type: string) => {
      const styles: Record<string, string> = {
        agent: isDark ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
        skill: isDark ? 'bg-neutral-900/10 text-neutral-300 ring-1 ring-neutral-900/20' : 'bg-neutral-100 text-neutral-800 ring-1 ring-neutral-200/60',
        app: isDark ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
        mcp: isDark ? 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20' : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/70',
        dataset: isDark ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70',
      };
      return `inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[type] || ''}`;
    };
    const statusCls = (status: string) => (status === 'success' ? 'text-emerald-500' : 'text-rose-500');
    return [
      { id: 'time', header: '时间', cell: (r) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(r.createTime)}</span> },
      {
        id: 'name',
        header: '资源名称',
        cellClassName: 'max-w-[14rem]',
        cell: (r) => <span className={`block truncate ${textPrimary(theme)}`} title={r.displayName}>{r.displayName}</span>,
      },
      {
        id: 'type',
        header: '类型',
        cell: (r) => <span className={typeBadge(r.type)}>{TYPE_LABEL[r.type] ?? r.type}</span>,
      },
      {
        id: 'status',
        header: '状态',
        cell: (r) => <span className={`whitespace-nowrap text-xs font-semibold ${statusCls(r.status)}`}>{r.status === 'success' ? '成功' : '失败'}</span>,
      },
      { id: 'action', header: '动作', cell: (r) => <span className={textSecondary(theme)}>{r.action}</span> },
      {
        id: 'agent',
        header: '资源编码',
        cellClassName: 'max-w-[10rem]',
        cell: (r) => <span className={`block truncate ${textSecondary(theme)}`} title={r.agentName || undefined}>{r.agentName || '—'}</span>,
      },
      {
        id: 'preview',
        header: '输入预览',
        cellClassName: 'max-w-[12rem]',
        cell: (r) =>
          r.inputPreview ? (
            <span className={`line-clamp-1 ${textSecondary(theme)}`} title={r.inputPreview}>{r.inputPreview}</span>
          ) : (
            <span className={textSecondary(theme)}>—</span>
          ),
      },
      {
        id: 'latency',
        header: '耗时',
        cell: (r) => <span className={textSecondary(theme)}>{r.latencyMs > 0 ? `${(r.latencyMs / 1000).toFixed(1)}s` : '—'}</span>,
      },
    ];
  }, [theme, isDark]);

  const recentUseColumns = useMemo<MgmtDataTableColumn<RecentUseItem>[]>(() => {
    const recentStatusLabel = (status?: string) => (status === 'success' ? '成功' : status === 'failed' ? '失败' : '—');
    const recentStatusClass = (status?: string) =>
      status === 'success'
        ? 'text-emerald-600'
        : status === 'failed'
          ? 'text-rose-600'
          : textSecondary(theme);
    return [
      {
        id: 'time',
        header: '最近使用时间',
        cell: (item) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(item.lastUsedTime || item.createTime, '未知时间')}</span>,
      },
      {
        id: 'name',
        header: '资源名称',
        cellClassName: 'max-w-[12rem]',
        cell: (item) => <span className={`block truncate ${textPrimary(theme)}`} title={item.displayName || undefined}>{item.displayName || '—'}</span>,
      },
      { id: 'code', header: '资源编码', cell: (item) => <span className={`${textSecondary(theme)} font-mono`}>{item.targetCode || '—'}</span> },
      { id: 'type', header: '类型', cell: (item) => <span className={textSecondary(theme)}>{TYPE_LABEL[item.targetType] ?? item.targetType}</span> },
      { id: 'action', header: '最近动作', cell: (item) => <span className={textSecondary(theme)}>{item.action || '—'}</span> },
      {
        id: 'status',
        header: '状态',
        cell: (item) => <span className={`whitespace-nowrap text-xs font-semibold ${recentStatusClass(item.status)}`}>{recentStatusLabel(item.status)}</span>,
      },
      {
        id: 'latency',
        header: '耗时',
        cell: (item) => <span className={textSecondary(theme)}>{typeof item.latencyMs === 'number' && item.latencyMs > 0 ? `${item.latencyMs} ms` : '—'}</span>,
      },
    ];
  }, [theme]);

  const toolbar = (
    <div className={`${bentoCard(theme)} p-4 space-y-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setViewMode('records')} className={tabCls(viewMode === 'records')} aria-pressed={viewMode === 'records'} aria-label="查看使用记录">使用记录</button>
        <button type="button" onClick={() => setViewMode('recent')} className={tabCls(viewMode === 'recent')} aria-pressed={viewMode === 'recent'} aria-label="查看最近使用">最近使用</button>
      </div>
      {viewMode === 'records' ? (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${textMuted(theme)}`}>时间</span>
            <div className="flex flex-wrap gap-1.5">
              {([
                { label: '今天', value: 'today' as TimeFilter },
                { label: '近 7 天', value: '7d' as TimeFilter },
                { label: '近 30 天', value: '30d' as TimeFilter },
              ]).map((tb) => (
                <button
                  key={tb.value}
                  type="button"
                  onClick={() => {
                    setTimeFilter(tb.value);
                    setRecordsPage(1);
                  }}
                  className={tabCls(timeFilter === tb.value)}
                  aria-pressed={timeFilter === tb.value}
                >
                  {tb.label}
                </button>
              ))}
            </div>
          </div>
          <div className={`h-5 w-px shrink-0 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} aria-hidden />
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-xs font-semibold shrink-0 ${textMuted(theme)}`}>类型</span>
            <div className="flex flex-wrap gap-1.5">
              {([
                { label: '全部', value: 'all' as TypeFilter },
                { label: 'Agent', value: 'agent' as TypeFilter },
                { label: 'Skill', value: 'skill' as TypeFilter },
                { label: '应用', value: 'app' as TypeFilter },
                { label: 'MCP', value: 'mcp' as TypeFilter },
                { label: '数据集', value: 'dataset' as TypeFilter },
              ]).map((tb) => (
                <button
                  key={tb.value}
                  type="button"
                  onClick={() => {
                    setTypeFilter(tb.value);
                    setRecordsPage(1);
                  }}
                  className={tabCls(typeFilter === tb.value)}
                  aria-pressed={typeFilter === tb.value}
                >
                  {tb.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto min-w-[220px] w-full sm:w-auto sm:flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setRecordsPage(1);
              }}
              placeholder="搜索资源名、动作、资源编码或输入内容"
              theme={theme}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-xs font-semibold shrink-0 ${textMuted(theme)}`}>类型</span>
            <div className="flex flex-wrap gap-1.5">
              {([
                { label: '全部', value: 'all' as const },
                { label: 'Agent', value: 'agent' as const },
                { label: 'Skill', value: 'skill' as const },
                { label: 'MCP', value: 'mcp' as const },
                { label: '应用', value: 'app' as const },
                { label: '数据集', value: 'dataset' as const },
              ]).map((tb) => (
                <button
                  key={tb.value}
                  type="button"
                  onClick={() => {
                    setRecentTypeFilter(tb.value);
                    setRecentPage(1);
                  }}
                  className={tabCls(recentTypeFilter === tb.value)}
                  aria-pressed={recentTypeFilter === tb.value}
                >
                  {tb.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => void fetchRecent()} className={btnGhost(theme)} aria-label="刷新最近使用列表">
            <RefreshCw size={15} aria-hidden />
            刷新
          </button>
        </div>
      )}
    </div>
  );

  const recordRows = recordsData.list;
  const recentRows = recentData.list;

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Clock}
      breadcrumbSegments={breadcrumbSegments}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className={`px-4 sm:px-6 pb-8 ${pageBlockStack}`}>
        {viewMode === 'records' ? (
          loading ? (
            <PageSkeleton type="table" />
          ) : loadError ? (
            <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载使用记录" />
          ) : recordRows.length === 0 ? (
            <div className={`${bentoCard(theme)} py-12 text-center text-sm ${textMuted(theme)}`}>暂无记录</div>
          ) : (
            <>
              <MgmtDataTable<UsageRecord>
                theme={theme}
                surface="plain"
                minWidth="1100px"
                columns={usageRecordColumns}
                rows={recordRows}
                getRowKey={(r) => r.id}
              />
              <Pagination theme={theme} page={recordsPage} pageSize={PAGE_SIZE} total={recordsData.total} onChange={setRecordsPage} />
            </>
          )
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-transparent">
            {recentLoading ? (
              <PageSkeleton type="table" />
            ) : recentError ? (
              <PageError error={recentError} onRetry={() => void fetchRecent()} retryLabel="重试加载最近使用" />
            ) : recentRows.length === 0 ? (
              <div className={`py-12 text-center text-sm ${textMuted(theme)}`}>暂无最近使用资源</div>
            ) : (
              <>
                <MgmtDataTable<RecentUseItem>
                  theme={theme}
                  surface="plain"
                  minWidth="860px"
                  columns={recentUseColumns}
                  rows={recentRows}
                  getRowKey={(item) => `${item.targetType}-${item.targetId}-${item.id}`}
                />
                <Pagination theme={theme} page={recentPage} pageSize={PAGE_SIZE} total={recentData.total} onChange={setRecentPage} />
              </>
            )}
          </div>
        )}
      </div>
    </MgmtPageShell>
  );
};
