import { Theme } from '../types';

export const TOOLBAR_ROW = 'flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3';

export function toolbarSearchInputClass(theme: Theme): string {
  const d = theme === 'dark';
  return `w-full pl-10 pr-4 rounded-xl border text-[13px] min-h-[2.5rem] box-border outline-none transition-all duration-300 shadow-sm ${
    d
      ? 'bg-[#2C2C2E] border-white/10 text-white placeholder:text-neutral-500 focus:ring-4 focus:ring-white/5 focus:border-white/30'
      : 'bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-300 focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 focus:bg-white'
  }`;
}
