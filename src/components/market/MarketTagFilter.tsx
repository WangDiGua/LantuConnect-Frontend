import React from 'react';
import type { MarketThemeProps } from '../../hooks/market/types';
import { textMuted } from '../../utils/uiClasses';

interface TagItem {
  id: string | number;
  name: string;
  usageCount?: number;
}

interface MarketTagFilterProps extends MarketThemeProps {
  tags: TagItem[];
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
  showAll?: boolean;
  className?: string;
}

export const MarketTagFilter: React.FC<MarketTagFilterProps> = ({
  theme,
  tags,
  activeTag,
  onTagChange,
  showAll = true,
  className = '',
}) => {
  const isDark = theme === 'dark';

  const buttonClass = (isActive: boolean) =>
    `px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
      isActive
        ? 'bg-neutral-900 text-white shadow-sm shadow-neutral-900/15'
        : isDark
          ? 'text-slate-400 hover:bg-white/5'
          : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className={`flex flex-wrap gap-2 mb-5 items-center ${className}`}>
      <span className={`text-xs font-medium shrink-0 ${textMuted(theme)}`}>标签：</span>
      {showAll && (
        <button
          type="button"
          onClick={() => onTagChange(null)}
          className={buttonClass(activeTag === null)}
        >
          全部
        </button>
      )}
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onTagChange(activeTag === tag.name ? null : tag.name)}
          className={buttonClass(activeTag === tag.name)}
        >
          {tag.name}
          {tag.usageCount !== undefined && tag.usageCount > 0 && (
            <span className="ml-1 opacity-70 tabular-nums">·{tag.usageCount}</span>
          )}
        </button>
      ))}
    </div>
  );
};
