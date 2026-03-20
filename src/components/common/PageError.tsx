import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

export interface PageErrorProps {
  error: Error | null;
  onRetry: () => void;
}

export const PageError: React.FC<PageErrorProps> = ({ error, onRetry }) => (
  <div className="flex-1 flex items-center justify-center min-h-[240px] p-6">
    <div className="flex flex-col items-center gap-4 max-w-sm text-center">
      <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
        <AlertCircle size={24} className="text-rose-500" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          加载失败
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {error?.message || '发生未知错误'}
        </p>
      </div>

      <button
        type="button"
        onClick={onRetry}
        aria-label="重试"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm"
      >
        <RotateCw size={14} />
        重试
      </button>
    </div>
  </div>
);
