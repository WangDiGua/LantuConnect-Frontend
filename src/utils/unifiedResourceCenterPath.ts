import { buildPath } from '../constants/consoleRoutes';
import { parseResourceType } from '../constants/resourceTypes';
import type { ResourceType } from '../types/dto/catalog';

/**
 * 控制台「我的资源中心」路径：管理端与使用端统一为 `/c/resource-center?type=`，
 * 数据均为当前操作人登记的资源（`/resource-center/resources/mine`）；全站审核走 `/c/resource-audit`。
 */
export function unifiedResourceCenterPath(
  _platformRole: unknown,
  type?: ResourceType | string | null,
): string {
  const base = buildPath('user', 'resource-center');
  const parsed = typeof type === 'string' ? parseResourceType(type) : type;
  const t = parsed ?? 'agent';
  return `${base}?type=${t}`;
}
