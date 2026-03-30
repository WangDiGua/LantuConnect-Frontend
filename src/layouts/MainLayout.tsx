import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy, useSyncExternalStore } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Bell,
  Menu,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Theme, ThemeMode, ThemeColor, FontSize, FontFamily, AnimationStyle } from '../types';
import { FONT_FAMILY_CLASSES, getRootFontSizePx } from '../constants/theme';
import { LayoutChromeProvider } from '../context/LayoutChromeContext';
import { UserRoleProvider, useUserRole, platformRoleToConsoleRole, canAccessAdminView, isUnassignedRole, normalizeRole } from '../context/UserRoleContext';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../api/services/auth.service';
import { notificationService } from '../api/services/notification.service';
import { tokenStorage } from '../lib/security';
import { env } from '../config/env';
import {
  ADMIN_SIDEBAR_ITEMS,
  USER_SIDEBAR_ITEMS,
  getNavSubGroups,
} from '../constants/navigation';
import { AppearanceMenu } from '../components/business/AppearanceMenu';
import { MessagePanel, INITIAL_MESSAGE_UNREAD_COUNT } from '../components/business/MessagePanel';

const Overview = lazy(() => import('../views/dashboard/Overview').then(m => ({ default: m.Overview })));
const ExploreHub = lazy(() => import('../views/dashboard/ExploreHub').then(m => ({ default: m.ExploreHub })));
const UserWorkspaceOverview = lazy(() => import('../views/dashboard/UserWorkspaceOverview').then(m => ({ default: m.UserWorkspaceOverview })));
const QuickAccess = lazy(() => import('../views/dashboard/QuickAccess').then(m => ({ default: m.QuickAccess })));
const PlaceholderView = lazy(() => import('../views/common/PlaceholderView').then(m => ({ default: m.PlaceholderView })));
const AgentDetail = lazy(() => import('../views/agent/AgentDetail').then(m => ({ default: m.AgentDetail })));
const AgentMarket = lazy(() => import('../views/agent/AgentMarket').then(m => ({ default: m.AgentMarket })));
const AgentMonitoringPage = lazy(() => import('../views/agent/AgentMonitoringPage').then(m => ({ default: m.AgentMonitoringPage })));
const AgentTracePage = lazy(() => import('../views/agent/AgentTracePage').then(m => ({ default: m.AgentTracePage })));
const SkillMarket = lazy(() => import('../views/skill/SkillMarket').then(m => ({ default: m.SkillMarket })));
const McpMarket = lazy(() => import('../views/mcp/McpMarket').then(m => ({ default: m.McpMarket })));
const AppMarket = lazy(() => import('../views/apps/AppMarket').then(m => ({ default: m.AppMarket })));
const DatasetMarket = lazy(() => import('../views/dataset/DatasetMarket').then(m => ({ default: m.DatasetMarket })));
const ProviderManagementPage = lazy(() => import('../views/provider/ProviderManagementPage').then(m => ({ default: m.ProviderManagementPage })));
const UserManagementModule = lazy(() => import('../views/userMgmt/UserManagementModule').then(m => ({ default: m.UserManagementModule })));
const SystemConfigModule = lazy(() => import('../views/systemConfig/SystemConfigModule').then(m => ({ default: m.SystemConfigModule })));
const MonitoringModule = lazy(() => import('../views/monitoring/MonitoringModule').then(m => ({ default: m.MonitoringModule })));
const MyPublishHubPage = lazy(() => import('../views/publish/MyPublishHubPage').then(m => ({ default: m.MyPublishHubPage })));
const UserSettingsHubPage = lazy(() => import('../views/user/UserSettingsHubPage').then(m => ({ default: m.UserSettingsHubPage })));
const UsageRecordsPage = lazy(() => import('../views/user/UsageRecordsPage').then(m => ({ default: m.UsageRecordsPage })));
const MyFavoritesPage = lazy(() => import('../views/user/MyFavoritesPage').then(m => ({ default: m.MyFavoritesPage })));
const UsageStatsPage = lazy(() => import('../views/user/UsageStatsPage').then(m => ({ default: m.UsageStatsPage })));
const AuthorizedSkillsPage = lazy(() => import('../views/user/AuthorizedSkillsPage').then(m => ({ default: m.AuthorizedSkillsPage })));
const MyGrantApplicationsPage = lazy(() => import('../views/user/MyGrantApplicationsPage').then(m => ({ default: m.MyGrantApplicationsPage })));
const ResourceCenterManagementPage = lazy(() => import('../views/resourceCenter/ResourceCenterManagementPage').then(m => ({ default: m.ResourceCenterManagementPage })));
const ResourceRegisterPage = lazy(() => import('../views/resourceCenter/ResourceRegisterPage').then(m => ({ default: m.ResourceRegisterPage })));
const ResourceAuditList = lazy(() => import('../views/audit/ResourceAuditList').then(m => ({ default: m.ResourceAuditList })));
const GrantApplicationListPage = lazy(() => import('../views/userMgmt/GrantApplicationListPage').then(m => ({ default: m.GrantApplicationListPage })));
const DeveloperApplicationListPage = lazy(() => import('../views/userMgmt/DeveloperApplicationListPage').then(m => ({ default: m.DeveloperApplicationListPage })));
const ApiDocsPage = lazy(() => import('../views/developer/ApiDocsPage').then(m => ({ default: m.ApiDocsPage })));
const SdkDownloadPage = lazy(() => import('../views/developer/SdkDownloadPage').then(m => ({ default: m.SdkDownloadPage })));
const ApiPlaygroundPage = lazy(() => import('../views/developer/ApiPlaygroundPage').then(m => ({ default: m.ApiPlaygroundPage })));
const DeveloperStatsPage = lazy(() => import('../views/developer/DeveloperStatsPage').then(m => ({ default: m.DeveloperStatsPage })));
const DataReportsPage = lazy(() => import('../views/dashboard/DataReportsPage').then(m => ({ default: m.DataReportsPage })));
const HealthCheckOverview = lazy(() => import('../views/dashboard/HealthCheckOverview').then(m => ({ default: m.HealthCheckOverview })));
const UsageStatsOverview = lazy(() => import('../views/dashboard/UsageStatsOverview').then(m => ({ default: m.UsageStatsOverview })));

