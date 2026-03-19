import { FontSize, FontFamily, ThemeColor } from '../types';

/** 同步到 `document.documentElement.style.fontSize`，使全站 rem 字号随外观设置变化 */
export function getRootFontSizePx(fontSize: FontSize): string {
  switch (fontSize) {
    case 'small':
      return '14px';
    case 'large':
      return '17px';
    default:
      return '15px';
  }
}

/** @deprecated 优先使用根字号 `getRootFontSizePx`；保留供少数需固定档位的场景 */
export const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-[14px]',
  medium: 'text-[15px]',
  large: 'text-[17px]',
};

export const TITLE_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-2xl',
  medium: 'text-3xl',
  large: 'text-4xl'
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

export const THEME_COLOR_CLASSES: Record<ThemeColor, { text: string; bg: string; border: string; ring: string; shadow: string }> = {
  blue: { 
    text: 'text-blue-600', 
    bg: 'bg-blue-600', 
    border: 'border-blue-600', 
    ring: 'ring-blue-500/20',
    shadow: 'shadow-blue-500/20'
  },
  purple: { 
    text: 'text-purple-600', 
    bg: 'bg-purple-600', 
    border: 'border-purple-600', 
    ring: 'ring-purple-500/20',
    shadow: 'shadow-purple-500/20'
  },
  green: { 
    text: 'text-green-600', 
    bg: 'bg-green-600', 
    border: 'border-green-600', 
    ring: 'ring-green-500/20',
    shadow: 'shadow-green-500/20'
  },
  orange: { 
    text: 'text-orange-600', 
    bg: 'bg-orange-600', 
    border: 'border-orange-600', 
    ring: 'ring-orange-500/20',
    shadow: 'shadow-orange-500/20'
  },
  red: { 
    text: 'text-red-600', 
    bg: 'bg-red-600', 
    border: 'border-red-600', 
    ring: 'ring-red-500/20',
    shadow: 'shadow-red-500/20'
  },
  pink: { 
    text: 'text-pink-600', 
    bg: 'bg-pink-600', 
    border: 'border-pink-600', 
    ring: 'ring-pink-500/20',
    shadow: 'shadow-pink-500/20'
  }
};
