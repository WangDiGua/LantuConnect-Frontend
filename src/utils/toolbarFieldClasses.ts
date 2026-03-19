import { Theme } from '../types';

/** 工具栏整行：小屏纵向，sm 起横向且垂直居中对齐（搜索与下拉同一水平线） */
export const TOOLBAR_ROW = 'flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3';

/** 与 `nativeSelectClass` 同高，便于与下拉框基线一致 */
export function toolbarSearchInputClass(theme: Theme): string {
  const d = theme === 'dark';
  return `w-full pl-9 pr-3 rounded-xl border text-sm min-h-[2.5rem] box-border outline-none focus:ring-1 focus:ring-blue-500/30 ${
    d ? 'bg-[#2C2C2E] border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;
}
