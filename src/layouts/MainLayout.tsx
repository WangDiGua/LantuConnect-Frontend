import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Zap,
  ChevronDown,
  ChevronRight,
  History,
  Paperclip,
  Image as ImageIcon,
  User,
  Mic,
  Send,
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
  SIDEBAR_ITEMS,
  ADMIN_SIDEBAR_ITEMS,
  USER_SIDEBAR_ITEMS,
  DASHBOARD_GROUPS, 
  AGENT_MANAGEMENT_GROUPS,
  AGENT_WORKSPACE_SUBITEM_ID,
  MONITORING_GROUPS, 
  SYSTEM_CONFIG_GROUPS, 
  USER_MANAGEMENT_GROUPS, 
  MODEL_SERVICE_GROUPS,
  TOOL_SQUARE_GROUPS,
  // 管理员菜单组
  ADMIN_OVERVIEW_GROUPS,
  ADMIN_SYSTEM_CONFIG_GROUPS,
  ADMIN_USER_MANAGEMENT_GROUPS,
  ADMIN_MODEL_SERVICE_GROUPS,
  ADMIN_TOOL_MANAGEMENT_GROUPS,
  ADMIN_MONITORING_GROUPS,
  ADMIN_DATA_MANAGEMENT_GROUPS,
  ADMIN_SYSTEM_LOG_GROUPS,
  ADMIN_OPS_SECURITY_GROUPS,
  ADMIN_INTEGRATION_GROUPS,
  USER_WORKSPACE_GROUPS,
  USER_AGENT_MANAGEMENT_GROUPS,
  USER_ASSETS_GROUPS,
  USER_MODEL_SERVICE_GROUPS,
  USER_TOOL_SQUARE_GROUPS,
  USER_DATA_GROUPS,
  USER_SETTINGS_GROUPS,
  USER_WORKFLOW_GROUPS,
  USER_PUBLISH_GROUPS,
  USER_USAGE_GROUPS,
  getNavSubGroups,
} from '../constants/navigation';
import { SidebarItem, SidebarGroup } from '../components/layout/Sidebar';
import { AppearanceMenu } from '../components/business/AppearanceMenu';
import { MessagePanel, INITIAL_MESSAGE_UNREAD_COUNT } from '../components/business/MessagePanel';
// 懒加载大型组件以优化初始加载性能
const AIAssistant = lazy(() => import('../views/agent/AIAssistant').then(m => ({ default: m.AIAssistant })));
const ToolMarketModule = lazy(() => import('../views/tools/ToolMarketModule').then(m => ({ default: m.ToolMarketModule })));
const AgentMonitoringPage = lazy(() => import('../views/agent/AgentMonitoringPage').then(m => ({ default: m.AgentMonitoringPage })));
const AgentTracePage = lazy(() => import('../views/agent/AgentTracePage').then(m => ({ default: m.AgentTracePage })));
const Overview = lazy(() => import('../views/dashboard/Overview').then(m => ({ default: m.Overview })));
const QuickAccess = lazy(() => import('../views/dashboard/QuickAccess').then(m => ({ default: m.QuickAccess })));
const AgentList = lazy(() => import('../views/agent/AgentList').then(m => ({ default: m.AgentList })));
const AgentDetail = lazy(() => import('../views/agent/AgentDetail').then(m => ({ default: m.AgentDetail })));
const AgentCreate = lazy(() => import('../views/agent/AgentCreate').then(m => ({ default: m.AgentCreate })));
const AgentMarket = lazy(() => import('../views/agent/AgentMarket').then(m => ({ default: m.AgentMarket })));
const UserProfile = lazy(() => import('../views/user/UserProfile').then(m => ({ default: m.UserProfile })));
const UserSettingsPage = lazy(() => import('../views/user/UserSettingsPage').then(m => ({ default: m.UserSettingsPage })));
const DocsTutorialPage = lazy(() => import('../views/docs/DocsTutorialPage').then(m => ({ default: m.DocsTutorialPage })));
const PlaceholderView = lazy(() => import('../views/common/PlaceholderView').then(m => ({ default: m.PlaceholderView })));
const UserManagementModule = lazy(() => import('../views/userMgmt/UserManagementModule').then(m => ({ default: m.UserManagementModule })));
const SystemConfigModule = lazy(() => import('../views/systemConfig/SystemConfigModule').then(m => ({ default: m.SystemConfigModule })));
const MonitoringModule = lazy(() => import('../views/monitoring/MonitoringModule').then(m => ({ default: m.MonitoringModule })));
const KnowledgeBase = lazy(() => import('../views/knowledge/KnowledgeBase').then(m => ({ default: m.KnowledgeBase })));
const Database = lazy(() => import('../views/database/Database').then(m => ({ default: m.Database })));
const RecentProjectsPage = lazy(() => import('../views/userApp/RecentProjectsPage').then(m => ({ default: m.RecentProjectsPage })));
const WorkflowUserModule = lazy(() => import('../views/userApp/WorkflowUserModule').then(m => ({ default: m.WorkflowUserModule })));
const PublishConnectUserModule = lazy(() => import('../views/userApp/PublishConnectUserModule').then(m => ({ default: m.PublishConnectUserModule })));
const UsageBillingUserModule = lazy(() => import('../views/userApp/UsageBillingUserModule').then(m => ({ default: m.UsageBillingUserModule })));
const DataEvalUserModule = lazy(() => import('../views/userApp/DataEvalUserModule').then(m => ({ default: m.DataEvalUserModule })));
const ModelServiceUserModule = lazy(() => import('../views/userApp/ModelServiceUserModule').then(m => ({ default: m.ModelServiceUserModule })));
const AssetsExtrasUserModule = lazy(() => import('../views/userApp/AssetsExtrasUserModule').then(m => ({ default: m.AssetsExtrasUserModule })));
const AgentExtrasUserModule = lazy(() => import('../views/userApp/AgentExtrasUserModule').then(m => ({ default: m.AgentExtrasUserModule })));
const UserSettingsExtrasModule = lazy(() => import('../views/userApp/UserSettingsExtrasModule').then(m => ({ default: m.UserSettingsExtrasModule })));
const AdminOverviewModule = lazy(() => import('../views/adminApp/AdminOverviewModule').then(m => ({ default: m.AdminOverviewModule })));
const AdminModelServiceModule = lazy(() => import('../views/adminApp/AdminModelServiceModule').then(m => ({ default: m.AdminModelServiceModule })));
const AdminToolManagementModule = lazy(() => import('../views/adminApp/AdminToolManagementModule').then(m => ({ default: m.AdminToolManagementModule })));
const AdminOpsSecurityModule = lazy(() => import('../views/adminApp/AdminOpsSecurityModule').then(m => ({ default: m.AdminOpsSecurityModule })));
const AdminIntegrationModule = lazy(() => import('../views/adminApp/AdminIntegrationModule').then(m => ({ default: m.AdminIntegrationModule })));
const AdminDataManagementModule = lazy(() => import('../views/adminApp/AdminDataManagementModule').then(m => ({ default: m.AdminDataManagementModule })));
const AdminSystemLogModule = lazy(() => import('../views/adminApp/AdminSystemLogModule').then(m => ({ default: m.AdminSystemLogModule })));

