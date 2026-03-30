import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Theme } from '../../types';
import { EmptyState } from './EmptyState';
import { PageSkeleton } from './PageSkeleton';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T, index: number) => void;
  rowActions?: RowAction<T>[];
  theme: Theme;
  className?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
  };
  enableSorting?: boolean;
  enableFiltering?: boolean;
}

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyState,
  onRowClick,
  rowActions,
  theme,
  className = '',
  pagination,
  enableSorting = true,
  enableFiltering = false,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const isDark = theme === 'dark';

  const handleSort = (key: string) => {
    if (!enableSorting) return;
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedAndFilteredData = useMemo(() => {
    let result = [...data];
    if (enableFiltering && Object.keys(filters).length > 0) {
      result = result.filter((row) =>
        Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          return String(row[key] || '').toLowerCase().includes(value.toLowerCase());
        }),
      );
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === bValue) return 0;
        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return result;
  }, [data, sortConfig, filters, enableFiltering]);

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-neutral-400" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={14} className="text-neutral-900 dark:text-neutral-200" />
      : <ArrowDown size={14} className="text-neutral-900 dark:text-neutral-200" />;
  };

  const defaultEmptyState = (
    <div className="py-4">
      <EmptyState title="暂无数据" description="当前筛选条件下没有可展示内容。" />
    </div>
  );

  if (loading) {
    return (
      <div className={`rounded-2xl border shadow-sm ${isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-neutral-200'} ${className}`}>
        <div className="p-4">
          <PageSkeleton type="table" rows={6} />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-neutral-200'} ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px] whitespace-nowrap min-w-full">
          <thead className={`border-b ${isDark ? 'border-white/10 bg-white/[0.03]' : 'bg-neutral-50/80 border-neutral-200'}`}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3.5 text-[12px] font-medium uppercase tracking-wider ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'} ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}
                  style={{ minWidth: column.minWidth }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable !== false && enableSorting && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-neutral-100'}`}
                        title="排序"
                      >
                        {getSortIcon(column.key)}
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {rowActions && rowActions.length > 0 && (
                <th className={`px-6 py-3.5 text-[12px] font-medium uppercase tracking-wider text-right ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-neutral-100'}`}>
            {sortedAndFilteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)}>
                  {emptyState || defaultEmptyState}
                </td>
              </tr>
            ) : (
              sortedAndFilteredData.map((row, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className={`transition-colors ${
                    isDark
                      ? `${onRowClick ? 'hover:bg-white/[0.04] cursor-pointer' : 'hover:bg-white/[0.02]'}`
                      : `${onRowClick ? 'hover:bg-neutral-50 cursor-pointer' : 'hover:bg-neutral-50/50'}`
                  }`}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((column) => {
                    const value = row[column.key];
                    const content = column.render
                      ? column.render(value, row, index)
                      : value;
                    return (
                      <td
                        key={column.key}
                        className={`px-6 py-4 text-[13px] ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'} ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}
                        style={{ minWidth: column.minWidth }}
                      >
                        {content}
                      </td>
                    );
                  })}
                  {rowActions && rowActions.length > 0 && (
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {rowActions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                              action.variant === 'danger'
                                ? isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                                : isDark ? 'text-neutral-300 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-50'
                            }`}
                            title={action.label}
                          >
                            {action.icon || action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className={`px-6 py-3 border-t flex items-center justify-between ${isDark ? 'border-white/10' : 'border-neutral-100'}`}>
          <div className={`text-[13px] ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
            第 {pagination.currentPage} / {pagination.totalPages} 页
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg text-[13px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'text-neutral-300 hover:bg-white/5' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg text-[13px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'text-neutral-300 hover:bg-white/5' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
