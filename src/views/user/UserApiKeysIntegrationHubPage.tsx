import React, { useCallback, useMemo } from 'react';
import { BookOpen, Fingerprint, KeyRound, Package } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { buildPath, inferConsoleRole, parseRoute } from '../../constants/consoleRoutes';
import type { FontSize, Theme, ThemeColor } from '../../types';
import { useUserRole } from '../../context/UserRoleContext';
import { textMuted } from '../../utils/uiClasses';
import { UserIntegrationPackagePage } from './UserIntegrationPackagePage';
import { UserPersonalApiKeysPage } from './UserPersonalApiKeysPage';
import { ApiKeyListPage } from '../userMgmt/ApiKeyListPage';

export type ApiKeysIntegrationTab = 'keys' | 'packages' | 'platform';

const TAB_QUERY = 'tab';
const TAB_PACKAGES: ApiKeysIntegrationTab = 'packages';
const TAB_PLATFORM: ApiKeysIntegrationTab = 'platform';

interface Props {
  theme: Theme;
  themeColor: ThemeColor;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const UserApiKeysIntegrationHubPage: React.FC<Props> = ({
  theme,
  themeColor,
  fontSize,
  showMessage,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { platformRole } = useUserRole();
  const isDark = theme === 'dark';

  const routePage = parseRoute(location.pathname)?.page ?? '';
  const consoleRole = inferConsoleRole(routePage, platformRole);
  const canManagePlatformKeys = consoleRole === 'admin';
  const legacyIntegrationSlug = routePage === 'my-integration-packages';
  const legacyPlatformSlug = routePage === 'api-key-management' || routePage === 'token-management';

  const tab = useMemo<ApiKeysIntegrationTab>(() => {
    if (legacyIntegrationSlug) return TAB_PACKAGES;
    if (legacyPlatformSlug && canManagePlatformKeys) return TAB_PLATFORM;
    const raw = searchParams.get(TAB_QUERY);
    if (raw === TAB_PACKAGES) return TAB_PACKAGES;
    if (raw === TAB_PLATFORM && canManagePlatformKeys) return TAB_PLATFORM;
    return 'keys';
  }, [canManagePlatformKeys, legacyIntegrationSlug, legacyPlatformSlug, searchParams]);

  const setTab = useCallback(
    (next: ApiKeysIntegrationTab) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === TAB_PACKAGES) {
            params.set(TAB_QUERY, TAB_PACKAGES);
          } else if (next === TAB_PLATFORM) {
            params.set(TAB_QUERY, TAB_PLATFORM);
          } else {
            params.delete(TAB_QUERY);
          }
          return params;
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
              我的 API 密钥
            </button>
            <button
              type="button"
              className={tabBtn(tab === TAB_PACKAGES)}
              onClick={() => setTab(TAB_PACKAGES)}
              aria-pressed={tab === TAB_PACKAGES}
            >
              <Package size={16} className="shrink-0 opacity-90" aria-hidden />
              集成套餐
            </button>
            {canManagePlatformKeys ? (
              <button
                type="button"
                className={tabBtn(tab === TAB_PLATFORM)}
                onClick={() => setTab(TAB_PLATFORM)}
                aria-pressed={tab === TAB_PLATFORM}
              >
                <Fingerprint size={16} className="shrink-0 opacity-90" aria-hidden />
                平台密钥管理
              </button>
            ) : null}
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
        <p className={`mt-2 text-xs ${textMuted(theme)}`}>
          {tab === 'keys'
            ? '创建和管理个人调用密钥；需要白名单控制时请结合集成套餐使用。'
            : tab === TAB_PACKAGES
              ? '维护可授权给 API Key 的集成套餐与白名单资源。'
              : '这里承接原“密钥管理”菜单的全部内容，用于平台级 API Key 管理。'}
        </p>
      </div>

      <div className="min-h-0 flex flex-1 flex-col">
        {tab === 'keys' ? (
          <UserPersonalApiKeysPage
            theme={theme}
            themeColor={themeColor}
            showMessage={showMessage}
            embeddedInHub
          />
        ) : tab === TAB_PACKAGES ? (
          <UserIntegrationPackagePage
            theme={theme}
            themeColor={themeColor}
            showMessage={showMessage}
            embeddedInHub
          />
        ) : (
          <ApiKeyListPage
            theme={theme}
            fontSize={fontSize}
            showMessage={(msg, type) => showMessage(msg, type)}
            breadcrumbSegments={['个人工作台', '密钥与集成套餐', '平台密钥管理']}
            embeddedInHub
          />
        )}
      </div>
    </div>
  );
};
