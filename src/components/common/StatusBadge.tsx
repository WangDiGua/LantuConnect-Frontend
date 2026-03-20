import React from 'react';
import { Theme } from '../../types';

export type StatusType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'pending' 
  | 'active' 
  | 'inactive' 
  | 'running' 
  | 'stopped';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  status: StatusType;
  variant?: 'solid' | 'outline' | 'subtle';
  size?: BadgeSize;
  theme: Theme;
  className?: string;
  children?: React.ReactNode;
}

const statusConfig: Record<
  StatusType,
  {
    label: string;
    light: { solid: string; outline: string; subtle: string };
    dark: { solid: string; outline: string; subtle: string };
  }
> = {
  success: {
    label: '成功',
    light: {
      solid: 'bg-emerald-600 text-white',
      outline: 'border-emerald-600 text-emerald-700 bg-transparent',
      subtle: 'bg-emerald-100 text-emerald-800',
    },
    dark: {
      solid: 'bg-emerald-500 text-white',
      outline: 'border-emerald-500 text-emerald-300 bg-transparent',
      subtle: 'bg-emerald-500/20 text-emerald-300',
    },
  },
  error: {
    label: '错误',
    light: {
      solid: 'bg-red-600 text-white',
      outline: 'border-red-600 text-red-700 bg-transparent',
      subtle: 'bg-red-100 text-red-800',
    },
    dark: {
      solid: 'bg-red-500 text-white',
      outline: 'border-red-500 text-red-300 bg-transparent',
      subtle: 'bg-red-500/20 text-red-300',
    },
  },
  warning: {
    label: '警告',
    light: {
      solid: 'bg-amber-600 text-white',
      outline: 'border-amber-600 text-amber-700 bg-transparent',
      subtle: 'bg-amber-100 text-amber-800',
    },
    dark: {
      solid: 'bg-amber-500 text-white',
      outline: 'border-amber-500 text-amber-300 bg-transparent',
      subtle: 'bg-amber-500/20 text-amber-300',
    },
  },
  info: {
    label: '信息',
    light: {
      solid: 'bg-blue-600 text-white',
      outline: 'border-blue-600 text-blue-700 bg-transparent',
      subtle: 'bg-blue-100 text-blue-800',
    },
    dark: {
      solid: 'bg-blue-500 text-white',
      outline: 'border-blue-500 text-blue-300 bg-transparent',
      subtle: 'bg-blue-500/20 text-blue-300',
    },
  },
  pending: {
    label: '待处理',
    light: {
      solid: 'bg-slate-600 text-white',
      outline: 'border-slate-600 text-slate-700 bg-transparent',
      subtle: 'bg-slate-100 text-slate-700',
    },
    dark: {
      solid: 'bg-slate-500 text-white',
      outline: 'border-slate-500 text-slate-300 bg-transparent',
      subtle: 'bg-white/10 text-slate-400',
    },
  },
  active: {
    label: '启用',
    light: {
      solid: 'bg-emerald-600 text-white',
      outline: 'border-emerald-600 text-emerald-700 bg-transparent',
      subtle: 'bg-emerald-100 text-emerald-800',
    },
    dark: {
      solid: 'bg-emerald-500 text-white',
      outline: 'border-emerald-500 text-emerald-300 bg-transparent',
      subtle: 'bg-emerald-500/20 text-emerald-300',
    },
  },
  inactive: {
    label: '停用',
    light: {
      solid: 'bg-slate-600 text-white',
      outline: 'border-slate-600 text-slate-700 bg-transparent',
      subtle: 'bg-slate-200 text-slate-700',
    },
    dark: {
      solid: 'bg-slate-500 text-white',
      outline: 'border-slate-500 text-slate-300 bg-transparent',
      subtle: 'bg-white/10 text-slate-400',
    },
  },
  running: {
    label: '运行中',
    light: {
      solid: 'bg-emerald-600 text-white',
      outline: 'border-emerald-600 text-emerald-700 bg-transparent',
      subtle: 'bg-emerald-100 text-emerald-800',
    },
    dark: {
      solid: 'bg-emerald-500 text-white',
      outline: 'border-emerald-500 text-emerald-300 bg-transparent',
      subtle: 'bg-emerald-500/20 text-emerald-300',
    },
  },
  stopped: {
    label: '已停止',
    light: {
      solid: 'bg-slate-600 text-white',
      outline: 'border-slate-600 text-slate-700 bg-transparent',
      subtle: 'bg-slate-200 text-slate-700',
    },
    dark: {
      solid: 'bg-slate-500 text-white',
      outline: 'border-slate-500 text-slate-300 bg-transparent',
      subtle: 'bg-white/10 text-slate-400',
    },
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'subtle',
  size = 'md',
  theme,
  className = '',
  children,
}) => {
  const isDark = theme === 'dark';
  const config = statusConfig[status];
  const variantClasses = isDark ? config.dark[variant] : config.light[variant];
  const sizeClass = sizeClasses[size];
  const borderClass = variant === 'outline' ? 'border' : '';

  return (
    <span
      className={`badge inline-flex items-center whitespace-nowrap rounded-full font-medium ${variantClasses} ${sizeClass} ${borderClass} ${className}`}
    >
      {children || config.label}
    </span>
  );
};
