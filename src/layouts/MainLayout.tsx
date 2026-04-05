import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy, useSyncExternalStore } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Palette,
  Bell,
  Maximize2,
  Minimize2,
  MoreVertical,
  LogOut,
} from 'lucide-react';
import { Theme, ThemeMode, ThemeColor, FontSize, FontFamily, AnimationStyle } from '../types';
import { FONT_FAMILY_CLASSES, getRootFontSizePx } from '../constants/theme';
import { LayoutChromeProvider } from '../context/LayoutChromeContext';
import { UserRoleProvider, useUserRole, platformRoleToConsoleRole, canAccessAdminView, normalizeRole } from '../context/UserRoleContext';
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
import {
  buildHubPersonalNavModel,
  HUB_PERSONAL_RAIL_PARENT_IDS,
  filterSidebarRowsForSlimTopNav,
  USER_TOP_NAV_NO_RAIL_SIDEBAR_ID_SET,
  type ExploreHubRailConfig,
  type HubPersonalRailSection,
} from '../constants/topNavPolicy';
import { AppearanceMenu } from '../components/business/AppearanceMenu';
import { MessagePanel, INITIAL_MESSAGE_UNREAD_COUNT } from '../components/business/MessagePanel';

const Overview = lazy(() => import('../views/dashboard/Overview').then(m => ({ default: m.Overview })));
const ExploreHub = lazy(() => import('../views/dashboard/ExploreHub').then(m => ({ default: m.ExploreHub })));
const UserWorkspaceOverview = lazy(() => import('../views/dashboard/UserWorkspaceOverview').then(m => ({ default: m.UserWorkspaceOverview })));
const DeveloperOnboardingPage = lazy(() => import('../views/onboarding/DeveloperOnboardingPage').then(m => ({ default: m.DeveloperOnboardingPage })));
const QuickAccess = lazy(() => import('../views/dashboard/QuickAccess').then(m => ({ default: m.QuickAccess })));
const PlaceholderView = lazy(() => import('../views/common/PlaceholderView').then(m => ({ default: m.PlaceholderView })));
const AgentDetail = lazy(() => import('../views/agent/AgentDetail').then(m => ({ default: m.AgentDetail })));
const AgentMonitoringPage = lazy(() => import('../views/agent/AgentMonitoringPage').then(m => ({ default: m.AgentMonitoringPage })));
const AgentTracePage = lazy(() => import('../views/agent/AgentTracePage').then(m => ({ default: m.AgentTracePage })));
const ProviderManagementPage = lazy(() => import('../views/provider/ProviderManagementPage').then(m => ({ default: m.ProviderManagementPage })));
const UserManagementModule = lazy(() => import('../views/userMgmt/UserManagementModule').then(m => ({ default: m.UserManagementModule })));
const SystemConfigModule = lazy(() => import('../views/systemConfig/SystemConfigModule').then(m => ({ default: m.SystemConfigModule })));
const MonitoringModule = lazy(() => import('../views/monitoring/MonitoringModule').then(m => ({ default: m.MonitoringModule })));
const MyPublishHubPage = lazy(() => import('../views/publish/MyPublishHubPage').then(m => ({ default: m.MyPublishHubPage })));
const MyPublishListRoute = lazy(() => import('../views/publish/MyPublishListRoute').then(m => ({ default: m.MyPublishListRoute })));
const UserSettingsHubPage = lazy(() => import('../views/user/UserSettingsHubPage').then(m => ({ default: m.UserSettingsHubPage })));
const UsageRecordsPage = lazy(() => import('../views/user/UsageRecordsPage').then(m => ({ default: m.UsageRecordsPage })));
const MyFavoritesPage = lazy(() => import('../views/user/MyFavoritesPage').then(m => ({ default: m.MyFavoritesPage })));
const UsageStatsPage = lazy(() => import('../views/user/UsageStatsPage').then(m => ({ default: m.UsageStatsPage })));
const AuthorizedSkillsPage = lazy(() => import('../views/user/AuthorizedSkillsPage').then(m => ({ default: m.AuthorizedSkillsPage })));
const MyGrantApplicationsPage = lazy(() => import('../views/user/MyGrantApplicationsPage').then(m => ({ default: m.MyGrantApplicationsPage })));
const ResourceCenterManagementPage = lazy(() => import('../views/resourceCenter/ResourceCenterManagementPage').then(m => ({ default: m.ResourceCenterManagementPage })));
const ResourceRegisterPage = lazy(() => import('../views/resourceCenter/ResourceRegisterPage').then(m => ({ default: m.ResourceRegisterPage })));
const SkillExternalMarketPage = lazy(() => import('../views/resourceCenter/SkillExternalMarketPage').then(m => ({ default: m.SkillExternalMarketPage })));
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
const UserResourceMarketHub = lazy(() =>
  import('../views/marketplace/UserResourceMarketHub').then((m) => ({ default: m.UserResourceMarketHub })),
);
const SkillMarket = lazy(() => import('../views/skill/SkillMarket').then((m) => ({ default: m.SkillMarket })));
const McpMarket = lazy(() => import('../views/mcp/McpMarket').then((m) => ({ default: m.McpMarket })));
const DatasetMarket = lazy(() => import('../views/dataset/DatasetMarket').then((m) => ({ default: m.DatasetMarket })));
const AgentMarket = lazy(() => import('../views/agent/AgentMarket').then((m) => ({ default: m.AgentMarket })));
const AgentMarketDetailPage = lazy(() =>
  import('../views/agent/AgentMarketDetailPage').then((m) => ({ default: m.AgentMarketDetailPage })),
);
const AppMarket = lazy(() => import('../views/apps/AppMarket').then((m) => ({ default: m.AppMarket })));
const AppMarketDetailPage = lazy(() =>
  import('../views/apps/AppMarketDetailPage').then((m) => ({ default: m.AppMarketDetailPage })),
);
const SkillMarketDetailPage = lazy(() =>
  import('../views/skill/SkillMarketDetailPage').then((m) => ({ default: m.SkillMarketDetailPage })),
);
const DatasetMarketDetailPage = lazy(() =>
  import('../views/dataset/DatasetMarketDetailPage').then((m) => ({ default: m.DatasetMarketDetailPage })),
);

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
  ADMIN_LEGACY_RESOURCE_LIST_PAGES,
  ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE,
  USER_LEGACY_MARKET_PAGE_TO_TAB,
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
import { ConsoleSidebar, type ConsoleSidebarRow } from '../components/layout/ConsoleSidebar';
import { ConsoleTopNav } from '../components/layout/ConsoleTopNav';
import { HubPersonalRail } from '../components/layout/HubPersonalRail';
import { AvatarGradientFrame, MultiAvatar } from '../components/common/MultiAvatar';
import { PLATFORM_ROLE_LABELS } from '../constants/platformRoles';
import { Tooltip } from '../components/common/Tooltip';
import {
  chromeGpuLayerClass,
  consoleContentTopPad,
  contentMaxWidth,
  iconChrome,
  mainScrollCompositorClass,
} from '../utils/uiClasses';

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
      return 'my-publish-agent';
    case 'my-skills':
      return 'my-publish-skill';
    default:
      return page;
  }
}

