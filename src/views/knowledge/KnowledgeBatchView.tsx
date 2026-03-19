import React, { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import type { KnowledgeItem } from './types';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  items: KnowledgeItem[];
  onBack: () => void;
  onDeleteSelected: (ids: string[]) => void;
}

export const KnowledgeBatchView: React.FC<Props> = ({
  theme,
  fontSize,
  items,
  onBack,
  onDeleteSelected,
}) => {
  const isDark = theme === 'dark';
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const handleDelete = () => {
    if (selected.size === 0) return;
    onDeleteSelected([...selected]);
    setSelected(new Set());
  };

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
            className={`shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle shrink-0">
                <ArrowLeft size={20} />
              </button>
              <h1 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>批量操作</h1>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={selected.size === 0}
              className="btn btn-error btn-outline btn-sm gap-1 shrink-0"
            >
              <Trash2 size={16} />
              删除所选 ({selected.size})
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-4 sm:px-6 sm:py-4">
            {items.length === 0 ? (
              <p className={`text-center py-20 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                暂无知识库可批量操作，请先创建知识库。
              </p>
            ) : (
              <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-dashed border-slate-200/80 dark:border-white/10">
                <table className="table w-full min-w-[640px]">
                  <thead className={isDark ? 'bg-[#1C1C1E]' : 'bg-slate-50'}>
                    <tr>
                      <th className="w-12">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={items.length > 0 && selected.size === items.length}
                          onChange={toggleAll}
                        />
                      </th>
                      <th>名称</th>
                      <th>ID</th>
                      <th className="text-right">文件数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, i) => (
                      <tr
                        key={row.id}
                        className={
                          isDark ? (i % 2 === 1 ? 'bg-white/5' : '') : i % 2 === 1 ? 'bg-slate-50/80' : ''
                        }
                      >
                        <td>
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={selected.has(row.id)}
                            onChange={() => toggle(row.id)}
                          />
                        </td>
                        <td className="font-medium">{row.name}</td>
                        <td className="font-mono text-xs text-slate-400">{row.id}</td>
                        <td className="text-right tabular-nums">{row.fileCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
