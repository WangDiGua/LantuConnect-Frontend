import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useCallLogs } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { SearchInput, FilterSelect, Pagination } from '../../components/common';
import type { CallLogEntry } from '../../types/dto/monitoring';
import {
  canvasBodyBg, bentoCard, textPrimary, textSecondary, textMuted, tableBodyRow, tableCell, tableHeadCell,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { formatDateTime } from '../../utils/formatDateTime';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

interface CallLogPageProps {
  theme: Theme;
  fontSize: FontSize;
}

const PAGE_SIZE = 20;

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
export const CallLogPage: React.FC<CallLogPageProps> = ({ theme }) => {
  const { chromePageTitle } = useLayoutChrome();
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
        safeText(r.method).toLowerCase().includes(term)
        || safeText(r.agentName).toLowerCase().includes(term)
        || safeText(r.traceId).toLowerCase().includes(term)
        || safeText(r.model).toLowerCase().includes(term)
        || String(safeNumber(r.statusCode)).includes(term)
      );
    });
  }, [logsQ.data, q, statusFilter]);

  const total = logsQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (logsQ.isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}>
        <PageError error={logsQ.error as Error} onRetry={() => logsQ.refetch()} />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${bentoCard(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-cyan-500/15' : 'bg-cyan-50'}`}>
                <Search size={20} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
              </div>
              <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '调用日志'} tagline="检索网关与 Agent 推理请求记录" />
            </div>
          </div>

          {/* Filters */}
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
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
              <div className="flex-1 min-w-[min(100%,200px)]">
                <SearchInput value={q} onChange={setQ} placeholder="方法、Agent、模型、状态码、TraceId…" theme={theme} />
              </div>
            </div>
          </div>

          {/* Table rows */}
          <div className="flex-1 min-h-0 overflow-auto">
            {logsQ.isLoading ? (
              <div className="p-4"><PageSkeleton type="table" rows={8} /></div>
            ) : rows.length === 0 ? (
              <EmptyState title={q || statusFilter !== 'all' ? '无匹配记录' : '暂无调用记录'} description="请调整搜索条件或确认采集服务已启动。" />
            ) : (
              <table className="w-full min-w-[1350px] text-sm">
                <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <tr>
                    <th className={tableHeadCell(theme)}>时间</th>
                    <th className={tableHeadCell(theme)}>方法</th>
                    <th className={tableHeadCell(theme)}>资源</th>
                    <th className={tableHeadCell(theme)}>TraceId</th>
                    <th className={tableHeadCell(theme)}>模型</th>
                    <th className={tableHeadCell(theme)}>状态</th>
                    <th className={tableHeadCell(theme)}>状态码</th>
                    <th className={tableHeadCell(theme)}>延迟</th>
                    <th className={tableHeadCell(theme)}>输入 Tokens</th>
                    <th className={tableHeadCell(theme)}>输出 Tokens</th>
                    <th className={tableHeadCell(theme)}>费用</th>
                    <th className={tableHeadCell(theme)}>IP</th>
                    <th className={tableHeadCell(theme)}>错误信息</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const badge = STATUS_BADGE[r.status];
                    return (
                      <tr key={`${r.id}-${r.createdAt}`} className={tableBodyRow(theme, idx)}>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{formatDateTime(r.createdAt)}</td>
                        <td className={tableCell()}>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono ${
                            safeText(r.method).startsWith('GET')
                              ? isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-700'
                              : isDark ? 'bg-neutral-900/10 text-neutral-300' : 'bg-neutral-100 text-neutral-800'
                          }`}>
                            {safeText(r.method) || 'N/A'}
                          </span>
                        </td>
                        <td className={`${tableCell()} ${textPrimary(theme)}`}>{safeText(r.agentName) || '未命名资源'}</td>
                        <td className={tableCell()}>
                          <span className={`font-mono text-[11px] ${textMuted(theme)}`}>{safeText(r.traceId) || '—'}</span>
                        </td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{safeText(r.model) || '未知模型'}</td>
                        <td className={tableCell()}>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isDark ? badge.dark : badge.light}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className={tableCell()}>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold ${
                            r.statusCode >= 500
                              ? isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-700'
                              : r.statusCode >= 400
                                ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700'
                                : isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {safeNumber(r.statusCode)}
                          </span>
                        </td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>
                          {safeNumber(r.latencyMs) >= 1000 ? `${(safeNumber(r.latencyMs) / 1000).toFixed(1)}s` : `${safeNumber(r.latencyMs)}ms`}
                        </td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{safeNumber(r.inputTokens)}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{safeNumber(r.outputTokens)}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{r.cost > 0 ? `¥${r.cost.toFixed(4)}` : '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{r.ip || '—'}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{r.errorMessage || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className={`px-4 border-t shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
};
