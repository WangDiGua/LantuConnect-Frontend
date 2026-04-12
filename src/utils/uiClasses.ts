import type { Theme } from '../types';

const D = (t: Theme) => t === 'dark';

/* ═══════════════════════════════════════════
   Page & Surface — Canvas layout
   ═══════════════════════════════════════════ */

export function pageBg(_theme: Theme) {
  return 'bg-lantu-canvas';
}

/** 与探索页主栏一致：主滚动区横向内边距（控制台 MainLayout 与页脚等对齐全站用这一组） */
export const mainScrollPadX = 'px-4 sm:px-5 lg:px-6 xl:px-8';
export const mainScrollPadBottom = 'pb-6 sm:pb-8';
/**
 * MainLayout 最外层主壳：仅抵消固定顶栏（ConsoleTopNav 内层行高 h-16=4rem）与 safe-area。
 * 顶栏与首屏内容之间的统一间距由 {@link consoleContentTopPad} 在 MainLayout 内对 MainContent 外包一层承担，避免与业务页叠出「空白条」。
 */
export const consoleShellBelowHeaderPt =
  'pt-[calc(4rem+env(safe-area-inset-top,0px))]';
/**
 * 控制台主内容区顶边距（由 MainLayout 统一加在 MainContent 外包一层；业务组件勿再重复叠加以防止距顶不一致）。
 */
export const consoleContentTopPad = 'pt-5 sm:pt-6';
/** 管理台白卡片外圈：保留下边缝与水平 padding；顶距由 MainLayout 统一承担 */
export const consoleMgmtShellOuterBottomPad = 'pb-2 sm:pb-3';
/** flex 滚动区：min-h-0 + 触控惯性/锚定（见 index.css `.lantu-scroll-compositor`）；勿在业务页根再套 overscroll-y-contain（会阻断滚轮到 MainLayout 主滚动） */
export const mainScrollCompositorClass = 'min-h-0 lantu-scroll-compositor';
/** 主内容纵向滚动区常用组合（与 MainLayout 主滚动子树一致；含统一顶距） */
export const pageScrollShell = `${mainScrollCompositorClass} ${mainScrollPadX} ${mainScrollPadBottom}`;
/** 布局壳层 GPU 合成；勿与同一节点的 overflow-y-auto 主滚动根混用 */
export const chromeGpuLayerClass = 'transform-gpu';
/**
 * 可选：单页/模块内阅读宽约束（如详情、文档）。勿再套在 MainLayout 全宽主.scroll 根上，否则会整体居中留白。
 */
export const contentMaxWidth = 'max-w-[1400px]';
/** 与探索页 `pageContainer` 横向节奏一致 */
export const contentPaddingX = 'px-4 sm:px-5 lg:px-6 xl:px-8';
export const sectionGap = 'space-y-8';
/** 同页内多块卡片/图表之间的纵向节奏（略小于 sectionGap，仍明显分层） */
export const pageBlockStack = 'space-y-6';
export const cardGap = 'gap-5';
/** KPI / 小卡片栅格：避免「块之间贴在一起」 */
export const kpiGridGap = 'gap-4 sm:gap-5';
/**
 * MgmtPageShell 内文档流子树根（面包屑/工具栏与正文之间的留白；页顶与顶栏间距由 MainLayout 统一处理）
 */
export const mgmtPageBodyPadX = 'px-4 sm:px-6';
export const mgmtPageBodyPad = `${mgmtPageBodyPadX} pb-8`;
export const mgmtPageBodyPadShort = `${mgmtPageBodyPadX} pb-6`;
export const detailRailWidth = 'xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]';

export function surfaceBg(_theme: Theme) {
  return 'bg-transparent';
}

/** 控制台业务页主背景：与 design token 画布色一致，避免透明区透出 chrome 壳层造成「底部/缝隙白条」 */
export function canvasBodyBg(_theme: Theme) {
  return 'bg-lantu-canvas';
}

/** 主滚动区底：替代外壳 pb，兼顾 iOS Home Indicator */
export const consoleScrollSafeBottomPad =
  'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]';

