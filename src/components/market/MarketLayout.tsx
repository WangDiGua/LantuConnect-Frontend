import React from 'react';
import type { MarketThemeProps } from '../../hooks/market/types';
import {
  bentoCard,
  canvasBodyBg,
  consoleContentTopPad,
  mainScrollCompositorClass,
  mainScrollPadBottom,
} from '../../utils/uiClasses';

interface MarketLayoutProps extends MarketThemeProps {
  children: React.ReactNode;
  className?: string;
}

export const MarketLayout: React.FC<MarketLayoutProps> = ({ 
  theme, 
  children, 
  className = '' 
}) => {
  return (
    <div className={`w-full ${mainScrollPadBottom} ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      {/* 纵向滚动仅由 MainLayout 主列承担，避免嵌套滚动条与滑块比例失真 */}
      <div className={`px-0 ${consoleContentTopPad} ${className}`}>
        <div
          className={`${bentoCard(theme)} overflow-hidden px-5 pt-4 sm:px-7 sm:pt-5 lg:px-9 lg:pt-6 pb-5 sm:pb-7 lg:pb-9`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
