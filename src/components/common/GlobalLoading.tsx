import React from 'react';
import { LoaderCircle } from 'lucide-react';
import type { Theme } from '../../types';

interface GlobalLoadingProps {
  theme?: Theme;
  label?: string;
  fullscreen?: boolean;
}

export const GlobalLoading: React.FC<GlobalLoadingProps> = ({
  theme = 'light',
  label = '页面加载中',
  fullscreen = false,
}) => {
  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#212121' : '#f5f6fa';

  return (
    <div
      className={`flex w-full items-center justify-center ${
        fullscreen ? 'fixed inset-0 z-[120] min-h-screen' : 'min-h-[46vh]'
      }`}
      style={{ backgroundColor }}
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-3">
        <LoaderCircle
          size={26}
          className={`animate-spin ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}
          strokeWidth={2}
          aria-hidden
        />
        <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {label}
        </span>
      </div>
    </div>
  );
};