import { useMessage } from '../components/common/Message';
import { readPersistedNavState, writePersistedNavState } from '../utils/navigationState';
import {
  APPEARANCE_DEFAULTS,
  readAppearanceState,
  writeAppearanceState,
} from '../utils/appearanceState';
import {
  getColorSchemeServerSnapshot,
  getColorSchemeSnapshot,
  subscribeColorScheme,
} from '../utils/systemColorScheme';
import { ConsoleHomeRedirect } from '../router/ConsoleHomeRedirect';
import {
  buildPath,
  defaultPath,
  parseRoute,
  findSidebarForPage,
  getDefaultPage,
  subItemToPage,
  pageToSubItem,
  type ConsoleRole,
} from '../constants/consoleRoutes';
import type { ResourceType } from '../types/dto/catalog';
import {
  LEGACY_USER_RESOURCE_PAGES,
  RESOURCE_TYPE_LIST_PAGE,
  RESOURCE_TYPE_REGISTER_PAGE,
  parseResourceType,
} from '../constants/resourceTypes';
import { PageSkeleton } from '../components/common/PageSkeleton';
import { ConsoleSidebar } from '../components/layout/ConsoleSidebar';
import { Tooltip } from '../components/common/Tooltip';
import { contentMaxWidth } from '../utils/uiClasses';

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };

function normalizeDeprecatedPage(page: string): string {
  switch (page) {
    case 'agent-create':
    case 'agent-versions':
      return 'agent-register';
    case 'skill-create':
      return 'skill-register';
    case 'app-create':
      return 'app-register';
    case 'dataset-create':
      return 'dataset-register';
    case 'category-management':
      return 'tag-management';
    case 'submit-agent':
      return 'my-agents-pub';
    case 'submit-skill':
      return 'my-agents-pub';
    case 'my-agents':
    case 'my-skills':
      return 'my-agents-pub';
    default:
      return page;
  }
}

const SUB_ITEM_PERM_MAP: Record<string, string> = {
  'agent-audit': 'agent:audit',
  'skill-audit': 'skill:audit',
  'mcp-audit': 'resource:audit',
  'app-audit': 'resource:audit',
  'dataset-audit': 'resource:audit',
  'provider-list': 'provider:view',
  'provider-create': 'provider:manage',
  'role-management': 'role:manage',
  'organization': 'org:manage',
  'api-key-management': 'api-key:manage',
  'resource-grant-management': 'resource-grant:manage',
  'grant-applications': 'resource-grant:manage',
  'developer-applications': 'developer-application:review',
  'alert-rules': 'system:config',
  'health-config': 'system:config',
  'circuit-breaker': 'system:config',
};

const LEGACY_PAGE_TO_TYPE: Record<string, ResourceType> = {
  'agent-list': 'agent',
  'skill-list': 'skill',
  'mcp-server-list': 'mcp',
  'app-list': 'app',
  'dataset-list': 'dataset',
};

/** 开发者中心仅挂在应用端路由；旧版 /admin/... 链接触发重定向 */
const DEVELOPER_PORTAL_PAGES = new Set([
  'api-docs',
  'sdk-download',
  'api-playground',
  'developer-statistics',
]);

