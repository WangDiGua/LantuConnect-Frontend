import type { AnimationStyle, FontFamily, FontSize, Theme, ThemeColor } from '../types';

export const APPEARANCE_STORAGE_KEY = 'lantu-appearance';

export interface PersistedAppearance {
  theme: Theme;
  themeColor: ThemeColor;
  fontSize: FontSize;
  fontFamily: FontFamily;
  animationStyle: AnimationStyle;
}

const THEMES: Theme[] = ['light', 'dark'];
const THEME_COLORS: ThemeColor[] = ['blue', 'purple', 'green', 'orange', 'red', 'pink'];
const FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];
const FONT_FAMILIES: FontFamily[] = ['sans', 'space', 'serif', 'mono', 'outfit', 'garamond', 'anton'];
const ANIMATIONS: AnimationStyle[] = ['fade', 'slide', 'zoom', 'skew', 'flip', 'rotate'];

export const APPEARANCE_DEFAULTS: PersistedAppearance = {
  theme: 'light',
  themeColor: 'blue',
  fontSize: 'medium',
  fontFamily: 'sans',
  animationStyle: 'fade',
};

function pick<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val) ? (val as T) : fallback;
}

export function readAppearanceState(): PersistedAppearance {
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return { ...APPEARANCE_DEFAULTS };
    const p = JSON.parse(raw) as Partial<PersistedAppearance>;
    return {
      theme: pick(p.theme, THEMES, APPEARANCE_DEFAULTS.theme),
      themeColor: pick(p.themeColor, THEME_COLORS, APPEARANCE_DEFAULTS.themeColor),
      fontSize: pick(p.fontSize, FONT_SIZES, APPEARANCE_DEFAULTS.fontSize),
      fontFamily: pick(p.fontFamily, FONT_FAMILIES, APPEARANCE_DEFAULTS.fontFamily),
      animationStyle: pick(p.animationStyle, ANIMATIONS, APPEARANCE_DEFAULTS.animationStyle),
    };
  } catch {
    return { ...APPEARANCE_DEFAULTS };
  }
}

/** 合并写入，用于持久化主题、主题色、字号、字体、动画 */
export function writeAppearanceState(next: Partial<PersistedAppearance>): void {
  try {
    const prev = readAppearanceState();
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ ...prev, ...next }));
  } catch {
    /* ignore quota */
  }
}
