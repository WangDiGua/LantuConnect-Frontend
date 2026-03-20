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
import { toEnglishRoute } from '../constants/routeMapping';

/** 访问 `/` 时根据角色与持久化导航跳到 `/c/...` */
export const ConsoleHomeRedirect: React.FC = () => {
  const { role } = useUserRole();
  const p = readPersistedNavState();
  const r: ConsoleRole = role === 'admin' ? 'admin' : 'user';
  const third =
    p.activeSidebar === '我的 Agent' ? p.activeAgentSubItem : p.activeSubItem || ROUTE_ROOT_SUB;
  
  // 将中文路由转换为英文路由进行验证
  const sidebarEn = toEnglishRoute(p.activeSidebar, r === 'admin');
  const thirdEn = toEnglishRoute(third, r === 'admin');
  
  if (!isValidConsolePath(r, sidebarEn, thirdEn)) {
    return <Navigate to={defaultConsolePath(r)} replace />;
  }
  return <Navigate to={buildConsolePath(r, p.activeSidebar, third)} replace />;
};
