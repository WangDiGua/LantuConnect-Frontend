import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';

export interface MgmtPageShellProps {
  theme: Theme;
  fontSize: FontSize;
  /** 面包屑：自左向右，最后一项为当前页 */
  breadcrumbSegments: readonly string[];
  /** 与最后一级标题并列的图标，全站子页统一展示 */
  titleIcon?: LucideIcon;
  description?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  /**
   * 默认在壳内滚动；长表单（如系统参数多字段）可改为由主布局滚动，避免嵌套滚动/gesture 抢轮导致「滚不动」。
   */
  contentScroll?: 'inner' | 'document';
}

export const MgmtPageShell: React.FC<MgmtPageShellProps> = ({
  theme,
  fontSize: _fontSize, // 保留 props 与页面一致；实际字号由根 html rem 控制
  breadcrumbSegments,
  titleIcon: TitleIcon,
  description,
  toolbar,
  children,
  contentScroll = 'inner',
}) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar
    ? 'px-2 sm:px-3 lg:px-4 py-2 sm:py-3'
    : 'px-1.5 sm:px-2 lg:px-3 py-2 sm:py-3';

  const pageTitle = breadcrumbSegments[breadcrumbSegments.length - 1] ?? '';

  /**
   * 有二级侧栏时：顶栏 h2 已是当前页标题，壳内绝不渲染可见粗体 pageTitle，避免与 chrome 更新不同步造成「双标题闪烁」。
   * 可见区仅图标 + 描述（无描述可仅图标）；h1 仅用 sr-only 承载完整语义。
   */
  const showCompactChrome = hasSecondarySidebar && Boolean(TitleIcon || description?.trim());

  const a11yPageHeading =
    description?.trim() ? `${pageTitle} / ${description.trim()}` : pageTitle;

  const docScroll = contentScroll === 'document';
  const shellOverflow = docScroll ? 'overflow-visible' : 'overflow-hidden';
  const cardOverflow = docScroll ? 'overflow-visible' : 'overflow-hidden';
  const bodyScrollClass = docScroll
    ? 'min-w-0 shrink-0 overflow-visible flex flex-col'
    : 'flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col';

  return (
    <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${shellOverflow} bg-transparent`}>
      <div className={`w-full flex-1 min-h-0 min-w-0 flex flex-col ${outerPad}`}>
        <div
            className={`rounded-[24px] border flex-1 min-h-0 min-w-0 flex flex-col ${cardOverflow} ${
            isDark
              ? 'bg-[#1e2435] border-white/[0.09] shadow-[0_2px_20px_-6px_rgba(0,0,0,0.45)]'
              : 'bg-white border-slate-200/50 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.07),0_1px_2px_-1px_rgba(15,23,42,0.05)]'
          }`}
        >
          {hasSecondarySidebar ? (
            <>
              {showCompactChrome ? (
                <div
                  className={`shrink-0 px-4 sm:px-6 py-3 border-b ${
                    isDark ? 'border-white/10' : 'border-slate-200'
                  }`}
                >
                  <h1 className="sr-only">{a11yPageHeading}</h1>
                  <div className="flex min-w-0 items-center gap-3">
                    {TitleIcon ? (
                      <span
                        className={`inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-xl self-center ${
                          isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <TitleIcon size={18} strokeWidth={2} aria-hidden />
                      </span>
                    ) : null}
                    {description?.trim() ? (
                      <p
                        className={`m-0 flex-1 min-w-0 text-sm font-normal leading-snug ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {description}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <h1 className="sr-only">{a11yPageHeading}</h1>
              )}
            </>
          ) : (
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
                {description ? (
                  <>
                    <ChevronRight
                      className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}
                      size={14}
                      aria-hidden
                    />
                    <span
                      className={`min-w-0 text-sm font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {description}
                    </span>
                  </>
                ) : null}
              </nav>
              <h1 className="sr-only">{pageTitle}</h1>
            </div>
          )}
          {toolbar ? (
            <div
              className={`shrink-0 px-4 sm:px-6 py-3 border-b ${
                isDark ? 'border-white/10 bg-[#1C1C1E]/50' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              {toolbar}
            </div>
          ) : null}
          <div className={bodyScrollClass}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
