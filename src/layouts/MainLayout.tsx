import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
  lazy,
  useSyncExternalStore,
} from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Palette,
  Bell,
  Maximize2,
  Minimize2,
  MoreVertical,
  LogOut,
  User,
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
import { unifiedResourceCenterPath } from '../utils/unifiedResourceCenterPath';
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
  USER_TOP_NAV_SIDEBAR_ID_SET,
  USER_TOP_NAV_SIDEBAR_IDS,
  type ExploreHubRailConfig,
  type HubPersonalRailSection,
} from '../constants/topNavPolicy';
import { AppearanceMenu } from '../components/business/AppearanceMenu';
import { MessagePanel, INITIAL_MESSAGE_UNREAD_COUNT } from '../components/business/MessagePanel';
import { ScrollToTopAffix } from '../components/common/ScrollToTopAffix';

const ExploreHub = lazy(() => import('../views/dashboard/ExploreHub').then(m => ({ default: m.ExploreHub })));
const UserWorkspaceOverview = lazy(() => import('../views/dashboard/UserWorkspaceOverview').then(m => ({ default: m.UserWorkspaceOverview })));
const DeveloperOnboardingPage = lazy(() => import('../views/onboarding/DeveloperOnboardingPage').then(m => ({ default: m.DeveloperOnboardingPage })));
const PlaceholderView = lazy(() => import('../views/common/PlaceholderView').then(m => ({ default: m.PlaceholderView })));
const AgentDetail = lazy(() => import('../views/agent/AgentDetail').then(m => ({ default: m.AgentDetail })));
const ProviderManagementPage = lazy(() => import('../views/provider/ProviderManagementPage').then(m => ({ default: m.ProviderManagementPage })));
const AdminOverviewModule = lazy(() =>
  import('../views/admin/AdminOverviewModule').then((m) => ({ default: m.AdminOverviewModule })),
);
const ResourceDiagnosticsModule = lazy(() =>
  import('../views/admin/ResourceDiagnosticsModule').then((m) => ({ default: m.ResourceDiagnosticsModule })),
);
const AdminMonitoringHubModule = lazy(() =>
  import('../views/admin/AdminMonitoringHubModule').then((m) => ({ default: m.AdminMonitoringHubModule })),
);
const AdminSystemConfigHubModule = lazy(() =>
  import('../views/admin/AdminSystemConfigHubModule').then((m) => ({ default: m.AdminSystemConfigHubModule })),
);
const AdminUserHubModule = lazy(() =>
  import('../views/admin/AdminUserHubModule').then((m) => ({ default: m.AdminUserHubModule })),
);
const MyPublishHubPage = lazy(() => import('../views/publish/MyPublishHubPage').then(m => ({ default: m.MyPublishHubPage })));
const MyPublishListRoute = lazy(() => import('../views/publish/MyPublishListRoute').then(m => ({ default: m.MyPublishListRoute })));
const UserSettingsHubPage = lazy(() => import('../views/user/UserSettingsHubPage').then(m => ({ default: m.UserSettingsHubPage })));
const UserApiKeysIntegrationHubPage = lazy(() =>
  import('../views/user/UserApiKeysIntegrationHubPage').then((m) => ({ default: m.UserApiKeysIntegrationHubPage })),
);
const UsageRecordsPage = lazy(() => import('../views/user/UsageRecordsPage').then(m => ({ default: m.UsageRecordsPage })));
const MyFavoritesPage = lazy(() => import('../views/user/MyFavoritesPage').then(m => ({ default: m.MyFavoritesPage })));
const UsageStatsPage = lazy(() => import('../views/user/UsageStatsPage').then(m => ({ default: m.UsageStatsPage })));
const ResourceCenterManagementPage = lazy(() => import('../views/resourceCenter/ResourceCenterManagementPage').then(m => ({ default: m.ResourceCenterManagementPage })));
const ResourceRegisterPage = lazy(() => import('../views/resourceCenter/ResourceRegisterPage').then(m => ({ default: m.ResourceRegisterPage })));
const ResourceAuditList = lazy(() => import('../views/audit/ResourceAuditList').then(m => ({ default: m.ResourceAuditList })));
const DeveloperApplicationListPage = lazy(() => import('../views/userMgmt/DeveloperApplicationListPage').then(m => ({ default: m.DeveloperApplicationListPage })));
const DeveloperDocsHubPage = lazy(() =>
  import('../views/developer/DeveloperDocsHubPage').then((m) => ({ default: m.DeveloperDocsHubPage })),
);
const DeveloperToolsHubPage = lazy(() =>
  import('../views/developer/DeveloperToolsHubPage').then((m) => ({ default: m.DeveloperToolsHubPage })),
);
const DeveloperStatsPage = lazy(() => import('../views/developer/DeveloperStatsPage').then(m => ({ default: m.DeveloperStatsPage })));
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
import {
  connectUserPushSocket,
  subscribeRealtimePush,
  isAlertFiring,
  isAuditPendingChanged,
  isHealthConfigUpdated,
  isHealthProbeStatusChanged,
  isCircuitStateChanged,
  isMonitoringKpiDigest,
} from '../lib/realtimePush';
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
  inferConsoleRole,
} from '../constants/consoleRoutes';
import type { ResourceType } from '../types/dto/catalog';
import {
  LEGACY_USER_RESOURCE_PAGES,
  RESOURCE_TYPE_LIST_PAGE,
  RESOURCE_TYPE_REGISTER_PAGE,
  parseResourceType,
} from '../constants/resourceTypes';
import { PageSkeleton } from '../components/common/PageSkeleton';
import { Logo } from '../components/common/Logo';
import type { ConsoleSidebarRow } from '../constants/consoleNavModel';
import { ConsoleTopNav } from '../components/layout/ConsoleTopNav';
import { HubPersonalRail } from '../components/layout/HubPersonalRail';
import { AvatarGradientFrame, MultiAvatar } from '../components/common/MultiAvatar';
import { PLATFORM_ROLE_LABELS } from '../constants/platformRoles';
import { Tooltip } from '../components/common/Tooltip';
import {
  chromeGpuLayerClass,
  consoleContentTopPad,
  consoleScrollSafeBottomPad,
  consoleShellBelowHeaderPt,
  contentPaddingX,
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
    case 'quota-management':
      return 'rate-limit-policy';
    case 'submit-agent':
      return 'my-agents-pub';
    case 'submit-skill':
      return 'my-agents-pub';
    case 'my-agents':
      return 'my-publish-agent';
    case 'my-skills':
      return 'my-publish-skill';
    case 'quick-access':
      return 'workspace';
    case 'recent-use':
      return 'usage-records';
    case 'api-docs':
    case 'sdk-download':
      return 'developer-docs';
    case 'api-playground':
    case 'mcp-integration':
      return 'developer-tools';
    default:
      return page;
  }
}

