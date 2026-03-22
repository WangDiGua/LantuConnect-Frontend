import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { PlatformRoleCode } from '../types/dto/auth';

export type UserRole = 'admin' | 'user';

export function platformRoleToConsoleRole(platformRole?: PlatformRoleCode | null): UserRole {
  return platformRole === 'platform_admin' || platformRole === 'dept_admin' ? 'admin' : 'user';
}

interface UserRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider: React.FC<{ children: ReactNode; initialRole?: UserRole }> = ({
  children,
  initialRole = 'admin',
}) => {
  const [role, setRole] = useState<UserRole>(initialRole);

  const value: UserRoleContextType = {
    role,
    setRole,
    isAdmin: role === 'admin',
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
