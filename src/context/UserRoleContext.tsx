import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { PlatformRoleCode } from '../types/dto/auth';

export type UserRole = 'admin' | 'user';

const ROLE_ALIAS: Record<string, PlatformRoleCode> = {
  platform_admin: 'platform_admin',
  admin: 'platform_admin',
  super_admin: 'platform_admin',
  dept_admin: 'dept_admin',
  department_admin: 'dept_admin',
  developer: 'developer',
  dev: 'developer',
  unassigned: 'unassigned',
  no_role: 'unassigned',
  none: 'unassigned',
  user: 'user',
  student: 'user',
  teacher: 'user',
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

export function platformRoleToConsoleRole(platformRole?: PlatformRoleCode | null): UserRole {
  return platformRole === 'platform_admin' || platformRole === 'dept_admin' ? 'admin' : 'user';
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
    'system:config', 'monitor:view', 'audit:manage', 'resource:audit',
    'developer:portal', 'developer-application:review',
  ],
  dept_admin: [
    'agent:view', 'agent:create', 'agent:edit', 'agent:audit',
    'skill:view', 'skill:create', 'skill:edit', 'skill:audit',
    'mcp:view', 'mcp:create', 'mcp:edit',
    'app:view', 'app:create', 'app:edit',
    'dataset:view', 'dataset:create', 'dataset:edit',
    'resource:audit',
    'provider:view',
    'user:manage', 'resource-grant:manage', 'monitor:view',
  ],
  developer: [
    'agent:view', 'agent:create', 'agent:edit', 'agent:publish',
    'skill:view', 'skill:create', 'skill:edit', 'skill:publish',
    'mcp:view', 'mcp:create', 'mcp:edit', 'mcp:publish',
    'app:view', 'app:create', 'app:edit',
    'dataset:view', 'dataset:create', 'dataset:edit',
    'developer:portal',
  ],
  user: [
    'agent:view', 'skill:view', 'app:view', 'dataset:view',
  ],
  unassigned: [],
};

export function getPermissions(platformRole?: PlatformRoleCode | null): string[] {
  return ROLE_PERMISSIONS[platformRole ?? 'user'] ?? ROLE_PERMISSIONS.user;
}

export function checkPermission(platformRole: PlatformRoleCode | undefined | null, permission: string): boolean {
  return getPermissions(platformRole).includes(permission);
}

export function canAccessAdminView(platformRole?: PlatformRoleCode | null): boolean {
  return platformRole === 'platform_admin' || platformRole === 'dept_admin';
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
