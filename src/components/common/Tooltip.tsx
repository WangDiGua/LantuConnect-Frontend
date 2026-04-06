import React, { useCallback, useEffect, useRef, useState } from 'react';

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
const GAP_PX = 10;
const ARROW_HALF = 5;

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
    const innerMin = ARROW_HALF + 6;
    const innerMax = pr.width - innerMin;
    setArrowLeftPx(Math.max(innerMin, Math.min(arrowTargetX, innerMax)));
  }, [open, preferredSide, resolveAutoSide]);

  useEffect(() => {
    if (!open) return;

    let a = 0;
    let b = 0;
    const run = () => {
      a = requestAnimationFrame(() => {
        b = requestAnimationFrame(() => updatePlacement());
      });
    };
    run();

    const onChange = () => updatePlacement();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      cancelAnimationFrame(a);
      cancelAnimationFrame(b);
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [open, content, wrapContent, preferSingleLine, updatePlacement]);

  const panelPos = side === 'bottom' ? 'top-full left-1/2 mt-2.5' : 'bottom-full left-1/2 mb-2.5';

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
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        ref={panelRef}
        role="tooltip"
        style={{
          transform: `translateX(calc(-50% + ${offsetX}px))`,
          transition: motionOk ? 'opacity 120ms ease-out' : undefined,
        }}
        className={`pointer-events-none absolute z-[80] rounded-md border border-white/10 bg-neutral-800 px-3 py-2 text-sm font-normal text-white shadow-[0_4px_12px_rgba(0,0,0,0.32)] ${panelPos} ${panelTextClasses} ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {content}
        <span
          aria-hidden
          style={arrowStyle}
          className={`absolute h-2 w-2 rotate-45 border border-white/10 bg-neutral-800 ${
            side === 'bottom' ? '-top-1 border-b-0 border-r-0' : '-bottom-1 border-l-0 border-t-0'
          }`}
        />
      </span>
    </span>
  );
};
