import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Z } from '../../constants/zIndex';

interface PortalDropdownProps {
  open: boolean;
  onClose: () => void;
  /** The DOM element to anchor the dropdown below */
  anchorEl: HTMLElement | null;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
  /** 与锚点同宽（用于自定义下拉与触发器对齐） */
  matchAnchorWidth?: boolean;
}

/**
 * Renders a dropdown via portal to escape overflow-hidden containers.
 * Positions itself below the anchor element using fixed positioning.
 */
export const PortalDropdown: React.FC<PortalDropdownProps> = ({
  open,
  onClose,
  anchorEl,
  children,
  className = '',
  align = 'right',
  matchAnchorWidth = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; right: number; width?: number; maxHeight: number } | null>(null);

  const reposition = useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const edgePadding = 8;
    const gap = 6;
    const rawMenuHeight = menuRef.current?.offsetHeight ?? 240;
    const menuHeight = Math.min(rawMenuHeight, 320);
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - edgePadding);
    const spaceAbove = Math.max(0, rect.top - edgePadding);
    const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const dynamicMaxHeight = Math.max(120, openUpward ? (spaceAbove - gap) : (spaceBelow - gap));
    const top = openUpward
      ? Math.max(edgePadding, rect.top - Math.min(menuHeight, dynamicMaxHeight) - gap)
      : rect.bottom + gap;

    setPos({
      top,
      left: rect.left,
      right: window.innerWidth - rect.right,
      width: matchAnchorWidth ? rect.width : undefined,
      maxHeight: dynamicMaxHeight,
    });
  }, [anchorEl, matchAnchorWidth]);

  useEffect(() => {
    if (!open || !anchorEl) { setPos(null); return; }
    reposition();
    const raf = window.requestAnimationFrame(reposition);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, anchorEl, reposition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorEl && !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorEl]);

  if (!open || !pos) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: pos.top,
    maxHeight: pos.maxHeight,
    zIndex: Z.PORTAL_DROPDOWN,
    ['--portal-dropdown-max-height' as string]: `${pos.maxHeight}px`,
    ...(pos.width != null
      ? { left: pos.left, width: pos.width, minWidth: pos.width }
      : align === 'right'
        ? { right: pos.right }
        : { left: pos.left }),
  };

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className={className}
      onWheelCapture={(e) => e.stopPropagation()}
      onTouchMoveCapture={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
};
