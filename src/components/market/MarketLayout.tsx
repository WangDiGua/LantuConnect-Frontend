import React from 'react';
import type { MarketThemeProps } from '../../hooks/market/types';
import { bentoCard, canvasBodyBg, mainScrollCompositorClass, mainScrollPadBottom } from '../../utils/uiClasses';

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
      <div className={`px-0 py-4 sm:py-5 ${className}`}>
        <div className={`${bentoCard(theme)} overflow-hidden p-5 sm:p-7 lg:p-9`}>
          {children}
        </div>
      </div>
    </div>
  );
};
