import React from 'react';
import { Theme, FontSize } from '../../types';
import { MonitoringModule } from '../monitoring/MonitoringModule';

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
}) => (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1">
        <MonitoringModule key={activePage} activeSubItem={activePage} theme={theme} fontSize={fontSize} showMessage={showMessage} />
      </div>
    </div>
  );
