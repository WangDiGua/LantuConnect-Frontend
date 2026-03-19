import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, RotateCcw } from 'lucide-react';
import { Theme, ThemeColor, FontSize, FontFamily, AnimationStyle } from '../../types';

interface AppearanceMenuProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  fontFamily: FontFamily;
  setFontFamily: (family: FontFamily) => void;
  animationStyle: AnimationStyle;
  setAnimationStyle: (style: AnimationStyle) => void;
  onReset: () => void;
  /** 嵌入侧栏用户菜单时使用窄版布局 */
  embedded?: boolean;
}

export const AppearanceMenu: React.FC<AppearanceMenuProps> = ({
  theme,
  setTheme,
  themeColor,
  setThemeColor,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  animationStyle,
  setAnimationStyle,
  onReset,
  embedded = false,
}) => {
  const themeColors: { id: ThemeColor; color: string }[] = [
    { id: 'blue', color: '#2563eb' },
    { id: 'purple', color: '#9333ea' },
    { id: 'green', color: '#16a34a' },
    { id: 'orange', color: '#ea580c' },
    { id: 'red', color: '#dc2626' },
    { id: 'pink', color: '#db2777' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-xl min-w-0 ${
        embedded
          ? `p-3 shadow-none border-0 w-full ${theme === 'light' ? 'bg-slate-50' : 'bg-black/20'}`
          : `p-4 rounded-2xl border shadow-2xl w-80 ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#1C1C1E] border-white/10'}`
      }`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">外观设置</span>
          <button 
            onClick={onReset}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              theme === 'light' ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-slate-400'
            }`}
            title="恢复默认"
          >
            <RotateCcw size={12} />
            <span>重置</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">主题模式</span>
          <div className={`flex p-0.5 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
            <button 
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
            >
              <Sun size={14} />
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-[#3A3A3C] shadow-sm text-blue-400' : 'text-slate-400'}`}
            >
              <Moon size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">主题色</span>
          <div className="flex flex-wrap gap-2">
            {themeColors.map(c => (
              <button
                key={c.id}
                onClick={() => setThemeColor(c.id)}
                className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                  themeColor === c.id ? 'ring-1 ring-offset-1 ring-blue-500' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.color }}
              >
                {themeColor === c.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">字号大小</span>
          <div className={`flex p-0.5 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
            {(['small', 'medium', 'large'] as FontSize[]).map(size => (
              <button 
                key={size}
                onClick={() => setFontSize(size)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  fontSize === size 
                    ? theme === 'light' ? 'bg-white shadow-sm text-blue-600' : 'bg-[#3A3A3C] shadow-sm text-blue-400'
                    : 'text-slate-400'
                }`}
              >
                {size === 'small' ? 'A' : size === 'medium' ? 'AA（默认）' : 'AAA'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">字体样式</span>
          <div className={`grid grid-cols-4 gap-1 p-0.5 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
            {(['sans', 'space', 'serif', 'mono', 'outfit', 'garamond', 'anton'] as FontFamily[]).map(f => (
              <button 
                key={f}
                onClick={() => setFontFamily(f)}
                className={`px-1 py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                  fontFamily === f 
                    ? theme === 'light' ? 'bg-white shadow-sm text-blue-600' : 'bg-[#3A3A3C] shadow-sm text-blue-400'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">动画效果</span>
          <div className={`grid grid-cols-3 gap-1 p-0.5 rounded-lg ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
            {(['fade', 'slide', 'zoom', 'skew', 'flip', 'rotate'] as AnimationStyle[]).map(a => (
              <button 
                key={a}
                onClick={() => setAnimationStyle(a)}
                className={`px-1 py-1.5 rounded-lg text-[9px] font-medium transition-all ${
                  animationStyle === a 
                    ? theme === 'light' ? 'bg-white shadow-sm text-blue-600' : 'bg-[#3A3A3C] shadow-sm text-blue-400'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
