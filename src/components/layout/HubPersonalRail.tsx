import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Theme } from '../../types';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import type { HubPersonalRailSection } from '../../constants/topNavPolicy';
import { HUB_ADMIN_RAIL_PARENT_IDS, HUB_PERSONAL_RAIL_PARENT_IDS } from '../../constants/topNavPolicy';
import { ADMIN_SIDEBAR_ITEMS, USER_SIDEBAR_ITEMS } from '../../constants/navigation';
import { mainScrollCompositorClass } from '../../utils/uiClasses';
import { MultiAvatar } from '../common/MultiAvatar';

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

  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const isParentOpen = useCallback(
    (key: string) => expandedParents[key] === true,
    [expandedParents],
  );

  const toggleParent = (key: string) => {
    setExpandedParents((prev) => ({ ...prev, [key]: !(prev[key] === true) }));
  };

  /** 路由落在某父级下时，自动展开该一级分组（子项扁平列出，无二级折叠） */
  useEffect(() => {
    setExpandedParents((prev) => {
      const next = { ...prev };
      for (const block of parentBlocks) {
        if (block.parentSidebarId === activeSidebar && block.domain === routeRole) {
          next[block.key] = true;
        }
      }
      return next;
    });
  }, [activeSidebar, activeSubItem, routeRole, parentBlocks]);

  return (
    <nav
      className={`${shell} flex max-h-[min(92vh,52rem)] flex-col ${mainScrollCompositorClass}`}
      aria-label="探索首页导航"
    >
      <div className="shrink-0 p-4 pb-3">
        <button
          type="button"
          onClick={onProfileClick}
          className={`flex w-full min-w-0 items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
            isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
          }`}
        >
          <MultiAvatar
            seed={avatarSeed}
            alt={displayName}
            className={`h-11 w-11 shrink-0 rounded-full ${isDark ? 'border border-white/10' : 'border border-slate-200/80'}`}
          />
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
          {parentBlocks.map((block, blockIdx) => (
            <div key={block.key}>
              {blockIdx > 0 &&
              parentBlocks[blockIdx - 1].domain === 'user' &&
              block.domain === 'admin' ? (
                <div
                  className={`my-3 border-t ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}
                  role="separator"
                />
              ) : null}

              <div className="rounded-lg border border-transparent">
                <button
                  type="button"
                  onClick={() => toggleParent(block.key)}
                  aria-expanded={isParentOpen(block.key)}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                    isDark ? 'text-slate-200 hover:bg-white/[0.06]' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={`shrink-0 opacity-80 transition-transform duration-200 motion-reduce:transition-none ${
                      isParentOpen(block.key) ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">{block.parentLabel}</span>
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
          ))}
        </div>
      </div>
    </nav>
  );
};

HubPersonalRail.displayName = 'HubPersonalRail';
