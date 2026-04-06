import React, { useCallback, useEffect, useRef, useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  preferredSide?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, preferredSide = 'top' }) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'top' | 'bottom'>(preferredSide);
  const [offsetX, setOffsetX] = useState(0);
  const [arrowX, setArrowX] = useState<number | undefined>(undefined);

  const updatePlacement = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const panelRect = panelEl.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 8;

    const canTop = triggerRect.top >= panelRect.height + gap + viewportPadding;
    const canBottom = window.innerHeight - triggerRect.bottom >= panelRect.height + gap + viewportPadding;
    const nextSide =
      preferredSide === 'top'
        ? canTop ? 'top' : 'bottom'
        : canBottom ? 'bottom' : 'top';
    setSide(nextSide);

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const idealLeft = triggerCenterX - panelRect.width / 2;
    const minLeft = viewportPadding;
    const maxLeft = window.innerWidth - viewportPadding - panelRect.width;
    const clampedLeft = Math.max(minLeft, Math.min(idealLeft, maxLeft));

    setOffsetX(clampedLeft - idealLeft);
    setArrowX(triggerCenterX - clampedLeft);
  }, [preferredSide]);

  useEffect(() => {
    if (!open) return;
    updatePlacement();

    const onWindowChange = () => updatePlacement();
    window.addEventListener('resize', onWindowChange);
    window.addEventListener('scroll', onWindowChange, true);
    return () => {
      window.removeEventListener('resize', onWindowChange);
      window.removeEventListener('scroll', onWindowChange, true);
    };
  }, [open, updatePlacement]);

  const panelPosClass = side === 'bottom'
    ? 'top-full mt-2 left-1/2'
    : 'bottom-full mb-2 left-1/2';

  const arrowPosClass = side === 'bottom'
    ? 'top-[-4px] rotate-45'
    : 'bottom-[-4px] rotate-45';

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex group/tooltip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        ref={panelRef}
        role="tooltip"
        style={{ transform: `translateX(calc(-50% + ${offsetX}px))` }}
        className={`pointer-events-none absolute z-[80] whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-lg transition-all duration-150 dark:border-white/10 dark:bg-lantu-card dark:text-neutral-200 ${panelPosClass} ${open ? 'opacity-100' : 'opacity-0'}`}
      >
        {content}
        <span
          style={arrowX !== undefined ? { left: `${arrowX}px`, transform: 'translateX(-50%) rotate(45deg)' } : undefined}
          className={`absolute h-2 w-2 border-l border-t border-neutral-200 bg-white dark:border-white/10 dark:bg-lantu-card ${arrowPosClass}`}
        />
      </span>
    </span>
  );
};