const SUB_ITEM_PERM_MAP: Record<string, string | string[]> = {
  'provider-list': 'provider:view',
  'provider-create': 'provider:manage',
  /** 超管 user:manage；审核员只读目录为 user:read（与后端 GET /user-mgmt/users 一致） */
  'user-list': ['user:manage', 'user:read'],
  'role-management': 'role:manage',
  'organization': 'org:manage',
  'api-key-management': 'api-key:manage',
  'token-management': ['api-key:manage', 'apikey:read'],
  'network-config': 'system:config',
  'resource-grant-management': 'resource-grant:manage',
  /** 资源 owner / 审核员 / 超管可审；与后端 Grant 工单一致 */
  'grant-applications': ['resource-grant:manage', 'grant-application:review'],
  'developer-applications': 'developer-application:review',
  'alert-rules': 'system:config',
  'health-config': 'system:config',
  'circuit-breaker': 'system:config',
  'skill-external-market': 'system:config',
};

function subItemMeetsPermission(itemId: string, hasPermission: (perm: string) => boolean): boolean {
  const perm = SUB_ITEM_PERM_MAP[itemId];
  if (!perm) return true;
  const list = Array.isArray(perm) ? perm : [perm];
  return list.some((p) => hasPermission(p));
}

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
  navigateTo: (page: string, id?: string | number, extra?: { skillTrack?: 'hosted' | 'mountable' }) => void;
  setShowUserMenu: (show: boolean) => void;
  setShowAppearanceMenu: (show: boolean) => void;
  exploreHubRail?: ExploreHubRailConfig;
  /** 移动侧栏打开时与 Hub 轨 ⌘/Ctrl+K 互斥 */
  mobileNavOpen: boolean;
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
  exploreHubRail,
  mobileNavOpen,
}) => {
  const renderResourceList = (type: ResourceType) => (
    <ResourceCenterManagementPage
      theme={t}
      fontSize={fs}
      showMessage={msg}
      resourceType={type}
      allowTypeSwitch={false}
      onNavigateRegister={(rt, id, opts) => nav(RESOURCE_TYPE_REGISTER_PAGE[rt], id, opts)}
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

        case 'resource-catalog':
          return (
            <ResourceCenterManagementPage
              theme={t}
              fontSize={fs}
              showMessage={msg}
              resourceType={typeQuery ?? 'agent'}
              allowTypeSwitch
              onTypeChange={(nextType) => nav('resource-catalog', nextType)}
              onNavigateRegister={(type, id, opts) => nav(RESOURCE_TYPE_REGISTER_PAGE[type], id, opts)}
              onOpenSkillExternalMarket={() => nav('skill-external-market')}
            />
          );
        case 'skill-external-market':
          return <SkillExternalMarketPage theme={t} fontSize={fs} showMessage={msg} />;
        case 'agent-register':
          return renderResourceRegister('agent');
        case 'agent-detail':
          return (
            <AgentDetail
              agentId={rid ?? ''}
              theme={t}
              fontSize={fs}
              onBack={() => nav('resource-catalog', 'agent')}
            />
          );
        case 'agent-monitoring':
          return <AgentMonitoringPage theme={t} fontSize={fs} />;
        case 'agent-trace':
          return <AgentTracePage theme={t} fontSize={fs} />;

        case 'skill-register':
          return renderResourceRegister('skill');
        case 'mcp-register':
          return renderResourceRegister('mcp');
        case 'resource-audit':
          return (
            <ResourceAuditList theme={t} fontSize={fs} showMessage={msg} defaultType={typeQuery} />
          );

        case 'app-register':
          return renderResourceRegister('app');

        case 'dataset-register':
          return renderResourceRegister('dataset');

        case 'user-list':
        case 'role-management':
        case 'organization':
        case 'api-key-management':
        case 'token-management':
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
        case 'system-params':
        case 'security-settings':
        case 'network-config':
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
        return (
          <ExploreHub
            theme={t}
            fontSize={fs}
            hubRail={exploreHubRail}
            mobileNavDrawerOpen={mobileNavOpen}
          />
        );
      case 'workspace':
        return <UserWorkspaceOverview theme={t} fontSize={fs} />;
      case 'developer-onboarding':
        return <DeveloperOnboardingPage embedded />;
      case 'resource-center':
        return (
          <ResourceCenterManagementPage
            theme={t}
            fontSize={fs}
            showMessage={msg}
            resourceType={typeQuery ?? 'agent'}
            allowTypeSwitch
            onTypeChange={(nextType) => nav('resource-center', nextType)}
            onNavigateRegister={(type, id, opts) => nav(RESOURCE_TYPE_REGISTER_PAGE[type], id, opts)}
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

      case 'resource-market':
        return <UserResourceMarketHub theme={t} fontSize={fs} themeColor={tc} showMessage={msg} />;

      case 'skills-center':
        return rid ? (
          <SkillMarketDetailPage
            resourceId={rid}
            theme={t}
            fontSize={fs}
            themeColor={tc}
            showMessage={msg}
            onNavigateToList={() => nav('skills-center')}
          />
        ) : (
          <SkillMarket theme={t} fontSize={fs} themeColor={tc} showMessage={msg} />
        );

      case 'mcp-center':
        return <McpMarket theme={t} fontSize={fs} themeColor={tc} showMessage={msg} detailResourceId={rid} />;

      case 'dataset-center':
        return rid ? (
          <DatasetMarketDetailPage
            resourceId={rid}
            theme={t}
            fontSize={fs}
            themeColor={tc}
            showMessage={msg}
            onNavigateToList={() => nav('dataset-center')}
          />
        ) : (
          <DatasetMarket theme={t} fontSize={fs} themeColor={tc} showMessage={msg} />
        );

      case 'agents-center':
        return rid ? (
          <AgentMarketDetailPage
            resourceId={rid}
            theme={t}
            fontSize={fs}
            themeColor={tc}
            showMessage={msg}
            onNavigateToList={() => nav('agents-center')}
          />
        ) : (
          <AgentMarket theme={t} fontSize={fs} themeColor={tc} showMessage={msg} />
        );

      case 'apps-center':
        return rid ? (
          <AppMarketDetailPage
            resourceId={rid}
            theme={t}
            fontSize={fs}
            themeColor={tc}
            showMessage={msg}
            onNavigateToList={() => nav('apps-center')}
          />
        ) : (
          <AppMarket theme={t} fontSize={fs} themeColor={tc} showMessage={msg} />
        );

      case 'my-agents-pub':
        return <MyPublishHubPage theme={t} fontSize={fs} />;

      case 'my-publish-agent':
      case 'my-publish-skill':
      case 'my-publish-mcp':
      case 'my-publish-app':
      case 'my-publish-dataset':
        return <MyPublishListRoute theme={t} fontSize={fs} page={p} />;

      case 'usage-records':
        return <UsageRecordsPage theme={t} fontSize={fs} initialView="records" />;
      case 'my-favorites':
        return <MyFavoritesPage theme={t} fontSize={fs} />;
      case 'usage-stats':
        return <UsageStatsPage theme={t} fontSize={fs} />;
      case 'grant-applications':
        return <GrantApplicationListPage theme={t} fontSize={fs} showMessage={msg} />;
      case 'developer-applications':
        return <DeveloperApplicationListPage theme={t} fontSize={fs} showMessage={msg} />;
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
    if (
      p.includes('market') ||
      p === 'quick-access' ||
      p === 'skills-center' ||
      p === 'mcp-center' ||
      p === 'dataset-center' ||
      p === 'agents-center' ||
      p === 'apps-center'
    )
      return 'cards' as const;
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
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.exploreHubRail === nextProps.exploreHubRail &&
    prevProps.mobileNavOpen === nextProps.mobileNavOpen
  );
});

