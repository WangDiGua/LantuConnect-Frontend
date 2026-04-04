import React from 'react';
import { Search } from 'lucide-react';
import type { MarketThemeProps } from '../../hooks/market/types';
import { iconMuted, textPrimary } from '../../utils/uiClasses';
import { GlassPanel } from '../common/GlassPanel';

interface MarketSearchBarProps extends MarketThemeProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const MarketSearchBar: React.FC<MarketSearchBarProps> = ({
  theme,
  value,
  onChange,
  placeholder = '搜索...',
  className = '',
}) => {
  return (
    <GlassPanel theme={theme} padding="sm" className={`!p-0 w-full sm:w-72 ${className}`}>
      <div className="relative">
        <Search
          size={16}
          className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`}
          aria-hidden
        />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-transparent pl-9 pr-3 py-2.5 text-sm rounded-lg outline-none transition-shadow motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-sky-500/35 focus-visible:ring-inset ${textPrimary(theme)}`}
        />
      </div>
    </GlassPanel>
  );
};
