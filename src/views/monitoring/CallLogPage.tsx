import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { TOOLBAR_ROW } from '../../utils/toolbarFieldClasses';
import { Search } from 'lucide-react';
import { useCallLogs } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTable, SearchInput, FilterSelect, type Column } from '../../components/common';
import type { CallLogEntry } from '../../types/dto/monitoring';

interface CallLogPageProps {
  theme: Theme;
  fontSize: FontSize;
}

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<CallLogEntry['status'], { light: string; dark: string; label: string }> = {
  success: { light: 'bg-emerald-100 text-emerald-800', dark: 'bg-emerald-500/20 text-emerald-300', label: '成功' },
  error:   { light: 'bg-red-100 text-red-800',         dark: 'bg-red-500/20 text-red-300',         label: '错误' },
  timeout: { light: 'bg-amber-100 text-amber-900',     dark: 'bg-amber-500/20 text-amber-300',     label: '超时' },
};

export const CallLogPage: React.FC<CallLogPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const logsQ = useCallLogs({ page, pageSize: PAGE_SIZE });

  const rows = useMemo(() => {
    const list = logsQ.data?.list ?? [];
    const term = q.trim().toLowerCase();
    return list.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!term) return true;
      return (
        r.method.toLowerCase().includes(term) ||
        r.agentName.toLowerCase().includes(term) ||
        r.model.toLowerCase().includes(term) ||
        String(r.statusCode).includes(term)
      );
    });
  }, [logsQ.data, q, statusFilter]);

  const total = logsQ.data?.total ?? 0;

  const shell = (children: React.ReactNode) => (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['监控中心', '调用日志']}
      titleIcon={Search}
      description="检索网关与 Agent 推理请求记录"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="flex-1 min-w-0 sm:max-w-md">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="方法、Agent、模型、状态码…"
              theme={theme}
            />
          </div>
          <FilterSelect
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setPage(1); }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'success', label: '成功' },
              { value: 'error', label: '错误' },
              { value: 'timeout', label: '超时' },
            ]}
            theme={theme}
            className="w-full sm:w-[8.5rem] shrink-0"
          />
        </div>
      }
    >
      {children}
    </MgmtPageShell>
  );

  if (logsQ.isLoading) {
    return shell(<PageSkeleton type="table" rows={8} />);
  }

  if (logsQ.isError) {
    return shell(<PageError error={logsQ.error as Error} onRetry={() => logsQ.refetch()} />);
  }

  if (rows.length === 0 && !q && statusFilter === 'all') {
    return shell(<EmptyState title="暂无调用记录" description="当前无请求日志，请确认采集服务已启动。" />);
  }

  return shell(
    <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
      {rows.length === 0 && (q || statusFilter !== 'all') ? (
        <EmptyState title="无匹配记录" description="请调整搜索条件或筛选项后重试。" />
      ) : (
        <DataTable<CallLogEntry>
          columns={[
            {
              key: 'createdAt',
              label: '时间',
              render: (value) => (
                <span className="font-mono text-xs whitespace-nowrap">
                  {new Date(value as string).toLocaleString('zh-CN', { hour12: false })}
                </span>
              ),
            },
            {
              key: 'method',
              label: '方法',
              render: (value) => (
                <span
                  className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-mono font-medium ${
                    String(value).startsWith('GET')
                      ? isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-800'
                      : isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-800'
                  }`}
                >
                  {value}
                </span>
              ),
            },
            {
              key: 'statusCode',
              label: '状态码',
              render: (value) => (
                <span
                  className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-mono font-semibold ${
                    (value as number) >= 500
                      ? isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-800'
                      : (value as number) >= 400
                        ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900'
                        : isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {value}
                </span>
              ),
            },
            {
              key: 'status',
              label: '状态',
              render: (value) => {
                const badge = STATUS_BADGE[value as CallLogEntry['status']];
                return (
                  <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? badge.dark : badge.light}`}>
                    {badge.label}
                  </span>
                );
              },
            },
            {
              key: 'latencyMs',
              label: '延迟',
              render: (value) => (
                <span className="font-mono text-xs">
                  {(value as number) >= 1000 ? `${((value as number) / 1000).toFixed(1)}s` : `${value}ms`}
                </span>
              ),
            },
            {
              key: 'agentName',
              label: 'Agent',
              render: (value) => (
                <span className="text-xs max-w-[140px] truncate" title={String(value)}>
                  {value}
                </span>
              ),
            },
            {
              key: 'model',
              label: '模型',
              render: (value) => (
                <span className="text-xs max-w-[140px] truncate" title={String(value)}>
                  {value}
                </span>
              ),
            },
            {
              key: 'inputTokens',
              label: 'Tokens',
              render: (value, row) => (
                <span className="text-xs tabular-nums">{(row.inputTokens || 0) + (row.outputTokens || 0)}</span>
              ),
            },
          ]}
          data={rows}
          theme={theme}
          pagination={
            total > 0
              ? {
                  currentPage: page,
                  totalPages: Math.ceil(total / PAGE_SIZE),
                  onPageChange: setPage,
                  pageSize: PAGE_SIZE,
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
