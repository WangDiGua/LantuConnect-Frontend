import type { ResourceType } from '../types/dto/catalog';
import { parseResourceType } from './resourceTypes';

export type ConsoleRole = 'admin' | 'user';

/** 用户端旧版资源市场 slug → `resource-market?tab=`；`skill-market` / `mcp-market` 在 MainLayout 中直达独立页 */
export const USER_LEGACY_MARKET_PAGE_TO_TAB: Record<string, ResourceType> = {
  'agent-market': 'agent',
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
    'agent-register', 'agent-monitoring', 'agent-trace', 'agent-detail',
    'skill-register', 'mcp-register', 'app-register', 'dataset-register',
    'agent-list', 'skill-list', 'mcp-server-list', 'app-list', 'dataset-list',
    'resource-audit',
    'agent-audit', 'skill-audit', 'mcp-audit', 'app-audit', 'dataset-audit',
    'provider-list', 'provider-create',
  ],
  'user-management': ['user-list', 'role-management', 'organization', 'api-key-management', 'token-management', 'resource-grant-management', 'grant-applications', 'developer-applications'],
  'monitoring': ['monitoring-overview', 'call-logs', 'performance-analysis', 'alert-management', 'alert-rules', 'health-config', 'circuit-breaker'],
  'system-config': [
    'tag-management',
    'system-params',
    'skill-external-catalog-settings',
    'security-settings',
    'network-config',
    'quota-management',
    'rate-limit-policy',
    'access-control',
    'audit-log',
    'sensitive-words',
    'announcements',
  ],
};

const USER_SIDEBAR_PAGES: Record<string, string[]> = {
  'hub': ['hub'],
  'workspace': [
    'workspace',
    'developer-onboarding',
    'authorized-skills',
    'my-favorites',
    'quick-access',
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
    'recent-use',
    'usage-stats',
    'grant-applications',
    'developer-applications',
    'my-grant-applications',
  ],
  'skills-center': ['skills-center', 'skill-external-market'],
  'mcp-center': ['mcp-center', 'mcp-market'],
  'dataset-center': ['dataset-center', 'dataset-market'],
  'agents-center': ['agents-center', 'agent-market'],
  'apps-center': ['apps-center', 'app-market'],
  'developer-portal': ['api-docs', 'sdk-download', 'api-playground', 'mcp-integration', 'developer-statistics'],
  'user-settings': ['profile', 'preferences'],
};

export function findSidebarForPage(role: ConsoleRole, page: string): string | null {
  if (role === 'user' && page === 'resource-center') {
    return 'workspace';
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
  if (isAdmin && sidebarId === 'admin-resource-ops' && subItemId === 'agent-diagnostics') return 'agent-monitoring';
  if (isAdmin && sidebarId === 'monitoring' && subItemId === 'monitoring-hub') return 'monitoring-overview';
  if (isAdmin && sidebarId === 'system-config' && subItemId === 'config-hub') return 'tag-management';
  if (isAdmin && sidebarId === 'user-management' && subItemId === 'user-hub') return 'user-list';
  if (!isAdmin && sidebarId === 'workspace' && subItemId === 'overview') return 'workspace';
  if (!isAdmin && sidebarId === 'skills-center' && subItemId === 'skill-external-market') return 'skill-external-market';
  if (!isAdmin && sidebarId === 'skills-center' && subItemId === 'skills-center') return 'skills-center';
  if (!isAdmin && sidebarId === 'mcp-center' && subItemId === 'mcp-center') return 'mcp-center';
  if (!isAdmin && sidebarId === 'dataset-center' && subItemId === 'dataset-center') return 'dataset-center';
  if (!isAdmin && sidebarId === 'agents-center' && subItemId === 'agents-center') return 'agents-center';
  if (!isAdmin && sidebarId === 'apps-center' && subItemId === 'apps-center') return 'apps-center';
  return subItemId;
}

/** URL page name → navigation group sub-item ID */
export function pageToSubItem(page: string, sidebarId: string | null, isAdmin: boolean): string {
  if (
    isAdmin &&
    sidebarId === 'overview' &&
    ['dashboard', 'health-check', 'usage-statistics', 'data-reports'].includes(page)
  ) {
    return 'overview';
  }
  if (!isAdmin && page === 'workspace' && sidebarId === 'workspace') return 'overview';
  if (isAdmin && sidebarId === 'system-config' && page === 'skill-external-catalog-settings') {
    return 'skill-external-catalog-settings';
  }
  if (isAdmin && sidebarId === 'admin-resource-ops' && ADMIN_RESOURCE_CATALOG_PAGES.has(page)) {
    return 'resource-catalog';
  }
  if (isAdmin && sidebarId === 'admin-resource-ops' && ADMIN_RESOURCE_AUDIT_PAGES.has(page)) {
    return 'resource-audit';
  }
  if (isAdmin && sidebarId === 'admin-resource-ops' && (page === 'agent-monitoring' || page === 'agent-trace')) {
    return 'agent-diagnostics';
  }
  if (!isAdmin && sidebarId === 'skills-center' && page === 'skill-external-market') {
    return 'skill-external-market';
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
    return 'resource-market';
  }
  if (isAdmin && sidebarId === 'monitoring' && ADMIN_SIDEBAR_PAGES.monitoring.includes(page)) {
    return 'monitoring-hub';
  }
  if (isAdmin && sidebarId === 'system-config' && ADMIN_SIDEBAR_PAGES['system-config'].includes(page)) {
    return 'config-hub';
  }
  if (isAdmin && sidebarId === 'user-management' && ADMIN_SIDEBAR_PAGES['user-management'].includes(page)) {
    return 'user-hub';
  }
  if (isAdmin && sidebarId === 'admin-resource-ops' && page === 'provider-create') {
    return 'provider-list';
  }
  return page;
}
