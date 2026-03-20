import { Theme } from '../types';

/**
 * 原生 `<select>`：与 UI 规范 §1 一致（rounded-xl、边框、深浅主题），去除浏览器默认箭头并统一样式。
 * 使用 .lantu-select 在 index.css 中提供自定义下拉箭头。
 */
export function nativeSelectClass(theme: Theme): string {
  const d = theme === 'dark';
  return `lantu-select w-full rounded-xl border px-3 py-2 pr-9 text-sm min-h-[2.5rem] outline-none focus:ring-1 focus:ring-blue-500/30 appearance-none bg-no-repeat bg-[length:1rem_1rem] bg-[position:right_0.75rem_center] ${
    d ? 'bg-[#2C2C2E] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
  }`;
}

/** 原生 `<input>` / `<textarea>`（非 Daisy join 内） */
export function nativeInputClass(theme: Theme): string {
  const d = theme === 'dark';
  return `w-full rounded-xl border px-3 py-2 text-sm min-h-[2.5rem] box-border outline-none focus:ring-1 focus:ring-blue-500/30 ${
    d ? 'bg-[#2C2C2E] border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;
}

/**
 * DaisyUI 筛选条用小号下拉：统一圆角与高度（与 §1 控件 12px 一致）
 * 需配合 `select select-bordered`
 */
export const DAISY_SELECT_FILTER =
  'select select-bordered select-sm text-xs h-9 min-h-0 rounded-xl';

/** 表单整宽 Daisy 下拉 */
export const DAISY_SELECT_FORM = 'select select-bordered w-full rounded-xl';
