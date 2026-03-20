import React from 'react';
import { Theme, FontSize } from '../../types';

interface UserAppShellProps {
  theme: Theme;
  fontSize: FontSize;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const UserAppShell: React.FC<UserAppShellProps> = ({
  theme,
  fontSize,
  title,
  subtitle,
  actions,
  children,
}) => {
  const isDark = theme === 'dark';
  const titleCls =
    fontSize === 'small' ? 'text-lg' : fontSize === 'medium' ? 'text-xl' : 'text-2xl';
  return (
    <div
      className={`flex-1 overflow-y-auto min-h-0 ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className={`${titleCls} font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h1>
            {subtitle && (
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
};

export function cardClass(theme: Theme): string {
  return theme === 'light'
    ? 'rounded-2xl border border-slate-200/80 bg-white shadow-none'
    : 'rounded-2xl border border-white/10 bg-[#1C1C1E] shadow-none';
}

export function inputClass(theme: Theme): string {
  return theme === 'light'
    ? 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20'
    : 'w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/30';
}

export const btnPrimaryClass =
  'px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all';
export const btnGhostClass = (theme: Theme) =>
  theme === 'light'
    ? 'px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200'
    : 'px-4 py-2 rounded-xl text-sm font-medium text-slate-200 bg-white/10 hover:bg-white/15';