import { Logo } from '../components/common/Logo';
import { MessageProvider, useMessage } from '../components/common/Message';
import {
  getFirstSubItemForSidebar,
  readPersistedNavState,
  writePersistedNavState,
} from '../utils/navigationState';
import { readAppearanceState, writeAppearanceState } from '../utils/appearanceState';
import { toolbarSearchInputClass } from '../utils/toolbarFieldClasses';
import { ConsoleHomeRedirect } from '../router/ConsoleHomeRedirect';
import {
  buildConsolePath,
  defaultConsolePath,
  isValidConsolePath,
  parseConsoleRole,
  type ConsoleRole,
} from '../constants/consoleRoutes';
import { ROUTE_ROOT_SUB } from '../constants/routeRoot';
import { ContentLoader } from '../components/common/ContentLoader';

export const MainLayout: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => readAppearanceState().theme);

  return (
    <MessageProvider theme={theme}>
      <UserRoleProvider initialRole="admin">
        <Routes>
          <Route path="/" element={<ConsoleHomeRedirect />} />
          <Route path="/c/:role/:sidebar/:sub" element={<MainLayoutContent theme={theme} setTheme={setTheme} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UserRoleProvider>
    </MessageProvider>
  );
};

const MainLayoutContent: React.FC<{ theme: Theme; setTheme: (t: Theme) => void }> = ({ theme, setTheme }) => {
  const params = useParams<{ role: string; sidebar: string; sub: string }>();
  const navigate = useNavigate();
  const { showMessage } = useMessage();
  const { isAdmin: ctxAdmin, role, setRole } = useUserRole();
  const routeRoleResolved = parseConsoleRole(params.role);
  const layoutIsAdmin = routeRoleResolved !== null ? routeRoleResolved === 'admin' : ctxAdmin;

  const getConsoleRole = useCallback((): ConsoleRole => {
    return routeRoleResolved ?? (ctxAdmin ? 'admin' : 'user');
  }, [routeRoleResolved, ctxAdmin]);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [persistedNav] = useState(() => readPersistedNavState());
  const [activeTab, setActiveTab] = useState('智能调度');
  const [activeSidebar, setActiveSidebar] = useState(persistedNav.activeSidebar);
  const [activeSubItem, setActiveSubItem] = useState(persistedNav.activeSubItem);
  const [activeAgentSubItem, setActiveAgentSubItem] = useState(persistedNav.activeAgentSubItem);
  const [activeAgentView, setActiveAgentView] = useState<'list' | 'detail' | 'create'>(persistedNav.activeAgentView);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(persistedNav.selectedAgentId);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  /** 当前主菜单下子项快速过滤（应用型目录检索） */
  const [sidebarNavFilter, setSidebarNavFilter] = useState('');

  useLayoutEffect(() => {
    const r = parseConsoleRole(params.role);
    const sb = params.sidebar;
    const tb = params.sub;
    if (r == null || sb === undefined || tb === undefined) return;
    if (!isValidConsolePath(r, sb, tb)) {
      navigate(defaultConsolePath(r), { replace: true });
      return;
    }
    const want = r === 'admin' ? 'admin' : 'user';
    if (role !== want) setRole(want);
    setActiveSidebar(sb);
    if (sb === '我的 Agent') {
      setActiveAgentSubItem(tb);
    } else {
      setActiveSubItem(tb);
    }
    const g = getNavSubGroups(sb, r === 'admin');
    setExpandedGroups(g.length > 0 ? [sb] : []);
  }, [params.role, params.sidebar, params.sub, navigate, setRole, role]);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => readAppearanceState().themeColor);
  const [fontSize, setFontSize] = useState<FontSize>(() => readAppearanceState().fontSize);
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => readAppearanceState().fontFamily);
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>(() => readAppearanceState().animationStyle);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMessagePanel, setShowMessagePanel] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(INITIAL_MESSAGE_UNREAD_COUNT);

  useEffect(() => {
    writePersistedNavState({
      activeSidebar,
      activeSubItem,
      activeAgentSubItem,
      activeAgentView,
      selectedAgentId,
    });
  }, [activeSidebar, activeSubItem, activeAgentSubItem, activeAgentView, selectedAgentId]);

  useEffect(() => {
    setSidebarNavFilter('');
  }, [activeSidebar]);

  useEffect(() => {
    writeAppearanceState({
      theme,
      themeColor,
      fontSize,
      fontFamily,
      animationStyle,
    });
  }, [theme, themeColor, fontSize, fontFamily, animationStyle]);

  /** 全站 rem 基准：使 Tailwind/Daisy 的 text-sm、间距等随「字号」外观联动 */
  useEffect(() => {
    document.documentElement.style.fontSize = getRootFontSizePx(fontSize);
  }, [fontSize]);

  // 树形结构后，不再需要次级侧栏
  const hasSecondarySidebar = false;

  // 根据用户角色获取菜单项
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
    writeAppearanceState({
      theme: 'light',
      themeColor: 'blue',
      fontSize: 'medium',
      fontFamily: 'sans',
      animationStyle: 'fade',
    });
    showMessage('外观设置已恢复默认', 'info');
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      // 如果点击的是已展开的目录，则收起；否则收起其他目录，展开当前目录
      if (prev.includes(id)) {
        return prev.filter((g) => g !== id);
      } else {
        // 只保留当前目录展开，收起其他所有目录
        return [id];
      }
    });
  };

  const getSubGroupsForSidebar = (sidebarId: string) => getNavSubGroups(sidebarId, layoutIsAdmin);

  const getAnimationVariants = () => {
    switch (animationStyle) {
      case 'slide':
        return {
          initial: { opacity: 0, x: -20 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 20 },
        };
      case 'zoom':
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.05 },
        };
      case 'skew':
        return {
          initial: { opacity: 0, skewX: -10, x: -20 },
          animate: { opacity: 1, skewX: 0, x: 0 },
          exit: { opacity: 0, skewX: 10, x: 20 },
        };
      case 'flip':
        return {
          initial: { opacity: 0, rotateY: 90 },
          animate: { opacity: 1, rotateY: 0 },
          exit: { opacity: 0, rotateY: -90 },
        };
      case 'rotate':
        return {
          initial: { opacity: 0, rotate: -10, scale: 0.9 },
          animate: { opacity: 1, rotate: 0, scale: 1 },
          exit: { opacity: 0, rotate: 10, scale: 1.1 },
        };
      default: // fade
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };

  const handleSidebarClick = (id: string) => {
    setActiveAgentView('list');
    setSelectedAgentId(null);
    const first = getFirstSubItemForSidebar(id);
    const third = first.agentSubItem ?? first.subItem ?? ROUTE_ROOT_SUB;
    navigate(buildConsolePath(getConsoleRole(), id, third));
  };

  const handleSubItemClick = (id: string) => {
    setActiveAgentView('list');
    setSelectedAgentId(null);
    navigate(buildConsolePath(getConsoleRole(), activeSidebar, id));
  };

  const handleAgentSubItemClick = (id: string) => {
    setActiveAgentView('list');
    setSelectedAgentId(null);
    navigate(buildConsolePath(getConsoleRole(), '我的 Agent', id));
  };

  const renderSidebarContent = () => {
    let groups: any[] = [];
    let activeItem = activeSubItem;
    let setActive = handleSubItemClick;
    let prefix = '';

    if (layoutIsAdmin) {
      if (activeSidebar === '系统概览') { groups = ADMIN_OVERVIEW_GROUPS; prefix = 'admin-overview-'; }
      else if (activeSidebar === '系统配置') { groups = ADMIN_SYSTEM_CONFIG_GROUPS; prefix = 'admin-sys-'; }
      else if (activeSidebar === '用户管理') { groups = ADMIN_USER_MANAGEMENT_GROUPS; prefix = 'admin-user-'; }
      else if (activeSidebar === '模型服务管理') { groups = ADMIN_MODEL_SERVICE_GROUPS; prefix = 'admin-model-'; }
      else if (activeSidebar === '工具管理') { groups = ADMIN_TOOL_MANAGEMENT_GROUPS; prefix = 'admin-tool-'; }
      else if (activeSidebar === '运营与安全') { groups = ADMIN_OPS_SECURITY_GROUPS; prefix = 'admin-ops-'; }
      else if (activeSidebar === '集成与中台') { groups = ADMIN_INTEGRATION_GROUPS; prefix = 'admin-integ-'; }
      else if (activeSidebar === '监控中心') { groups = ADMIN_MONITORING_GROUPS; prefix = 'admin-mon-'; }
      else if (activeSidebar === '数据管理') { groups = ADMIN_DATA_MANAGEMENT_GROUPS; prefix = 'admin-data-'; }
      else if (activeSidebar === '系统日志') { groups = ADMIN_SYSTEM_LOG_GROUPS; prefix = 'admin-log-'; }
    } else {
      if (activeSidebar === '工作台') { groups = USER_WORKSPACE_GROUPS; prefix = 'user-workspace-'; }
      else if (activeSidebar === '我的 Agent') { groups = USER_AGENT_MANAGEMENT_GROUPS; activeItem = activeAgentSubItem; setActive = handleAgentSubItemClick; prefix = 'user-agent-'; }
      else if (activeSidebar === '工作流') { groups = USER_WORKFLOW_GROUPS; prefix = 'user-flow-'; }
      else if (activeSidebar === '我的资产') { groups = USER_ASSETS_GROUPS; prefix = 'user-assets-'; }
      else if (activeSidebar === '模型服务') { groups = USER_MODEL_SERVICE_GROUPS; prefix = 'user-model-'; }
      else if (activeSidebar === '工具广场') { groups = USER_TOOL_SQUARE_GROUPS; prefix = 'user-tool-'; }
      else if (activeSidebar === '发布与连接') { groups = USER_PUBLISH_GROUPS; prefix = 'user-pub-'; }
      else if (activeSidebar === '我的数据') { groups = USER_DATA_GROUPS; prefix = 'user-data-'; }
      else if (activeSidebar === '用量账单') { groups = USER_USAGE_GROUPS; prefix = 'user-usage-'; }
      else if (activeSidebar === '个人设置') { groups = USER_SETTINGS_GROUPS; prefix = 'user-settings-'; }
    }

    // 兼容旧版本菜单
    if (groups.length === 0) {
      if (activeSidebar === '概览' || activeSidebar === '快捷入口' || activeSidebar === 'AI 助手' || activeSidebar === '文档教程') { 
        groups = []; 
      }
      else if (activeSidebar === 'Agent 管理') { 
        groups = AGENT_MANAGEMENT_GROUPS; 
        activeItem = activeAgentSubItem; 
        setActive = handleAgentSubItemClick; 
        prefix = 'agent-'; 
      }
      else if (activeSidebar === '监控中心') { groups = MONITORING_GROUPS; prefix = 'mon-'; }
      else if (activeSidebar === '系统配置') { groups = SYSTEM_CONFIG_GROUPS; prefix = 'sys-'; }
      else if (activeSidebar === '用户管理') { groups = USER_MANAGEMENT_GROUPS; prefix = 'user-'; }
      else if (activeSidebar === '模型服务') { groups = MODEL_SERVICE_GROUPS; prefix = 'model-'; }
      else if (activeSidebar === '工具广场') { groups = TOOL_SQUARE_GROUPS; prefix = 'tool-'; }
    }

    if (groups.length === 0) return null;

    return (
      <div className="px-2">
        {groups.map((group) => (
          <div key={group.title} className="mb-3">
            {/* 分组标题：小号、浅色、仅作分类，不折叠 */}
            <div className="w-full flex items-center px-3 pt-0.5 pb-1">
              <span
                className={`font-medium uppercase tracking-wider transition-all ${
                  theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                } ${fontSize === 'small' ? 'text-[0.5625rem]' : fontSize === 'medium' ? 'text-[0.625rem]' : 'text-xs'}`}
              >
                {group.title}
              </span>
            </div>
            {/* 子目录：始终展开，字号与权重明显大于标题 */}
            {group.items && group.items.length > 0 && (
              <div className="space-y-0.5">
                {group.items.map((item: any) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActive(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left ${
                      fontSize === 'small' ? 'text-xs' : fontSize === 'medium' ? 'text-sm' : 'text-base'
                    } ${
                      activeItem === item.id
                        ? theme === 'light'
                          ? 'bg-white shadow-sm text-blue-600 font-semibold'
                          : 'bg-white/10 text-white font-semibold'
                        : theme === 'light'
                          ? 'text-slate-700 hover:bg-slate-200/40 font-medium'
                          : 'text-slate-300 hover:bg-white/5 font-medium'
                    }`}
                  >
                    <item.icon size={14} strokeWidth={activeItem === item.id ? 2.5 : 2} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 使用 useMemo 优化内容 key，只包含真正影响内容的状态
  const contentKey = useMemo(() => {
    // 只包含真正影响内容的状态
    const parts: string[] = [activeSidebar];
    if (activeSidebar === '我的 Agent' || activeSidebar === 'Agent 管理') {
      parts.push(activeAgentSubItem || '');
      if (activeAgentSubItem === AGENT_WORKSPACE_SUBITEM_ID) {
        parts.push(activeAgentView);
        if (selectedAgentId) parts.push(selectedAgentId);
      }
    } else {
      parts.push(activeSubItem || '');
    }
    return parts.filter(Boolean).join('|');
  }, [activeSidebar, activeSubItem, activeAgentSubItem, activeAgentView, selectedAgentId]);

  // 提取内容渲染逻辑为独立组件，使用 React.memo 优化
  const MainContent = React.memo<{
    activeSidebar: string;
    activeSubItem: string;
    activeAgentSubItem: string;
    activeAgentView: 'list' | 'detail' | 'create';
    selectedAgentId: string | null;
    layoutIsAdmin: boolean;
    theme: Theme;
    themeColor: ThemeColor;
    fontSize: FontSize;
    showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    setActiveAgentView: (view: 'list' | 'detail' | 'create') => void;
    setSelectedAgentId: (id: string | null) => void;
    setShowUserMenu: (show: boolean) => void;
    setShowAppearanceMenu: (show: boolean) => void;
  }>(({
    activeSidebar,
    activeSubItem,
    activeAgentSubItem,
    activeAgentView,
    selectedAgentId,
    layoutIsAdmin,
    theme,
    themeColor,
    fontSize,
    showMessage,
    setActiveAgentView,
    setSelectedAgentId,
    setShowUserMenu,
    setShowAppearanceMenu,
  }) => {
    const content = (() => {
      // ==================== 管理员菜单内容 ====================
      if (layoutIsAdmin) {
        if (activeSidebar === '系统概览') {
          if (activeSubItem === '系统概览') {
            return <Overview theme={theme} fontSize={fontSize} />;
          }
          return (
            <AdminOverviewModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '运营与安全') {
          return (
            <AdminOpsSecurityModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '集成与中台') {
          return (
            <AdminIntegrationModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '系统配置') {
          return <SystemConfigModule activeSubItem={activeSubItem} theme={theme} fontSize={fontSize} showMessage={showMessage} />;
        }

        if (activeSidebar === '用户管理') {
          return <UserManagementModule activeSubItem={activeSubItem} theme={theme} fontSize={fontSize} showMessage={showMessage} />;
        }

        if (activeSidebar === '模型服务管理') {
          return (
            <AdminModelServiceModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '工具管理') {
          return (
            <AdminToolManagementModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '监控中心') {
          return <MonitoringModule activeSubItem={activeSubItem} theme={theme} fontSize={fontSize} showMessage={showMessage} />;
        }

        if (activeSidebar === '数据管理') {
          return (
            <AdminDataManagementModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '系统日志') {
          return (
            <AdminSystemLogModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }
      }

      // ==================== 普通用户菜单内容 ====================
      if (!layoutIsAdmin) {
        if (activeSidebar === '工作台') {
          if (activeSubItem === '概览') {
            return <Overview theme={theme} fontSize={fontSize} />;
          }
          if (activeSubItem === '快捷入口') {
            return <QuickAccess theme={theme} fontSize={fontSize} />;
          }
          if (activeSubItem === '最近项目') {
            return (
              <RecentProjectsPage theme={theme} fontSize={fontSize} showMessage={showMessage} />
            );
          }
          return <PlaceholderView title={activeSubItem || '工作台'} theme={theme} fontSize={fontSize} />;
        }

        if (activeSidebar === '工作流') {
          return (
            <WorkflowUserModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '发布与连接') {
          return (
            <PublishConnectUserModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              themeColor={themeColor}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '用量账单') {
          return (
            <UsageBillingUserModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === 'AI 助手') {
          return <AIAssistant theme={theme} fontSize={fontSize} />;
        }

        if (activeSidebar === '我的 Agent') {
          if (activeAgentSubItem === AGENT_WORKSPACE_SUBITEM_ID) {
            if (activeAgentView === 'detail' && selectedAgentId) {
              return (
                <AgentDetail 
                  agentId={selectedAgentId} 
                  theme={theme} 
                  fontSize={fontSize} 
                  onBack={() => setActiveAgentView('list')} 
                />
              );
            }
            if (activeAgentView === 'create') {
              return (
                <AgentCreate 
                  theme={theme} 
                  fontSize={fontSize} 
                  onBack={() => setActiveAgentView('list')}
                  onSuccess={(id) => {
                    setSelectedAgentId(id);
                    setActiveAgentView('detail');
                    showMessage('Agent 创建成功！', 'success');
                  }}
                />
              );
            }
            return (
              <AgentList 
                theme={theme} 
                fontSize={fontSize} 
                onViewDetail={(id) => {
                  setSelectedAgentId(id);
                  setActiveAgentView('detail');
                }}
                onCreateAgent={() => setActiveAgentView('create')}
              />
            );
          }
          if (activeAgentSubItem === 'Agent 市场') {
            return (
              <AgentMarket
                theme={theme}
                fontSize={fontSize}
                themeColor={themeColor}
                showMessage={showMessage}
              />
            );
          }
          if (activeAgentSubItem === 'Agent监控') {
            return <AgentMonitoringPage theme={theme} fontSize={fontSize} />;
          }
          if (activeAgentSubItem === 'Trace追踪') {
            return <AgentTracePage theme={theme} fontSize={fontSize} />;
          }
          if (
            activeAgentSubItem === '对话流编排' ||
            activeAgentSubItem === '版本与发布' ||
            activeAgentSubItem === '我的应用' ||
            activeAgentSubItem === '调试会话'
          ) {
            return (
              <AgentExtrasUserModule
                activeAgentSubItem={activeAgentSubItem}
                theme={theme}
                fontSize={fontSize}
                showMessage={showMessage}
                agentId={selectedAgentId}
              />
            );
          }
          return <PlaceholderView title={activeAgentSubItem || '我的 Agent'} theme={theme} fontSize={fontSize} />;
        }

        if (activeSidebar === '我的资产') {
          if (activeSubItem === '知识库') {
            return (
              <KnowledgeBase
                theme={theme}
                fontSize={fontSize}
                themeColor={themeColor}
                showMessage={showMessage}
              />
            );
          }
          if (activeSubItem === '数据库') {
            return (
              <Database
                theme={theme}
                fontSize={fontSize}
                themeColor={themeColor}
                showMessage={showMessage}
              />
            );
          }
          return (
            <AssetsExtrasUserModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '模型服务') {
          return (
            <ModelServiceUserModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '工具广场') {
          return (
            <ToolMarketModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '我的数据') {
          return (
            <DataEvalUserModule
              activeSubItem={activeSubItem}
              theme={theme}
              fontSize={fontSize}
              showMessage={showMessage}
            />
          );
        }

        if (activeSidebar === '个人设置') {
          if (activeSubItem === '个人资料') {
            return <UserProfile theme={theme} fontSize={fontSize} />;
          }
          if (activeSubItem === '偏好设置') {
            return (
              <UserSettingsPage
                theme={theme}
                fontSize={fontSize}
                themeColor={themeColor}
                showMessage={showMessage}
                onOpenAppearance={() => {
                  setShowUserMenu(true);
                  setShowAppearanceMenu(true);
                }}
              />
            );
          }
          if (activeSubItem === '工作空间' || activeSubItem === 'API Key' || activeSubItem === '使用统计') {
            return (
              <UserSettingsExtrasModule
                activeSubItem={activeSubItem}
                theme={theme}
                fontSize={fontSize}
                showMessage={showMessage}
              />
            );
          }
          return <PlaceholderView title={activeSubItem || '个人设置'} theme={theme} fontSize={fontSize} />;
        }

        if (activeSidebar === '文档教程') {
          return <DocsTutorialPage theme={theme} fontSize={fontSize} />;
        }
      }

      // ==================== 兼容旧版本菜单 ====================
      if (activeSidebar === '概览') {
        return <Overview theme={theme} fontSize={fontSize} />;
      }

      if (activeSidebar === '快捷入口') {
        return <QuickAccess theme={theme} fontSize={fontSize} />;
      }

      if (activeSidebar === 'AI 助手') {
        return <AIAssistant theme={theme} fontSize={fontSize} />;
      }

      if (activeSidebar === 'Agent 管理' && activeAgentSubItem === AGENT_WORKSPACE_SUBITEM_ID) {
        if (activeAgentView === 'detail' && selectedAgentId) {
          return (
            <AgentDetail 
              agentId={selectedAgentId} 
              theme={theme} 
              fontSize={fontSize} 
              onBack={() => setActiveAgentView('list')} 
            />
          );
        }
        if (activeAgentView === 'create') {
          return (
            <AgentCreate 
              theme={theme} 
              fontSize={fontSize} 
              onBack={() => setActiveAgentView('list')}
              onSuccess={(id) => {
                setSelectedAgentId(id);
                setActiveAgentView('detail');
                showMessage('Agent 创建成功！', 'success');
              }}
            />
          );
        }
        return (
          <AgentList 
            theme={theme} 
            fontSize={fontSize} 
            onViewDetail={(id) => {
              setSelectedAgentId(id);
              setActiveAgentView('detail');
            }}
            onCreateAgent={() => setActiveAgentView('create')}
          />
        );
      }

      if (activeSidebar === 'Agent 管理' && activeAgentSubItem === 'Agent 市场') {
        return (
          <AgentMarket
            theme={theme}
            fontSize={fontSize}
            themeColor={themeColor}
            showMessage={showMessage}
          />
        );
      }

      if (activeSidebar === 'Agent 管理' && activeAgentSubItem === '知识库') {
        return (
          <KnowledgeBase
            theme={theme}
            fontSize={fontSize}
            themeColor={themeColor}
            showMessage={showMessage}
          />
        );
      }

      if (activeSidebar === 'Agent 管理' && activeAgentSubItem === '数据库') {
        return (
          <Database
            theme={theme}
            fontSize={fontSize}
            themeColor={themeColor}
            showMessage={showMessage}
          />
        );
      }

      if (activeSidebar === 'Agent 管理' && activeAgentSubItem === 'Agent监控') {
        return <AgentMonitoringPage theme={theme} fontSize={fontSize} />;
      }

      if (activeSidebar === 'Agent 管理' && activeAgentSubItem === 'Trace追踪') {
        return <AgentTracePage theme={theme} fontSize={fontSize} />;
      }

      if (activeSidebar === '工具广场') {
        return (
          <ToolMarketModule
            activeSubItem={activeSubItem}
            theme={theme}
            fontSize={fontSize}
            showMessage={showMessage}
          />
        );
      }

      if (activeSidebar === '个人中心') {
        return <UserProfile theme={theme} fontSize={fontSize} />;
      }

      if (activeSidebar === '个人设置') {
        return (
          <UserSettingsPage
            theme={theme}
            fontSize={fontSize}
            themeColor={themeColor}
            showMessage={showMessage}
            onOpenAppearance={() => {
              setShowUserMenu(true);
              setShowAppearanceMenu(true);
            }}
          />
        );
      }

      if (activeSidebar === '文档教程') {
        return <DocsTutorialPage theme={theme} fontSize={fontSize} />;
      }

      if (activeSidebar === '用户管理') {
        return (
          <UserManagementModule
            activeSubItem={activeSubItem}
            theme={theme}
            fontSize={fontSize}
            showMessage={showMessage}
          />
        );
      }

      if (activeSidebar === '系统配置') {
        return (
          <SystemConfigModule
            activeSubItem={activeSubItem}
            theme={theme}
            fontSize={fontSize}
            showMessage={showMessage}
          />
        );
      }

      if (activeSidebar === '监控中心') {
        return (
          <MonitoringModule
            activeSubItem={activeSubItem}
            theme={theme}
            fontSize={fontSize}
            showMessage={showMessage}
          />
        );
      }

      return <PlaceholderView title={activeSidebar} theme={theme} fontSize={fontSize} />;
    })();

    return (
      <Suspense fallback={<ContentLoader theme={theme} />}>
        {content}
      </Suspense>
    );
  }, (prevProps, nextProps) => {
    // 自定义比较函数，只在真正影响内容的状态变化时重新渲染
    return (
      prevProps.activeSidebar === nextProps.activeSidebar &&
      prevProps.activeSubItem === nextProps.activeSubItem &&
      prevProps.activeAgentSubItem === nextProps.activeAgentSubItem &&
      prevProps.activeAgentView === nextProps.activeAgentView &&
      prevProps.selectedAgentId === nextProps.selectedAgentId &&
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
            onClick={() => handleSidebarClick(layoutIsAdmin ? '系统概览' : '工作台')}
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

                {hasSubItems && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pl-3 pr-2 pt-1 pb-2 space-y-1">
                      {item.id === activeSidebar && (
                        <div className="relative px-1 mb-2">
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
                      )}
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
                                const isSubActive =
                                  (item.id === '我的 Agent' && activeAgentSubItem === subItem.id) ||
                                  (item.id !== '我的 Agent' && activeSubItem === subItem.id);
                                const handleSubClick = () => {
                                  if (item.id === '我的 Agent') {
                                    handleAgentSubItemClick(subItem.id);
                                  } else {
                                    handleSubItemClick(subItem.id);
                                  }
                                };
                                const SubIcon = subItem.icon;
                                return (
                                  <button
                                    key={subItem.id}
                                    type="button"
                                    onClick={handleSubClick}
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
                  </motion.div>
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
                    onClick={() => { handleSidebarClick('个人中心'); setShowUserMenu(false); setShowAppearanceMenu(false); }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${
                      activeSidebar === '个人中心'
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

                    <AnimatePresence initial={false}>
                      {showAppearanceMenu && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      if (layoutIsAdmin) setRole('user');
                      const first = getFirstSubItemForSidebar('个人设置');
                      const sub = first.subItem ?? ROUTE_ROOT_SUB;
                      navigate(buildConsolePath('user', '个人设置', sub));
                      setShowUserMenu(false);
                      setShowAppearanceMenu(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${
                      activeSidebar === '个人设置'
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
                      navigate(defaultConsolePath(next));
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
            onClick={() => handleSidebarClick(layoutIsAdmin ? '系统概览' : '工作台')}
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
            onClick={() => setActiveSidebar('个人中心')}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
          >
            W
          </button>
        </div>
      </aside>


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <main
          className={`flex-1 flex flex-col relative min-h-0 ${
            activeSidebar === 'AI 助手' ? (theme === 'light' ? 'bg-[#F2F2F7]' : 'bg-[#000000]') : ''
          }`}
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
                activeSidebar={activeSidebar}
                activeSubItem={activeSubItem}
                activeAgentSubItem={activeAgentSubItem}
                activeAgentView={activeAgentView}
                selectedAgentId={selectedAgentId}
                layoutIsAdmin={layoutIsAdmin}
                theme={theme}
                themeColor={themeColor}
                fontSize={fontSize}
                showMessage={showMessage}
                setActiveAgentView={setActiveAgentView}
                setSelectedAgentId={setSelectedAgentId}
                setShowUserMenu={setShowUserMenu}
                setShowAppearanceMenu={setShowAppearanceMenu}
              />
            </motion.div>
          </AnimatePresence>

          {/* Input Area - iOS Messages Style */}
          {activeSidebar === 'AI 助手' && (
            <div className="p-4 sm:p-6 max-w-4xl w-full mx-auto">
              <div className={`relative flex flex-col rounded-2xl border transition-all focus-within:ring-1 focus-within:ring-offset-0 ${THEME_COLOR_CLASSES[themeColor].ring} ${
                theme === 'light' 
                  ? `bg-[#F2F2F7] border-slate-200 focus-within:${THEME_COLOR_CLASSES[themeColor].border}` 
                  : `bg-[#1C1C1E] border-white/10 focus-within:${THEME_COLOR_CLASSES[themeColor].border}`
              }`}>
                <textarea 
                  placeholder="输入问题或指令..."
                  className="w-full bg-transparent p-4 pb-12 resize-none outline-none leading-relaxed min-h-[100px] text-base transition-all"
                ></textarea>
                
                <div className="absolute bottom-3 left-3 flex items-center gap-1">
                  <button className={`p-2 rounded-full transition-colors ${
                    theme === 'light' ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/10'
                  }`}>
                    <Paperclip size={18} />
                  </button>
                  <button className={`p-2 rounded-full transition-colors ${
                    theme === 'light' ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/10'
                  }`}>
                    <ImageIcon size={18} />
                  </button>
                  <button className={`p-2 rounded-full transition-colors ${
                    theme === 'light' ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/10'
                  }`}>
                    <User size={18} />
                  </button>
                </div>

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button className={`p-2 rounded-full transition-colors ${
                    theme === 'light' ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/10'
                  }`}>
                    <Mic size={18} />
                  </button>
                  <button className={`w-8 h-8 ${THEME_COLOR_CLASSES[themeColor].bg} rounded-full flex items-center justify-center text-white shadow-sm hover:opacity-90 transition-colors`}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 flex justify-center items-center gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>额度: <span className={`${theme === 'light' ? 'text-slate-600' : 'text-slate-300'} font-semibold`}>99/100</span></span>
                </div>
                <span>•</span>
                <span className="hover:text-blue-600 cursor-pointer transition-colors">定制咨询</span>
                <span>•</span>
                <span className="italic opacity-60">AI 生成内容仅供参考</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
    </LayoutChromeProvider>
  );
};
