import type { PlatformRoleCode } from '../types/dto/auth';

export function canManagePlatformOperations(platformRole?: PlatformRoleCode | null): boolean {
  return platformRole === 'platform_admin';
}

export function canAccessDeveloperPortal(
  platformRole: PlatformRoleCode | undefined | null,
  hasPermission: (permission: string) => boolean,
): boolean {
  if (platformRole === 'platform_admin') return true;
  return hasPermission('developer:portal');
}
