import { ADMIN_SIDEBAR_ITEMS, USER_SIDEBAR_ITEMS, getNavSubGroups } from './navigation';
import { ROUTE_ROOT_SUB } from './routeRoot';

export { ROUTE_ROOT_SUB } from './routeRoot';

export type ConsoleRole = 'admin' | 'user';

/**
 * 构建控制台路径（直接使用英文路由）
 */
export function buildConsolePath(role: ConsoleRole, sidebar: string, thirdSegment: string): string {
  const r = role === 'admin' ? 'admin' : 'user';
  return `/c/${r}/${encodeURIComponent(sidebar)}/${encodeURIComponent(thirdSegment)}`;
}

export function parseConsoleRole(param: string | undefined): ConsoleRole | null {
  if (param === 'admin' || param === 'user') return param;
  return null;
}

/**
 * 验证控制台路径（直接使用英文路由）
 */
export function isValidConsolePath(role: ConsoleRole, sidebar: string, third: string): boolean {
  // 处理特殊路由 __root__
  if (third === ROUTE_ROOT_SUB) {
    const sidebars = role === 'admin' ? ADMIN_SIDEBAR_ITEMS : USER_SIDEBAR_ITEMS;
    if (!sidebars.some((s) => s.id === sidebar)) return false;
    const groups = getNavSubGroups(sidebar, role === 'admin');
    // 如果没有子菜单，则 __root__ 是有效的
    return groups.length === 0;
  }
  
  const sidebars = role === 'admin' ? ADMIN_SIDEBAR_ITEMS : USER_SIDEBAR_ITEMS;
  if (!sidebars.some((s) => s.id === sidebar)) return false;
  const groups = getNavSubGroups(sidebar, role === 'admin');
  const flat = groups.flatMap((g) => g.items.map((i) => i.id));
  if (flat.length === 0) return third === ROUTE_ROOT_SUB;
  return flat.includes(third);
}

export function defaultConsolePath(role: ConsoleRole): string {
  if (role === 'admin') {
    return buildConsolePath('admin', 'overview', 'overview');
  }
  return buildConsolePath('user', 'workspace', 'overview');
}

/** 从 pathname 解析控制台三段路由（/c/role/sidebar/sub），直接返回英文路由 */
export function decodeConsolePath(pathname: string): { role: ConsoleRole; sidebar: string; third: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 4 || parts[0] !== 'c') return null;
  const r = parseConsoleRole(parts[1]);
  if (!r) return null;
  try {
    const sidebar = decodeURIComponent(parts[2]);
    const third = decodeURIComponent(parts[3]);
    return { role: r, sidebar, third };
  } catch {
    return null;
  }
}
