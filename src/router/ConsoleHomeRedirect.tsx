import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '../context/UserRoleContext';
import { readPersistedNavState } from '../utils/navigationState';
import {
  buildConsolePath,
  defaultConsolePath,
  isValidConsolePath,
  type ConsoleRole,
} from '../constants/consoleRoutes';
import { ROUTE_ROOT_SUB } from '../constants/routeRoot';

/** 访问 `/` 时根据角色与持久化导航跳到 `/c/...` */
export const ConsoleHomeRedirect: React.FC = () => {
  const { role } = useUserRole();
  const p = readPersistedNavState();
  const r: ConsoleRole = role === 'admin' ? 'admin' : 'user';
  const third =
    p.activeSidebar === 'my-agent' ? p.activeAgentSubItem : p.activeSubItem || ROUTE_ROOT_SUB;
  
  if (!isValidConsolePath(r, p.activeSidebar, third)) {
    return <Navigate to={defaultConsolePath(r)} replace />;
  }
  return <Navigate to={buildConsolePath(r, p.activeSidebar, third)} replace />;
};
