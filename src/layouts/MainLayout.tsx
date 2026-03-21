import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  User,
  Settings,
  LogOut,
  Palette,
  Bell,
  Shield,
  UserCog,
  Search,
} from 'lucide-react';
import { Theme, ThemeColor, FontSize, FontFamily, AnimationStyle } from '../types';
import { FONT_FAMILY_CLASSES, THEME_COLOR_CLASSES, getRootFontSizePx } from '../constants/theme';
import { LayoutChromeProvider } from '../context/LayoutChromeContext';
import { UserRoleProvider, useUserRole } from '../context/UserRoleContext';
import { 
  ADMIN_SIDEBAR_ITEMS,
  USER_SIDEBAR_ITEMS,
  getNavSubGroups,
} from '../constants/navigation';
import { AppearanceMenu } from '../components/business/AppearanceMenu';
import { MessagePanel, INITIAL_MESSAGE_UNREAD_COUNT } from '../components/business/MessagePanel';

const Overview = lazy(() => import('../views/dashboard/Overview').then(m => ({ default: m.Overview })));
const UserWorkspaceOverview = lazy(() => import('../views/dashboard/UserWorkspaceOverview').then(m => ({ default: m.UserWorkspaceOverview })));
const QuickAccess = lazy(() => import('../views/dashboard/QuickAccess').then(m => ({ default: m.QuickAccess })));
const PlaceholderView = lazy(() => import('../views/common/PlaceholderView').then(m => ({ default: m.PlaceholderView })));
const AgentList = lazy(() => import('../views/agent/AgentList').then(m => ({ default: m.AgentList })));
const AgentDetail = lazy(() => import('../views/agent/AgentDetail').then(m => ({ default: m.AgentDetail })));
const AgentCreate = lazy(() => import('../views/agent/AgentCreate').then(m => ({ default: m.AgentCreate })));
const AgentMarket = lazy(() => import('../views/agent/AgentMarket').then(m => ({ default: m.AgentMarket })));
const AgentMonitoringPage = lazy(() => import('../views/agent/AgentMonitoringPage').then(m => ({ default: m.AgentMonitoringPage })));
const AgentTracePage = lazy(() => import('../views/agent/AgentTracePage').then(m => ({ default: m.AgentTracePage })));
const AgentAuditList = lazy(() => import('../views/agent/AgentAuditList').then(m => ({ default: m.AgentAuditList })));
const AgentVersionPage = lazy(() => import('../views/agent/AgentVersionPage').then(m => ({ default: m.AgentVersionPage })));
const SkillList = lazy(() => import('../views/skill/SkillList').then(m => ({ default: m.SkillList })));
const SkillCreate = lazy(() => import('../views/skill/SkillCreate').then(m => ({ default: m.SkillCreate })));
const SkillMarket = lazy(() => import('../views/skill/SkillMarket').then(m => ({ default: m.SkillMarket })));
const SkillAuditList = lazy(() => import('../views/skill/SkillAuditList').then(m => ({ default: m.SkillAuditList })));
const AppList = lazy(() => import('../views/apps/AppList').then(m => ({ default: m.AppList })));
const AppCreate = lazy(() => import('../views/apps/AppCreate').then(m => ({ default: m.AppCreate })));
const AppMarket = lazy(() => import('../views/apps/AppMarket').then(m => ({ default: m.AppMarket })));
const DatasetList = lazy(() => import('../views/dataset/DatasetList').then(m => ({ default: m.DatasetList })));
const DatasetCreate = lazy(() => import('../views/dataset/DatasetCreate').then(m => ({ default: m.DatasetCreate })));
const DatasetMarket = lazy(() => import('../views/dataset/DatasetMarket').then(m => ({ default: m.DatasetMarket })));
const ProviderList = lazy(() => import('../views/provider/ProviderList').then(m => ({ default: m.ProviderList })));
const ProviderCreate = lazy(() => import('../views/provider/ProviderCreate').then(m => ({ default: m.ProviderCreate })));
const UserManagementModule = lazy(() => import('../views/userMgmt/UserManagementModule').then(m => ({ default: m.UserManagementModule })));
const SystemConfigModule = lazy(() => import('../views/systemConfig/SystemConfigModule').then(m => ({ default: m.SystemConfigModule })));
const MonitoringModule = lazy(() => import('../views/monitoring/MonitoringModule').then(m => ({ default: m.MonitoringModule })));
const MyAgentList = lazy(() => import('../views/publish/MyAgentList').then(m => ({ default: m.MyAgentList })));
const MySkillList = lazy(() => import('../views/publish/MySkillList').then(m => ({ default: m.MySkillList })));
const SubmitAgent = lazy(() => import('../views/publish/SubmitAgent').then(m => ({ default: m.SubmitAgent })));
const SubmitSkill = lazy(() => import('../views/publish/SubmitSkill').then(m => ({ default: m.SubmitSkill })));
const UserProfile = lazy(() => import('../views/user/UserProfile').then(m => ({ default: m.UserProfile })));
const UserSettingsPage = lazy(() => import('../views/user/UserSettingsPage').then(m => ({ default: m.UserSettingsPage })));
const ApiDocsPage = lazy(() => import('../views/developer/ApiDocsPage').then(m => ({ default: m.ApiDocsPage })));
const SdkDownloadPage = lazy(() => import('../views/developer/SdkDownloadPage').then(m => ({ default: m.SdkDownloadPage })));
const ApiPlaygroundPage = lazy(() => import('../views/developer/ApiPlaygroundPage').then(m => ({ default: m.ApiPlaygroundPage })));
const DataReportsPage = lazy(() => import('../views/dashboard/DataReportsPage').then(m => ({ default: m.DataReportsPage })));

