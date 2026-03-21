import React, { useState, useEffect, useCallback } from 'react';
import type { Theme, FontSize } from '../../types';
import type { Provider, ProviderType, ProviderStatus } from '../../types/dto/provider';
import { providerService } from '../../api/services/provider.service';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnGhost, tableHeadCell, tableBodyRow, statusBadgeClass, statusLabel, pageBg, cardClass } from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ProviderCreate } from './ProviderCreate';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type ViewMode = 'list' | 'create' | 'edit';

const STATUS_LABEL_PV: Record<ProviderStatus, string> = {
  active: '运行中',
  inactive: '已停用',
};

const TYPE_MAP: Record<ProviderType, { label: string; cls: string }> = {
  internal: { label: '自研产品', cls: 'text-blue-600 bg-blue-500/10' },
  partner: { label: '合作伙伴', cls: 'text-purple-600 bg-purple-500/10' },
  cloud: { label: '云平台', cls: 'text-cyan-600 bg-cyan-500/10' },
};

const AUTH_MAP: Record<string, string> = {
  api_key: 'API Key',
  oauth2: 'OAuth 2.0',
  basic: 'Basic Auth',
  none: '无认证',
};

function truncateUrl(url: string | null, max = 30): string {
  if (!url) return '—';
  return url.length > max ? url.slice(0, max) + '...' : url;
}

