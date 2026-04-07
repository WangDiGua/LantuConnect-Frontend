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
  /**
   * true：顶栏标题与操作在同一整行内两端对齐（文档站 / 市场里常见的「基本信息 + 右上操作」）。
   * false：沿用 8+4 分栏顶栏。
   */
  compactHeaderRow?: boolean;
  /** 主内容 lg 列宽，默认 8；与 sidebarLgColSpan 之和须为 12 */
  mainLgColSpan?: 7 | 8 | 9;
  tabs: ResourceMarketDetailTabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  /** 桌面端主文档列；移动端全宽置于上方 */
  mainColumn: React.ReactNode;
  /** 桌面端右侧栏；移动端全宽置于主列下方 */
  sidebarColumn?: React.ReactNode;
}

function gridSpansForMain(mainLgColSpan: 7 | 8 | 9): { main: string; side: string } {
  switch (mainLgColSpan) {
    case 9:
      return { main: 'lg:col-span-9', side: 'lg:col-span-3' };
    case 7:
      return { main: 'lg:col-span-7', side: 'lg:col-span-5' };
    default:
      return { main: 'lg:col-span-8', side: 'lg:col-span-4' };
  }
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
  compactHeaderRow = false,
  mainLgColSpan = 8,
  tabs,
  activeTabId,
  onTabChange,
  mainColumn,
  sidebarColumn,
}: ResourceMarketDetailShellProps) {
  const isDark = theme === 'dark';
  const grid = gridSpansForMain(mainLgColSpan);
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

        {compactHeaderRow ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4">{titleBlock}</div>
            {headerActions ? (
              <div className="flex min-w-0 shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                {headerActions}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className={`min-w-0 space-y-4 ${grid.main}`}>{titleBlock}</div>
            {headerActions ? (
              <div
                className={`flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end ${grid.side}`}
              >
                {headerActions}
              </div>
            ) : null}
          </div>
        )}

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
            className={`min-w-0 ${grid.main}`}
            role="tabpanel"
            id={`market-tabpanel-${activeTabId}`}
            aria-labelledby={`market-tab-${activeTabId}`}
          >
            {mainColumn}
          </div>
          {sidebarColumn ? (
            <aside className={`min-w-0 space-y-4 ${grid.side}`} aria-label="配置与快捷操作">
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
