import { ADMIN_SIDEBAR_ITEMS, USER_SIDEBAR_ITEMS, getNavSubGroups } from './navigation';
import { ROUTE_ROOT_SUB } from './routeRoot';
import { toEnglishRoute, toChineseLabel, ADMIN_ROUTE_MAPPING, USER_ROUTE_MAPPING } from './routeMapping';

export { ROUTE_ROOT_SUB } from './routeRoot';

export type ConsoleRole = 'admin' | 'user';

/**
 * 构建控制台路径（使用英文路由）
 */
export function buildConsolePath(role: ConsoleRole, sidebar: string, thirdSegment: string): string {
  const r = role === 'admin' ? 'admin' : 'user';
  const sidebarEn = toEnglishRoute(sidebar, role === 'admin');
  const thirdEn = toEnglishRoute(thirdSegment, role === 'admin');
  return `/c/${r}/${encodeURIComponent(sidebarEn)}/${encodeURIComponent(thirdEn)}`;
}

export function parseConsoleRole(param: string | undefined): ConsoleRole | null {
  if (param === 'admin' || param === 'user') return param;
  return null;
}

/**
 * 验证控制台路径（接受英文路由，转换为中文后验证）
 */
export function isValidConsolePath(role: ConsoleRole, sidebarEn: string, thirdEn: string): boolean {
  // 处理特殊路由 __root__
  if (thirdEn === ROUTE_ROOT_SUB) {
    const sidebar = toChineseLabel(sidebarEn, role === 'admin');
    const sidebars = role === 'admin' ? ADMIN_SIDEBAR_ITEMS : USER_SIDEBAR_ITEMS;
    if (!sidebars.some((s) => s.id === sidebar)) return false;
    const groups = getNavSubGroups(sidebar, role === 'admin');
    // 如果没有子菜单，则 __root__ 是有效的
    return groups.length === 0;
  }
  
  // 将英文路由转换为中文
  const sidebar = toChineseLabel(sidebarEn, role === 'admin');
  const third = toChineseLabel(thirdEn, role === 'admin');
  
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

/** 从 pathname 解析控制台三段路由（/c/role/sidebar/sub），返回中文标签 */
export function decodeConsolePath(pathname: string): { role: ConsoleRole; sidebar: string; third: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 4 || parts[0] !== 'c') return null;
  const r = parseConsoleRole(parts[1]);
  if (!r) return null;
  try {
    const sidebarEn = decodeURIComponent(parts[2]);
    const thirdEn = decodeURIComponent(parts[3]);
    // 将英文路由转换为中文显示名称
    const sidebar = toChineseLabel(sidebarEn, r === 'admin');
    const third = toChineseLabel(thirdEn, r === 'admin');
    return { role: r, sidebar, third };
  } catch {
    return null;
  }
}
