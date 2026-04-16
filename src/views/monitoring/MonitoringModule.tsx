import React from 'react';
import { Theme, FontSize } from '../../types';
import { PlaceholderView } from '../common/PlaceholderView';
import { MonitoringOverviewPage } from './MonitoringOverviewPage';
import { CallLogPage } from './CallLogPage';
import { PerformanceAnalysisPage } from './PerformanceAnalysisPage';
import { HealthGovernancePage } from './HealthGovernancePage';
import { AlertCenterPage } from './AlertCenterPage';

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
      return <MonitoringOverviewPage theme={theme} fontSize={fontSize} />;
    case 'call-logs':
      return <CallLogPage theme={theme} fontSize={fontSize} />;
    case 'performance-analysis':
      return <PerformanceAnalysisPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'alert-center':
      return <AlertCenterPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'alert-management':
    case 'alert-rules':
      return <AlertCenterPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'health-governance':
      return <HealthGovernancePage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'health-config':
      return <HealthGovernancePage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'circuit-breaker':
      return <HealthGovernancePage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    default:
      return <PlaceholderView title={activeSubItem} theme={theme} fontSize={fontSize} />;
  }
};
