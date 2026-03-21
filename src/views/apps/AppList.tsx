import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, RefreshCw, ExternalLink, Trash2, Edit2,
  ChevronLeft, ChevronRight, Monitor, MoreHorizontal,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { SmartApp, AppStatus, EmbedType } from '../../types/dto/smart-app';
import { smartAppService } from '../../api/services/smart-app.service';
import { SearchInput, FilterSelect } from '../../components/common';
import { ContentLoader } from '../../components/common/ContentLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AnimatedList } from '../../components/common/AnimatedList';
import { AppCreate } from './AppCreate';
import { AppDetail } from './AppDetail';
import {
  pageBg, bentoCard, bentoCardHover, btnPrimary, btnGhost, btnSecondary,
  statusBadgeClass, statusDot, statusLabel,
  textPrimary, textMuted, techBadge,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const STATUS_LABEL_APP: Record<AppStatus, string> = { draft: '草稿', published: '已发布', testing: '测试中', deprecated: '已下架' };
const EMBED_LABEL: Record<EmbedType, string> = { iframe: 'iFrame', micro_frontend: '微前端', redirect: '外链跳转' };
const SOURCE_LABEL: Record<string, string> = { internal: '自研', partner: '合作伙伴' };
const PAGE_SIZE = 20;

function truncateUrl(url: string, max = 35): string {
  return url.length > max ? url.slice(0, max) + '…' : url;
}

export const AppList: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create' | 'edit'>('list');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<SmartApp | null>(null);
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [embedFilter, setEmbedFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => { const t = setTimeout(() => { setDebouncedKw(keyword); setPage(1); }, 300); return () => clearTimeout(t); }, [keyword]);
  useEffect(() => { if (openMenuId === null) return; const h = () => setOpenMenuId(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, [openMenuId]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await smartAppService.list({ page, pageSize: PAGE_SIZE, keyword: debouncedKw || undefined, status: (statusFilter || undefined) as AppStatus | undefined, embedType: (embedFilter || undefined) as EmbedType | undefined });
      setApps(res.list); setTotal(res.total);
    } catch (e) { setError(e instanceof Error ? e : new Error('加载失败')); }
    finally { setLoading(false); }
  }, [page, debouncedKw, statusFilter, embedFilter]);

  useEffect(() => { if (viewMode === 'list') fetchData(); }, [fetchData, viewMode]);

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await smartAppService.remove(deleteTarget.id); showMessage?.('删除成功', 'success'); setDeleteTarget(null); fetchData(); }
    catch { showMessage?.('删除失败', 'error'); }
    finally { setDeleting(false); }
  };

  const handleBackToList = () => { setViewMode('list'); setSelectedAppId(null); setEditingApp(null); };
  const resetFilters = () => { setKeyword(''); setDebouncedKw(''); setStatusFilter(''); setEmbedFilter(''); setPage(1); };

  if (viewMode === 'create') return <AppCreate theme={theme} fontSize={fontSize} showMessage={showMessage} onBack={handleBackToList} onSuccess={() => handleBackToList()} />;
  if (viewMode === 'edit' && editingApp) return <AppCreate theme={theme} fontSize={fontSize} showMessage={showMessage} onBack={handleBackToList} onSuccess={() => handleBackToList()} editApp={editingApp} />;
  if (viewMode === 'detail' && selectedAppId) return <AppDetail appId={selectedAppId} theme={theme} fontSize={fontSize} showMessage={showMessage} onBack={handleBackToList} />;
  if (error) return <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}><PageError error={error} onRetry={fetchData} /></div>;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${bentoCard(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                <Monitor size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>智能应用管理</h2>
                {total > 0 && <span className={`text-xs ${textMuted(theme)}`}>共 {total} 个</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fetchData()} className={btnGhost(theme)}><RefreshCw size={15} /><span className="hidden sm:inline">刷新</span></button>
              <button type="button" onClick={() => setViewMode('create')} className={btnPrimary}><Plus size={15} /> 注册应用</button>
            </div>
          </div>

          {/* Filters */}
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={[{ value: '', label: '全部状态' }, { value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }, { value: 'testing', label: '测试中' }, { value: 'deprecated', label: '已下架' }]} placeholder="" theme={theme} className="w-full sm:w-36" />
              <FilterSelect value={embedFilter} onChange={(v) => { setEmbedFilter(v); setPage(1); }} options={[{ value: '', label: '全部嵌入方式' }, { value: 'iframe', label: 'iFrame' }, { value: 'micro_frontend', label: '微前端' }, { value: 'redirect', label: '外链跳转' }]} placeholder="" theme={theme} className="w-full sm:w-36" />
              <div className="flex-1 min-w-[min(100%,200px)]"><SearchInput value={keyword} onChange={setKeyword} placeholder="搜索应用名称…" theme={theme} /></div>
              <button type="button" onClick={resetFilters} className={btnSecondary(theme)}>重置</button>
            </div>
          </div>

          {/* Card rows */}
          <div className="flex-1 min-h-0 overflow-auto">
            <ContentLoader loading={loading} theme={theme}>
              {apps.length === 0 ? (
                <EmptyState title="暂无应用" description="注册第一个智能应用开始使用" action={<button type="button" onClick={() => setViewMode('create')} className={btnPrimary}><Plus size={16} /> 注册应用</button>} />
              ) : (
                <AnimatedList className="p-3 space-y-2">
                  {apps.map((app) => (
                    <motion.div key={app.id} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className={`${bentoCardHover(theme)} p-4 flex items-center gap-4 ${isDark ? 'hover:bg-indigo-500/[0.03]' : 'hover:bg-indigo-50/40'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>{app.icon || '📱'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold truncate ${textPrimary(theme)}`}>{app.displayName}</span>
                          <span className={techBadge(theme)}>{EMBED_LABEL[app.embedType]}</span>
                          <span className={statusBadgeClass(app.status as DomainStatus, theme)}>
                            <span className={statusDot(app.status as DomainStatus)} />
                            {STATUS_LABEL_APP[app.status] ?? statusLabel(app.status as DomainStatus)}
                          </span>
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${textMuted(theme)}`}>
                          {app.appName} · {SOURCE_LABEL[app.sourceType as string] ?? app.sourceType}
                        </div>
                      </div>
                      <div className={`hidden lg:block text-xs font-mono truncate max-w-[220px] ${textMuted(theme)}`} title={app.appUrl}>{truncateUrl(app.appUrl)}</div>

                      {/* Desktop actions */}
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => { setSelectedAppId(String(app.id)); setViewMode('detail'); }} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50'}`} title="详情"><ExternalLink size={15} /></button>
                        <button type="button" onClick={async () => { try { const full = await smartAppService.getById(app.id); setEditingApp(full); } catch { setEditingApp(app); } setViewMode('edit'); }} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`} title="编辑"><Edit2 size={15} /></button>
                        <button type="button" onClick={() => setDeleteTarget({ id: app.id, name: app.displayName })} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`} title="删除"><Trash2 size={15} /></button>
                      </div>
                      {/* Mobile menu */}
                      <div className="relative sm:hidden shrink-0">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === app.id ? null : app.id); }} className={btnGhost(theme)}><MoreHorizontal size={16} /></button>
                        {openMenuId === app.id && (
                          <div className={`absolute right-0 top-full mt-1 z-30 w-32 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200'}`}>
                            <button type="button" onClick={() => { setSelectedAppId(String(app.id)); setViewMode('detail'); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}><ExternalLink size={14} /> 详情</button>
                            <button type="button" onClick={async () => { try { const full = await smartAppService.getById(app.id); setEditingApp(full); } catch { setEditingApp(app); } setViewMode('edit'); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}><Edit2 size={14} /> 编辑</button>
                            <button type="button" onClick={() => { setDeleteTarget({ id: app.id, name: app.displayName }); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}><Trash2 size={14} /> 删除</button>
                          </div>
                        )}
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
              <span className={`text-sm ${textMuted(theme)}`}>共 {total} 条，第 {page}/{totalPages} 页</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={`p-2 rounded-xl transition-colors ${page === 1 ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronLeft size={16} /></button>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`p-2 rounded-xl transition-colors ${page === totalPages ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog open={!!deleteTarget} title="删除应用" message={`确定要删除「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`} confirmText="删除" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};
