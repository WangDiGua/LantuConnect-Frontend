import type { Theme } from '../types';

const D = (t: Theme) => t === 'dark';

export const btnPrimary = 'px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.97] transition-all';
export const btnDanger = 'px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-[0.97] transition-all';

export function btnSecondary(theme: Theme) {
  return `px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
    D(theme) ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
  }`;
}

export function btnGhost(theme: Theme) {
  return `px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
    D(theme) ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

export function tableHeadCell(theme: Theme) {
  return `px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left whitespace-nowrap ${
    D(theme) ? 'bg-[#2C2C2E] text-slate-400' : 'bg-slate-50 text-slate-500'
  }`;
}

export function tableBodyRow(theme: Theme, index: number) {
  const zebra = index % 2 === 0
    ? ''
    : D(theme) ? 'bg-white/[0.03]' : 'bg-slate-50/50';
  const hover = D(theme) ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100/60';
  return `${zebra} ${hover} transition-colors`;
}

export function tableCell() {
  return 'px-4 py-3 text-sm whitespace-nowrap';
}

export type DomainStatus = 'draft' | 'pending_review' | 'testing' | 'published' | 'rejected' | 'deprecated' | 'active' | 'inactive';

const STATUS_LABEL: Record<DomainStatus, string> = {
  draft: '草稿',
  pending_review: '待审核',
  testing: '测试中',
  published: '已发布',
  rejected: '已驳回',
  deprecated: '已废弃',
  active: '启用',
  inactive: '停用',
};

const STATUS_COLOR: Record<DomainStatus, { light: string; dark: string }> = {
  draft:          { light: 'bg-slate-100 text-slate-600', dark: 'bg-white/10 text-slate-400' },
  pending_review: { light: 'bg-amber-100 text-amber-700', dark: 'bg-amber-500/15 text-amber-400' },
  testing:        { light: 'bg-blue-100 text-blue-700', dark: 'bg-blue-500/15 text-blue-400' },
  published:      { light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-500/15 text-emerald-400' },
  rejected:       { light: 'bg-red-100 text-red-700', dark: 'bg-red-500/15 text-red-400' },
  deprecated:     { light: 'bg-orange-100 text-orange-700', dark: 'bg-orange-500/15 text-orange-400' },
  active:         { light: 'bg-emerald-100 text-emerald-700', dark: 'bg-emerald-500/15 text-emerald-400' },
  inactive:       { light: 'bg-slate-100 text-slate-600', dark: 'bg-white/10 text-slate-400' },
};

export function statusBadgeClass(status: DomainStatus, theme: Theme) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.draft;
  return `inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${theme === 'dark' ? c.dark : c.light}`;
}

export function statusLabel(status: DomainStatus) {
  return STATUS_LABEL[status] || status;
}

export function cardClass(theme: Theme) {
  return `rounded-2xl border shadow-none ${
    D(theme) ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
  }`;
}

export function pageBg(theme: Theme) {
  return D(theme) ? 'bg-[#000000]' : 'bg-[#F2F2F7]';
}
