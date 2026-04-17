import React from 'react';
import { ArrowLeft } from 'lucide-react';

import type { Theme } from '../../types';
import { canvasBodyBg, mainScrollPadBottom, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';

export type ResourceMarketDetailTabItem = {
  id: string;
  label: string;
  badge?: number;
};

export interface ResourceMarketDetailShellProps {
  theme: Theme;
  onBack: () => void;
  backLabel?: string;
  titleBlock: React.ReactNode;
  headerActions?: React.ReactNode;
  compactHeaderRow?: boolean;
  mainLgColSpan?: 7 | 8 | 9;
  tabs: ResourceMarketDetailTabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  mainColumn: React.ReactNode;
  sidebarColumn?: React.ReactNode;
}

type MarketDetailCardProps = {
  theme: Theme;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

type MarketDetailNoticeTone = 'info' | 'warning' | 'danger' | 'success';

type MarketDetailStatusNoticeProps = {
  theme: Theme;
  tone?: MarketDetailNoticeTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

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

function sectionCardClass(theme: Theme): string {
  return theme === 'dark'
    ? 'rounded-[28px] border border-white/10 bg-lantu-elevated p-6 shadow-[var(--shadow-card)]'
    : 'rounded-[28px] border border-transparent bg-white p-6 shadow-[var(--shadow-card)]';
}

function sidebarCardClass(theme: Theme): string {
  return theme === 'dark'
    ? 'rounded-2xl border border-white/10 bg-white/[0.03] p-4'
    : 'rounded-2xl border border-slate-200 bg-slate-50/70 p-4';
}

function noticeToneClass(theme: Theme, tone: MarketDetailNoticeTone): string {
  if (tone === 'danger') {
    return theme === 'dark'
      ? 'border-rose-500/35 bg-rose-500/10 text-rose-100'
      : 'border-rose-200 bg-rose-50 text-rose-950';
  }
  if (tone === 'warning') {
    return theme === 'dark'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
      : 'border-amber-200 bg-amber-50 text-amber-950';
  }
  if (tone === 'success') {
    return theme === 'dark'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-950';
  }
  return theme === 'dark'
    ? 'border-sky-500/30 bg-sky-500/10 text-sky-100'
    : 'border-sky-200 bg-sky-50 text-sky-950';
}

export function MarketDetailSectionCard({
  theme,
  title,
  description,
  actions,
  children,
  className = '',
}: MarketDetailCardProps) {
  return (
    <section className={`${sectionCardClass(theme)} ${className}`.trim()}>
      {title || description || actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            {title ? <h2 className={`text-base font-bold ${textPrimary(theme)}`}>{title}</h2> : null}
            {description ? <p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children ? <div className={title || description || actions ? 'mt-5' : ''}>{children}</div> : null}
    </section>
  );
}

export function MarketDetailSidebarCard({
  theme,
  title,
  description,
  actions,
  children,
  className = '',
}: MarketDetailCardProps) {
  return (
    <section className={`${sidebarCardClass(theme)} ${className}`.trim()}>
      {title || description || actions ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {title ? <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>{title}</h3> : null}
              {description ? <p className={`text-xs leading-relaxed ${textSecondary(theme)}`}>{description}</p> : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      ) : null}
      {children ? <div className={title || description || actions ? 'mt-3' : ''}>{children}</div> : null}
    </section>
  );
}

export function MarketDetailStatusNotice({
  theme,
  tone = 'info',
  title,
  description,
  children,
  className = '',
}: MarketDetailStatusNoticeProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${noticeToneClass(theme, tone)} ${className}`.trim()}>
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-1 text-xs opacity-90">{description}</p> : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

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
      <div className={`${mainScrollPadBottom} space-y-6`}>
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
              <div className={`flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end ${grid.side}`}>
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
            <aside className={`min-w-0 space-y-4 ${grid.side}`} aria-label="配置与快捷说明">
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
