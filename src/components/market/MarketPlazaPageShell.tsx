import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Zap } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import {
  canvasBodyBg,
  mainScrollPadBottom,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { MARKET_HERO_TITLE_CLASSES } from '../../constants/theme';

export type MarketPlazaFeature = {
  variant: 'violet' | 'cyan' | 'fuchsia';
  pill: string;
  pillIcon?: LucideIcon;
  title: string;
  description: string;
};

export interface MarketPlazaPageShellProps {
  theme: Theme;
  fontSize: FontSize;
  heroIcon: LucideIcon;
  kicker: string;
  /** 通常为渐变标题；传入完整标题节点 */
  title: React.ReactNode;
  description: string;
  actions?: React.ReactNode;
  features: readonly [MarketPlazaFeature, MarketPlazaFeature, MarketPlazaFeature];
  tip: React.ReactNode;
  /** 桌面端左侧筛选（移动端由调用方自行用 `lg:hidden` 等在 main 内补充） */
  sidebar: React.ReactNode;
  /** 主栏（搜索、列表栅格等） */
  main: React.ReactNode;
}

function featureShellClass(theme: Theme, variant: MarketPlazaFeature['variant']): string {
  const isDark = theme === 'dark';
  switch (variant) {
    case 'violet':
      return isDark
        ? 'border-violet-500/20 bg-gradient-to-br from-violet-600/15 to-slate-900/30'
        : 'border-violet-200/70 bg-gradient-to-br from-violet-50 to-white';
    case 'cyan':
      return isDark
        ? 'border-cyan-500/20 bg-gradient-to-br from-cyan-600/12 to-slate-900/30'
        : 'border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 to-white';
    case 'fuchsia':
      return isDark
        ? 'border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-600/12 to-slate-900/30'
        : 'border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50/90 to-white';
    default:
      return '';
  }
}

function featurePillClass(variant: MarketPlazaFeature['variant']): string {
  switch (variant) {
    case 'violet':
      return 'bg-violet-500/15 text-violet-700 dark:text-violet-200';
    case 'cyan':
      return 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200';
    case 'fuchsia':
      return 'bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-200';
    default:
      return '';
  }
}

/**
 * MCP / 数据集 / Agent / 应用 广场共用：页头、三列特性卡、提示条、侧栏 + 主栏骨架。
 */
export const MarketPlazaPageShell: React.FC<MarketPlazaPageShellProps> = ({
  theme,
  fontSize,
  heroIcon: HeroIcon,
  kicker,
  title,
  description,
  actions,
  features,
  tip,
  sidebar,
  main,
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`w-full ${canvasBodyBg(theme)}`}>
      <div className={`${mainScrollPadBottom} space-y-5`}>
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md shadow-violet-500/20 sm:h-12 sm:w-12 ${
                isDark ? 'bg-gradient-to-br from-violet-500 to-indigo-500' : 'bg-gradient-to-br from-violet-600 to-indigo-600'
              }`}
              aria-hidden
            >
              <HeroIcon className="h-6 w-6 sm:h-6 sm:w-6" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted(theme)}`}>{kicker}</p>
              <h1 className={`mt-0.5 font-bold tracking-tight ${MARKET_HERO_TITLE_CLASSES[fontSize]}`}>{title}</h1>
              <p className={`mt-1 max-w-2xl text-xs leading-snug sm:text-sm ${textSecondary(theme)}`}>{description}</p>
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {features.map((f) => {
            const PillIcon = f.pillIcon ?? Zap;
            return (
              <div key={`${f.variant}-${f.pill}-${f.title}`} className={`rounded-2xl border p-4 ${featureShellClass(theme, f.variant)}`}>
                <div className={`mb-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${featurePillClass(f.variant)}`}>
                  <PillIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                  {f.pill}
                </div>
                <p className={`text-sm font-semibold ${textPrimary(theme)}`}>{f.title}</p>
                <p className={`mt-1 text-xs leading-relaxed ${textSecondary(theme)}`}>{f.description}</p>
              </div>
            );
          })}
        </div>

        <div
          className={`flex gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm leading-snug ${
            isDark ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100/90' : 'border-amber-200/80 bg-amber-50/80 text-amber-950'
          }`}
        >
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
          <div className="min-w-0">{tip}</div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {sidebar}
          <div className="min-w-0 flex-1 space-y-4">{main}</div>
        </div>
      </div>
    </div>
  );
};
