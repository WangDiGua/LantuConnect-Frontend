// @deprecated - This file is no longer used in the current routing. Replaced by unified resource management.
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, FileText, Clock, Database, Tag, HardDrive, BarChart3 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Dataset } from '../../types/dto/dataset';
import { datasetService } from '../../api/services/dataset.service';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatDateTime } from '../../utils/formatDateTime';
import {
  canvasBodyBg, bentoCard, btnGhost, btnDanger,
  textPrimary, textSecondary, textMuted,
  statusBadgeClass, statusDot, statusLabel,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';

interface DatasetDetailProps { datasetId: string; theme: Theme; fontSize: FontSize; onBack?: () => void; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }
const SOURCE_LABEL: Record<string, string> = { department: '部门数据', knowledge: '知识�?, third_party: '第三�? };
const DATA_TYPE_LABEL: Record<string, string> = { document: '文档', structured: '结构�?, image: '图片', audio: '音频', video: '视频', mixed: '混合' };
function formatFileSize(bytes: number): string { if (bytes < 1024) return bytes + ' B'; if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'; if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'; return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'; }
function formatCount(n: number): string { if (n >= 10000) return (n / 10000).toFixed(1) + ' �?; return n.toLocaleString(); }

export const DatasetDetail: React.FC<DatasetDetailProps> = ({ datasetId, theme, onBack, showMessage }) => {
  const isDark = theme === 'dark';
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDataset = useCallback(async () => { setLoading(true); setError(null); try { const data = await datasetService.getById(Number(datasetId)); setDataset(data); } catch (e) { setError(e instanceof Error ? e : new Error('加载失败')); } finally { setLoading(false); } }, [datasetId]);
  useEffect(() => { fetchDataset(); }, [fetchDataset]);

  const handleDelete = async () => { setDeleting(true); try { await datasetService.remove(Number(datasetId)); showMessage?.('删除成功', 'success'); setDeleteOpen(false); onBack?.(); } catch { showMessage?.('删除失败', 'error'); } finally { setDeleting(false); } };

  if (loading) return <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}><PageSkeleton type="detail" /></div>;
  if (error || !dataset) return <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}><PageError error={error} onRetry={fetchDataset} /></div>;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className={btnGhost(theme)}><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>📊</div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary(theme)}`}>{dataset.displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={statusBadgeClass(dataset.status as DomainStatus, theme)}><span className={statusDot(dataset.status as DomainStatus)} />{statusLabel(dataset.status as DomainStatus)}</span>
                <span className={`text-xs ${textMuted(theme)}`}>ID: {datasetId}</span>
              </div>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setDeleteOpen(true)} className={btnDanger}><Trash2 size={16} /> <span className="hidden sm:inline">删除</span></button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-3 grid grid-cols-1 lg:grid-cols-3 gap-4 content-start">
        <div className="lg:col-span-2 space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><FileText size={18} className="text-blue-500" /> 基本信息</h3>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: '显示名称', value: dataset.displayName }, { label: '数据集标�?, value: dataset.datasetName, mono: true },
                { label: '来源类型', value: SOURCE_LABEL[dataset.sourceType] ?? dataset.sourceType, badge: true },
                { label: '数据类型', value: DATA_TYPE_LABEL[dataset.dataType] ?? dataset.dataType },
                { label: '格式', value: dataset.format || '�?, mono: true },
                { label: '是否公开', value: dataset.isPublic ? '�? : '�? },
              ].map((item) => (
                <div key={item.label}>
                  <label className={`text-xs block mb-1 ${textMuted(theme)}`}>{item.label}</label>
                  {item.badge ? (
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${isDark ? 'bg-neutral-900/10 text-neutral-300' : 'bg-neutral-100 text-neutral-900'}`}>{item.value}</span>
                  ) : (
                    <p className={`font-medium ${item.mono ? 'font-mono text-sm' : ''} ${textPrimary(theme)}`}>{item.value}</p>
                  )}
                </div>
              ))}
              <div className="col-span-2"><label className={`text-xs block mb-1 ${textMuted(theme)}`}>描述</label><p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{dataset.description || '暂无描述'}</p></div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><Database size={18} className="text-emerald-500" /> 数据详情</h3>
            <div className="space-y-3">
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><BarChart3 size={18} /></div>
                <div><p className={`text-sm font-bold ${textPrimary(theme)}`}>记录�?/p><p className={`text-xs ${textMuted(theme)}`}>{formatCount(dataset.recordCount)} �?/p></div>
              </div>
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><HardDrive size={18} /></div>
                <div><p className={`text-sm font-bold ${textPrimary(theme)}`}>文件大小</p><p className={`text-xs ${textMuted(theme)}`}>{formatFileSize(dataset.fileSize)}</p></div>
              </div>
              {dataset.tags && dataset.tags.length > 0 && (
                <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-2 mb-2"><Tag size={16} className={textMuted(theme)} /><p className={`text-sm font-bold ${textPrimary(theme)}`}>标签</p></div>
                  <div className="flex flex-wrap gap-2">
                    {dataset.tags.map((tag, i) => <span key={i} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{tag}</span>)}
                  </div>
                </div>
              )}
              {dataset.relatedAgentIds && dataset.relatedAgentIds.length > 0 && (
                <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <p className={`text-sm font-bold mb-1 ${textPrimary(theme)}`}>关联 Agent</p>
                  <p className={`text-xs font-mono ${textMuted(theme)}`}>{dataset.relatedAgentIds.join(', ')}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><Clock size={18} className="text-slate-500" /> 时间信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs"><span className={textMuted(theme)}>创建时间</span><span className={`font-mono ${textSecondary(theme)}`}>{formatDateTime(dataset.createTime)}</span></div>
              <div className="flex justify-between text-xs"><span className={textMuted(theme)}>最后更新</span><span className={`font-mono ${textSecondary(theme)}`}>{formatDateTime(dataset.updateTime)}</span></div>
            </div>
          </motion.div>
        </div>
      </div>

      <ConfirmDialog open={deleteOpen} title="删除数据�? message={`确定要删除�?{dataset.displayName}」吗？此操作不可撤销。`} confirmText="删除" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
    </div>
  );
};
