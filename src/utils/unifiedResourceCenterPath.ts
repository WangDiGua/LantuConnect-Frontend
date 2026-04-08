import { buildPath } from '../constants/consoleRoutes';
import { parseResourceType } from '../constants/resourceTypes';
import { canAccessAdminView } from '../context/UserRoleContext';
import type { PlatformRoleCode } from '../types/dto/auth';
import type { ResourceType } from '../types/dto/catalog';

/**
 * 控制台「统一资源中心」壳路径：可进管理端视图的账号统一走 `/admin/resource-catalog`，
 * 避免与 `/user/resource-center` 形成双菜单、双书签；纯使用端仍走用户壳。
 */
export function unifiedResourceCenterPath(
  platformRole: PlatformRoleCode | null | undefined,
  type?: ResourceType | string | null,
): string {
  const admin = canAccessAdminView(platformRole);
  const base = admin ? buildPath('admin', 'resource-catalog') : buildPath('user', 'resource-center');
  const parsed = typeof type === 'string' ? parseResourceType(type) : type;
  const t = parsed ?? 'agent';
  return `${base}?type=${t}`;
}
