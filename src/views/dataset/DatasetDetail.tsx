import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Trash2,
  FileText,
  Clock,
  Database,
  Tag,
  HardDrive,
  BarChart3,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Dataset } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

interface DatasetDetailProps {
  datasetId: string;
  theme: Theme;
  fontSize: FontSize;
  onBack?: () => void;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  published: { label: '已发布', cls: 'badge-success' },
  draft: { label: '草稿', cls: 'badge-ghost' },
  testing: { label: '测试中', cls: 'badge-info' },
  deprecated: { label: '已下架', cls: 'badge-warning' },
};

const SOURCE_LABEL: Record<string, string> = {
  department: '部门数据',
  knowledge: '知识库',
  third_party: '第三方',
};

const DATA_TYPE_LABEL: Record<string, string> = {
  document: '文档',
  structured: '结构化',
  image: '图片',
  audio: '音频',
  video: '视频',
  mixed: '混合',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + ' 万';
  return n.toLocaleString();
}

export const DatasetDetail: React.FC<DatasetDetailProps> = ({ datasetId, theme, onBack, showMessage }) => {
  const isDark = theme === 'dark';
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDataset = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await datasetService.getById(Number(datasetId));
      setDataset(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [datasetId]);

  useEffect(() => { fetchDataset(); }, [fetchDataset]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await datasetService.remove(Number(datasetId));
      showMessage?.('删除成功', 'success');
      setDeleteOpen(false);
      onBack?.();
    } catch {
      showMessage?.('删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageSkeleton type="detail" />
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageError error={error} onRetry={fetchDataset} />
      </div>
    );
  }

  const statusInfo = STATUS_MAP[dataset.status] ?? { label: dataset.status, cls: 'badge-ghost' };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${
        isDark ? 'border-white/10 bg-[#000000]' : 'border-slate-200/80 bg-[#F2F2F7]'
      }`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className="btn btn-ghost btn-sm btn-circle shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-2xl text-white shadow-none border border-violet-500/30 shrink-0">
              📊
            </div>
            <div>
              <h2 className="text-xl font-bold">{dataset.displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`badge badge-sm font-bold text-[10px] ${statusInfo.cls}`}>{statusInfo.label}</div>
                <span className="text-xs text-slate-500">ID: {datasetId}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="btn btn-error btn-sm btn-outline gap-2"
          >
            <Trash2 size={16} />
            <span>删除</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-2 sm:py-3 grid grid-cols-1 lg:grid-cols-3 gap-6 content-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">显示名称</label>
                  <p className="font-medium">{dataset.displayName}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">数据集标识</label>
                  <p className="font-medium font-mono text-sm">{dataset.datasetName}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">来源类型</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${
                    isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600'
                  }`}>
                    {SOURCE_LABEL[dataset.sourceType] ?? dataset.sourceType}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">数据类型</label>
                  <p className="font-medium">{DATA_TYPE_LABEL[dataset.dataType] ?? dataset.dataType}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">格式</label>
                  <p className="font-medium font-mono text-sm">{dataset.format || '—'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">是否公开</label>
                  <p className="font-medium">{dataset.isPublic ? '是' : '否'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">描述</label>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {dataset.description || '暂无描述'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Details */}
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Database size={18} className="text-emerald-500" />
                数据详情
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-xl">
                      <BarChart3 size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">记录数</p>
                      <p className="text-xs text-slate-500">{formatCount(dataset.recordCount)} 条</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-xl">
                      <HardDrive size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">文件大小</p>
                      <p className="text-xs text-slate-500">{formatFileSize(dataset.fileSize)}</p>
                    </div>
                  </div>
                </div>

                {dataset.tags && dataset.tags.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag size={16} className="text-slate-500" />
                      <p className="text-sm font-bold">标签</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dataset.tags.map((tag, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                            isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {dataset.relatedAgentIds && dataset.relatedAgentIds.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-inherit">
                    <p className="text-sm font-bold mb-1">关联 Agent</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {dataset.relatedAgentIds.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className={`card border rounded-2xl shadow-none ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
            <div className="card-body p-6">
              <h3 className="card-title text-sm font-bold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                时间信息
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">创建时间</span>
                  <span className="font-mono">{dataset.createTime}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">最后更新</span>
                  <span className="font-mono">{dataset.updateTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="删除数据集"
        message={`确定要删除「${dataset.displayName}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
};
