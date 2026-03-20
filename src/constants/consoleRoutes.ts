import { ADMIN_SIDEBAR_ITEMS, USER_SIDEBAR_ITEMS, getNavSubGroups } from './navigation';
import { ROUTE_ROOT_SUB } from './routeRoot';

export { ROUTE_ROOT_SUB } from './routeRoot';

export type ConsoleRole = 'admin' | 'user';

export function buildConsolePath(role: ConsoleRole, sidebar: string, thirdSegment: string): string {
  const r = role === 'admin' ? 'admin' : 'user';
  return `/c/${r}/${encodeURIComponent(sidebar)}/${encodeURIComponent(thirdSegment)}`;
}

export function parseConsoleRole(param: string | undefined): ConsoleRole | null {
  if (param === 'admin' || param === 'user') return param;
  return null;
}

export function isValidConsolePath(role: ConsoleRole, sidebar: string, third: string): boolean {
  const sidebars = role === 'admin' ? ADMIN_SIDEBAR_ITEMS : USER_SIDEBAR_ITEMS;
  if (!sidebars.some((s) => s.id === sidebar)) return false;
  const groups = getNavSubGroups(sidebar, role === 'admin');
  const flat = groups.flatMap((g) => g.items.map((i) => i.id));
  if (flat.length === 0) return third === ROUTE_ROOT_SUB;
  return flat.includes(third);
}

export function defaultConsolePath(role: ConsoleRole): string {
  if (role === 'admin') {
    return buildConsolePath('admin', '系统概览', '系统概览');
  }
  return buildConsolePath('user', '工作台', '概览');
}

/** 从 pathname 解析控制台三段路由（/c/role/sidebar/sub） */
export function decodeConsolePath(pathname: string): { role: ConsoleRole; sidebar: string; third: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 4 || parts[0] !== 'c') return null;
  const r = parseConsoleRole(parts[1]);
  if (!r) return null;
  try {
    return { role: r, sidebar: decodeURIComponent(parts[2]), third: decodeURIComponent(parts[3]) };
  } catch {
    return null;
  }
}