const MainContent = React.memo<{
  page: string;
  routeId?: string;
  resourceTypeFromQuery?: ResourceType;
  layoutIsAdmin: boolean;
  theme: Theme;
  themePreference: ThemeMode;
  themeColor: ThemeColor;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  navigateTo: (page: string, id?: string | number) => void;
  setShowUserMenu: (show: boolean) => void;
  setShowAppearanceMenu: (show: boolean) => void;
}>(({
  page: p,
  routeId: rid,
  resourceTypeFromQuery: typeQuery,
  layoutIsAdmin: isAdmin,
  theme: t,
  themePreference: tpref,
  themeColor: tc,
  fontSize: fs,
  showMessage: msg,
  navigateTo: nav,
  setShowUserMenu: setMenu,
  setShowAppearanceMenu: setAppMenu,
}) => {
  const renderResourceList = (type: ResourceType) => (
    <ResourceCenterManagementPage
      theme={t}
      fontSize={fs}
      showMessage={msg}
      resourceType={type}
      allowTypeSwitch={false}
      onNavigateRegister={(_, id) => nav(RESOURCE_TYPE_REGISTER_PAGE[type], id)}
    />
  );

  const renderResourceRegister = (type: ResourceType) => (
    <ResourceRegisterPage
      theme={t}
      fontSize={fs}
      showMessage={msg}
      resourceType={type}
      resourceId={rid ? Number(rid) : undefined}
      onBack={() => nav(RESOURCE_TYPE_LIST_PAGE[type])}
    />
  );

  const content = (() => {
    if (isAdmin) {
      switch (p) {
        case 'dashboard':
          return <Overview theme={t} fontSize={fs} />;
        case 'health-check':
          return <HealthCheckOverview theme={t} fontSize={fs} />;
        case 'usage-statistics':
          return <UsageStatsOverview theme={t} fontSize={fs} />;
        case 'data-reports':
          return <DataReportsPage theme={t} fontSize={fs} />;

        case 'agent-list':
          return renderResourceList('agent');
        case 'agent-register':
          return renderResourceRegister('agent');
        case 'agent-detail':
          return <AgentDetail agentId={rid ?? ''} theme={t} fontSize={fs} onBack={() => nav('agent-list')} />;
        case 'agent-audit':
          return <ResourceAuditList theme={t} fontSize={fs} showMessage={msg} defaultType="agent" />;
        case 'agent-monitoring':
          return <AgentMonitoringPage theme={t} fontSize={fs} />;
        case 'agent-trace':
          return <AgentTracePage theme={t} fontSize={fs} />;

        case 'skill-list':
          return renderResourceList('skill');
        case 'mcp-server-list':
          return renderResourceList('mcp');
        case 'skill-register':
          return renderResourceRegister('skill');
        case 'mcp-register':
          return renderResourceRegister('mcp');
        case 'skill-audit':
          return <ResourceAuditList theme={t} fontSize={fs} showMessage={msg} defaultType="skill" />;
        case 'mcp-audit':
          return <ResourceAuditList theme={t} fontSize={fs} showMessage={msg} defaultType="mcp" />;
        case 'app-audit':
          return <ResourceAuditList theme={t} fontSize={fs} showMessage={msg} defaultType="app" />;
        case 'dataset-audit':
          return <ResourceAuditList theme={t} fontSize={fs} showMessage={msg} defaultType="dataset" />;

        case 'app-list':
          return renderResourceList('app');
        case 'app-register':
          return renderResourceRegister('app');

        case 'dataset-list':
          return renderResourceList('dataset');
        case 'dataset-register':
          return renderResourceRegister('dataset');

        case 'user-list':
        case 'role-management':
        case 'organization':
        case 'api-key-management':
        case 'resource-grant-management':
          return <UserManagementModule activeSubItem={p} theme={t} fontSize={fs} showMessage={msg} />;
        case 'provider-list':
        case 'provider-create':
          return (
            <ProviderManagementPage
              theme={t}
              fontSize={fs}
              mode={p === 'provider-create' ? 'create' : 'list'}
              showMessage={msg}
              onOpenGrantManagement={() => nav('resource-grant-management')}
            />
          );
        case 'grant-applications':
          return <GrantApplicationListPage theme={t} fontSize={fs} showMessage={msg} />;
        case 'developer-applications':
          return <DeveloperApplicationListPage theme={t} fontSize={fs} showMessage={msg} />;

        case 'monitoring-overview':
        case 'call-logs':
        case 'performance-analysis':
        case 'alert-management':
        case 'alert-rules':
        case 'health-config':
        case 'circuit-breaker':
          return <MonitoringModule activeSubItem={p} theme={t} fontSize={fs} showMessage={msg} />;

        case 'category-management':
        case 'tag-management':
        case 'model-config':
        case 'security-settings':
        case 'quota-management':
        case 'rate-limit-policy':
        case 'access-control':
        case 'audit-log':
        case 'sensitive-words':
        case 'announcements':
          return <SystemConfigModule activeSubItem={p} theme={t} fontSize={fs} showMessage={msg} />;

        default:
          return <PlaceholderView title={p} theme={t} fontSize={fs} />;
      }
    }

    switch (p) {
      case 'hub':
        return <ExploreHub theme={t} fontSize={fs} />;
      case 'workspace':
        return <UserWorkspaceOverview theme={t} fontSize={fs} />;
      case 'resource-center':
        return (
          <ResourceCenterManagementPage
            theme={t}
            fontSize={fs}
            showMessage={msg}
            resourceType={typeQuery ?? 'agent'}
            allowTypeSwitch
            onTypeChange={(nextType) => nav('resource-center', nextType)}
            onNavigateRegister={(type, id) => nav(RESOURCE_TYPE_REGISTER_PAGE[type], id)}
          />
        );
      case 'agent-list':
        return renderResourceList('agent');
      case 'skill-list':
        return renderResourceList('skill');
      case 'mcp-server-list':
        return renderResourceList('mcp');
      case 'app-list':
        return renderResourceList('app');
      case 'dataset-list':
        return renderResourceList('dataset');
      case 'agent-register':
        return renderResourceRegister('agent');
      case 'skill-register':
        return renderResourceRegister('skill');
      case 'mcp-register':
        return renderResourceRegister('mcp');
      case 'app-register':
        return renderResourceRegister('app');
      case 'dataset-register':
        return renderResourceRegister('dataset');
      case 'authorized-skills':
        return <AuthorizedSkillsPage theme={t} fontSize={fs} showMessage={msg} />;
      case 'quick-access':
        return <QuickAccess theme={t} fontSize={fs} />;
      case 'recent-use':
        return <UsageRecordsPage theme={t} fontSize={fs} initialView="recent" />;

      case 'agent-market':
        return <AgentMarket theme={t} fontSize={fs} themeColor={tc} showMessage={msg} />;
      case 'skill-market':
        return <SkillMarket theme={t} fontSize={fs} showMessage={msg} />;
      case 'mcp-market':
        return <McpMarket theme={t} fontSize={fs} showMessage={msg} />;
      case 'app-market':
        return <AppMarket theme={t} fontSize={fs} showMessage={msg} />;
      case 'dataset-market':
        return <DatasetMarket theme={t} fontSize={fs} showMessage={msg} />;

      case 'my-agents-pub':
        return <MyPublishHubPage theme={t} fontSize={fs} />;

      case 'usage-records':
        return <UsageRecordsPage theme={t} fontSize={fs} initialView="records" />;
      case 'my-favorites':
        return <MyFavoritesPage theme={t} fontSize={fs} />;
      case 'usage-stats':
        return <UsageStatsPage theme={t} fontSize={fs} />;
      case 'my-grant-applications':
        return <MyGrantApplicationsPage theme={t} fontSize={fs} showMessage={msg} />;
      case 'profile':
        return (
          <UserSettingsHubPage
            theme={t}
            fontSize={fs}
            themePreference={tpref}
            themeColor={tc}
            showMessage={msg}
            onOpenAppearance={() => { setMenu(true); setAppMenu(true); }}
            initialTab="profile"
          />
        );
      case 'preferences':
        return (
          <UserSettingsHubPage
            theme={t}
            fontSize={fs}
            themePreference={tpref}
            themeColor={tc}
            showMessage={msg}
            onOpenAppearance={() => { setMenu(true); setAppMenu(true); }}
            initialTab="preferences"
          />
        );

      case 'api-docs':
        return <ApiDocsPage theme={t} fontSize={fs} />;
      case 'sdk-download':
        return <SdkDownloadPage theme={t} fontSize={fs} />;
      case 'api-playground':
        return <ApiPlaygroundPage theme={t} fontSize={fs} />;
      case 'developer-statistics':
        return <DeveloperStatsPage theme={t} fontSize={fs} />;

      default:
        return <PlaceholderView title={p} theme={t} fontSize={fs} />;
    }
  })();

  const skeletonType = (() => {
    if (p === 'dashboard' || p === 'workspace') return 'dashboard' as const;
    if (p.includes('create')) return 'form' as const;
    if (p.includes('detail') || p === 'profile') return 'detail' as const;
    if (p.includes('market') || p === 'quick-access') return 'cards' as const;
    if (p.includes('monitoring') || p === 'performance-analysis' || p === 'data-reports' || p === 'usage-statistics') return 'chart' as const;
    return 'table' as const;
  })();

  return (
    <Suspense fallback={<PageSkeleton type={skeletonType} />}>
      {content}
    </Suspense>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.page === nextProps.page &&
    prevProps.routeId === nextProps.routeId &&
    prevProps.resourceTypeFromQuery === nextProps.resourceTypeFromQuery &&
    prevProps.layoutIsAdmin === nextProps.layoutIsAdmin &&
    prevProps.theme === nextProps.theme &&
    prevProps.themePreference === nextProps.themePreference &&
    prevProps.themeColor === nextProps.themeColor &&
    prevProps.fontSize === nextProps.fontSize
  );
});

