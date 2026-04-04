import React from 'react';
import type { MarketThemeProps } from '../../hooks/market/types';
import { bentoCard, canvasBodyBg, mainScrollCompositorClass, mainScrollPadBottom, mainScrollPadX } from '../../utils/uiClasses';

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
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${mainScrollPadBottom} ${canvasBodyBg(theme)}`}>
      <div className={`${mainScrollPadX} py-4 sm:py-5 ${className}`}>
        <div className={`${bentoCard(theme)} overflow-hidden p-4 sm:p-6 lg:p-8`}>
          {children}
        </div>
      </div>
    </div>
  );
};
