import React from 'react';
import { Theme, FontSize } from '../../types';
import { PlaceholderView } from '../common/PlaceholderView';
import { UserListPage } from './UserListPage';
import { RoleListPage } from './RoleListPage';
import { ApiKeyListPage } from './ApiKeyListPage';
import { TokenListPage } from './TokenListPage';
import { OrgStructurePage } from './OrgStructurePage';

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
    case 'user-management':
      return <UserListPage theme={theme} fontSize={fontSize} breadcrumbBase={['用户管理']} />;
    case 'role-management':
      return <RoleListPage theme={theme} fontSize={fontSize} breadcrumbBase={['用户管理', '角色管理']} />;
    case 'api-key-management':
      return (
        <ApiKeyListPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['用户管理', 'API Key 管理']}
        />
      );
    case 'token-management':
      return (
        <TokenListPage
          theme={theme}
          fontSize={fontSize}
          showMessage={showMessage}
          breadcrumbSegments={['用户管理', 'Token 管理']}
        />
      );
    case 'org-structure':
      return <OrgStructurePage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    default:
      return <PlaceholderView title={activeSubItem} theme={theme} fontSize={fontSize} />;
  }
};
