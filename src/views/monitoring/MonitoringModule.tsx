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
      return <MonitoringOverviewPage theme={theme} fontSize={fontSize} />;
    case '调用日志':
      return <CallLogPage theme={theme} fontSize={fontSize} />;
    case '告警管理':
      return <AlertMgmtPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '性能分析':
      return <PerformanceAnalysisPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '资源监控':
      return <InfraResourceMonitorPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '全链路 Trace':
      return <PlatformTracePage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case '告警规则':
      return <AlertRulesPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    default:
      return <PlaceholderView title={activeSubItem} theme={theme} fontSize={fontSize} />;
  }
};
