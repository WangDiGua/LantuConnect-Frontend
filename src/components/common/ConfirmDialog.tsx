import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
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
  danger: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500',
  warning: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400',
  info: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText,
  cancelText = '取消',
  variant = 'info',
  loading = false,
  onCancel,
  onConfirm,
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={loading ? undefined : onCancel}
          aria-hidden="true"
        />

        {/* Dialog */}
        <motion.div
          key="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-sm rounded-2xl border shadow-2xl p-6 bg-white dark:bg-[#1C1C1E] border-slate-200 dark:border-white/10"
        >
          <h3
            id="confirm-title"
            className="text-base font-semibold text-slate-800 dark:text-slate-100"
          >
            {title}
          </h3>

          <p
            id="confirm-message"
            className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed"
          >
            {message}
          </p>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70 ${VARIANT_CLASSES[variant]}`}
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
