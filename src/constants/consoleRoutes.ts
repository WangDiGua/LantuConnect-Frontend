import type { ResourceType } from '../types/dto/catalog';
import type { PlatformRoleCode } from '../types/dto/auth';
import { canAccessAdminView } from '../context/UserRoleContext';
import { parseResourceType } from './resourceTypes';
import { USER_WORKBENCH_SATELLITE_PAGES } from './navigation';

export type ConsoleRole = 'admin' | 'user';

/** 控制台 Hash 路径统一前缀：`#/c/:page`（不再使用 `/user` `/admin` 双轨） */
export const CONSOLE_PATH_PREFIX = 'c';

export type ParsedConsoleRoute = { page: string; id?: string };

/** 用户端旧版资源市场 slug → `resource-market?tab=`；`skill-market` / `mcp-market` 在 MainLayout 中直达独立页 */
export const USER_LEGACY_MARKET_PAGE_TO_TAB: Record<string, ResourceType> = {
  'agent-market': 'agent',
  'mcp-market': 'mcp',
  'app-market': 'app',
  'dataset-market': 'dataset',
};

export const USER_LEGACY_MARKET_PAGES = new Set(Object.keys(USER_LEGACY_MARKET_PAGE_TO_TAB));

/** 管理端旧版「五入口」列表页，重定向至 resource-audit?type=（全站资源在审核中心） */
export const ADMIN_LEGACY_RESOURCE_LIST_PAGES = new Set([
  'agent-list',
  'skill-list',
  'mcp-server-list',
  'app-list',
  'dataset-list',
]);

/** 管理端旧版审核子路由 → 默认筛选类型 */
export const ADMIN_LEGACY_AUDIT_PAGE_DEFAULT_TYPE: Partial<Record<string, ResourceType>> = {
  'agent-audit': 'agent',
  'skill-audit': 'skill',
  'mcp-audit': 'mcp',
  'app-audit': 'app',
  'dataset-audit': 'dataset',
};

const ADMIN_RESOURCE_AUDIT_PAGES = new Set([
  'resource-audit',
  'agent-audit',
  'skill-audit',
  'mcp-audit',
  'app-audit',
  'dataset-audit',
]);

/**
 * 构造控制台路径。`role` 参数保留以兼容调用方，**不参与 URL**；壳层由 {@link inferConsoleRole} 决定。
 */
export function buildPath(_role: ConsoleRole, page: string, id?: string | number): string {
  const base = `/${CONSOLE_PATH_PREFIX}/${page}`;
  return id !== undefined ? `${base}/${id}` : base;
}

/** 用户统一资源市场 URL（`/c/resource-market?tab=`，可选 deep link `resourceId`） */
export function buildUserResourceMarketUrl(
  tabInput: string | null | undefined,
  extra?: { resourceId?: string | number | null },
): string {
  const tab = parseResourceType(tabInput) ?? 'agent';
  if (tab === 'skill') {
    if (extra?.resourceId != null && String(extra.resourceId).length > 0) {
      return buildPath('user', 'skills-center', extra.resourceId);
    }
    return buildPath('user', 'skills-center');
  }
  if (tab === 'mcp') {
    if (extra?.resourceId != null && String(extra.resourceId).length > 0) {
      return buildPath('user', 'mcp-center', extra.resourceId);
    }
    return buildPath('user', 'mcp-center');
  }
  if (tab === 'dataset') {
    if (extra?.resourceId != null && String(extra.resourceId).length > 0) {
      return buildPath('user', 'dataset-center', extra.resourceId);
    }
    return buildPath('user', 'dataset-center');
  }
  if (tab === 'agent') {
    if (extra?.resourceId != null && String(extra.resourceId).length > 0) {
      return buildPath('user', 'agents-center', extra.resourceId);
    }
    return buildPath('user', 'agents-center');
  }
  if (tab === 'app') {
    if (extra?.resourceId != null && String(extra.resourceId).length > 0) {
      return buildPath('user', 'apps-center', extra.resourceId);
    }
    return buildPath('user', 'apps-center');
  }
  const params = new URLSearchParams({ tab });
  if (extra?.resourceId != null && String(extra.resourceId).length > 0) {
    params.set('resourceId', String(extra.resourceId));
  }
  return `${buildPath('user', 'resource-market')}?${params.toString()}`;
}

/**
 * 登录后与无有效恢复路径时的默认落地：探索 Hub。
 */
export function defaultPath(_role?: ConsoleRole): string {
  return `/${CONSOLE_PATH_PREFIX}/hub`;
}

/** 管理概览页，供侧栏/书签直达 */
export function adminOverviewPath(): string {
  return `/${CONSOLE_PATH_PREFIX}/dashboard`;
}

