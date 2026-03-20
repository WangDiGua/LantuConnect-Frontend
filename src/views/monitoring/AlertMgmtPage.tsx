import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Shield } from 'lucide-react';
import { useAlerts } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination } from '../../components/common/Pagination';
import type { AlertRecord } from '../../types/dto/monitoring';

interface AlertMgmtPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PAGE_SIZE = 20;

const SEVERITY_STYLE: Record<AlertRecord['severity'], { light: string; dark: string; label: string }> = {
  critical: { light: 'bg-red-100 text-red-800',     dark: 'bg-red-500/20 text-red-300',     label: '严重' },
  warning:  { light: 'bg-amber-100 text-amber-900', dark: 'bg-amber-500/20 text-amber-300', label: '警告' },
  info:     { light: 'bg-slate-200 text-slate-700',  dark: 'bg-slate-600/40 text-slate-300',  label: '通知' },
};

const STATUS_STYLE: Record<AlertRecord['status'], { light: string; dark: string; label: string }> = {
  firing:   { light: 'text-amber-700',  dark: 'text-amber-400',  label: '触发中' },
  resolved: { light: 'text-emerald-700', dark: 'text-emerald-400', label: '已恢复' },
  silenced: { light: 'text-slate-500',  dark: 'text-slate-500',  label: '已静默' },
};

export const AlertMgmtPage: React.FC<AlertMgmtPageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState<string>('all');
  const [statusF, setStatusF] = useState<string>('all');
  const [page, setPage] = useState(1);
  const sel = nativeSelectClass(theme);
  const searchCls = toolbarSearchInputClass(theme);

  const alertsQ = useAlerts({ page, pageSize: PAGE_SIZE });

  const rows = useMemo(() => {
    const list = alertsQ.data?.list ?? [];
    const term = q.trim().toLowerCase();
    return list.filter((r) => {
      if (severity !== 'all' && r.severity !== severity) return false;
      if (statusF !== 'all' && r.status !== statusF) return false;
      if (!term) return true;
      return (
        r.ruleName.toLowerCase().includes(term) ||
        r.message.toLowerCase().includes(term) ||
        r.source.toLowerCase().includes(term)
      );
    });
  }, [alertsQ.data, q, severity, statusF]);

  const total = alertsQ.data?.total ?? 0;

  const toolbar = (
    <div className={TOOLBAR_ROW}>
      <div className="relative flex-1 min-w-0 sm:max-w-md">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
          size={16}
        />
        <input
          type="search"
          placeholder="规则名、消息、来源…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={searchCls}
        />
      </div>
      <select
        className={`${sel} w-full sm:w-[7.5rem] shrink-0`}
        value={severity}
        onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
      >
        <option value="all">全部级别</option>
        <option value="critical">严重</option>
        <option value="warning">警告</option>
        <option value="info">通知</option>
      </select>
      <select
        className={`${sel} w-full sm:w-[7.5rem] shrink-0`}
        value={statusF}
        onChange={(e) => { setStatusF(e.target.value); setPage(1); }}
      >
        <option value="all">全部状态</option>
        <option value="firing">触发中</option>
        <option value="resolved">已恢复</option>
        <option value="silenced">已静默</option>
      </select>
    </div>
  );

  const shell = (children: React.ReactNode) => (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['监控中心', '告警管理']}
      titleIcon={Shield}
      description="运行期告警列表，支持按级别与状态筛选"
      toolbar={toolbar}
    >
      {children}
    </MgmtPageShell>
  );

  if (alertsQ.isLoading) {
    return shell(<PageSkeleton type="table" rows={6} />);
  }

  if (alertsQ.isError) {
    return shell(<PageError error={alertsQ.error as Error} onRetry={() => alertsQ.refetch()} />);
  }

  if (rows.length === 0 && !q && severity === 'all' && statusF === 'all') {
    return shell(<EmptyState title="暂无告警" description="当前没有活跃告警，系统运行正常。" icon={<Shield size={24} />} />);
  }

  return shell(
    <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead>
            <tr
              className={`border-b ${
                isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'
              }`}
            >
              {['触发时间', '级别', '规则名称', '消息', '来源', '状态'].map((h) => (
                <th key={h} className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const sevBadge = SEVERITY_STYLE[r.severity];
              const stsBadge = STATUS_STYLE[r.status];
              return (
                <tr
                  key={r.id}
                  className={`border-b ${
                    isDark
                      ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}`
                      : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`
                  }`}
                >
                  <td className={`px-4 py-3 text-xs whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {new Date(r.firedAt).toLocaleString('zh-CN', { hour12: false })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? sevBadge.dark : sevBadge.light}`}>
                      {sevBadge.label}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-[13px] font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {r.ruleName}
                  </td>
                  <td className={`px-4 py-3 max-w-[320px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="line-clamp-2 text-[13px]" title={r.message}>
                      {r.message}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {r.source}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${isDark ? stsBadge.dark : stsBadge.light}`}>
                      {stsBadge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (q || severity !== 'all' || statusF !== 'all') && (
        <EmptyState title="无匹配告警" description="请调整搜索条件或筛选项后重试。" />
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </div>
  );
};
