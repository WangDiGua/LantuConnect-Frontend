import React from 'react';
import { Theme, FontSize } from '../../types';
import { PlaceholderView } from '../common/PlaceholderView';
import { RateLimitPage } from './RateLimitPage';
import { AuditLogPage } from './AuditLogPage';
import {
  SystemParamsPage,
  SecuritySettingsPage,
  NetworkConfigPage,
  AccessControlPage,
} from './SystemConfigExtraPages';
import { TagManagementPage } from './TagManagementPage';
import { SensitiveWordPage } from './SensitiveWordPage';
import { AnnouncementPage } from './AnnouncementPage';
import { RobotFactoryAdapterPage } from './RobotFactoryAdapterPage';
export interface SystemConfigModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/** 侧栏「系统配置」子菜单：限流策略 / 审计日志等 */
export const SystemConfigModule: React.FC<SystemConfigModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  switch (activeSubItem) {
    case 'rate-limit':
    case 'rate-limit-policy':
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
    case 'access-control':
      return <AccessControlPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'tag-management':
      return <TagManagementPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'sensitive-words':
      return <SensitiveWordPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'announcements':
      return <AnnouncementPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    case 'software-factory-adapter':
      return <RobotFactoryAdapterPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    default:
      return <PlaceholderView title={activeSubItem} theme={theme} fontSize={fontSize} />;
  }
};
