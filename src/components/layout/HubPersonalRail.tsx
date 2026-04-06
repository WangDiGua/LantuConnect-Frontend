import React, { useMemo, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Command, LayoutList, LogOut, Search, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Theme } from '../../types';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import type { HubPersonalRailSection } from '../../constants/topNavPolicy';
import { HUB_ADMIN_RAIL_PARENT_IDS, HUB_PERSONAL_RAIL_PARENT_IDS } from '../../constants/topNavPolicy';
import { ADMIN_SIDEBAR_ITEMS, USER_SIDEBAR_ITEMS } from '../../constants/navigation';
import { iconMuted, mainScrollCompositorClass } from '../../utils/uiClasses';
import { AvatarGradientFrame, MultiAvatar } from '../common/MultiAvatar';

export interface HubPersonalRailProps {
  theme: Theme;
  sections: HubPersonalRailSection[];
  displayName: string;
  /** 平台角色文案，以标签样式展示 */
  roleLabel: string;
  avatarSeed: string;
  activeSidebar: string;
  activeSubItem: string;
  routeRole: ConsoleRole;
  onProfileClick: () => void;
  onSubItemClick: (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => void;
  /** 移动抽屉打开时由侧栏接管 ⌘/Ctrl+K，避免双监听 */
  suppressGlobalMenuSearchHotkey?: boolean;
  /** 提供时：头像行展开账户菜单（个人资料 / 退出），用于管理壳固定轨与移动抽屉 */
  onLogout?: () => void | Promise<void>;
  /** 侧栏 `<nav>` 可访问名称；默认「探索首页导航」 */
  ariaLabel?: string;
}

type ParentBlock = {
  key: string;
  parentSidebarId: string;
  parentLabel: string;
  domain: ConsoleRole;
  sections: HubPersonalRailSection[];
};

type RowEntry = { sec: HubPersonalRailSection; row: HubPersonalRailSection['rows'][number] };

function buildParentBlocks(flat: HubPersonalRailSection[]): ParentBlock[] {
  const userLabel: Record<string, string> = Object.fromEntries(
    USER_SIDEBAR_ITEMS.map((i) => [i.id, i.label]),
  );
  const adminLabel: Record<string, string> = Object.fromEntries(
    ADMIN_SIDEBAR_ITEMS.map((i) => [i.id, i.label]),
  );

  const userBlocks: ParentBlock[] = [];
  for (const id of HUB_PERSONAL_RAIL_PARENT_IDS) {
    const subs = flat.filter((s) => s.domain === 'user' && s.parentSidebarId === id);
    if (subs.length === 0) continue;
    userBlocks.push({
      key: `user-${id}`,
      parentSidebarId: id,
      parentLabel: userLabel[id] ?? id,
      domain: 'user',
      sections: subs,
    });
  }

  const adminBlocks: ParentBlock[] = [];
  for (const id of HUB_ADMIN_RAIL_PARENT_IDS) {
    const subs = flat.filter((s) => s.domain === 'admin' && s.parentSidebarId === id);
    if (subs.length === 0) continue;
    adminBlocks.push({
      key: `admin-${id}`,
      parentSidebarId: id,
      parentLabel: adminLabel[id] ?? id,
      domain: 'admin',
      sections: subs,
    });
  }

  return [...userBlocks, ...adminBlocks];
}

export const HubPersonalRail: React.FC<HubPersonalRailProps> = ({
  theme,
  displayName,
  roleLabel,
  avatarSeed,
  sections,
  activeSidebar,
  activeSubItem,
  routeRole,
  onProfileClick,
  onSubItemClick,
  suppressGlobalMenuSearchHotkey = false,
  onLogout,
  ariaLabel,
}) => {
  const isDark = theme === 'dark';
  /** 与探索页画布平接，不用独立浮卡；列级分隔由 ExploreHub 父级 border-r 承担 */
  const shell = 'rounded-none border-0 bg-transparent shadow-none';

  const parentBlocks = useMemo(() => buildParentBlocks(sections), [sections]);

  const [menuQuery, setMenuQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuSearchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchMode = Boolean(menuQuery.trim());

  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform),
    [],
  );

