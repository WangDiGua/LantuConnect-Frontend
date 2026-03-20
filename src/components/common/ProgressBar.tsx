import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Theme, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';

export interface ProgressBarProps {
  /** 进度值 0-100 */
  value: number;
  /** 主题 */
  theme: Theme;
  /** 主题色 */
  themeColor?: ThemeColor;
  /** 显示标签 */
  showLabel?: boolean;
  /** 显示速度（字节/秒） */
  speed?: number;
  /** 自定义标签 */
  label?: string;
  /** 高度 */
  height?: 'sm' | 'md' | 'lg';
  /** 是否显示动画 */
  animated?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 进度条组件
 * 支持百分比显示、速度显示、主题切换
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  theme,
  themeColor = 'blue',
  showLabel = true,
  speed,
  label,
  height = 'md',
  animated = true,
  className = '',
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const clampedValue = Math.max(0, Math.min(100, value));

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const formatSpeed = (bytesPerSec?: number): string => {
    if (!bytesPerSec) return '';
    if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label || speed) && (
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {label || `${clampedValue.toFixed(1)}%`}
          </span>
          {speed !== undefined && (
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {formatSpeed(speed)}
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full ${heightClasses[height]} rounded-full overflow-hidden ${
          isDark ? 'bg-white/10' : 'bg-slate-200'
        }`}
      >
        <motion.div
          className={`${heightClasses[height]} rounded-full ${tc.bg} ${animated ? '' : ''}`}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${clampedValue}%` }}
          transition={animated ? { duration: 0.3, ease: 'easeOut' } : { duration: 0 }}
        />
      </div>
    </div>
  );
};
