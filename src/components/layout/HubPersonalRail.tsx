import React, { useMemo, useState, useLayoutEffect, useCallback } from 'react';
import { ChevronDown, LayoutList } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Theme } from '../../types';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import type { HubPersonalRailSection } from '../../constants/topNavPolicy';
import { HUB_ADMIN_RAIL_PARENT_IDS, HUB_PERSONAL_RAIL_PARENT_IDS } from '../../constants/topNavPolicy';
import { ADMIN_SIDEBAR_ITEMS, USER_SIDEBAR_ITEMS } from '../../constants/navigation';
import { mainScrollCompositorClass } from '../../utils/uiClasses';
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

function badgeText(count: number | undefined): string | null {
  if (!count || count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}

function Badge({ count, isDark }: { count?: number; isDark: boolean }) {
  const text = badgeText(count);
  if (!text) return null;
  return (
    <span
      className={`ml-1 inline-flex min-h-[1.125rem] min-w-[1.125rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-black leading-none tabular-nums text-white shadow-sm ${
        isDark ? 'bg-rose-500 shadow-rose-950/40' : 'bg-rose-500 shadow-rose-200/70'
      }`}
      aria-label={`${count} 条待处理`}
      title={`${count} 条待处理`}
    >
      {text}
    </span>
  );
}

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
  ariaLabel,
  outerScrollOnly = false,
}) => {
  const isDark = theme === 'dark';
  /** 与探索页画布平接，不用独立浮卡 */
  const shell = 'rounded-none border-0 bg-transparent shadow-none';

  const parentBlocks = useMemo(() => buildParentBlocks(sections), [sections]);

  const filteredBlocks = useMemo(() => {
    return parentBlocks.map((block) => {
      const allRows: RowEntry[] = block.sections.flatMap((sec) => sec.rows.map((row) => ({ sec, row })));
      const isSingleton = allRows.length === 1;
      return { block, rowEntries: allRows, isSingleton };
    });
  }, [parentBlocks]);

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
    setExpandedKey(activeBlockKey);
  }, [activeBlockKey]);

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
            <div className={`truncate text-sm font-semibold ${isDark ? 'text-lantu-text-primary' : 'text-slate-900'}`}>{displayName}</div>
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <span
                className={`inline-flex max-w-full shrink truncate rounded-md border px-2 py-0.5 text-xs font-medium leading-tight tabular-nums ${
                  isDark
                    ? 'border-white/12 bg-white/[0.08] text-lantu-text-secondary'
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

      <div className={menuBodyClass}>
        <div className="space-y-1">
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
                      isDark ? 'text-lantu-text-muted' : 'text-slate-600'
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
              const rowBadge = row.badgeCount ?? 0;
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
                            ? 'bg-white/10 font-medium text-lantu-text-primary'
                            : 'bg-slate-100 font-medium text-slate-900'
                          : isDark
                            ? 'text-lantu-text-secondary hover:bg-white/[0.06]'
                            : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <row.icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{row.label}</span>
                      <Badge count={rowBadge} isDark={isDark} />
                    </button>
                  </div>
                </div>
              );
            }

            const ParentIcon = parentIconById[block.parentSidebarId] ?? LayoutList;
            const childrenOpen = isParentOpen(block.key);
            const parentBadge = rowEntries.reduce((sum, entry) => sum + (entry.row.badgeCount ?? 0), 0);
            return (
              <div key={block.key}>
                <div className="border border-transparent">
                  <button
                    type="button"
                    onClick={() => toggleParent(block.key)}
                    aria-expanded={childrenOpen}
                    className={`group/parent flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-semibold tracking-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                      isDark
                        ? 'text-lantu-text-primary hover:bg-white/[0.06]'
                        : 'text-slate-900 hover:bg-slate-100/90'
                    }`}
                  >
                    <ParentIcon
                      className={`h-[18px] w-[18px] shrink-0 ${isDark ? 'text-lantu-text-primary' : 'text-slate-700'}`}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{block.parentLabel}</span>
                    <Badge count={parentBadge} isDark={isDark} />
                    <ChevronDown
                      size={14}
                      aria-hidden
                      className={`shrink-0 opacity-45 transition-[transform,opacity] duration-300 ease-out motion-reduce:duration-0 motion-reduce:transition-none group-hover/parent:opacity-75 ${
                        isDark ? 'text-lantu-text-muted' : 'text-slate-500'
                      } ${childrenOpen ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>

                  <div
                    className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:duration-0 motion-reduce:transition-none ${
                      childrenOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                    aria-hidden={!childrenOpen}
                  >
                    <div
                      className={`min-h-0 overflow-hidden transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:duration-0 ${
                        childrenOpen ? 'opacity-100' : 'opacity-0'
                      } ${childrenOpen ? '' : 'pointer-events-none'}`}
                    >
                      <ul
                        className={`mb-1.5 mt-0 space-y-0.5 border-l-2 pb-2 pl-3 pr-1 ml-3 ${
                          isDark ? 'border-white/[0.14]' : 'border-slate-300/70'
                        }`}
                        role="list"
                      >
                        {rowEntries.map(({ sec, row }) => {
                          const rowBadge = row.badgeCount ?? 0;
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
                                      ? 'font-semibold text-lantu-text-primary'
                                      : 'font-semibold text-slate-900'
                                    : isDark
                                      ? 'font-normal text-lantu-text-muted hover:bg-white/[0.06] hover:text-lantu-text-secondary'
                                      : 'font-normal text-slate-600 hover:bg-slate-100/80 hover:text-slate-800'
                                }`}
                              >
                                <row.icon
                                  className="h-3.5 w-3.5 shrink-0 opacity-80"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                                <Badge count={rowBadge} isDark={isDark} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
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
