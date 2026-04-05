import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Theme } from '../../types';
import { canvasBodyBg, consoleContentTopPad, mainScrollPadBottom, mainScrollPadX, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';

export type ResourceMarketDetailTabItem = {
  id: string;
  label: string;
  badge?: number;
};

export interface ResourceMarketDetailShellProps {
  theme: Theme;
  onBack: () => void;
  backLabel?: string;
  /** 顶栏左侧主标题区（含 h1） */
  titleBlock: React.ReactNode;
  /** 顶栏右侧操作按钮组 */
  headerActions?: React.ReactNode;
  tabs: ResourceMarketDetailTabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  /** 桌面端主文档列；移动端全宽置于上方 */
  mainColumn: React.ReactNode;
  /** 桌面端右侧栏；移动端全宽置于主列下方 */
  sidebarColumn?: React.ReactNode;
}

/**
 * 用户资源市场全页详情四段式壳：返回、顶栏（左信息 / 右操作）、Tab、主栏 + 侧栏。
 */
export function ResourceMarketDetailShell({
  theme,
  onBack,
  backLabel = '返回市场',
  titleBlock,
  headerActions,
  tabs,
  activeTabId,
  onTabChange,
  mainColumn,
  sidebarColumn,
}: ResourceMarketDetailShellProps) {
  const isDark = theme === 'dark';
  return (
    <div className={`w-full min-h-0 ${canvasBodyBg(theme)}`}>
      <div className={`${mainScrollPadX} ${mainScrollPadBottom} ${consoleContentTopPad} space-y-6`}>
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
            isDark ? 'text-slate-200 hover:bg-white/[0.06]' : 'text-slate-700 hover:bg-slate-100'
          }`}
          aria-label={backLabel}
        >
          <ArrowLeft size={18} className="shrink-0 opacity-80" aria-hidden />
          {backLabel}
        </button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="min-w-0 lg:col-span-8 space-y-4">{titleBlock}</div>
          {headerActions ? (
            <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:col-span-4">
              {headerActions}
            </div>
          ) : null}
        </div>

        {tabs.length > 0 ? (
          <div
            className={`inline-flex max-w-full flex-wrap gap-1 rounded-2xl p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
            role="tablist"
            aria-label="详情分区"
          >
            {tabs.map((t) => {
              const active = activeTabId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`market-tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`market-tabpanel-${t.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onTabChange(t.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                    active
                      ? isDark
                        ? 'bg-white/12 text-white shadow-sm'
                        : 'bg-white text-slate-900 shadow-sm'
                      : `${textMuted(theme)} ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-white/80'}`
                  }`}
                >
                  {t.label}
                  {typeof t.badge === 'number' ? <span className="ml-1.5 tabular-nums opacity-80">({t.badge})</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div
            className="min-w-0 lg:col-span-8"
            role="tabpanel"
            id={`market-tabpanel-${activeTabId}`}
            aria-labelledby={`market-tab-${activeTabId}`}
          >
            {mainColumn}
          </div>
          {sidebarColumn ? (
            <aside className="min-w-0 lg:col-span-4 space-y-4" aria-label="配置与快捷操作">
              {sidebarColumn}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function detailSectionTitle(theme: Theme, children: React.ReactNode) {
  return <h2 className={`text-base font-bold ${textPrimary(theme)}`}>{children}</h2>;
}

export function detailMutedLead(theme: Theme, children: React.ReactNode) {
  return <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{children}</p>;
}
