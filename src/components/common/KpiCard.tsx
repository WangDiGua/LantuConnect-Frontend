import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Theme } from '../../types';
import { bentoCard, textPrimary, textSecondary } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  label: string;
  value: string | number;
  trend?: number;
  icon?: React.ReactNode;
  glow?: 'indigo' | 'emerald' | 'amber' | 'rose';
  delay?: number;
}

const GLOW_MAP = {
  indigo: 'hover:shadow-[var(--shadow-glow-indigo)]',
  emerald: 'hover:shadow-[var(--shadow-glow-emerald)]',
  amber: 'hover:shadow-[var(--shadow-glow-amber)]',
  rose: 'hover:shadow-[var(--shadow-glow-rose)]',
};

export const KpiCard: React.FC<Props> = ({ theme, label, value, trend, icon, glow = 'indigo', delay = 0 }) => {
  const trendColor = !trend ? 'text-slate-400' : trend > 0 ? 'text-emerald-500' : 'text-rose-500';
  const TrendIcon = !trend ? Minus : trend > 0 ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay }}
      whileHover={{ y: -3 }}
      className={`${bentoCard(theme)} ${GLOW_MAP[glow]} p-5 transition-all cursor-default`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-medium uppercase tracking-wider ${textSecondary(theme)}`}>
          {label}
        </span>
        {icon && <div className="opacity-40">{icon}</div>}
      </div>

      <div className="flex items-end gap-3">
        <span className={`text-3xl font-bold tracking-tight ${textPrimary(theme)}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor} mb-1`}>
            <TrendIcon size={12} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </motion.div>
  );
};