MainContent.displayName = 'MainContent';

/** 路由切换动画：动画期 will-change；合成层由主滚动区内层 div 承担，避免与 overflow-y-auto 同节点 */
const RouteContentMotion: React.FC<{
  animationVariants: Variants;
  children: React.ReactNode;
}> = ({ animationVariants, children }) => {
  const [routeLayerWillChange, setRouteLayerWillChange] = React.useState<'opacity, transform' | 'auto'>(
    'opacity, transform',
  );
  return (
    <motion.div
      variants={animationVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={springTransition}
      className="flex min-h-0 w-full flex-col pb-4"
      style={{ willChange: routeLayerWillChange }}
      onAnimationStart={() => setRouteLayerWillChange('opacity, transform')}
      onAnimationComplete={() => setRouteLayerWillChange('auto')}
    >
      {children}
    </motion.div>
  );
};

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
    return (
      <div
        className="fixed inset-0 overflow-auto bg-slate-50 dark:bg-slate-950"
        aria-busy="true"
        aria-label="加载会话"
      >
        <PageSkeleton type="dashboard" />
      </div>
    );
  }
  if (!user) {
    return null;
  }

  const pRole = normalizeRole(user.role);
  const consoleRole = platformRoleToConsoleRole(pRole);

  return (
    <UserRoleProvider
      key={`${user?.id ?? 'anon'}-${user?.role ?? 'user'}-${(user?.permissions?.length ?? 'x')}`}
      initialRole={consoleRole}
      platformRole={pRole}
      serverPermissions={user.permissions}
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
  const marketTabQuery = parseResourceType(new URLSearchParams(location.search).get('tab'));
  const isStandaloneUserSettingsPage = routeRole === 'user' && ['profile', 'preferences'].includes(normalizedRoutePage ?? '');
  const routeValid = !!(routeRole && normalizedRoutePage && (findSidebarForPage(routeRole, normalizedRoutePage) || isStandaloneUserSettingsPage));

  const consoleRole: ConsoleRole = routeRole ?? (ctxAdmin ? 'admin' : 'user');
  const layoutIsAdmin = consoleRole === 'admin';
  const basePage = normalizedRoutePage ?? (consoleRole === 'admin' ? 'dashboard' : 'workspace');
  let page = basePage;
  let resourceTypeQuery = queryType;
  if (layoutIsAdmin && normalizedRoutePage) {
    if (ADMIN_LEGACY_RESOURCE_LIST_PAGES.has(normalizedRoutePage)) {
      page = 'resource-catalog';
      resourceTypeQuery = LEGACY_PAGE_TO_TYPE[normalizedRoutePage];
    } else if (ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE[normalizedRoutePage]) {
      page = 'resource-audit';
      resourceTypeQuery = queryType ?? ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE[normalizedRoutePage];
    }
  }
  if (layoutIsAdmin && page === 'resource-catalog') {
    resourceTypeQuery = resourceTypeQuery ?? 'agent';
  }

  const baseActiveSidebar = findSidebarForPage(consoleRole, page)
    ?? (layoutIsAdmin ? 'overview' : 'workspace');
  /** 与 resource-market 重定向一致：缺省 / 非法 tab 视为 agent，避免高亮瞬间落在「资源与资产」 */
  const activeSidebar =
    !layoutIsAdmin && page === 'resource-market'
      ? marketTabQuery === 'skill'
        ? 'skills-center'
        : marketTabQuery === 'mcp'
          ? 'mcp-center'
          : marketTabQuery === 'dataset'
            ? 'dataset-center'
            : marketTabQuery === 'app'
              ? 'apps-center'
              : 'agents-center'
      : baseActiveSidebar;
  const activeSubItem = pageToSubItem(page, activeSidebar, layoutIsAdmin);

  const headerMenusRef = useRef<HTMLDivElement>(null);
  const messagePanelAnchorRef = useRef<HTMLDivElement>(null);
  /** 主内容滚动区：Hash 路由切换不会整页刷新，需手动滚回顶部 */
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  /**
   * 探索 hub 页始终内嵌个人左轨。
   * 其他子页：独立左轨是否展示由下方 useEffect 按当前 page 与配置同步（含刷新/深链恢复）。
   */
  const [personalRailOpen, setPersonalRailOpen] = useState(false);
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
    mainScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  /** 用户资源市场：旧版 ?resourceId= 深链统一跳转到 /user/{center}/:id，便于全页详情与分享 */
  const USER_MARKET_PAGES_WITH_DETAIL = useMemo(
    () =>
      new Set<string>(['skills-center', 'mcp-center', 'dataset-center', 'agents-center', 'apps-center']),
    [],
  );
  useEffect(() => {
    if (layoutIsAdmin) return;
    if (!page || !USER_MARKET_PAGES_WITH_DETAIL.has(page) || routeId) return;
    const rid = new URLSearchParams(location.search).get('resourceId')?.trim();
    if (!rid) return;
    navigate(buildPath('user', page, rid), { replace: true });
  }, [layoutIsAdmin, page, routeId, location.search, navigate, USER_MARKET_PAGES_WITH_DETAIL]);

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

  /** 用户壳「我的发布」路由：开发者靠 create 权限；审核员/超管可代管资源注册中心（与后端 requireManageableResource 一致） */
  const canAccessUserPublishingShell =
    canPublishResources ||
    platformRole === 'reviewer' ||
    platformRole === 'platform_admin';

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
    if (routeRole === 'user' && normalizedRoutePage === 'skill-market') {
      const sp = new URLSearchParams(location.search);
      const q = new URLSearchParams();
      const rid = sp.get('resourceId');
      if (rid) q.set('resourceId', rid);
      const next = `${buildPath('user', 'skills-center')}${q.toString() ? `?${q}` : ''}`;
      if (`${location.pathname}${location.search}` !== next) {
        navigate(next, { replace: true });
      }
      return;
    }
    if (routeRole === 'user' && normalizedRoutePage && USER_LEGACY_MARKET_PAGE_TO_TAB[normalizedRoutePage]) {
      const tab = USER_LEGACY_MARKET_PAGE_TO_TAB[normalizedRoutePage];
      const sp = new URLSearchParams(location.search);
      const rid = sp.get('resourceId');
      if (tab === 'mcp') {
        const q = new URLSearchParams();
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'mcp-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      if (tab === 'dataset') {
        const q = new URLSearchParams();
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'dataset-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      if (tab === 'agent') {
        const q = new URLSearchParams();
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'agents-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      if (tab === 'app') {
        const q = new URLSearchParams();
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'apps-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      const q = new URLSearchParams();
      q.set('tab', tab);
      if (rid) q.set('resourceId', rid);
      const next = `${buildPath('user', 'resource-market')}?${q}`;
      if (`${location.pathname}${location.search}` !== next) {
        navigate(next, { replace: true });
      }
      return;
    }
    if (routeRole === 'user' && normalizedRoutePage === 'resource-market') {
      const sp = new URLSearchParams(location.search);
      const tabRaw = sp.get('tab');
      const tabOk = parseResourceType(tabRaw);
      if (tabOk === 'skill') {
        const q = new URLSearchParams();
        const rid = sp.get('resourceId');
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'skills-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      if (tabOk === 'mcp') {
        const q = new URLSearchParams();
        const rid = sp.get('resourceId');
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'mcp-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      if (tabOk === 'dataset') {
        const q = new URLSearchParams();
        const rid = sp.get('resourceId');
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'dataset-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      if (tabOk === 'agent') {
        const q = new URLSearchParams();
        const rid = sp.get('resourceId');
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'agents-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      if (tabOk === 'app') {
        const q = new URLSearchParams();
        const rid = sp.get('resourceId');
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'apps-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      if (!tabRaw || !tabOk) {
        const q = new URLSearchParams();
        const rid = sp.get('resourceId');
        if (rid) q.set('resourceId', rid);
        const next = `${buildPath('user', 'agents-center')}${q.toString() ? `?${q}` : ''}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
    }
    if (routeRole === 'user' && normalizedRoutePage === 'resource-center' && !queryType) {
      navigate(`${buildPath('user', 'resource-center')}?type=agent`, { replace: true });
      return;
    }
    if (routeRole === 'admin' && normalizedRoutePage === 'resource-catalog' && !queryType) {
      navigate(`${buildPath('admin', 'resource-catalog')}?type=agent`, { replace: true });
      return;
    }
    if (routeRole === 'admin' && normalizedRoutePage) {
      if (ADMIN_LEGACY_RESOURCE_LIST_PAGES.has(normalizedRoutePage)) {
        const t = LEGACY_PAGE_TO_TYPE[normalizedRoutePage];
        const next = `${buildPath('admin', 'resource-catalog')}?type=${t}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      const auditDef = ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE[normalizedRoutePage];
      if (auditDef) {
        const t = queryType ?? auditDef;
        const next = `${buildPath('admin', 'resource-audit')}?type=${t}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
      }
    }
    if (
      routeRole === 'user' &&
      normalizedRoutePage &&
      DEVELOPER_PORTAL_PAGES.has(normalizedRoutePage) &&
      !hasPermission('developer:portal')
    ) {
      navigate(defaultPath(), { replace: true });
      return;
    }
    if (
      routeRole === 'user' &&
      normalizedRoutePage === 'grant-applications' &&
      !hasPermission('grant-application:review') &&
      !hasPermission('resource-grant:manage')
    ) {
      navigate(defaultPath(), { replace: true });
      showMessage('当前账号无授权审批权限', 'info');
      return;
    }
    if (
      routeRole === 'user' &&
      normalizedRoutePage === 'developer-applications' &&
      !hasPermission('developer-application:review')
    ) {
      navigate(defaultPath(), { replace: true });
      showMessage('当前账号无入驻审批权限', 'info');
      return;
    }
    if (routeRole === 'admin' && normalizedRoutePage === 'skill-external-market' && !hasPermission('system:config')) {
      navigate(`${buildPath('admin', 'resource-catalog')}?type=skill`, { replace: true });
      showMessage('当前账号无权访问技能在线市场', 'info');
      return;
    }
    if (!routeValid) {
      if (routeRole === 'admin' || routeRole === 'user') {
        navigate(defaultPath(), { replace: true });
      } else {
        navigate('/404', { replace: true });
      }
      return;
    }
    if (routeRole === 'admin' && !canAccessAdminView(platformRole)) {
      navigate(defaultPath(), { replace: true });
    }
    if (
      routeRole === 'user' &&
      !layoutIsAdmin &&
      [
        'resource-center',
        'my-publish-agent',
        'my-publish-skill',
        'my-publish-mcp',
        'my-publish-app',
        'my-publish-dataset',
        'agent-list',
        'agent-register',
        'skill-list',
        'skill-register',
        'mcp-server-list',
        'mcp-register',
        'app-list',
        'app-register',
        'dataset-list',
        'dataset-register',
      ].includes(page) &&
      !canAccessUserPublishingShell
    ) {
      navigate(buildPath('user', 'hub'), { replace: true });
      showMessage('当前账号暂无统一资源发布权限', 'info');
    }
  }, [routeValid, routeRole, routePage, normalizedRoutePage, routeId, queryType, consoleRole, platformRole, navigate, layoutIsAdmin, page, canAccessUserPublishingShell, showMessage, hasPermission, location.pathname, location.search]);

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

  const userSidebarItems = useMemo(
    () =>
      USER_SIDEBAR_ITEMS.filter((item) => {
        if (item.id === 'developer-portal') return hasPermission('developer:portal');
        return true;
      }),
    [hasPermission],
  );

  const adminSidebarItems = useMemo(() => {
    if (!canAccessAdminView(platformRole)) return [];
    const adminPermMap: Record<string, string> = {
      'monitoring': 'monitor:view',
      'system-config': 'system:config',
    };
    return ADMIN_SIDEBAR_ITEMS.filter((item) => {
      if (item.id === 'admin-resource-ops') {
        return (
          hasPermission('agent:view') ||
          hasPermission('agent:audit') ||
          hasPermission('skill:audit') ||
          hasPermission('resource:audit') ||
          hasPermission('provider:manage')
        );
      }
      if (item.id === 'user-management') {
        return (
          hasPermission('user:manage') ||
          hasPermission('user:read') ||
          hasPermission('developer-application:review') ||
          hasPermission('grant-application:review') ||
          hasPermission('resource-grant:manage')
        );
      }
      const requiredPerm = adminPermMap[item.id];
      return !requiredPerm || hasPermission(requiredPerm);
    });
  }, [platformRole, hasPermission]);

  /** 同一侧栏内合并使用端与管理端分组（全量：桌面管理轨、抽屉与顶栏搜索；分区名与产品稿图二一致） */
  const fullSidebarRows: ConsoleSidebarRow[] = useMemo(() => {
    const rows: ConsoleSidebarRow[] = [
      { kind: 'section', label: '使用端' },
      ...userSidebarItems.map((item) => ({ kind: 'item' as const, ...item, domain: 'user' as const })),
    ];
    if (adminSidebarItems.length > 0) {
      rows.push({ kind: 'section', label: '管理端' });
      rows.push(
        ...adminSidebarItems.map((item) => ({ kind: 'item' as const, ...item, domain: 'admin' as const })),
      );
    }
    return rows;
  }, [userSidebarItems, adminSidebarItems]);

  /**
   * 顶栏始终不出现「平台管理」一级（与 topNavPolicy 一致）；管理一级仅在桌面固定左轨与移动抽屉中展示。
   */
  const topNavSidebarRows = useMemo(
    () => filterSidebarRowsForSlimTopNav(fullSidebarRows, { omitAdminPrimary: true }),
    [fullSidebarRows],
  );

  /** 管理端桌面：左侧固定与图二一致，为「使用端 + 管理端」全量侧栏（与移动抽屉同源） */
  const showAdminDesktopSidebar = layoutIsAdmin;

  const filteredSubGroupsForSidebarId = useCallback(
    (sidebarId: string, domain: ConsoleRole) => {
      const groups = getNavSubGroups(sidebarId, domain === 'admin');
      return groups
        .filter((g) => !(domain === 'user' && g.requiresPublish && !canAccessUserPublishingShell))
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => {
            if (item.id === 'developer-onboarding') {
              return (
                platformRole !== 'developer' &&
                platformRole !== 'platform_admin' &&
                platformRole !== 'reviewer'
              );
            }
            return subItemMeetsPermission(item.id, hasPermission);
          }),
        }))
        .filter((g) => g.items.length > 0);
    },
    [hasPermission, platformRole, canAccessUserPublishingShell],
  );

  const hubPersonalRailSections: HubPersonalRailSection[] = useMemo(() => {
    if (consoleRole !== 'user') return [];
    const out: HubPersonalRailSection[] = [];
    const hubTopItem = USER_SIDEBAR_ITEMS.find((i) => i.id === 'hub');
    for (const parentId of HUB_PERSONAL_RAIL_PARENT_IDS) {
      if (parentId === 'hub') {
        if (hubTopItem) {
          out.push({
            heading: hubTopItem.label,
            parentSidebarId: 'hub',
            domain: 'user',
            rows: [{ subItemId: 'hub', label: hubTopItem.label, icon: hubTopItem.icon }],
          });
        }
        continue;
      }
      const groups = filteredSubGroupsForSidebarId(parentId, 'user');
      out.push(...buildHubPersonalNavModel(parentId, 'user', groups));
    }
    return out;
  }, [consoleRole, filteredSubGroupsForSidebarId]);

  /** 有平台管理权限时，探索首页左轨追加管理目录（与顶栏/子菜单同源权限过滤） */
  const hubAdminRailSections: HubPersonalRailSection[] = useMemo(() => {
    if (consoleRole !== 'user' || adminSidebarItems.length === 0) return [];
    const out: HubPersonalRailSection[] = [];
    for (const item of adminSidebarItems) {
      const groups = filteredSubGroupsForSidebarId(item.id, 'admin');
      out.push(...buildHubPersonalNavModel(item.id, 'admin', groups));
    }
    return out;
  }, [consoleRole, adminSidebarItems, filteredSubGroupsForSidebarId]);

  const exploreHubRailSections: HubPersonalRailSection[] = useMemo(
    () => [...hubPersonalRailSections, ...hubAdminRailSections],
    [hubPersonalRailSections, hubAdminRailSections],
  );

  /**
   * 独立个人左轨开关必须与 URL 同步，否则整页刷新后 state 回到 false，子页（如工作台）会丢了左轨。
   * hub 页由内嵌 exploreHubRail 提供左轨，这里保持 standalone 关闭以免重复。
   * 顶栏五类「广场/中心」仅主内容，不叠独立左轨（与顶栏语义一致）。
   */
  useEffect(() => {
    if (consoleRole !== 'user' || exploreHubRailSections.length === 0) {
      setPersonalRailOpen(false);
      return;
    }
    if (page === 'hub') {
      setPersonalRailOpen(false);
      return;
    }
    if (USER_TOP_NAV_NO_RAIL_SIDEBAR_ID_SET.has(activeSidebar)) {
      setPersonalRailOpen(false);
      return;
    }
    setPersonalRailOpen(true);
  }, [consoleRole, exploreHubRailSections.length, page, activeSidebar]);

  useEffect(() => {
    const groups = filteredSubGroupsForSidebarId(activeSidebar, consoleRole);
    if (groups.length > 0) {
      setExpandedGroups((prev) => (prev.length === 0 ? [activeSidebar] : prev));
    }
  }, [activeSidebar, consoleRole, filteredSubGroupsForSidebarId]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? [] : [id],
    );
  };

  const handleSidebarClick = (id: string, domain: ConsoleRole) => {
    setMobileNavOpen(false);
    const hasChildren = filteredSubGroupsForSidebarId(id, domain).length > 0;
    if (!hasChildren) {
      setExpandedGroups([]);
    }
    navigate(buildPath(domain, getDefaultPage(domain, id)));
  };

  const navigateSubItem = useCallback(
    (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => {
      setMobileNavOpen(false);
      const isAdminNav = domain === 'admin';
      const pageName = subItemToPage(parentSidebarId, subItemId, isAdminNav);
      if (isAdminNav && pageName === 'resource-catalog') {
        navigate(`${buildPath(domain, 'resource-catalog')}?type=agent`);
        return;
      }
      if (isAdminNav && pageName === 'resource-audit') {
        navigate(buildPath(domain, 'resource-audit'));
        return;
      }
      if (!isAdminNav && pageName === 'resource-market') {
        navigate(buildPath(domain, 'agents-center'));
        return;
      }
      navigate(buildPath(domain, pageName));
    },
    [navigate],
  );

  const handleChromeSubItemClick = useCallback(
    (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => {
      navigateSubItem(subItemId, parentSidebarId, domain);
    },
    [navigateSubItem],
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

  const navigateTo = useCallback(
    (targetPage: string, id?: string | number, extra?: { skillTrack?: 'hosted' | 'mountable' }) => {
      if (targetPage === 'resource-center') {
        const type = typeof id === 'string' ? parseResourceType(id) : undefined;
        navigate(
          type
            ? `${buildPath(consoleRole, 'resource-center')}?type=${type}`
            : buildPath(consoleRole, 'resource-center'),
        );
        return;
      }
      if (targetPage === 'resource-catalog') {
        const type = typeof id === 'string' ? parseResourceType(id) : undefined;
        navigate(`${buildPath('admin', 'resource-catalog')}?type=${type ?? 'agent'}`);
        return;
      }
      const path = buildPath(consoleRole, targetPage, id);
      if (targetPage === 'skill-register' && extra?.skillTrack) {
        navigate(`${path}?skillTrack=${extra.skillTrack}`);
      } else {
        navigate(path);
      }
    },
    [navigate, consoleRole],
  );

  const contentKey = useMemo(() => {
    if (page === 'resource-center') return `${page}?type=${queryType ?? 'agent'}`;
    if (page === 'resource-catalog') return `${page}?type=${resourceTypeQuery ?? 'agent'}`;
    if (page === 'resource-audit') return `${page}?type=${resourceTypeQuery ?? 'all'}`;
    if (page === 'resource-market') return `resource-market?tab=${marketTabQuery ?? 'agent'}`;
    if (page === 'skills-center') return routeId ? `skills-center/${routeId}` : 'skills-center';
    if (page === 'mcp-center') return routeId ? `mcp-center/${routeId}` : 'mcp-center';
    if (page === 'dataset-center') return routeId ? `dataset-center/${routeId}` : 'dataset-center';
    if (page === 'agents-center') return routeId ? `agents-center/${routeId}` : 'agents-center';
    if (page === 'apps-center') return routeId ? `apps-center/${routeId}` : 'apps-center';
    return routeId ? `${page}/${routeId}` : page;
  }, [page, routeId, queryType, resourceTypeQuery, marketTabQuery, location.search]);

  const displayUserName =
    authUser?.realName?.trim() || authUser?.nickname?.trim() || authUser?.username || '用户';

  const navChildrenForActiveSidebar = useMemo(
    () => filteredSubGroupsForSidebarId(activeSidebar, consoleRole).flatMap((g) => g.items),
    [activeSidebar, consoleRole, filteredSubGroupsForSidebarId],
  );

  const hasSecondarySidebar = navChildrenForActiveSidebar.length > 0;

  /** 供 LayoutChrome（如市场页文案）使用；主滚动区不再渲染重复标题条 */
  const headerTitle = useMemo(() => {
    if (!layoutIsAdmin && ['profile', 'preferences'].includes(page)) return '个人设置';
    const parentItem = [...USER_SIDEBAR_ITEMS, ...ADMIN_SIDEBAR_ITEMS].find((i) => i.id === activeSidebar);
    if (!parentItem) return layoutIsAdmin ? '管理后台' : '工作台';
    if (navChildrenForActiveSidebar.length === 0) return parentItem.label;
    const activeChild = navChildrenForActiveSidebar.find((c) => c.id === activeSubItem);
    if (!activeChild) return parentItem.label;
    return activeChild.label;
  }, [activeSidebar, activeSubItem, navChildrenForActiveSidebar, layoutIsAdmin, page]);

  const exploreHubRail = useMemo((): ExploreHubRailConfig | undefined => {
    if (consoleRole !== 'user' || exploreHubRailSections.length === 0) return undefined;
    return {
      sections: exploreHubRailSections,
      displayName: displayUserName,
      roleLabel: PLATFORM_ROLE_LABELS[platformRole],
      avatarSeed: `${authUser?.id ?? 'user'}-${displayUserName}`,
      activeSidebar,
      activeSubItem,
      routeRole: consoleRole,
      onSubItemClick: handleChromeSubItemClick,
      onProfileClick: () => {
        navigate(buildPath('user', 'profile'));
      },
    };
  }, [
    consoleRole,
    exploreHubRailSections,
    displayUserName,
    authUser?.id,
    platformRole,
    activeSidebar,
    activeSubItem,
    handleChromeSubItemClick,
    navigate,
  ]);

  const exploreHubRailForContent = page === 'hub' && exploreHubRail ? exploreHubRail : undefined;

  const showStandalonePersonalRail =
    consoleRole === 'user' && personalRailOpen && Boolean(exploreHubRail) && page !== 'hub';

  /** 桌面端左侧已有完整导航时不再在顶栏重复铺横向一级菜单（管理固定侧栏 / 用户独立个人轨） */
  const hideTopBarHorizontalPrimaryNav =
    showAdminDesktopSidebar || showStandalonePersonalRail;

  return (
    <LayoutChromeProvider value={{ hasSecondarySidebar, chromePageTitle: headerTitle }}>
      <div
        data-theme={theme === 'dark' ? 'dark' : 'light'}
        className={`h-screen flex min-h-0 flex-col overflow-hidden selection:bg-neutral-200 selection:text-neutral-900 ${
          FONT_FAMILY_CLASSES[fontFamily]
        } bg-lantu-chrome`}
      >
        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="关闭菜单"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <ConsoleTopNav
          theme={theme}
          routeRole={consoleRole}
          activeSidebar={activeSidebar}
          activeSubItem={activeSubItem}
          sidebarRows={topNavSidebarRows}
          sidebarSearchRows={fullSidebarRows}
          platformRole={platformRole}
          hideHorizontalPrimaryNav={hideTopBarHorizontalPrimaryNav}
          onSidebarClick={handleSidebarClick}
          onSubItemClick={handleChromeSubItemClick}
          filteredSubGroupsForSidebarId={filteredSubGroupsForSidebarId}
          onLogoClick={() => {
            setExpandedGroups([]);
            navigate(defaultPath());
            setMobileNavOpen(false);
          }}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          toolbarRight={
            <div ref={headerMenusRef} className="flex items-center gap-2 sm:gap-3">
              <div className="relative flex h-9 items-center justify-center">
                <AnimatePresence>
                  {showSettingsMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={springTransition}
                      className={`absolute right-0 top-full z-[60] mt-1.5 w-[min(22rem,calc(100vw-1.25rem))] sm:w-96 rounded-xl border p-2 shadow-xl ${
                        isDark ? 'border-white/10 bg-lantu-card' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div
                        className={`max-h-[min(80vh,36rem)] overflow-y-auto overflow-x-hidden custom-scrollbar px-0.5 pb-1 pt-1 ${mainScrollCompositorClass}`}
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
                    className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 transition-colors motion-reduce:transition-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${
                      isDark
                        ? `${iconChrome(theme)} bg-white/[0.04] hover:bg-white/[0.08] focus-visible:ring-offset-lantu-card`
                        : `${iconChrome(theme)} bg-slate-100/50 hover:bg-slate-100 focus-visible:ring-offset-white`
                    }`}
                    aria-label="外观与主题"
                  >
                    <Palette size={18} strokeWidth={1.75} />
                  </button>
                </Tooltip>
              </div>

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
                    className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 transition-colors motion-reduce:transition-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${
                      isDark
                        ? `${iconChrome(theme)} bg-white/[0.04] hover:bg-white/[0.08] focus-visible:ring-offset-lantu-card ${showMessagePanel ? 'bg-white/10' : ''}`
                        : `${iconChrome(theme)} bg-slate-100/50 hover:bg-slate-100 focus-visible:ring-offset-white ${showMessagePanel ? 'bg-slate-100' : ''}`
                    }`}
                    aria-label={
                      messageUnreadCount > 0 ? `消息通知，${messageUnreadCount} 条未读` : '消息通知'
                    }
                  >
                    <Bell size={18} strokeWidth={1.75} />
                    {messageUnreadCount > 0 && (
                      <span
                        className={`absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold leading-none text-white shadow-sm ${
                          isDark ? 'border-lantu-card bg-rose-500' : 'border-white bg-rose-500'
                        }`}
                      >
                        {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                      </span>
                    )}
                  </button>
                </Tooltip>
              </div>

              <div className="hidden sm:flex h-9 items-center justify-center">
                <Tooltip content={isFullscreen ? '退出全屏' : '全屏'}>
                  <button
                    type="button"
                    onClick={() => {
                      void toggleFullscreen();
                      setShowSettingsMenu(false);
                      setShowUserMenu(false);
                    }}
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 transition-colors motion-reduce:transition-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${
                      isDark
                        ? `${iconChrome(theme)} bg-white/[0.04] hover:bg-white/[0.08] focus-visible:ring-offset-lantu-card`
                        : `${iconChrome(theme)} bg-slate-100/50 hover:bg-slate-100 focus-visible:ring-offset-white`
                    }`}
                    aria-label={isFullscreen ? '退出全屏' : '全屏'}
                  >
                    {isFullscreen ? <Minimize2 size={18} strokeWidth={1.75} /> : <Maximize2 size={18} strokeWidth={1.75} />}
                  </button>
                </Tooltip>
              </div>

              <div className="relative flex h-9 items-center justify-center">
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={springTransition}
                      role="menu"
                      aria-label="账户"
                      className={`absolute right-0 top-full z-[60] mt-1.5 w-52 rounded-xl border p-1.5 shadow-xl ${
                        isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          setShowUserMenu(false);
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
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-500 transition-colors hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/45 focus-visible:ring-inset"
                      >
                        <LogOut size={15} aria-hidden />
                        退出登录
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <Tooltip content={`${displayUserName}（${PLATFORM_ROLE_LABELS[platformRole]}）`}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu((v) => !v);
                      setShowSettingsMenu(false);
                      setShowMessagePanel(false);
                    }}
                    className={`group inline-flex h-9 items-center gap-1.5 rounded-full border px-0.5 py-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${
                      isDark
                        ? 'border-white/10 bg-white/[0.06] hover:bg-white/[0.1] focus-visible:ring-offset-lantu-card'
                        : 'border-slate-200/80 bg-white hover:bg-slate-50 focus-visible:ring-offset-white'
                    }`}
                    aria-label={`账户，${displayUserName}，退出登录`}
                    aria-expanded={showUserMenu}
                  >
                    <AvatarGradientFrame
                      isDark={isDark}
                      padding="sm"
                      className="group-hover:shadow-[0_0_14px_-4px_rgba(56,189,248,0.38)] group-hover:brightness-[1.05] motion-reduce:group-hover:shadow-none motion-reduce:group-hover:brightness-100"
                    >
                      <MultiAvatar
                        seed={`${authUser?.id ?? 'user'}-${displayUserName}`}
                        alt={displayUserName}
                        className="h-8 w-8 block shrink-0 rounded-full object-cover"
                      />
                    </AvatarGradientFrame>
                    <MoreVertical
                      size={14}
                      className={`mr-1 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                      aria-hidden
                    />
                  </button>
                </Tooltip>
              </div>
            </div>
          }
        />

        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col px-3 pb-3 pt-[calc(4rem+env(safe-area-inset-top,0px))] md:px-4 md:pb-4 ${showAdminDesktopSidebar ? 'lg:pl-[240px]' : ''}`}
        >
        {showAdminDesktopSidebar && (
          <aside
            className={`${chromeGpuLayerClass} fixed left-0 z-20 hidden h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] w-[240px] shrink-0 flex-col border-r px-3 py-2 motion-reduce:transition-none lg:flex lg:flex-col top-[calc(4rem+env(safe-area-inset-top,0px))] ${
              isDark ? 'border-white/[0.08] bg-lantu-chrome' : 'border-slate-200/80 bg-gray-100'
            }`}
            aria-label="控制台导航"
          >
            <ConsoleSidebar
              theme={theme}
              routeRole={consoleRole}
              activeSidebar={activeSidebar}
              activeSubItem={activeSubItem}
              sidebarRows={fullSidebarRows}
              expandedGroups={expandedGroups}
              platformRole={platformRole}
              displayUserName={displayUserName}
              avatarSeed={`${authUser?.id ?? 'user'}-${displayUserName}`}
              onSidebarClick={handleSidebarClick}
              onSubItemClick={handleChromeSubItemClick}
              onToggleGroup={toggleGroup}
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
                navigate(buildPath('admin', 'dashboard'));
                setMobileNavOpen(false);
              }}
              filteredSubGroupsForSidebarId={filteredSubGroupsForSidebarId}
              enableMenuSearchHotkey={false}
              showBrandHeader={false}
            />
          </aside>
        )}
        <aside
          className={`${chromeGpuLayerClass} fixed inset-y-0 left-0 z-50 flex h-full w-[240px] shrink-0 flex-col px-3 py-2 transition-transform duration-200 ease-out motion-reduce:transition-none lg:hidden ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isDark ? 'bg-lantu-chrome' : 'bg-gray-100'}`}
        >
          <ConsoleSidebar
            theme={theme}
            routeRole={consoleRole}
            activeSidebar={activeSidebar}
            activeSubItem={activeSubItem}
            sidebarRows={fullSidebarRows}
            expandedGroups={expandedGroups}
            platformRole={platformRole}
            displayUserName={displayUserName}
            avatarSeed={`${authUser?.id ?? 'user'}-${displayUserName}`}
            onSidebarClick={handleSidebarClick}
            onSubItemClick={handleChromeSubItemClick}
            onToggleGroup={toggleGroup}
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
              navigate(defaultPath());
              setMobileNavOpen(false);
            }}
            filteredSubGroupsForSidebarId={filteredSubGroupsForSidebarId}
            enableMenuSearchHotkey={mobileNavOpen}
          />
        </aside>

        <main
          className={`${chromeGpuLayerClass} relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent`}
        >
          <div
            ref={mainScrollRef}
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass}`}
          >
            <div className={`w-full ${chromeGpuLayerClass}`}>
              {showStandalonePersonalRail && exploreHubRail ? (
                <div className={`mx-auto w-full ${contentMaxWidth} px-4 sm:px-5 lg:px-6 xl:px-8`}>
                  <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
                    <div
                      className={`order-2 col-span-1 flex h-full min-h-0 flex-col lg:order-1 lg:col-span-2 lg:border-r lg:pr-6 ${consoleContentTopPad} ${
                        isDark ? 'lg:border-white/[0.08]' : 'lg:border-slate-200/80'
                      }`}
                    >
                      <HubPersonalRail
                        theme={theme}
                        sections={exploreHubRail.sections}
                        displayName={exploreHubRail.displayName}
                        roleLabel={exploreHubRail.roleLabel}
                        avatarSeed={exploreHubRail.avatarSeed}
                        activeSidebar={exploreHubRail.activeSidebar}
                        activeSubItem={exploreHubRail.activeSubItem}
                        routeRole={exploreHubRail.routeRole}
                        onProfileClick={exploreHubRail.onProfileClick}
                        onSubItemClick={exploreHubRail.onSubItemClick}
                        suppressGlobalMenuSearchHotkey={mobileNavOpen}
                      />
                    </div>
                    <div className="order-1 min-w-0 lg:order-2 lg:col-span-10">
                      <AnimatePresence mode="wait">
                        <RouteContentMotion key={contentKey} animationVariants={animationVariants}>
                          <div className={`mx-auto w-full ${contentMaxWidth}`}>
                            <MainContent
                              page={page}
                              routeId={routeId}
                              resourceTypeFromQuery={
                                page === 'resource-center'
                                  ? queryType
                                  : page === 'resource-catalog' || page === 'resource-audit'
                                    ? resourceTypeQuery
                                    : queryType
                              }
                              layoutIsAdmin={layoutIsAdmin}
                              theme={theme}
                              themePreference={themePreference}
                              themeColor={themeColor}
                              fontSize={fontSize}
                              showMessage={showMessage}
                              navigateTo={navigateTo}
                              setShowUserMenu={setShowUserMenu}
                              setShowAppearanceMenu={setShowAppearanceMenu}
                              exploreHubRail={undefined}
                              mobileNavOpen={mobileNavOpen}
                            />
                          </div>
                        </RouteContentMotion>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <RouteContentMotion key={contentKey} animationVariants={animationVariants}>
                    <div className={`mx-auto w-full ${contentMaxWidth}`}>
                      <MainContent
                        page={page}
                        routeId={routeId}
                        resourceTypeFromQuery={
                          page === 'resource-center'
                            ? queryType
                            : page === 'resource-catalog' || page === 'resource-audit'
                              ? resourceTypeQuery
                              : queryType
                        }
                        layoutIsAdmin={layoutIsAdmin}
                        theme={theme}
                        themePreference={themePreference}
                        themeColor={themeColor}
                        fontSize={fontSize}
                        showMessage={showMessage}
                        navigateTo={navigateTo}
                        setShowUserMenu={setShowUserMenu}
                        setShowAppearanceMenu={setShowAppearanceMenu}
                        exploreHubRail={exploreHubRailForContent}
                        mobileNavOpen={mobileNavOpen}
                      />
                    </div>
                  </RouteContentMotion>
                </AnimatePresence>
              )}
            </div>
          </div>
        </main>
        </div>
      </div>
    </LayoutChromeProvider>
  );
};
