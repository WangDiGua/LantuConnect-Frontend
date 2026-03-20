import React from 'react';
import { Search, X } from 'lucide-react';
import { Theme } from '../../types';
import { toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
  theme: Theme;
  disabled?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = '搜索...',
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
        className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
        size={16}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={toolbarSearchInputClass(theme)}
      />
      {hasValue && (
        <button
          onClick={handleClear}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
            isDark
              ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
          title="清除"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
