import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => (
  <div className="flex-1 flex items-center justify-center min-h-[200px] p-6">
    <div className="flex flex-col items-center gap-3 max-w-xs text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500">
        {icon ?? <Inbox size={24} />}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
          {description}
        </p>
      </div>

      {action && <div className="pt-1">{action}</div>}
    </div>
  </div>
);
