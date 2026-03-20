/**
 * Build console path from sidebar and sub-item IDs
 * Format: /console/:sidebarId/:subItemId?
 */
export function buildConsolePath(
  sidebarId: string,
  subItemId?: string,
  isAgentSub?: boolean,
): string {
  const parts = ['/console', sidebarId];
  if (subItemId && subItemId !== '__root__') {
    parts.push(subItemId);
  }
  if (isAgentSub) {
    parts.push('agent');
  }
  return parts.join('/');
}

/**
 * Parse console path to extract sidebar and sub-item IDs
 */
export function parseConsolePath(path: string): {
  sidebarId: string;
  subItemId: string;
  isAgentSub?: boolean;
} {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'console' || parts.length < 2) {
    return { sidebarId: '概览', subItemId: '__root__' };
  }
  
  const sidebarId = parts[1];
  const subItemId = parts[2] || '__root__';
  const isAgentSub = parts[3] === 'agent';
  
  return { sidebarId, subItemId, isAgentSub };
}
