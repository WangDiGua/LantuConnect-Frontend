import React from 'react';
import { Theme, FontSize } from '../../types';
import { PlaceholderView } from '../common/PlaceholderView';
import { MonitoringOverviewPage } from './MonitoringOverviewPage';
import { CallLogPage } from './CallLogPage';
import { AlertMgmtPage } from './AlertMgmtPage';
import { PerformanceAnalysisPage } from './PerformanceAnalysisPage';
import { InfraResourceMonitorPage } from './InfraResourceMonitorPage';
import { PlatformTracePage } from './PlatformTracePage';
import { AlertRulesPage } from './AlertRulesPage';
import { HealthConfigPage } from './HealthConfigPage';
import { CircuitBreakerPage } from './CircuitBreakerPage';

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
    case '监控概览':
    case 'monitoring-overview':
      return <MonitoringOverviewPage theme={theme} fontSize={fontSize} />;
    case '调用日志':
    case 'call-logs':
      return <CallLogPage theme={theme} fontSize={fontSize} />;
    case '告警管理':
    case 'alert-management':
      return <AlertMgmtPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '性能分析':
    case 'performance-analysis':
      return <PerformanceAnalysisPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'resource-monitoring':
      return <InfraResourceMonitorPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '全链路 Trace':
      return <PlatformTracePage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '告警规则':
    case 'alert-rules':
      return <AlertRulesPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'health-config':
      return <HealthConfigPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'circuit-breaker':
      return <CircuitBreakerPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    default:
      return <PlaceholderView title={activeSubItem} theme={theme} fontSize={fontSize} />;
  }
};
