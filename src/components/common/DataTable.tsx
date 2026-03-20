import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Theme } from '../../types';

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

    // Apply filters
    if (enableFiltering && Object.keys(filters).length > 0) {
      result = result.filter((row) => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          const cellValue = String(row[key] || '').toLowerCase();
          return cellValue.includes(value.toLowerCase());
        });
      });
    }

    // Apply sorting
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
      return <ArrowUpDown size={14} className="text-slate-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
      : <ArrowDown size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />;
  };

  const defaultEmptyState = (
    <div className={`py-12 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
      <p className="text-sm">暂无数据</p>
    </div>
  );

  if (loading) {
    return (
      <div className={`rounded-2xl border ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'} ${className}`}>
        <div className="py-12 text-center">
          <div className={`inline-block animate-spin rounded-full h-8 w-8 border-2 ${isDark ? 'border-white/20 border-t-blue-400' : 'border-slate-200 border-t-blue-600'}`}></div>
          <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'} ${className}`}>
      <div className="overflow-x-auto">
        <table className="table w-full text-sm min-w-full">
          <thead>
            <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 font-semibold ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'} ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                  style={{ minWidth: column.minWidth }}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable !== false && enableSorting && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className={`p-1 rounded-lg transition-colors ${
                          isDark 
                            ? 'hover:bg-white/5 text-slate-400' 
                            : 'hover:bg-slate-100 text-slate-400'
                        }`}
                        title="排序"
                      >
                        {getSortIcon(column.key)}
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {rowActions && rowActions.length > 0 && (
                <th className={`px-4 py-3 font-semibold text-right ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody>
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
                  className={`border-b transition-colors ${
                    isDark
                      ? `border-white/5 ${index % 2 === 1 ? 'bg-white/5' : ''} ${onRowClick ? 'hover:bg-white/5 cursor-pointer' : ''}`
                      : `border-slate-100 ${index % 2 === 1 ? 'bg-slate-50/80' : ''} ${onRowClick ? 'hover:bg-slate-100/80 cursor-pointer' : ''}`
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
                        className={`px-4 py-3 ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'} ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
                        style={{ minWidth: column.minWidth }}
                      >
                        {content}
                      </td>
                    );
                  })}
                  {rowActions && rowActions.length > 0 && (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {rowActions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                            }}
                            className={`px-2 py-1 rounded-xl text-xs font-medium transition-colors ${
                              action.variant === 'danger'
                                ? isDark
                                  ? 'text-red-400 hover:bg-red-500/10'
                                  : 'text-red-600 hover:bg-red-50'
                                : isDark
                                  ? 'text-blue-400 hover:bg-blue-500/10'
                                  : 'text-blue-600 hover:bg-blue-50'
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
        <div className={`px-4 py-3 border-t flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            第 {pagination.currentPage} / {pagination.totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className={`p-2 rounded-xl transition-colors ${
                pagination.currentPage === 1
                  ? isDark
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-300 cursor-not-allowed'
                  : isDark
                    ? 'text-slate-300 hover:bg-white/5'
                    : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className={`p-2 rounded-xl transition-colors ${
                pagination.currentPage === pagination.totalPages
                  ? isDark
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-300 cursor-not-allowed'
                  : isDark
                    ? 'text-slate-300 hover:bg-white/5'
                    : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
