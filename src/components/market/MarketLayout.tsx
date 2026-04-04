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
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${mainScrollPadBottom} ${canvasBodyBg(theme)}`}>
      {/* 横向留白由资源市场 Hub（mainScrollPadX）统一提供，避免与顶栏说明卡不对齐或双重缩进 */}
      <div className={`px-0 py-4 sm:py-5 ${className}`}>
        <div className={`${bentoCard(theme)} overflow-hidden p-5 sm:p-7 lg:p-9`}>
          {children}
        </div>
      </div>
    </div>
  );
};
