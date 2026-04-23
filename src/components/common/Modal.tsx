import React, { useEffect, useId } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { Theme } from '../../types';
import { Z } from '../../constants/zIndex';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/bodyScrollLock';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  theme: Theme;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** 覆盖内容区样式（如嵌入整页详情时用 p-0 + min-h-0） */
  contentClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
}

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
};

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, theme, size = 'md', contentClassName, children, footer, closeOnBackdrop = true,
}) => {
  const isDark = theme === 'dark';
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const bodyClass = contentClassName ?? 'flex-1 overflow-y-auto px-6 py-4';
  const bodyToneClass = isDark ? 'text-lantu-text-secondary' : 'text-neutral-600';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    lockBodyScroll();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockBodyScroll();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z.MODAL }}>
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          <motion.div
            key="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : '对话框'}
            initial={reduceMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 400, damping: 30 }
            }
            className={`relative w-full ${SIZE_MAP[size]} rounded-[2rem] border flex flex-col max-h-[85vh] overflow-hidden motion-reduce:transition-none shadow-[var(--shadow-modal)] ${
              isDark
                ? 'bg-lantu-card text-lantu-text-primary border-white/[0.08]'
                : 'bg-white text-neutral-900 border-neutral-200/60'
            }`}
          >
            {title && (
              <div className={`flex items-start justify-between px-6 py-5 shrink-0`}>
                <h3 id={titleId} className={`text-xl font-semibold tracking-tight ${isDark ? 'text-neutral-100' : 'text-neutral-900'}`}>
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className={`p-2 -mr-2 rounded-full min-h-10 min-w-10 inline-flex items-center justify-center transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${
                    isDark ? 'hover:bg-white/10 text-neutral-400 focus-visible:ring-offset-lantu-card' : 'hover:bg-neutral-100 text-neutral-400 focus-visible:ring-offset-white'
                  }`}
                >
                  <X size={20} aria-hidden />
                </button>
              </div>
            )}

            {!title && (
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className={`absolute top-3 right-3 p-2 rounded-full min-h-10 min-w-10 inline-flex items-center justify-center transition-colors motion-reduce:transition-none z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 focus-visible:ring-offset-2 ${
                  isDark ? 'hover:bg-white/10 text-neutral-400 focus-visible:ring-offset-lantu-card' : 'hover:bg-neutral-100 text-neutral-400 focus-visible:ring-offset-white'
                }`}
              >
                <X size={20} aria-hidden />
              </button>
            )}

            <div className={`${bodyToneClass} ${bodyClass}`}>{children}</div>

            {footer && (
              <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-neutral-50/80 border-neutral-100'}`}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    ,
    document.body,
  );
};
