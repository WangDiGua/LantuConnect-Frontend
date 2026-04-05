import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ChevronDown, Menu, Search, Command } from 'lucide-react';
import type { Theme } from '../../types';
import { iconMuted, mainScrollCompositorClass } from '../../utils/uiClasses';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import type { PlatformRoleCode } from '../../types/dto/auth';
import { Logo } from '../common/Logo';
import { PortalDropdown } from '../common/PortalDropdown';

type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

interface SubGroup {
  title: string;
  items: Array<{ id: string; label: string; icon: IconComponent; tag?: string }>;
}

import type { ConsoleSidebarRow } from './ConsoleSidebar';

export interface ConsoleTopNavProps {
  theme: Theme;
  routeRole: ConsoleRole;
  activeSidebar: string;
  activeSubItem: string;
  sidebarRows: ConsoleSidebarRow[];
  platformRole: PlatformRoleCode;
  onSidebarClick: (id: string, domain: ConsoleRole) => void;
  onSubItemClick: (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => void;
  filteredSubGroupsForSidebarId: (id: string, domain: ConsoleRole) => SubGroup[];
  onLogoClick: () => void;
  onOpenMobileNav: () => void;
  /** 右侧：外观、消息、全屏、用户等（由 MainLayout 注入，含 headerMenusRef） */
  toolbarRight: React.ReactNode;
}

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };

