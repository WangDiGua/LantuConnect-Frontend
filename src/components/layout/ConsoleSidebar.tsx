import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, LogOut, Search, Command, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from '../../types';
import { iconMuted, mainScrollCompositorClass } from '../../utils/uiClasses';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import type { PlatformRoleCode } from '../../types/dto/auth';
import { PLATFORM_ROLE_LABELS } from '../../constants/platformRoles';
import { Logo } from '../common/Logo';
import { AvatarGradientFrame, MultiAvatar } from '../common/MultiAvatar';

type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

interface SubGroup {
  title: string;
  items: Array<{ id: string; label: string; icon: IconComponent; tag?: string }>;
}

/** 统一控制台侧栏：分区标题 + 带路由域的菜单项（同一壳内可点进 /user 或 /admin） */
export type ConsoleSidebarRow =
  | { kind: 'section'; label: string }
  | { kind: 'item'; id: string; icon: IconComponent; label: string; domain: ConsoleRole };

export interface ConsoleSidebarProps {
  theme: Theme;
  /** 当前 URL 所在域，用于高亮与角色徽标旁注 */
  routeRole: ConsoleRole;
  activeSidebar: string;
  activeSubItem: string;
  /** 含「使用端」「管理端」分区与 domain */
  sidebarRows: ConsoleSidebarRow[];
  expandedGroups: string[];
  platformRole: PlatformRoleCode;
  displayUserName: string;
  avatarSeed: string;
  onSidebarClick: (id: string, domain: ConsoleRole) => void;
  onSubItemClick: (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => void;
  onToggleGroup: (id: string) => void;
  onNavigateToProfile: () => void;
  onLogout: () => void;
  /** 点击品牌区回到当前身份目录首页 */
  onLogoClick?: () => void;
  filteredSubGroupsForSidebarId: (id: string, domain: ConsoleRole) => SubGroup[];
  enableMenuSearchHotkey?: boolean;
  /**
   * 侧栏顶部是否显示 Logo。产品稿侧栏为「头像 + 搜索 + 菜单」，默认不显示，与顶栏 Nexus 品牌区二选一。
   */
  showBrandHeader?: boolean;
}

export const ConsoleSidebar: React.FC<ConsoleSidebarProps> = ({
  theme,
  routeRole,
  activeSidebar,
  activeSubItem,
  sidebarRows,
  expandedGroups,
  platformRole,
  displayUserName,
  avatarSeed,
  onSidebarClick,
  onSubItemClick,
  onToggleGroup,
  onNavigateToProfile,
  onLogout,
  onLogoClick,
  filteredSubGroupsForSidebarId,
  enableMenuSearchHotkey = false,
  showBrandHeader = false,
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
    const itemRows = sidebarRows.filter((r): r is Extract<ConsoleSidebarRow, { kind: 'item' }> => r.kind === 'item');
    return itemRows
      .map((item) => {
        const allChildren = filteredSubGroupsForSidebarId(item.id, item.domain).flatMap((g) => g.items);
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
      .filter((v): v is { item: Extract<ConsoleSidebarRow, { kind: 'item' }>; hasChildren: boolean; visibleChildren: SubGroup['items'] } => !!v);
  }, [filteredSubGroupsForSidebarId, normalizedQuery, sidebarRows]);

  const navItemStateByKey = useMemo(() => {
    const m = new Map<string, (typeof navItems)[number]>();
    for (const n of navItems) {
      m.set(`${n.item.domain}-${n.item.id}`, n);
    }
    return m;
  }, [navItems]);

  type NavRenderRow =
    | { kind: 'section'; label: string }
    | {
        kind: 'block';
        item: Extract<ConsoleSidebarRow, { kind: 'item' }>;
        hasChildren: boolean;
        visibleChildren: SubGroup['items'];
      };

  const navRenderRows = useMemo((): NavRenderRow[] => {
    if (normalizedQuery) {
      return navItems.map((n) => ({ kind: 'block' as const, ...n }));
    }
    const out: NavRenderRow[] = [];
    for (const row of sidebarRows) {
      if (row.kind === 'section') {
        out.push({ kind: 'section', label: row.label });
        continue;
      }
      const state = navItemStateByKey.get(`${row.domain}-${row.id}`);
      if (state) out.push({ kind: 'block', ...state });
    }
    return out;
  }, [normalizedQuery, navItems, sidebarRows, navItemStateByKey]);

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
    if (!enableMenuSearchHotkey) return;
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
  }, [menuQuery, enableMenuSearchHotkey]);