  const filteredBlocks = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    return parentBlocks.flatMap((block) => {
      const allRows: RowEntry[] = block.sections.flatMap((sec) => sec.rows.map((row) => ({ sec, row })));
      const isSingleton = allRows.length === 1;
      if (!q) return [{ block, rowEntries: allRows, isSingleton }];
      const parentMatch = block.parentLabel.toLowerCase().includes(q);
      const rowMatches = (e: RowEntry) => e.row.label.toLowerCase().includes(q);
      if (isSingleton) {
        const ok = parentMatch || rowMatches(allRows[0]);
        if (!ok) return [];
        return [{ block, rowEntries: allRows, isSingleton: true }];
      }
      const matched = allRows.filter(rowMatches);
      if (!parentMatch && matched.length === 0) return [];
      return [{ block, rowEntries: parentMatch ? allRows : matched, isSingleton: false }];
    });
  }, [parentBlocks, menuQuery]);

  /** 与主侧栏一级 id 对齐的语义图标（父级折叠行也展示图标，便于扫读） */
  const parentIconById = useMemo((): Record<string, LucideIcon> => {
    const m: Record<string, LucideIcon> = {};
    for (const i of USER_SIDEBAR_ITEMS) m[i.id] = i.icon;
    for (const i of ADMIN_SIDEBAR_ITEMS) m[i.id] = i.icon;
    return m;
  }, []);

  /** 当前路由对应的左轨一级分组（用于手风琴展开同步） */
  const activeBlockKey = useMemo(() => {
    const b = parentBlocks.find(
      (block) => block.parentSidebarId === activeSidebar && block.domain === routeRole,
    );
    return b?.key ?? null;
  }, [parentBlocks, activeSidebar, routeRole]);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const isParentOpen = useCallback((key: string) => expandedKey === key, [expandedKey]);

  /** 手风琴：同时只展开一个父级；再点同一父级则收起 */
  const toggleParent = (key: string) => {
    setExpandedKey((k) => (k === key ? null : key));
  };

  /** 路由变化时同步手风琴：layout 阶段更新，避免先画错展开态再校正造成闪烁 */
  useLayoutEffect(() => {
    if (searchMode) return;
    setExpandedKey(activeBlockKey);
  }, [activeBlockKey, searchMode]);

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
    if (suppressGlobalMenuSearchHotkey) return;
    const onHotkey = (e: KeyboardEvent) => {
      const isFocusHotkey = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (isFocusHotkey) {
        e.preventDefault();
        menuSearchInputRef.current?.focus();
        menuSearchInputRef.current?.select();
        return;
      }
      if (e.key === 'Escape' && document.activeElement === menuSearchInputRef.current) {
        if (menuQuery) setMenuQuery('');
        menuSearchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onHotkey);
    return () => window.removeEventListener('keydown', onHotkey);
  }, [menuQuery, suppressGlobalMenuSearchHotkey]);

  const navAria = ariaLabel ?? '探索首页导航';

  return (
    <nav
      className={`${shell} flex h-full min-h-0 flex-col ${mainScrollCompositorClass}`}
      aria-label={navAria}
    >
      <div className="relative shrink-0 p-4 pb-3" ref={onLogout ? userMenuRef : undefined}>
        {onLogout ? (
          <>
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
                      onProfileClick();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-inset ${
                      isDark ? 'text-slate-200 hover:bg-white/[0.08]' : 'text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <User size={15} className="shrink-0 opacity-90" aria-hidden />
                    个人资料
                  </button>
                  <div className={`mx-2 my-1 h-px ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200/80'}`} aria-hidden />
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      void onLogout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/45 focus-visible:ring-inset"
                  >
                    <LogOut size={15} aria-hidden />
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
              aria-label={`账户：${displayName}，${roleLabel}`}
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
                  alt={displayName}
                  className="h-11 w-11 block shrink-0 rounded-full object-cover"
                />
              </AvatarGradientFrame>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{displayName}</div>
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  <span
                    className={`inline-flex max-w-full shrink truncate rounded-md border px-2 py-0.5 text-xs font-medium leading-tight tabular-nums ${
                      isDark
                        ? 'border-white/12 bg-white/[0.08] text-slate-300'
                        : 'border-slate-200/80 bg-slate-100/90 text-slate-600'
                    }`}
                    title={roleLabel}
                  >
                    {roleLabel}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                </div>
              </div>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onProfileClick}
            aria-label={`个人资料：${displayName}，${roleLabel}`}
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
                alt={displayName}
                className="h-11 w-11 block shrink-0 rounded-full object-cover"
              />
            </AvatarGradientFrame>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{displayName}</div>
              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                <span
                  className={`inline-flex max-w-full shrink truncate rounded-md border px-2 py-0.5 text-xs font-medium leading-tight tabular-nums ${
                    isDark
                      ? 'border-white/12 bg-white/[0.08] text-slate-300'
                      : 'border-slate-200/80 bg-slate-100/90 text-slate-600'
                  }`}
                  title={roleLabel}
                >
                  {roleLabel}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
              </div>
            </div>
          </button>
        )}
      </div>

      <div
        className={[
          'relative mx-3 mb-2 flex h-9 shrink-0 items-center rounded-full px-3 transition-all duration-200',
          searchFocused
            ? isDark
              ? 'border border-transparent bg-white/10 shadow-[0_0_0_2px_rgba(96,165,250,0.35)]'
              : 'border border-transparent bg-white shadow-[0_0_0_2px_rgba(9,9,11,0.1)]'
            : isDark
              ? 'border border-transparent bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] hover:bg-white/[0.09]'
              : 'border border-transparent bg-slate-100/90 hover:bg-slate-200/60',
        ].join(' ')}
      >
        <Search
          size={15}
          className={[
            'block shrink-0 transition-colors duration-200',
            searchFocused
              ? isDark
                ? 'text-slate-100'
                : 'text-gray-900'
              : iconMuted(theme),
          ].join(' ')}
          aria-hidden
        />
        <input
          ref={menuSearchInputRef}
          type="text"
          name="lantu-console-menu-filter-rail"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          value={menuQuery}
          onChange={(e) => setMenuQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="搜索菜单..."
          className={[
            'min-w-0 flex-1 border-none bg-transparent px-2.5 py-0 text-sm font-medium leading-none outline-none',
            isDark ? 'text-slate-200 placeholder:text-slate-500' : 'text-gray-700 placeholder-gray-400',
          ].join(' ')}
          aria-label="搜索菜单"
        />
        <div
          className={[
            'flex shrink-0 select-none items-center justify-center self-center rounded-[5px] px-1.5 py-0.5 text-xs font-semibold leading-none tracking-wider transition-all duration-200',
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

      <div
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-0 custom-scrollbar ${mainScrollCompositorClass}`}
      >
        <div className="space-y-1">
          {filteredBlocks.length === 0 && searchMode ? (
            <p className="px-1 py-2 text-center text-xs text-slate-400">未找到匹配菜单</p>
          ) : null}
          {filteredBlocks.map((fb, blockIdx) => {
            const { block, rowEntries, isSingleton } = fb;

            const adminDivider =
              blockIdx > 0 &&
              filteredBlocks[blockIdx - 1].block.domain === 'user' &&
              block.domain === 'admin' ? (
                <div
                  className={`my-4 flex items-center gap-2.5 px-0.5`}
                  role="separator"
                  aria-label="以下为平台管理端入口"
                >
                  <div
                    className={`h-px min-w-[1rem] flex-1 ${isDark ? 'bg-gradient-to-r from-transparent to-white/[0.22]' : 'bg-gradient-to-r from-transparent to-slate-400/55'}`}
                    aria-hidden
                  />
                  <span
                    className={`max-w-[12rem] shrink-0 text-center text-xs font-bold uppercase leading-none tracking-wider ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    管理端
                  </span>
                  <div
                    className={`h-px min-w-[1rem] flex-1 ${isDark ? 'bg-gradient-to-l from-transparent to-white/[0.22]' : 'bg-gradient-to-l from-transparent to-slate-400/55'}`}
                    aria-hidden
                  />
                </div>
              ) : null;

            if (isSingleton) {
              const { sec, row } = rowEntries[0];
              const isActive =
                routeRole === sec.domain &&
                activeSidebar === sec.parentSidebarId &&
                activeSubItem === row.subItemId;
              return (
                <div key={block.key}>
                  <div className="rounded-lg border border-transparent">
                    <button
                      type="button"
                      onClick={() => onSubItemClick(row.subItemId, sec.parentSidebarId, sec.domain)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                        isActive
                          ? isDark
                            ? 'bg-white/10 font-medium text-slate-100'
                            : 'bg-slate-100 font-medium text-slate-900'
                          : isDark
                            ? 'text-slate-200 hover:bg-white/[0.06]'
                            : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <row.icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{row.label}</span>
                    </button>
                  </div>
                </div>
              );
            }

            const ParentIcon = parentIconById[block.parentSidebarId] ?? LayoutList;
            const childrenOpen = searchMode || isParentOpen(block.key);
            return (
              <div key={block.key}>
                <div className="border border-transparent">
                  <button
                    type="button"
                    onClick={() => toggleParent(block.key)}
                    aria-expanded={childrenOpen}
                    className={`group/parent flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-semibold tracking-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                      isDark
                        ? 'text-slate-100 hover:bg-white/[0.06]'
                        : 'text-slate-900 hover:bg-slate-100/90'
                    }`}
                  >
                    <ParentIcon
                      className={`h-[18px] w-[18px] shrink-0 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{block.parentLabel}</span>
                    <ChevronDown
                      size={14}
                      aria-hidden
                      className={`shrink-0 opacity-45 transition-[transform,opacity] duration-200 motion-reduce:transition-none group-hover/parent:opacity-75 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      } ${childrenOpen ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>

                  {childrenOpen ? (
                    <ul
                      className={`mb-1.5 mt-0 space-y-0.5 border-l-2 pb-2 pl-3 pr-1 ml-3 ${
                        isDark ? 'border-white/[0.14]' : 'border-slate-300/70'
                      }`}
                      role="list"
                    >
                      {rowEntries.map(({ sec, row }) => {
                        const isActive =
                          routeRole === sec.domain &&
                          activeSidebar === sec.parentSidebarId &&
                          activeSubItem === row.subItemId;
                        return (
                          <li key={`${block.key}::${sec.heading}::${row.subItemId}`}>
                            <button
                              type="button"
                              onClick={() => onSubItemClick(row.subItemId, sec.parentSidebarId, sec.domain)}
                              aria-current={isActive ? 'page' : undefined}
                              className={`flex min-h-9 w-full items-center gap-2 rounded-md py-1.5 pl-1 pr-2 text-left text-sm leading-snug transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                                isActive
                                  ? isDark
                                    ? 'bg-white/12 font-medium text-slate-50'
                                    : 'bg-sky-50 font-medium text-slate-900 ring-1 ring-sky-200/60'
                                  : isDark
                                    ? 'font-normal text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'
                                    : 'font-normal text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                              }`}
                            >
                              <row.icon
                                className="h-3.5 w-3.5 shrink-0 opacity-80"
                                strokeWidth={2}
                                aria-hidden
                              />
                              <span className="min-w-0 flex-1 truncate">{row.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

HubPersonalRail.displayName = 'HubPersonalRail';
