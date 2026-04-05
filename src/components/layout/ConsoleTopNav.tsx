import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, Menu, Search } from 'lucide-react';
import type { Theme } from '../../types';
import { iconMuted, mainScrollCompositorClass } from '../../utils/uiClasses';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import { USER_TOP_NAV_SIDEBAR_IDS } from '../../constants/topNavPolicy';
import type { PlatformRoleCode } from '../../types/dto/auth';
import { Logo } from '../common/Logo';
import { PortalDropdown } from '../common/PortalDropdown';
import { NexusTopNavPrimaryAnimatedIcon } from '../icons/NexusTopNavAnimatedIcons';

type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

const USER_TOP_NAV_SVG_SET = new Set<string>(USER_TOP_NAV_SIDEBAR_IDS);

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
  /** 顶栏横向展示的侧栏行（可精简） */
  sidebarRows: ConsoleSidebarRow[];
  /** 菜单搜索匹配的全量侧栏行；缺省时与 sidebarRows 相同 */
  sidebarSearchRows?: ConsoleSidebarRow[];
  platformRole: PlatformRoleCode;
  onSidebarClick: (id: string, domain: ConsoleRole) => void;
  onSubItemClick: (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => void;
  filteredSubGroupsForSidebarId: (id: string, domain: ConsoleRole) => SubGroup[];
  onLogoClick: () => void;
  onOpenMobileNav: () => void;
  /** 右侧：外观、消息、全屏、用户等（由 MainLayout 注入，含 headerMenusRef） */
  toolbarRight: React.ReactNode;
}

export const ConsoleTopNav: React.FC<ConsoleTopNavProps> = ({
  theme,
  routeRole,
  activeSidebar,
  activeSubItem,
  sidebarRows,
  sidebarSearchRows,
  onSidebarClick,
  onSubItemClick,
  filteredSubGroupsForSidebarId,
  onLogoClick,
  onOpenMobileNav,
  toolbarRight,
}) => {
  const searchRows = sidebarSearchRows ?? sidebarRows;
  const isDark = theme === 'dark';
  const [hotSearchFocused, setHotSearchFocused] = useState(false);
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<HTMLButtonElement | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const renderTopNavLeadIcon = (
    item: Extract<ConsoleSidebarRow, { kind: 'item' }>,
    navItemActive: boolean,
  ) => {
    if (!USER_TOP_NAV_SVG_SET.has(item.id)) return null;
    const Icon = item.icon;
    if (reduceMotion) {
      return <Icon size={18} className="shrink-0 opacity-90" aria-hidden />;
    }
    return (
      <NexusTopNavPrimaryAnimatedIcon
        sidebarId={item.id}
        isDark={isDark}
        motionActive={navItemActive}
        className="h-[18px] w-[18px] shrink-0"
      />
    );
  };

  const navItems = useMemo(() => {
    const itemRows = searchRows.filter((r): r is Extract<ConsoleSidebarRow, { kind: 'item' }> => r.kind === 'item');
    return itemRows
      .map((item) => {
        const allChildren = filteredSubGroupsForSidebarId(item.id, item.domain).flatMap((g) => g.items);
        const hasChildren = allChildren.length > 0;
        return { item, hasChildren, visibleChildren: allChildren };
      })
      .filter((v): v is { item: Extract<ConsoleSidebarRow, { kind: 'item' }>; hasChildren: boolean; visibleChildren: SubGroup['items'] } => !!v);
  }, [filteredSubGroupsForSidebarId, searchRows]);

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
  }, [navItems, sidebarRows, navItemStateByKey]);

  useEffect(() => {
    const onHotkey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdownKey(null);
        setDropdownAnchor(null);
      }
    };
    window.addEventListener('keydown', onHotkey);
    return () => window.removeEventListener('keydown', onHotkey);
  }, []);

  const closeDropdown = () => {
    setOpenDropdownKey(null);
    setDropdownAnchor(null);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 flex w-full shrink-0 flex-col border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl backdrop-saturate-150 motion-reduce:backdrop-blur-none ${
        isDark
          ? 'border-white/[0.08] bg-[var(--glass-bg)] motion-reduce:bg-lantu-card'
          : 'border-slate-200/55 bg-[var(--glass-bg)] motion-reduce:bg-white'
      }`}
    >
      <div className="flex h-16 min-w-0 items-center gap-3 px-3 sm:px-4 md:gap-4 md:px-6">
      <div className="flex min-h-0 min-w-0 shrink-0 items-center gap-2">
        <button
          type="button"
          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 lg:hidden ${
            isDark ? 'hover:bg-white/10 focus-visible:ring-offset-transparent' : 'hover:bg-slate-100 focus-visible:ring-offset-transparent'
          }`}
          aria-label="打开菜单"
          onClick={onOpenMobileNav}
        >
          <Menu size={20} className={isDark ? 'text-slate-300' : 'text-slate-600'} />
        </button>
        <button
          type="button"
          onClick={onLogoClick}
          className="inline-flex shrink-0 items-center rounded-lg border-0 bg-transparent p-0 text-left outline-none ring-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          aria-label="回到首页"
        >
          <Logo followSystemColorScheme={false} theme={theme} topBar />
        </button>
      </div>

      <nav
        aria-label="主导航"
        className={`mx-1 hidden min-h-0 min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex ${mainScrollCompositorClass} [scrollbar-width:thin]`}
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
          const active =
            isSelfActive || isChildActive;
          const navWeightCls = active ? 'font-semibold' : 'font-medium';
          /** 选中仅字重+字色，无底线/无悬停底：避免「一条亮线 + 邻项悬停色块」并存的割裂感 */
          const activeCls = active
            ? isDark
              ? 'text-slate-100'
              : 'text-slate-900'
            : isDark
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-500 hover:text-slate-800';

          if (!hasChildren) {
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSidebarClick(item.id, item.domain)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm ${navWeightCls} transition-colors duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${activeCls}`}
              >
                {renderTopNavLeadIcon(item, active)}
                <span className="whitespace-nowrap leading-none">{item.label}</span>
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
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm ${navWeightCls} transition-colors duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${activeCls}`}
              >
                {renderTopNavLeadIcon(item, active)}
                <span className="whitespace-nowrap leading-none">{item.label}</span>
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={`block shrink-0 opacity-80 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                />
              </button>
              <PortalDropdown
                open={open}
                onClose={closeDropdown}
                anchorEl={dropdownAnchor}
                align="left"
                className={`min-w-[12rem] overflow-y-auto rounded-lg border p-1.5 shadow-lg ${
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
      </nav>

      <div
        className={[
          'relative hidden h-9 max-w-[200px] flex flex-1 items-center rounded-full px-3 transition-all duration-200 xl:max-w-xs lg:flex',
          hotSearchFocused
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
            hotSearchFocused
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
          type="search"
          name="lantu-console-hot-search-top"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          readOnly
          aria-readonly="true"
          tabIndex={0}
          onFocus={() => setHotSearchFocused(true)}
          onBlur={() => setHotSearchFocused(false)}
          placeholder="热门搜索（即将上线）"
          className={[
            'flex-1 min-w-0 h-full cursor-default border-none bg-transparent px-2.5 py-0 text-[13px] font-medium leading-none outline-none',
            isDark ? 'text-slate-200 placeholder:text-slate-500' : 'text-gray-700 placeholder-gray-400',
          ].join(' ')}
          aria-label="热门搜索，功能即将上线，当前为只读占位不可输入"
        />
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-center">{toolbarRight}</div>
      </div>
    </header>
  );
};
