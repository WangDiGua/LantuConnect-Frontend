import React, { useEffect, useMemo, useState } from 'react';
import { Eye, GitBranch, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { useCallLogDetail, useCallLogs } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { SearchInput, FilterSelect, Pagination, TableCellEllipsis, Modal } from '../../components/common';
import type { CallLogDetail, CallLogEntry } from '../../types/dto/monitoring';
import { textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { RowActionGroup } from '../../components/management/RowActionGroup';
import { RESOURCE_TYPE_LABEL } from '../../constants/resourceTypes';
import { buildPath } from '../../constants/consoleRoutes';

interface CallLogPageProps {
  theme: Theme;
  fontSize: FontSize;
}

const PAGE_SIZE = 20;
const CALL_LOG_DESC = '调用日志中心聚焦请求级证据：支持按资源、状态、关键字检索，并联动 trace、告警和健康治理继续排障。';

const STATUS_BADGE: Record<CallLogEntry['status'], { light: string; dark: string; label: string }> = {
  success: { light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20', label: '成功' },
  error: { light: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60', dark: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20', label: '错误' },
  timeout: { light: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60', dark: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20', label: '超时' },
};

function safeText(v: unknown): string { return String(v ?? ''); }
function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function statusChip(theme: Theme, status: CallLogEntry['status']) {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.error;
  return `inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${theme === 'dark' ? badge.dark : badge.light}`;
}

const DetailBlock: React.FC<{ theme: Theme; title: string; children: React.ReactNode }> = ({ theme, title, children }) => (
  <div className={`rounded-[1.25rem] border p-4 ${theme === 'dark' ? 'border-white/8 bg-white/[0.03]' : 'border-slate-100 bg-white/95'}`}>
    <div className={`text-sm font-semibold ${textPrimary(theme)}`}>{title}</div>
    <div className="mt-3">{children}</div>
  </div>
);

const DetailField: React.FC<{ theme: Theme; label: string; value: React.ReactNode }> = ({ theme, label, value }) => (
  <div>
    <div className={`text-[11px] uppercase tracking-wide ${textMuted(theme)}`}>{label}</div>
    <div className={`mt-1 text-sm break-words ${textPrimary(theme)}`}>{value}</div>
  </div>
);

function buildFallbackDetail(entry: CallLogEntry): CallLogDetail {
  return {
    log: entry,
    trace: undefined,
    relatedAlerts: [],
    resourceHealth: undefined,
  };
}

function CallLogDetailContent({ theme, detail, navigate }: { theme: Theme; detail: CallLogDetail; navigate: ReturnType<typeof useNavigate> }) {
  const { log, trace, relatedAlerts, resourceHealth } = detail;
  const rawJson = JSON.stringify(detail, null, 2);

  return (
    <div className="space-y-4">
      <DetailBlock theme={theme} title="调用摘要">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailField theme={theme} label="资源" value={log.agentName || '--'} />
          <DetailField theme={theme} label="资源类型" value={log.resourceType ? (RESOURCE_TYPE_LABEL[log.resourceType] ?? log.resourceType) : '--'} />
          <DetailField theme={theme} label="方法" value={<span className="font-mono">{log.method || '--'}</span>} />
          <DetailField theme={theme} label="状态" value={<span className={statusChip(theme, log.status)}>{STATUS_BADGE[log.status]?.label ?? log.status}</span>} />
          <DetailField theme={theme} label="状态码" value={log.statusCode} />
          <DetailField theme={theme} label="耗时" value={`${log.latencyMs} ms`} />
          <DetailField theme={theme} label="用户" value={log.userId || '--'} />
          <DetailField theme={theme} label="发生时间" value={formatDateTime(log.createdAt)} />
          <DetailField theme={theme} label="IP" value={log.ip || '--'} />
          <DetailField theme={theme} label="TraceId" value={log.traceId || '--'} />
        </div>
        {log.errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
            {log.errorMessage}
          </div>
        ) : null}
      </DetailBlock>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailBlock theme={theme} title="关联 Trace">
          {trace ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailField theme={theme} label="入口资源" value={trace.rootDisplayName || trace.rootResourceCode || '--'} />
                <DetailField theme={theme} label="总耗时" value={`${trace.durationMs} ms`} />
                <DetailField theme={theme} label="Span 数" value={trace.spanCount} />
                <DetailField theme={theme} label="首个错误" value={trace.firstErrorMessage || '--'} />
              </div>
              <button
                type="button"
                className="text-sm text-sky-600 hover:underline"
                onClick={() => navigate(`${buildPath('admin', 'trace-center')}?traceId=${encodeURIComponent(trace.traceId)}`)}
              >
                进入链路追踪中心
              </button>
            </div>
          ) : (
            <div className={`text-sm ${textMuted(theme)}`}>当前调用没有关联的 trace 摘要。</div>
          )}
        </DetailBlock>

        <DetailBlock theme={theme} title="关联健康快照">
          {resourceHealth ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailField theme={theme} label="资源" value={resourceHealth.displayName || resourceHealth.resourceCode || '--'} />
                <DetailField theme={theme} label="健康状态" value={resourceHealth.healthStatus || '--'} />
                <DetailField theme={theme} label="熔断状态" value={resourceHealth.circuitState || '--'} />
                <DetailField theme={theme} label="可调用状态" value={resourceHealth.callabilityState || '--'} />
              </div>
              <div className={`text-sm ${textSecondary(theme)}`}>{resourceHealth.callabilityReason || resourceHealth.lastFailureReason || '暂无异常原因说明。'}</div>
              <button
                type="button"
                className="text-sm text-sky-600 hover:underline"
                onClick={() => navigate(`${buildPath('admin', 'health-governance')}?resourceId=${resourceHealth.resourceId}`)}
              >
                进入健康治理中心
              </button>
            </div>
          ) : (
            <div className={`text-sm ${textMuted(theme)}`}>当前调用没有关联的健康证据。</div>
          )}
        </DetailBlock>
      </div>

      <DetailBlock theme={theme} title="关联告警">
        {relatedAlerts.length === 0 ? (
          <div className={`text-sm ${textMuted(theme)}`}>当前调用没有关联告警。</div>
        ) : (
          <div className="space-y-3">
            {relatedAlerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => navigate(`${buildPath('admin', 'alert-center')}?detailId=${encodeURIComponent(alert.id)}`)}
                className={`w-full rounded-2xl border px-4 py-3 text-left ${theme === 'dark' ? 'border-white/8 bg-white/[0.03]' : 'border-slate-100 bg-slate-50/80'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={`text-sm font-semibold ${textPrimary(theme)}`}>{alert.ruleName}</div>
                  <div className={`text-xs ${textMuted(theme)}`}>{formatDateTime(alert.firedAt)}</div>
                </div>
                <div className={`mt-1 text-xs ${textMuted(theme)}`}>{alert.severity} / {alert.status}</div>
                <div className={`mt-2 text-sm ${textSecondary(theme)}`}>{alert.message}</div>
              </button>
            ))}
          </div>
        )}
      </DetailBlock>

      <DetailBlock theme={theme} title="Raw JSON">
        <pre className={`overflow-x-auto rounded-[1rem] p-4 text-xs leading-6 ${theme === 'dark' ? 'bg-slate-950/70 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
          {rawJson}
        </pre>
      </DetailBlock>
    </div>
  );
}

export const CallLogPage: React.FC<CallLogPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get('status') ?? 'all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>(() => searchParams.get('resourceType') ?? 'all');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [resourceIdFilter] = useState<number | undefined>(() => {
    const raw = Number(searchParams.get('resourceId') ?? '');
    return Number.isFinite(raw) && raw > 0 ? raw : undefined;
  });
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? '1') || 1);
  useScrollPaginatedContentToTop(page);

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
      ...(resourceIdFilter ? { resourceId: resourceIdFilter } : {}),
    }),
    [page, debouncedQ, resourceIdFilter, resourceTypeFilter, statusFilter],
  );

  const logsQ = useCallLogs(callLogParams);
  const logDetailQ = useCallLogDetail(selectedLogId ?? undefined);
  const rows = logsQ.data?.list ?? [];
  const total = logsQ.data?.total ?? 0;
  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedLogId) ?? null,
    [rows, selectedLogId],
  );
  const modalDetail = logDetailQ.data ?? (selectedRow ? buildFallbackDetail(selectedRow) : null);

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
              className={`inline-flex shrink-0 whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-semibold ${
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
            className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-bold font-mono ${
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
        cell: (r) => <TableCellEllipsis text={safeText(r.traceId)} mono className={textMuted(theme)} emptyLabel="--" />,
      },
      {
        id: 'status',
        header: '状态',
        cell: (r) => <span className={statusChip(theme, r.status)}>{STATUS_BADGE[r.status]?.label ?? r.status}</span>,
      },
      {
        id: 'code',
        header: '状态码',
        cell: (r) => (
          <span
            className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-mono font-semibold ${
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
        cell: (r) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{r.ip || '--'}</span>,
      },
      {
        id: 'err',
        header: '错误信息',
        cellClassName: 'max-w-[220px]',
        cell: (r) => (
          <TableCellEllipsis
            text={r.errorMessage}
            className={`text-[12px] ${textSecondary(theme)}`}
            emptyLabel="--"
          />
        ),
      },
      {
        id: 'actions',
        header: '操作',
        cell: (r) => (
          <RowActionGroup
            theme={theme}
            actions={[
              {
                key: 'detail',
                label: '详情',
                icon: Eye,
                onClick: () => setSelectedLogId(r.id),
              },
              {
                key: 'trace',
                label: '链路',
                icon: GitBranch,
                hidden: !safeText(r.traceId),
                onClick: () => navigate(`${buildPath('admin', 'trace-center')}?traceId=${encodeURIComponent(r.traceId)}`),
              },
            ]}
          />
        ),
      },
    ],
    [isDark, navigate, theme],
  );

  const toolbar = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
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
      <div className="min-w-[min(100%,200px)] flex-1">
        <SearchInput value={q} onChange={setQ} placeholder="方法、资源名、状态、状态码、TraceId" theme={theme} />
      </div>
    </div>
  );

  if (logsQ.isError) {
    return (
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Search}
        breadcrumbSegments={['监控运维', '调用日志中心']}
        description={CALL_LOG_DESC}
      >
        <div className="px-4 py-4 sm:px-6">
          <PageError error={logsQ.error as Error} onRetry={() => logsQ.refetch()} />
        </div>
      </MgmtPageShell>
    );
  }

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Search}
        breadcrumbSegments={['监控运维', '调用日志中心']}
        description={CALL_LOG_DESC}
        toolbar={toolbar}
      >
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 sm:px-6">
          {logsQ.isLoading ? (
            <div className="py-2"><PageSkeleton type="table" rows={8} /></div>
          ) : rows.length === 0 ? (
            <EmptyState title={debouncedQ || statusFilter !== 'all' || resourceTypeFilter !== 'all' ? '无匹配记录' : '暂无调用记录'} description="请调整搜索条件或确认采集服务已启用。" />
          ) : (
            <MgmtDataTable<CallLogEntry>
              theme={theme}
              columns={columns}
              rows={rows}
              getRowKey={(r) => `${r.id}-${r.createdAt}`}
              minWidth="1460px"
              surface="plain"
            />
          )}
          <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
        </div>
      </MgmtPageShell>

      <Modal
        open={Boolean(selectedLogId)}
        onClose={() => setSelectedLogId(null)}
        title="调用详情"
        theme={theme}
        size="2xl"
      >
        {logDetailQ.isLoading ? (
          <PageSkeleton type="detail" rows={5} />
        ) : logDetailQ.isError ? (
          modalDetail ? (
            <div className="space-y-4">
              <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800">
                调用详情接口暂时不可用，当前先用列表摘要继续排查。你仍然可以查看错误信息、TraceId 并继续跳转到链路追踪或健康治理。
                <button type="button" className="ml-2 font-semibold underline" onClick={() => logDetailQ.refetch()}>
                  重试明细
                </button>
              </div>
              <CallLogDetailContent theme={theme} detail={modalDetail} navigate={navigate} />
            </div>
          ) : (
            <PageError error={logDetailQ.error as Error} onRetry={() => logDetailQ.refetch()} />
          )
        ) : modalDetail ? (
          <CallLogDetailContent theme={theme} detail={modalDetail} navigate={navigate} />
        ) : (
          <EmptyState title="未找到调用详情" description="这条调用可能已被清理，或明细接口暂未返回数据。" />
        )}
      </Modal>
    </>
  );
};
