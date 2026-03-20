import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'admin' | 'user';

interface UserRoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isAdmin: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider: React.FC<{ children: ReactNode; initialRole?: UserRole }> = ({
  children,
  /** 对接登录/人员信息前：默认超级管理员（全站管理菜单） */
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
