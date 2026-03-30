import { Theme } from '../types';

/** 管理列表工具栏：横向排列、窄屏自动换行（不再大屏才把按钮并到一行） */
export const TOOLBAR_ROW = 'flex w-full flex-row flex-wrap items-center gap-2 sm:gap-3';

export function toolbarSearchInputClass(theme: Theme): string {
  const d = theme === 'dark';
  return `w-full pl-10 pr-4 rounded-xl border text-[13px] min-h-[2.5rem] box-border outline-none transition-all duration-300 shadow-sm ${
    d
      ? 'bg-[#2C2C2E] border-white/10 text-white placeholder:text-neutral-500 focus:ring-4 focus:ring-white/5 focus:border-white/30'
      : 'bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-300 focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 focus:bg-white'
  }`;
}
