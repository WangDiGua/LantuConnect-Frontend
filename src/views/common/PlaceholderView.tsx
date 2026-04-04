import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { TITLE_SIZE_CLASSES } from '../../constants/theme';
import { useLayoutChrome } from '../../context/LayoutChromeContext';

interface PlaceholderViewProps {
  title: string;
  theme: Theme;
  fontSize: FontSize;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title, theme, fontSize }) => {
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  return (
    <div
      className={`flex-1 overflow-y-auto flex flex-col items-center justify-center ${outerPad} py-6 ${
        theme === 'light' ? 'bg-[#F2F2F7]' : 'bg-[#000000]'
      }`}
    >
      <div className="max-w-2xl w-full text-center">
        <div className={`mb-6 inline-flex p-4 rounded-[24px] transition-colors border shadow-none ${
          theme === 'light' ? 'bg-white border-slate-200/80 text-slate-400' : 'bg-lantu-card border-white/10 text-slate-500'
        }`}>
          <LayoutDashboard size={40} />
        </div>
        <h1 className={`${TITLE_SIZE_CLASSES[fontSize]} font-bold tracking-tight mb-3 transition-all`}>
          {title}
        </h1>
        <p className="text-base text-slate-500 mb-8 transition-all">
          正在为您准备 {title} 的相关内容...
        </p>
      </div>
    </div>
  );
};
