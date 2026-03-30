import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Box, Cpu, MoreVertical, LogOut, Search, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from '../../types';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import type { PlatformRoleCode } from '../../types/dto/auth';
import { Logo } from '../common/Logo';
import { MultiAvatar } from '../common/MultiAvatar';

type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

interface SubGroup {
  title: string;
  items: Array<{ id: string; label: string; icon: IconComponent }>;
}

export interface ConsoleSidebarProps {
  theme: Theme;
  layoutIsAdmin: boolean;
  consoleRole: ConsoleRole;
  activeSidebar: string;
  activeSubItem: string;
  sidebarItems: Array<{ id: string; icon: IconComponent; label: string }>;
  expandedGroups: string[];
  canAccessAdmin: boolean;
  platformRole: PlatformRoleCode;
  displayUserName: string;
  avatarSeed: string;
  onSidebarClick: (id: string) => void;
  onSubItemClick: (subItemId: string, parentSidebarId: string) => void;
  onToggleGroup: (id: string) => void;
  onSwitchMode: (role: ConsoleRole) => void;
  onUserCardClick: () => void;
  onNavigateToProfile: () => void;
  onLogout: () => void;
  /** 点击品牌区回到当前身份目录首页 */
  onLogoClick?: () => void;
  filteredSubGroupsForSidebarId: (id: string) => SubGroup[];
}

