import type { ResourceType } from '../types/dto/catalog';

export type ConsoleRole = 'admin' | 'user';

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

export function defaultPath(role: ConsoleRole): string {
  return role === 'admin' ? '/admin/dashboard' : '/user/hub';
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
  'resource-management': [
    'agent-list', 'agent-register', 'agent-monitoring', 'agent-trace', 'agent-detail',
    'skill-list', 'skill-register',
    'mcp-server-list', 'mcp-register',
    'app-list', 'app-register',
    'dataset-list', 'dataset-register',
  ],
  'audit-center': ['agent-audit', 'skill-audit', 'mcp-audit', 'app-audit', 'dataset-audit'],
  'provider-management': ['provider-list', 'provider-create'],
  'user-management': ['user-list', 'role-management', 'organization', 'api-key-management', 'resource-grant-management', 'grant-applications', 'developer-applications'],
  'monitoring': ['monitoring-overview', 'call-logs', 'performance-analysis', 'alert-management', 'alert-rules', 'health-config', 'circuit-breaker'],
  'system-config': ['tag-management', 'model-config', 'security-settings', 'quota-management', 'rate-limit-policy', 'access-control', 'audit-log', 'sensitive-words', 'announcements'],
};

const USER_SIDEBAR_PAGES: Record<string, string[]> = {
  'hub': ['hub'],
  'workspace': ['workspace', 'authorized-skills', 'my-favorites', 'quick-access'],
  'marketplace': ['agent-market', 'skill-market', 'mcp-market', 'app-market', 'dataset-market'],
  'developer-portal': ['api-docs', 'sdk-download', 'api-playground', 'developer-statistics'],
  'my-publish': [
    'my-agents-pub',
    'resource-center',
    'agent-list', 'agent-register',
    'skill-list', 'skill-register',
    'mcp-server-list', 'mcp-register',
    'app-list', 'app-register',
    'dataset-list', 'dataset-register',
  ],
  'my-space': ['usage-records', 'recent-use', 'usage-stats', 'my-grant-applications'],
  'user-settings': ['profile', 'preferences'],
};

export function findSidebarForPage(role: ConsoleRole, page: string): string | null {
  if (role === 'user' && page === 'resource-center') {
    return 'my-publish';
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
  if (isAdmin && sidebarId === 'resource-management' && ADMIN_RESOURCE_CATALOG_PAGES.has(page)) {
    return 'resource-catalog';
  }
  if (isAdmin && sidebarId === 'audit-center' && ADMIN_RESOURCE_AUDIT_PAGES.has(page)) {
    return 'resource-audit';
  }
  return page;
}
