import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Theme, FontSize, ThemeColor } from '../../types';
import type { KnowledgeItem } from './types';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ProgressBar } from '../../components/common/ProgressBar';
import { CountdownTimer } from '../../components/common/CountdownTimer';
import { DataTable, type Column } from '../../components/common';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  items: KnowledgeItem[];
  onBack: () => void;
  onDeleteSelected: (ids: string[]) => void;
}

export const KnowledgeBatchView: React.FC<Props> = ({
  theme,
  fontSize,
  themeColor = 'red',
  items,
  onBack,
  onDeleteSelected,
}) => {
  const isDark = theme === 'dark';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);

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
    setShowCountdown(true);
  };

  const confirmDelete = () => {
    setShowCountdown(false);
    setConfirmOpen(false);
    setIsDeleting(true);
    setDeleteProgress(0);

    // 模拟删除进度
    const interval = setInterval(() => {
      setDeleteProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onDeleteSelected([...selected]);
          setSelected(new Set());
          setTimeout(() => {
            setIsDeleting(false);
            setDeleteProgress(0);
          }, 500);
          return 100;
        }
        return prev + 20;
      });
    }, 200);
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
              onClick={() => setConfirmOpen(true)}
              disabled={selected.size === 0 || isDeleting}
              className="btn btn-error btn-outline btn-sm gap-1 shrink-0"
            >
              <Trash2 size={16} />
              删除所选 ({selected.size})
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-4 sm:px-6 sm:py-4">
            {/* 批量删除进度 */}
            {isDeleting && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 p-4 rounded-xl border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 size={16} className="text-red-500" />
                  <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    正在删除 {selected.size} 个知识库...
                  </span>
                </div>
                <ProgressBar value={deleteProgress} theme={theme} themeColor={themeColor} showLabel={true} />
              </motion.div>
            )}

            {items.length === 0 ? (
              <p className={`text-center py-20 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                暂无知识库可批量操作，请先创建知识库。
              </p>
            ) : (
              <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-dashed border-slate-200/80 dark:border-white/10">
                <div className="p-2 border-b border-slate-200/80 dark:border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={items.length > 0 && selected.size === items.length}
                      onChange={toggleAll}
                    />
                    <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      全选 ({selected.size}/{items.length})
                    </span>
                  </label>
                </div>
                <DataTable<KnowledgeItem>
                  columns={[
                    {
                      key: 'name',
                      label: '名称',
                      render: (_, row) => (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={selected.has(row.id)}
                            onChange={() => toggle(row.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="font-medium">{row.name}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'id',
                      label: 'ID',
                      render: (value) => <span className="font-mono text-xs text-slate-400">{value}</span>,
                    },
                    {
                      key: 'fileCount',
                      label: '文件数',
                      align: 'right',
                      render: (value) => <span className="tabular-nums">{value}</span>,
                    },
                  ]}
                  data={items}
                  theme={theme}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen && !showCountdown}
        title="批量删除知识库"
        message={`确定要删除选中的 ${selected.size} 个知识库吗？此操作不可撤销。`}
        confirmText="确认删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <CountdownTimer
        visible={showCountdown}
        seconds={3}
        theme={theme}
        themeColor={themeColor}
        title="确认删除"
        description={`即将删除 ${selected.size} 个知识库，此操作不可撤销`}
        confirmText="确认删除"
        cancelText="取消"
        onComplete={confirmDelete}
        onCancel={() => {
          setShowCountdown(false);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
};
