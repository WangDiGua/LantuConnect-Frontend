import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { buildPath, defaultPath } from '../../constants/consoleRoutes';
import { useUserRole } from '../../context/UserRoleContext';
import { Overview } from '../dashboard/Overview';
import { UsageStatsOverview } from '../dashboard/UsageStatsOverview';
import { DataReportsPage } from '../dashboard/DataReportsPage';

export type AdminOverviewTab = 'dashboard' | 'usage-statistics' | 'data-reports';

const OVERVIEW_TAB_PERM = 'monitor:view';

const ALL_TABS: { id: AdminOverviewTab; label: string; perm: string }[] = [
  { id: 'dashboard', label: '经营驾驶舱', perm: OVERVIEW_TAB_PERM },
  { id: 'usage-statistics', label: '用量分析', perm: OVERVIEW_TAB_PERM },
  { id: 'data-reports', label: '经营报表中心', perm: OVERVIEW_TAB_PERM },
];

export interface AdminOverviewModuleProps {
  activePage: string;
  theme: Theme;
  fontSize: FontSize;
}

export const AdminOverviewModule: React.FC<AdminOverviewModuleProps> = ({ activePage, theme, fontSize }) => {
  const navigate = useNavigate();
  const { hasPermission } = useUserRole();

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
      <div className="min-h-0 min-w-0 flex-1">
        {tab === 'dashboard' ? <Overview theme={theme} fontSize={fontSize} /> : null}
        {tab === 'usage-statistics' ? <UsageStatsOverview theme={theme} fontSize={fontSize} /> : null}
        {tab === 'data-reports' ? <DataReportsPage theme={theme} fontSize={fontSize} /> : null}
      </div>
    </div>
  );
};
