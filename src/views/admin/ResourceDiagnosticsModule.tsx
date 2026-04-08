import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';
import { AgentMonitoringPage } from '../agent/AgentMonitoringPage';
import { AgentTracePage } from '../agent/AgentTracePage';
import { btnSecondary } from '../../utils/uiClasses';

export type ResourceDiagnosticsTab = 'agent-monitoring' | 'agent-trace';

const TABS: { id: ResourceDiagnosticsTab; label: string }[] = [
  { id: 'agent-monitoring', label: '运行监控' },
  { id: 'agent-trace', label: '链路追踪' },
];

export interface ResourceDiagnosticsModuleProps {
  activePage: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ResourceDiagnosticsModule: React.FC<ResourceDiagnosticsModuleProps> = ({
  activePage,
  theme,
  fontSize,
  showMessage,
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const tab = TABS.some((x) => x.id === activePage)
    ? (activePage as ResourceDiagnosticsTab)
    : 'agent-monitoring';

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={`mb-4 flex flex-wrap gap-2 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}
        role="tablist"
        aria-label="运行诊断"
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
        {tab === 'agent-monitoring' ? (
          <AgentMonitoringPage theme={theme} fontSize={fontSize} showMessage={showMessage} />
        ) : null}
        {tab === 'agent-trace' ? (
          <AgentTracePage theme={theme} fontSize={fontSize} showMessage={showMessage} />
        ) : null}
      </div>
    </div>
  );
};
