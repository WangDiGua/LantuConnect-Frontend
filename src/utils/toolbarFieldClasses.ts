import { Theme } from '../types';

/** 管理列表工具栏：横向基础排布（可与 justify-between 组合） */
export const TOOLBAR_ROW = 'flex w-full flex-row flex-wrap items-center gap-2 sm:gap-3';

/**
 * 列表页筛选行：强制单行，极窄时横向滚动（搜索 + 下拉 + 主按钮同排）
 */
export const TOOLBAR_ROW_LIST =
  'flex w-full min-h-[2.5rem] flex-row flex-nowrap items-center gap-2 sm:gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

export function toolbarSearchInputClass(theme: Theme): string {
  const d = theme === 'dark';
  return `w-full pl-10 pr-4 rounded-xl border text-[13px] min-h-[2.5rem] box-border outline-none transition-all duration-300 shadow-sm ${
    d
      ? 'bg-[#2C2C2E] border-white/10 text-white placeholder:text-neutral-500 focus:ring-4 focus:ring-white/5 focus:border-white/30'
      : 'bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-300 focus:ring-4 focus:ring-neutral-900/5 focus:border-neutral-900 focus:bg-white'
  }`;
}
