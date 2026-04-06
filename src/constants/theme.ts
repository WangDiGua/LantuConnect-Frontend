import { FontSize, FontFamily, ThemeColor } from '../types';

/**
 * 同步到 `document.documentElement.style.fontSize`，使全站 rem 字号随外观设置变化。
 *
 * 三档采用常见 **标准网页根字号**（px）：14 / 16 / 18，对应相对 16px 基准的比例
 * 0.875rem / 1rem / 1.125rem，与 Tailwind 默认 `text-sm` / `text-base` / `text-lg` 的步进一致。
 * 默认档 16px 为浏览器与 WCAG 正文常用基准；小、大各 ±2px。
 *
 * 排版角色（与 `src/styles/index.css` @theme 注释一致）：Display/H1 用 TITLE_SIZE_CLASSES + leading-tight；
 * 正文用 FONT_SIZE_CLASSES + leading-normal；说明/次要 text-sm leading-relaxed；等宽 font-mono。
 */
export const FONT_SIZE_ROOT_PX: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
};

export function getRootFontSizePx(fontSize: FontSize): string {
  return `${FONT_SIZE_ROOT_PX[fontSize]}px`;
}

/** 外观面板分段控件上的文案（含标准像素，便于用户对照） */
export const FONT_SIZE_OPTION_UI_LABEL: Record<FontSize, string> = {
  small: '小 14px',
  medium: '中 16px（默认）',
  large: '大 18px',
};

/** @deprecated 优先使用根字号 `getRootFontSizePx`；需与 rem 缩放一致时请用 text-sm / text-base / text-lg */
export const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

export const TITLE_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-2xl',
  medium: 'text-3xl',
  large: 'text-4xl'
};

/** 资源市场顶栏标题：较 TITLE_SIZE_CLASSES 略小，减少 Hero 垂直占用 */
export const MARKET_HERO_TITLE_CLASSES: Record<FontSize, string> = {
  small: 'text-lg sm:text-xl',
  medium: 'text-xl sm:text-2xl',
  large: 'text-2xl sm:text-3xl',
};

export const FONT_FAMILY_CLASSES: Record<FontFamily, string> = {
  sans: 'font-sans',
  space: 'font-space',
  serif: 'font-serif',
  mono: 'font-mono',
  outfit: 'font-outfit',
  garamond: 'font-garamond',
  anton: 'font-anton'
};

/** 与主按钮 `btnPrimary`（neutral-900）一致的全局强调色；外观「主题色」各选项共用同一视觉。 */
const BRAND_NEUTRAL_ACCENT: {
  text: string;
  bg: string;
  border: string;
  ring: string;
  shadow: string;
} = {
  text: 'text-neutral-900 dark:text-neutral-200',
  /** 与主按钮一致：深浅色模式下均为深色底，便于配 `text-white`。 */
  bg: 'bg-neutral-900 hover:bg-neutral-800',
  border: 'border-neutral-900',
  ring: 'ring-neutral-900/30',
  shadow: 'shadow-neutral-900/15',
};

export const THEME_COLOR_CLASSES: Record<ThemeColor, typeof BRAND_NEUTRAL_ACCENT> = {
  blue: BRAND_NEUTRAL_ACCENT,
  purple: BRAND_NEUTRAL_ACCENT,
  green: BRAND_NEUTRAL_ACCENT,
  orange: BRAND_NEUTRAL_ACCENT,
  red: BRAND_NEUTRAL_ACCENT,
  pink: BRAND_NEUTRAL_ACCENT,
};
