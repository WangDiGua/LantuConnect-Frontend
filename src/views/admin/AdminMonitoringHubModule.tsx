import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';
import { MonitoringModule } from '../monitoring/MonitoringModule';
import { btnSecondary, textMuted, textPrimary } from '../../utils/uiClasses';

const TABS: { id: string; label: string }[] = [
  { id: 'monitoring-overview', label: '监控概览' },
  { id: 'call-logs', label: '调用日志' },
  { id: 'performance-analysis', label: '性能分析' },
  { id: 'alert-management', label: '告警管理' },
  { id: 'alert-rules', label: '告警规则' },
  { id: 'health-config', label: '健康检查' },
  { id: 'circuit-breaker', label: '熔断降级' },
];

export interface AdminMonitoringHubModuleProps {
  activePage: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminMonitoringHubModule: React.FC<AdminMonitoringHubModuleProps> = ({
  activePage,
  theme,
  fontSize,
  showMessage,
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={`mb-4 flex flex-wrap gap-2 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}
        role="tablist"
        aria-label="监控与运维"
      >
        {TABS.map((t) => {
          const on = activePage === t.id;
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
        <MonitoringModule activeSubItem={activePage} theme={theme} fontSize={fontSize} showMessage={showMessage} />
      </div>
      <p className={`mt-4 text-xs ${textMuted(theme)}`}>
        <span className={textPrimary(theme)}>提示：</span>侧栏已收束为单一入口；子路径书签仍可直接打开对应视图。
      </p>
    </div>
  );
};
