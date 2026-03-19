import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';

export interface MgmtPageShellProps {
  theme: Theme;
  fontSize: FontSize;
  /** 面包屑：自左向右，最后一项为当前页 */
  breadcrumbSegments: string[];
  /** 与最后一级标题并列的图标，全站子页统一展示 */
  titleIcon?: LucideIcon;
  description?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export const MgmtPageShell: React.FC<MgmtPageShellProps> = ({
  theme,
  fontSize: _fontSize, // 保留 props 与页面一致；实际字号由根 html rem 控制
  breadcrumbSegments,
  titleIcon: TitleIcon,
  description,
  toolbar,
  children,
}) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar
    ? 'px-2 sm:px-3 lg:px-4 py-2 sm:py-3'
    : 'px-1.5 sm:px-2 lg:px-3 py-2 sm:py-3';

  const pageTitle = breadcrumbSegments[breadcrumbSegments.length - 1] ?? '';

  return (
    <div className={`flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className={`w-full flex-1 min-h-0 min-w-0 flex flex-col ${outerPad}`}>
        <div
          className={`rounded-2xl border flex-1 min-h-0 min-w-0 flex flex-col shadow-none overflow-hidden ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}
        >
          <div
            className={`shrink-0 px-4 sm:px-6 py-4 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <nav aria-label="面包屑" className="flex flex-wrap items-center gap-x-1 gap-y-1">
              {breadcrumbSegments.map((seg, i) => {
                const isLast = i === breadcrumbSegments.length - 1;
                return (
                  <React.Fragment key={`${i}-${seg}`}>
                    {i > 0 ? (
                      <ChevronRight
                        className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}
                        size={14}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`inline-flex items-center gap-2 min-w-0 ${
                        isLast
                          ? `font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`
                          : `font-medium text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`
                      }`}
                    >
                      {isLast && TitleIcon ? (
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-xl shrink-0 ${
                            isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <TitleIcon size={18} strokeWidth={2} aria-hidden />
                        </span>
                      ) : null}
                      <span className="truncate">{seg}</span>
                    </span>
                  </React.Fragment>
                );
              })}
            </nav>
            <h1 className="sr-only">{pageTitle}</h1>
            {description ? (
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {description}
              </p>
            ) : null}
          </div>
          {toolbar ? (
            <div
              className={`shrink-0 px-4 sm:px-6 py-3 border-b ${
                isDark ? 'border-white/10 bg-[#1C1C1E]/50' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              {toolbar}
            </div>
          ) : null}
          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
