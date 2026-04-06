import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, RotateCcw } from 'lucide-react';
import { Theme, ThemeMode, FontSize, FontFamily, AnimationStyle } from '../../types';
import { FONT_SIZE_OPTION_UI_LABEL, FONT_SIZE_ROOT_PX } from '../../constants/theme';

const FONT_LABELS: Record<FontFamily, string> = {
  sans: '系统无衬线',
  space: '宽屏无衬线',
  serif: '衬线体',
  mono: '等宽代码体',
  outfit: '圆体 Outfit',
  garamond: '古典 Garamond',
  anton: '标题 Anton',
};

const ANIMATION_LABELS: Record<AnimationStyle, string> = {
  fade: '淡入淡出',
  slide: '滑动',
  zoom: '缩放',
  skew: '倾斜',
  flip: '翻转',
  rotate: '旋转',
};

interface AppearanceMenuProps {
  /** 解析后的亮/暗，用于面板背景与控件样式 */
  theme: Theme;
  themePreference: ThemeMode;
  setThemePreference: (mode: ThemeMode) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  fontFamily: FontFamily;
  setFontFamily: (family: FontFamily) => void;
  animationStyle: AnimationStyle;
  setAnimationStyle: (style: AnimationStyle) => void;
  onReset: () => void;
  /** 嵌入顶栏设置下拉时使用：与外层同宽、留白更足 */
  embedded?: boolean;
}

export const AppearanceMenu: React.FC<AppearanceMenuProps> = ({
  theme,
  themePreference,
  setThemePreference,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  animationStyle,
  setAnimationStyle,
  onReset,
  embedded = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`rounded-xl min-w-0 ${
        embedded
          ? `shadow-none border-0 w-full ${theme === 'light' ? 'bg-slate-50' : 'bg-black/20'} px-3 py-3 sm:px-4 sm:py-4`
          : `p-5 rounded-[24px] border shadow-2xl w-[min(22rem,calc(100vw-2rem))] ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-lantu-card border-white/10'}`
      }`}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <span className={`font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
            外观设置
          </span>
          <button
            type="button"
            onClick={onReset}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              theme === 'light' ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-300'
            }`}
            title="恢复为默认外观"
          >
            <RotateCcw size={14} aria-hidden />
            <span>恢复默认</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            主题模式
          </span>
          <div className={`flex gap-0.5 p-1 rounded-xl ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
            <button
              type="button"
              onClick={() => setThemePreference('light')}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 px-1.5 text-xs font-medium transition-all sm:flex-row sm:gap-2 sm:py-2.5 sm:px-2 sm:text-sm ${
                themePreference === 'light'
                  ? theme === 'light'
                    ? 'bg-white shadow-sm text-neutral-900'
                    : 'bg-[#3A3A3C] shadow-sm text-neutral-300'
                  : theme === 'light'
                    ? 'text-slate-500 hover:text-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
              title="浅色模式"
            >
              <Sun size={16} aria-hidden className="shrink-0" />
              <span className="truncate">浅色</span>
            </button>
            <button
              type="button"
              onClick={() => setThemePreference('dark')}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 px-1.5 text-xs font-medium transition-all sm:flex-row sm:gap-2 sm:py-2.5 sm:px-2 sm:text-sm ${
                themePreference === 'dark'
                  ? theme === 'light'
                    ? 'bg-white shadow-sm text-neutral-900'
                    : 'bg-[#3A3A3C] shadow-sm text-neutral-300'
                  : theme === 'light'
                    ? 'text-slate-500 hover:text-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
              title="深色模式"
            >
              <Moon size={16} aria-hidden className="shrink-0" />
              <span className="truncate">深色</span>
            </button>
            <button
              type="button"
              onClick={() => setThemePreference('system')}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 px-1.5 text-xs font-medium transition-all sm:flex-row sm:gap-2 sm:py-2.5 sm:px-2 sm:text-sm ${
                themePreference === 'system'
                  ? theme === 'light'
                    ? 'bg-white shadow-sm text-neutral-900'
                    : 'bg-[#3A3A3C] shadow-sm text-neutral-300'
                  : theme === 'light'
                    ? 'text-slate-500 hover:text-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
              title="跟随系统浅色或深色"
            >
              <Monitor size={16} aria-hidden className="shrink-0" />
              <span className="truncate">跟随系统</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            字号大小
          </span>
          <div className={`flex p-1 rounded-xl ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
            {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
              <button
                type="button"
                key={size}
                onClick={() => setFontSize(size)}
                title={`根字号 ${FONT_SIZE_ROOT_PX[size]}px（全站 1rem 基准）`}
                className={`flex-1 rounded-lg py-2.5 px-2 text-sm font-semibold transition-all ${
                  fontSize === size
                    ? theme === 'light'
                      ? 'bg-white shadow-sm text-neutral-900'
                      : 'bg-[#3A3A3C] shadow-sm text-neutral-300'
                    : theme === 'light'
                      ? 'text-slate-500 hover:text-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {FONT_SIZE_OPTION_UI_LABEL[size]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            字体样式
          </span>
          <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
            {(['sans', 'space', 'serif', 'mono', 'outfit', 'garamond', 'anton'] as FontFamily[]).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => setFontFamily(f)}
                className={`rounded-lg py-2.5 px-2 text-xs sm:text-sm font-medium leading-snug text-center transition-all ${
                  fontFamily === f
                    ? theme === 'light'
                      ? 'bg-white shadow-sm text-neutral-900'
                      : 'bg-[#3A3A3C] shadow-sm text-neutral-300'
                    : theme === 'light'
                      ? 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {FONT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            页面切换动画
          </span>
          <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
            {(['fade', 'slide', 'zoom', 'skew', 'flip', 'rotate'] as AnimationStyle[]).map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAnimationStyle(a)}
                className={`rounded-lg py-2.5 px-2 text-xs sm:text-sm font-medium transition-all ${
                  animationStyle === a
                    ? theme === 'light'
                      ? 'bg-white shadow-sm text-neutral-900'
                      : 'bg-[#3A3A3C] shadow-sm text-neutral-300'
                    : theme === 'light'
                      ? 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {ANIMATION_LABELS[a]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
