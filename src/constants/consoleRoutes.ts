export type ConsoleRole = 'admin' | 'user';

export function buildPath(role: ConsoleRole, page: string, id?: string | number): string {
  const base = `/${role}/${page}`;
  return id !== undefined ? `${base}/${id}` : base;
}

export function defaultPath(role: ConsoleRole): string {
  return role === 'admin' ? '/admin/dashboard' : '/user/workspace';
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
  'agent-management': ['agent-list', 'agent-create', 'agent-audit', 'agent-versions', 'agent-monitoring', 'agent-trace', 'agent-detail'],
  'skill-management': ['skill-list', 'skill-create', 'skill-audit', 'mcp-server-list'],
  'app-management': ['app-list', 'app-create'],
  'dataset-management': ['dataset-list', 'dataset-create'],
  'provider-management': ['provider-list', 'provider-create'],
  'user-management': ['user-list', 'role-management', 'organization', 'api-key-management'],
  'monitoring': ['monitoring-overview', 'call-logs', 'performance-analysis', 'alert-management', 'alert-rules', 'health-config', 'circuit-breaker'],
  'system-config': ['category-management', 'tag-management', 'model-config', 'security-settings', 'quota-management', 'rate-limit-policy', 'access-control', 'audit-log'],
  'developer-portal': ['api-docs', 'sdk-download', 'api-playground'],
};

const USER_SIDEBAR_PAGES: Record<string, string[]> = {
  'workspace': ['workspace', 'quick-access', 'recent-use'],
  'agent-market': ['agent-market'],
  'skill-market': ['skill-market'],
  'app-market': ['app-market'],
  'dataset-market': ['dataset-market'],
  'my-publish': ['my-agents', 'my-skills', 'submit-agent', 'submit-skill'],
  'my-space': ['usage-records', 'my-favorites', 'usage-stats'],
  'user-settings': ['profile', 'preferences'],
};

export function findSidebarForPage(role: ConsoleRole, page: string): string | null {
  const map = role === 'admin' ? ADMIN_SIDEBAR_PAGES : USER_SIDEBAR_PAGES;
  for (const [sidebarId, pages] of Object.entries(map)) {
    if (pages.includes(page)) return sidebarId;
  }
  return null;
}

export function getDefaultPage(role: ConsoleRole, sidebarId: string): string {
  const map = role === 'admin' ? ADMIN_SIDEBAR_PAGES : USER_SIDEBAR_PAGES;
  return map[sidebarId]?.[0] ?? (role === 'admin' ? 'dashboard' : 'workspace');
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
  return page;
}
