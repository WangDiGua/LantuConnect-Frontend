import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useCallLogs } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { AnimatedList } from '../../components/common/AnimatedList';
import { SearchInput, FilterSelect } from '../../components/common';
import type { CallLogEntry } from '../../types/dto/monitoring';
import {
  pageBg, bentoCard, bentoCardHover, btnGhost,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

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

export const CallLogPage: React.FC<CallLogPageProps> = ({ theme }) => {
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
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (logsQ.isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <PageError error={logsQ.error as Error} onRetry={() => logsQ.refetch()} />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${bentoCard(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/15' : 'bg-cyan-50'}`}>
                <Search size={20} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>调用日志</h1>
                <span className={`text-xs ${textMuted(theme)}`}>检索网关与 Agent 推理请求记录</span>
              </div>
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
                <SearchInput value={q} onChange={setQ} placeholder="方法、Agent、模型、状态码…" theme={theme} />
              </div>
            </div>
          </div>

          {/* Card-style rows */}
          <div className="flex-1 min-h-0 overflow-auto">
            {logsQ.isLoading ? (
              <div className="p-4"><PageSkeleton type="table" rows={8} /></div>
            ) : rows.length === 0 ? (
              <EmptyState title={q || statusFilter !== 'all' ? '无匹配记录' : '暂无调用记录'} description="请调整搜索条件或确认采集服务已启动。" />
            ) : (
              <AnimatedList className="p-3 space-y-2">
                {rows.map((r) => {
                  const badge = STATUS_BADGE[r.status];
                  return (
                    <motion.div
                      key={`${r.createdAt}-${r.agentName}-${r.statusCode}`}
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className={`${bentoCardHover(theme)} p-4 flex items-center gap-4 ${isDark ? 'hover:bg-indigo-500/[0.03]' : 'hover:bg-indigo-50/40'}`}
                    >
                      {/* Method badge */}
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono shrink-0 ${
                        r.method.startsWith('GET')
                          ? isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-700'
                          : isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-700'
                      }`}>
                        {r.method}
                      </span>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm truncate ${textPrimary(theme)}`}>{r.agentName}</span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isDark ? badge.dark : badge.light}`}>
                            {badge.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold ${
                            r.statusCode >= 500
                              ? isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-700'
                              : r.statusCode >= 400
                                ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700'
                                : isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {r.statusCode}
                          </span>
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${textMuted(theme)}`}>
                          {r.model} · {new Date(r.createdAt).toLocaleString('zh-CN', { hour12: false })}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="hidden lg:flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <div className={`text-[10px] uppercase tracking-wider ${textMuted(theme)}`}>延迟</div>
                          <div className={`text-sm font-mono tabular-nums font-medium ${textSecondary(theme)}`}>
                            {r.latencyMs >= 1000 ? `${(r.latencyMs / 1000).toFixed(1)}s` : `${r.latencyMs}ms`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-[10px] uppercase tracking-wider ${textMuted(theme)}`}>Tokens</div>
                          <div className={`text-sm font-mono tabular-nums font-medium ${textSecondary(theme)}`}>
                            {(r.inputTokens || 0) + (r.outputTokens || 0)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatedList>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={`text-sm ${textMuted(theme)}`}>共 {total} 条，第 {page}/{totalPages} 页</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-2 rounded-xl transition-colors ${page === 1 ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`p-2 rounded-xl transition-colors ${page === totalPages ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
