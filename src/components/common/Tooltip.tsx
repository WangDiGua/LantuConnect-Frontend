import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  /** 优先贴边；auto 根据视口上下剩余空间选择 top / bottom */
  preferredSide?: 'top' | 'bottom' | 'auto';
  /** 长文本展示；可与 preferSingleLine 组合 */
  wrapContent?: boolean;
  /** true 时单行 + 横向滚动（适合 API Key、token），显著加宽上限 */
  preferSingleLine?: boolean;
  /** 覆盖触发器布局类；表格单元格内建议 `flex w-full min-w-0 max-w-full` */
  triggerClassName?: string;
  focusableTrigger?: boolean;
}

const VIEWPORT_PAD = 10;
const GAP_PX = 9;
const ARROW_WIDTH = 12;

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  preferredSide = 'auto',
  wrapContent = false,
  preferSingleLine = false,
  triggerClassName,
  focusableTrigger = false,
}) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'top' | 'bottom'>('top');
  const [offsetX, setOffsetX] = useState(0);
  const [arrowLeftPx, setArrowLeftPx] = useState<number | null>(null);
  const [placementReady, setPlacementReady] = useState(false);
  const showTimerRef = useRef<number | null>(null);

  const resolveAutoSide = useCallback((): 'top' | 'bottom' => {
    const el = triggerRef.current;
    if (!el) return 'top';
    const r = el.getBoundingClientRect();
    const spaceTop = r.top;
    const spaceBottom = window.innerHeight - r.bottom;
    return spaceTop >= spaceBottom ? 'top' : 'bottom';
  }, []);

  const updatePlacement = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl || !open) return;

    const tr = triggerEl.getBoundingClientRect();
    const pr = panelEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let nextSide: 'top' | 'bottom' =
      preferredSide === 'auto' ? resolveAutoSide() : preferredSide;

    const fitsTop = tr.top >= pr.height + GAP_PX + VIEWPORT_PAD;
    const fitsBottom = vh - tr.bottom >= pr.height + GAP_PX + VIEWPORT_PAD;

    if (preferredSide === 'auto') {
      if (nextSide === 'top' && !fitsTop && fitsBottom) nextSide = 'bottom';
      else if (nextSide === 'bottom' && !fitsBottom && fitsTop) nextSide = 'top';
      else if (!fitsTop && !fitsBottom) nextSide = tr.top > vh - tr.bottom ? 'top' : 'bottom';
    } else if (preferredSide === 'top' && !fitsTop && fitsBottom) nextSide = 'bottom';
    else if (preferredSide === 'bottom' && !fitsBottom && fitsTop) nextSide = 'top';

    setSide(nextSide);

    const triggerMidX = tr.left + tr.width / 2;
    const idealPanelLeft = triggerMidX - pr.width / 2;
    const minLeft = VIEWPORT_PAD;
    const maxLeft = vw - VIEWPORT_PAD - pr.width;
    const clampedPanelLeft = Math.max(minLeft, Math.min(idealPanelLeft, maxLeft));

    setOffsetX(clampedPanelLeft - idealPanelLeft);

    const arrowTargetX = triggerMidX - clampedPanelLeft;
    const innerMin = ARROW_WIDTH / 2 + 6;
    const innerMax = pr.width - innerMin;
    setArrowLeftPx(Math.max(innerMin, Math.min(arrowTargetX, innerMax)));
    setPlacementReady(true);
  }, [open, preferredSide, resolveAutoSide]);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current == null) return;
    window.clearTimeout(showTimerRef.current);
    showTimerRef.current = null;
  }, []);

  const showTooltip = useCallback(() => {
    clearShowTimer();
    setPlacementReady(false);
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      setOpen(true);
    }, 90);
  }, [clearShowTimer]);

  const hideTooltip = useCallback(() => {
    clearShowTimer();
    setOpen(false);
    setPlacementReady(false);
  }, [clearShowTimer]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePlacement();
  }, [open, content, wrapContent, preferSingleLine, updatePlacement]);

  useEffect(() => {
    if (!open) return;

    const onChange = () => updatePlacement();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [open, updatePlacement]);

  useEffect(() => () => clearShowTimer(), [clearShowTimer]);

  const panelPos = side === 'bottom' ? 'top-full left-1/2 mt-2' : 'bottom-full left-1/2 mb-2';

  const triggerClasses = [
    'relative isolate',
    focusableTrigger ? 'outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 rounded-sm' : '',
    triggerClassName ?? 'inline-flex',
  ]
    .filter(Boolean)
    .join(' ');

  const panelTextClasses =
    wrapContent && preferSingleLine
      ? 'max-w-[min(94vw,min(56rem,calc(100vw-20px)))] min-w-[12rem] overflow-x-auto overflow-y-hidden whitespace-nowrap text-left font-mono text-[13px] leading-normal [scrollbar-width:thin] select-text'
      : wrapContent
        ? 'max-w-[min(94vw,48rem)] min-w-[10rem] whitespace-pre-wrap break-all text-left leading-snug select-text'
        : 'max-w-[min(94vw,48rem)] whitespace-nowrap select-text';

  const motionOk =
    typeof window !== 'undefined' &&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const arrowStyle: React.CSSProperties =
    arrowLeftPx != null
      ? {
          left: arrowLeftPx,
          transform: 'translateX(-50%)',
        }
      : { left: '50%', transform: 'translateX(-50%)' };

  return (
    <span
      ref={triggerRef}
      tabIndex={focusableTrigger ? 0 : undefined}
      className={triggerClasses}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <span
        ref={panelRef}
        role="tooltip"
        style={{
          transform: `translateX(calc(-50% + ${offsetX}px))`,
          transition: motionOk ? 'opacity 110ms ease-out, filter 110ms ease-out' : undefined,
        }}
        className={`pointer-events-none absolute z-[80] rounded-xl border px-3 py-2 text-[12px] font-semibold tracking-[-0.01em] shadow-[0_14px_34px_rgba(15,23,42,0.24)] backdrop-blur-md ${
          'border-slate-950/10 bg-slate-950/90 text-white dark:border-white/10 dark:bg-white/95 dark:text-slate-950'
        } ${panelPos} ${panelTextClasses} ${
          open && placementReady ? 'opacity-100 blur-0' : 'opacity-0 blur-[1px]'
        }`}
      >
        {content}
        <span
          aria-hidden
          style={arrowStyle}
          className={`absolute h-0 w-0 border-x-[6px] border-x-transparent ${
            side === 'bottom'
              ? '-top-[5px] border-b-[6px] border-b-slate-950/90 dark:border-b-white/95'
              : '-bottom-[5px] border-t-[6px] border-t-slate-950/90 dark:border-t-white/95'
          }`}
        />
      </span>
    </span>
  );
};
