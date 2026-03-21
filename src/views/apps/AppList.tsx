import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Monitor,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { SmartApp, AppStatus, EmbedType } from '../../types/dto/smart-app';
import { smartAppService } from '../../api/services/smart-app.service';
import { TOOLBAR_ROW } from '../../utils/toolbarFieldClasses';
import { SearchInput, FilterSelect } from '../../components/common';
import { ContentLoader } from '../../components/common/ContentLoader';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AppCreate } from './AppCreate';
import { AppDetail } from './AppDetail';
import { btnPrimary, btnGhost, btnSecondary, tableHeadCell, tableBodyRow, tableCell, statusBadgeClass, statusLabel, pageBg, cardClass } from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const STATUS_LABEL_APP: Record<AppStatus, string> = {
  draft: '草稿',
  published: '已发布',
  testing: '测试中',
  deprecated: '已下架',
};

const EMBED_LABEL: Record<EmbedType, string> = {
  iframe: 'iFrame',
  micro_frontend: '微前端',
  redirect: '外链跳转',
};

const SOURCE_LABEL: Record<string, string> = {
  internal: '自研',
  partner: '合作伙伴',
};

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

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedKw(keyword); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await smartAppService.list({
        page,
        pageSize: PAGE_SIZE,
        keyword: debouncedKw || undefined,
        status: (statusFilter || undefined) as AppStatus | undefined,
        embedType: (embedFilter || undefined) as EmbedType | undefined,
      });
      setApps(res.list);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKw, statusFilter, embedFilter]);

  useEffect(() => { if (viewMode === 'list') fetchData(); }, [fetchData, viewMode]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await smartAppService.remove(deleteTarget.id);
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
    setSelectedAppId(null);
    setEditingApp(null);
  };

  const resetFilters = () => {
    setKeyword('');
    setDebouncedKw('');
    setStatusFilter('');
    setEmbedFilter('');
    setPage(1);
  };

  if (viewMode === 'create') {
    return (
      <AppCreate
        theme={theme}
        fontSize={fontSize}
        showMessage={showMessage}
        onBack={handleBackToList}
        onSuccess={() => handleBackToList()}
      />
    );
  }

  if (viewMode === 'edit' && editingApp) {
    return (
      <AppCreate
        theme={theme}
        fontSize={fontSize}
        showMessage={showMessage}
        onBack={handleBackToList}
        onSuccess={() => handleBackToList()}
        editApp={editingApp}
      />
    );
  }

  if (viewMode === 'detail' && selectedAppId) {
    return (
      <AppDetail
        appId={selectedAppId}
        theme={theme}
        fontSize={fontSize}
        showMessage={showMessage}
        onBack={handleBackToList}
      />
    );
  }

  if (error) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <PageError error={error} onRetry={fetchData} />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${cardClass(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Monitor className="text-emerald-600" size={20} />
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>智能应用管理</h2>
              {total > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {total}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fetchData()} className={`${btnGhost(theme)} gap-1.5`}>
                <RefreshCw size={16} />
                刷新
              </button>
              <button type="button" onClick={() => setViewMode('create')} className={`${btnPrimary} gap-1.5 shadow-lg shadow-blue-500/20`}>
                <Plus size={16} />
                注册应用
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
                value={embedFilter}
                onChange={(v) => { setEmbedFilter(v); setPage(1); }}
                options={[
                  { value: '', label: '全部嵌入方式' },
                  { value: 'iframe', label: 'iFrame' },
                  { value: 'micro_frontend', label: '微前端' },
                  { value: 'redirect', label: '外链跳转' },
                ]}
                placeholder=""
                theme={theme}
                className="w-full sm:w-36"
              />
              <div className="flex-1 min-w-[min(100%,200px)]">
                <SearchInput value={keyword} onChange={setKeyword} placeholder="搜索应用名称…" theme={theme} />
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className={btnSecondary(theme)}
              >
                重置
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <ContentLoader loading={loading} theme={theme}>
              {apps.length === 0 ? (
                <EmptyState
                  title="暂无应用"
                  description="注册第一个智能应用开始使用"
                  action={
                    <button type="button" onClick={() => setViewMode('create')} className="btn btn-primary btn-sm gap-1.5">
                      <Plus size={16} />
                      注册应用
                    </button>
                  }
                />
              ) : (
                <table className="table w-full text-sm min-w-[900px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className={tableHeadCell(theme)} style={{ minWidth: 180 }}>名称</th>
                      <th className={tableHeadCell(theme)}>应用地址</th>
                      <th className={tableHeadCell(theme)}>嵌入方式</th>
                      <th className={tableHeadCell(theme)}>来源</th>
                      <th className={tableHeadCell(theme)}>状态</th>
                      <th className={`${tableHeadCell(theme)} text-right`} style={{ minWidth: 100 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((app, idx) => (
                        <tr
                          key={app.id}
                          className={tableBodyRow(theme, idx)}
                        >
                          <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                {app.icon || '📱'}
                              </div>
                              <div className="min-w-0">
                                <div className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{app.displayName}</div>
                                <div className="text-xs text-slate-500 truncate">{app.appName}</div>
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={app.appUrl}>
                            {truncateUrl(app.appUrl)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              {EMBED_LABEL[app.embedType]}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {SOURCE_LABEL[app.sourceType as string] ?? app.sourceType}
                          </td>
                          <td className={tableCell()}>
                            <span className={statusBadgeClass(app.status as DomainStatus, theme)}>
                              {STATUS_LABEL_APP[app.status] ?? statusLabel(app.status as DomainStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => { setSelectedAppId(String(app.id)); setViewMode('detail'); }}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
                                title="详情"
                              >
                                <ExternalLink size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const full = await smartAppService.getById(app.id);
                                    setEditingApp(full);
                                  } catch {
                                    setEditingApp(app);
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
                                onClick={() => setDeleteTarget({ id: app.id, name: app.displayName })}
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
                                title="删除"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                    ))}
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
        title="删除应用"
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
