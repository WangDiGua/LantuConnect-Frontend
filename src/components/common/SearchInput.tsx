import React from 'react';
import { Search, X } from 'lucide-react';
import { Theme } from '../../types';
import { toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { iconButton } from '../../utils/uiClasses';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 可访问名称；不设时读屏依赖 placeholder */
  ariaLabel?: string;
  onClear?: () => void;
  className?: string;
  theme: Theme;
  disabled?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = '搜索...',
  ariaLabel,
  onClear,
  className = '',
  theme,
  disabled = false,
}) => {
  const isDark = theme === 'dark';
  const hasValue = value.length > 0;

  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={`relative flex-1 min-w-0 ${className}`}>
      <Search
        className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${
          isDark ? 'text-neutral-500' : 'text-neutral-400'
        }`}
        size={16}
        aria-hidden
      />
      <input
        type="text"
        inputMode="search"
        role="searchbox"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className={toolbarSearchInputClass(theme)}
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className={`absolute right-2 top-1/2 -translate-y-1/2 ${iconButton(theme)} !min-h-8 !min-w-8`}
          title="清除"
          aria-label="清除搜索"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
};