/** 控制台内容卡片：大圆角 + 极淡浮起阴影（与 UI/卡片背景设计示例 对齐） */
export const CONSOLE_CARD_RADIUS = 'rounded-[28px]';
/** 与 design token `--shadow-card` 一致（图二：偏下漫射） */
export const CONSOLE_CARD_SHADOW_LIGHT = 'shadow-[var(--shadow-card)]';
export const CONSOLE_CARD_SHADOW_DARK = 'shadow-[var(--shadow-card)]';
/** 图二默认：亮色无边线；暗夜用细描边区分卡片与主区，避免「一坨灰」 */
const CONSOLE_CARD_BORDER_LIGHT_DEFAULT = 'border-transparent';
const CONSOLE_CARD_BORDER_DARK_DEFAULT = 'border-lantu-border-raised';
/** 图三选中：细冷色描边 */
export const CONSOLE_CARD_BORDER_SELECTED_LIGHT = 'border-sky-200/85';
export const CONSOLE_CARD_BORDER_SELECTED_DARK = 'border-sky-400/45';

export type BentoCardStyleOptions = {
  selected?: boolean;
};

export function canvasCard(theme: Theme) {
  return D(theme)
    ? `bg-lantu-elevated ${CONSOLE_CARD_RADIUS} ${CONSOLE_CARD_SHADOW_DARK} border ${CONSOLE_CARD_BORDER_DARK_DEFAULT}`
    : `bg-white ${CONSOLE_CARD_RADIUS} ${CONSOLE_CARD_SHADOW_LIGHT} border ${CONSOLE_CARD_BORDER_LIGHT_DEFAULT}`;
}

/* ═══════════════════════════════════════════
   Glass
   ═══════════════════════════════════════════ */

export function glassSidebar(theme: Theme) {
  return D(theme)
    ? 'bg-lantu-chrome/85 backdrop-blur-2xl border-r border-lantu-border-raised'
    : 'bg-[#FDFDFD] backdrop-blur-2xl border-r border-neutral-200';
}

export function glassPanel(theme: Theme) {
  return D(theme)
    ? `bg-lantu-card/55 backdrop-blur-xl border border-lantu-border-raised ${CONSOLE_CARD_RADIUS} shadow-[var(--shadow-glass-panel)]`
    : `bg-white/80 backdrop-blur-md border border-transparent ${CONSOLE_CARD_RADIUS} shadow-[var(--shadow-glass-panel)]`;
}

/* ═══════════════════════════════════════════
   Cards — bento 与 canvas 共用 CONSOLE_CARD_* token；hover 以边框+极轻阴影为主，避免重投影
   ═══════════════════════════════════════════ */

const CARD_HOVER_SHADOW_LIGHT =
  'hover:shadow-[var(--shadow-card-hover)] motion-reduce:hover:shadow-[var(--shadow-card)]';
const CARD_HOVER_SHADOW_DARK =
  'hover:shadow-[var(--shadow-card-hover)] motion-reduce:hover:shadow-[var(--shadow-card)]';

/** 未选中：hover 边线弱于图三选中态，避免与 selected 同色 */
const CARD_INTERACTIVE_HOVER_LIGHT =
  `hover:border-sky-200/50 ${CARD_HOVER_SHADOW_LIGHT}`;
const CARD_INTERACTIVE_HOVER_LIGHT_SELECTED =
  `hover:border-sky-300/95 ${CARD_HOVER_SHADOW_LIGHT}`;
const CARD_INTERACTIVE_HOVER_DARK =
  `hover:border-sky-400/40 hover:bg-lantu-card-hover ${CARD_HOVER_SHADOW_DARK}`;
const CARD_INTERACTIVE_HOVER_DARK_SELECTED =
  `hover:border-sky-400/65 hover:bg-lantu-card-hover ${CARD_HOVER_SHADOW_DARK}`;

export function bentoCard(theme: Theme, opts?: BentoCardStyleOptions) {
  const sel = opts?.selected === true;
  const border = D(theme)
    ? sel ? CONSOLE_CARD_BORDER_SELECTED_DARK : CONSOLE_CARD_BORDER_DARK_DEFAULT
    : sel ? CONSOLE_CARD_BORDER_SELECTED_LIGHT : CONSOLE_CARD_BORDER_LIGHT_DEFAULT;
  return `${CONSOLE_CARD_RADIUS} border transition-all duration-200 motion-reduce:transition-none ${
    D(theme)
      ? `bg-lantu-elevated ${border} ${CONSOLE_CARD_SHADOW_DARK}`
      : `bg-white ${border} ${CONSOLE_CARD_SHADOW_LIGHT}`
  }`;
}

