import React from 'react';
import type { Theme } from '../../types';
import { textMuted, textPrimary } from '../../utils/uiClasses';

export interface PageTitleTaglineProps {
  theme: Theme;
  title: string;
  /** 省略时不显示「/ 说明」，仅标题与 suffix */
  tagline?: string;
  className?: string;
  /** 跟在描述后，例如数量角标 */
  suffix?: React.ReactNode;
  /**
   * 顶栏 h2 已与 `title` 同步展示时设为 true：正文不再重复加粗标题，只显示 tagline / suffix；
   * 用 sr-only 的 h1 保留「标题 / 说明」供读屏。
   */
  subtitleOnly?: boolean;
}

/**
 * 页面主标题 + 可选的一行内说明（`标题 / 说明`），节省原先多行说明占用的纵向空间。
 */
export function PageTitleTagline({ theme, title, tagline, className = '', suffix, subtitleOnly = false }: PageTitleTaglineProps) {
  const isDark = theme === 'dark';
  const sepCls = isDark ? 'text-slate-500' : 'text-slate-300';
  const hasTag = Boolean(tagline?.trim());
  const srText = hasTag ? `${title} / ${tagline}` : title;

  if (subtitleOnly) {
    return (
      <div className={`m-0 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`.trim()}>
        <h1 className="sr-only">{srText}</h1>
        {hasTag ? (
          <span className={`min-w-0 text-sm font-normal ${textMuted(theme)}`}>{tagline}</span>
        ) : null}
        {suffix ?? null}
      </div>
    );
  }

  return (
    <h1 className={`m-0 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`.trim()}>
      <span className={`shrink-0 text-lg font-bold tracking-tight sm:text-xl ${textPrimary(theme)}`}>{title}</span>
      {hasTag ? (
        <>
          <span className={`shrink-0 select-none text-base font-light leading-none ${sepCls}`} aria-hidden>
            /
          </span>
          <span className={`min-w-0 text-sm font-normal ${textMuted(theme)}`}>{tagline}</span>
        </>
      ) : null}
      {suffix ?? null}
    </h1>
  );
}
