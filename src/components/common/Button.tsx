import React from 'react';
import { Loader2 } from 'lucide-react';
import type { Theme } from '../../types';
import { btnDanger, btnGhost, btnPrimary, btnSecondary } from '../../utils/uiClasses';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  theme: Theme;
  variant?: ButtonVariant;
  /** md：与现有 btnPrimary 一致；sm：略 compact */
  size?: 'sm' | 'md';
  loading?: boolean;
  /** 默认 button，避免在表单里误提交 */
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

const sizeClass: Record<'sm' | 'md', string> = {
  sm: 'min-h-9 px-3 py-2 text-xs rounded-lg',
  md: '',
};

/**
 * 统一主/次/危险/幽灵按钮：复用 uiClasses token，补齐 loading、aria-busy、触控最小高度。
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    theme,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className = '',
    type = 'button',
    children,
    ...rest
  },
  ref,
) {
  const baseVariant =
    variant === 'primary'
      ? btnPrimary
      : variant === 'danger'
        ? btnDanger
        : variant === 'ghost'
          ? btnGhost(theme)
          : btnSecondary(theme);

  const sizeOverride = size === 'sm' ? sizeClass.sm : '';
  const merged = [baseVariant, sizeOverride, className].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={merged}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0 motion-reduce:animate-none" aria-hidden />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
});
