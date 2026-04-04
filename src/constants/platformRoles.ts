import type { PlatformRoleCode } from '../types/dto/auth';

/** 与后端四类平台角色一致的界面展示名 */
export const PLATFORM_ROLE_LABELS: Record<PlatformRoleCode, string> = {
  platform_admin: '平台超管',
  reviewer: '审核员',
  developer: '开发者',
  user: '用户',
  unassigned: '待分配角色',
};
