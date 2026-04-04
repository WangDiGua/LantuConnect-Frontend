import type { ResourceType } from '../types/dto/catalog';
import { parseResourceType } from './resourceTypes';

export type ConsoleRole = 'admin' | 'user';

/** 用户端旧版「五市场」路由 slug → 统一资源市场 `?tab=`（见 `resource-market`） */
export const USER_LEGACY_MARKET_PAGE_TO_TAB: Record<string, ResourceType> = {
  'agent-market': 'agent',
  'skill-market': 'skill',
  'mcp-market': 'mcp',
  'app-market': 'app',
  'dataset-market': 'dataset',
};

export const USER_LEGACY_MARKET_PAGES = new Set(Object.keys(USER_LEGACY_MARKET_PAGE_TO_TAB));

/** 管理端旧版「五入口」列表页，重定向至 resource-catalog?type= */
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

const ADMIN_RESOURCE_CATALOG_PAGES = new Set([
  'resource-catalog',
  'agent-list',
  'skill-list',
  'mcp-server-list',
  'app-list',
  'dataset-list',
  'agent-register',
  'skill-register',
  'mcp-register',
  'app-register',
  'dataset-register',
  'agent-detail',
]);

const ADMIN_RESOURCE_AUDIT_PAGES = new Set([
  'resource-audit',
  'agent-audit',
  'skill-audit',
  'mcp-audit',
  'app-audit',
  'dataset-audit',
]);

export function buildPath(role: ConsoleRole, page: string, id?: string | number): string {
  const base = `/${role}/${page}`;
  return id !== undefined ? `${base}/${id}` : base;
}

/** 用户统一资源市场 URL（`/user/resource-market?tab=`，可选 deep link `resourceId`） */
export function buildUserResourceMarketUrl(
  tabInput: string | null | undefined,
  extra?: { resourceId?: string | number | null },
): string {
  const tab = parseResourceType(tabInput) ?? 'agent';
  const params = new URLSearchParams({ tab });
  if (extra?.resourceId != null && String(extra.resourceId).length > 0) {
    params.set('resourceId', String(extra.resourceId));
  }
  return `${buildPath('user', 'resource-market')}?${params.toString()}`;
}

/**
 * 登录后与无有效恢复路径时的默认落地：**统一应用工作台**（与后端统一控制台/统一 RBAC 对齐）。
 * 平台治理类页面仍使用 `/admin/:page` 直达；`ConsoleRole` 仅表示 URL 分区，不表示两套产品身份。
 */
export function defaultPath(_role?: ConsoleRole): string {
  return '/user/hub';
}

/** 管理概览页（原「管理路由」首页），供侧栏/书签直达 */
export function adminOverviewPath(): string {
  return '/admin/dashboard';
}

export function parseRoute(pathname: string): { role: ConsoleRole; page: string; id?: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const role = parts[0] as ConsoleRole;
  if (role !== 'admin' && role !== 'user') return null;
  return { role, page: parts[1], id: parts[2] };
}

const ADMIN_SIDEBAR_PAGES: Record<string, string[]> = {
  'overview': ['dashboard', 'health-check', 'usage-statistics', 'data-reports'],
  'admin-resource-ops': [
    'resource-catalog',
    'skill-external-market',
    'agent-register', 'agent-monitoring', 'agent-trace', 'agent-detail',
    'skill-register', 'mcp-register', 'app-register', 'dataset-register',
    'agent-list', 'skill-list', 'mcp-server-list', 'app-list', 'dataset-list',
    'resource-audit',
    'agent-audit', 'skill-audit', 'mcp-audit', 'app-audit', 'dataset-audit',
    'provider-list', 'provider-create',
  ],
  'user-management': ['user-list', 'role-management', 'organization', 'api-key-management', 'resource-grant-management', 'grant-applications', 'developer-applications'],
  'monitoring': ['monitoring-overview', 'call-logs', 'performance-analysis', 'alert-management', 'alert-rules', 'health-config', 'circuit-breaker'],
  'system-config': ['tag-management', 'system-params', 'model-config', 'security-settings', 'quota-management', 'rate-limit-policy', 'access-control', 'audit-log', 'sensitive-words', 'announcements'],
};

const USER_SIDEBAR_PAGES: Record<string, string[]> = {
  'hub': ['hub'],
  'workspace': ['workspace', 'developer-onboarding', 'authorized-skills', 'my-favorites', 'quick-access'],
  'user-resource-assets': [
    'resource-market',
    'agent-market',
    'skill-market',
    'mcp-market',
    'app-market',
    'dataset-market',
    'my-agents-pub',
    'resource-center',
    'agent-list', 'agent-register',
    'skill-list', 'skill-register',
    'mcp-server-list', 'mcp-register',
    'app-list', 'app-register',
    'dataset-list', 'dataset-register',
    'usage-records', 'recent-use', 'usage-stats', 'grant-applications', 'my-grant-applications',
  ],
  'developer-portal': ['api-docs', 'sdk-download', 'api-playground', 'developer-statistics'],
  'user-settings': ['profile', 'preferences'],
};

export function findSidebarForPage(role: ConsoleRole, page: string): string | null {
  if (role === 'user' && page === 'resource-center') {
    return 'user-resource-assets';
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

/** Navigation group sub-item ID → URL page name (handles the two renamed pages) */
export function subItemToPage(sidebarId: string, subItemId: string, isAdmin: boolean): string {
  if (isAdmin && sidebarId === 'overview' && subItemId === 'overview') return 'dashboard';
  if (!isAdmin && sidebarId === 'workspace' && subItemId === 'overview') return 'workspace';
  return subItemId;
}

/** URL page name → navigation group sub-item ID */
export function pageToSubItem(page: string, sidebarId: string | null, isAdmin: boolean): string {
  if (isAdmin && page === 'dashboard' && sidebarId === 'overview') return 'overview';
  if (!isAdmin && page === 'workspace' && sidebarId === 'workspace') return 'overview';
  if (isAdmin && sidebarId === 'admin-resource-ops' && page === 'skill-external-market') {
    return 'skill-external-market';
  }
  if (isAdmin && sidebarId === 'admin-resource-ops' && ADMIN_RESOURCE_CATALOG_PAGES.has(page)) {
    return 'resource-catalog';
  }
  if (isAdmin && sidebarId === 'admin-resource-ops' && ADMIN_RESOURCE_AUDIT_PAGES.has(page)) {
    return 'resource-audit';
  }
  if (!isAdmin && sidebarId === 'user-resource-assets' && (page === 'resource-market' || USER_LEGACY_MARKET_PAGES.has(page))) {
    return 'resource-market';
  }
  return page;
}
