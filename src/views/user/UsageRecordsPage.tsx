import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { userActivityService } from '../../api/services/user-activity.service';
import type { UsageRecord, RecentUseItem } from '../../types/dto/user-activity';
import { BentoCard } from '../../components/common/BentoCard';
import { PageError } from '../../components/common/PageError';
import { Pagination, SearchInput } from '../../components/common';
import {
  canvasBodyBg, bentoCard, btnGhost, textPrimary, textSecondary, textMuted, tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { formatDateTime } from '../../utils/formatDateTime';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { PageSkeleton } from '../../components/common/PageSkeleton';

type TimeFilter = 'today' | '7d' | '30d';
type TypeFilter = 'all' | 'agent' | 'skill' | 'app' | 'mcp' | 'dataset';
type ViewMode = 'records' | 'recent';

interface UsageRecordsPageProps {
  theme: Theme;
  fontSize: FontSize;
  initialView?: ViewMode;
}

const TYPE_LABEL: Record<string, string> = { agent: 'Agent', skill: 'Skill', app: '应用', mcp: 'MCP', dataset: '数据集' };
const PAGE_SIZE = 20;

export const UsageRecordsPage: React.FC<UsageRecordsPageProps> = ({ theme, initialView = 'records' }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    userActivityService.getUsageRecords({ range: timeFilter, type: typeFilter === 'all' ? undefined : typeFilter })
      .then(res => setRecords(res.list))
      .catch(err => setLoadError(err instanceof Error ? err : new Error('加载使用记录失败')))
      .finally(() => setLoading(false));
  }, [timeFilter, typeFilter]);

  useEffect(() => {
    if (viewMode === 'records') fetchData();
  }, [fetchData, viewMode]);

  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  const [recentItems, setRecentItems] = useState<RecentUseItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<Error | null>(null);
  const [recentTypeFilter, setRecentTypeFilter] = useState<RecentUseItem['targetType'] | 'all'>('all');

  const fetchRecent = useCallback(async () => {
    setRecentError(null);
    setRecentLoading(true);
    try {
      const list = await userActivityService.getRecentUse({ limit: 50 });
      setRecentItems(list);
    } catch (err) {
      setRecentError(err instanceof Error ? err : new Error('加载最近使用失败'));
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'recent') {
      void fetchRecent();
    }
  }, [fetchRecent, viewMode]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      if (!term) return true;
      return `${record.displayName} ${record.action} ${record.agentName} ${record.inputPreview}`.toLowerCase().includes(term);
    });
  }, [records, search]);

  const recentRows = useMemo(
    () => (recentTypeFilter === 'all' ? recentItems : recentItems.filter((item) => item.targetType === recentTypeFilter)),
    [recentItems, recentTypeFilter],
  );

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (page > totalPages) setPage(totalPages);
  }, [rows, page]);

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      agent: isDark ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
      skill: isDark ? 'bg-neutral-900/10 text-neutral-300 ring-1 ring-neutral-900/20' : 'bg-neutral-100 text-neutral-800 ring-1 ring-neutral-200/60',
      app:   isDark ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
      mcp: isDark ? 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20' : 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/70',
      dataset: isDark ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70',
    };
    return `inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[type] || ''}`;
  };

  const statusCls = (status: string) => status === 'success' ? 'text-emerald-500' : 'text-rose-500';
  const recentStatusLabel = (status?: string) => (status === 'success' ? '成功' : status === 'failed' ? '失败' : '—');
  const recentStatusClass = (status?: string) =>
    status === 'success'
      ? 'text-emerald-600'
      : status === 'failed'
        ? 'text-rose-600'
        : textSecondary(theme);

  const tabCls = (active: boolean) => `px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] ${
    active
      ? 'bg-neutral-900 text-white shadow-sm'
      : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex min-w-0 items-center gap-3">
          <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
            <Clock size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
          </div>
          <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '使用活动'} tagline="最近使用与调用明细统一查看" />
        </div>

        {/* Filters */}
        <BentoCard theme={theme} padding="sm">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setViewMode('records')} className={tabCls(viewMode === 'records')}>使用记录</button>
              <button type="button" onClick={() => setViewMode('recent')} className={tabCls(viewMode === 'recent')}>最近使用</button>
            </div>
            {viewMode === 'records' ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${textMuted(theme)}`}>时间</span>
                  <div className="flex gap-1.5">
                    {([{ label: '今天', value: 'today' as TimeFilter }, { label: '近7天', value: '7d' as TimeFilter }, { label: '近30天', value: '30d' as TimeFilter }]).map((tb) => (
                      <button key={tb.value} type="button" onClick={() => setTimeFilter(tb.value)} className={tabCls(timeFilter === tb.value)}>{tb.label}</button>
                    ))}
                  </div>
                </div>
                <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${textMuted(theme)}`}>类型</span>
                  <div className="flex gap-1.5">
                    {([
                      { label: '全部', value: 'all' as TypeFilter },
                      { label: 'Agent', value: 'agent' as TypeFilter },
                      { label: 'Skill', value: 'skill' as TypeFilter },
                      { label: '应用', value: 'app' as TypeFilter },
                      { label: 'MCP', value: 'mcp' as TypeFilter },
                      { label: '数据集', value: 'dataset' as TypeFilter },
                    ]).map((tb) => (
                      <button key={tb.value} type="button" onClick={() => { setTypeFilter(tb.value); setPage(1); }} className={tabCls(typeFilter === tb.value)}>{tb.label}</button>
                    ))}
                  </div>
                </div>
                <div className="ml-auto min-w-[220px] flex-1">
                  <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="搜索资源名、动作、输入内容…" theme={theme} />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${textMuted(theme)}`}>类型</span>
                  <div className="flex gap-1.5">
                    {([
                      { label: '全部', value: 'all' as const },
                      { label: 'Agent', value: 'agent' as const },
                      { label: 'Skill', value: 'skill' as const },
                      { label: 'MCP', value: 'mcp' as const },
                      { label: '应用', value: 'app' as const },
                      { label: '数据集', value: 'dataset' as const },
                    ]).map((tb) => (
                      <button key={tb.value} type="button" onClick={() => setRecentTypeFilter(tb.value)} className={tabCls(recentTypeFilter === tb.value)}>{tb.label}</button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => void fetchRecent()} className={btnGhost(theme)}>
                  <RefreshCw size={15} />
                  刷新
                </button>
              </div>
            )}
          </div>
        </BentoCard>

        {/* Table rows */}
        {viewMode === 'records' ? (
          loading ? (
            <PageSkeleton type="table" />
          ) : loadError ? (
            <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载使用记录" />
          ) : rows.length === 0 ? (
            <BentoCard theme={theme}><div className={`py-12 text-center text-sm ${textMuted(theme)}`}>暂无记录</div></BentoCard>
          ) : (
            <div className={`${bentoCard(theme)} overflow-hidden`}>
              <div className="overflow-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <tr>
                      <th className={tableHeadCell(theme)}>时间</th>
                      <th className={tableHeadCell(theme)}>资源名称</th>
                      <th className={tableHeadCell(theme)}>类型</th>
                      <th className={tableHeadCell(theme)}>状态</th>
                      <th className={tableHeadCell(theme)}>动作</th>
                      <th className={tableHeadCell(theme)}>资源</th>
                      <th className={tableHeadCell(theme)}>Token 消耗</th>
                      <th className={tableHeadCell(theme)}>输入预览</th>
                      <th className={tableHeadCell(theme)}>耗时</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((record, idx) => (
                      <tr key={record.id} className={tableBodyRow(theme, idx)}>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{formatDateTime(record.createTime)}</td>
                        <td className={`${tableCell()} ${textPrimary(theme)}`}>{record.displayName}</td>
                        <td className={tableCell()}><span className={typeBadge(record.type)}>{TYPE_LABEL[record.type] ?? record.type}</span></td>
                        <td className={`${tableCell()} text-xs font-semibold ${statusCls(record.status)}`}>{record.status === 'success' ? '成功' : '失败'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{record.action}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{record.agentName || '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{record.tokenCost > 0 ? record.tokenCost : '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>
                          {record.inputPreview ? <span className="line-clamp-1" title={record.inputPreview}>{record.inputPreview}</span> : '—'}
                        </td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{record.latencyMs > 0 ? `${(record.latencyMs / 1000).toFixed(1)}s` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`px-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />
              </div>
            </div>
          )
        ) : (
          <div className={`${bentoCard(theme)} overflow-hidden`}>
            {recentLoading ? (
              <PageSkeleton type="table" />
            ) : recentError ? (
              <PageError error={recentError} onRetry={() => void fetchRecent()} retryLabel="重试加载最近使用" />
            ) : recentRows.length === 0 ? (
              <div className={`py-12 text-center text-sm ${textMuted(theme)}`}>暂无最近使用记录</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <tr>
                      <th className={tableHeadCell(theme)}>时间</th>
                      <th className={tableHeadCell(theme)}>资源名称</th>
                      <th className={tableHeadCell(theme)}>资源编码</th>
                      <th className={tableHeadCell(theme)}>类型</th>
                      <th className={tableHeadCell(theme)}>动作</th>
                      <th className={tableHeadCell(theme)}>状态</th>
                      <th className={tableHeadCell(theme)}>Token</th>
                      <th className={tableHeadCell(theme)}>耗时</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.map((item, idx) => (
                      <tr key={`${item.targetType}-${item.targetId}-${item.id}`} className={tableBodyRow(theme, idx)}>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{formatDateTime(item.createTime || item.lastUsedTime, '未知时间')}</td>
                        <td className={`${tableCell()} ${textPrimary(theme)}`}>{item.displayName || '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)} font-mono`}>{item.targetCode || '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{TYPE_LABEL[item.targetType] ?? item.targetType}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{item.action || '—'}</td>
                        <td className={`${tableCell()} text-xs font-semibold ${recentStatusClass(item.status)}`}>{recentStatusLabel(item.status)}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{typeof item.tokenCost === 'number' ? item.tokenCost : '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{typeof item.latencyMs === 'number' && item.latencyMs > 0 ? `${item.latencyMs} ms` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
