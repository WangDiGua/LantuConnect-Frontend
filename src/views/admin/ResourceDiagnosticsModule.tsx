import React from 'react';
import { Theme, FontSize } from '../../types';
import { AgentMonitoringPage } from '../agent/AgentMonitoringPage';
import { AgentTracePage } from '../agent/AgentTracePage';

export type ResourceDiagnosticsTab = 'agent-monitoring' | 'agent-trace';

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
  const tab: ResourceDiagnosticsTab =
    activePage === 'agent-trace' ? 'agent-trace' : 'agent-monitoring';

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
