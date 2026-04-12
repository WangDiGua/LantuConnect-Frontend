import React, { useCallback, useMemo } from 'react';
import { BookOpen, KeyRound, Package } from 'lucide-react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { buildPath, inferConsoleRole, parseRoute } from '../../constants/consoleRoutes';
import type { Theme, ThemeColor } from '../../types';
import { UserPersonalApiKeysPage } from './UserPersonalApiKeysPage';
import { UserIntegrationPackagePage } from './UserIntegrationPackagePage';
import { textMuted } from '../../utils/uiClasses';
import { useUserRole } from '../../context/UserRoleContext';

export type ApiKeysIntegrationTab = 'keys' | 'packages';

const TAB_QUERY = 'tab';
const TAB_PACKAGES = 'packages';

function parseTab(raw: string | null): ApiKeysIntegrationTab {
  return raw === TAB_PACKAGES ? 'packages' : 'keys';
}

interface Props {
  theme: Theme;
  themeColor: ThemeColor;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const UserApiKeysIntegrationHubPage: React.FC<Props> = ({
  theme,
  themeColor,
  showMessage,
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const location = useLocation();
  const { platformRole } = useUserRole();
  const routePage = parseRoute(location.pathname)?.page ?? '';
  const consoleRole = inferConsoleRole(routePage, platformRole);
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = parseRoute(location.pathname)?.page ?? '';
  const legacyIntegrationSlug = slug === 'my-integration-packages';
  const tab = useMemo(() => {
    if (legacyIntegrationSlug) return 'packages';
    return parseTab(searchParams.get(TAB_QUERY));
  }, [legacyIntegrationSlug, searchParams]);

  const setTab = useCallback(
    (next: ApiKeysIntegrationTab) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'keys') {
            p.delete(TAB_QUERY);
          } else {
            p.set(TAB_QUERY, TAB_PACKAGES);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const tabBtn = (active: boolean) =>
    `inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-inset ${
      active
        ? isDark
          ? 'bg-white/[0.12] text-slate-100'
          : 'bg-slate-900/[0.06] text-slate-900'
        : isDark
          ? 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 shrink-0">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button type="button" className={tabBtn(tab === 'keys')} onClick={() => setTab('keys')} aria-pressed={tab === 'keys'}>
              <KeyRound size={16} className="shrink-0 opacity-90" aria-hidden />
              API 密钥
            </button>
            <button
              type="button"
              className={tabBtn(tab === 'packages')}
              onClick={() => setTab('packages')}
              aria-pressed={tab === 'packages'}
            >
              <Package size={16} className="shrink-0 opacity-90" aria-hidden />
              集成套餐
            </button>
          </div>
          <button
            type="button"
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
              isDark ? 'border-white/12 text-slate-300 hover:bg-white/[0.06]' : 'border-slate-200/90 text-slate-600 hover:bg-slate-50'
            }`}
            onClick={() => navigate(`${buildPath(consoleRole, 'developer-docs')}#doc-api-keys-console`)}
            aria-label="打开接入指南中的密钥与集成套餐说明"
          >
            <BookOpen size={14} className="shrink-0 opacity-85" aria-hidden />
            页面说明
          </button>
        </div>
        <p className={`mt-2 text-xs ${textMuted(theme)}`}>管理调用密钥与白名单套餐；细则见接入指南。</p>
      </div>

      <div className="min-h-0 flex-1 flex flex-col">
        {tab === 'keys' ? (
          <UserPersonalApiKeysPage theme={theme} themeColor={themeColor} showMessage={showMessage} embeddedInHub />
        ) : (
          <UserIntegrationPackagePage theme={theme} themeColor={themeColor} showMessage={showMessage} embeddedInHub />
        )}
      </div>
    </div>
  );
};
