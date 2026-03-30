import type { AnimationStyle, FontFamily, FontSize, Theme, ThemeColor, ThemeMode } from '../types';
import { encryptStorage, decryptStorage } from '../lib/security';
import { getColorSchemeSnapshot } from './systemColorScheme';

export const APPEARANCE_STORAGE_KEY = 'lantu-appearance';

export interface PersistedAppearance {
  themePreference: ThemeMode;
  themeColor: ThemeColor;
  fontSize: FontSize;
  fontFamily: FontFamily;
  animationStyle: AnimationStyle;
}

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];
const THEME_COLORS: ThemeColor[] = ['blue', 'purple', 'green', 'orange', 'red', 'pink'];
const FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];
const FONT_FAMILIES: FontFamily[] = ['sans', 'space', 'serif', 'mono', 'outfit', 'garamond', 'anton'];
const ANIMATIONS: AnimationStyle[] = ['fade', 'slide', 'zoom', 'skew', 'flip', 'rotate'];

export const APPEARANCE_DEFAULTS: PersistedAppearance = {
  themePreference: 'light',
  themeColor: 'blue',
  fontSize: 'medium',
  fontFamily: 'sans',
  animationStyle: 'fade',
};

/** 由 themePreference 解析为实际亮/暗（仅客户端；SSR 视为浅色） */
export function resolveEffectiveTheme(pref: ThemeMode): Theme {
  if (pref === 'system') {
    if (typeof window === 'undefined') return 'light';
    return getColorSchemeSnapshot() ? 'dark' : 'light';
  }
  return pref;
}

function pick<T extends string>(val: unknown, allowed: readonly T[], fallback: T): T {
  return typeof val === 'string' && (allowed as readonly string[]).includes(val) ? (val as T) : fallback;
}

function parseThemePreference(p: Partial<PersistedAppearance> & { theme?: string }): ThemeMode {
  if (typeof p.themePreference === 'string' && (THEME_MODES as readonly string[]).includes(p.themePreference)) {
    return p.themePreference as ThemeMode;
  }
  if (p.theme === 'dark') return 'dark';
  if (p.theme === 'light') return 'light';
  return APPEARANCE_DEFAULTS.themePreference;
}

export function readAppearanceState(): PersistedAppearance {
  try {
    const p = decryptStorage<Partial<PersistedAppearance> & { theme?: string }>(APPEARANCE_STORAGE_KEY);
    if (!p) return { ...APPEARANCE_DEFAULTS };
    return {
      themePreference: parseThemePreference(p),
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
    encryptStorage(APPEARANCE_STORAGE_KEY, { ...prev, ...next });
  } catch {
    /* ignore quota */
  }
}
