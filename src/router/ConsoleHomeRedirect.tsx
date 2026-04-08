import React from 'react';
import { Navigate } from 'react-router-dom';
import { canAccessAdminView, normalizeRole } from '../context/UserRoleContext';
import { useAuthStore } from '../stores/authStore';
import { readPersistedNavState } from '../utils/navigationState';
import { defaultPath, parseRoute, findSidebarForPage, inferConsoleRole } from '../constants/consoleRoutes';

export const ConsoleHomeRedirect: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { lastPath } = readPersistedNavState();
  const normalizedRole = normalizeRole(user?.role);
  const parsed = parseRoute(lastPath);
  if (parsed) {
    const inferred = inferConsoleRole(parsed.page, normalizedRole);
    if (inferred === 'admin' && !canAccessAdminView(normalizedRole)) {
      return <Navigate to={defaultPath()} replace />;
    }
    if (findSidebarForPage(inferred, parsed.page)) {
      return <Navigate to={lastPath} replace />;
    }
  }

  return <Navigate to={defaultPath()} replace />;
};