const ROLE_LABELS: Record<PlatformRoleCode, string> = {
  platform_admin: '超级管理员',
  dept_admin: '部门管理员',
  developer: '开发者',
  user: '用户',
  unassigned: '待入驻用户',
};

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  theme,
  layoutIsAdmin,
  activeSidebar,
  activeSubItem,
  sidebarItems,
  expandedGroups,
  canAccessAdmin,
  platformRole,
  displayUserName,
  avatarSeed,
  onSidebarClick,
  onSubItemClick,
  onToggleGroup,
  onSwitchMode,
  onUserCardClick,
  onNavigateToProfile,
  onLogout,
  onLogoClick,
  filteredSubGroupsForSidebarId,
}) => {
  const isDark = theme === 'dark';
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuQuery, setMenuQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform),
    [],
  );
  const normalizedQuery = menuQuery.trim().toLowerCase();

  const navItems = useMemo(() => {
    return sidebarItems
      .map((item) => {
        const allChildren = filteredSubGroupsForSidebarId(item.id).flatMap((g) => g.items);
        const hasChildren = allChildren.length > 0;
        const parentMatched = item.label.toLowerCase().includes(normalizedQuery);
        const matchedChildren = normalizedQuery
          ? allChildren.filter((child) => child.label.toLowerCase().includes(normalizedQuery))
          : allChildren;

        if (!normalizedQuery) {
          return {
            item,
            hasChildren,
            visibleChildren: allChildren,
          };
        }

        if (hasChildren) {
          if (!parentMatched && matchedChildren.length === 0) return null;
          return {
            item,
            hasChildren,
            visibleChildren: parentMatched ? allChildren : matchedChildren,
          };
        }

        if (!parentMatched) return null;
        return {
          item,
          hasChildren: false,
          visibleChildren: [],
        };
      })
      .filter((v): v is { item: ConsoleSidebarProps['sidebarItems'][number]; hasChildren: boolean; visibleChildren: SubGroup['items'] } => !!v);
  }, [filteredSubGroupsForSidebarId, normalizedQuery, sidebarItems]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  useEffect(() => {
    const onHotkey = (e: KeyboardEvent) => {
      const isFocusHotkey = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (isFocusHotkey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (menuQuery) setMenuQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onHotkey);
    return () => window.removeEventListener('keydown', onHotkey);
  }, [menuQuery]);

  return (
    <>
      {/* Logo */}
      <div className="px-2 mt-2 mb-8">
        {onLogoClick ? (
          <button
            type="button"
            onClick={onLogoClick}
            className={`logo-nav-btn w-full rounded-xl border-0 bg-transparent p-0 text-left transition-colors outline-none ring-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-200/50'
            }`}
            aria-label="回到首页"
          >
            <Logo followSystemColorScheme={false} theme={theme} />
          </button>
        ) : (
          <Logo followSystemColorScheme={false} theme={theme} />
        )}
      </div>

      {/* Mode Switcher */}
      {canAccessAdmin && (
        <div
          className={`p-1 rounded-[14px] flex mb-6 shrink-0 ${
            isDark ? 'bg-white/[0.06]' : 'bg-slate-200/60'
          }`}
        >
          <button
            type="button"
            onClick={() => onSwitchMode('user')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[13px] font-semibold rounded-[10px] transition-all duration-300 ${
              !layoutIsAdmin
                ? isDark
                  ? 'bg-white/10 text-neutral-300 shadow-sm'
                  : 'bg-white text-neutral-800 shadow-sm'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Box size={14} />
            <span>应用端</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode('admin')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[13px] font-semibold rounded-[10px] transition-all duration-300 ${
              layoutIsAdmin
                ? isDark
                  ? 'bg-white/10 text-slate-200 shadow-sm'
                  : 'bg-white text-slate-800 shadow-sm'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Cpu size={14} />
            <span>管理端</span>
          </button>
        </div>
      )}

      {/* Menu Search：微凹底 + 聚焦抬亮与环，快捷键 Chip 非聚焦显示 */}
      <div className="mb-4 shrink-0">
        <div
          className={[
            'relative flex h-[38px] w-full items-center rounded-[10px] px-3',
            'transition-all duration-200 ease-out group',
            searchFocused
              ? isDark
                ? 'border border-transparent bg-white/10 shadow-[0_0_0_2px_rgba(96,165,250,0.35)]'
                : 'border border-transparent bg-white shadow-[0_0_0_2px_rgba(9,9,11,0.1)]'
              : isDark
                ? 'border border-transparent bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] hover:bg-white/[0.09]'
                : 'border border-transparent bg-gray-100/80 shadow-inner hover:bg-gray-200/50',
          ].join(' ')}
        >
          <Search
            size={15}
            className={[
              'flex-shrink-0 transition-colors duration-200',
              searchFocused
                ? isDark
                  ? 'text-slate-100'
                  : 'text-gray-900'
                : isDark
                  ? 'text-slate-500 group-hover:text-slate-400'
                  : 'text-gray-400 group-hover:text-gray-600',
            ].join(' ')}
            aria-hidden
          />
          <input
            ref={searchInputRef}
            type="text"
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="搜索菜单..."
            className={[
              'flex-1 min-w-0 border-none bg-transparent px-2.5 text-[13px] font-medium outline-none',
              isDark ? 'text-slate-200 placeholder:text-slate-500' : 'text-gray-700 placeholder-gray-400',
            ].join(' ')}
            aria-label="搜索菜单"
          />
          <div
            className={[
              'flex flex-shrink-0 select-none items-center justify-center rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider',
              'transition-all duration-200',
              searchFocused
                ? 'pointer-events-none scale-90 opacity-0'
                : [
                    'scale-100 opacity-100',
                    isDark
                      ? 'border border-white/15 bg-white/10 text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.25),0_1px_0_rgba(0,0,0,0.12)]'
                      : 'border border-gray-200/80 bg-white text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_0_rgba(0,0,0,0.02)]',
                  ].join(' '),
            ].join(' ')}
            aria-hidden
            title={isMac ? '⌘K' : 'Ctrl+K'}
          >
            {isMac ? (
              <span className="flex items-center gap-0.5">
                <Command size={10} strokeWidth={2.5} className="opacity-90" />
                <span>K</span>
              </span>
            ) : (
              <span>Ctrl K</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1 pb-4">
        {navItems.map(({ item, hasChildren, visibleChildren: children }) => {
          const isExpanded = normalizedQuery ? true : expandedGroups.includes(item.id);
          const isChildActive = hasChildren && activeSidebar === item.id;
          const isSelfActive = !hasChildren && activeSidebar === item.id;

          return (
            <div key={item.id} className="mb-1">
              <button
                type="button"
                onClick={() =>
                  hasChildren
                    ? onToggleGroup(item.id)
                    : onSidebarClick(item.id)
                }
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group/item ${
                  isSelfActive
                    ? isDark
                      ? 'bg-white/10 text-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.15)]'
                      : 'bg-white text-slate-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                    : isChildActive
                      ? isDark
                        ? 'text-slate-100'
                        : 'text-slate-900'
                      : isDark
                        ? 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                        : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    size={18}
                    className={
                      isSelfActive || isChildActive
                        ? isDark
                          ? 'text-neutral-300'
                          : 'text-neutral-900'
                        : isDark
                          ? 'text-slate-500 group-hover/item:text-slate-400'
                          : 'text-slate-400 group-hover/item:text-slate-500'
                    }
                  />
                  <span
                    className={`text-[14px] ${
                      isSelfActive || isChildActive
                        ? 'font-semibold'
                        : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {hasChildren && (
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      isExpanded
                        ? isDark
                          ? 'rotate-180 text-neutral-300'
                          : 'rotate-180 text-neutral-800'
                        : isDark
                          ? 'text-slate-500'
                          : 'text-slate-400'
                    }`}
                  />
                )}
              </button>

              {hasChildren && (
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key={`${item.id}-children`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 mb-2 pl-[38px] pr-2 space-y-1 relative">
                        <div
                          className={`absolute left-[20px] top-1 bottom-1 w-px ${
                            isDark ? 'bg-white/10' : 'bg-slate-200/60'
                          }`}
                        />
                        {children.map((subItem) => (
                          <button
                            key={subItem.id}
                            type="button"
                            onClick={() => onSubItemClick(subItem.id, item.id)}
                            className={`w-full text-left px-3 py-2 text-[13px] rounded-lg transition-colors relative ${
                              activeSubItem === subItem.id
                                ? isDark
                                  ? 'bg-white/10 text-neutral-300 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                                  : 'bg-white/60 text-neutral-800 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                                : isDark
                                  ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
                            }`}
                          >
                            {activeSubItem === subItem.id && (
                              <div
                                className={`absolute left-[-20px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-neutral-900 ring-4 ${
                                  isDark
                                    ? 'ring-[#0f1117]'
                                    : 'ring-[#EFEFF1]'
                                }`}
                              />
                            )}
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
        {navItems.length === 0 && normalizedQuery && (
          <div className={`px-2 py-5 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            未找到匹配菜单
          </div>
        )}
      </nav>

      {/* User Card with popup menu */}
      <div className="mt-auto pt-2 shrink-0 relative" ref={userMenuRef}>
        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`absolute bottom-full left-0 right-0 mb-2 rounded-xl border p-1.5 shadow-xl z-50 ${
                isDark ? 'border-white/10 bg-[#1C1C1E]' : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => { setShowUserMenu(false); onLogout(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={15} />
                退出登录
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setShowUserMenu((v) => !v)}
          className={`w-full rounded-[16px] p-2.5 flex items-center gap-3 transition-all group/user ${
            isDark
              ? 'bg-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-white/10 hover:bg-white/[0.1]'
              : 'bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-200/50 hover:shadow-md'
          }`}
        >
          <MultiAvatar
            seed={avatarSeed}
            alt={displayUserName}
            className="w-9 h-9 rounded-xl border border-white/10 shrink-0"
          />
          <div className="flex-1 text-left overflow-hidden">
            <div
              className={`text-[13px] font-bold truncate leading-tight transition-colors ${
                isDark
                  ? 'text-slate-200 group-hover/user:text-neutral-300'
                  : 'text-slate-800 group-hover/user:text-neutral-800'
              }`}
            >
              {displayUserName}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${
                  isDark
                    ? 'bg-neutral-900/10 text-neutral-300 border border-neutral-900/20'
                    : 'bg-neutral-100 text-neutral-900 border border-neutral-200/80'
                }`}
              >
                {ROLE_LABELS[platformRole]}
              </span>
            </div>
          </div>
          <MoreVertical
            size={16}
            className={
              isDark
                ? 'text-slate-500 group-hover/user:text-slate-300'
                : 'text-slate-400 group-hover/user:text-slate-600'
            }
          />
        </button>
      </div>
    </>
  );
};
