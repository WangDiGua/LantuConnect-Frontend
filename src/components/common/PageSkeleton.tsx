import React from 'react';

interface PageSkeletonProps {
  type?: 'table' | 'cards' | 'form' | 'detail' | 'dashboard' | 'sidebar' | 'chart';
  rows?: number;
}

const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`} />
);

const DashboardSkeleton: React.FC = () => (
  <div className="p-4 space-y-5">
    {/* Hero banner */}
    <Shimmer className="h-48 w-full rounded-2xl" />
    {/* Stats row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-3 w-16" />
              <Shimmer className="h-5 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
    {/* Charts row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-52 w-full rounded-xl" />
      </div>
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-52 w-full rounded-xl" />
      </div>
    </div>
    {/* Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Shimmer className="h-9 w-9 rounded-xl" />
            <Shimmer className="h-4 w-24" />
          </div>
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  </div>
);

const SidebarSkeleton: React.FC = () => (
  <div className="p-3 space-y-2">
    {/* Logo area */}
    <div className="px-2 py-3 mb-3">
      <Shimmer className="h-7 w-32" />
    </div>
    {/* Nav items */}
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2.5">
        <Shimmer className="h-5 w-5 rounded-lg" />
        <Shimmer className={`h-4 ${i % 3 === 0 ? 'w-20' : i % 3 === 1 ? 'w-28' : 'w-24'}`} />
      </div>
    ))}
    {/* Divider */}
    <div className="my-3">
      <Shimmer className="h-px w-full" />
    </div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2.5">
        <Shimmer className="h-5 w-5 rounded-lg" />
        <Shimmer className={`h-4 ${i % 2 === 0 ? 'w-24' : 'w-20'}`} />
      </div>
    ))}
  </div>
);

const ChartSkeleton: React.FC = () => (
  <div className="p-4 space-y-4">
    <div className="flex items-center justify-between">
      <Shimmer className="h-6 w-36" />
      <div className="flex gap-2">
        <Shimmer className="h-8 w-20 rounded-xl" />
        <Shimmer className="h-8 w-20 rounded-xl" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-4 w-16" />
          </div>
          <Shimmer className="h-48 w-full rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ type = 'table', rows = 5 }) => {
  if (type === 'dashboard') return <DashboardSkeleton />;
  if (type === 'sidebar') return <SidebarSkeleton />;
  if (type === 'chart') return <ChartSkeleton />;

  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-3 w-1/2" />
            <Shimmer className="h-20 w-full" />
            <div className="flex gap-2">
              <Shimmer className="h-8 w-20" />
              <Shimmer className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-10 w-full" />
          </div>
        ))}
        <Shimmer className="h-10 w-32" />
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="p-6 space-y-6">
        <Shimmer className="h-8 w-48" />
        <Shimmer className="h-4 w-96" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Shimmer className="h-3 w-20" />
              <Shimmer className="h-5 w-40" />
            </div>
          ))}
        </div>
        <Shimmer className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center mb-4">
        <Shimmer className="h-8 w-48" />
        <Shimmer className="h-9 w-24" />
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4 border-t border-slate-100">
            {Array.from({ length: 5 }).map((_, j) => (
              <Shimmer key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
