// @deprecated - This file is no longer used in the current routing. Replaced by unified resource management.
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Trash2, Globe, FileText, Clock, Monitor, Eye } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { SmartApp } from '../../types/dto/smart-app';
import { smartAppService } from '../../api/services/smart-app.service';
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

interface AppDetailProps { appId: string; theme: Theme; fontSize: FontSize; onBack?: () => void; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }
const EMBED_LABEL: Record<string, string> = { iframe: 'iFrame 嵌入', micro_frontend: '微前�?, redirect: '外链跳转' };
const SOURCE_LABEL: Record<string, string> = { internal: '自研', partner: '合作伙伴', cloud: '云端' };

export const AppDetail: React.FC<AppDetailProps> = ({ appId, theme, onBack, showMessage }) => {
  const isDark = theme === 'dark';
  const [app, setApp] = useState<SmartApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchApp = useCallback(async () => { setLoading(true); setError(null); try { const data = await smartAppService.getById(Number(appId)); setApp(data); } catch (e) { setError(e instanceof Error ? e : new Error('加载失败')); } finally { setLoading(false); } }, [appId]);
  useEffect(() => { fetchApp(); }, [fetchApp]);

  const handleDelete = async () => { setDeleting(true); try { await smartAppService.remove(Number(appId)); showMessage?.('删除成功', 'success'); setDeleteOpen(false); onBack?.(); } catch { showMessage?.('删除失败', 'error'); } finally { setDeleting(false); } };

  if (loading) return <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}><PageSkeleton type="detail" /></div>;
  if (error || !app) return <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}><PageError error={error} onRetry={fetchApp} /></div>;

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
        <div className="flex items-center gap-4 min-w-0">
          <button type="button" onClick={onBack} className={btnGhost(theme)}><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>{app.icon || '📱'}</div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary(theme)}`}>{app.displayName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={statusBadgeClass(app.status as DomainStatus, theme)}><span className={statusDot(app.status as DomainStatus)} />{statusLabel(app.status as DomainStatus)}</span>
                <span className={`text-xs ${textMuted(theme)}`}>ID: {appId}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => window.open(app.appUrl, '_blank')} className={btnGhost(theme)}><Eye size={16} /> <span className="hidden sm:inline">预览应用</span></button>
          <button type="button" onClick={() => setDeleteOpen(true)} className={btnDanger}><Trash2 size={16} /> <span className="hidden sm:inline">删除</span></button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 sm:px-3 lg:px-4 py-3 grid grid-cols-1 lg:grid-cols-3 gap-4 content-start">
        <div className="lg:col-span-2 space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><FileText size={18} className="text-blue-500" /> 基本信息</h3>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: '显示名称', value: app.displayName }, { label: '应用标识', value: app.appName, mono: true },
                { label: '嵌入方式', value: EMBED_LABEL[app.embedType] ?? app.embedType, badge: true },
                { label: '来源', value: SOURCE_LABEL[app.sourceType as string] ?? app.sourceType },
                { label: '状�?, value: statusLabel(app.status as DomainStatus) },
                { label: '是否公开', value: app.isPublic ? '�? : '�? },
              ].map((item) => (
                <div key={item.label}>
                  <label className={`text-xs block mb-1 ${textMuted(theme)}`}>{item.label}</label>
                  {item.badge ? (
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{item.value}</span>
                  ) : (
                    <p className={`font-medium ${item.mono ? 'font-mono text-sm' : ''} ${textPrimary(theme)}`}>{item.value}</p>
                  )}
                </div>
              ))}
              <div className="col-span-2"><label className={`text-xs block mb-1 ${textMuted(theme)}`}>描述</label><p className={`text-sm leading-relaxed ${textSecondary(theme)}`}>{app.description || '暂无描述'}</p></div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><Globe size={18} className="text-emerald-500" /> 应用配置</h3>
            <div className="space-y-4">
              <div className={`flex items-start gap-3 p-3 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50'} border ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <div className={`p-2 rounded-xl shrink-0 ${isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Monitor size={18} /></div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold ${textPrimary(theme)}`}>应用地址</p>
                  <a href={app.appUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline break-all">{app.appUrl} <ExternalLink size={12} className="inline ml-1" /></a>
                </div>
              </div>
              {app.screenshots && app.screenshots.length > 0 && (
                <div><p className={`text-sm font-bold mb-2 ${textPrimary(theme)}`}>应用截图</p>
                  <div className="grid grid-cols-2 gap-3">{app.screenshots.map((url, i) => <img key={i} src={url} alt={`截图${i + 1}`} className={`rounded-xl border w-full object-cover ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`} />)}</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }} className={`${bentoCard(theme)} p-6`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${textPrimary(theme)}`}><Clock size={18} className="text-slate-500" /> 时间信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs"><span className={textMuted(theme)}>创建时间</span><span className={`font-mono ${textSecondary(theme)}`}>{formatDateTime(app.createTime)}</span></div>
              <div className="flex justify-between text-xs"><span className={textMuted(theme)}>最后更新</span><span className={`font-mono ${textSecondary(theme)}`}>{formatDateTime(app.updateTime)}</span></div>
            </div>
          </motion.div>
        </div>
      </div>

      <ConfirmDialog open={deleteOpen} title="删除应用" message={`确定要删除�?{app.displayName}」吗？此操作不可撤销。`} confirmText="删除" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteOpen(false)} />
    </div>
  );
};
