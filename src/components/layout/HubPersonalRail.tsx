import React, { useMemo, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { ChevronDown, Command, LayoutList, Search } from 'lucide-react';
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
  onSubItemClick: (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => void;
  /** 移动抽屉打开时由侧栏接管 ⌘/Ctrl+K，避免双监听 */
  suppressGlobalMenuSearchHotkey?: boolean;
  /** 侧栏 `<nav>` 可访问名称；默认「探索首页导航」 */
  ariaLabel?: string;
  /**
   * 为外层的 `sticky + max-h + overflow-y-auto` 壳预留：关闭内部菜单区滚动，整轨随外层一根滚轮滚动，避免双滚动条。
   */
  outerScrollOnly?: boolean;
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
  onSubItemClick,
  suppressGlobalMenuSearchHotkey = false,
  ariaLabel,
  outerScrollOnly = false,
}) => {
  const isDark = theme === 'dark';
  /** 与探索页画布平接，不用独立浮卡 */
  const shell = 'rounded-none border-0 bg-transparent shadow-none';

  const parentBlocks = useMemo(() => buildParentBlocks(sections), [sections]);

  const [menuQuery, setMenuQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const menuSearchInputRef = useRef<HTMLInputElement>(null);
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

  const navRootClass = outerScrollOnly
    ? `${shell} flex min-h-0 flex-col ${mainScrollCompositorClass}`
    : `${shell} flex h-full min-h-0 flex-col ${mainScrollCompositorClass}`;
  const menuBodyClass = outerScrollOnly
    ? 'overflow-x-hidden px-3 pb-4 pt-0 min-w-0'
    : `min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-0 custom-scrollbar ${mainScrollCompositorClass}`;

  return (
    <nav className={navRootClass} aria-label={navAria}>
      <div className="shrink-0 p-4 pb-3" role="group" aria-label={`当前用户 ${displayName}，${roleLabel}`}>
        <div className="flex w-full min-w-0 items-center gap-3 rounded-lg px-1 py-1.5">
          <AvatarGradientFrame isDark={isDark} className="">
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
            </div>
          </div>
        </div>
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

      <div className={menuBodyClass}>
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
                          <li key={`${block.key}::${sec.heading}::${row.subItemId}`} className="relative">
                            {isActive ? (
                              <span
                                className={`pointer-events-none absolute left-0 top-1/2 z-[1] size-1.5 -translate-x-4 -translate-y-1/2 rounded-full ${
                                  isDark ? 'bg-white' : 'bg-black'
                                }`}
                                aria-hidden
                              />
                            ) : null}
                            <button
                              type="button"
                              onClick={() => onSubItemClick(row.subItemId, sec.parentSidebarId, sec.domain)}
                              aria-current={isActive ? 'page' : undefined}
                              className={`flex min-h-9 w-full items-center gap-2 rounded-md py-1.5 pl-1 pr-2 text-left text-sm leading-snug transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                                isActive
                                  ? isDark
                                    ? 'font-semibold text-slate-50'
                                    : 'font-semibold text-slate-900'
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
