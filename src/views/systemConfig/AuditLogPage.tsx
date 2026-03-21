import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { TOOLBAR_ROW } from '../../utils/toolbarFieldClasses';
import { Download, History } from 'lucide-react';
import { useSysAuditLogs } from '../../hooks/queries/useSystemConfig';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTable, SearchInput, FilterSelect, type Column } from '../../components/common';
import { btnSecondary, textSecondary, textMuted } from '../../utils/uiClasses';
import type { AuditLogEntry } from '../../types/dto/system-config';

interface AuditLogPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

const PAGE_SIZE = 20;
const ACTION_OPTIONS = ['全部', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'DEPLOY'];

export const AuditLogPage: React.FC<AuditLogPageProps> = ({
  theme, fontSize, showMessage, breadcrumbSegments,
}) => {
  const isDark = theme === 'dark';
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('全部');
  const [onlyFail, setOnlyFail] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useSysAuditLogs({
    page,
    pageSize: PAGE_SIZE,
    ...(actionFilter !== '全部' ? { action: actionFilter } : {}),
  });

  const logs: AuditLogEntry[] = data?.list ?? [];
  const total = data?.total ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((row) => {
      if (onlyFail && row.result !== 'failure') return false;
      if (!q) return true;
      return (
        row.operator.toLowerCase().includes(q) ||
        row.action.toLowerCase().includes(q) ||
        row.resource.toLowerCase().includes(q) ||
        row.ip.toLowerCase().includes(q)
      );
    });
  }, [logs, search, onlyFail]);

  const exportCsv = () => {
    const header = ['time', 'operator', 'action', 'resource', 'ip', 'result'];
    const lines = [header.join(',')].concat(
      filtered.map((r) =>
        [r.time, r.operator, r.action, r.resource, r.ip, r.result]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(',')
      )
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('已导出当前筛选结果', 'success');
  };

  if (isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} breadcrumbSegments={breadcrumbSegments} titleIcon={History}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={History}
      description="检索关键操作记录，支持按动作筛选与导出"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="flex-1 min-w-0 sm:max-w-md">
            <SearchInput value={search} onChange={setSearch} placeholder="操作者、动作、资源、IP…" theme={theme} />
          </div>
          <FilterSelect
            value={actionFilter}
            onChange={(value) => { setActionFilter(value); setPage(1); }}
            options={ACTION_OPTIONS.map((a) => ({ value: a, label: a }))}
            theme={theme}
            className="w-full sm:w-[10rem] shrink-0"
          />
          <label className="flex items-center gap-2 cursor-pointer shrink-0 min-h-[2.5rem]">
            <input
              type="checkbox"
              checked={onlyFail}
              onChange={(e) => setOnlyFail(e.target.checked)}
              className="toggle toggle-primary toggle-sm"
            />
            <span className={`text-sm whitespace-nowrap ${textSecondary(theme)}`}>仅失败</span>
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className={`${btnSecondary(theme)} gap-1.5 shrink-0`}
          >
            <Download size={16} />
            导出 CSV
          </button>
        </div>
      }
    >
      <ContentLoader loading={isLoading}>
        <div className="min-w-0 px-4 sm:px-6 pb-2 pt-1">
          {filtered.length === 0 ? (
            <EmptyState title="无匹配日志" description="调整搜索条件或筛选器" />
          ) : (
            <DataTable<AuditLogEntry>
              columns={[
                {
                  key: 'time',
                  label: '时间',
                  render: (value, row) => (
                    <span className="text-xs font-mono whitespace-nowrap">{value || row.createdAt}</span>
                  ),
                },
                {
                  key: 'operator',
                  label: '操作者',
                  render: (value, row) => (
                    <span className="max-w-[180px] truncate" title={String(value || row.username)}>{value || row.username}</span>
                  ),
                },
                {
                  key: 'action',
                  label: '动作',
                  render: (value) => <span className="font-mono text-xs">{value}</span>,
                },
                {
                  key: 'resource',
                  label: '资源',
                  render: (value) => (
                    <span className="max-w-[200px] truncate font-mono text-xs" title={String(value)}>{value}</span>
                  ),
                },
                {
                  key: 'ip',
                  label: 'IP',
                  render: (value) => <span className="font-mono text-xs">{value}</span>,
                },
                {
                  key: 'result',
                  label: '结果',
                  render: (value) => (
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      value === 'success'
                        ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                        : isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-800'
                    }`}>
                      {value === 'success' ? '成功' : '失败'}
                    </span>
                  ),
                },
              ]}
              data={filtered}
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
      </ContentLoader>
    </MgmtPageShell>
  );
};
