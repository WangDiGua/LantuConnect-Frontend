import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { defaultPath } from '../../constants/consoleRoutes';
import { isUnassignedRole, normalizeRole } from '../../context/UserRoleContext';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  if (isAuthenticated) {
    const normalizedRole = normalizeRole(user?.role);
    // 登录后若回跳来源是入驻页，但用户实际已分配角色，则跳转到对应控制台首页
    if (from === '/onboarding/developer' && !isUnassignedRole(normalizedRole)) {
      return <Navigate to={defaultPath()} replace />;
    }
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
