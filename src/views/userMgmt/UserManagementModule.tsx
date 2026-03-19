import React from 'react';
import { Theme, FontSize } from '../../types';
import { PlaceholderView } from '../common/PlaceholderView';
import { UserListPage } from './UserListPage';
import { RoleListPage } from './RoleListPage';
import { ApiKeyListPage } from './ApiKeyListPage';
import { TokenListPage } from './TokenListPage';

export interface UserManagementModuleProps {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/** 侧栏「用户管理」下四个子菜单对应页面（id 与 navigation 中一致） */
export const UserManagementModule: React.FC<UserManagementModuleProps> = ({
  activeSubItem,
  theme,
  fontSize,
  showMessage,
}) => {
  switch (activeSubItem) {
    case '用户管理':
      return <UserListPage theme={theme} fontSize={fontSize} breadcrumbBase={['用户管理']} />;
    case '角色管理':
      return <RoleListPage theme={theme} fontSize={fontSize} breadcrumbBase={['用户管理', '角色管理']} />;
    case 'API Key 管理':
      return (
        <ApiKeyListPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['用户管理', 'API Key 管理']}
        />
      );
    case 'Token 管理':
      return (
        <TokenListPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['用户管理', 'Token 管理']}
        />
      );
    default:
      return <PlaceholderView title={activeSubItem} theme={theme} fontSize={fontSize} />;
  }
};
