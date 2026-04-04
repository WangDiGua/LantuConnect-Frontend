import { Theme } from '../types';

export function nativeSelectTriggerClass(theme: Theme): string {
  const d = theme === 'dark';
  return `w-full rounded-xl border px-3 py-2.5 text-[13px] min-h-[2.5rem] outline-none transition-all duration-200 motion-reduce:transition-none shadow-sm focus-visible:outline-none ${
    d
      ? 'bg-[#2C2C2E] border-white/10 text-white focus-visible:ring-2 focus-visible:ring-sky-500/35 focus-visible:border-white/25'
      : 'bg-neutral-50/50 border-neutral-200 text-neutral-900 hover:border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-900/10 focus-visible:border-neutral-900 focus:bg-white'
  }`;
}

export function nativeSelectClass(theme: Theme): string {
  return `${nativeSelectTriggerClass(theme)} lantu-select appearance-none bg-no-repeat bg-[length:1rem_1rem] bg-[position:right_0.75rem_center] pr-9`;
}

export function nativeInputClass(theme: Theme): string {
  const d = theme === 'dark';
  return `w-full rounded-xl border px-4 py-2.5 text-[13px] min-h-[2.5rem] box-border outline-none transition-all duration-200 motion-reduce:transition-none shadow-sm focus-visible:outline-none ${
    d
      ? 'bg-[#2C2C2E] border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-sky-500/35 focus-visible:border-white/25'
      : 'bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-900/10 focus-visible:border-neutral-900 focus:bg-white'
  }`;
}

export const DAISY_SELECT_FILTER =
  'select select-bordered select-sm text-xs h-9 min-h-0 rounded-xl';

export const DAISY_SELECT_FORM = 'select select-bordered w-full rounded-xl';