  const userCard = (
    <div className="mb-4 shrink-0 relative" ref={userMenuRef}>
      <AnimatePresence>
        {showUserMenu && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`absolute left-0 right-0 top-full z-50 mt-2 rounded-lg border p-1.5 shadow-lg ${
              isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(false);
                onNavigateToProfile();
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-inset ${
                isDark ? 'text-slate-200 hover:bg-white/[0.08]' : 'text-slate-800 hover:bg-slate-100'
              }`}
            >
              <User size={15} className="shrink-0 opacity-90" />
              个人资料
            </button>
            <div className={`mx-2 my-1 h-px ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200/80'}`} aria-hidden />
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-500 hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/45 focus-visible:ring-inset"
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
        className={`group/user flex w-full items-center gap-3 rounded-xl border-0 bg-transparent p-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transition-none ${
          isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-200/60'
        }`}
        aria-expanded={showUserMenu}
        aria-haspopup="menu"
      >
        <AvatarGradientFrame
          isDark={isDark}
          className="group-hover/user:shadow-[0_0_16px_-4px_rgba(56,189,248,0.42)] group-hover/user:brightness-[1.06] motion-reduce:group-hover/user:shadow-none motion-reduce:group-hover/user:brightness-100"
        >
          <MultiAvatar
            seed={avatarSeed}
            alt={displayUserName}
            className="h-9 w-9 block shrink-0 rounded-full object-cover"
          />
        </AvatarGradientFrame>
        <div className="flex-1 text-left overflow-hidden min-w-0">
          <div
            className={`text-[13px] font-bold truncate leading-tight transition-colors ${
              isDark
                ? 'text-slate-200 group-hover/user:text-neutral-300'
                : 'text-slate-800 group-hover/user:text-neutral-900'
            }`}
          >
            {displayUserName}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap ${
                isDark
                  ? 'bg-sky-500/15 text-sky-200 border border-sky-500/25'
                  : 'bg-sky-50 text-sky-800 border border-sky-200/80'
              }`}
            >
              {PLATFORM_ROLE_LABELS[platformRole]}
            </span>
          </div>
        </div>
        <ChevronRight
          size={16}
          className={`shrink-0 transition-transform ${showUserMenu ? 'rotate-90' : ''} ${
            isDark
              ? 'text-slate-500 group-hover/user:text-slate-300'
              : 'text-slate-400 group-hover/user:text-slate-600'
          }`}
          aria-hidden
        />
      </button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {showBrandHeader && (
        <div className="px-2 mt-2 mb-4">
          {onLogoClick ? (
            <button
              type="button"
              onClick={onLogoClick}
              className={`logo-nav-btn w-full rounded-lg border-0 bg-transparent p-0 text-left outline-none ring-0 shadow-none transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${
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
      )}

      {userCard}

      <div className={`mb-4 shrink-0 ${showBrandHeader ? '' : ''}`}>
        <div
          className={[
            'relative flex h-9 w-full items-center rounded-full px-3',
            'transition-all duration-200 ease-out group',
            searchFocused
              ? isDark
                ? 'border border-transparent bg-white/10 shadow-[0_0_0_2px_rgba(96,165,250,0.35)]'
                : 'border border-transparent bg-white shadow-[0_0_0_2px_rgba(9,9,11,0.1)]'
              : isDark
                ? 'border border-transparent bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] hover:bg-white/[0.09]'
                : 'border border-transparent bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] hover:bg-white',
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
                  ? `${iconMuted(theme)} group-hover:text-slate-300`
                  : `${iconMuted(theme)} group-hover:text-gray-600`,
            ].join(' ')}
            aria-hidden
          />
          <input
            ref={searchInputRef}
            type="text"
            name="lantu-console-menu-filter"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
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
                      : 'border border-gray-200/80 bg-gray-50 text-gray-500 shadow-sm',
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

