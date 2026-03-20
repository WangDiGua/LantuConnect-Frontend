import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { Theme, ThemeColor, FontSize, FontFamily, AnimationStyle } from '../types';
import { FONT_FAMILY_CLASSES, THEME_COLOR_CLASSES, getRootFontSizePx } from '../constants/theme';
import { LayoutChromeProvider } from '../context/LayoutChromeContext';
import { 
  SIDEBAR_ITEMS, 
  DASHBOARD_GROUPS, 
  AGENT_MANAGEMENT_GROUPS,
  AGENT_WORKSPACE_SUBITEM_ID,
  MONITORING_GROUPS, 
  SYSTEM_CONFIG_GROUPS, 
  USER_MANAGEMENT_GROUPS, 
  MODEL_SERVICE_GROUPS,
  TOOL_SQUARE_GROUPS,
} from '../constants/navigation';
import { SidebarItem, SidebarGroup } from '../components/layout/Sidebar';
import { AppearanceMenu } from '../components/business/AppearanceMenu';
import { MessagePanel, INITIAL_MESSAGE_UNREAD_COUNT } from '../components/business/MessagePanel';
import { AIAssistant } from '../views/agent/AIAssistant';
import { ToolMarketModule } from '../views/tools/ToolMarketModule';
import { AgentMonitoringPage } from '../views/agent/AgentMonitoringPage';
import { AgentTracePage } from '../views/agent/AgentTracePage';
import { Overview } from '../views/dashboard/Overview';
import { QuickAccess } from '../views/dashboard/QuickAccess';
import { AgentList } from '../views/agent/AgentList';
import { AgentDetail } from '../views/agent/AgentDetail';
import { AgentCreate } from '../views/agent/AgentCreate';
import { AgentMarket } from '../views/agent/AgentMarket';
import { UserProfile } from '../views/user/UserProfile';
import { UserSettingsPage } from '../views/user/UserSettingsPage';
import { DocsTutorialPage } from '../views/docs/DocsTutorialPage';
import { PlaceholderView } from '../views/common/PlaceholderView';
import { UserManagementModule } from '../views/userMgmt/UserManagementModule';
import { SystemConfigModule } from '../views/systemConfig/SystemConfigModule';
import { MonitoringModule } from '../views/monitoring/MonitoringModule';

import { Logo } from '../components/common/Logo';
import { MessageProvider, useMessage } from '../components/common/Message';
import {
  getFirstSubItemForSidebar,
  readPersistedNavState,
  writePersistedNavState,
} from '../utils/navigationState';
import { readAppearanceState, writeAppearanceState } from '../utils/appearanceState';
import { KnowledgeBase } from '../views/knowledge/KnowledgeBase';
import { Database } from '../views/database/Database';

export const MainLayout: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => readAppearanceState().theme);
  
  return (
    <MessageProvider theme={theme}>
      <MainLayoutContent theme={theme} setTheme={setTheme} />
    </MessageProvider>
  );
};

