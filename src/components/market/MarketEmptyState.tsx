import React from 'react';
import type { MarketThemeProps } from '../../hooks/market/types';
import { textMuted, textSecondary } from '../../utils/uiClasses';

interface MarketEmptyStateProps extends MarketThemeProps {
  title?: string;
  description?: string;
}

export const MarketEmptyState: React.FC<MarketEmptyStateProps> = ({
  theme,
  title = '暂无匹配的资源',
  description = '尝试调整搜索关键词或筛选条件',
}) => {
  return (
    <div className="text-center py-20">
      <p className={`text-lg font-medium ${textSecondary(theme)}`}>{title}</p>
      <p className={`text-sm mt-1 ${textMuted(theme)}`}>{description}</p>
    </div>
  );
};