MainContent.displayName = 'MainContent';

export const MainLayout: React.FC = () => {
  const [themePreference, setThemePreference] = useState<ThemeMode>(() => readAppearanceState().themePreference);
  const systemDark = useSyncExternalStore(
    subscribeColorScheme,
    getColorSchemeSnapshot,
    getColorSchemeServerSnapshot,
  );
  const theme: Theme = themePreference === 'system' ? (systemDark ? 'dark' : 'light') : themePreference;
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // persist 异步水合、或 /auth/me 拉取完成前 user 可能为 null；勿把「暂无 user」当成未分配角色
  if (!user && isAuthenticated) {
    return <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950" aria-busy="true" aria-label="加载会话" />;
  }
  if (!user) {
    return null;
  }

  const pRole = normalizeRole(user.role);
  if (isUnassignedRole(pRole)) {
    return <Navigate to="/onboarding/developer" replace />;
  }
  const consoleRole = platformRoleToConsoleRole(pRole);

  return (
    <UserRoleProvider
      key={`${user?.id ?? 'anon'}-${user?.role ?? 'user'}`}
      initialRole={consoleRole}
      platformRole={pRole}
    >
      <Routes>
        <Route path="/" element={<ConsoleHomeRedirect />} />
        <Route
          path="/:role/:page/*"
          element={
            <MainLayoutContent
              theme={theme}
              themePreference={themePreference}
              setThemePreference={setThemePreference}
            />
          }
        />
        <Route
          path="/:role/:page"
          element={
            <MainLayoutContent
              theme={theme}
              themePreference={themePreference}
              setThemePreference={setThemePreference}
            />
          }
        />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </UserRoleProvider>
  );
};