const USER_SIDEBAR_PAGES: Record<string, string[]> = {
  'hub': ['hub'],
  'workspace': [
    'workspace',
    'profile',
    'my-api-keys',
    'preferences',
    'developer-onboarding',
    'my-favorites',
    'my-agents-pub',
    'resource-market',
    'skill-market',
    'my-publish-agent',
    'my-publish-skill',
    'my-publish-mcp',
    'my-publish-app',
    'my-publish-dataset',
    'resource-center',
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
    'usage-records',
    'usage-stats',
    'developer-applications',
  ],
  'skills-center': ['skills-center'],
  'mcp-center': ['mcp-center', 'mcp-market'],
  'dataset-center': ['dataset-center', 'dataset-market'],
  'agents-center': ['agents-center', 'agent-market'],
  'apps-center': ['apps-center', 'app-market'],
  'developer-portal': [
    'api-docs',
    'sdk-download',
    'api-playground',
    'mcp-integration',
    'developer-statistics',
  ],
};

/**
 * 管理端个人工作台路由白名单（与 workspace 对齐，并含登记详情 agent-detail）。
 * 书签 `resource-catalog` 不在此列，壳层会 replace 到 resource-audit。
 */
export const ADMIN_WORKSPACE_PAGES = new Set<string>([...USER_SIDEBAR_PAGES.workspace, 'agent-detail']);

const ADMIN_SIDEBAR_PAGES: Record<string, string[]> = {
  'overview': ['dashboard', 'health-check', 'usage-statistics', 'data-reports'],
  /** 须先于 admin-workspace：与工作台共用的 slug（如 developer-applications）优先归入治理菜单 */
  'user-management': ['user-list', 'role-management', 'organization', 'api-key-management', 'developer-applications'],
  'admin-resource-ops': [
    'resource-audit',
    'agent-audit',
    'skill-audit',
    'mcp-audit',
    'app-audit',
    'dataset-audit',
    'agent-monitoring',
    'agent-trace',
    'provider-list',
    'provider-create',
  ],
  'admin-workspace': [...USER_SIDEBAR_PAGES.workspace, 'agent-detail'],
  'monitoring': ['monitoring-overview', 'call-logs', 'performance-analysis', 'alert-management', 'alert-rules', 'health-config', 'circuit-breaker'],
  'system-config': [
    'tag-management',
    'system-params',
    'security-settings',
    'network-config',
    'rate-limit-policy',
    'access-control',
    'audit-log',
    'sensitive-words',
    'announcements',
  ],
};

function flatPageSet(map: Record<string, string[]>): Set<string> {
  const s = new Set<string>();
  for (const pages of Object.values(map)) {
    for (const p of pages) s.add(p);
  }
  return s;
}

const ADMIN_PAGE_SET = flatPageSet(ADMIN_SIDEBAR_PAGES);
const USER_PAGE_SET = flatPageSet(USER_SIDEBAR_PAGES);

/**
 * 根据当前 `page` slug 推断使用「管理壳」还是「工作台壳」。
 * 仅出现在一侧映射中的页面直接定界；两侧皆有时：可进管理端的账号默认走管理壳（与旧 `/admin/*` 行为一致）。
 */
export function inferConsoleRole(page: string, platformRole?: PlatformRoleCode | null): ConsoleRole {
  const pr = platformRole ?? 'user';
  /** 旧书签；可进管理端者走管理壳并 replace 到 resource-audit */
  if (page === 'resource-catalog' && canAccessAdminView(pr)) return 'admin';
  const a = ADMIN_PAGE_SET.has(page);
  const u = USER_PAGE_SET.has(page);
  if (a && !u) return 'admin';
  if (!a && u) return 'user';
  if (a && u) {
    return canAccessAdminView(pr) ? 'admin' : 'user';
  }
  return 'user';
}

export function parseRoute(pathname: string): ParsedConsoleRoute | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== CONSOLE_PATH_PREFIX) return null;
  return parts.length >= 3 ? { page: parts[1], id: parts[2] } : { page: parts[1] };
}

export function findSidebarForPage(role: ConsoleRole, page: string): string | null {
  if (role === 'admin' && page === 'resource-catalog') {
    return 'admin-resource-ops';
  }
  if (role === 'user' && page === 'resource-center') {
    return 'workspace';
  }
  if (role === 'admin' && page === 'resource-center') {
    return 'admin-workspace';
  }
  const map = role === 'admin' ? ADMIN_SIDEBAR_PAGES : USER_SIDEBAR_PAGES;
  for (const [sidebarId, pages] of Object.entries(map)) {
    if (pages.includes(page)) return sidebarId;
  }
  return null;
}

