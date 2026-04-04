import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Z } from '../../constants/zIndex';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/bodyScrollLock';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  variant?: 'danger' | 'info' | 'warning';
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const VARIANT_CLASSES: Record<string, string> = {
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700',
  warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  info: 'bg-neutral-900 text-white hover:bg-neutral-800',
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message, confirmText, cancelText = '取消', variant = 'info', loading = false, onCancel, onConfirm,
}) => {
  const titleId = React.useId();
  const messageId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  React.useEffect(() => {
    if (!open || loading) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, onCancel, open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z.MODAL }}>
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-[2px]"
            onClick={loading ? undefined : onCancel}
          />

          <motion.div
            key="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm rounded-[2rem] border p-6 bg-white dark:bg-lantu-card border-neutral-200/60 dark:border-white/[0.08] shadow-2xl"
          >
            <h3 id={titleId} className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">{title}</h3>
            <p id={messageId} className="mt-2 text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{message}</p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:pointer-events-none ${VARIANT_CLASSES[variant]}`}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
