import React from 'react';
import { motion } from 'framer-motion';
import { Theme } from '../../types';

export interface SkeletonLoaderProps {
  /** 主题 */
  theme: Theme;
  /** 类型 */
  type?: 'text' | 'circle' | 'rect' | 'card' | 'list';
  /** 宽度 */
  width?: string | number;
  /** 高度 */
  height?: string | number;
  /** 是否显示动画 */
  animated?: boolean;
  /** 圆角 */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 自定义类名 */
  className?: string;
  /** 数量（用于列表） */
  count?: number;
}

/**
 * 骨架屏加载组件
 * 提供流畅的加载动画
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  theme,
  type = 'rect',
  width,
  height,
  animated = true,
  rounded = 'md',
  className = '',
  count = 1,
}) => {
  const isDark = theme === 'dark';

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full',
  };

  const baseClasses = `${roundedClasses[rounded]} ${
    isDark ? 'bg-white/10' : 'bg-slate-200'
  } ${className}`;

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const getDefaultSize = () => {
    switch (type) {
      case 'text':
        return { width: width || '100%', height: height || '1rem' };
      case 'circle':
        return { width: width || 40, height: height || 40 };
      case 'rect':
        return { width: width || '100%', height: height || '100px' };
      case 'card':
        return { width: width || '100%', height: height || '200px' };
      case 'list':
        return { width: width || '100%', height: height || '60px' };
      default:
        return { width: width || '100%', height: height || '100px' };
    }
  };

  const defaultSize = getDefaultSize();

  const skeletonContent = (
    <motion.div
      className={baseClasses}
      style={{ ...defaultSize, ...style }}
      animate={
        animated
          ? {
              opacity: [0.5, 1, 0.5],
            }
          : {}
      }
      transition={
        animated
          ? {
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : {}
      }
    />
  );

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <React.Fragment key={i}>{skeletonContent}</React.Fragment>
        ))}
      </div>
    );
  }

  return skeletonContent;
};
