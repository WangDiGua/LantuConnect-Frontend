import type { Theme } from '../types';

const D = (t: Theme) => t === 'dark';

/* ═══════════════════════════════════════════
   Page & Surface
   ═══════════════════════════════════════════ */

export function pageBg(theme: Theme) {
  return D(theme)
    ? 'bg-gradient-to-br from-[#0c0f17] to-[#111827]'
    : 'bg-gradient-to-br from-slate-100 to-[#e8eef5]';
}

export function surfaceBg(theme: Theme) {
  return D(theme) ? 'bg-[#141820]' : 'bg-white';
}

/* ═══════════════════════════════════════════
   Glass
   ═══════════════════════════════════════════ */

export function glassSidebar(theme: Theme) {
  return D(theme)
    ? 'bg-[#141820]/70 backdrop-blur-2xl border-r border-white/[0.06]'
    : 'bg-white/50 backdrop-blur-2xl border-r border-slate-200/40';
}

export function glassPanel(theme: Theme) {
  return D(theme)
    ? 'bg-[#1a1f2e]/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl'
    : 'bg-white/60 backdrop-blur-xl border border-slate-200/40 rounded-2xl';
}

/* ═══════════════════════════════════════════
   Bento Cards
   ═══════════════════════════════════════════ */

export function bentoCard(theme: Theme) {
  return `rounded-2xl border transition-all duration-200 ${
    D(theme)
      ? 'bg-[#1a1f2e] border-white/[0.06] shadow-[var(--shadow-card)]'
      : 'bg-white border-slate-100 shadow-[var(--shadow-card)]'
  }`;
}

export function bentoCardHover(theme: Theme) {
  return `${bentoCard(theme)} hover:shadow-[var(--shadow-card-hover)] hover:border-indigo-500/20`;
}

export function cardClass(theme: Theme) {
  return bentoCard(theme);
}

/* ═══════════════════════════════════════════
   Glow Shadows (for hover)
   ═══════════════════════════════════════════ */

export const glowIndigo = 'hover:shadow-[var(--shadow-glow-indigo)]';
export const glowEmerald = 'hover:shadow-[var(--shadow-glow-emerald)]';
export const glowAmber = 'hover:shadow-[var(--shadow-glow-amber)]';
export const glowRose = 'hover:shadow-[var(--shadow-glow-rose)]';

/* ═══════════════════════════════════════════
   Buttons — hand-crafted, no DaisyUI
   ═══════════════════════════════════════════ */

export const btnPrimary = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] transition-all shadow-sm hover:shadow-[var(--shadow-glow-indigo)]';

export const btnDanger = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-[0.97] transition-all shadow-sm hover:shadow-[var(--shadow-glow-rose)]';

export function btnSecondary(theme: Theme) {
  return `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-[0.97] ${
    D(theme)
      ? 'border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/15'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
  }`;
}

export function btnGhost(theme: Theme) {
  return `inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
    D(theme) ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
  }`;
}

/* ═══════════════════════════════════════════
   Table — wide card-style rows
   ═══════════════════════════════════════════ */

export function tableHeadCell(theme: Theme) {
  return `px-5 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-left whitespace-nowrap ${
    D(theme) ? 'text-slate-500' : 'text-slate-400'
  }`;
}

export function tableBodyRow(theme: Theme, index: number) {
  const zebra = index % 2 !== 0
    ? D(theme) ? 'bg-white/[0.02]' : 'bg-slate-50/40'
    : '';
  const hover = D(theme) ? 'hover:bg-white/[0.04]' : 'hover:bg-indigo-50/30';
  return `${zebra} ${hover} transition-colors group/row`;
}

export function tableCell() {
  return 'px-5 py-4 text-sm';
}

/* ═══════════════════════════════════════════
   Status Badges
   ═══════════════════════════════════════════ */

export type DomainStatus = 'draft' | 'pending_review' | 'testing' | 'published' | 'rejected' | 'deprecated' | 'active' | 'inactive';

const STATUS_LABEL: Record<DomainStatus, string> = {
  draft: '草稿', pending_review: '待审核', testing: '测试中', published: '已发布',
  rejected: '已驳回', deprecated: '已废弃', active: '启用', inactive: '停用',
};

const STATUS_DOT: Record<DomainStatus, string> = {
  draft: 'bg-slate-400', pending_review: 'bg-amber-400', testing: 'bg-blue-400', published: 'bg-emerald-400',
  rejected: 'bg-rose-400', deprecated: 'bg-orange-400', active: 'bg-emerald-400', inactive: 'bg-slate-400',
};

const STATUS_COLOR: Record<DomainStatus, { light: string; dark: string }> = {
  draft:          { light: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60', dark: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20' },
  pending_review: { light: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60', dark: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' },
  testing:        { light: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60', dark: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' },
  published:      { light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' },
  rejected:       { light: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60', dark: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20' },
  deprecated:     { light: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/60', dark: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20' },
  active:         { light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' },
  inactive:       { light: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60', dark: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20' },
};

export function statusBadgeClass(status: DomainStatus, theme: Theme) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.draft;
  return `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${D(theme) ? c.dark : c.light}`;
}

export function statusDot(status: DomainStatus) {
  return `w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-slate-400'}`;
}

export function statusLabel(status: DomainStatus) {
  return STATUS_LABEL[status] || status;
}

/* ═══════════════════════════════════════════
   Typography helpers
   ═══════════════════════════════════════════ */

export function textPrimary(theme: Theme) {
  return D(theme) ? 'text-slate-100' : 'text-slate-900';
}

export function textSecondary(theme: Theme) {
  return D(theme) ? 'text-slate-400' : 'text-slate-500';
}

export function textMuted(theme: Theme) {
  return D(theme) ? 'text-slate-500' : 'text-slate-400';
}

/* ═══════════════════════════════════════════
   Misc. tech badge (for "Agent/Skill/MCP" labels)
   ═══════════════════════════════════════════ */

export function techBadge(theme: Theme) {
  return `text-[10px] uppercase tracking-widest font-medium px-1.5 py-0.5 rounded ${
    D(theme) ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'
  }`;
}
