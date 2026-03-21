import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '../context/UserRoleContext';
import { readPersistedNavState } from '../utils/navigationState';
import { defaultPath, parseRoute, findSidebarForPage, type ConsoleRole } from '../constants/consoleRoutes';

export const ConsoleHomeRedirect: React.FC = () => {
  const { role } = useUserRole();
  const { lastPath } = readPersistedNavState();
  const r: ConsoleRole = role === 'admin' ? 'admin' : 'user';

  const parsed = parseRoute(lastPath);
  if (parsed && findSidebarForPage(parsed.role, parsed.page)) {
    return <Navigate to={lastPath} replace />;
  }

  return <Navigate to={defaultPath(r)} replace />;
};
