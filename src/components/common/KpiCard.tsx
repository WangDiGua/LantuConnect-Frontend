import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Theme } from '../../types';
import { bentoCard, iconMuted, textPrimary, textSecondary } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  label: string;
  value: string | number;
  trend?: number;
  trendType?: 'up' | 'down' | 'flat';
  previousValue?: string | number;
  icon?: React.ReactNode;
  glow?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'cyan';
  delay?: number;
}

const GLOW_MAP = {
  indigo: 'hover:shadow-[var(--shadow-glow-indigo)]',
  emerald: 'hover:shadow-[var(--shadow-glow-emerald)]',
  amber: 'hover:shadow-[var(--shadow-glow-amber)]',
  rose: 'hover:shadow-[var(--shadow-glow-rose)]',
  violet: 'hover:shadow-[var(--shadow-glow-violet)]',
  cyan: 'hover:shadow-[var(--shadow-glow-cyan)]',
};

export const KpiCard: React.FC<Props> = ({
  theme,
  label,
  value,
  trend,
  trendType,
  previousValue,
  icon,
  glow = 'indigo',
  delay = 0,
}) => {
  const resolvedType =
    trendType ?? (trend == null || trend === 0 ? 'flat' : trend > 0 ? 'up' : 'down');
  const trendColor =
    resolvedType === 'flat' ? 'text-slate-400' : resolvedType === 'up' ? 'text-emerald-500' : 'text-rose-500';
  const TrendIcon = resolvedType === 'flat' ? Minus : resolvedType === 'up' ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay }}
      className={`${bentoCard(theme)} ${GLOW_MAP[glow]} p-6 transition-all cursor-default`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-medium uppercase tracking-wider ${textSecondary(theme)}`}>
          {label}
        </span>
        {icon && <div className={`shrink-0 ${iconMuted(theme)}`}>{icon}</div>}
      </div>

      <div className="flex items-end gap-3">
        <span
          className={`text-3xl font-bold tracking-tight tabular-nums min-h-[2.25rem] inline-block ${textPrimary(theme)}`}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor} mb-1`}>
            <TrendIcon size={12} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {previousValue !== undefined && previousValue !== null && (
        <p className={`mt-2 text-xs ${textSecondary(theme)}`}>前值: {String(previousValue)}</p>
      )}
    </motion.div>
  );
};
