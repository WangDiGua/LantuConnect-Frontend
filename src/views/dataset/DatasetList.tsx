// @deprecated - This file is no longer used in the current routing. Replaced by unified resource management.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, RefreshCw, ExternalLink, Trash2, Edit2,
  ChevronLeft, ChevronRight, Database, MoreHorizontal,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Dataset, DatasetStatus, DatasetSourceType, DatasetDataType } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { SearchInput, FilterSelect } from '../../components/common';
import { ContentLoader } from '../../components/common/ContentLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { AnimatedList } from '../../components/common/AnimatedList';
import { PortalDropdown } from '../../components/common/PortalDropdown';
import { DatasetCreate } from './DatasetCreate';
import { DatasetDetail } from './DatasetDetail';
import {
  canvasBodyBg,
  mainScrollCompositorClass, bentoCard, bentoCardHover, btnPrimary, btnGhost, btnSecondary,
  statusBadgeClass, statusDot, statusLabel,
  textPrimary, textSecondary, textMuted, techBadge,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';

interface Props { theme: Theme; fontSize: FontSize; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }

const STATUS_LABEL_DS: Record<DatasetStatus, string> = { draft: '草稿', published: '已发�?, testing: '测试�?, deprecated: '已下�? };
const SOURCE_LABEL: Record<DatasetSourceType, string> = { department: '部门数据', knowledge: '知识�?, third_party: '第三�? };
const DATA_TYPE_LABEL: Record<DatasetDataType, string> = { document: '文档', structured: '结构�?, image: '图片', audio: '音频', video: '视频', mixed: '混合' };
const PAGE_SIZE = 20;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
function formatCount(n: number): string { if (n >= 10000) return (n / 10000).toFixed(1) + '�?; return n.toLocaleString(); }

export const DatasetList: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuTriggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  useEffect(() => { const t = setTimeout(() => { setDebouncedKw(keyword); setPage(1); }, 300); return () => clearTimeout(t); }, [keyword]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await datasetService.list({ page, pageSize: PAGE_SIZE, keyword: debouncedKw || undefined, status: (statusFilter || undefined) as DatasetStatus | undefined, sourceType: (sourceFilter || undefined) as DatasetSourceType | undefined, dataType: (dataTypeFilter || undefined) as DatasetDataType | undefined });
      setDatasets(res.list); setTotal(res.total);
    } catch (e) { setError(e instanceof Error ? e : new Error('加载失败')); }
    finally { setLoading(false); }
  }, [page, debouncedKw, statusFilter, sourceFilter, dataTypeFilter]);

  useEffect(() => { if (viewMode === 'list') fetchData(); }, [fetchData, viewMode]);

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await datasetService.remove(deleteTarget.id); showMessage?.('删除成功', 'success'); setDeleteTarget(null); fetchData(); }
    catch { showMessage?.('删除失败', 'error'); } finally { setDeleting(false); }
  };

  const handleBackToList = () => { setViewMode('list'); setSelectedDatasetId(null); setEditingDataset(null); };
  const closeDetail = () => { setSelectedDatasetId(null); fetchData(); };
  const resetFilters = () => { setKeyword(''); setDebouncedKw(''); setStatusFilter(''); setSourceFilter(''); setDataTypeFilter(''); setPage(1); };

  if (viewMode === 'create') return <DatasetCreate theme={theme} fontSize={fontSize} showMessage={showMessage} onBack={handleBackToList} onSuccess={() => handleBackToList()} />;
  if (viewMode === 'edit' && editingDataset) return <DatasetCreate theme={theme} fontSize={fontSize} showMessage={showMessage} onBack={handleBackToList} onSuccess={() => handleBackToList()} editDataset={editingDataset} />;
  if (error) return <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}><PageError error={error} onRetry={fetchData} /></div>;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex flex-col px-3 sm:px-4 lg:px-5 py-4 gap-4">
        <div className={`${bentoCard(theme)} overflow-hidden shrink-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}><Database size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} /></div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>数据集管�?/h2>
                {total > 0 && <span className={`text-xs ${textMuted(theme)}`}>�?{total} �?/span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fetchData()} className={btnGhost(theme)}><RefreshCw size={15} /><span className="hidden sm:inline">刷新</span></button>
              <button type="button" onClick={() => setViewMode('create')} className={btnPrimary}><Plus size={15} /> 注册数据�?/button>
            </div>
          </div>

          {/* Filters */}
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={[{ value: '', label: '全部状�? }, { value: 'draft', label: '草稿' }, { value: 'published', label: '已发�? }, { value: 'testing', label: '测试�? }, { value: 'deprecated', label: '已下�? }]} placeholder="" theme={theme} className="w-full sm:w-36" />
              <FilterSelect value={sourceFilter} onChange={(v) => { setSourceFilter(v); setPage(1); }} options={[{ value: '', label: '全部来源' }, { value: 'department', label: '部门数据' }, { value: 'knowledge', label: '知识�? }, { value: 'third_party', label: '第三�? }]} placeholder="" theme={theme} className="w-full sm:w-36" />
              <FilterSelect value={dataTypeFilter} onChange={(v) => { setDataTypeFilter(v); setPage(1); }} options={[{ value: '', label: '全部类型' }, { value: 'document', label: '文档' }, { value: 'structured', label: '结构�? }, { value: 'image', label: '图片' }, { value: 'audio', label: '音频' }, { value: 'video', label: '视频' }, { value: 'mixed', label: '混合' }]} placeholder="" theme={theme} className="w-full sm:w-36" />
              <div className="flex-1 min-w-[min(100%,200px)]"><SearchInput value={keyword} onChange={setKeyword} placeholder="搜索数据集�? theme={theme} /></div>
              <button type="button" onClick={resetFilters} className={btnSecondary(theme)}>重置</button>
            </div>
          </div>
        </div>

        <div className={`${bentoCard(theme)} overflow-hidden flex flex-col`}>
          {/* Card rows */}
          <div>
            <ContentLoader loading={loading} theme={theme}>
              {datasets.length === 0 ? (
                <EmptyState title="暂无数据�? description="注册第一个数据集开始使�? action={<button type="button" onClick={() => setViewMode('create')} className={btnPrimary}><Plus size={16} /> 注册数据�?/button>} />
              ) : (
                <AnimatedList className="p-3 space-y-2">
                  {datasets.map((ds) => (
                    <motion.div key={ds.id} className={`${bentoCardHover(theme)} p-4 flex items-center gap-4 ${isDark ? 'hover:bg-neutral-900/[0.03]' : 'hover:bg-neutral-100/40'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>📊</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold truncate ${textPrimary(theme)}`}>{ds.displayName}</span>
                          <span className={techBadge(theme)}>{DATA_TYPE_LABEL[ds.dataType] ?? ds.dataType}</span>
                          <span className={statusBadgeClass(ds.status as DomainStatus, theme)}>
                            <span className={statusDot(ds.status as DomainStatus)} />
                            {STATUS_LABEL_DS[ds.status] ?? statusLabel(ds.status as DomainStatus)}
                          </span>
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${textMuted(theme)}`}>
                          {ds.datasetName} · {SOURCE_LABEL[ds.sourceType]} · {ds.format}
                        </div>
                      </div>
                      <div className="hidden lg:flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>记录�?/div>
                          <div className={`text-sm font-mono tabular-nums font-medium ${textSecondary(theme)}`}>{formatCount(ds.recordCount)}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>大小</div>
                          <div className={`text-sm font-mono tabular-nums ${textMuted(theme)}`}>{formatFileSize(ds.fileSize)}</div>
                        </div>
                      </div>
                      {/* Desktop actions */}
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setSelectedDatasetId(String(ds.id))} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-neutral-300 hover:bg-neutral-900/10' : 'text-neutral-900 hover:bg-neutral-100'}`} title="详情"><ExternalLink size={15} /></button>
                        <button type="button" onClick={async () => { try { const full = await datasetService.getById(ds.id); setEditingDataset(full); } catch { setEditingDataset(ds); } setViewMode('edit'); }} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`} title="编辑"><Edit2 size={15} /></button>
                        <button type="button" onClick={() => setDeleteTarget({ id: ds.id, name: ds.displayName })} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`} title="删除"><Trash2 size={15} /></button>
                      </div>
                      {/* Mobile menu */}
                      <div className="sm:hidden shrink-0">
                        <button type="button" ref={(el) => { if (el) menuTriggerRefs.current.set(ds.id, el); }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === ds.id ? null : ds.id); }} className={btnGhost(theme)}><MoreHorizontal size={16} /></button>
                        <PortalDropdown open={openMenuId === ds.id} onClose={() => setOpenMenuId(null)} anchorEl={menuTriggerRefs.current.get(ds.id) ?? null} className={`w-32 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200'}`}>
                          <button type="button" onClick={() => { setSelectedDatasetId(String(ds.id)); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}><ExternalLink size={14} /> 详情</button>
                          <button type="button" onClick={() => { setDeleteTarget({ id: ds.id, name: ds.displayName }); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}><Trash2 size={14} /> 删除</button>
                        </PortalDropdown>
                      </div>
                    </motion.div>
                  ))}
                </AnimatedList>
              )}
            </ContentLoader>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={`text-sm ${textMuted(theme)}`}>�?{total} 条，�?{page}/{totalPages} �?/span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={`p-2 rounded-xl transition-colors ${page === 1 ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronLeft size={16} /></button>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`p-2 rounded-xl transition-colors ${page === totalPages ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog open={!!deleteTarget} title="删除数据�? message={`确定要删除�?{deleteTarget?.name ?? ''}」吗？此操作不可撤销。`} confirmText="删除" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />

      <Modal
        open={!!selectedDatasetId}
        onClose={closeDetail}
        theme={theme}
        size="xl"
        contentClassName="flex-1 min-h-0 overflow-hidden flex flex-col p-0"
      >
        {selectedDatasetId && (
          <DatasetDetail
            datasetId={selectedDatasetId}
            theme={theme}
            fontSize={fontSize}
            showMessage={showMessage}
            onBack={closeDetail}
          />
        )}
      </Modal>
    </div>
  );
};
