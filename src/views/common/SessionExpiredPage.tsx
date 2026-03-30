import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { defaultPath, type ConsoleRole } from '../../constants/consoleRoutes';
import { isUnassignedRole, normalizeRole, platformRoleToConsoleRole } from '../../context/UserRoleContext';
import { UnauthorizedPage } from './UnauthorizedPage';

/** 会话失效说明页；已登录用户误入时回控制台首页 */
export const SessionExpiredPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (isAuthenticated && user) {
    const normalized = normalizeRole(user.role);
    if (isUnassignedRole(normalized)) {
      return <Navigate to="/onboarding/developer" replace />;
    }
    const role: ConsoleRole = platformRoleToConsoleRole(normalized);
    return <Navigate to={defaultPath(role)} replace />;
  }
  return <UnauthorizedPage />;
};
