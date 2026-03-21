import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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
  danger: 'bg-rose-600 hover:bg-rose-500 hover:shadow-[var(--shadow-glow-rose)]',
  warning: 'bg-amber-500 hover:bg-amber-400 hover:shadow-[var(--shadow-glow-amber)]',
  info: 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-[var(--shadow-glow-indigo)]',
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, message, confirmText, cancelText = '取消', variant = 'info', loading = false, onCancel, onConfirm,
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={loading ? undefined : onCancel}
        />

        <motion.div
          key="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative w-full max-w-sm rounded-2xl border p-6 bg-white/90 dark:bg-[#1a1f2e]/90 backdrop-blur-2xl border-slate-200/60 dark:border-white/[0.08] shadow-2xl"
        >
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] shadow-sm disabled:opacity-70 ${VARIANT_CLASSES[variant]}`}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
