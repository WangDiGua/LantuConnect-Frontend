import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Theme } from '../../types';
import { textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { descriptionClampMinHeightPx } from '../../utils/pretextTypography';

export type MarketplaceStatusTone = 'published' | 'draft' | 'neutral' | 'accent';

export interface MarketplaceListingCardProps {
  theme: Theme;
  title: string;
  statusChip?: { label: string; tone?: MarketplaceStatusTone };
  /** 右上品牌/类型图标（约 40×40、圆角方块） */
  trailing?: React.ReactNode;
  /** 分类、标签、策略等小徽章横排 */
  metaRow?: React.ReactNode;
  description: string;
  descriptionClamp?: 2 | 3;
  /** 底栏左侧：如 @resourceCode、创建者 */
  footerLeft?: React.ReactNode;
  /** 底栏右侧：图标 + 数字 */
  footerStats?: React.ReactNode;
  /** 底栏第二行右对齐（如「查看与使用」） */
  primaryAction?: React.ReactNode;
  className?: string;
}

function chipClass(theme: Theme, tone: MarketplaceStatusTone): string {
  const isDark = theme === 'dark';
  switch (tone) {
    case 'published':
    case 'accent':
      return isDark
        ? 'border-violet-400/25 bg-violet-500/15 text-violet-100'
        : 'border-violet-200/90 bg-violet-50 text-violet-800';
    case 'draft':
      return isDark
        ? 'border-amber-400/25 bg-amber-500/12 text-amber-100'
        : 'border-amber-200/90 bg-amber-50 text-amber-900';
    default:
      return isDark ? 'border-white/10 bg-white/[0.07] text-slate-300' : 'border-slate-200/90 bg-slate-100 text-slate-700';
  }
}

/** 市场卡片底栏统计项：图标 + 文案（用于评分、热度、评论等） */
export function MarketplaceStatItem({
  icon: Icon,
  children,
  title: ariaTitle,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1" title={ariaTitle}>
      <Icon size={14} strokeWidth={1.75} className="shrink-0 opacity-65" aria-hidden />
      <span>{children}</span>
    </span>
  );
}

/**
 * 统一市场列表卡内层布局（目录式）：标题 + 可选状态徽章 | 右上角媒体；
 * 元数据行；描述截断；底栏标识 + 统计 + 可选主操作。
 */
export const MarketplaceListingCard: React.FC<MarketplaceListingCardProps> = ({
  theme,
  title,
  statusChip,
  trailing,
  metaRow,
  description,
  descriptionClamp = 3,
  footerLeft,
  footerStats,
  primaryAction,
  className = '',
}) => {
  const isDark = theme === 'dark';
  const clampCls = descriptionClamp === 2 ? 'line-clamp-2' : 'line-clamp-3';
  const descMinH = descriptionClampMinHeightPx(descriptionClamp);
  const borderT = isDark ? 'border-white/[0.08]' : 'border-slate-200/55';

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h3
              className={`min-w-0 max-w-full truncate text-[15px] font-semibold leading-snug tracking-tight sm:text-base ${textPrimary(theme)}`}
            >
              {title}
            </h3>
            {statusChip ? (
              <span
                className={`inline-flex max-w-[10rem] shrink-0 items-center gap-0.5 truncate rounded-full border px-2 py-0.5 text-xs font-semibold ${chipClass(theme, statusChip.tone ?? 'neutral')}`}
              >
                {statusChip.label}
              </span>
            ) : null}
          </div>
        </div>
        {trailing ? (
          <div className="shrink-0 [&_img]:h-10 [&_img]:w-10 [&_img]:rounded-xl [&_img]:object-cover">{trailing}</div>
        ) : null}
      </div>

      {metaRow ? (
        <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-2">{metaRow}</div>
      ) : null}

      <p
        className={`mt-3 flex-1 text-sm leading-relaxed ${clampCls} ${textSecondary(theme)}`}
        style={{ minHeight: descMinH }}
      >
        {description?.trim() ? description : '暂无描述'}
      </p>

      <div className={`mt-4 border-t pt-3 ${borderT}`}>
        <div className="flex items-end justify-between gap-2">
          <div
            className={`min-w-0 flex-1 text-xs ${isDark ? 'text-sky-300/90' : 'text-sky-700/[0.92]'}`}
          >
            {footerLeft}
          </div>
          <div
            className={`flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs tabular-nums ${textMuted(theme)}`}
          >
            {footerStats}
          </div>
        </div>
        {primaryAction ? <div className="mt-3 flex justify-end gap-2">{primaryAction}</div> : null}
      </div>
    </div>
  );
};
