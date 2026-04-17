import React from 'react';
import { Theme, FontSize } from '../../types';
import { PlaceholderView } from '../common/PlaceholderView';
import { MonitoringOverviewPage } from './MonitoringOverviewPage';
import { CallLogPage } from './CallLogPage';
import { HealthGovernancePage } from './HealthGovernancePage';
import { AlertCenterPage } from './AlertCenterPage';
import { TraceCenterPage } from './TraceCenterPage';

export interface MonitoringModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MonitoringModule: React.FC<MonitoringModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  switch (activeSubItem) {
    case 'monitoring-overview':
      return <MonitoringOverviewPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'call-logs':
      return <CallLogPage theme={theme} fontSize={fontSize} />;
    case 'trace-center':
      return <TraceCenterPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'alert-center':
      return <AlertCenterPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'health-governance':
      return <HealthGovernancePage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    default:
      return <PlaceholderView title={activeSubItem} theme={theme} fontSize={fontSize} />;
  }
};
