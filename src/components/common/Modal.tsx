import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Theme } from '../../types';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  theme: Theme;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
}

const SIZE_MAP = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, theme, size = 'md', children, footer, closeOnBackdrop = true,
}) => {
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          <motion.div
            key="modal-content"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`relative w-full ${SIZE_MAP[size]} rounded-2xl border flex flex-col max-h-[85vh] ${
              isDark
                ? 'bg-[#1a1f2e]/90 backdrop-blur-2xl border-white/[0.08] shadow-2xl shadow-black/40'
                : 'bg-white/90 backdrop-blur-2xl border-slate-200/60 shadow-2xl shadow-black/5'
            }`}
          >
            {title && (
              <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <h3 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className={`p-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {!title && (
              <button
                type="button"
                onClick={onClose}
                className={`absolute top-3 right-3 p-1.5 rounded-xl transition-colors z-10 ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                <X size={16} />
              </button>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

            {footer && (
              <div className={`flex items-center justify-end gap-2.5 px-6 py-4 border-t shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
