import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useCallLogs } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { SearchInput, FilterSelect, Pagination } from '../../components/common';
import type { CallLogEntry } from '../../types/dto/monitoring';
import {
  textPrimary, textSecondary, textMuted,
  tableCellScrollInner, tableCellScrollInnerMono,
} from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { RESOURCE_TYPE_LABEL } from '../../constants/resourceTypes';

interface CallLogPageProps {
  theme: Theme;
  fontSize: FontSize;
}

const PAGE_SIZE = 20;

const CALL_LOG_DESC = '检索统一网关调用记录，可按五类资源类型筛选';

const STATUS_BADGE: Record<CallLogEntry['status'], { light: string; dark: string; label: string }> = {
  success: { light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20', label: '成功' },
  error:   { light: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60',         dark: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',         label: '错误' },
  timeout: { light: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',     dark: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',     label: '超时' },
};

function safeText(v: unknown): string { return String(v ?? ''); }
function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const CallLogPage: React.FC<CallLogPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, statusFilter, resourceTypeFilter]);

  const callLogParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(debouncedQ ? { keyword: debouncedQ } : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(resourceTypeFilter !== 'all' ? { resourceType: resourceTypeFilter } : {}),
    }),
    [page, debouncedQ, statusFilter, resourceTypeFilter],
  );

  const logsQ = useCallLogs(callLogParams);
  const rows = logsQ.data?.list ?? [];
  const total = logsQ.data?.total ?? 0;

  const columns = useMemo<MgmtDataTableColumn<CallLogEntry>[]>(
    () => [
      {
        id: 'createdAt',
        header: '时间',
        cell: (r) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(r.createdAt)}</span>,
      },
      {
        id: 'resourceType',
        header: '资源类型',
        cell: (r) => {
          const t = r.resourceType?.trim() || '';
          const label = t ? (RESOURCE_TYPE_LABEL[t] ?? (t === 'unknown' ? '未分类' : t)) : '未分类';
          return (
            <span
              className={`inline-flex shrink-0 whitespace-nowrap px-2 py-0.5 rounded-lg text-xs font-semibold ${
                t
                  ? isDark
                    ? 'bg-violet-500/15 text-violet-300'
                    : 'bg-violet-50 text-violet-800'
                  : isDark
                    ? 'bg-white/[0.06] text-slate-400'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {label}
            </span>
          );
        },
      },
      {
        id: 'method',
        header: '方法',
        cell: (r) => (
          <span
            className={`inline-flex shrink-0 items-center whitespace-nowrap px-2 py-0.5 rounded-lg text-xs font-bold font-mono ${
              safeText(r.method).startsWith('GET')
                ? isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-700'
                : isDark ? 'bg-neutral-900/10 text-neutral-300' : 'bg-neutral-100 text-neutral-800'
            }`}
          >
            {safeText(r.method) || 'N/A'}
          </span>
        ),
      },
      {
        id: 'agent',
        header: '资源',
        cellClassName: 'min-w-[8rem] max-w-[14rem]',
        cell: (r) => <span className={`block min-w-0 truncate ${textPrimary(theme)}`} title={safeText(r.agentName)}>{safeText(r.agentName) || '未命名资源'}</span>,
      },
      {
        id: 'trace',
        header: 'TraceId',
        cellClassName: 'max-w-[180px]',
        cell: (r) => (
          <div className={`${tableCellScrollInnerMono} ${textMuted(theme)} truncate`} title={safeText(r.traceId)}>
            {safeText(r.traceId) || '—'}
          </div>
        ),
      },
      {
        id: 'status',
        header: '状态',
        cell: (r) => {
          const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.error;
          return (
            <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${isDark ? badge.dark : badge.light}`}>
              {badge.label}
            </span>
          );
        },
      },
      {
        id: 'code',
        header: '状态码',
        cell: (r) => (
          <span
            className={`inline-flex shrink-0 items-center whitespace-nowrap px-2 py-0.5 rounded-lg text-xs font-mono font-semibold ${
              r.statusCode >= 500
                ? isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-700'
                : r.statusCode >= 400
                  ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700'
                  : isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {safeNumber(r.statusCode)}
          </span>
        ),
      },
      {
        id: 'latency',
        header: '延迟',
        cell: (r) => (
          <span className={textSecondary(theme)}>
            {safeNumber(r.latencyMs) >= 1000 ? `${(safeNumber(r.latencyMs) / 1000).toFixed(1)}s` : `${safeNumber(r.latencyMs)}ms`}
          </span>
        ),
      },
      {
        id: 'ip',
        header: 'IP',
        cell: (r) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{r.ip || '—'}</span>,
      },
      {
        id: 'err',
        header: '错误信息',
        cellClassName: 'max-w-[220px]',
        cell: (r) => (
          <div className={`${tableCellScrollInner} text-[12px] truncate`} title={r.errorMessage || undefined}>
            {r.errorMessage || '—'}
          </div>
        ),
      },
    ],
    [isDark, theme],
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <FilterSelect
        value={statusFilter}
        onChange={(v) => { setStatusFilter(v); setPage(1); }}
        options={[
          { value: 'all', label: '全部状态' },
          { value: 'success', label: '成功' },
          { value: 'error', label: '错误' },
          { value: 'timeout', label: '超时' },
        ]}
        theme={theme}
        className="w-full sm:w-36"
      />
      <FilterSelect
        value={resourceTypeFilter}
        onChange={(v) => { setResourceTypeFilter(v); setPage(1); }}
        options={[
          { value: 'all', label: '全部类型' },
          { value: 'agent', label: '智能体' },
          { value: 'skill', label: '技能' },
          { value: 'mcp', label: 'MCP' },
          { value: 'app', label: '应用' },
          { value: 'dataset', label: '数据集' },
          { value: 'unknown', label: '未分类' },
        ]}
        theme={theme}
        className="w-full sm:w-40"
        aria-label="按资源类型筛选"
      />
      <div className="flex-1 min-w-[min(100%,200px)]">
        <SearchInput value={q} onChange={setQ} placeholder="方法、资源名、状态、状态码、TraceId…" theme={theme} />
      </div>
    </div>
  );

  if (logsQ.isError) {
    return (
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Search}
        breadcrumbSegments={['监控中心', '调用日志']}
        description={CALL_LOG_DESC}
      >
        <div className="px-4 sm:px-6 py-4">
          <PageError error={logsQ.error as Error} onRetry={() => logsQ.refetch()} />
        </div>
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Search}
      breadcrumbSegments={['监控中心', '调用日志']}
      description={CALL_LOG_DESC}
      toolbar={toolbar}
    >
      <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0 flex-1">
        {logsQ.isLoading ? (
          <div className="py-2"><PageSkeleton type="table" rows={8} /></div>
        ) : rows.length === 0 ? (
          <EmptyState title={debouncedQ || statusFilter !== 'all' || resourceTypeFilter !== 'all' ? '无匹配记录' : '暂无调用记录'} description="请调整搜索条件或确认采集服务已启动。" />
        ) : (
          <MgmtDataTable<CallLogEntry>
            theme={theme}
            columns={columns}
            rows={rows}
            getRowKey={(r) => `${r.id}-${r.createdAt}`}
            minWidth="1350px"
            surface="plain"
          />
        )}
        <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
      </div>
    </MgmtPageShell>
  );
};
