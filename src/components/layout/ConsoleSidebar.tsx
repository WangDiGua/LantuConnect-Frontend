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
  /** 含「应用/工作台」「平台管理」分区与 domain */
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
  /** 仅抽屉打开时注册 ⌘/Ctrl+K，避免与桌面 Hub 个人轨重复聚焦 */
  enableMenuSearchHotkey?: boolean;
  /**
   * 是否显示侧栏顶部品牌区（Logo）。与全局顶栏并存时（如管理端桌面左侧轨）可关闭，避免重复。
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
  showBrandHeader = true,
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {showBrandHeader && (
        <div className="px-4 mt-2 mb-3">
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

      {/* 顶部用户区（与 HubPersonalRail / 产品稿图二一致）；账户菜单下拉 */}
      <div className={`relative shrink-0 ${showBrandHeader ? 'px-4 pb-3' : 'p-4 pb-3'}`} ref={userMenuRef}>
        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
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
          aria-expanded={showUserMenu}
          aria-haspopup="menu"
          aria-label={`账户：${displayUserName}，${PLATFORM_ROLE_LABELS[platformRole]}`}
          className={`group/profile flex w-full min-w-0 items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
            isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
          }`}
        >
          <AvatarGradientFrame
            isDark={isDark}
            className="group-hover/profile:shadow-[0_0_18px_-4px_rgba(56,189,248,0.4)] group-hover/profile:brightness-[1.05] motion-reduce:group-hover/profile:shadow-none motion-reduce:group-hover/profile:brightness-100"
          >
            <MultiAvatar
              seed={avatarSeed}
              alt={displayUserName}
              className="h-11 w-11 block shrink-0 rounded-full object-cover"
            />
          </AvatarGradientFrame>
          <div className="min-w-0 flex-1">
            <div className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {displayUserName}
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <span
                className={`inline-flex max-w-full shrink truncate rounded-md border px-2 py-0.5 text-[11px] font-medium leading-tight tabular-nums ${
                  isDark
                    ? 'border-white/12 bg-white/[0.08] text-slate-300'
                    : 'border-slate-200/80 bg-slate-100/90 text-slate-600'
                }`}
                title={PLATFORM_ROLE_LABELS[platformRole]}
              >
                {PLATFORM_ROLE_LABELS[platformRole]}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            </div>
          </div>
        </button>
      </div>

      {/* Menu Search：与 Hub 一致 mx-3 mb-2 */}
      <div className="mx-3 mb-2 shrink-0">
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
      <nav className={`flex-1 overflow-y-auto space-y-1.5 custom-scrollbar px-3 pb-4 ${mainScrollCompositorClass}`}>
        {navRenderRows.map((row) => {
          if (row.kind === 'section') {
            const isAdminCap = row.label === '管理端';
            return (
              <div
                key={row.label}
                className={`flex items-center gap-2.5 px-0.5 ${isAdminCap ? 'my-4' : 'mb-3'}`}
                role="separator"
                aria-label={row.label}
              >
                <div
                  className={`h-px min-w-[1rem] flex-1 ${
                    isDark
                      ? 'bg-gradient-to-r from-transparent to-white/[0.22]'
                      : 'bg-gradient-to-r from-transparent to-slate-400/55'
                  }`}
                  aria-hidden
                />
                <span
                  className={`max-w-[12rem] shrink-0 text-center text-[10px] font-bold uppercase leading-none tracking-wider ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {row.label}
                </span>
                <div
                  className={`h-px min-w-[1rem] flex-1 ${
                    isDark
                      ? 'bg-gradient-to-l from-transparent to-white/[0.22]'
                      : 'bg-gradient-to-l from-transparent to-slate-400/55'
                  }`}
                  aria-hidden
                />
              </div>
            );
          }
          const { item, hasChildren, visibleChildren: children } = row;
          const isExpanded = normalizedQuery ? true : expandedGroups.includes(item.id);
          const isChildActive = hasChildren && activeSidebar === item.id && routeRole === item.domain;
          const isSelfActive = !hasChildren && activeSidebar === item.id && routeRole === item.domain;

          return (
            <div key={`${item.domain}-${item.id}`} className="mb-1">
              <div className="rounded-lg border border-transparent">
              <button
                type="button"
                aria-expanded={hasChildren ? isExpanded : undefined}
                onClick={() =>
                  hasChildren
                    ? onToggleGroup(item.id)
                    : onSidebarClick(item.id, item.domain)
                }
                className={`group/item flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                  isDark ? 'focus-visible:ring-offset-lantu-surface' : 'focus-visible:ring-offset-transparent'
                } ${
                  isSelfActive
                    ? isDark
                      ? 'bg-white/10 font-medium text-slate-100'
                      : 'bg-slate-100 font-medium text-slate-900'
                    : isChildActive
                      ? isDark
                        ? 'font-medium text-slate-100'
                        : 'font-medium text-slate-900'
                      : isDark
                        ? 'font-semibold text-slate-200 hover:bg-white/[0.06]'
                        : 'font-semibold text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <item.icon
                    size={16}
                    strokeWidth={2}
                    className={`h-4 w-4 shrink-0 opacity-90 ${
                      isSelfActive || isChildActive
                        ? isDark
                          ? 'text-slate-300'
                          : 'text-slate-600'
                        : isDark
                          ? 'text-slate-300'
                          : 'text-slate-600'
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
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
                          ? 'text-slate-400'
                          : 'text-slate-400'
                    }`}
                  />
                ) : (
                  <ChevronRight
                    size={14}
                    aria-hidden
                    className={`shrink-0 opacity-40 ${
                      isSelfActive || isChildActive
                        ? isDark
                          ? 'text-slate-200'
                          : 'text-slate-600'
                        : ''
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
                      <ul className="space-y-0.5 pb-2 pl-1">
                        {children.map((subItem) => {
                          const subActive =
                            activeSubItem === subItem.id && activeSidebar === item.id && routeRole === item.domain;
                          return (
                          <li key={subItem.id}>
                          <button
                            type="button"
                            onClick={() => onSubItemClick(subItem.id, item.id, item.domain)}
                            aria-current={subActive ? 'page' : undefined}
                            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                              subActive
                                ? isDark
                                  ? 'bg-white/10 font-medium text-slate-100'
                                  : 'bg-slate-100 font-medium text-slate-900'
                                : isDark
                                  ? 'text-slate-300 hover:bg-white/[0.06]'
                                  : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <subItem.icon
                              className="h-4 w-4 shrink-0 opacity-90"
                              strokeWidth={2}
                              aria-hidden
                            />
                            <span className="inline-flex min-w-0 flex-1 flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{subItem.label}</span>
                                {subItem.tag && (
                                  <span
                                    className={`shrink-0 text-[10px] font-bold px-1.5 py-px rounded-md ${
                                      isDark
                                        ? 'bg-white/[0.08] text-slate-200 border border-white/[0.12]'
                                        : 'bg-[#F2F4F7] text-[#111827] border border-slate-400/40'
                                    }`}
                                  >
                                    {subItem.tag}
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                          </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
              </div>
            </div>
          );
        })}
        {navItems.length === 0 && normalizedQuery && (
          <div className="px-2 py-5 text-center text-xs text-slate-400">
            未找到匹配菜单
          </div>
        )}
      </nav>
    </div>
  );
};
