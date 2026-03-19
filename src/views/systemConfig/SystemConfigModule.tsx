import React from 'react';
import { Theme, FontSize } from '../../types';
import { PlaceholderView } from '../common/PlaceholderView';
import { ModelConfigPage } from './ModelConfigPage';
import { RateLimitPage } from './RateLimitPage';
import { AuditLogPage } from './AuditLogPage';

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
    case '模型配置':
      return (
        <ModelConfigPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['系统配置', '模型配置']}
        />
      );
    case '限流策略':
      return (
        <RateLimitPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['系统配置', '限流策略']}
        />
      );
    case '审计日志':
      return (
        <AuditLogPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['系统配置', '审计日志']}
        />
      );
    default:
      return <PlaceholderView title={activeSubItem} theme={theme} fontSize={fontSize} />;
  }
};