const SUB_ITEM_PERM_MAP: Record<string, string | string[]> = {
  'provider-list': 'provider:view',
  'provider-create': 'provider:manage',
  'dashboard': 'monitor:view',
  'health-check': 'monitor:view',
  'usage-statistics': 'monitor:view',
  'data-reports': 'monitor:view',
  'monitoring-overview': 'monitor:view',
  'call-logs': 'monitor:view',
  'performance-analysis': 'monitor:view',
  'alert-management': 'monitor:view',
  /** 超管 user:manage；审核员只读目录为 user:read（与后端 GET /user-mgmt/users 一致） */
  'user-list': ['user:manage', 'user:read'],
  'role-management': 'role:manage',
  'organization': 'org:manage',
  'api-key-management': 'api-key:manage',
  'network-config': 'system:config',
  'developer-applications': 'developer-application:review',
  'alert-rules': 'system:config',
  'health-config': 'system:config',
  'circuit-breaker': 'system:config',
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
const DEVELOPER_PORTAL_PAGES = new Set(['developer-docs', 'developer-tools', 'developer-statistics']);

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
  exploreHubRail?: ExploreHubRailConfig;
  /** 桌面端左轨由 MainLayout 抬出滚动区时置 true（仅 hub + 有轨配置） */
  exploreHubShellRail?: boolean;
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
  exploreHubShellRail = false,
  mobileNavOpen,
}) => {
  const renderResourceList = (type: ResourceType) => (
    <ResourceCenterManagementPage
      theme={t}
      fontSize={fs}
      showMessage={msg}
      resourceType={type}
      allowTypeSwitch={false}
      onNavigateRegister={(rt, id) => nav(RESOURCE_TYPE_REGISTER_PAGE[rt], id)}
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
        case 'health-check':
        case 'usage-statistics':
        case 'data-reports':
          return <AdminOverviewModule activePage={p} theme={t} fontSize={fs} />;

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
              onNavigateRegister={(type, id) => nav(RESOURCE_TYPE_REGISTER_PAGE[type], id)}
            />
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
          return <UsageRecordsPage theme={t} fontSize={fs} />;
        case 'my-favorites':
          return <MyFavoritesPage theme={t} fontSize={fs} />;
        case 'usage-stats':
          return <UsageStatsPage theme={t} fontSize={fs} />;
        case 'resource-market':
          return <UserResourceMarketHub theme={t} fontSize={fs} themeColor={tc} showMessage={msg} />;
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
          return (
            <ResourceRegisterPage
              theme={t}
              fontSize={fs}
              showMessage={msg}
              resourceType="agent"
              resourceId={rid ? Number(rid) : undefined}
              onBack={() => nav('resource-center', 'agent')}
            />
          );
        case 'agent-detail':
          return (
            <AgentDetail
              agentId={rid ?? ''}
              theme={t}
              fontSize={fs}
              onBack={() => nav('resource-center', typeQuery ?? 'agent')}
            />
          );
        case 'agent-monitoring':
        case 'agent-trace':
          return (
            <ResourceDiagnosticsModule activePage={p} theme={t} fontSize={fs} showMessage={msg} />
          );

        case 'skill-register':
          return (
            <ResourceRegisterPage
              theme={t}
              fontSize={fs}
              showMessage={msg}
              resourceType="skill"
              resourceId={rid ? Number(rid) : undefined}
              onBack={() => nav('resource-center', 'skill')}
            />
          );
        case 'mcp-register':
          return (
            <ResourceRegisterPage
              theme={t}
              fontSize={fs}
              showMessage={msg}
              resourceType="mcp"
              resourceId={rid ? Number(rid) : undefined}
              onBack={() => nav('resource-center', 'mcp')}
            />
          );
        case 'resource-audit':
          return (
            <ResourceAuditList theme={t} fontSize={fs} showMessage={msg} defaultType={typeQuery} />
          );

        case 'app-register':
          return (
            <ResourceRegisterPage
              theme={t}
              fontSize={fs}
              showMessage={msg}
              resourceType="app"
              resourceId={rid ? Number(rid) : undefined}
              onBack={() => nav('resource-center', 'app')}
            />
          );

        case 'dataset-register':
          return (
            <ResourceRegisterPage
              theme={t}
              fontSize={fs}
              showMessage={msg}
              resourceType="dataset"
              resourceId={rid ? Number(rid) : undefined}
              onBack={() => nav('resource-center', 'dataset')}
            />
          );

        case 'user-list':
        case 'role-management':
        case 'organization':
        case 'api-key-management':
        case 'developer-applications':
          return <AdminUserHubModule activePage={p} theme={t} fontSize={fs} showMessage={msg} />;
        case 'provider-list':
        case 'provider-create':
          return (
            <ProviderManagementPage
              theme={t}
              fontSize={fs}
              mode={p === 'provider-create' ? 'create' : 'list'}
              showMessage={msg}
            />
          );
        case 'monitoring-overview':
        case 'call-logs':
        case 'performance-analysis':
        case 'alert-management':
        case 'alert-rules':
        case 'health-config':
        case 'circuit-breaker':
          return (
            <AdminMonitoringHubModule activePage={p} theme={t} fontSize={fs} showMessage={msg} />
          );

        case 'category-management':
        case 'tag-management':
        case 'system-params':
        case 'security-settings':
        case 'network-config':
        case 'rate-limit-policy':
        case 'access-control':
        case 'audit-log':
        case 'sensitive-words':
        case 'announcements':
          return (
            <AdminSystemConfigHubModule activePage={p} theme={t} fontSize={fs} showMessage={msg} />
          );

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
            shellRendersRailOnDesktop={Boolean(exploreHubShellRail)}
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
        return <UsageRecordsPage theme={t} fontSize={fs} />;
      case 'my-favorites':
        return <MyFavoritesPage theme={t} fontSize={fs} />;
      case 'usage-stats':
        return <UsageStatsPage theme={t} fontSize={fs} />;
      case 'developer-applications':
        return <DeveloperApplicationListPage theme={t} fontSize={fs} showMessage={msg} />;
      case 'profile':
      case 'preferences':
        return (
          <UserSettingsHubPage
            theme={t}
            fontSize={fs}
            themePreference={tpref}
            themeColor={tc}
            showMessage={msg}
            onOpenAppearance={() => { setMenu(true); setAppMenu(true); }}
          />
        );
      case 'my-api-keys':
        return <UserApiKeysIntegrationHubPage theme={t} themeColor={tc} showMessage={msg} />;

      case 'developer-docs':
        return <DeveloperDocsHubPage theme={t} fontSize={fs} />;
      case 'developer-tools':
        return <DeveloperToolsHubPage theme={t} fontSize={fs} />;
      case 'developer-statistics':
        return <DeveloperStatsPage theme={t} fontSize={fs} />;

      default:
        return <PlaceholderView title={p} theme={t} fontSize={fs} />;
    }
  })();

  const skeletonType = (() => {
    if (p === 'dashboard' || p === 'workspace') return 'dashboard' as const;
    if (p.includes('create')) return 'form' as const;
    if (p.includes('detail') || p === 'profile' || p === 'my-api-keys') return 'detail' as const;
    if (
      p.includes('market') ||
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
    prevProps.exploreHubShellRail === nextProps.exploreHubShellRail &&
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

/** 兼容旧书签 `#/user/*`、`#/admin/*` → `#/c/*` */
const LegacyConsoleRedirect: React.FC<{ prefix: 'user' | 'admin' }> = ({ prefix }) => {
  const { pathname, search } = useLocation();
  const sliceLen = prefix === 'user' ? 5 : 6;
  const suffix = pathname.slice(sliceLen) || '/';
  const rest = suffix.startsWith('/') ? suffix : `/${suffix}`;
  const to = `/c${rest === '/' ? '' : rest}${search}`;
  return <Navigate to={to} replace />;
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
        <Route path="/user" element={<Navigate to="/c/hub" replace />} />
        <Route path="/admin" element={<Navigate to="/c/dashboard" replace />} />
        <Route path="/user/*" element={<LegacyConsoleRedirect prefix="user" />} />
        <Route path="/admin/*" element={<LegacyConsoleRedirect prefix="admin" />} />
        <Route
          path="/c/:page/:pageId?"
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
  const routePage = route?.page;
  const routeId = route?.id;
  const normalizedRoutePage = routePage ? normalizeDeprecatedPage(routePage) : undefined;
  const inferredRoleForPage =
    normalizedRoutePage != null ? inferConsoleRole(normalizedRoutePage, platformRole) : undefined;
  const queryType = parseResourceType(new URLSearchParams(location.search).get('type'));
  const marketTabQuery = parseResourceType(new URLSearchParams(location.search).get('tab'));
  const isStandaloneUserSettingsPage = ['profile', 'my-api-keys', 'my-integration-packages', 'preferences'].includes(
    normalizedRoutePage ?? '',
  );
  const routeValid = !!(
    normalizedRoutePage &&
    inferredRoleForPage &&
    (findSidebarForPage(inferredRoleForPage, normalizedRoutePage) || isStandaloneUserSettingsPage)
  );

  const consoleRole: ConsoleRole = inferredRoleForPage ?? (ctxAdmin ? 'admin' : 'user');
  const layoutIsAdmin = consoleRole === 'admin';
  const basePage = normalizedRoutePage ?? (consoleRole === 'admin' ? 'dashboard' : 'workspace');
  let page = basePage;
  let resourceTypeQuery = queryType;
  if (layoutIsAdmin && normalizedRoutePage) {
    if (ADMIN_LEGACY_RESOURCE_LIST_PAGES.has(normalizedRoutePage)) {
      page = 'resource-audit';
      resourceTypeQuery = queryType ?? LEGACY_PAGE_TO_TYPE[normalizedRoutePage];
    } else if (ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE[normalizedRoutePage]) {
      page = 'resource-audit';
      resourceTypeQuery = queryType ?? ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE[normalizedRoutePage];
    } else if (normalizedRoutePage === 'resource-catalog') {
      page = 'resource-audit';
      resourceTypeQuery = queryType ?? 'agent';
    }
  }

  /** 旧独立路由「集成套餐」已并入 my-api-keys；侧栏与主内容按 my-api-keys 处理 */
  if (page === 'my-integration-packages') {
    page = 'my-api-keys';
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

  /**
   * 顶栏六项：侧栏/左轨导航时强制「探索发现」(hub) 高亮；仅顶栏点击（或深链落在五广场）时让对应广场项高亮。
   */
  const [topNavPreferExploreHub, setTopNavPreferExploreHub] = useState(true);

  /** 书签 /c/my-integration-packages → 规范为 /c/my-api-keys?tab=packages */
  useLayoutEffect(() => {
    if (routePage !== 'my-integration-packages') return;
    const sp = new URLSearchParams(location.search);
    if (!sp.has('tab')) sp.set('tab', 'packages');
    const next = `${buildPath(consoleRole, 'my-api-keys')}?${sp}`;
    if (`${location.pathname}${location.search}` !== next) {
      navigate(next, { replace: true });
    }
  }, [routePage, location.pathname, location.search, navigate, consoleRole]);

  /** 开发者中心旧 slug → hub（保留 hash；补全 tab） */
  useLayoutEffect(() => {
    if (!routePage) return;
    const pathSearchHash = `${location.pathname}${location.search}${location.hash}`;
    if (routePage === 'sdk-download') {
      const sp = new URLSearchParams(location.search);
      if (!sp.has('tab')) sp.set('tab', 'sdk');
      const next = `${buildPath(consoleRole, 'developer-docs')}?${sp.toString()}${location.hash}`;
      if (pathSearchHash !== next) navigate(next, { replace: true });
      return;
    }
    if (routePage === 'api-docs') {
      const next = `${buildPath(consoleRole, 'developer-docs')}${location.search}${location.hash}`;
      if (pathSearchHash !== next) navigate(next, { replace: true });
      return;
    }
    if (routePage === 'api-playground') {
      const next = `${buildPath(consoleRole, 'developer-tools')}${location.search}${location.hash}`;
      if (pathSearchHash !== next) navigate(next, { replace: true });
      return;
    }
    if (routePage === 'mcp-integration') {
      const sp = new URLSearchParams(location.search);
      if (!sp.has('tab')) sp.set('tab', 'gateway');
      const next = `${buildPath(consoleRole, 'developer-tools')}?${sp.toString()}${location.hash}`;
      if (pathSearchHash !== next) navigate(next, { replace: true });
    }
  }, [routePage, location.pathname, location.search, location.hash, navigate, consoleRole]);

  useLayoutEffect(() => {
    if (USER_TOP_NAV_NO_RAIL_SIDEBAR_ID_SET.has(activeSidebar)) {
      setTopNavPreferExploreHub(false);
    }
  }, [activeSidebar]);

  const userTopNavPrimaryHighlightId = useMemo(() => {
    if (topNavPreferExploreHub) return 'hub';
    if (USER_TOP_NAV_SIDEBAR_ID_SET.has(activeSidebar)) return activeSidebar;
    return 'hub';
  }, [topNavPreferExploreHub, activeSidebar]);

  const headerMenusRef = useRef<HTMLDivElement>(null);
  const messagePanelAnchorRef = useRef<HTMLDivElement>(null);
  /** 主内容滚动区：Hash 路由切换不会整页刷新，需手动滚回顶部 */
  const mainScrollRef = useRef<HTMLDivElement>(null);
  /** 双栏壳：仅右侧内容滚动，避免与左侧轨共用 scroll 导致切换路由时整栏重绘闪烁 */
  const routeContentScrollRef = useRef<HTMLDivElement>(null);
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
  const authAccessToken = useAuthStore((s) => s.token);
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => readAppearanceState().themeColor);
  const [fontSize, setFontSize] = useState<FontSize>(() => readAppearanceState().fontSize);
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => readAppearanceState().fontFamily);
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>(() => readAppearanceState().animationStyle);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMessagePanel, setShowMessagePanel] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(INITIAL_MESSAGE_UNREAD_COUNT);
  /** 供屏幕阅读器播报的实时事件摘要（与顶层 toast 配套，不抢焦点） */
  const [realtimeLiveText, setRealtimeLiveText] = useState('');
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

  /** 站内通知：WebSocket 实时推送未读数，避免仅依赖窗口聚焦再拉取 */
  useEffect(() => {
    if (!authUser?.id || !authAccessToken) return;
    return connectUserPushSocket(() => useAuthStore.getState().token, {
      onServerPush: (msg) => {
        const raw = msg.unreadCount;
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          const n = raw > 0 ? Math.min(9999, Math.floor(raw)) : 0;
          setMessageUnreadCount(n);
          return;
        }
        void refreshMessageUnreadCount();
      },
    });
  }, [authUser?.id, authAccessToken, refreshMessageUnreadCount]);

  useEffect(() => {
    if (!authUser?.id) return;
    let digestTimer: ReturnType<typeof setTimeout> | null = null;
    let digestCount = 0;
    const digestKinds = new Set<string>();
    let latestDigestText = '';
    const flushDigest = () => {
      if (digestCount <= 0) return;
      const kinds = Array.from(digestKinds).slice(0, 3).join('、');
      const text = digestCount === 1
        ? latestDigestText
        : `收到 ${digestCount} 条实时状态更新${kinds ? `（${kinds}）` : ''}，可在消息中心查看`;
      showMessage(text, 'info', 3600);
      setRealtimeLiveText(text);
      digestTimer = null;
      digestCount = 0;
      digestKinds.clear();
      latestDigestText = '';
    };
    const queueDigest = (kind: string, text: string) => {
      digestCount += 1;
      digestKinds.add(kind);
      latestDigestText = text;
      if (digestTimer != null) return;
      digestTimer = setTimeout(flushDigest, 1600);
    };
    const unsubscribe = subscribeRealtimePush((msg) => {
      if (isAlertFiring(msg)) {
        const name = String((msg.payload?.ruleName as string) || '告警规则');
        const t = `告警已触发：${name}`;
        showMessage(t, 'warning', 4000);
        setRealtimeLiveText(t);
      } else if (isAuditPendingChanged(msg)) {
        const n = Number(msg.payload?.pendingCount ?? 0);
        const t = `待审核队列已更新，当前 ${n} 条待审`;
        queueDigest('待审队列', t);
      } else if (isHealthConfigUpdated(msg)) {
        const label = String((msg.payload?.displayName as string) || msg.payload?.resourceCode || '资源');
        const st = String((msg.payload?.healthStatus as string) || '');
        const t = `健康检查配置已更新：${label}${st ? `，状态 ${st}` : ''}`;
        queueDigest('健康配置', t);
      } else if (isHealthProbeStatusChanged(msg)) {
        const label = String((msg.payload?.displayName as string) || msg.payload?.resourceCode || '资源');
        const st = String((msg.payload?.healthStatus as string) || '');
        const t = `健康状态已变化：${label}${st ? ` → ${st}` : ''}`;
        if (st === 'down') {
          showMessage(t, 'error', 4200);
          setRealtimeLiveText(t);
        } else {
          queueDigest('健康状态', t);
        }
      } else if (isCircuitStateChanged(msg)) {
        const label = String((msg.payload?.displayName as string) || msg.payload?.resourceCode || '资源');
        const ns = String((msg.payload?.newState as string) || '');
        const t = `熔断状态已变化：${label}${ns ? ` → ${ns}` : ''}`;
        if (ns.toUpperCase().includes('OPEN')) {
          showMessage(t, 'warning', 4200);
          setRealtimeLiveText(t);
        } else {
          queueDigest('熔断状态', t);
        }
      } else if (isMonitoringKpiDigest(msg)) {
        const summary =
          (msg.payload?.summary as string) ||
          (typeof msg.payload?.message === 'string' ? (msg.payload.message as string) : '') ||
          '监控指标已更新';
        queueDigest('监控指标', summary);
      }
    });
    return () => {
      unsubscribe();
      if (digestTimer != null) clearTimeout(digestTimer);
    };
  }, [authUser?.id, showMessage]);

  useEffect(() => {
    const inner = routeContentScrollRef.current;
    const outer = mainScrollRef.current;
    if (inner) {
      inner.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else if (outer) {
      outer.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
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
    if (routePage && normalizedRoutePage && routePage !== normalizedRoutePage) {
      if (
        routePage === 'api-docs' ||
        routePage === 'sdk-download' ||
        routePage === 'api-playground' ||
        routePage === 'mcp-integration'
      ) {
        /* 规范 URL 由 useLayoutEffect（开发者 hub）处理，避免覆盖 tab/hash */
      } else {
        navigate(buildPath('user', normalizedRoutePage, routeId), { replace: true });
        return;
      }
    }
    if (!layoutIsAdmin && normalizedRoutePage && LEGACY_USER_RESOURCE_PAGES.has(normalizedRoutePage)) {
      const type = LEGACY_PAGE_TO_TYPE[normalizedRoutePage];
      if (type) {
        navigate(unifiedResourceCenterPath(platformRole, type), { replace: true });
        return;
      }
    }
    if (!layoutIsAdmin && normalizedRoutePage === 'skill-market') {
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
    if (!layoutIsAdmin && normalizedRoutePage && USER_LEGACY_MARKET_PAGE_TO_TAB[normalizedRoutePage]) {
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
    if (!layoutIsAdmin && normalizedRoutePage === 'resource-market') {
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
    if (layoutIsAdmin && normalizedRoutePage === 'resource-catalog') {
      const t = queryType ?? 'agent';
      const next = `${buildPath('user', 'resource-audit')}?type=${t}`;
      if (`${location.pathname}${location.search}` !== next) {
        navigate(next, { replace: true });
      }
      return;
    }
    if (normalizedRoutePage === 'resource-center' && !queryType) {
      navigate(`${buildPath('user', 'resource-center')}?type=agent`, { replace: true });
      return;
    }
    if (layoutIsAdmin && normalizedRoutePage === 'token-management') {
      navigate(buildPath('user', 'api-key-management'), { replace: true });
      return;
    }
    if (layoutIsAdmin && (normalizedRoutePage === 'resource-grant-management' || normalizedRoutePage === 'grant-applications')) {
      navigate(buildPath('user', 'user-list'), { replace: true });
      return;
    }
    if (!layoutIsAdmin && normalizedRoutePage === 'my-grant-applications') {
      navigate(buildPath('user', 'hub'), { replace: true });
      return;
    }
    if (normalizedRoutePage === 'authorized-skills') {
      navigate(buildPath('user', 'skills-center'), { replace: true });
      return;
    }
    if (layoutIsAdmin && normalizedRoutePage) {
      if (ADMIN_LEGACY_RESOURCE_LIST_PAGES.has(normalizedRoutePage)) {
        const t = LEGACY_PAGE_TO_TYPE[normalizedRoutePage];
        const next = `${buildPath('user', 'resource-audit')}?type=${t}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
        return;
      }
      const auditDef = ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE[normalizedRoutePage];
      if (auditDef) {
        const t = queryType ?? auditDef;
        const next = `${buildPath('user', 'resource-audit')}?type=${t}`;
        if (`${location.pathname}${location.search}` !== next) {
          navigate(next, { replace: true });
        }
      }
    }
    if (
      !layoutIsAdmin &&
      normalizedRoutePage &&
      DEVELOPER_PORTAL_PAGES.has(normalizedRoutePage) &&
      !hasPermission('developer:portal')
    ) {
      navigate(defaultPath(), { replace: true });
      return;
    }
    if (
      !layoutIsAdmin &&
      normalizedRoutePage === 'developer-applications' &&
      !hasPermission('developer-application:review')
    ) {
      navigate(defaultPath(), { replace: true });
      showMessage('当前账号无入驻审批权限', 'info');
      return;
    }
    if (!routeValid) {
      navigate(defaultPath(), { replace: true });
      return;
    }
    if (layoutIsAdmin && !canAccessAdminView(platformRole)) {
      navigate(defaultPath(), { replace: true });
    }
    if (
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
  }, [routeValid, routePage, normalizedRoutePage, routeId, queryType, consoleRole, platformRole, navigate, layoutIsAdmin, page, canAccessUserPublishingShell, showMessage, hasPermission, location.pathname, location.search]);

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
        if (canAccessAdminView(platformRole) && item.id === 'workspace') return false;
        if (item.id === 'developer-portal') return hasPermission('developer:portal');
        return true;
      }),
    [hasPermission, platformRole],
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
          hasPermission('developer-application:review')
        );
      }
      const requiredPerm = adminPermMap[item.id];
      return !requiredPerm || hasPermission(requiredPerm);
    });
  }, [platformRole, hasPermission]);

  /** 左轨 / 与顶栏搜索解耦后的「侧栏专用」行：不含五类资源广场（广场仅顶栏展示） */
  const userSidebarItemsForLeftChrome = useMemo(
    () => userSidebarItems.filter((item) => !USER_TOP_NAV_NO_RAIL_SIDEBAR_ID_SET.has(item.id)),
    [userSidebarItems],
  );

  const fullSidebarRows: ConsoleSidebarRow[] = useMemo(() => {
    const rows: ConsoleSidebarRow[] = [
      { kind: 'section', label: '使用端' },
      ...userSidebarItemsForLeftChrome.map((item) => ({ kind: 'item' as const, ...item, domain: 'user' as const })),
    ];
    if (adminSidebarItems.length > 0) {
      rows.push({ kind: 'section', label: '管理端' });
      rows.push(
        ...adminSidebarItems.map((item) => ({ kind: 'item' as const, ...item, domain: 'admin' as const })),
      );
    }
    return rows;
  }, [userSidebarItemsForLeftChrome, adminSidebarItems]);

  /** 菜单搜索（⌘/Ctrl+K）全量可达入口，含五类广场，便于跳转 */
  const sidebarSearchRows: ConsoleSidebarRow[] = useMemo(() => {
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
   * 顶栏横向：探索发现 + 五类广场；管理一级仍由 filter 按 omitAdminPrimary 隐藏。
   * 数据源与 `fullSidebarRows` 独立，避免左轨重复列出广场项。
   */
  const topNavSidebarRows = useMemo(() => {
    const userTopNavItems = USER_TOP_NAV_SIDEBAR_IDS.map((id) => userSidebarItems.find((i) => i.id === id)).filter(
      (item): item is (typeof userSidebarItems)[number] => Boolean(item),
    );
    const synthetic: ConsoleSidebarRow[] = [
      { kind: 'section', label: '使用端' },
      ...userTopNavItems.map((item) => ({ kind: 'item' as const, ...item, domain: 'user' as const })),
    ];
    if (adminSidebarItems.length > 0) {
      synthetic.push({ kind: 'section', label: '管理端' });
      synthetic.push(
        ...adminSidebarItems.map((item) => ({ kind: 'item' as const, ...item, domain: 'admin' as const })),
      );
    }
    return filterSidebarRowsForSlimTopNav(synthetic, { omitAdminPrimary: true });
  }, [userSidebarItems, adminSidebarItems]);

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

  /** 使用端左轨区块（与 Hub 内嵌轨、管理壳固定轨同源 `filteredSubGroupsForSidebarId`） */
  const railSectionsUser: HubPersonalRailSection[] = useMemo(() => {
    const out: HubPersonalRailSection[] = [];
    for (const parentId of HUB_PERSONAL_RAIL_PARENT_IDS) {
      if (canAccessAdminView(platformRole) && parentId === 'workspace') {
        const groups = filteredSubGroupsForSidebarId('admin-workspace', 'admin');
        out.push(...buildHubPersonalNavModel('admin-workspace', 'admin', groups));
        continue;
      }
      const groups = filteredSubGroupsForSidebarId(parentId, 'user');
      out.push(...buildHubPersonalNavModel(parentId, 'user', groups));
    }
    return out;
  }, [filteredSubGroupsForSidebarId, platformRole]);

  /** 管理端左轨区块（权限与 adminSidebarItems 一致） */
  const railSectionsAdmin: HubPersonalRailSection[] = useMemo(() => {
    if (adminSidebarItems.length === 0) return [];
    const out: HubPersonalRailSection[] = [];
    for (const item of adminSidebarItems) {
      /**
       * `railSectionsUser` 已在 HUB_PERSONAL_RAIL 的「工作台」槽位注入 `admin-workspace` 子树；
       * 此处再合并会导致 Hub / 移动抽屉左轨中「个人工作台」子项重复渲染。
       */
      if (item.id === 'admin-workspace') continue;
      const groups = filteredSubGroupsForSidebarId(item.id, 'admin');
      out.push(...buildHubPersonalNavModel(item.id, 'admin', groups));
    }
    return out;
  }, [adminSidebarItems, filteredSubGroupsForSidebarId]);

  /** 全壳统一左轨数据：移动抽屉、探索 Hub、与用户/管理桌面同一套内容区左轨均由此派生 */
  const unifiedRailSections: HubPersonalRailSection[] = useMemo(
    () => [...railSectionsUser, ...railSectionsAdmin],
    [railSectionsUser, railSectionsAdmin],
  );

  /**
   * 独立左轨开关与 URL 同步；hub 由内嵌轨提供故关闭 standalone。
   * 顶栏五类「广场/中心」仅主内容不叠左轨。应用壳与管理壳共用逻辑。
   */
  useEffect(() => {
    if (unifiedRailSections.length === 0) {
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
  }, [unifiedRailSections.length, page, activeSidebar]);

  const handleTopNavSidebarClick = (id: string, domain: ConsoleRole) => {
    setMobileNavOpen(false);
    if (domain === 'user' && USER_TOP_NAV_SIDEBAR_ID_SET.has(id)) {
      setTopNavPreferExploreHub(id === 'hub');
    }
    navigate(buildPath(domain, getDefaultPage(domain, id)));
  };

  const navigateSubItem = useCallback(
    (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => {
      setMobileNavOpen(false);
      const isAdminNav = domain === 'admin';
      const pageName = subItemToPage(parentSidebarId, subItemId, isAdminNav);
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

  const handleTopNavSubItemClick = useCallback(
    (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => {
      setMobileNavOpen(false);
      if (domain === 'user' && USER_TOP_NAV_SIDEBAR_ID_SET.has(parentSidebarId)) {
        setTopNavPreferExploreHub(parentSidebarId === 'hub');
      }
      navigateSubItem(subItemId, parentSidebarId, domain);
    },
    [navigateSubItem],
  );

  const handleRailSubItemClick = useCallback(
    (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => {
      setMobileNavOpen(false);
      setTopNavPreferExploreHub(true);
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
    (targetPage: string, id?: string | number) => {
      if (targetPage === 'resource-center') {
        const type = typeof id === 'string' ? parseResourceType(id) : undefined;
        navigate(unifiedResourceCenterPath(platformRole, type));
        return;
      }
      if (targetPage === 'resource-catalog') {
        const type = typeof id === 'string' ? parseResourceType(id) : undefined;
        if (canAccessAdminView(platformRole)) {
          navigate(`${buildPath('user', 'resource-audit')}?type=${type ?? 'agent'}`);
        } else {
          navigate(unifiedResourceCenterPath(platformRole, type));
        }
        return;
      }
      const path = buildPath(consoleRole, targetPage, id);
      navigate(path);
    },
    [navigate, consoleRole, platformRole],
  );

  const contentKey = useMemo(() => {
    if (page === 'resource-center') return `${page}?type=${queryType ?? 'agent'}`;
    if (page === 'resource-catalog') return `${page}?type=${resourceTypeQuery ?? 'agent'}`;
    if (page === 'resource-audit') return `${page}?type=${resourceTypeQuery ?? 'all'}`;
    if (page === 'resource-market') return `resource-market?tab=${marketTabQuery ?? 'agent'}`;
    if (page === 'my-api-keys') {
      const tab = new URLSearchParams(location.search).get('tab');
      return tab ? `my-api-keys?tab=${tab}` : 'my-api-keys';
    }
    if (page === 'developer-docs') {
      const tab = new URLSearchParams(location.search).get('tab');
      return tab ? `developer-docs?tab=${tab}` : 'developer-docs';
    }
    if (page === 'developer-tools') {
      const tab = new URLSearchParams(location.search).get('tab');
      return tab ? `developer-tools?tab=${tab}` : 'developer-tools';
    }
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
    const parentItem = [...USER_SIDEBAR_ITEMS, ...ADMIN_SIDEBAR_ITEMS].find((i) => i.id === activeSidebar);
    if (!parentItem) return layoutIsAdmin ? '管理后台' : '工作台';
    if (navChildrenForActiveSidebar.length === 0) return parentItem.label;
    const activeChild = navChildrenForActiveSidebar.find((c) => c.id === activeSubItem);
    if (!activeChild) return parentItem.label;
    return activeChild.label;
  }, [activeSidebar, activeSubItem, navChildrenForActiveSidebar, layoutIsAdmin]);

  /** 用户壳与管理壳共用：与探索页 Hub 内嵌、桌面内容区左轨同源 */
  const shellPersonalRail = useMemo((): ExploreHubRailConfig | undefined => {
    if (unifiedRailSections.length === 0) return undefined;
    return {
      sections: unifiedRailSections,
      displayName: displayUserName,
      roleLabel: PLATFORM_ROLE_LABELS[platformRole],
      avatarSeed: `${authUser?.id ?? 'user'}-${displayUserName}`,
      activeSidebar,
      activeSubItem,
      routeRole: consoleRole,
      onSubItemClick: handleRailSubItemClick,
    };
  }, [
    unifiedRailSections,
    displayUserName,
    authUser?.id,
    platformRole,
    activeSidebar,
    activeSubItem,
    consoleRole,
    handleRailSubItemClick,
  ]);

  const exploreHubRailForContent = page === 'hub' && shellPersonalRail ? shellPersonalRail : undefined;
  /** 探索页桌面端：左轨固定在滚动区外，仅右侧主画布滚动 */
  const hubDesktopShellRail = Boolean(exploreHubRailForContent);

  const showStandalonePersonalRail =
    personalRailOpen && Boolean(shellPersonalRail) && page !== 'hub';

  /** 与滚回顶部的 useEffect 一致：双栏时滚右侧列，否则滚主列 */
  const activeMainContentScrollRef =
    showStandalonePersonalRail && shellPersonalRail ? routeContentScrollRef : mainScrollRef;
  const scrollAffixRouteKey = `${location.pathname}${location.search}`;

  return (
    <LayoutChromeProvider value={{ hasSecondarySidebar, chromePageTitle: headerTitle }}>
      <div
        data-theme={theme === 'dark' ? 'dark' : 'light'}
        className={`h-screen flex min-h-0 flex-col overflow-hidden selection:bg-neutral-200 selection:text-neutral-900 ${
          FONT_FAMILY_CLASSES[fontFamily]
        } ${isDark ? 'bg-lantu-canvas' : 'bg-lantu-chrome'}`}
      >
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {realtimeLiveText}
        </span>
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
          userTopNavPrimaryHighlightId={userTopNavPrimaryHighlightId}
          sidebarRows={topNavSidebarRows}
          sidebarSearchRows={sidebarSearchRows}
          platformRole={platformRole}
          onSidebarClick={handleTopNavSidebarClick}
          onSubItemClick={handleTopNavSubItemClick}
          filteredSubGroupsForSidebarId={filteredSubGroupsForSidebarId}
          onLogoClick={() => {
            navigate(defaultPath());
            setTopNavPreferExploreHub(true);
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
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate(buildPath('user', 'profile'));
                          if (layoutIsAdmin) setRole('user');
                          setMobileNavOpen(false);
                        }}
                        className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-inset ${
                          isDark ? 'text-slate-200 hover:bg-white/[0.08]' : 'text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <User size={15} className="shrink-0 opacity-90" aria-hidden />
                        个人资料
                      </button>
                      <div className={`mx-2 my-1 h-px ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200/80'}`} aria-hidden />
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
                    aria-label={`账户菜单：${displayUserName}；含个人资料、退出登录`}
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

        {/* 勿在此加 horizontal padding：会与 fixed 全宽顶栏错位，并在画布两侧露出 body/壳层背景 */}
        <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${consoleShellBelowHeaderPt}`}>
        <aside
          className={`${chromeGpuLayerClass} fixed inset-y-0 left-0 z-50 flex h-full w-[240px] shrink-0 flex-col overflow-hidden px-0 py-2 transition-transform duration-200 ease-out motion-reduce:transition-none lg:hidden ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isDark ? 'bg-lantu-canvas' : 'bg-gray-100'}`}
        >
          <div className="shrink-0 px-4 pt-2">
            <button
              type="button"
              onClick={() => {
                navigate(defaultPath());
                setTopNavPreferExploreHub(true);
                setMobileNavOpen(false);
              }}
              className={`logo-nav-btn w-full rounded-lg border-0 bg-transparent p-0 text-left outline-none ring-0 shadow-none transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
                isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-200/50'
              }`}
              aria-label="回到首页"
            >
              <Logo followSystemColorScheme={false} theme={theme} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <HubPersonalRail
              theme={theme}
              sections={unifiedRailSections}
              displayName={displayUserName}
              roleLabel={PLATFORM_ROLE_LABELS[platformRole]}
              avatarSeed={`${authUser?.id ?? 'user'}-${displayUserName}`}
              activeSidebar={activeSidebar}
              activeSubItem={activeSubItem}
              routeRole={consoleRole}
              onSubItemClick={handleRailSubItemClick}
              suppressGlobalMenuSearchHotkey={mobileNavOpen}
              ariaLabel="控制台导航"
            />
          </div>
        </aside>

        <main
          className={`${chromeGpuLayerClass} relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden bg-lantu-canvas`}
        >
          {showStandalonePersonalRail && shellPersonalRail ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div
                className={`flex min-h-0 min-w-0 w-full flex-1 flex-col ${contentPaddingX}`}
              >
                {/* 与 hub 壳层一致：左轨固定 w-52/w-56，避免 12 栅格 col-span-2 随主区域变宽 */}
                <div className="flex min-h-0 flex-1 flex-col gap-8 lg:flex-row lg:gap-10">
                  <div
                    className={`order-2 flex min-h-0 flex-col max-h-[min(70vh,32rem)] lg:order-1 lg:w-52 lg:max-h-[calc(100dvh-5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] lg:shrink-0 lg:overflow-y-auto lg:overscroll-y-contain custom-scrollbar xl:w-56 lg:pr-6 ${consoleContentTopPad} ${chromeGpuLayerClass}`}
                  >
                    <HubPersonalRail
                      theme={theme}
                      sections={shellPersonalRail.sections}
                      displayName={shellPersonalRail.displayName}
                      roleLabel={shellPersonalRail.roleLabel}
                      avatarSeed={shellPersonalRail.avatarSeed}
                      activeSidebar={shellPersonalRail.activeSidebar}
                      activeSubItem={shellPersonalRail.activeSubItem}
                      routeRole={shellPersonalRail.routeRole}
                      onSubItemClick={shellPersonalRail.onSubItemClick}
                      suppressGlobalMenuSearchHotkey={mobileNavOpen}
                    />
                  </div>
                  <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col lg:order-2">
                    <div
                      ref={routeContentScrollRef}
                      data-lantu-main-scroll
                      className={`flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain custom-scrollbar ${mainScrollCompositorClass} ${consoleScrollSafeBottomPad}`}
                    >
                      <div className="w-full min-w-0">
                        <AnimatePresence mode="wait">
                          <RouteContentMotion key={contentKey} animationVariants={animationVariants}>
                            <div className={`w-full min-w-0 ${consoleContentTopPad}`}>
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
                                exploreHubShellRail={false}
                                mobileNavOpen={mobileNavOpen}
                              />
                            </div>
                          </RouteContentMotion>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : hubDesktopShellRail ? (
            <div
              className={`flex min-h-0 min-w-0 flex-1 flex-col gap-8 lg:flex-row lg:gap-10 ${contentPaddingX}`}
            >
              <aside
                className={`hidden min-h-0 shrink-0 flex-col lg:flex lg:w-52 lg:max-h-none xl:w-56 ${consoleContentTopPad} ${chromeGpuLayerClass} pr-6`}
              >
                <div
                  className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain custom-scrollbar lantu-hub-sticky-rail-scroll ${mainScrollCompositorClass}`}
                >
                  <HubPersonalRail
                    theme={theme}
                    sections={exploreHubRailForContent!.sections}
                    displayName={exploreHubRailForContent!.displayName}
                    roleLabel={exploreHubRailForContent!.roleLabel}
                    avatarSeed={exploreHubRailForContent!.avatarSeed}
                    activeSidebar={exploreHubRailForContent!.activeSidebar}
                    activeSubItem={exploreHubRailForContent!.activeSubItem}
                    routeRole={exploreHubRailForContent!.routeRole}
                    onSubItemClick={exploreHubRailForContent!.onSubItemClick}
                    suppressGlobalMenuSearchHotkey={mobileNavOpen}
                    outerScrollOnly
                    ariaLabel="探索首页导航"
                  />
                </div>
              </aside>
              <div
                ref={mainScrollRef}
                data-lantu-main-scroll
                className={`min-h-0 min-w-0 flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${consoleScrollSafeBottomPad} lantu-hub-main-scroll`}
              >
                <div className="w-full min-w-0">
                  <AnimatePresence mode="wait">
                    <RouteContentMotion key={contentKey} animationVariants={animationVariants}>
                      <div className={`w-full min-w-0 ${consoleContentTopPad}`}>
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
                          exploreHubShellRail
                          mobileNavOpen={mobileNavOpen}
                        />
                      </div>
                    </RouteContentMotion>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={mainScrollRef}
              data-lantu-main-scroll
              className={`min-h-0 min-w-0 flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${consoleScrollSafeBottomPad}${
                page === 'hub' ? ' lantu-hub-main-scroll' : ''
              }`}
            >
              <div className="w-full min-w-0">
                <AnimatePresence mode="wait">
                  <RouteContentMotion key={contentKey} animationVariants={animationVariants}>
                    <div className={`w-full min-w-0 ${contentPaddingX} ${consoleContentTopPad}`}>
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
                        exploreHubShellRail={false}
                        mobileNavOpen={mobileNavOpen}
                      />
                    </div>
                  </RouteContentMotion>
                </AnimatePresence>
              </div>
            </div>
          )}
        </main>
        </div>

        <ScrollToTopAffix
          theme={theme}
          containerRef={activeMainContentScrollRef}
          routeResetKey={scrollAffixRouteKey}
        />
      </div>
    </LayoutChromeProvider>
  );
};