const MainLayoutContent: React.FC<{ theme: Theme; setTheme: (t: Theme) => void }> = ({ theme, setTheme }) => {
  const { showMessage } = useMessage();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [persistedNav] = useState(() => readPersistedNavState());
  const [activeTab, setActiveTab] = useState('智能调度');
  const [activeSidebar, setActiveSidebar] = useState(persistedNav.activeSidebar);
  const [activeSubItem, setActiveSubItem] = useState(persistedNav.activeSubItem);
  const [activeAgentSubItem, setActiveAgentSubItem] = useState(persistedNav.activeAgentSubItem);
  const [activeAgentView, setActiveAgentView] = useState<'list' | 'detail' | 'create'>(persistedNav.activeAgentView);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(persistedNav.selectedAgentId);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
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

  const hasSecondarySidebar = useMemo(
    () =>
      ['Agent 管理', '监控中心', '系统配置', '用户管理', '模型服务', '工具广场'].includes(activeSidebar),
    [activeSidebar]
  );

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
    setExpandedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

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
    setActiveSidebar(id);
    setActiveAgentView('list');
    setSelectedAgentId(null);
    const first = getFirstSubItemForSidebar(id);
    if (first.agentSubItem) setActiveAgentSubItem(first.agentSubItem);
    if (first.subItem) setActiveSubItem(first.subItem);
  };

  const handleSubItemClick = (id: string) => {
    setActiveSubItem(id);
    setActiveAgentView('list');
    setSelectedAgentId(null);
  };

  const handleAgentSubItemClick = (id: string) => {
    setActiveAgentSubItem(id);
    setActiveAgentView('list');
    setSelectedAgentId(null);
  };

  const renderSidebarContent = () => {
    let groups: any[] = [];
    let activeItem = activeSubItem;
    let setActive = handleSubItemClick;
    let prefix = '';

    if (activeSidebar === '概览' || activeSidebar === '快捷入口') { groups = []; }
    else if (activeSidebar === 'Agent 管理') { groups = AGENT_MANAGEMENT_GROUPS; activeItem = activeAgentSubItem; setActive = handleAgentSubItemClick; prefix = 'agent-'; }
    else if (activeSidebar === '监控中心') { groups = MONITORING_GROUPS; prefix = 'mon-'; }
    else if (activeSidebar === '系统配置') { groups = SYSTEM_CONFIG_GROUPS; prefix = 'sys-'; }
    else if (activeSidebar === '用户管理') { groups = USER_MANAGEMENT_GROUPS; prefix = 'user-'; }
    else if (activeSidebar === '模型服务') { groups = MODEL_SERVICE_GROUPS; prefix = 'model-'; }
    else if (activeSidebar === '工具广场') { groups = TOOL_SQUARE_GROUPS; prefix = 'tool-'; }

    if (groups.length === 0) return null;

    return (
      <div className="px-2">
        {groups.map((group) => (
          <div key={group.title} className="mb-3">
            {/* 分组标题：小号、浅色、仅作分类，不折叠 */}
            <div className="w-full flex items-center px-3 pt-0.5 pb-1">
              <span className={`font-medium uppercase tracking-wider transition-all ${
                theme === 'light' ? 'text-slate-400' : 'text-slate-500'
              } ${fontSize === 'small' ? 'text-[0.5625rem]' : fontSize === 'medium' ? 'text-[0.625rem]' : 'text-xs'}`}>
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
                        ? theme === 'light' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'bg-white/10 text-white font-semibold'
                        : theme === 'light' ? 'text-slate-700 hover:bg-slate-200/40 font-medium' : 'text-slate-300 hover:bg-white/5 font-medium'
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

  const renderMainContent = () => {
    let currentTitle = activeSidebar;
    if (activeSidebar === '模型服务' || activeSidebar === '仪表盘' || activeSidebar === '监控中心' || activeSidebar === '系统配置' || activeSidebar === '用户管理' || activeSidebar === '工具广场') {
      currentTitle = activeSubItem;
    }
    if (activeSidebar === 'Agent 管理') {
      currentTitle = activeAgentSubItem;
    }
    
    const content = (() => {
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

      return <PlaceholderView title={currentTitle} theme={theme} fontSize={fontSize} />;
    })();

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeSidebar}-${activeSubItem}-${activeAgentSubItem}-${activeAgentView}-${selectedAgentId ?? 'none'}`}
          variants={getAnimationVariants()}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  };

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
      <aside className={`flex-shrink-0 w-60 hidden lg:flex flex-col border-r transition-all duration-300 ${
        theme === 'light' ? 'bg-[#F2F2F7] border-slate-200' : 'bg-[#0A0A0A] border-white/10'
      }`}>
        <div className="h-14 flex items-center justify-center px-4 w-full">
          <button
            type="button"
            onClick={() => handleSidebarClick('概览')}
            className="flex items-center justify-center min-w-0 w-full rounded-xl hover:opacity-90 active:opacity-80 transition-opacity"
            title="返回概览"
          >
            <Logo fontSize={fontSize} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pt-2 custom-scrollbar">
          {SIDEBAR_ITEMS.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeSidebar === item.id}
              onClick={() => handleSidebarClick(item.id)}
              theme={theme}
              themeColor={themeColor}
              fontSize={fontSize}
            />
          ))}
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
                    onClick={() => { setActiveSidebar('个人设置'); setShowUserMenu(false); setShowAppearanceMenu(false); }}
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
                <div className="text-[11px] text-slate-500 truncate">Free Plan</div>
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
      <aside className={`flex-shrink-0 w-16 flex lg:hidden flex-col border-r transition-all duration-300 ${
        theme === 'light' ? 'bg-[#F2F2F7] border-slate-200' : 'bg-[#0A0A0A] border-white/10'
      }`}>
        <div className="h-14 flex items-center justify-center w-full">
          <button
            type="button"
            onClick={() => handleSidebarClick('概览')}
            className="rounded-xl hover:opacity-90 active:opacity-80 transition-opacity"
            title="返回概览"
          >
            <Logo compact />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pt-2 flex flex-col items-center gap-2">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSidebarClick(item.id)}
              className={`p-3 rounded-xl transition-all ${
                activeSidebar === item.id 
                  ? `${THEME_COLOR_CLASSES[themeColor].bg} text-white shadow-md` 
                  : theme === 'light' ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-400 hover:bg-white/10'
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

      {/* Secondary Sidebar - Content Specific */}
      {renderSidebarContent() && (
        <aside className={`flex-shrink-0 w-48 sm:w-52 flex flex-col border-r transition-all duration-300 ${
          theme === 'light' ? 'bg-[#F2F2F7] border-slate-200' : 'bg-[#0F0F0F] border-white/5'
        }`}>
          <div className="h-14 flex items-center px-4 border-b border-transparent min-w-0">
            <nav className="flex flex-wrap items-center gap-x-0.5 text-xs sm:text-sm font-medium min-w-0" aria-label="子导航位置">
              <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-500'}>兰智通</span>
              <ChevronRight size={14} className="shrink-0 text-slate-400 opacity-70" aria-hidden />
              <span className={`font-bold truncate ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {activeSidebar}
              </span>
            </nav>
          </div>
          <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
            {renderSidebarContent()}
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Chat/Main View：AI 助手时整块主区与输入区背景一致，避免底部白条 */}
        <main className={`flex-1 flex flex-col relative min-h-0 ${
          activeSidebar === 'AI 助手' ? (theme === 'light' ? 'bg-[#F2F2F7]' : 'bg-[#000000]') : ''
        }`}>
          {renderMainContent()}

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
