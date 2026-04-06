import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { bentoCard, consoleContentTopPad, consoleMgmtShellOuterBottomPad } from '../../utils/uiClasses';

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
  fontSize: _fontSize,
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
    ? `px-2 sm:px-3 lg:px-4 ${consoleContentTopPad} ${consoleMgmtShellOuterBottomPad}`
    : `px-1.5 sm:px-2 lg:px-3 ${consoleContentTopPad} ${consoleMgmtShellOuterBottomPad}`;

  const pageTitle = breadcrumbSegments[breadcrumbSegments.length - 1] ?? '';

  const showCompactChrome = hasSecondarySidebar && Boolean(TitleIcon || description?.trim());

  const a11yPageHeading =
    description?.trim() ? `${pageTitle} / ${description.trim()}` : pageTitle;

  const docScroll = contentScroll === 'document';
  const shellOverflow = docScroll ? 'overflow-visible' : 'overflow-hidden';
  const cardOverflow = docScroll ? 'overflow-visible' : 'overflow-hidden';
  /** 面包屑/工具栏与正文区块之间的间隙（页顶全局距已在 outer consoleContentTopPad） */
  const bodyTopPad = 'pt-5 sm:pt-6';
  const bodyScrollClass = docScroll
    ? `min-w-0 shrink-0 overflow-visible flex flex-col ${bodyTopPad}`
    : `flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col ${bodyTopPad}`;

  return (
    <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${shellOverflow} bg-transparent`}>
      <div className={`w-full flex-1 min-h-0 min-w-0 flex flex-col ${outerPad}`}>
        <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${bentoCard(theme)} ${cardOverflow}`}>
          {hasSecondarySidebar ? (
            <>
              {showCompactChrome ? (
                <div
                  className={`shrink-0 px-4 sm:px-6 py-4 border-b ${
                    isDark ? 'border-white/10' : 'border-slate-200'
                  }`}
                >
                  <h1 className="sr-only">{a11yPageHeading}</h1>
                  <div className="flex min-w-0 items-center gap-3">
                    {TitleIcon ? (
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg ${
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
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
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
              className={`shrink-0 px-4 sm:px-6 py-4 border-b ${
                isDark ? 'border-white/10 bg-lantu-card/50' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              {toolbar}
            </div>
          ) : null}
          <div
            className={bodyScrollClass}
            {...(contentScroll === 'inner' ? { 'data-lantu-inner-scroll': '' } : {})}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