export function getDefaultPage(role: ConsoleRole, sidebarId: string): string {
  const map = role === 'admin' ? ADMIN_SIDEBAR_PAGES : USER_SIDEBAR_PAGES;
  return map[sidebarId]?.[0] ?? (role === 'admin' ? 'dashboard' : 'hub');
}

/** Navigation group sub-item ID → URL page name（管理端子项 id 与 page slug 一致时可直出） */
export function subItemToPage(sidebarId: string, subItemId: string, isAdmin: boolean): string {
  /** 旧书签：子项 id 曾为 overview */
  if (isAdmin && sidebarId === 'overview' && subItemId === 'overview') return 'dashboard';
  if (isAdmin && sidebarId === 'admin-workspace' && subItemId === 'overview') return 'workspace';
  if (!isAdmin && sidebarId === 'workspace' && subItemId === 'overview') return 'workspace';
  if (!isAdmin && sidebarId === 'skills-center' && subItemId === 'skills-center') return 'skills-center';
  if (!isAdmin && sidebarId === 'mcp-center' && subItemId === 'mcp-center') return 'mcp-center';
  if (!isAdmin && sidebarId === 'dataset-center' && subItemId === 'dataset-center') return 'dataset-center';
  if (!isAdmin && sidebarId === 'agents-center' && subItemId === 'agents-center') return 'agents-center';
  if (!isAdmin && sidebarId === 'apps-center' && subItemId === 'apps-center') return 'apps-center';
  return subItemId;
}

/** URL page name → navigation group sub-item ID */
export function pageToSubItem(page: string, sidebarId: string | null, isAdmin: boolean): string {
  if (isAdmin && sidebarId === 'overview' && ['dashboard', 'health-check', 'usage-statistics', 'data-reports'].includes(page)) {
    return page;
  }
  if (isAdmin && page === 'workspace' && sidebarId === 'admin-workspace') return 'overview';
  if (isAdmin && sidebarId === 'admin-workspace' && USER_WORKBENCH_SATELLITE_PAGES.has(page)) {
    return page;
  }
  if (isAdmin && sidebarId === 'admin-workspace' && ADMIN_WORKSPACE_PAGES.has(page)) {
    return page;
  }
  if (!isAdmin && page === 'workspace' && sidebarId === 'workspace') return 'overview';
  if (!isAdmin && sidebarId === 'workspace' && USER_WORKBENCH_SATELLITE_PAGES.has(page)) {
    return page;
  }
  if (isAdmin && sidebarId === 'admin-resource-ops' && ADMIN_RESOURCE_AUDIT_PAGES.has(page)) {
    return 'resource-audit';
  }
  if (isAdmin && sidebarId === 'admin-resource-ops' && (page === 'agent-monitoring' || page === 'agent-trace')) {
    return page;
  }
  if (
    !isAdmin &&
    sidebarId === 'skills-center' &&
    (page === 'skills-center' || page === 'resource-market')
  ) {
    return 'skills-center';
  }
  if (!isAdmin && sidebarId === 'mcp-center' && (page === 'mcp-center' || page === 'resource-market')) {
    return 'mcp-center';
  }
  if (!isAdmin && sidebarId === 'dataset-center' && (page === 'dataset-center' || page === 'resource-market')) {
    return 'dataset-center';
  }
  if (
    !isAdmin &&
    sidebarId === 'agents-center' &&
    (page === 'agents-center' || page === 'agent-market' || page === 'resource-market')
  ) {
    return 'agents-center';
  }
  if (
    !isAdmin &&
    sidebarId === 'apps-center' &&
    (page === 'apps-center' || page === 'app-market' || page === 'resource-market')
  ) {
    return 'apps-center';
  }
  if (!isAdmin && sidebarId === 'workspace' && (page === 'resource-market' || page === 'skill-market' || USER_LEGACY_MARKET_PAGES.has(page))) {
    return 'overview';
  }
  if (isAdmin && sidebarId === 'monitoring' && ADMIN_SIDEBAR_PAGES.monitoring.includes(page)) {
    return page;
  }
  if (isAdmin && sidebarId === 'system-config' && ADMIN_SIDEBAR_PAGES['system-config'].includes(page)) {
    return page;
  }
  if (isAdmin && sidebarId === 'user-management' && ADMIN_SIDEBAR_PAGES['user-management'].includes(page)) {
    return page;
  }
  if (isAdmin && sidebarId === 'admin-resource-ops' && page === 'provider-create') {
    return 'provider-list';
  }
  /** 个人资料 / 偏好设置已从侧栏移除；仍高亮「工作台总览」以免无匹配子项 */
  if (!isAdmin && sidebarId === 'workspace' && (page === 'profile' || page === 'preferences')) {
    return 'overview';
  }
  return page;
}
