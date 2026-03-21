import React from 'react';
import { motion } from 'framer-motion';
import type { Theme } from '../../types';
import { bentoCard } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'indigo' | 'emerald' | 'amber' | 'rose';
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const GLOW_MAP = {
  indigo: 'hover:shadow-[var(--shadow-glow-indigo)]',
  emerald: 'hover:shadow-[var(--shadow-glow-emerald)]',
  amber: 'hover:shadow-[var(--shadow-glow-amber)]',
  rose: 'hover:shadow-[var(--shadow-glow-rose)]',
};

const PAD_MAP = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

export const BentoCard: React.FC<Props> = ({
  theme, children, className = '', hover = false, glow, padding = 'md', onClick,
}) => {
  const base = bentoCard(theme);
  const hoverCls = hover ? 'hover:shadow-[var(--shadow-card-hover)] hover:border-indigo-500/15 cursor-pointer' : '';
  const glowCls = glow ? GLOW_MAP[glow] : '';

  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={onClick}
      className={`${base} ${hoverCls} ${glowCls} ${PAD_MAP[padding]} ${className}`}
    >
      {children}
    </motion.div>
  );
};
