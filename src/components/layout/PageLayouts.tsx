import React from 'react';
import { sectionGap, cardGap, detailRailWidth, contentMaxWidth, contentPaddingX } from '../../utils/uiClasses';

interface BaseLayoutProps {
  children: React.ReactNode;
  className?: string;
}

function shellClasses(base: string, className?: string): string {
  return className ? `${base} ${className}` : base;
}

/** Dashboard layout: balanced content width with generous section rhythm. */
export const DashboardLayout: React.FC<BaseLayoutProps> = ({ children, className }) => (
  <div
    className={shellClasses(
      `w-full min-w-0 pb-6 sm:pb-7 ${sectionGap}`,
      className,
    )}
  >
    {children}
  </div>
);

/** Market layout: slightly wider spacing for hero + card grids. */
export const MarketLayout: React.FC<BaseLayoutProps> = ({ children, className }) => (
  <div
    className={shellClasses(
      `mx-auto w-full ${contentMaxWidth} ${contentPaddingX} pb-5 sm:pb-6 ${sectionGap}`,
      className,
    )}
  >
    {children}
  </div>
);

/** Detail layout: content column + right rail at xl+. */
export const DetailLayout: React.FC<BaseLayoutProps> = ({ children, className }) => (
  <div
    className={shellClasses(
      `w-full min-w-0 pb-5 sm:pb-6 grid grid-cols-1 ${detailRailWidth} ${cardGap} content-start`,
      className,
    )}
  >
    {children}
  </div>
);

