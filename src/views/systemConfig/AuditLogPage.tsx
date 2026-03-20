import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Download, History } from 'lucide-react';
import { useSysAuditLogs } from '../../hooks/queries/useSystemConfig';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
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
  theme,
  fontSize,
  showMessage,
  breadcrumbSegments,
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

  const sel = nativeSelectClass(theme);

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
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="操作者、动作、资源、IP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={toolbarSearchInputClass(theme)}
            />
          </div>
          <select
            className={`${sel} w-full sm:w-[10rem] shrink-0`}
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            aria-label="动作类型"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer shrink-0 min-h-[2.5rem]">
            <input
              type="checkbox"
              checked={onlyFail}
              onChange={(e) => setOnlyFail(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className={`text-sm whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>仅失败</span>
          </label>
          <button
            type="button"
            onClick={exportCsv}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border shrink-0 min-h-[2.5rem] ${
              isDark
                ? 'border-white/10 text-slate-200 hover:bg-white/5'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[900px]">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>时间</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>操作者</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>动作</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>资源</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>IP</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>结果</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`border-b transition-colors ${
                        isDark
                          ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'} hover:bg-white/5`
                          : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100/80`
                      }`}
                    >
                      <td className={`px-4 py-3 whitespace-nowrap text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {r.time || r.createdAt}
                      </td>
                      <td className={`px-4 py-3 max-w-[180px] truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={r.operator || r.username}>
                        {r.operator || r.username}
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{r.action}</td>
                      <td
                        className={`px-4 py-3 max-w-[200px] truncate font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                        title={r.resource}
                      >
                        {r.resource}
                      </td>
                      <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{r.ip}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            r.result === 'success'
                              ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                              : isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.result === 'success' ? '成功' : '失败'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {total > 0 && (
          <div className="px-4 sm:px-6">
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        )}
      </ContentLoader>
    </MgmtPageShell>
  );
};
