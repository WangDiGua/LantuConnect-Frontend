import React, { useMemo, useState } from 'react';
import { Plus, Database as DatabaseIcon, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import type { DatabaseItem } from './types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DataTable, SearchInput, type Column, type RowAction } from '../../components/common';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  items: DatabaseItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreate: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRowMenu?: (id: string) => void;
}

const PAGE_SIZE = 20;

export const DatabaseList: React.FC<Props> = ({
  theme,
  fontSize,
  themeColor,
  items,
  searchQuery,
  onSearchChange,
  onCreate,
  onEdit,
  onDelete,
  onRowMenu,
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div
          className={`rounded-2xl border overflow-hidden flex-1 min-h-0 flex flex-col shadow-none ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}
        >
          <div
            className={`shrink-0 px-4 sm:px-6 py-4 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <h1
              className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              <span
                className={`inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                  isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <DatabaseIcon size={18} strokeWidth={2} />
              </span>
              数据库
            </h1>
          </div>

          <div
            className={`shrink-0 px-4 sm:px-6 py-3 border-b flex flex-wrap items-center gap-3 ${
              isDark ? 'border-white/10 bg-[#1C1C1E]/50' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex-1 min-w-[min(100%,280px)]">
              <SearchInput
                value={searchQuery}
                onChange={onSearchChange}
                placeholder="请输入数据库名称或描述"
                theme={theme}
                className="h-9"
              />
            </div>
            <button
              type="button"
              onClick={onCreate}
              className={`btn btn-sm h-9 min-h-0 gap-1 font-bold text-white border-0 shrink-0 ${tc.bg} shadow-lg ${tc.shadow}`}
            >
              <Plus size={16} />
              创建数据库
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 min-h-[320px]">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${
                    isDark ? 'bg-white/5' : 'bg-slate-100'
                  }`}
                >
                  <div className="relative">
                    <DatabaseIcon size={40} className={tc.text} strokeWidth={1.25} />
                    <div
                      className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center text-white ${tc.bg}`}
                    >
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
                <p className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>暂无数据库</p>
                <p
                  className={`text-sm mb-8 max-w-lg text-center leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  用数据库存储和管理结构化数据格式的文件
                </p>
                <button
                  type="button"
                  onClick={onCreate}
                  className={`btn text-white border-0 ${tc.bg} shadow-lg ${tc.shadow}`}
                >
                  创建数据库
                </button>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar">
                <DataTable<DatabaseItem>
                  columns={[
                    {
                      key: 'name',
                      label: '数据库名称/ID',
                      minWidth: '200px',
                      render: (_, row) => (
                        <>
                          <div className="font-semibold truncate" title={row.name}>
                            {row.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate" title={row.id}>
                            {row.id}
                          </div>
                        </>
                      ),
                    },
                    {
                      key: 'description',
                      label: '描述',
                      minWidth: '220px',
                      render: (value) => (
                        <div className="text-slate-500 line-clamp-2" title={String(value)}>
                          {value}
                        </div>
                      ),
                    },
                    {
                      key: 'creationMethod',
                      label: '创建方式',
                      minWidth: '120px',
                    },
                    {
                      key: 'updatedAt',
                      label: '更新时间',
                      minWidth: '140px',
                      render: (value) => <span className="font-mono text-[11px] text-slate-400">{value}</span>,
                    },
                    {
                      key: 'createdAt',
                      label: '创建时间',
                      minWidth: '140px',
                      render: (value) => <span className="font-mono text-[11px] text-slate-400">{value}</span>,
                    },
                  ]}
                  data={paginated}
                  theme={theme}
                  rowActions={[
                    ...(onEdit
                      ? [
                          {
                            label: '编辑',
                            onClick: (row) => onEdit(row.id),
                            icon: <Edit size={14} />,
                          },
                        ]
                      : []),
                    ...(onDelete
                      ? [
                          {
                            label: '删除',
                            onClick: (row) => setDeleteTarget(row.id),
                            icon: <Trash2 size={14} />,
                            variant: 'danger' as const,
                          },
                        ]
                      : []),
                    ...(onRowMenu
                      ? [
                          {
                            label: '更多',
                            onClick: (row) => onRowMenu(row.id),
                            icon: <MoreHorizontal size={16} />,
                          },
                        ]
                      : []),
                  ]}
                  pagination={
                    filtered.length > 0
                      ? {
                          currentPage: page,
                          totalPages: Math.ceil(filtered.length / PAGE_SIZE),
                          onPageChange: setPage,
                          pageSize: PAGE_SIZE,
                        }
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {onDelete && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="删除数据库"
          message={`确定要删除数据库「${deleteTarget ? items.find(i => i.id === deleteTarget)?.name : ''}」吗？此操作不可撤销。`}
          confirmText="删除"
          variant="danger"
          onConfirm={() => {
            if (deleteTarget && onDelete) {
              onDelete(deleteTarget);
              setDeleteTarget(null);
              setPage(1);
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
