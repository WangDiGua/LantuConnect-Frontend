import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';
import { UserManagementModule } from '../userMgmt/UserManagementModule';
import { GrantApplicationListPage } from '../userMgmt/GrantApplicationListPage';
import { DeveloperApplicationListPage } from '../userMgmt/DeveloperApplicationListPage';
import { btnSecondary } from '../../utils/uiClasses';

const TABS: { id: string; label: string }[] = [
  { id: 'user-list', label: '用户' },
  { id: 'role-management', label: '角色' },
  { id: 'organization', label: '组织' },
  { id: 'api-key-management', label: 'API Key' },
  { id: 'token-management', label: 'Token' },
  { id: 'resource-grant-management', label: '资源授权' },
  { id: 'grant-applications', label: '授权审批' },
  { id: 'developer-applications', label: '入驻审批' },
];

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
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const inner = (() => {
    if (activePage === 'grant-applications') {
      return <GrantApplicationListPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    }
    if (activePage === 'developer-applications') {
      return <DeveloperApplicationListPage theme={theme} fontSize={fontSize} showMessage={showMessage} />;
    }
    return <UserManagementModule activeSubItem={activePage} theme={theme} fontSize={fontSize} showMessage={showMessage} />;
  })();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={`mb-4 flex flex-wrap gap-2 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}
        role="tablist"
        aria-label="用户与权限"
      >
        {TABS.map((t) => {
          const on = activePage === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                on
                  ? isDark
                    ? 'bg-white/10 text-white'
                    : 'bg-slate-900 text-white'
                  : `${btnSecondary(theme)} !shadow-none`
              }`}
              onClick={() => navigate(buildPath('admin', t.id))}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 min-w-0 flex-1">{inner}</div>
    </div>
  );
};
