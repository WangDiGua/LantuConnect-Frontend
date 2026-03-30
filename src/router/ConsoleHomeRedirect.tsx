import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole, canAccessAdminView, isUnassignedRole, normalizeRole } from '../context/UserRoleContext';
import { useAuthStore } from '../stores/authStore';
import { readPersistedNavState } from '../utils/navigationState';
import { defaultPath, parseRoute, findSidebarForPage, type ConsoleRole } from '../constants/consoleRoutes';

export const ConsoleHomeRedirect: React.FC = () => {
  const { role } = useUserRole();
  const user = useAuthStore((s) => s.user);
  const { lastPath } = readPersistedNavState();
  const normalizedRole = normalizeRole(user?.role);
  if (user && isUnassignedRole(normalizedRole)) {
    return <Navigate to="/onboarding/developer" replace />;
  }
  const r: ConsoleRole = role === 'admin' ? 'admin' : 'user';

  const parsed = parseRoute(lastPath);
  if (parsed) {
    if (parsed.role === 'admin' && !canAccessAdminView(normalizedRole)) {
      return <Navigate to={defaultPath('user')} replace />;
    }
    if (findSidebarForPage(parsed.role, parsed.page)) {
      return <Navigate to={lastPath} replace />;
    }
  }

  return <Navigate to={defaultPath(r)} replace />;
};
