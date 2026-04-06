import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useAlerts } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { AnimatedList } from '../../components/common/AnimatedList';
import { SearchInput, FilterSelect, Pagination } from '../../components/common';
import type { AlertRecord } from '../../types/dto/monitoring';
import {
  bentoCardHover,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { resourceTypeLabel } from '../../constants/resourceTypes';

function alertResourceBadgeText(r: AlertRecord): string | null {
  const L = r.labels ?? {};
  const rt = L.resource_type || L.resourceType;
  return rt ? resourceTypeLabel(rt) : null;
}

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

function safeText(v: unknown): string { return String(v ?? ''); }
const ALERT_DESC = '运行期告警列表；支持按 labels 中的 resource_type 筛选（与五类统一资源对齐）';

export const AlertMgmtPage: React.FC<AlertMgmtPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [severity, setSeverity] = useState<string>('all');
  const [statusF, setStatusF] = useState<string>('all');
  const [resourceType, setResourceType] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, severity, statusF, resourceType]);

  const alertParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(debouncedQ ? { keyword: debouncedQ } : {}),
      ...(severity !== 'all' ? { severity } : {}),
      alertStatus: statusF,
      ...(resourceType !== 'all' ? { resourceType } : {}),
    }),
    [page, debouncedQ, severity, statusF, resourceType],
  );

  const alertsQ = useAlerts(alertParams);

  const rows = alertsQ.data?.list ?? [];

  const total = alertsQ.data?.total ?? 0;

  if (alertsQ.isError) {
    return (
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Shield}
        breadcrumbSegments={['监控中心', '告警管理']}
        description={ALERT_DESC}
      >
        <div className="px-4 sm:px-6 py-4">
          <PageError error={alertsQ.error as Error} onRetry={() => alertsQ.refetch()} />
        </div>
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Shield}
      breadcrumbSegments={['监控中心', '告警管理']}
      description={ALERT_DESC}
      toolbar={
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <FilterSelect value={severity} onChange={(v) => { setSeverity(v); setPage(1); }} options={[{ value: 'all', label: '全部级别' }, { value: 'critical', label: '严重' }, { value: 'warning', label: '警告' }, { value: 'info', label: '通知' }]} theme={theme} className="w-full sm:w-32" />
          <FilterSelect value={statusF} onChange={(v) => { setStatusF(v); setPage(1); }} options={[{ value: 'all', label: '全部状态' }, { value: 'firing', label: '触发中' }, { value: 'resolved', label: '已恢复' }, { value: 'silenced', label: '已静默' }]} theme={theme} className="w-full sm:w-32" />
          <FilterSelect
            value={resourceType}
            onChange={(v) => { setResourceType(v); setPage(1); }}
            options={[
              { value: 'all', label: '全部资源类型' },
              { value: 'agent', label: '智能体' },
              { value: 'skill', label: '技能' },
              { value: 'mcp', label: 'MCP' },
              { value: 'app', label: '应用' },
              { value: 'dataset', label: '数据集' },
              { value: 'unknown', label: '未分类' },
            ]}
            theme={theme}
            className="w-full sm:w-36"
            aria-label="按资源类型筛选告警"
          />
          <div className="flex-1 min-w-[min(100%,200px)]">
            <SearchInput value={q} onChange={setQ} placeholder="规则名、消息、来源…" theme={theme} />
          </div>
        </div>
      }
    >
      <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0 flex-1">
        {alertsQ.isLoading ? (
            <div className="py-2"><PageSkeleton type="table" rows={6} /></div>
        ) : rows.length === 0 ? (
              <EmptyState title={debouncedQ || severity !== 'all' || statusF !== 'all' || resourceType !== 'all' ? '无匹配告警' : '暂无告警'} description="系统运行正常。" icon={<Shield size={24} aria-hidden />} />
            ) : (
              <AnimatedList className="space-y-2">
                {rows.map((r) => {
                  const sevBadge = SEVERITY_STYLE[r.severity];
                  const resBadge = alertResourceBadgeText(r);
                  return (
                    <motion.div
                      key={r.id}
                      className={`${bentoCardHover(theme)} p-4 flex items-center gap-4`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold truncate min-w-0 ${textPrimary(theme)}`} title={safeText(r.ruleName)}>{safeText(r.ruleName) || '未命名规则'}</span>
                          <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${isDark ? sevBadge.dark : sevBadge.light}`}>
                            {sevBadge.label}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[r.status]}`} />
                            <span className={`text-xs font-medium ${textSecondary(theme)}`}>{STATUS_LABEL[r.status]}</span>
                          </span>
                          {resBadge ? (
                            <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${isDark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-800'}`}>
                              {resBadge}
                            </span>
                          ) : null}
                        </div>
                        <p className={`text-xs mt-1 line-clamp-2 ${textMuted(theme)}`} title={safeText(r.message)}>{safeText(r.message) || '—'}</p>
                      </div>
                      <div className="hidden lg:flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>来源</div>
                          <div className={`text-xs font-mono ${textSecondary(theme)}`}>{safeText(r.source) || '—'}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>时间</div>
                          <div className={`whitespace-nowrap text-xs ${textSecondary(theme)}`}>{formatDateTime(r.firedAt)}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatedList>
            )}
        {total > 0 ? (
          <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
        ) : null}
      </div>
    </MgmtPageShell>
  );
};
