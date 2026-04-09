import React from 'react';
import { Theme, FontSize } from '../../types';
import { UserManagementModule } from '../userMgmt/UserManagementModule';
import { DeveloperApplicationListPage } from '../userMgmt/DeveloperApplicationListPage';

export interface AdminUserHubModuleProps {
  activePage: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminUserHubModule: React.FC<AdminUserHubModuleProps> = ({
  activePage,
  theme,
  fontSize,
  showMessage,
}) => {
  const inner = (() => {
    if (activePage === 'developer-applications') {
      return <DeveloperApplicationListPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    }
    return <UserManagementModule activeSubItem={activePage} theme={theme} fontSize={fontSize} showMessage={showMessage} />;
  })();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1">{inner}</div>
    </div>
  );
};
