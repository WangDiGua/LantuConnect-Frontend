import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContentLoaderProps {
  loading?: boolean;
  children: React.ReactNode;
}

export const ContentLoader: React.FC<ContentLoaderProps> = ({ loading = false, children }) => (
  <AnimatePresence mode="wait">
    {loading ? (
      <motion.div
        key="loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="flex-1 flex items-center justify-center min-h-[200px]"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
          <span className="text-xs text-slate-400">加载中…</span>
        </div>
      </motion.div>
    ) : (
      <motion.div
        key="content"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex-1 flex flex-col min-h-0"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

interface PageLoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PageLoadingSpinner: React.FC<PageLoadingSpinnerProps> = ({
  text = '加载中…',
  size = 'md',
}) => {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  const borderMap = { sm: 'border-[1.5px]', md: 'border-2', lg: 'border-[3px]' };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className={`relative ${sizeMap[size]}`}>
          <div className={`absolute inset-0 rounded-full ${borderMap[size]} border-slate-200`} />
          <div className={`absolute inset-0 rounded-full ${borderMap[size]} border-indigo-500 border-t-transparent animate-spin`} />
        </div>
        {text && <span className="text-xs text-slate-400">{text}</span>}
      </div>
    </div>
  );
};
