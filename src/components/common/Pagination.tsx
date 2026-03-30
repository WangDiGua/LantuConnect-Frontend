import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Theme } from '../../types';

export interface PaginationProps {
  theme: Theme;
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

function buildPageNumbers(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < totalPages - 2) pages.push('ellipsis');

  pages.push(totalPages);
  return pages;
}

function navBtnClass(theme: Theme) {
  const d = theme === 'dark';
  return `inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    d ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

function pageBtnClass(active: boolean, theme: Theme) {
  const d = theme === 'dark';
  if (active) {
    return `inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
      d ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'
    }`;
  }
  return `inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
    d ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

function metaTextClass(theme: Theme) {
  return theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
}

export const Pagination: React.FC<PaginationProps> = ({
  theme,
  page,
  pageSize,
  total,
  onChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);

  const rangeStart = Math.min((page - 1) * pageSize + 1, total);
  const rangeEnd = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div className={`flex items-center justify-between gap-4 px-1 py-3 text-xs ${metaTextClass(theme)}`}>
      <span>
        第 {rangeStart}–{rangeEnd} 条，共 {total} 条
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="上一页"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={navBtnClass(theme)}
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span
              key={`e-${idx}`}
              className={`w-8 text-center select-none ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`第 ${p} 页`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
              className={pageBtnClass(p === page, theme)}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="下一页"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className={navBtnClass(theme)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