import { Logo } from '../components/common/Logo';
import { MessageProvider, useMessage } from '../components/common/Message';
import { readPersistedNavState, writePersistedNavState } from '../utils/navigationState';
import { readAppearanceState, writeAppearanceState } from '../utils/appearanceState';
import { toolbarSearchInputClass } from '../utils/toolbarFieldClasses';
import { ConsoleHomeRedirect } from '../router/ConsoleHomeRedirect';
import {
  buildPath,
  defaultPath,
  parseRoute,
  findSidebarForPage,
  getDefaultPage,
  subItemToPage,
  pageToSubItem,
  type ConsoleRole,
} from '../constants/consoleRoutes';
import { ContentLoader } from '../components/common/ContentLoader';

export const MainLayout: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => readAppearanceState().theme);

  return (
    <MessageProvider theme={theme}>
      <UserRoleProvider initialRole="admin">
        <Routes>
          <Route path="/" element={<ConsoleHomeRedirect />} />
          <Route path="/:role/:page/*" element={<MainLayoutContent theme={theme} setTheme={setTheme} />} />
          <Route path="/:role/:page" element={<MainLayoutContent theme={theme} setTheme={setTheme} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UserRoleProvider>
    </MessageProvider>
  );
};

const MainLayoutContent: React.FC<{ theme: Theme; setTheme: (t: Theme) => void }> = ({ theme, setTheme }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const { isAdmin: ctxAdmin, role, setRole } = useUserRole();

  const route = parseRoute(location.pathname);
  const consoleRole: ConsoleRole = route?.role ?? (ctxAdmin ? 'admin' : 'user');
  const page = route?.page ?? (consoleRole === 'admin' ? 'dashboard' : 'workspace');
  const routeId = route?.id;
  const layoutIsAdmin = consoleRole === 'admin';

  const activeSidebar = findSidebarForPage(consoleRole, page) ?? (layoutIsAdmin ? 'overview' : 'workspace');
  const activeSubItem = pageToSubItem(page, activeSidebar, layoutIsAdmin);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [sidebarNavFilter, setSidebarNavFilter] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => readAppearanceState().themeColor);
  const [fontSize, setFontSize] = useState<FontSize>(() => readAppearanceState().fontSize);
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => readAppearanceState().fontFamily);
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>(() => readAppearanceState().animationStyle);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMessagePanel, setShowMessagePanel] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(INITIAL_MESSAGE_UNREAD_COUNT);

  // Redirect to default path if page is invalid
  useEffect(() => {
    if (!route || !findSidebarForPage(route.role, route.page)) {
      navigate(defaultPath(consoleRole), { replace: true });
    }
  }, [route, consoleRole, navigate]);

  // Sync UserRoleContext with URL role
  useEffect(() => {
    const wantRole = consoleRole === 'admin' ? 'admin' : 'user';
    if (role !== wantRole) setRole(wantRole);
  }, [consoleRole, role, setRole]);

  // Expand sidebar group for current section
  useEffect(() => {
    const groups = getNavSubGroups(activeSidebar, layoutIsAdmin);
    setExpandedGroups(groups.length > 0 ? [activeSidebar] : []);
  }, [activeSidebar, layoutIsAdmin]);

  // Persist current path
  useEffect(() => {
    writePersistedNavState({ lastPath: location.pathname });
  }, [location.pathname]);

  // Reset filter on sidebar change
  useEffect(() => {
    setSidebarNavFilter('');
  }, [activeSidebar]);

  useEffect(() => {
    writeAppearanceState({ theme, themeColor, fontSize, fontFamily, animationStyle });
  }, [theme, themeColor, fontSize, fontFamily, animationStyle]);

  useEffect(() => {
    document.documentElement.style.fontSize = getRootFontSizePx(fontSize);
  }, [fontSize]);

  const hasSecondarySidebar = false;

  const sidebarItems = useMemo(() => {
    return layoutIsAdmin ? ADMIN_SIDEBAR_ITEMS : USER_SIDEBAR_ITEMS;
  }, [layoutIsAdmin]);

  useEffect(() => {
    if (!showUserMenu && !showMessagePanel) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
        setShowAppearanceMenu(false);
        setShowMessagePanel(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [showUserMenu, showMessagePanel]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    showMessage(`已切换至${newTheme === 'light' ? '浅色' : '深色'}模式`, 'success');
  };
  const handleSetThemeColor = (color: ThemeColor) => {
    setThemeColor(color);
    showMessage(`主题色已更新为 ${color}`, 'success');
  };
  const handleSetFontSize = (size: FontSize) => {
    setFontSize(size);
    showMessage(`字号已调整为 ${size === 'small' ? '小' : size === 'medium' ? '中' : '大'}`, 'success');
  };
  const handleSetFontFamily = (family: FontFamily) => {
    setFontFamily(family);
    showMessage(`字体已切换为 ${family}`, 'success');
  };
  const handleSetAnimationStyle = (style: AnimationStyle) => {
    setAnimationStyle(style);
    showMessage(`动画效果已切换为 ${style}`, 'success');
  };
  const handleReset = () => {
    setTheme('light');
    setThemeColor('blue');
    setFontSize('medium');
    setFontFamily('sans');
    setAnimationStyle('fade');
    writeAppearanceState({ theme: 'light', themeColor: 'blue', fontSize: 'medium', fontFamily: 'sans', animationStyle: 'fade' });
    showMessage('外观设置已恢复默认', 'info');
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [id]);
  };

  const getSubGroupsForSidebar = (sidebarId: string) => getNavSubGroups(sidebarId, layoutIsAdmin);

  const getAnimationVariants = () => {
    switch (animationStyle) {
      case 'slide':
        return { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 } };
      case 'zoom':
        return { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.05 } };
      case 'skew':
        return { initial: { opacity: 0, skewX: -10, x: -20 }, animate: { opacity: 1, skewX: 0, x: 0 }, exit: { opacity: 0, skewX: 10, x: 20 } };
      case 'flip':
        return { initial: { opacity: 0, rotateY: 90 }, animate: { opacity: 1, rotateY: 0 }, exit: { opacity: 0, rotateY: -90 } };
      case 'rotate':
        return { initial: { opacity: 0, rotate: -10, scale: 0.9 }, animate: { opacity: 1, rotate: 0, scale: 1 }, exit: { opacity: 0, rotate: 10, scale: 1.1 } };
      default:
        return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    }
  };

  const handleSidebarClick = (id: string) => {
    navigate(buildPath(consoleRole, getDefaultPage(consoleRole, id)));
  };

  const handleSubItemClick = (subItemId: string) => {
    const pageName = subItemToPage(activeSidebar, subItemId, layoutIsAdmin);
    navigate(buildPath(consoleRole, pageName));
  };

  const navigateTo = useCallback((targetPage: string, id?: string | number) => {
    navigate(buildPath(consoleRole, targetPage, id));
  }, [navigate, consoleRole]);

  const contentKey = useMemo(() => {
    return routeId ? `${page}/${routeId}` : page;
  }, [page, routeId]);

  const MainContent = React.memo<{
    page: string;
    routeId?: string;
    layoutIsAdmin: boolean;
    theme: Theme;
    themeColor: ThemeColor;
    fontSize: FontSize;
    showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    navigateTo: (page: string, id?: string | number) => void;
    setShowUserMenu: (show: boolean) => void;
    setShowAppearanceMenu: (show: boolean) => void;
  }>(({
    page: p,
    routeId: rid,
    layoutIsAdmin: isAdmin,
    theme: t,
    themeColor: tc,
    fontSize: fs,
    showMessage: msg,
    navigateTo: nav,
    setShowUserMenu: setMenu,
    setShowAppearanceMenu: setAppMenu,
  }) => {
    const content = (() => {
      if (isAdmin) {
        switch (p) {
          case 'dashboard':
            return <Overview theme={t} fontSize={fs} />;
          case 'health-check':
          case 'usage-statistics':
            return <PlaceholderView title={p} theme={t} fontSize={fs} />;
          case 'data-reports':
            return <DataReportsPage theme={t} fontSize={fs} />;

          case 'agent-list':
            return (
              <AgentList
                theme={t}
                fontSize={fs}
                onViewDetail={(id) => nav('agent-detail', id)}
                onCreateAgent={() => nav('agent-create')}
              />
            );
          case 'agent-create':
            return (
              <AgentCreate
                theme={t}
                fontSize={fs}
                onBack={() => nav('agent-list')}
                onSuccess={(id) => { nav('agent-detail', id); msg('Agent 注册成功！', 'success'); }}
              />
            );
          case 'agent-detail':
            return <AgentDetail agentId={rid ?? ''} theme={t} fontSize={fs} onBack={() => nav('agent-list')} />;
          case 'agent-audit':
            return <AgentAuditList theme={t} fontSize={fs} showMessage={msg} />;
          case 'agent-versions':
            return <AgentVersionPage theme={t} fontSize={fs} />;
          case 'agent-monitoring':
            return <AgentMonitoringPage theme={t} fontSize={fs} />;
          case 'agent-trace':
            return <AgentTracePage theme={t} fontSize={fs} />;

          case 'skill-list':
            return <SkillList theme={t} fontSize={fs} />;
          case 'skill-create':
            return <SkillCreate theme={t} fontSize={fs} onBack={() => nav('skill-list')} />;
          case 'skill-audit':
            return <SkillAuditList theme={t} fontSize={fs} showMessage={msg} />;
          case 'mcp-server-list':
            return <PlaceholderView title="MCP Server 管理" theme={t} fontSize={fs} />;

          case 'app-list':
            return <AppList theme={t} fontSize={fs} showMessage={msg} />;
          case 'app-create':
            return <AppCreate theme={t} fontSize={fs} />;

          case 'dataset-list':
            return <DatasetList theme={t} fontSize={fs} showMessage={msg} />;
          case 'dataset-create':
            return <DatasetCreate theme={t} fontSize={fs} />;

          case 'provider-list':
            return <ProviderList theme={t} fontSize={fs} showMessage={msg} />;
          case 'provider-create':
            return <ProviderCreate theme={t} fontSize={fs} onBack={() => nav('provider-list')} />;

          case 'user-list':
          case 'role-management':
          case 'organization':
          case 'api-key-management':
            return <UserManagementModule activeSubItem={p} theme={t} fontSize={fs} showMessage={msg} />;

          case 'monitoring-overview':
          case 'call-logs':
          case 'performance-analysis':
          case 'alert-management':
          case 'alert-rules':
          case 'health-config':
          case 'circuit-breaker':
            return <MonitoringModule activeSubItem={p} theme={t} fontSize={fs} showMessage={msg} />;

          case 'category-management':
          case 'tag-management':
          case 'model-config':
          case 'security-settings':
          case 'quota-management':
          case 'rate-limit-policy':
          case 'access-control':
          case 'audit-log':
            return <SystemConfigModule activeSubItem={p} theme={t} fontSize={fs} showMessage={msg} />;

          case 'api-docs':
            return <ApiDocsPage theme={t} fontSize={fs} />;
          case 'sdk-download':
            return <SdkDownloadPage theme={t} fontSize={fs} />;
          case 'api-playground':
            return <ApiPlaygroundPage theme={t} fontSize={fs} />;

          default:
            return <PlaceholderView title={p} theme={t} fontSize={fs} />;
        }
      }

      // User pages
      switch (p) {
        case 'workspace':
          return <UserWorkspaceOverview theme={t} fontSize={fs} />;
        case 'quick-access':
          return <QuickAccess theme={t} fontSize={fs} />;
        case 'recent-use':
          return <PlaceholderView title="最近使用" theme={t} fontSize={fs} />;

        case 'agent-market':
          return <AgentMarket theme={t} fontSize={fs} themeColor={tc} showMessage={msg} />;
        case 'skill-market':
          return <SkillMarket theme={t} fontSize={fs} />;
        case 'app-market':
          return <AppMarket theme={t} fontSize={fs} />;
        case 'dataset-market':
          return <DatasetMarket theme={t} fontSize={fs} />;

        case 'my-agents':
          return <MyAgentList theme={t} fontSize={fs} />;
        case 'my-skills':
          return <MySkillList theme={t} fontSize={fs} />;
        case 'submit-agent':
          return <SubmitAgent theme={t} fontSize={fs} />;
        case 'submit-skill':
          return <SubmitSkill theme={t} fontSize={fs} />;

        case 'usage-records':
        case 'my-favorites':
        case 'usage-stats':
          return <PlaceholderView title={p} theme={t} fontSize={fs} />;

        case 'profile':
          return <UserProfile theme={t} fontSize={fs} />;
        case 'preferences':
          return (
            <UserSettingsPage
              theme={t}
              fontSize={fs}
              themeColor={tc}
              showMessage={msg}
              onOpenAppearance={() => { setMenu(true); setAppMenu(true); }}
            />
          );

        default:
          return <PlaceholderView title={p} theme={t} fontSize={fs} />;
      }
    })();

    return (
      <Suspense fallback={<ContentLoader theme={t} />}>
        {content}
      </Suspense>
    );
  }, (prevProps, nextProps) => {
    return (
      prevProps.page === nextProps.page &&
      prevProps.routeId === nextProps.routeId &&
      prevProps.layoutIsAdmin === nextProps.layoutIsAdmin &&
      prevProps.theme === nextProps.theme &&
      prevProps.themeColor === nextProps.themeColor &&
      prevProps.fontSize === nextProps.fontSize
    );
  });

  MainContent.displayName = 'MainContent';

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'light' ? 'bg-[#F2F2F7]' : 'bg-black'}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-10 rounded-2xl shadow-2xl max-w-md w-full border ${
          theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#1C1C1E] border-white/10'
        }`}>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
              LantuConnect
            </h1>
            <p className="text-slate-500 mb-8">兰智通 · AI Agent 与知识连接平台</p>
            <button 
              onClick={() => setIsLoggedIn(true)}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              立即体验
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <LayoutChromeProvider value={{ hasSecondarySidebar }}>
    <div
      data-theme={theme === 'dark' ? 'dark' : 'light'}
      className={`flex h-screen overflow-hidden transition-all duration-500 ${FONT_FAMILY_CLASSES[fontFamily]} ${
        theme === 'light' ? 'bg-white text-black' : 'bg-[#000000] text-white'
      }`}
    >
      
      {/* Sidebar - iPadOS/macOS Style */}
      <aside
        className={`flex-shrink-0 w-60 hidden lg:flex flex-col border-r transition-all duration-300 ${
          theme === 'light' ? 'bg-[#F2F2F7] border-slate-200' : 'bg-[#0A0A0A] border-white/10'
        }`}
      >
        <div className="h-14 flex items-center justify-center px-4 w-full">
          <button
            type="button"
            onClick={() => handleSidebarClick(layoutIsAdmin ? 'overview' : 'workspace')}
            className="flex items-center justify-center min-w-0 w-full rounded-xl hover:opacity-90 active:opacity-80 transition-opacity"
            title={layoutIsAdmin ? '返回系统概览' : '返回工作台'}
          >
            <Logo fontSize={fontSize} theme={theme} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pt-1 pb-2 custom-scrollbar">
          {sidebarItems.map((item) => {
            const subGroups = getSubGroupsForSidebar(item.id);
            const hasSubItems = subGroups.length > 0;
            const isExpanded = expandedGroups.includes(item.id);
            const isActive = activeSidebar === item.id;
            const fq = sidebarNavFilter.trim().toLowerCase();
            const filteredSubGroups =
              !fq || item.id !== activeSidebar
                ? subGroups
                : subGroups
                    .map((g) => ({
                      ...g,
                      items: g.items.filter(
                        (si: { id: string; label: string }) =>
                          si.label.toLowerCase().includes(fq) || si.id.toLowerCase().includes(fq)
                      ),
                    }))
                    .filter((g) => g.items.length > 0);
            const accentBorder = THEME_COLOR_CLASSES[themeColor].border.replace('border-', 'border-l-2 border-');

            return (
              <div key={item.id} className="mb-1">
                <div
                  className={`flex items-stretch rounded-xl mx-2 my-0.5 overflow-hidden ${
                    isActive
                      ? `${THEME_COLOR_CLASSES[themeColor].bg} text-white shadow-sm`
                      : theme === 'light'
                        ? 'text-slate-600 hover:bg-slate-200/50'
                        : 'text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSidebarClick(item.id)}
                    className="flex flex-1 min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-xl"
                  >
                    <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                    <span
                      className={`flex-1 font-medium truncate ${
                        fontSize === 'small' ? 'text-xs' : fontSize === 'medium' ? 'text-sm' : 'text-base'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                  {hasSubItems && (
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? '收起子菜单' : '展开子菜单'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeSidebar === item.id) {
                          toggleGroup(item.id);
                        } else {
                          handleSidebarClick(item.id);
                        }
                      }}
                      className={`shrink-0 px-2 flex items-center justify-center rounded-xl transition-colors ${
                        isActive ? 'hover:bg-white/10' : theme === 'light' ? 'hover:bg-slate-200/60' : 'hover:bg-white/10'
                      }`}
                    >
                      <ChevronDown
                        size={14}
                        className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>

                {hasSubItems && (
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden pl-3 pr-2 pt-1 pb-2 space-y-1">
                      <div
                        className={`relative px-1 transition-all duration-150 ${
                          item.id === activeSidebar
                            ? 'mb-2 opacity-100'
                            : 'h-0 opacity-0 overflow-hidden pointer-events-none'
                        }`}
                      >
                        <Search
                          size={14}
                          className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                            theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                          }`}
                          aria-hidden
                        />
                        <input
                          type="search"
                          value={sidebarNavFilter}
                          onChange={(e) => setSidebarNavFilter(e.target.value)}
                          placeholder="筛选子项…"
                          className={`${toolbarSearchInputClass(theme)} !py-2 !text-xs !min-h-0 !pl-8`}
                          aria-label="筛选当前菜单子项"
                        />
                      </div>
                      {filteredSubGroups.length === 0 ? (
                        <p className={`px-2 py-2 text-xs ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                          无匹配项
                        </p>
                      ) : (
                        filteredSubGroups.map((group) => (
                          <div key={group.title} className="mb-1">
                            <div
                              className={`mx-1 px-2 py-1 rounded-lg ${theme === 'light' ? 'bg-slate-200/40' : 'bg-white/5'}`}
                            >
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider ${
                                  theme === 'light' ? 'text-slate-500' : 'text-slate-500'
                                }`}
                              >
                                {group.title}
                              </span>
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {group.items.map((subItem: { id: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }) => {
                                const isSubActive = activeSubItem === subItem.id;
                                const SubIcon = subItem.icon;
                                return (
                                  <button
                                    key={subItem.id}
                                    type="button"
                                    onClick={() => handleSubItemClick(subItem.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors text-left ${
                                      fontSize === 'small' ? 'text-xs' : 'text-sm'
                                    } ${
                                      isSubActive
                                        ? theme === 'light'
                                          ? `bg-white shadow-none font-semibold ${THEME_COLOR_CLASSES[themeColor].text} border border-slate-200/80`
                                          : `bg-white/10 font-semibold text-white border-l-2 ${accentBorder}`
                                        : theme === 'light'
                                          ? 'text-slate-600 hover:bg-slate-200/50 font-medium border border-transparent'
                                          : 'text-slate-300 hover:bg-white/5 font-medium border border-transparent'
                                    }`}
                                  >
                                    <SubIcon size={14} strokeWidth={isSubActive ? 2.5 : 2} className="shrink-0 opacity-80" />
                                    <span className="truncate">{subItem.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          ref={userMenuRef}
          className={`p-4 border-t transition-colors relative ${
            theme === 'light' ? 'border-slate-200' : 'border-white/10'
          }`}
        >
          <AnimatePresence>
            {showUserMenu && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={`absolute bottom-full left-4 right-4 mb-2 p-2 rounded-2xl border shadow-2xl z-50 ${
                  theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#1C1C1E] border-white/10'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <button 
                    type="button"
                    onClick={() => {
                      navigate(buildPath('user', 'profile'));
                      if (layoutIsAdmin) setRole('user');
                      setShowUserMenu(false);
                      setShowAppearanceMenu(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${
                      page === 'profile'
                        ? `${THEME_COLOR_CLASSES[themeColor].bg} text-white shadow-sm`
                        : theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <User size={16} />
                    <span>个人主页</span>
                  </button>

                  <div className="rounded-xl overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => setShowAppearanceMenu((v) => !v)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] transition-all ${
                        theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Palette size={16} className="shrink-0" />
                        <span className="truncate text-left">外观与主题</span>
                      </span>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-slate-400 transition-transform duration-200 ${showAppearanceMenu ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        showAppearanceMenu ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div
                          className={`mt-1 pt-2 border-t max-h-[min(70vh,420px)] overflow-y-auto custom-scrollbar ${
                            theme === 'light' ? 'border-slate-100' : 'border-white/10'
                          }`}
                        >
                          <AppearanceMenu
                            embedded
                            theme={theme}
                            setTheme={handleSetTheme}
                            themeColor={themeColor}
                            setThemeColor={handleSetThemeColor}
                            fontSize={fontSize}
                            setFontSize={handleSetFontSize}
                            fontFamily={fontFamily}
                            setFontFamily={handleSetFontFamily}
                            animationStyle={animationStyle}
                            setAnimationStyle={handleSetAnimationStyle}
                            onReset={handleReset}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      if (layoutIsAdmin) setRole('user');
                      navigate(buildPath('user', 'profile'));
                      setShowUserMenu(false);
                      setShowAppearanceMenu(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${
                      activeSidebar === 'user-settings'
                        ? `${THEME_COLOR_CLASSES[themeColor].bg} text-white shadow-sm`
                        : theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <Settings size={16} />
                    <span>设置</span>
                  </button>

                  <div className={`h-px my-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-white/5'}`} />

                  <button 
                    type="button"
                    onClick={() => {
                      const newRole = role === 'admin' ? 'user' : 'admin';
                      setRole(newRole);
                      const next: ConsoleRole = newRole === 'admin' ? 'admin' : 'user';
                      navigate(defaultPath(next));
                      setShowUserMenu(false);
                      setShowAppearanceMenu(false);
                      showMessage(`已切换到${newRole === 'admin' ? '管理员' : '普通用户'}视图`, 'success');
                    }}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${
                      theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'
                    }`}
                    title="切换角色视图（开发调试用）"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      {role === 'admin' ? (
                        <Shield size={16} className="shrink-0" />
                      ) : (
                        <UserCog size={16} className="shrink-0" />
                      )}
                      <span className="truncate">
                        {role === 'admin' ? '管理员视图' : '用户视图'}
                      </span>
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md shrink-0 ${
                      role === 'admin' 
                        ? (theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400')
                        : (theme === 'light' ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/20 text-purple-400')
                    }`}>
                      {role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </button>

                  <div className={`h-px my-1 ${theme === 'light' ? 'bg-slate-100' : 'bg-white/5'}`} />

                  <button 
                    type="button"
                    onClick={() => setIsLoggedIn(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all text-red-500 hover:bg-red-500/10`}
                  >
                    <LogOut size={16} />
                    <span>退出登录</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showMessagePanel && (
              <MessagePanel
                theme={theme}
                onClose={() => setShowMessagePanel(false)}
                onUnreadChange={setMessageUnreadCount}
              />
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setShowMessagePanel(false);
                setShowUserMenu((open) => {
                  const next = !open;
                  if (!next) setShowAppearanceMenu(false);
                  return next;
                });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowMessagePanel(false);
                  setShowUserMenu((open) => {
                    const next = !open;
                    if (!next) setShowAppearanceMenu(false);
                    return next;
                  });
                }
              }}
              className={`flex flex-1 items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all min-w-0 ${
                theme === 'light' ? 'hover:bg-slate-200/50' : 'hover:bg-white/5'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                W
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">User Name</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 truncate">Free Plan</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    role === 'admin' 
                      ? (theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/20 text-blue-400')
                      : (theme === 'light' ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/20 text-purple-400')
                  }`}>
                    {role === 'admin' ? '管理员' : '用户'}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMessagePanel((v) => !v);
                setShowUserMenu(false);
                setShowAppearanceMenu(false);
              }}
              className={`relative p-2 rounded-xl transition-colors shrink-0 ${
                theme === 'light' ? 'hover:bg-slate-200/50 text-slate-600' : 'hover:bg-white/10 text-slate-400'
              } ${showMessagePanel ? (theme === 'light' ? 'bg-slate-200/50' : 'bg-white/10') : ''}`}
              aria-label="消息中心"
              title="消息中心"
            >
              <Bell size={20} strokeWidth={2} />
              {messageUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold">
                  {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile/Narrow Sidebar - Icon only */}
      <aside
        className={`flex-shrink-0 w-16 flex lg:hidden flex-col border-r transition-all duration-300 ${
          theme === 'light' ? 'bg-[#F2F2F7] border-slate-200' : 'bg-[#0A0A0A] border-white/10'
        }`}
      >
        <div className="h-14 flex items-center justify-center w-full">
          <button
            type="button"
            onClick={() => handleSidebarClick(layoutIsAdmin ? 'overview' : 'workspace')}
            className="rounded-xl hover:opacity-90 active:opacity-80 transition-opacity"
            title={layoutIsAdmin ? '系统概览' : '工作台'}
          >
            <Logo compact theme={theme} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pt-2 flex flex-col items-center gap-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSidebarClick(item.id)}
              className={`p-3 rounded-xl transition-all ${
                activeSidebar === item.id
                  ? `${THEME_COLOR_CLASSES[themeColor].bg} text-white shadow-md`
                  : theme === 'light'
                    ? 'text-slate-500 hover:bg-slate-200'
                    : 'text-slate-400 hover:bg-white/10'
              }`}
              title={item.label}
            >
              <item.icon size={20} />
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-transparent flex justify-center">
          <button 
            onClick={() => navigate(buildPath('user', 'profile'))}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
          >
            W
          </button>
        </div>
      </aside>


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <main
          className="flex-1 flex flex-col relative min-h-0"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={contentKey}
              variants={getAnimationVariants()}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col min-w-0 min-h-[600px] overflow-hidden"
              style={{ willChange: 'opacity, transform' }}
            >
              <MainContent
                page={page}
                routeId={routeId}
                layoutIsAdmin={layoutIsAdmin}
                theme={theme}
                themeColor={themeColor}
                fontSize={fontSize}
                showMessage={showMessage}
                navigateTo={navigateTo}
                setShowUserMenu={setShowUserMenu}
                setShowAppearanceMenu={setShowAppearanceMenu}
              />
            </motion.div>
          </AnimatePresence>

        </main>
      </div>
    </div>
    </LayoutChromeProvider>
  );
};