const MainLayoutContent: React.FC<{
  theme: Theme;
  themePreference: ThemeMode;
  setThemePreference: (m: ThemeMode) => void;
}> = ({ theme, themePreference, setThemePreference }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const { isAdmin: ctxAdmin, role, setRole, platformRole, hasPermission } = useUserRole();
  const isDark = theme === 'dark';

  const route = parseRoute(location.pathname);
  const routeRole = route?.role;
  const routePage = route?.page;
  const routeId = route?.id;
  const normalizedRoutePage = routePage ? normalizeDeprecatedPage(routePage) : undefined;
  const queryType = parseResourceType(new URLSearchParams(location.search).get('type'));
  const isStandaloneUserSettingsPage = routeRole === 'user' && ['profile', 'preferences'].includes(normalizedRoutePage ?? '');
  const routeValid = !!(routeRole && normalizedRoutePage && (findSidebarForPage(routeRole, normalizedRoutePage) || isStandaloneUserSettingsPage));

  const consoleRole: ConsoleRole = routeRole ?? (ctxAdmin ? 'admin' : 'user');
  const page = normalizedRoutePage ?? (consoleRole === 'admin' ? 'dashboard' : 'workspace');
  const layoutIsAdmin = consoleRole === 'admin';

  const activeSidebar = findSidebarForPage(consoleRole, page)
    ?? (layoutIsAdmin ? 'overview' : 'workspace');
  const activeSubItem = pageToSubItem(page, activeSidebar, layoutIsAdmin);

  const headerMenusRef = useRef<HTMLDivElement>(null);
  const messagePanelAnchorRef = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const storeLogout = useAuthStore((s) => s.logout);
  const authUser = useAuthStore((s) => s.user);
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => readAppearanceState().themeColor);
  const [fontSize, setFontSize] = useState<FontSize>(() => readAppearanceState().fontSize);
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => readAppearanceState().fontFamily);
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>(() => readAppearanceState().animationStyle);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMessagePanel, setShowMessagePanel] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(INITIAL_MESSAGE_UNREAD_COUNT);
  const baseDocumentTitleRef = useRef<string>('');

  const refreshMessageUnreadCount = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const data = await notificationService.getUnreadCount();
      let n = 0;
      if (typeof data === 'number') n = data;
      else if (data && typeof data === 'object' && 'count' in data) n = Number((data as { count: number }).count);
      setMessageUnreadCount(Number.isFinite(n) && n > 0 ? Math.min(9999, Math.floor(n)) : 0);
    } catch {
      /* keep current badge */
    }
  }, [authUser?.id]);

  useEffect(() => {
    void refreshMessageUnreadCount();
  }, [refreshMessageUnreadCount]);

  useEffect(() => {
    if (!authUser?.id) return;
    const onFocus = () => {
      void refreshMessageUnreadCount();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [authUser?.id, refreshMessageUnreadCount]);

  useEffect(() => {
    const normalizeBaseTitle = (rawTitle: string) =>
      rawTitle
        .replace(/^\((?:\d+|99\+)\)\s*/, '')
        .replace(/与您有【(?:\d+|99\+)条未读】未读消息$/, '')
        .trim();
    if (!baseDocumentTitleRef.current) {
      baseDocumentTitleRef.current = normalizeBaseTitle(document.title);
    }
    const baseTitle = normalizeBaseTitle(baseDocumentTitleRef.current || document.title);
    baseDocumentTitleRef.current = baseTitle;
    if (messageUnreadCount <= 0) {
      document.title = baseTitle;
      return;
    }

    const unreadCountLabel = messageUnreadCount > 99 ? '99+' : String(messageUnreadCount);
    const unreadTitle = `您有【${unreadCountLabel}条未读】未读消息`;
    let showUnreadTitle = false;
    const rotateTitle = () => {
      document.title = showUnreadTitle ? unreadTitle : baseTitle;
      showUnreadTitle = !showUnreadTitle;
    };
    rotateTitle();
    const timerId = window.setInterval(rotateTitle, 3000);
    return () => window.clearInterval(timerId);
  }, [messageUnreadCount]);

  const canPublishResources =
    hasPermission('agent:create') ||
    hasPermission('skill:create') ||
    hasPermission('mcp:create') ||
    hasPermission('app:create') ||
    hasPermission('dataset:create');

  // Route validation & redirect (allow admin users to access user views for mode switcher)
  useEffect(() => {
    if (routeRole && routePage && normalizedRoutePage && routePage !== normalizedRoutePage) {
      navigate(buildPath(routeRole, normalizedRoutePage, routeId), { replace: true });
      return;
    }
    if (routeRole === 'admin' && normalizedRoutePage && DEVELOPER_PORTAL_PAGES.has(normalizedRoutePage)) {
      navigate(buildPath('user', normalizedRoutePage, routeId), { replace: true });
      return;
    }
    if (routeRole === 'user' && normalizedRoutePage && LEGACY_USER_RESOURCE_PAGES.has(normalizedRoutePage)) {
      const type = LEGACY_PAGE_TO_TYPE[normalizedRoutePage];
      if (type) {
        navigate(`${buildPath('user', 'resource-center')}?type=${type}`, { replace: true });
        return;
      }
    }
    if (routeRole === 'user' && normalizedRoutePage === 'resource-center' && !queryType) {
      navigate(`${buildPath('user', 'resource-center')}?type=agent`, { replace: true });
      return;
    }
    if (
      routeRole === 'user' &&
      normalizedRoutePage &&
      DEVELOPER_PORTAL_PAGES.has(normalizedRoutePage) &&
      !hasPermission('developer:portal')
    ) {
      navigate(defaultPath('user'), { replace: true });
      return;
    }
    if (!routeValid) {
      if (routeRole === 'admin' || routeRole === 'user') {
        navigate(defaultPath(routeRole), { replace: true });
      } else {
        navigate('/404', { replace: true });
      }
      return;
    }
    if (routeRole === 'admin' && !canAccessAdminView(platformRole)) {
      navigate(defaultPath('user'), { replace: true });
    }
    if (
      routeRole === 'user' &&
      !layoutIsAdmin &&
      ['resource-center', 'agent-list', 'agent-register', 'skill-list', 'skill-register', 'mcp-server-list', 'mcp-register', 'app-list', 'app-register', 'dataset-list', 'dataset-register'].includes(page) &&
      !canPublishResources
    ) {
      navigate(buildPath('user', 'hub'), { replace: true });
      showMessage('当前账号暂无统一资源发布权限', 'info');
    }
  }, [routeValid, routeRole, routePage, normalizedRoutePage, routeId, queryType, consoleRole, platformRole, navigate, layoutIsAdmin, page, canPublishResources, showMessage, hasPermission]);

  useEffect(() => {
    const wantRole = consoleRole === 'admin' ? 'admin' : 'user';
    if (role !== wantRole) setRole(wantRole);
  }, [consoleRole, role, setRole]);

  useEffect(() => {
    writePersistedNavState({ lastPath: location.pathname });
  }, [location.pathname]);

  useEffect(() => {
    writeAppearanceState({ themePreference, themeColor, fontSize, fontFamily, animationStyle });
  }, [themePreference, themeColor, fontSize, fontFamily, animationStyle]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent<Theme>('lantu-theme-change', { detail: theme }));
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = getRootFontSizePx(fontSize);
  }, [fontSize]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const sidebarItems = useMemo(() => {
    if (layoutIsAdmin) {
      const adminPermMap: Record<string, string> = {
        'resource-management': 'agent:view',
        'provider-management': 'provider:manage',
        'user-management': 'user:manage',
        'monitoring': 'monitor:view',
        'system-config': 'system:config',
      };
      return ADMIN_SIDEBAR_ITEMS.filter((item) => {
        if (item.id === 'audit-center') {
          return hasPermission('agent:audit') || hasPermission('skill:audit') || hasPermission('resource:audit');
        }
        const requiredPerm = adminPermMap[item.id];
        return !requiredPerm || hasPermission(requiredPerm);
      });
    }
    return USER_SIDEBAR_ITEMS.filter((item) => {
      if (item.id === 'my-publish') return canPublishResources;
      if (item.id === 'developer-portal') return hasPermission('developer:portal');
      return true;
    });
  }, [layoutIsAdmin, hasPermission, canPublishResources]);

  const filteredSubGroupsForSidebarId = useCallback(
    (sidebarId: string) => {
      const groups = getNavSubGroups(sidebarId, layoutIsAdmin);
      return groups
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => {
            const perm = SUB_ITEM_PERM_MAP[item.id];
            return !perm || hasPermission(perm);
          }),
        }))
        .filter((g) => g.items.length > 0);
    },
    [layoutIsAdmin, hasPermission],
  );

  useEffect(() => {
    const groups = filteredSubGroupsForSidebarId(activeSidebar);
    if (groups.length > 0) {
      setExpandedGroups((prev) => (prev.length === 0 ? [activeSidebar] : prev));
    }
  }, [activeSidebar, filteredSubGroupsForSidebarId]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? [] : [id],
    );
  };

  const handleSidebarClick = (id: string) => {
    setMobileNavOpen(false);
    const hasChildren = filteredSubGroupsForSidebarId(id).length > 0;
    if (!hasChildren) {
      setExpandedGroups([]);
    }
    navigate(buildPath(consoleRole, getDefaultPage(consoleRole, id)));
  };

  const handleSubItemClick = (subItemId: string, parentSidebarId: string) => {
    setMobileNavOpen(false);
    const pageName = subItemToPage(parentSidebarId, subItemId, layoutIsAdmin);
    navigate(buildPath(consoleRole, pageName));
  };

  const handleSwitchMode = useCallback(
    (targetRole: ConsoleRole) => {
      setMobileNavOpen(false);
      navigate(defaultPath(targetRole));
    },
    [navigate],
  );

  useEffect(() => {
    if (!showUserMenu && !showMessagePanel && !showSettingsMenu) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (headerMenusRef.current && !headerMenusRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
        setShowAppearanceMenu(false);
        setShowMessagePanel(false);
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [showUserMenu, showMessagePanel, showSettingsMenu]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showMessage('当前环境不支持全屏操作', 'info');
    }
  }, [showMessage]);

  const handleSetThemePreference = (pref: ThemeMode) => {
    setThemePreference(pref);
    const labels: Record<ThemeMode, string> = { light: '浅色', dark: '深色', system: '跟随系统' };
    showMessage(`已切换为${labels[pref]}`, 'success');
  };
  const handleSetFontSize = (size: FontSize) => {
    setFontSize(size);
    showMessage(`字号已调整为 ${size === 'small' ? '小' : size === 'medium' ? '中' : '大'}`, 'success');
  };
  const FONT_LABELS_MSG: Record<FontFamily, string> = {
    sans: '系统无衬线',
    space: '宽屏无衬线',
    serif: '衬线体',
    mono: '等宽代码体',
    outfit: '圆体 Outfit',
    garamond: '古典 Garamond',
    anton: '标题 Anton',
  };
  const ANIMATION_LABELS_MSG: Record<AnimationStyle, string> = {
    fade: '淡入淡出',
    slide: '滑动',
    zoom: '缩放',
    skew: '倾斜',
    flip: '翻转',
    rotate: '旋转',
  };
  const handleSetFontFamily = (family: FontFamily) => {
    setFontFamily(family);
    showMessage(`字体已切换为「${FONT_LABELS_MSG[family]}」`, 'success');
  };
  const handleSetAnimationStyle = (style: AnimationStyle) => {
    setAnimationStyle(style);
    showMessage(`页面动画已切换为「${ANIMATION_LABELS_MSG[style]}」`, 'success');
  };
  const handleReset = () => {
    setThemePreference(APPEARANCE_DEFAULTS.themePreference);
    setThemeColor('blue');
    setFontSize('medium');
    setFontFamily('sans');
    setAnimationStyle('fade');
    writeAppearanceState({
      themePreference: APPEARANCE_DEFAULTS.themePreference,
      themeColor: 'blue',
      fontSize: 'medium',
      fontFamily: 'sans',
      animationStyle: 'fade',
    });
    showMessage('外观设置已恢复默认', 'info');
  };

  const animationVariants = useMemo(() => {
    /** 探索页右侧 hero 代码终端与横向进场叠加观感差，仅做淡入、不参与滑动/位移类变体 */
    if (page === 'hub') {
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    }
    switch (animationStyle) {
      case 'slide':
        return { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 } };
      case 'zoom':
        return { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.05 } };
      case 'skew':
        return { initial: { opacity: 0, skewX: -10, x: -20 }, animate: { opacity: 1, skewX: 0, x: 0 }, exit: { opacity: 0, skewX: 10, x: 20 } };
      case 'flip':
        return { initial: { opacity: 0, rotateY: 90 }, animate: { opacity: 1, rotateY: 0 }, exit: { opacity: 0, rotateY: -90 } };
      case 'rotate':
        return { initial: { opacity: 0, rotate: -10, scale: 0.9 }, animate: { opacity: 1, rotate: 0, scale: 1 }, exit: { opacity: 0, rotate: 10, scale: 1.1 } };
      default:
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    }
  }, [animationStyle, page]);

  const navigateTo = useCallback((targetPage: string, id?: string | number) => {
    if (targetPage === 'resource-center') {
      const type = typeof id === 'string' ? parseResourceType(id) : undefined;
      navigate(
        type
          ? `${buildPath(consoleRole, 'resource-center')}?type=${type}`
          : buildPath(consoleRole, 'resource-center'),
      );
      return;
    }
    navigate(buildPath(consoleRole, targetPage, id));
  }, [navigate, consoleRole]);

  const contentKey = useMemo(() => {
    if (page === 'resource-center') return `${page}?type=${queryType ?? 'agent'}`;
    return routeId ? `${page}/${routeId}` : page;
  }, [page, routeId, queryType]);

  const displayUserName = authUser?.nickname || authUser?.username || '用户';

  const navChildrenForActiveSidebar = useMemo(
    () => filteredSubGroupsForSidebarId(activeSidebar).flatMap((g) => g.items),
    [activeSidebar, filteredSubGroupsForSidebarId],
  );

  const hasSecondarySidebar = navChildrenForActiveSidebar.length > 0;

  /** 顶栏与 chromePageTitle：有子菜单时只显示当前子项，父级由侧栏表达 */
  const headerTitle = useMemo(() => {
    if (!layoutIsAdmin && ['profile', 'preferences'].includes(page)) return '个人设置';
    const parentItem = sidebarItems.find((i) => i.id === activeSidebar);
    if (!parentItem) return layoutIsAdmin ? '管理后台' : '工作台';
    if (navChildrenForActiveSidebar.length === 0) return parentItem.label;
    const activeChild = navChildrenForActiveSidebar.find((c) => c.id === activeSubItem);
    if (!activeChild) return parentItem.label;
    return activeChild.label;
  }, [sidebarItems, activeSidebar, activeSubItem, navChildrenForActiveSidebar, layoutIsAdmin]);

  return (
    <LayoutChromeProvider value={{ hasSecondarySidebar, chromePageTitle: headerTitle }}>
      {/* Canvas wrapper */}
      <div
        data-theme={theme === 'dark' ? 'dark' : 'light'}
        className={`h-screen p-3 md:p-4 flex overflow-hidden selection:bg-neutral-200 selection:text-neutral-900 ${
          FONT_FAMILY_CLASSES[fontFamily]
        } ${isDark ? 'bg-[#0f1117]' : 'bg-[#EFEFF1]'}`}
      >
        {/* Mobile backdrop */}
        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="关闭菜单"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Floating Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-full w-[240px] shrink-0 flex-col px-3 py-2 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
            isDark ? 'bg-[#0f1117]' : 'bg-[#EFEFF1]'
          } lg:bg-transparent ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <ConsoleSidebar
            theme={theme}
            layoutIsAdmin={layoutIsAdmin}
            consoleRole={consoleRole}
            activeSidebar={activeSidebar}
            activeSubItem={activeSubItem}
            sidebarItems={sidebarItems}
            expandedGroups={expandedGroups}
            canAccessAdmin={canAccessAdminView(platformRole)}
            platformRole={platformRole}
            displayUserName={displayUserName}
            avatarSeed={`${authUser?.id ?? 'user'}-${displayUserName}`}
            onSidebarClick={handleSidebarClick}
            onSubItemClick={handleSubItemClick}
            onToggleGroup={toggleGroup}
            onSwitchMode={handleSwitchMode}
            onUserCardClick={() => {}}
            onNavigateToProfile={() => {
              navigate(buildPath('user', 'profile'));
              if (layoutIsAdmin) setRole('user');
            }}
            onLogout={async () => {
              showMessage('已退出登录', 'info');
              const accessToken = tokenStorage.get(env.VITE_TOKEN_KEY) ?? useAuthStore.getState().token;
              try {
                if (accessToken) await authService.logout(accessToken);
              } catch {
                /* still clear local session */
              }
              storeLogout();
              navigate('/login', { replace: true });
            }}
            onLogoClick={() => {
              setExpandedGroups([]);
              navigate(defaultPath(consoleRole));
              setMobileNavOpen(false);
            }}
            filteredSubGroupsForSidebarId={filteredSubGroupsForSidebarId}
          />
        </aside>

        {/* Main Canvas Card */}
        <main
          className={`flex-1 overflow-hidden flex flex-col relative ${
            isDark
              ? 'bg-[#1a1f2e] rounded-[24px] md:rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/[0.06]'
              : 'bg-slate-50 rounded-[24px] md:rounded-[32px] shadow-[0_8px_30px_rgb(15,23,42,0.05)] border border-slate-200/45'
          }`}
        >
          {/* Header inside canvas */}
          <header
            className={`h-[72px] flex items-center justify-between px-4 sm:px-5 lg:px-6 shrink-0 z-10 sticky top-0 border-b ${
              isDark
                ? 'bg-[#1a1f2e]/80 backdrop-blur-md border-white/[0.06]'
                : 'bg-slate-50/90 backdrop-blur-md border-slate-200/35'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Mobile hamburger */}
              <button
                type="button"
                className={`rounded-xl p-2 lg:hidden ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
                aria-label="打开菜单"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu size={20} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
              </button>
              {/* Dynamic title */}
              <h2 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                {headerTitle}
              </h2>
            </div>

            <div ref={headerMenusRef} className="flex items-center gap-3 sm:gap-5">

              {/* Appearance panel (direct toggle, no intermediate menu) */}
              <div className="relative flex h-9 items-center justify-center">
                <AnimatePresence>
                  {showSettingsMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={springTransition}
                      className={`absolute right-0 top-full z-[60] mt-1.5 w-[min(22rem,calc(100vw-1.25rem))] sm:w-96 rounded-xl border p-2 shadow-xl ${
                        isDark ? 'border-white/10 bg-[#1C1C1E]' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div
                        className={`max-h-[min(80vh,36rem)] overflow-y-auto overflow-x-hidden custom-scrollbar px-0.5 pb-1 pt-1`}
                      >
                        <AppearanceMenu
                          embedded
                          theme={theme}
                          themePreference={themePreference}
                          setThemePreference={handleSetThemePreference}
                          fontSize={fontSize}
                          setFontSize={handleSetFontSize}
                          fontFamily={fontFamily}
                          setFontFamily={handleSetFontFamily}
                          animationStyle={animationStyle}
                          setAnimationStyle={handleSetAnimationStyle}
                          onReset={handleReset}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Tooltip content="外观与主题">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsMenu((v) => !v);
                      setShowUserMenu(false);
                      setShowMessagePanel(false);
                    }}
                    className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 transition-colors rounded-full ${
                      isDark
                        ? 'text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.08]'
                        : 'text-slate-400 hover:text-slate-800 bg-slate-100/50 hover:bg-slate-100'
                    }`}
                    aria-label="外观与主题"
                  >
                    <Palette size={18} strokeWidth={1.75} />
                  </button>
                </Tooltip>
              </div>

              {/* Notification bell */}
              <div ref={messagePanelAnchorRef} className="relative flex h-9 items-center justify-center">
                <AnimatePresence>
                  {showMessagePanel && (
                    <MessagePanel
                      key="header-message-panel"
                      theme={theme}
                      anchor="top"
                      anchorRef={messagePanelAnchorRef}
                      onClose={() => {
                        setShowMessagePanel(false);
                        void refreshMessageUnreadCount();
                      }}
                      onUnreadChange={setMessageUnreadCount}
                    />
                  )}
                </AnimatePresence>
                <Tooltip content={messageUnreadCount > 0 ? `消息通知（${messageUnreadCount} 条未读）` : '消息通知'}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMessagePanel((v) => !v);
                      setShowUserMenu(false);
                      setShowSettingsMenu(false);
                    }}
                    className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 transition-colors rounded-full ${
                      isDark
                        ? `text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] ${showMessagePanel ? 'bg-white/10' : ''}`
                        : `text-slate-400 hover:text-slate-800 bg-slate-100/50 hover:bg-slate-100 ${showMessagePanel ? 'bg-slate-100' : ''}`
                    }`}
                    aria-label={
                      messageUnreadCount > 0 ? `消息通知，${messageUnreadCount} 条未读` : '消息通知'
                    }
                  >
                    <Bell size={18} strokeWidth={1.75} />
                    {messageUnreadCount > 0 && (
                      <span
                        className={`absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold leading-none text-white shadow-sm ${
                          isDark ? 'border-[#1a1f2e] bg-rose-500' : 'border-white bg-rose-500'
                        }`}
                      >
                        {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                      </span>
                    )}
                  </button>
                </Tooltip>
              </div>

              {/* Fullscreen toggle */}
              <div className="hidden sm:flex h-9 items-center justify-center">
                <Tooltip content={isFullscreen ? '退出全屏' : '全屏'}>
                  <button
                    type="button"
                    onClick={() => {
                      void toggleFullscreen();
                      setShowSettingsMenu(false);
                      setShowUserMenu(false);
                    }}
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 transition-colors rounded-full ${
                      isDark
                        ? 'text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.08]'
                        : 'text-slate-400 hover:text-slate-800 bg-slate-100/50 hover:bg-slate-100'
                    }`}
                    aria-label={isFullscreen ? '退出全屏' : '全屏'}
                  >
                    {isFullscreen ? <Minimize2 size={18} strokeWidth={1.75} /> : <Maximize2 size={18} strokeWidth={1.75} />}
                  </button>
                </Tooltip>
              </div>

              
            </div>
          </header>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={contentKey}
                variants={animationVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={springTransition}
                className="flex min-h-0 flex-1 flex-col pb-8"
                style={{ willChange: 'opacity, transform' }}
              >
                <div className={`mx-auto w-full ${contentMaxWidth}`}>
                  <MainContent
                    page={page}
                    routeId={routeId}
                    resourceTypeFromQuery={queryType}
                    layoutIsAdmin={layoutIsAdmin}
                    theme={theme}
                    themePreference={themePreference}
                    themeColor={themeColor}
                    fontSize={fontSize}
                    showMessage={showMessage}
                    navigateTo={navigateTo}
                    setShowUserMenu={setShowUserMenu}
                    setShowAppearanceMenu={setShowAppearanceMenu}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </LayoutChromeProvider>
  );
};