export const ConsoleTopNav: React.FC<ConsoleTopNavProps> = ({
  theme,
  routeRole,
  activeSidebar,
  activeSubItem,
  sidebarRows,
  onSidebarClick,
  onSubItemClick,
  filteredSubGroupsForSidebarId,
  onLogoClick,
  onOpenMobileNav,
  toolbarRight,
}) => {
  const isDark = theme === 'dark';
  const [menuQuery, setMenuQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<HTMLButtonElement | null>(null);

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
          return { item, hasChildren, visibleChildren: allChildren };
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
        return { item, hasChildren: false, visibleChildren: [] };
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

  type NavRenderPiece =
    | { kind: 'divider'; key: string }
    | { kind: 'item'; key: string; block: (typeof navItems)[number] };

  const navPieces = useMemo((): NavRenderPiece[] => {
    if (normalizedQuery) {
      return navItems.map((n) => ({ kind: 'item' as const, key: `${n.item.domain}-${n.item.id}`, block: n }));
    }
    const out: NavRenderPiece[] = [];
    let divIdx = 0;
    for (const row of sidebarRows) {
      if (row.kind === 'section') {
        out.push({ kind: 'divider', key: `sec-${divIdx++}` });
        continue;
      }
      const state = navItemStateByKey.get(`${row.domain}-${row.id}`);
      if (state) out.push({ kind: 'item', key: `${row.domain}-${row.id}`, block: state });
    }
    return out;
  }, [normalizedQuery, navItems, sidebarRows, navItemStateByKey]);

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
      if (e.key === 'Escape') {
        setOpenDropdownKey(null);
        setDropdownAnchor(null);
      }
    };
    window.addEventListener('keydown', onHotkey);
    return () => window.removeEventListener('keydown', onHotkey);
  }, [menuQuery]);

  const closeDropdown = () => {
    setOpenDropdownKey(null);
    setDropdownAnchor(null);
  };

  return (
    <header
      className={`${isDark ? 'border-white/[0.08] bg-lantu-card/85' : 'border-slate-200/60 bg-white/90'} flex h-[60px] shrink-0 items-center gap-3 rounded-2xl border px-3 sm:px-4 backdrop-blur-md md:gap-4`}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <button
          type="button"
          className={`lg:hidden rounded-xl p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${
            isDark ? 'hover:bg-white/10 focus-visible:ring-offset-lantu-card' : 'hover:bg-slate-100 focus-visible:ring-offset-white'
          }`}
          aria-label="打开菜单"
          onClick={onOpenMobileNav}
        >
          <Menu size={20} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
        </button>
        <button
          type="button"
          onClick={onLogoClick}
          className={`shrink-0 rounded-xl border-0 bg-transparent p-0 text-left transition-colors outline-none ring-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 ${
            isDark ? 'focus-visible:ring-offset-lantu-card' : 'focus-visible:ring-offset-white'
          }`}
          aria-label="回到首页"
        >
          <Logo followSystemColorScheme={false} theme={theme} compact />
        </button>
      </div>

      <nav
        aria-label="主导航"
        className={`mx-1 hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex ${mainScrollCompositorClass} py-1 [scrollbar-width:thin]`}
      >
        {navPieces.map((piece, i) => {
          if (piece.kind === 'divider') {
            if (i === 0) return null;
            return (
              <div
                key={piece.key}
                className={`mx-1 h-5 w-px shrink-0 self-center ${isDark ? 'bg-white/12' : 'bg-slate-200'}`}
                aria-hidden
              />
            );
          }
          const { item, hasChildren, visibleChildren } = piece.block;
          const key = `${item.domain}-${item.id}`;
          const isChildActive = hasChildren && activeSidebar === item.id && routeRole === item.domain;
          const isSelfActive = !hasChildren && activeSidebar === item.id && routeRole === item.domain;
          const activeCls =
            isSelfActive || isChildActive
              ? isDark
                ? 'bg-white/12 text-slate-100'
                : 'bg-slate-100 text-slate-900'
              : isDark
                ? 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';

          if (!hasChildren) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSidebarClick(item.id, item.domain)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${activeCls} ${
                  isDark ? 'focus-visible:ring-offset-lantu-card' : 'focus-visible:ring-offset-white'
                }`}
              >
                <item.icon size={17} strokeWidth={2} className="shrink-0 opacity-90" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          }

          const open = openDropdownKey === key;
          return (
            <div key={key} className="relative shrink-0">
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={(ev) => {
                  if (openDropdownKey === key) {
                    closeDropdown();
                  } else {
                    setDropdownAnchor(ev.currentTarget);
                    setOpenDropdownKey(key);
                  }
                }}
                className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${activeCls} ${
                  isDark ? 'focus-visible:ring-offset-lantu-card' : 'focus-visible:ring-offset-white'
                }`}
              >
                <item.icon size={17} strokeWidth={2} className="shrink-0 opacity-90" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={`shrink-0 opacity-80 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                />
              </button>
              <PortalDropdown
                open={open}
                onClose={closeDropdown}
                anchorEl={dropdownAnchor}
                align="left"
                className={`min-w-[12rem] overflow-y-auto rounded-xl border p-1.5 shadow-xl ${
                  isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'
                }`}
              >
                {visibleChildren.map((subItem) => (
                  <button
                    key={subItem.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeDropdown();
                      onSubItemClick(subItem.id, item.id, item.domain);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-inset ${
                      activeSubItem === subItem.id && activeSidebar === item.id && routeRole === item.domain
                        ? isDark
                          ? 'bg-white/10 font-semibold text-slate-100'
                          : 'bg-slate-100 font-semibold text-slate-900'
                        : isDark
                          ? 'text-slate-300 hover:bg-white/[0.06]'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <subItem.icon size={16} className="shrink-0 opacity-90" aria-hidden />
                    <span className="min-w-0 flex-1">{subItem.label}</span>
                    {subItem.tag ? (
                      <span
                        className={`shrink-0 text-[10px] font-bold px-1.5 py-px rounded-md ${
                          isDark
                            ? 'bg-white/[0.08] text-slate-200 border border-white/[0.12]'
                            : 'bg-[#F2F4F7] text-[#111827] border border-slate-400/40'
                        }`}
                      >
                        {subItem.tag}
                      </span>
                    ) : null}
                  </button>
                ))}
              </PortalDropdown>
            </div>
          );
        })}
        {navItems.length === 0 && normalizedQuery ? (
          <span className="px-2 text-xs text-slate-400">未找到匹配菜单</span>
        ) : null}
      </nav>

      <div
        className={[
          'relative hidden h-[38px] max-w-[200px] flex-1 items-center rounded-[10px] px-3 transition-all duration-200 xl:max-w-xs lg:flex',
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
                ? `${iconMuted(theme)}`
                : `${iconMuted(theme)}`,
          ].join(' ')}
          aria-hidden
        />
        <input
          ref={searchInputRef}
          type="text"
          name="lantu-console-menu-filter-top"
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
            'flex flex-shrink-0 select-none items-center justify-center rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider transition-all duration-200',
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

      <div className="ml-auto flex min-w-0 shrink-0 items-center">{toolbarRight}</div>
    </header>
  );
};
