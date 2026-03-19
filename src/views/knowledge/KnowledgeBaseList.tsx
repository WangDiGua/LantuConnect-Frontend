import React, { useMemo, useState } from 'react';
import {
  Search,
  PanelLeft,
  Folder,
  Filter,
  MoreHorizontal,
  Plus,
  Library,
  BookOpen,
} from 'lucide-react';
import { Theme, FontSize, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';
import type { KnowledgeItem } from './types';

interface KnowledgeBaseListProps {
  theme: Theme;
  fontSize: FontSize;
  themeColor: ThemeColor;
  items: KnowledgeItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreate: () => void;
  onBatch: () => void;
  onDeveloper: () => void;
  onHitTest: () => void;
  onRowMenu?: (id: string) => void;
}

export const KnowledgeBaseList: React.FC<KnowledgeBaseListProps> = ({
  theme,
  fontSize,
  themeColor,
  items,
  searchQuery,
  onSearchChange,
  onCreate,
  onBatch,
  onDeveloper,
  onHitTest,
  onRowMenu,
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      {/* 顶栏：标题 + 命中测试（与主内容区同宽，不缩成一列） */}
      <div
        className={`shrink-0 flex items-center justify-between gap-4 py-2 sm:py-3 ${
          isDark ? '' : ''
        }`}
      >
        <h1
          className={`text-lg font-bold flex items-center gap-2 min-w-0 ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          <span
            className={`inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
              isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <BookOpen size={18} strokeWidth={2} />
          </span>
          <span className="truncate">知识库</span>
        </h1>
        <button
          type="button"
          onClick={onHitTest}
          className={`btn btn-ghost btn-sm gap-2 font-medium shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
        >
          <Search size={16} className="opacity-70" />
          命中测试
        </button>
      </div>

      {/* 工具栏：搜索区横向铺满剩余空间 */}
      <div
        className={`shrink-0 flex flex-wrap items-center gap-3 pb-3 ${
          isDark ? '' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="btn btn-ghost btn-sm btn-square shrink-0"
          title={sidebarCollapsed ? '展开群组' : '收起群组'}
        >
          <PanelLeft size={18} />
        </button>
        <div className="flex-1 min-w-[min(100%,220px)] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
          <input
            type="text"
            placeholder="请输入知识库名称或描述"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input input-bordered input-sm w-full pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onClick={onBatch} className="btn btn-outline btn-sm h-9 min-h-0">
            批量操作
          </button>
          <button type="button" onClick={onDeveloper} className="btn btn-outline btn-sm h-9 min-h-0">
            开发者资源
          </button>
          <button
            type="button"
            onClick={onCreate}
            className={`btn btn-sm h-9 min-h-0 gap-1 font-bold text-white border-0 ${tc.bg} shadow-lg ${tc.shadow}`}
          >
            <Plus size={16} />
            创建知识库
          </button>
        </div>
      </div>

      {/* 主区：左树 + 右表（占满剩余高度） */}
      <div className="flex-1 min-h-0 flex gap-3">
        {!sidebarCollapsed && (
          <aside
            className={`w-52 sm:w-56 shrink-0 rounded-2xl border overflow-hidden flex flex-col shadow-none ${
              isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
            }`}
          >
            <div
              className={`flex items-center justify-between px-3 py-2.5 border-b text-xs font-bold ${
                isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
              }`}
            >
              <span>知识库群组</span>
              <button type="button" className="btn btn-ghost btn-xs btn-square min-h-0 h-7 w-7" title="搜索群组">
                <Search size={14} />
              </button>
            </div>
            <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
              <button
                type="button"
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left text-sm font-medium transition-colors ${
                  isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                <Folder size={16} className={tc.text} />
                <span className="flex-1 truncate">全部群组</span>
                <span className={`text-xs tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {items.length}
                </span>
              </button>
            </div>
          </aside>
        )}

        <div
          className={`flex-1 min-w-0 rounded-2xl border overflow-hidden flex flex-col shadow-none ${
            isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
          }`}
        >
          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${
                  isDark ? 'bg-white/5' : 'bg-slate-100'
                }`}
              >
                <div className="relative">
                  <Library size={40} className={tc.text} strokeWidth={1.25} />
                  <div
                    className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center text-white ${tc.bg}`}
                  >
                    <Plus size={16} />
                  </div>
                </div>
              </div>
              <p className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>暂无知识库</p>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                创建第一个知识库，开始管理文档与向量检索
              </p>
              <button
                type="button"
                onClick={onCreate}
                className={`btn text-white border-0 ${tc.bg} shadow-lg ${tc.shadow}`}
              >
                创建知识库
              </button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
              <table className="table w-full min-w-[1100px] text-[13px]">
                <thead className={isDark ? 'bg-[#1C1C1E]' : 'bg-slate-50'}>
                  <tr>
                    <th className="whitespace-nowrap min-w-[180px]">知识库名称/ID</th>
                    <th className="min-w-[200px]">描述</th>
                    <th className="whitespace-nowrap text-right min-w-[88px]">文件数量</th>
                    <th className="whitespace-nowrap min-w-[120px]">
                      <span className="inline-flex items-center gap-1">
                        托管资源
                        <Filter size={12} className="opacity-50" />
                      </span>
                    </th>
                    <th className="whitespace-nowrap min-w-[120px]">向量模型</th>
                    <th className="whitespace-nowrap min-w-[140px]">集群/实例名称</th>
                    <th className="text-right whitespace-nowrap min-w-[100px]">操作</th>
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
                      <td className="text-right font-mono tabular-nums">{row.fileCount}</td>
                      <td className="whitespace-nowrap">{row.hosted}</td>
                      <td className="whitespace-nowrap">{row.vectorModel}</td>
                      <td className="whitespace-nowrap font-mono text-xs">{row.cluster}</td>
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
