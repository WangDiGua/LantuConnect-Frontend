import React from 'react';
import type { MarketThemeProps } from '../../hooks/market/types';
import { canvasBodyBg, mainScrollCompositorClass, bentoCard } from '../../utils/uiClasses';

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
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <div className={`px-3 py-4 sm:px-4 lg:px-5 ${className}`}>
        <div className={`${bentoCard(theme)} overflow-hidden p-4 sm:p-6 lg:p-8`}>
          {children}
        </div>
      </div>
    </div>
  );
};
