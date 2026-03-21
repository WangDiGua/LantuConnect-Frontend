import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Dataset, DatasetStatus, DatasetSourceType, DatasetDataType } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { TOOLBAR_ROW } from '../../utils/toolbarFieldClasses';
import { SearchInput, FilterSelect } from '../../components/common';
import { ContentLoader } from '../../components/common/ContentLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DatasetCreate } from './DatasetCreate';
import { DatasetDetail } from './DatasetDetail';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const STATUS_CFG: Record<DatasetStatus, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'text-slate-500', bg: 'bg-slate-500/10' },
  published: { label: '已发布', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  testing: { label: '测试中', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  deprecated: { label: '已下架', color: 'text-orange-500', bg: 'bg-orange-500/10' },
};

const SOURCE_LABEL: Record<DatasetSourceType, string> = {
  department: '部门数据',
  knowledge: '知识库',
  third_party: '第三方',
};

const DATA_TYPE_LABEL: Record<DatasetDataType, string> = {
  document: '文档',
  structured: '结构化',
  image: '图片',
  audio: '音频',
  video: '视频',
  mixed: '混合',
};

const PAGE_SIZE = 20;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

export const DatasetList: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';

  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create' | 'edit'>('list');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dataTypeFilter, setDataTypeFilter] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedKw(keyword); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await datasetService.list({
        page,
        pageSize: PAGE_SIZE,
        keyword: debouncedKw || undefined,
        status: (statusFilter || undefined) as DatasetStatus | undefined,
        sourceType: (sourceFilter || undefined) as DatasetSourceType | undefined,
        dataType: (dataTypeFilter || undefined) as DatasetDataType | undefined,
      });
      setDatasets(res.list);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKw, statusFilter, sourceFilter, dataTypeFilter]);

  useEffect(() => { if (viewMode === 'list') fetchData(); }, [fetchData, viewMode]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await datasetService.remove(deleteTarget.id);
      showMessage?.('删除成功', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch {
      showMessage?.('删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDatasetId(null);
    setEditingDataset(null);
  };

  const resetFilters = () => {
    setKeyword('');
    setDebouncedKw('');
    setStatusFilter('');
    setSourceFilter('');
    setDataTypeFilter('');
    setPage(1);
  };

  if (viewMode === 'create') {
    return (
      <DatasetCreate
        theme={theme}
        fontSize={fontSize}
        showMessage={showMessage}
        onBack={handleBackToList}
        onSuccess={() => handleBackToList()}
      />
    );
  }

  if (viewMode === 'edit' && editingDataset) {
    return (
      <DatasetCreate
        theme={theme}
        fontSize={fontSize}
        showMessage={showMessage}
        onBack={handleBackToList}
        onSuccess={() => handleBackToList()}
        editDataset={editingDataset}
      />
    );
  }

  if (viewMode === 'detail' && selectedDatasetId) {
    return (
      <DatasetDetail
        datasetId={selectedDatasetId}
        theme={theme}
        fontSize={fontSize}
        showMessage={showMessage}
        onBack={handleBackToList}
      />
    );
  }

  if (error) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <PageError error={error} onRetry={fetchData} />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const thCls = `px-4 py-3 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`rounded-2xl border overflow-hidden flex-1 min-h-0 flex flex-col ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Database className="text-violet-600" size={20} />
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>数据集管理</h2>
              {total > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {total}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fetchData()} className={`btn btn-ghost btn-sm gap-1.5 ${isDark ? 'text-slate-300' : ''}`}>
                <RefreshCw size={16} />
                刷新
              </button>
              <button type="button" onClick={() => setViewMode('create')} className="btn btn-primary btn-sm gap-1.5 font-bold shadow-lg shadow-blue-500/20">
                <Plus size={16} />
                注册数据集
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className={`p-4 border-b shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200 bg-slate-50/50'}`}>
            <div className={TOOLBAR_ROW}>
              <FilterSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                options={[
                  { value: '', label: '全部状态' },
                  { value: 'draft', label: '草稿' },
                  { value: 'published', label: '已发布' },
                  { value: 'testing', label: '测试中' },
                  { value: 'deprecated', label: '已下架' },
                ]}
                placeholder=""
                theme={theme}
                className="w-full sm:w-36"
              />
              <FilterSelect
                value={sourceFilter}
                onChange={(v) => { setSourceFilter(v); setPage(1); }}
                options={[
                  { value: '', label: '全部来源' },
                  { value: 'department', label: '部门数据' },
                  { value: 'knowledge', label: '知识库' },
                  { value: 'third_party', label: '第三方' },
                ]}
                placeholder=""
                theme={theme}
                className="w-full sm:w-36"
              />
              <FilterSelect
                value={dataTypeFilter}
                onChange={(v) => { setDataTypeFilter(v); setPage(1); }}
                options={[
                  { value: '', label: '全部类型' },
                  { value: 'document', label: '文档' },
                  { value: 'structured', label: '结构化' },
                  { value: 'image', label: '图片' },
                  { value: 'audio', label: '音频' },
                  { value: 'video', label: '视频' },
                  { value: 'mixed', label: '混合' },
                ]}
                placeholder=""
                theme={theme}
                className="w-full sm:w-36"
              />
              <div className="flex-1 min-w-[min(100%,200px)]">
                <SearchInput value={keyword} onChange={setKeyword} placeholder="搜索数据集…" theme={theme} />
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className={`inline-flex items-center justify-center px-4 rounded-xl text-sm font-medium min-h-[2.5rem] border ${
                  isDark ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                重置
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <ContentLoader loading={loading} theme={theme}>
              {datasets.length === 0 ? (
                <EmptyState
                  title="暂无数据集"
                  description="注册第一个数据集开始使用"
                  action={
                    <button type="button" onClick={() => setViewMode('create')} className="btn btn-primary btn-sm gap-1.5">
                      <Plus size={16} />
                      注册数据集
                    </button>
                  }
                />
              ) : (
                <table className="table w-full text-sm min-w-[1080px]">
                  <thead className="sticky top-0 z-10">
                    <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]' : 'border-slate-200 bg-slate-50'}`}>
                      <th className={`${thCls} text-left`} style={{ minWidth: 160 }}>名称</th>
                      <th className={`${thCls} text-left`}>来源</th>
                      <th className={`${thCls} text-left`}>类型</th>
                      <th className={`${thCls} text-left`}>格式</th>
                      <th className={`${thCls} text-right`}>记录数</th>
                      <th className={`${thCls} text-right`}>大小</th>
                      <th className={`${thCls} text-left`}>状态</th>
                      <th className={`${thCls} text-right`} style={{ minWidth: 100 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((ds, idx) => {
                      const sc = STATUS_CFG[ds.status] ?? STATUS_CFG.draft;
                      return (
                        <tr
                          key={ds.id}
                          className={`border-b transition-colors ${
                            isDark
                              ? `border-white/5 ${idx % 2 ? 'bg-white/[0.02]' : ''} hover:bg-white/5`
                              : `border-slate-100 ${idx % 2 ? 'bg-slate-50/50' : ''} hover:bg-slate-50`
                          }`}
                        >
                          <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                📊
                              </div>
                              <div className="min-w-0">
                                <div className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{ds.displayName}</div>
                                <div className="text-xs text-slate-500 truncate">{ds.datasetName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              {SOURCE_LABEL[ds.sourceType]}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {DATA_TYPE_LABEL[ds.dataType] ?? ds.dataType}
                          </td>
                          <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {ds.format}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono text-xs tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {formatCount(ds.recordCount)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono text-xs tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatFileSize(ds.fileSize)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${sc.bg} ${sc.color}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => { setSelectedDatasetId(String(ds.id)); setViewMode('detail'); }}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
                                title="详情"
                              >
                                <ExternalLink size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const full = await datasetService.getById(ds.id);
                                    setEditingDataset(full);
                                  } catch {
                                    setEditingDataset(ds);
                                  }
                                  setViewMode('edit');
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`}
                                title="编辑"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ id: ds.id, name: ds.displayName })}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                                title="删除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </ContentLoader>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                共 {total} 条，第 {page}/{totalPages} 页
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`p-2 rounded-xl transition-colors ${
                    page === 1
                      ? isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`p-2 rounded-xl transition-colors ${
                    page === totalPages
                      ? isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                      : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除数据集"
        message={`确定要删除「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