/** 复合：默认 bento + 浅交互 hover（不含 cursor-pointer，由组件按需添加） */
export function bentoCardHover(theme: Theme, opts?: BentoCardStyleOptions) {
  return `${bentoCard(theme, opts)} ${bentoCardPointerHover(theme, opts)}`;
}

/** BentoCard 专用：与 bentoCard 配套的 pointer hover 类片段 */
export function bentoCardPointerHover(theme: Theme, opts?: BentoCardStyleOptions): string {
  const sel = opts?.selected === true;
  if (D(theme)) {
    return sel ? CARD_INTERACTIVE_HOVER_DARK_SELECTED : CARD_INTERACTIVE_HOVER_DARK;
  }
  return sel ? CARD_INTERACTIVE_HOVER_LIGHT_SELECTED : CARD_INTERACTIVE_HOVER_LIGHT;
}

export function cardClass(theme: Theme, opts?: BentoCardStyleOptions) {
  return bentoCard(theme, opts);
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

export const btnPrimary = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm leading-none font-semibold whitespace-nowrap text-white bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-[var(--shadow-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/45 disabled:opacity-50 disabled:pointer-events-none';

export const btnDanger = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm leading-none font-medium whitespace-nowrap text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none';

export const btnHeroPrimary = 'inline-flex items-center gap-2 px-6 py-3 bg-white text-neutral-900 text-sm leading-none font-bold whitespace-nowrap rounded-xl hover:scale-[1.02] transition-transform shadow-[var(--shadow-card)]';
export const btnHeroSecondary = 'inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm leading-none font-semibold whitespace-nowrap rounded-xl backdrop-blur-sm transition-colors border border-white/5';

export function btnSecondary(theme: Theme) {
  return `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm leading-none font-semibold whitespace-nowrap transition-all duration-200 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/40 ${
    D(theme)
      ? 'bg-white/10 text-lantu-text-secondary hover:bg-white/15 hover:text-lantu-text-primary focus-visible:ring-sky-400/45'
      : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200/80'
  }`;
}

export function btnGhost(theme: Theme) {
  return `inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm leading-none font-medium whitespace-nowrap transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/35 ${
    D(theme)
      ? 'text-lantu-text-secondary hover:text-lantu-text-primary hover:bg-white/5 focus-visible:ring-sky-400/40'
      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
  }`;
}

/* ═══════════════════════════════════════════
   Table
   ═══════════════════════════════════════════ */

export function tableHeadCell(theme: Theme) {
  return `px-6 py-3.5 text-[12px] font-medium uppercase tracking-wider text-left whitespace-nowrap ${
    D(theme) ? 'text-lantu-text-muted' : 'text-neutral-500'
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
  return 'px-6 py-4 text-sm';
}

/** 表单元格内单行省略（历史类名 scroll-x，现为 ellipsis；列上请设 max-w-*） */
export const tableCellScrollInner = 'lantu-table-cell-scroll-x min-w-0 max-w-full';

export const tableCellScrollInnerMono = `${tableCellScrollInner} whitespace-nowrap font-mono text-[12px]`;

/** 操作权限等多 chip：换行展示，避免单元格内横向滚动条 */
export function tableCellActionChipsRow() {
  return 'flex min-w-0 max-w-full flex-wrap items-center gap-1.5 py-0.5';
}

/** 管理列表行内「查看 / 编辑」等：胶囊、纯文字、浅灰底 */
export function mgmtTableActionGhost(theme: Theme) {
  return `inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
    D(theme)
      ? 'bg-white/[0.08] text-lantu-text-primary hover:bg-white/12'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/90'
  }`;
}

/** 行内正向操作（通过等）：胶囊、浅绿底 */
export function mgmtTableActionPositive(theme: Theme) {
  return `inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
    D(theme)
      ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
  }`;
}

/** 行内危险操作（删除、驳回、撤销）：胶囊、淡粉底 + 红字，纯文字 */
export const mgmtTableActionDanger =
  'inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-400 dark:hover:bg-rose-500/25';

/** 管理端表格「操作」列内按钮容器：单行排列；表格外层需 overflow-x-auto（如 MgmtDataTable） */
export const mgmtTableRowActions =
  'inline-flex shrink-0 flex-nowrap items-center justify-end gap-2';

/* ═══════════════════════════════════════════
   Status Badges
   ═══════════════════════════════════════════ */

export type DomainStatus =
  | 'draft'
  | 'pending_review'
  | 'testing'
  | 'published'
  | 'rejected'
  | 'deprecated'
  | 'merged_live'
  | 'active'
  | 'inactive'
  /** 后端枚举无法识别或字段缺失 */
  | 'unknown';

const STATUS_LABEL: Record<DomainStatus, string> = {
  draft: '草稿',
  pending_review: '待审核',
  testing: '测试中',
  published: '已发布',
  rejected: '已驳回',
  deprecated: '已暂停对外',
  merged_live: '已合并上线',
  active: '启用',
  inactive: '停用',
  unknown: '未知',
};

const STATUS_DOT: Record<DomainStatus, string> = {
  draft: 'bg-neutral-400',
  pending_review: 'bg-amber-400',
  testing: 'bg-blue-400',
  published: 'bg-emerald-400',
  rejected: 'bg-red-400',
  deprecated: 'bg-orange-400',
  merged_live: 'bg-teal-400',
  active: 'bg-emerald-400',
  inactive: 'bg-neutral-400',
  unknown: 'bg-neutral-500',
};

const STATUS_COLOR: Record<DomainStatus, { light: string; dark: string }> = {
  draft: { light: 'bg-neutral-100 text-neutral-700 border border-neutral-200/60', dark: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' },
  pending_review: { light: 'bg-amber-50 text-amber-700 border border-amber-200/60', dark: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  testing: { light: 'bg-blue-50 text-blue-700 border border-blue-200/60', dark: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  published: { light: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  rejected: { light: 'bg-red-50 text-red-700 border border-red-200/60', dark: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  deprecated: { light: 'bg-orange-50 text-orange-700 border border-orange-200/60', dark: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  merged_live: { light: 'bg-teal-50 text-teal-800 border border-teal-200/60', dark: 'bg-teal-500/10 text-teal-300 border border-teal-500/25' },
  active: { light: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  inactive: { light: 'bg-neutral-100 text-neutral-700 border border-neutral-200/60', dark: 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' },
  unknown: { light: 'bg-slate-100 text-slate-600 border border-slate-200/80', dark: 'bg-white/[0.06] text-slate-400 border border-white/10' },
};

const DOMAIN_STATUS_KEYS = new Set<string>(Object.keys(STATUS_LABEL));

/** 将接口返回的状态串归一化为领域状态，便于统一标签与配色（无法识别时为 unknown）。 */
export function coerceToDomainStatus(raw: string | null | undefined): DomainStatus {
  if (raw == null || String(raw).trim() === '') return 'unknown';
  const k = String(raw).trim().toLowerCase().replace(/-/g, '_');
  if (DOMAIN_STATUS_KEYS.has(k)) return k as DomainStatus;
  return 'unknown';
}

export function statusBadgeClass(status: DomainStatus | string, theme: Theme) {
  const s = typeof status === 'string' ? coerceToDomainStatus(status) : status;
  const c = STATUS_COLOR[s] || STATUS_COLOR.unknown;
  /** `whitespace-nowrap shrink-0`：避免宽表挤压时中文/标签被压成一字一行 */
  return `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide whitespace-nowrap shrink-0 ${D(theme) ? c.dark : c.light}`;
}

export function statusDot(status: DomainStatus | string) {
  const s = typeof status === 'string' ? coerceToDomainStatus(status) : status;
  return `w-1.5 h-1.5 rounded-full ${STATUS_DOT[s] ?? STATUS_DOT.unknown}`;
}

export function statusLabel(status: DomainStatus | string | null | undefined) {
  const key = coerceToDomainStatus(status == null ? undefined : String(status));
  return STATUS_LABEL[key];
}

/* ═══════════════════════════════════════════
   Typography helpers
   ═══════════════════════════════════════════ */

export function textPrimary(theme: Theme) {
  return D(theme) ? 'text-lantu-text-primary' : 'text-neutral-900';
}

export function textSecondary(theme: Theme) {
  return D(theme) ? 'text-lantu-text-secondary' : 'text-neutral-500';
}

export function textMuted(theme: Theme) {
  return D(theme) ? 'text-lantu-text-muted' : 'text-neutral-400';
}

/** 页面主标题（H1 级） */
export function pageTitle(theme: Theme) {
  return `text-2xl sm:text-3xl font-bold tracking-tight ${textPrimary(theme)}`;
}

/** 区块标题（模块顶栏） */
export function sectionHeading(theme: Theme) {
  return `text-lg font-bold tracking-tight ${textPrimary(theme)}`;
}

/** 卡片内小标题 */
export function cardHeading(theme: Theme) {
  return `text-sm font-bold ${textPrimary(theme)}`;
}

/** 表单字段标签 */
export function labelBase(theme: Theme) {
  return `text-sm font-medium ${D(theme) ? 'text-lantu-text-secondary' : 'text-neutral-700'}`;
}

/** 辅助说明 / 表单项下提示 */
export function hintText(theme: Theme) {
  return `text-xs leading-relaxed ${textMuted(theme)}`;
}

/** 校验错误文案 */
export function fieldErrorText() {
  return 'text-xs text-rose-500';
}

/**
 * 通用文本输入（与 Login 等页对齐）；左侧图标时由调用方加 `pl-10` 等到场布局类
 */
export function inputBase(theme: Theme) {
  const base =
    'w-full rounded-xl text-sm transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none';
  return D(theme)
    ? `${base} border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-lantu-text-primary placeholder:text-lantu-text-secondary focus-visible:border-sky-500/35 focus-visible:ring-sky-500/30`
    : `${base} border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus-visible:border-neutral-900 focus-visible:bg-white focus-visible:ring-neutral-900/8`;
}

export function inputBaseError() {
  return '!border-rose-400 focus-visible:!border-rose-500 focus-visible:!ring-rose-500/15';
}

/** 正文内链/次动作文字链 */
export function linkInline(theme: Theme) {
  return `rounded underline-offset-2 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
    D(theme)
      ? 'text-sky-400 hover:text-sky-300 focus-visible:ring-sky-400/45 focus-visible:ring-offset-lantu-elevated'
      : 'text-blue-600 hover:text-blue-800 focus-visible:ring-blue-500/35 focus-visible:ring-offset-white'
  }`;
}

/**
 * 图标按钮最小命中区（约 40×40）；用于工具栏、密码显隐等
 */
export function iconButton(theme: Theme) {
  return `inline-flex items-center justify-center min-h-10 min-w-10 shrink-0 rounded-xl transition-colors duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
    D(theme)
      ? 'text-lantu-text-secondary hover:text-lantu-text-primary hover:bg-white/5 focus-visible:ring-sky-400/45 focus-visible:ring-offset-lantu-card'
      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:ring-neutral-900/22 focus-visible:ring-offset-white'
  }`;
}

/** 顶栏、画布内工具按钮等 Lucide 图标（暗色对比度高于 neutral-400） */
export function iconChrome(theme: Theme) {
  return D(theme)
    ? 'text-lantu-text-primary hover:text-white'
    : 'text-slate-500 hover:text-slate-800';
}

/** 搜索框前缀、侧栏搜索等次要装饰图标 */
export function iconMuted(theme: Theme) {
  return D(theme) ? 'text-lantu-text-secondary' : 'text-slate-500';
}

/** 卡片/按钮等标准动效时长（配合 motion-reduce） */
export const transitionStandard = 'transition-all duration-200 ease-out motion-reduce:duration-0';

/* ═══════════════════════════════════════════
   Misc. tech badge (for "Agent/Skill/MCP" labels)
   ═══════════════════════════════════════════ */

export function techBadge(theme: Theme) {
  return `text-xs uppercase tracking-wide font-medium px-2 py-0.5 rounded-lg border ${
    D(theme) ? 'bg-white/5 text-lantu-text-muted border-white/10' : 'bg-neutral-100 text-neutral-600 border-neutral-200/60'
  }`;
}
