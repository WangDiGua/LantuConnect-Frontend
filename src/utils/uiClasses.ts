import type { Theme } from '../types';

const D = (t: Theme) => t === 'dark';

/* ═══════════════════════════════════════════
   Page & Surface — Canvas layout
   ═══════════════════════════════════════════ */

export function pageBg(theme: Theme) {
  return D(theme) ? 'bg-[#0f1117]' : 'bg-[#FAFAFA]';
}

export const mainScrollPadX = 'px-4 sm:px-5 lg:px-6';
export const mainScrollPadBottom = 'pb-6 sm:pb-8';
/** 主内容区在侧栏与画布内横向占满，不再用 1400px 人为缩窄；可读性由内部卡片/栅格控制 */
export const contentMaxWidth = 'max-w-none';
export const contentPaddingX = 'px-3 sm:px-4 lg:px-6';
export const sectionGap = 'space-y-6';
export const cardGap = 'gap-4';
export const detailRailWidth = 'xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]';

export function surfaceBg(_theme: Theme) {
  return 'bg-transparent';
}

export function canvasBodyBg(theme: Theme) {
  return surfaceBg(theme);
}

export function canvasCard(theme: Theme) {
  return D(theme)
    ? 'bg-[#1e2435] rounded-2xl md:rounded-3xl shadow-[0_2px_24px_-6px_rgba(0,0,0,0.45)] border border-white/[0.09]'
    : 'bg-white rounded-2xl md:rounded-3xl shadow-[0_2px_12px_-4px_rgba(15,23,42,0.07)] border border-slate-200/45';
}

/* ═══════════════════════════════════════════
   Glass
   ═══════════════════════════════════════════ */

export function glassSidebar(theme: Theme) {
  return D(theme)
    ? 'bg-[#141820]/70 backdrop-blur-2xl border-r border-white/[0.06]'
    : 'bg-[#FDFDFD] backdrop-blur-2xl border-r border-neutral-200';
}

export function glassPanel(theme: Theme) {
  return D(theme)
    ? 'bg-[#1a1f2e]/55 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'
    : 'bg-white/80 backdrop-blur-md border border-slate-200/35 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.04)]';
}

/* ═══════════════════════════════════════════
   Cards — 浅色：白卡片 + 极淡边 + 柔和阴影，铺在浅灰主画布上；深色：略抬亮表面 + 轻高光边
   ═══════════════════════════════════════════ */

const CARD_SHADE_LIGHT =
  'shadow-[0_2px_8px_-2px_rgba(15,23,42,0.07),0_1px_2px_-1px_rgba(15,23,42,0.05)]';
const CARD_SHADE_DARK = 'shadow-[0_2px_20px_-6px_rgba(0,0,0,0.5)]';
const CARD_HOVER_LIGHT =
  'hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.11),0_4px_10px_-4px_rgba(15,23,42,0.06)] hover:border-slate-300/55';
const CARD_HOVER_DARK =
  'hover:border-white/[0.13] hover:bg-[#232c3f] hover:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.55)]';

