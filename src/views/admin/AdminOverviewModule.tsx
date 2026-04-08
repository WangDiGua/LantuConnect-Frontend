import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { buildPath, defaultPath } from '../../constants/consoleRoutes';
import { useUserRole } from '../../context/UserRoleContext';
import { Overview } from '../dashboard/Overview';
import { HealthCheckOverview } from '../dashboard/HealthCheckOverview';
import { UsageStatsOverview } from '../dashboard/UsageStatsOverview';
import { DataReportsPage } from '../dashboard/DataReportsPage';
import { btnSecondary } from '../../utils/uiClasses';

export type AdminOverviewTab = 'dashboard' | 'health-check' | 'usage-statistics' | 'data-reports';

const OVERVIEW_TAB_PERM = 'monitor:view';

const ALL_TABS: { id: AdminOverviewTab; label: string; perm: string }[] = [
  { id: 'dashboard', label: '数据概览', perm: OVERVIEW_TAB_PERM },
  { id: 'health-check', label: '健康状态', perm: OVERVIEW_TAB_PERM },
  { id: 'usage-statistics', label: '使用统计', perm: OVERVIEW_TAB_PERM },
  { id: 'data-reports', label: '数据报表', perm: OVERVIEW_TAB_PERM },
];

export interface AdminOverviewModuleProps {
  activePage: string;
  theme: Theme;
  fontSize: FontSize;
}

export const AdminOverviewModule: React.FC<AdminOverviewModuleProps> = ({ activePage, theme, fontSize }) => {
  const navigate = useNavigate();
  const { hasPermission } = useUserRole();
  const isDark = theme === 'dark';

  const visibleTabs = useMemo(
    () => ALL_TABS.filter((t) => hasPermission(t.perm)),
    [hasPermission],
  );

  useEffect(() => {
    if (visibleTabs.length === 0) {
      navigate(defaultPath(), { replace: true });
      return;
    }
    const allowedIds = new Set(visibleTabs.map((t) => t.id));
    const pageIsOverviewTab = ALL_TABS.some((x) => x.id === activePage);
    if (pageIsOverviewTab && !allowedIds.has(activePage as AdminOverviewTab)) {
      navigate(buildPath('admin', visibleTabs[0].id), { replace: true });
    }
  }, [activePage, navigate, visibleTabs]);

  const tab: AdminOverviewTab = (() => {
    if (visibleTabs.some((x) => x.id === activePage)) return activePage as AdminOverviewTab;
    if (visibleTabs.length > 0) return visibleTabs[0].id;
    return 'dashboard';
  })();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={`mb-4 flex flex-wrap gap-2 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}
        role="tablist"
        aria-label="运营总览"
      >
        {visibleTabs.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                on
                  ? isDark
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-900 text-white'
                  : `${btnSecondary(theme)} !shadow-none`
              }`}
              onClick={() => navigate(buildPath('admin', t.id))}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        {tab === 'dashboard' ? <Overview theme={theme} fontSize={fontSize} /> : null}
        {tab === 'health-check' ? <HealthCheckOverview theme={theme} fontSize={fontSize} /> : null}
        {tab === 'usage-statistics' ? <UsageStatsOverview theme={theme} fontSize={fontSize} /> : null}
        {tab === 'data-reports' ? <DataReportsPage theme={theme} fontSize={fontSize} /> : null}
      </div>
    </div>
  );
};