export const ProviderList: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const dark = theme === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProviderType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ProviderStatus | ''>('');
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [viewProvider, setViewProvider] = useState<Provider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await providerService.list({
        page,
        pageSize,
        keyword: keyword || undefined,
        providerType: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setProviders(res.list);
      setTotal(res.total);
    } catch {
      showMessage?.('加载 Provider 列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, keyword, typeFilter, statusFilter, showMessage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await providerService.remove(deleteTarget.id);
      showMessage?.('删除成功', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch {
      showMessage?.('删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleView = (pv: Provider) => {
    setViewProvider(pv);
  };

  const handleEdit = async (pv: Provider) => {
    try {
      const full = await providerService.getById(pv.id);
      setEditingProvider(full);
    } catch {
      setEditingProvider(pv);
    }
    setViewMode('edit');
  };

  if (viewMode === 'create') {
    return (
      <ProviderCreate
        theme={theme}
        fontSize={fontSize}
        onBack={() => { setViewMode('list'); fetchData(); }}
        showMessage={showMessage}
      />
    );
  }

  if (viewMode === 'edit' && editingProvider) {
    return (
      <ProviderCreate
        theme={theme}
        fontSize={fontSize}
        onBack={() => { setViewMode('list'); setEditingProvider(null); fetchData(); }}
        showMessage={showMessage}
        editProvider={editingProvider}
      />
    );
  }

  const totalPages = Math.ceil(total / pageSize);
  const fsTitle = fontSize === 'small' ? 'text-lg' : fontSize === 'medium' ? 'text-xl' : 'text-2xl';

  return (
    <div className={`flex-1 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 ${pageBg(theme)}`}>
      <div className={`${cardClass(theme)} p-4 sm:p-6`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className={`font-bold ${fsTitle} ${dark ? 'text-white' : 'text-slate-900'}`}>Provider 管理</h1>
          <button
            type="button"
            onClick={() => setViewMode('create')}
            className={`${btnPrimary} shadow-lg shadow-blue-500/20`}
          >
            + 添加 Provider
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            type="text"
            placeholder="搜索提供商…"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className={`${nativeInputClass(theme)} max-w-xs`}
          />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as ProviderType | ''); setPage(1); }}
            className={`${nativeSelectClass(theme)} max-w-[10rem]`}
          >
            <option value="">全部类型</option>
            <option value="internal">自研产品</option>
            <option value="partner">合作伙伴</option>
            <option value="cloud">云平台</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as ProviderStatus | ''); setPage(1); }}
            className={`${nativeSelectClass(theme)} max-w-[10rem]`}
          >
            <option value="">全部状态</option>
            <option value="active">运行中</option>
            <option value="inactive">已停用</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className={`table w-full min-w-[1020px] ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
            <thead>
              <tr>
                <th className={tableHeadCell(theme)} style={{ minWidth: 130 }}>名称</th>
                <th className={tableHeadCell(theme)} style={{ minWidth: 100 }}>类型</th>
                <th className={tableHeadCell(theme)} style={{ minWidth: 90 }}>认证方式</th>
                <th className={tableHeadCell(theme)} style={{ minWidth: 180 }}>Base URL</th>
                <th className={tableHeadCell(theme)} style={{ minWidth: 80 }}>状态</th>
                <th className={`${tableHeadCell(theme)} text-right`} style={{ minWidth: 70 }}>Agent</th>
                <th className={`${tableHeadCell(theme)} text-right`} style={{ minWidth: 70 }}>Skill</th>
                <th className={tableHeadCell(theme)} style={{ minWidth: 120 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">加载中…</td></tr>
              ) : providers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">暂无数据</td></tr>
              ) : (
                providers.map((pv, i) => {
                  const tInfo = TYPE_MAP[pv.providerType];
                  return (
                    <tr
                      key={pv.id}
                      className={tableBodyRow(theme, i)}
                    >
                      <td className="font-medium whitespace-nowrap">{pv.providerName}</td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${tInfo.cls}`}>
                          {tInfo.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">{AUTH_MAP[pv.authType] ?? pv.authType}</td>
                      <td className="truncate max-w-[220px]" title={pv.baseUrl ?? ''}>
                        <span className={`font-mono text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {truncateUrl(pv.baseUrl)}
                        </span>
                      </td>
                      <td>
                        <span className={statusBadgeClass(pv.status as DomainStatus, theme)}>
                          {STATUS_LABEL_PV[pv.status] ?? statusLabel(pv.status as DomainStatus)}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{pv.agentCount}</td>
                      <td className="text-right tabular-nums">{pv.skillCount}</td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className={btnGhost(theme)}
                            onClick={() => handleView(pv)}
                          >
                            查看
                          </button>
                          <button
                            type="button"
                            className={btnGhost(theme)}
                            onClick={() => handleEdit(pv)}
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className={btnGhost(theme)}
                            onClick={() => setDeleteTarget({ id: pv.id, name: pv.providerName })}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              共 {total} 条
            </span>
            <div className="join">
              <button
                className="join-item btn btn-sm rounded-xl"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </button>
              <button className="join-item btn btn-sm rounded-xl btn-active">
                {page} / {totalPages}
              </button>
              <button
                className="join-item btn btn-sm rounded-xl"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!viewProvider} onClose={() => setViewProvider(null)} title="Provider 详情" theme={theme} size="md">
        {viewProvider && (
          <div className="space-y-4">
            {[
              { label: '提供商名称', value: viewProvider.providerName },
              { label: '提供商编码', value: viewProvider.providerCode },
              { label: '类型', value: TYPE_MAP[viewProvider.providerType]?.label ?? viewProvider.providerType },
              { label: '描述', value: viewProvider.description || '—' },
              { label: '认证方式', value: AUTH_MAP[viewProvider.authType] ?? viewProvider.authType },
              { label: '服务地址', value: viewProvider.baseUrl || '—' },
              { label: '状态', value: STATUS_LABEL_PV[viewProvider.status] ?? viewProvider.status },
              { label: '关联 Agent', value: String(viewProvider.agentCount) },
              { label: '关联 Skill', value: String(viewProvider.skillCount) },
              { label: '创建时间', value: viewProvider.createTime },
              { label: '更新时间', value: viewProvider.updateTime },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-4">
                <span className={`text-sm font-medium w-24 shrink-0 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{row.label}</span>
                <span className={`text-sm break-all ${dark ? 'text-slate-200' : 'text-slate-700'}`}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除 Provider"
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