export function bentoCard(theme: Theme) {
  return `rounded-2xl border transition-all duration-200 ${
    D(theme)
      ? `bg-[#1e2435] border-white/[0.09] ${CARD_SHADE_DARK}`
      : `bg-white border-slate-200/50 ${CARD_SHADE_LIGHT}`
  }`;
}

export function bentoCardHover(theme: Theme) {
  return `${bentoCard(theme)} ${D(theme) ? CARD_HOVER_DARK : CARD_HOVER_LIGHT}`;
}

export function cardClass(theme: Theme) {
  return bentoCard(theme);
}

/* ═══════════════════════════════════════════
   Glow Shadows (for hover)
   ═══════════════════════════════════════════ */

export const glowIndigo = 'hover:shadow-[var(--shadow-glow-violet)]';
export const glowEmerald = 'hover:shadow-[var(--shadow-glow-emerald)]';
export const glowAmber = 'hover:shadow-[var(--shadow-glow-amber)]';
export const glowRose = 'hover:shadow-[var(--shadow-glow-rose)]';

/* ═══════════════════════════════════════════
   Buttons — Vercel / Linear style
   ═══════════════════════════════════════════ */

export const btnPrimary = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] leading-none font-semibold whitespace-nowrap text-white bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/45 disabled:opacity-50 disabled:pointer-events-none';

export const btnDanger = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] leading-none font-medium whitespace-nowrap text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none';

export const btnHeroPrimary = 'inline-flex items-center gap-2 px-6 py-3 bg-white text-neutral-900 text-sm leading-none font-bold whitespace-nowrap rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-white/10';
export const btnHeroSecondary = 'inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm leading-none font-semibold whitespace-nowrap rounded-xl backdrop-blur-sm transition-colors border border-white/5';

export function btnSecondary(theme: Theme) {
  return `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] leading-none font-semibold whitespace-nowrap transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/40/50 ${
    D(theme)
      ? 'bg-white/10 text-neutral-300 hover:bg-white/15 hover:text-white'
      : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200/80'
  }`;
}

export function btnGhost(theme: Theme) {
  return `inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[13px] leading-none font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/35 ${
    D(theme) ? 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
  }`;
}

/* ═══════════════════════════════════════════
   Table
   ═══════════════════════════════════════════ */

export function tableHeadCell(theme: Theme) {
  return `px-6 py-3.5 text-[12px] font-medium uppercase tracking-wider text-left whitespace-nowrap ${
    D(theme) ? 'text-neutral-500' : 'text-neutral-500'
  }`;
}

export function tableBodyRow(theme: Theme, index: number) {
  const zebra = index % 2 !== 0
    ? D(theme) ? 'bg-white/[0.02]' : ''
    : '';
  const hover = D(theme) ? 'hover:bg-white/[0.04]' : 'hover:bg-neutral-50/50';
  return `${zebra} ${hover} transition-colors group/row`;
}

export function tableCell() {
  return 'px-6 py-4 text-[13px]';
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
  draft: 'bg-neutral-400', pending_review: 'bg-amber-400', testing: 'bg-blue-400', published: 'bg-emerald-400',
  rejected: 'bg-red-400', deprecated: 'bg-orange-400', active: 'bg-emerald-400', inactive: 'bg-neutral-400',
};

const STATUS_COLOR: Record<DomainStatus, { light: string; dark: string }> = {
  draft:          { light: 'bg-neutral-100 text-neutral-700 border border-neutral-200/60', dark: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' },
  pending_review: { light: 'bg-amber-50 text-amber-700 border border-amber-200/60',       dark: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  testing:        { light: 'bg-blue-50 text-blue-700 border border-blue-200/60',           dark: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  published:      { light: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  rejected:       { light: 'bg-red-50 text-red-700 border border-red-200/60',             dark: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  deprecated:     { light: 'bg-orange-50 text-orange-700 border border-orange-200/60',     dark: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  active:         { light: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  inactive:       { light: 'bg-neutral-100 text-neutral-700 border border-neutral-200/60', dark: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' },
};

export function statusBadgeClass(status: DomainStatus, theme: Theme) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.draft;
  return `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${D(theme) ? c.dark : c.light}`;
}

export function statusDot(status: DomainStatus) {
  return `w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-neutral-400'}`;
}

export function statusLabel(status: DomainStatus) {
  return STATUS_LABEL[status] || status;
}

/* ═══════════════════════════════════════════
   Typography helpers
   ═══════════════════════════════════════════ */

export function textPrimary(theme: Theme) {
  return D(theme) ? 'text-neutral-100' : 'text-neutral-900';
}

export function textSecondary(theme: Theme) {
  return D(theme) ? 'text-neutral-400' : 'text-neutral-500';
}

export function textMuted(theme: Theme) {
  return D(theme) ? 'text-neutral-500' : 'text-neutral-400';
}

/* ═══════════════════════════════════════════
   Misc. tech badge (for "Agent/Skill/MCP" labels)
   ═══════════════════════════════════════════ */

export function techBadge(theme: Theme) {
  return `text-[11px] uppercase tracking-wide font-medium px-2 py-0.5 rounded-lg border ${
    D(theme) ? 'bg-white/5 text-neutral-500 border-white/10' : 'bg-neutral-100 text-neutral-600 border-neutral-200/60'
  }`;
}
