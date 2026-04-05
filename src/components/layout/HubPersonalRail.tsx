import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, LayoutList } from 'lucide-react';
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
  subtitle: string;
  avatarSeed: string;
  activeSidebar: string;
  activeSubItem: string;
  routeRole: ConsoleRole;
  onProfileClick: () => void;
  onSubItemClick: (subItemId: string, parentSidebarId: string, domain: ConsoleRole) => void;
}

type ParentBlock = {
  key: string;
  parentSidebarId: string;
  parentLabel: string;
  domain: ConsoleRole;
  sections: HubPersonalRailSection[];
};

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
  subtitle,
  avatarSeed,
  sections,
  activeSidebar,
  activeSubItem,
  routeRole,
  onProfileClick,
  onSubItemClick,
}) => {
  const isDark = theme === 'dark';
  /** 与探索页画布平接，不用独立浮卡；列级分隔由 ExploreHub 父级 border-r 承担 */
  const shell = 'rounded-none border-0 bg-transparent shadow-none';

  const parentBlocks = useMemo(() => buildParentBlocks(sections), [sections]);
  const hasAdminRail = useMemo(() => parentBlocks.some((b) => b.domain === 'admin'), [parentBlocks]);

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

  /** 路由变化时展开所属分组；无匹配时收起（如在探索主画布且无左轨父级） */
  useEffect(() => {
    setExpandedKey(activeBlockKey);
  }, [activeBlockKey]);

  return (
    <nav
      className={`${shell} flex max-h-[min(92vh,52rem)] flex-col ${mainScrollCompositorClass}`}
      aria-label="探索首页导航"
    >
      <div className="shrink-0 p-4 pb-3">
        <button
          type="button"
          onClick={onProfileClick}
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
            <div className={`flex items-center gap-0.5 truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="truncate">{subtitle}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
            </div>
          </div>
        </button>
      </div>

      <div
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-0 custom-scrollbar ${mainScrollCompositorClass}`}
      >
        <div className="space-y-1">
          {hasAdminRail && parentBlocks[0]?.domain === 'user' ? (
            <div
              className="mb-3 flex items-center gap-2.5 px-0.5"
              aria-label="个人与日常使用入口"
            >
              <div
                className={`h-px min-w-[1rem] flex-1 ${isDark ? 'bg-gradient-to-r from-transparent to-white/[0.18]' : 'bg-gradient-to-r from-transparent to-slate-400/45'}`}
                aria-hidden
              />
              <span
                className={`max-w-[12rem] shrink-0 text-center text-[10px] font-bold uppercase leading-none tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                使用端
              </span>
              <div
                className={`h-px min-w-[1rem] flex-1 ${isDark ? 'bg-gradient-to-l from-transparent to-white/[0.18]' : 'bg-gradient-to-l from-transparent to-slate-400/45'}`}
                aria-hidden
              />
            </div>
          ) : null}
          {parentBlocks.map((block, blockIdx) => {
            const ParentIcon = parentIconById[block.parentSidebarId] ?? LayoutList;
            return (
            <div key={block.key}>
              {blockIdx > 0 &&
              parentBlocks[blockIdx - 1].domain === 'user' &&
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
                    className={`max-w-[12rem] shrink-0 text-center text-[10px] font-bold uppercase leading-none tracking-wider ${
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
              ) : null}

              <div className="rounded-lg border border-transparent">
                <button
                  type="button"
                  onClick={() => toggleParent(block.key)}
                  aria-expanded={isParentOpen(block.key)}
                  className={`group/parent flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                    isDark ? 'text-slate-200 hover:bg-white/[0.06]' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <ParentIcon
                    className={`h-4 w-4 shrink-0 opacity-90 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{block.parentLabel}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden
                    className={`shrink-0 opacity-45 transition-[transform,opacity] duration-200 motion-reduce:transition-none group-hover/parent:opacity-75 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    } ${
                      isParentOpen(block.key) ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>

                {isParentOpen(block.key) ? (
                  <ul className="space-y-0.5 pb-2 pl-1">
                    {block.sections.flatMap((sec) =>
                      sec.rows.map((row) => ({ sec, row })),
                    ).map(({ sec, row }) => {
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
                            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                              isActive
                                ? isDark
                                  ? 'bg-white/10 font-medium text-slate-100'
                                  : 'bg-slate-100 font-medium text-slate-900'
                                : isDark
                                  ? 'text-slate-300 hover:bg-white/[0.06]'
                                  : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <row.icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
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