      <nav
        className={`flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1 pb-2 ${mainScrollCompositorClass}`}
        aria-label="控制台菜单"
      >
        {navRenderRows.map((row) => {
          if (row.kind === 'section') {
            return (
              <div
                key={row.label}
                className="flex items-center gap-2 px-1 pt-4 pb-1 first:pt-1"
                role="presentation"
              >
                <div className={`h-px min-w-[12px] flex-1 ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200/90'}`} />
                <span className="shrink-0 text-[10px] font-medium tracking-wide text-slate-400">{row.label}</span>
                <div className={`h-px min-w-[12px] flex-1 ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200/90'}`} />
              </div>
            );
          }
          const { item, hasChildren, visibleChildren: children } = row;
          const isExpanded = normalizedQuery ? true : expandedGroups.includes(item.id);
          const isChildActive = hasChildren && activeSidebar === item.id && routeRole === item.domain;
          const isSelfActive = !hasChildren && activeSidebar === item.id && routeRole === item.domain;

          return (
            <div key={`${item.domain}-${item.id}`} className="mb-0.5">
              <button
                type="button"
                aria-expanded={hasChildren ? isExpanded : undefined}
                onClick={() =>
                  hasChildren ? onToggleGroup(item.id) : onSidebarClick(item.id, item.domain)
                }
                className={`group/item flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                  isDark ? 'focus-visible:ring-offset-lantu-surface' : 'focus-visible:ring-offset-gray-100'
                } ${
                  isSelfActive
                    ? isDark
                      ? 'bg-white/10 text-slate-100 shadow-[0_1px_6px_rgba(0,0,0,0.2)]'
                      : 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                    : isChildActive
                      ? isDark
                        ? 'text-slate-100'
                        : 'text-slate-900'
                      : isDark
                        ? 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                        : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon
                    size={18}
                    className={
                      isSelfActive || isChildActive
                        ? isDark
                          ? 'text-neutral-300 shrink-0'
                          : 'text-neutral-900 shrink-0'
                        : isDark
                          ? 'text-slate-400 group-hover/item:text-slate-300 shrink-0'
                          : 'text-slate-500 group-hover/item:text-slate-700 shrink-0'
                    }
                  />
                  <span
                    className={`text-[14px] truncate ${
                      isSelfActive || isChildActive ? 'font-semibold' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {hasChildren ? (
                  <ChevronDown
                    size={14}
                    aria-hidden
                    className={`shrink-0 transition-transform duration-200 ${
                      isExpanded
                        ? isDark
                          ? 'rotate-180 text-neutral-300'
                          : 'rotate-180 text-neutral-800'
                        : isDark
                          ? 'text-slate-500'
                          : 'text-slate-400'
                    }`}
                  />
                ) : (
                  <ChevronRight
                    size={14}
                    aria-hidden
                    className={`shrink-0 ${
                      isSelfActive
                        ? isDark
                          ? 'text-slate-300'
                          : 'text-slate-500'
                        : isDark
                          ? 'text-slate-500'
                          : 'text-slate-300'
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
                            isDark ? 'bg-white/10' : 'bg-slate-200/70'
                          }`}
                        />
                        {children.map((subItem) => {
                          const subActive =
                            activeSubItem === subItem.id &&
                            activeSidebar === item.id &&
                            routeRole === item.domain;
                          return (
                            <button
                              key={subItem.id}
                              type="button"
                              onClick={() => onSubItemClick(subItem.id, item.id, item.domain)}
                              className={`flex w-full items-start gap-2 text-left px-3 py-2 text-[13px] rounded-lg transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-inset ${
                                subActive
                                  ? isDark
                                    ? 'bg-white/10 text-neutral-300 font-semibold'
                                    : 'bg-slate-100/90 text-neutral-900 font-semibold'
                                  : isDark
                                    ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                              }`}
                            >
                              {subActive && (
                                <div
                                  className={`absolute left-[-20px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-neutral-800 ring-4 ${
                                    isDark ? 'ring-lantu-chrome' : 'ring-gray-100'
                                  }`}
                                />
                              )}
                              <subItem.icon
                                size={15}
                                strokeWidth={2}
                                className={`mt-0.5 shrink-0 ${
                                  subActive
                                    ? isDark
                                      ? 'text-sky-300/95'
                                      : 'text-sky-600'
                                    : isDark
                                      ? 'text-slate-500'
                                      : 'text-slate-400'
                                }`}
                                aria-hidden
                              />
                              <span className="inline-flex min-w-0 flex-1 flex-col items-start gap-1">
                                <span className="inline-flex items-center gap-1.5 flex-wrap">
                                  <span>{subItem.label}</span>
                                  {subItem.tag && (
                                    <span
                                      className={`shrink-0 text-[10px] font-bold px-1.5 py-px rounded-md ${
                                        isDark
                                          ? 'bg-white/[0.08] text-slate-200 border border-white/[0.12]'
                                          : 'bg-slate-100 text-[#111827] border border-slate-300/50'
                                      }`}
                                    >
                                      {subItem.tag}
                                    </span>
                                  )}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}
        {navItems.length === 0 && normalizedQuery && (
          <div className="px-2 py-5 text-center text-xs text-slate-400">未找到匹配菜单</div>
        )}
      </nav>
    </div>
  );
};
