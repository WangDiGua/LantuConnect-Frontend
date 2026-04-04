import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { PlatformRoleCode } from '../types/dto/auth';

export type UserRole = 'admin' | 'user';

const ROLE_ALIAS: Record<string, PlatformRoleCode> = {
  platform_admin: 'platform_admin',
  admin: 'platform_admin',
  super_admin: 'platform_admin',
  reviewer: 'reviewer',
  /** @deprecated 后端已改为 reviewer */
  dept_admin: 'reviewer',
  department_admin: 'reviewer',
  auditor: 'reviewer',
  developer: 'developer',
  dev: 'developer',
  user: 'user',
  /** @deprecated 后端已改为 user */
  consumer: 'user',
  student: 'user',
  teacher: 'user',
  unassigned: 'unassigned',
  no_role: 'unassigned',
  none: 'unassigned',
};

/** Map any backend role string to a canonical PlatformRoleCode. */
export function normalizeRole(raw?: string | null): PlatformRoleCode {
  if (!raw) return 'unassigned';
  const key = raw.trim().toLowerCase();
  const mapped = ROLE_ALIAS[key];
  if (!mapped) {
    console.warn(`[normalizeRole] Unknown backend role "${raw}", falling back to "user".`);
  }
  return mapped ?? 'user';
}

/**
 * 控制台壳层**初始**路由域：统一为应用侧 `user`。
 * 超管/审核员等是否可打开 `/admin/*` 由 {@link canAccessAdminView} 与权限点决定，不再按角色默认进「管理首页」。
 */
export function platformRoleToConsoleRole(_platformRole?: PlatformRoleCode | null): UserRole {
  return 'user';
}

const ROLE_PERMISSIONS: Record<PlatformRoleCode, string[]> = {
  platform_admin: [
    'agent:view', 'agent:create', 'agent:edit', 'agent:delete', 'agent:publish', 'agent:audit',
    'skill:view', 'skill:create', 'skill:edit', 'skill:delete', 'skill:publish', 'skill:audit',
    'mcp:view', 'mcp:create', 'mcp:edit', 'mcp:delete', 'mcp:publish',
    'app:view', 'app:create', 'app:edit', 'app:delete',
    'dataset:view', 'dataset:create', 'dataset:edit', 'dataset:delete',
    'provider:view', 'provider:manage',
    'user:manage', 'role:manage', 'org:manage', 'api-key:manage', 'resource-grant:manage',
    'grant-application:review',
    'system:config', 'monitor:view', 'audit:manage', 'resource:audit',
    'developer:portal', 'developer-application:review',
  ],
  /** 全平台审核：与后端 reviewer 权限一致；不含用户/组织治理、Provider、系统参数（仅超管） */
  reviewer: [
    'agent:view', 'agent:create', 'agent:edit', 'agent:audit',
    'skill:view', 'skill:create', 'skill:edit', 'skill:audit',
    'mcp:view', 'mcp:create', 'mcp:edit', 'mcp:audit',
    'app:view', 'app:create', 'app:edit', 'app:audit',
    'dataset:view', 'dataset:create', 'dataset:edit', 'dataset:audit',
    'resource:audit',
    'resource-grant:manage', 'grant-application:review', 'developer-application:review',
    'monitor:view',
    'developer:portal',
  ],
  developer: [
    'agent:view', 'agent:create', 'agent:edit', 'agent:publish',
    'skill:view', 'skill:create', 'skill:edit', 'skill:publish',
    'mcp:view', 'mcp:create', 'mcp:edit', 'mcp:publish',
    'app:view', 'app:create', 'app:edit',
    'dataset:view', 'dataset:create', 'dataset:edit',
    'grant-application:review',
    'developer:portal',
  ],
  /**
   * 终端用户（user）：已发布资源只读/调用侧；后端为 agent:read / skill:read / app:view / dataset:read。
   */
  user: [
    'agent:read', 'skill:read', 'app:view', 'dataset:read',
    'agent:view', 'skill:view', 'dataset:view',
  ],
  /** 与 user 同屏体验：未分配平台角色时仍可进工作台浏览目录与个人设置；接口以 JWT 为准 */
  unassigned: [
    'agent:read', 'skill:read', 'app:view', 'dataset:read',
    'agent:view', 'skill:view', 'dataset:view',
  ],
};

export function getPermissions(platformRole?: PlatformRoleCode | null): string[] {
  return ROLE_PERMISSIONS[platformRole ?? 'user'] ?? ROLE_PERMISSIONS.user;
}

export function checkPermission(platformRole: PlatformRoleCode | undefined | null, permission: string): boolean {
  return getPermissions(platformRole).includes(permission);
}

export function canAccessAdminView(platformRole?: PlatformRoleCode | null): boolean {
  return platformRole === 'platform_admin' || platformRole === 'reviewer';
}

export function isUnassignedRole(platformRole?: PlatformRoleCode | null): boolean {
  return platformRole === 'unassigned';
}

interface UserRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
  platformRole: PlatformRoleCode;
  permissions: string[];
  hasPermission: (perm: string) => boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider: React.FC<{
  children: ReactNode;
  initialRole?: UserRole;
  platformRole?: PlatformRoleCode;
}> = ({
  children,
  initialRole = 'user',
  platformRole = 'user',
}) => {
  const [role, setRole] = useState<UserRole>(initialRole);
  const permissions = useMemo(() => getPermissions(platformRole), [platformRole]);
  const hasPermission = useMemo(
    () => (perm: string) => permissions.includes(perm),
    [permissions],
  );

  const value: UserRoleContextType = {
    role,
    setRole,
    isAdmin: role === 'admin',
    platformRole,
    permissions,
    hasPermission,
  };

  return <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>;
};

export function useUserRole(): UserRoleContextType {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
