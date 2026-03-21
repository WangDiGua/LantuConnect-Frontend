import React from 'react';
import { Theme, FontSize } from '../../types';
import { PlaceholderView } from '../common/PlaceholderView';
import { ModelConfigPage } from './ModelConfigPage';
import { RateLimitPage } from './RateLimitPage';
import { AuditLogPage } from './AuditLogPage';
import {
  SystemParamsPage,
  SecuritySettingsPage,
  NetworkConfigPage,
  AccessControlPage,
} from './SystemConfigExtraPages';
import { CategoryManagement } from './CategoryManagement';
import { QuotaManagementPage } from './QuotaManagementPage';

export interface SystemConfigModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/** 侧栏「系统配置」子菜单：模型配置 / 限流策略 / 审计日志 */
export const SystemConfigModule: React.FC<SystemConfigModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  switch (activeSubItem) {
    case 'model-config':
      return (
        <ModelConfigPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['系统配置', '模型配置']}
        />
      );
    case 'rate-limit':
      return (
        <RateLimitPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['系统配置', '限流策略']}
        />
      );
    case 'audit-log':
      return (
        <AuditLogPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['系统配置', '审计日志']}
        />
      );
    case 'system-params':
      return <SystemParamsPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'security-settings':
      return <SecuritySettingsPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'network-config':
      return <NetworkConfigPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'quota-management':
      return <QuotaManagementPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'access-control':
      return <AccessControlPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'category-management':
      return <CategoryManagement theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    default:
      return <PlaceholderView title={activeSubItem} theme={theme} fontSize={fontSize} />;
  }
};
