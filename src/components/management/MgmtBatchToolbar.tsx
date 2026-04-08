import React, { type ReactNode } from 'react';
import type { Theme } from '../../types';
import { textMuted, textPrimary, btnGhost } from '../../utils/uiClasses';

export interface MgmtBatchToolbarProps {
  theme: Theme;
  count: number;
  onClear: () => void;
  /** 紧随「已选 n 项」后渲染的批量操作按钮 */
  children?: ReactNode;
  className?: string;
}

/**
 * 表格多选后的批量操作条：展示已选数量、清空选择、自定义操作按钮。
 */
export function MgmtBatchToolbar({ theme, count, onClear, children, className = '' }: MgmtBatchToolbarProps) {
  if (count <= 0) return null;
  const isDark = theme === 'dark';
  return (
    <div
      role="toolbar"
      aria-label="批量操作"
      className={[
        'flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl mb-3 text-sm',
        isDark ? 'bg-white/[0.06] border border-white/10' : 'bg-slate-50 border border-slate-200/80',
        className,
      ].join(' ')}
    >
      <span className={textPrimary(theme)}>
        已选 <strong className="tabular-nums">{count}</strong> 项
      </span>
      <button type="button" className={`${btnGhost(theme)} !py-1 !px-2 text-xs`} onClick={onClear}>
        清空
      </button>
      {children ? <span className={`hidden sm:inline h-4 w-px ${isDark ? 'bg-white/15' : 'bg-slate-200'}`} aria-hidden /> : null}
      <div className={`flex flex-wrap items-center gap-2 ${textMuted(theme)}`}>{children}</div>
    </div>
  );
}
