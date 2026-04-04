import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { defaultPath } from '../../constants/consoleRoutes';
import { UnauthorizedPage } from './UnauthorizedPage';

/** 会话失效说明页；已登录用户误入时回控制台首页 */
export const SessionExpiredPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (isAuthenticated && user) {
    return <Navigate to={defaultPath()} replace />;
  }
  return <UnauthorizedPage />;
};
