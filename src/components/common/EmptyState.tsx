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
  <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-neutral-200 dark:border-white/10 rounded-3xl bg-neutral-50/50 dark:bg-white/[0.02]">
    <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl shadow-sm border border-neutral-100 dark:border-white/10 flex items-center justify-center mb-5">
      {icon ?? <Inbox size={24} strokeWidth={1.5} className="text-neutral-400 dark:text-neutral-500" />}
    </div>

    <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-200 tracking-tight mb-2">
      {title}
    </h3>
    <p
      className={`text-sm text-neutral-500 dark:text-neutral-400 max-w-[280px] leading-relaxed ${
        action ? 'mb-6' : 'mb-0'
      }`}
    >
      {description}
    </p>

    {action}
  </div>
);
