import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Theme } from '../../types';
import type { ConsoleRole } from '../../constants/consoleRoutes';
import type { HubPersonalRailSection } from '../../constants/topNavPolicy';
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
  const shell = isDark
    ? 'rounded-xl border border-white/[0.08] bg-lantu-card shadow-[0_2px_12px_rgba(0,0,0,0.25)]'
    : 'rounded-xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)]';

  return (
    <nav
      className={`${shell} p-4 ${mainScrollCompositorClass}`}
      aria-label="探索首页导航"
    >
      <button
        type="button"
        onClick={onProfileClick}
        className={`mb-5 flex w-full min-w-0 items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${
          isDark ? 'focus-visible:ring-offset-lantu-card hover:bg-white/[0.04]' : 'focus-visible:ring-offset-white hover:bg-slate-50'
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

      <div className="space-y-5">
        {sections.map((sec) => (
          <div key={`${sec.parentSidebarId}-${sec.heading}`} className="space-y-1.5 first:pt-0">
            <div
              className={`px-1 text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              {sec.heading}
            </div>
            <ul className="space-y-0.5">
              {sec.rows.map((row) => {
                const isActive =
                  routeRole === sec.domain && activeSidebar === sec.parentSidebarId && activeSubItem === row.subItemId;
                return (
                  <li key={row.subItemId}>
                    <button
                      type="button"
                      onClick={() => onSubItemClick(row.subItemId, sec.parentSidebarId, sec.domain)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 ${
                        isDark ? 'focus-visible:ring-offset-lantu-card' : 'focus-visible:ring-offset-white'
                      } ${
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
          </div>
        ))}
      </div>
    </nav>
  );
};

HubPersonalRail.displayName = 'HubPersonalRail';
