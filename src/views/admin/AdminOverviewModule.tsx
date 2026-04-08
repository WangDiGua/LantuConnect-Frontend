import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';
import { Overview } from '../dashboard/Overview';
import { HealthCheckOverview } from '../dashboard/HealthCheckOverview';
import { UsageStatsOverview } from '../dashboard/UsageStatsOverview';
import { DataReportsPage } from '../dashboard/DataReportsPage';
import { btnSecondary, textMuted, textPrimary } from '../../utils/uiClasses';

export type AdminOverviewTab = 'dashboard' | 'health-check' | 'usage-statistics' | 'data-reports';

const TABS: { id: AdminOverviewTab; label: string }[] = [
  { id: 'dashboard', label: '数据概览' },
  { id: 'health-check', label: '健康状态' },
  { id: 'usage-statistics', label: '使用统计' },
  { id: 'data-reports', label: '数据报表' },
];

export interface AdminOverviewModuleProps {
  activePage: string;
  theme: Theme;
  fontSize: FontSize;
}

export const AdminOverviewModule: React.FC<AdminOverviewModuleProps> = ({ activePage, theme, fontSize }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const tab =
    TABS.some((x) => x.id === activePage) ? (activePage as AdminOverviewTab) : 'dashboard';

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={`mb-4 flex flex-wrap gap-2 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}
        role="tablist"
        aria-label="运营总览"
      >
        {TABS.map((t) => {
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
      <p className={`mt-4 text-xs ${textMuted(theme)}`}>
        <span className={textPrimary(theme)}>提示：</span>以上视图已合并为「运营总览」，仍可通过书签直接访问各子路径。
      </p>
    </div>
  );
};
