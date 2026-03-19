import React, { useMemo } from 'react';
import { Search, Plus, Database as DatabaseIcon, Filter, MoreHorizontal } from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import type { DatabaseItem } from './types';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  items: DatabaseItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreate: () => void;
  onRowMenu?: (id: string) => void;
}

export const DatabaseList: React.FC<Props> = ({
  theme,
  fontSize,
  themeColor,
  items,
  searchQuery,
  onSearchChange,
  onCreate,
  onRowMenu,
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];

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
            <div className="flex-1 min-w-[min(100%,280px)] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <input
                type="text"
                placeholder="请输入数据库名称或描述"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="input input-bordered input-sm w-full pl-9 h-9 text-xs"
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
                <table className="table w-full min-w-[960px] text-[13px]">
                  <thead className={isDark ? 'bg-[#1C1C1E]' : 'bg-slate-50'}>
                    <tr>
                      <th className="whitespace-nowrap min-w-[200px]">数据库名称/ID</th>
                      <th className="min-w-[220px]">描述</th>
                      <th className="whitespace-nowrap min-w-[120px]">
                        <span className="inline-flex items-center gap-1">
                          创建方式
                          <Filter size={12} className="opacity-50" />
                        </span>
                      </th>
                      <th className="whitespace-nowrap min-w-[140px]">更新时间</th>
                      <th className="whitespace-nowrap min-w-[140px]">创建时间</th>
                      <th className="text-right whitespace-nowrap min-w-[88px]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, index) => (
                      <tr
                        key={row.id}
                        className={
                          isDark
                            ? index % 2 === 1
                              ? 'bg-white/5'
                              : ''
                            : index % 2 === 1
                              ? 'bg-slate-50/80'
                              : ''
                        }
                      >
                        <td>
                          <div className="font-semibold truncate" title={row.name}>
                            {row.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate" title={row.id}>
                            {row.id}
                          </div>
                        </td>
                        <td>
                          <div className="text-slate-500 line-clamp-2" title={row.description}>
                            {row.description}
                          </div>
                        </td>
                        <td className="whitespace-nowrap">{row.creationMethod}</td>
                        <td className="whitespace-nowrap font-mono text-[11px] text-slate-400">{row.updatedAt}</td>
                        <td className="whitespace-nowrap font-mono text-[11px] text-slate-400">{row.createdAt}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-square"
                            onClick={() => onRowMenu?.(row.id)}
                            title="更多"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </td>
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
