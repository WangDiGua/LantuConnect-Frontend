import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useAlerts } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { AnimatedList } from '../../components/common/AnimatedList';
import { SearchInput, FilterSelect } from '../../components/common';
import type { AlertRecord } from '../../types/dto/monitoring';
import {
  pageBg, bentoCard, bentoCardHover,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

interface AlertMgmtPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PAGE_SIZE = 20;

const SEVERITY_STYLE: Record<AlertRecord['severity'], { light: string; dark: string; label: string }> = {
  critical: { light: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60', dark: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20', label: '严重' },
  warning:  { light: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60', dark: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20', label: '警告' },
  info:     { light: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60', dark: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20', label: '通知' },
};

const STATUS_DOT: Record<AlertRecord['status'], string> = {
  firing: 'bg-amber-400', resolved: 'bg-emerald-400', silenced: 'bg-slate-400',
};
const STATUS_LABEL: Record<AlertRecord['status'], string> = {
  firing: '触发中', resolved: '已恢复', silenced: '已静默',
};

export const AlertMgmtPage: React.FC<AlertMgmtPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState<string>('all');
  const [statusF, setStatusF] = useState<string>('all');
  const [page, setPage] = useState(1);

  const alertsQ = useAlerts({ page, pageSize: PAGE_SIZE });

  const rows = useMemo(() => {
    const list = alertsQ.data?.list ?? [];
    const term = q.trim().toLowerCase();
    return list.filter((r) => {
      if (severity !== 'all' && r.severity !== severity) return false;
      if (statusF !== 'all' && r.status !== statusF) return false;
      if (!term) return true;
      return r.ruleName.toLowerCase().includes(term) || r.message.toLowerCase().includes(term) || r.source.toLowerCase().includes(term);
    });
  }, [alertsQ.data, q, severity, statusF]);

  const total = alertsQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (alertsQ.isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <PageError error={alertsQ.error as Error} onRetry={() => alertsQ.refetch()} />
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
              <div className={`p-2 rounded-xl ${isDark ? 'bg-rose-500/15' : 'bg-rose-50'}`}>
                <Shield size={20} className={isDark ? 'text-rose-400' : 'text-rose-600'} />
              </div>
              <div>
                <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>告警管理</h1>
                <span className={`text-xs ${textMuted(theme)}`}>运行期告警列表</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect value={severity} onChange={(v) => { setSeverity(v); setPage(1); }} options={[{ value: 'all', label: '全部级别' }, { value: 'critical', label: '严重' }, { value: 'warning', label: '警告' }, { value: 'info', label: '通知' }]} theme={theme} className="w-full sm:w-32" />
              <FilterSelect value={statusF} onChange={(v) => { setStatusF(v); setPage(1); }} options={[{ value: 'all', label: '全部状态' }, { value: 'firing', label: '触发中' }, { value: 'resolved', label: '已恢复' }, { value: 'silenced', label: '已静默' }]} theme={theme} className="w-full sm:w-32" />
              <div className="flex-1 min-w-[min(100%,200px)]">
                <SearchInput value={q} onChange={setQ} placeholder="规则名、消息、来源…" theme={theme} />
              </div>
            </div>
          </div>

          {/* Card rows */}
          <div className="flex-1 min-h-0 overflow-auto">
            {alertsQ.isLoading ? (
              <div className="p-4"><PageSkeleton type="table" rows={6} /></div>
            ) : rows.length === 0 ? (
              <EmptyState title={q || severity !== 'all' || statusF !== 'all' ? '无匹配告警' : '暂无告警'} description="系统运行正常。" icon={<Shield size={24} />} />
            ) : (
              <AnimatedList className="p-3 space-y-2">
                {rows.map((r) => {
                  const sevBadge = SEVERITY_STYLE[r.severity];
                  return (
                    <motion.div
                      key={r.id}
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      className={`${bentoCardHover(theme)} p-4 flex items-center gap-4`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${textPrimary(theme)}`}>{r.ruleName}</span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isDark ? sevBadge.dark : sevBadge.light}`}>
                            {sevBadge.label}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[r.status]}`} />
                            <span className={`text-[11px] font-medium ${textSecondary(theme)}`}>{STATUS_LABEL[r.status]}</span>
                          </span>
                        </div>
                        <p className={`text-xs mt-1 line-clamp-1 ${textMuted(theme)}`}>{r.message}</p>
                      </div>
                      <div className="hidden lg:flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <div className={`text-[10px] uppercase tracking-wider ${textMuted(theme)}`}>来源</div>
                          <div className={`text-xs font-mono ${textSecondary(theme)}`}>{r.source}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-[10px] uppercase tracking-wider ${textMuted(theme)}`}>时间</div>
                          <div className={`text-xs ${textSecondary(theme)}`}>{new Date(r.firedAt).toLocaleString('zh-CN', { hour12: false })}</div>
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
              <span className={`text-sm ${textMuted(theme)}`}>共 {total} 条</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`p-2 rounded-xl transition-colors ${page <= 1 ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronLeft size={16} /></button>
                <span className={`text-xs font-medium ${textSecondary(theme)}`}>{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={`p-2 rounded-xl transition-colors ${page >= totalPages ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
