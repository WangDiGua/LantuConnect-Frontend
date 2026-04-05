import React from 'react';
import type { Theme } from '../../types';
import { bentoCard, bentoCardPointerHover } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  /** 图三：当前项选中（如详情已打开且对应该卡） */
  selected?: boolean;
  glow?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan';
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

/** 低强度彩色晕影，叠在 bentoCardPointerHover 之上（变量见 index.css） */
const GLOW_MAP = {
  indigo: 'motion-safe:hover:shadow-[var(--shadow-glow-indigo)]',
  emerald: 'motion-safe:hover:shadow-[var(--shadow-glow-emerald)]',
  amber: 'motion-safe:hover:shadow-[var(--shadow-glow-amber)]',
  rose: 'motion-safe:hover:shadow-[var(--shadow-glow-rose)]',
  cyan: 'motion-safe:hover:shadow-[var(--shadow-glow-cyan)]',
};

const PAD_MAP = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

export const BentoCard: React.FC<Props> = ({
  theme,
  children,
  className = '',
  hover = false,
  selected = false,
  glow,
  padding = 'md',
  onClick,
}) => {
  const styleOpts = { selected };
  const base = bentoCard(theme, styleOpts);
  const hoverCls = hover ? `${bentoCardPointerHover(theme, styleOpts)} cursor-pointer` : '';
  const glowCls = glow ? GLOW_MAP[glow] : '';

  return (
    <div
      onClick={onClick}
      className={`${base} ${hoverCls} ${glowCls} ${PAD_MAP[padding]} ${className}`}
      aria-current={selected ? 'true' : undefined}
      data-selected={selected ? 'true' : undefined}
    >
      {children}
    </div>
  );
};
