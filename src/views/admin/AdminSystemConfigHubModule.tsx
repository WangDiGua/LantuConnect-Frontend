import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';
import { SystemConfigModule } from '../systemConfig/SystemConfigModule';
import { btnSecondary } from '../../utils/uiClasses';

const TABS: { id: string; label: string }[] = [
  { id: 'tag-management', label: '标签' },
  { id: 'system-params', label: '系统参数' },
  { id: 'skill-external-catalog-settings', label: '在线市场' },
  { id: 'security-settings', label: '安全' },
  { id: 'network-config', label: '网络' },
  { id: 'quota-management', label: '配额' },
  { id: 'rate-limit-policy', label: '限流' },
  { id: 'access-control', label: '访问控制' },
  { id: 'audit-log', label: '审计' },
  { id: 'sensitive-words', label: '敏感词' },
  { id: 'announcements', label: '公告' },
];

export interface AdminSystemConfigHubModuleProps {
  activePage: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminSystemConfigHubModule: React.FC<AdminSystemConfigHubModuleProps> = ({
  activePage,
  theme,
  fontSize,
  showMessage,
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className={`mb-4 flex flex-wrap gap-2 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}
        role="tablist"
        aria-label="平台配置"
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
      <div className="min-h-0 min-w-0 flex-1">
        <SystemConfigModule activeSubItem={activePage} theme={theme} fontSize={fontSize} showMessage={showMessage} />
      </div>
    </div>
  );
};
