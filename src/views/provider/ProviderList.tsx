import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Eye, Edit2, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, Server } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { Provider, ProviderType, ProviderStatus } from '../../types/dto/provider';
import { providerService } from '../../api/services/provider.service';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  canvasBodyBg,
  mainScrollCompositorClass, bentoCard, bentoCardHover, btnPrimary, btnGhost,
  statusBadgeClass, statusDot, statusLabel,
  textPrimary, textSecondary, textMuted, techBadge,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AnimatedList } from '../../components/common/AnimatedList';
import { PortalDropdown } from '../../components/common/PortalDropdown';
import { ProviderCreate } from './ProviderCreate';
import { useLayoutChrome } from '../../context/LayoutChromeContext';

interface Props { theme: Theme; fontSize: FontSize; showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void; }
type ViewMode = 'list' | 'create' | 'edit';

const STATUS_LABEL_PV: Record<ProviderStatus, string> = { active: '运行中', inactive: '已停用' };
const TYPE_MAP: Record<ProviderType, { label: string; cls: string }> = {
  internal: { label: '自研产品', cls: 'text-blue-600 bg-blue-500/10' },
  partner: { label: '合作伙伴', cls: 'text-purple-600 bg-purple-500/10' },
  cloud: { label: '云平台', cls: 'text-cyan-600 bg-cyan-500/10' },
};
const AUTH_MAP: Record<string, string> = { api_key: 'API Key', oauth2: 'OAuth 2.0', basic: 'Basic Auth', none: '无认证' };

function truncateUrl(url: string | null, max = 30): string { if (!url) return '—'; return url.length > max ? url.slice(0, max) + '...' : url; }

const PROVIDER_TYPE_FILTER_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'internal', label: '自研产品' },
  { value: 'partner', label: '合作伙伴' },
  { value: 'cloud', label: '云平台' },
];
const PROVIDER_STATUS_FILTER_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '运行中' },
  { value: 'inactive', label: '已停用' },
];

export const ProviderList: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuTriggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await providerService.list({ page, pageSize, keyword: keyword || undefined, providerType: typeFilter || undefined, status: statusFilter || undefined });
      setProviders(res.list); setTotal(res.total);
    } catch { showMessage?.('加载 Provider 列表失败', 'error'); }
    finally { setLoading(false); }
  }, [page, keyword, typeFilter, statusFilter, showMessage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return; setDeleting(true);
    try { await providerService.remove(deleteTarget.id); showMessage?.('删除成功', 'success'); setDeleteTarget(null); fetchData(); }
    catch { showMessage?.('删除失败', 'error'); } finally { setDeleting(false); }
  };

  const handleView = (pv: Provider) => { setViewProvider(pv); };
  const handleEdit = async (pv: Provider) => {
    try { const full = await providerService.getById(pv.id); setEditingProvider(full); } catch { setEditingProvider(pv); }
    setViewMode('edit');
  };

  if (viewMode === 'create') return <ProviderCreate theme={theme} fontSize={fontSize} onBack={() => { setViewMode('list'); fetchData(); }} showMessage={showMessage} />;
  if (viewMode === 'edit' && editingProvider) return <ProviderCreate theme={theme} fontSize={fontSize} onBack={() => { setViewMode('list'); setEditingProvider(null); fetchData(); }} showMessage={showMessage} editProvider={editingProvider} />;

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex flex-col px-3 sm:px-4 lg:px-5 py-4 gap-4">
        <div className={`${bentoCard(theme)} overflow-hidden shrink-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/15' : 'bg-cyan-50'}`}><Server size={20} className={isDark ? 'text-cyan-400' : 'text-cyan-600'} /></div>
              <div>
                <h1 className="sr-only">{chromePageTitle || 'Provider 列表'}</h1>
                {total > 0 && <span className={`text-xs ${textMuted(theme)}`}>共 {total} 个</span>}
              </div>
            </div>
            <button type="button" onClick={() => setViewMode('create')} className={btnPrimary}><Plus size={15} /> 添加 Provider</button>
          </div>

          {/* Filters */}
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap gap-2">
              <input type="text" placeholder="搜索提供商…" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} className={`${nativeInputClass(theme)} max-w-xs`} />
              <LantuSelect
                theme={theme}
                className="max-w-[10rem]"
                value={typeFilter}
                onChange={(v) => { setTypeFilter(v as ProviderType | ''); setPage(1); }}
                options={PROVIDER_TYPE_FILTER_OPTIONS}
              />
              <LantuSelect
                theme={theme}
                className="max-w-[10rem]"
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v as ProviderStatus | ''); setPage(1); }}
                options={PROVIDER_STATUS_FILTER_OPTIONS}
              />
            </div>
          </div>
        </div>

        <div className={`${bentoCard(theme)} overflow-hidden flex flex-col`}>
          {/* Card rows */}
          <div className="p-3">
            {loading ? (
              <div className={`text-center py-12 ${textMuted(theme)}`}>加载中…</div>
            ) : providers.length === 0 ? (
              <div className={`text-center py-12 ${textMuted(theme)}`}>暂无数据</div>
            ) : (
              <AnimatedList className="space-y-2">
                {providers.map((pv) => {
                  const tInfo = TYPE_MAP[pv.providerType];
                  return (
                    <motion.div key={pv.id} className={`${bentoCardHover(theme)} p-4 flex items-center gap-4 ${isDark ? 'hover:bg-violet-500/[0.03]' : 'hover:bg-violet-50/40'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}>
                        <Server size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold truncate ${textPrimary(theme)}`}>{pv.providerName}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${tInfo.cls}`}>{tInfo.label}</span>
                          <span className={statusBadgeClass(pv.status as DomainStatus, theme)}>
                            <span className={statusDot(pv.status as DomainStatus)} />
                            {STATUS_LABEL_PV[pv.status] ?? statusLabel(pv.status as DomainStatus)}
                          </span>
                        </div>
                        <div className={`text-xs mt-0.5 truncate ${textMuted(theme)}`}>
                          {AUTH_MAP[pv.authType] ?? pv.authType} · <span className="font-mono">{truncateUrl(pv.baseUrl)}</span>
                        </div>
                      </div>
                      <div className="hidden lg:flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>Agent</div>
                          <div className={`text-sm font-mono tabular-nums font-medium ${textSecondary(theme)}`}>{pv.agentCount}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs uppercase tracking-wider ${textMuted(theme)}`}>Skill</div>
                          <div className={`text-sm font-mono tabular-nums font-medium ${textSecondary(theme)}`}>{pv.skillCount}</div>
                        </div>
                      </div>
                      {/* Desktop actions */}
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <button type="button" className={btnGhost(theme)} onClick={() => handleView(pv)} title="查看"><Eye size={15} /></button>
                        <button type="button" className={btnGhost(theme)} onClick={() => handleEdit(pv)} title="编辑"><Edit2 size={15} /></button>
                        <button type="button" onClick={() => setDeleteTarget({ id: pv.id, name: pv.providerName })} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`} title="删除"><Trash2 size={15} /></button>
                      </div>
                      {/* Mobile menu */}
                      <div className="sm:hidden shrink-0">
                        <button type="button" ref={(el) => { if (el) menuTriggerRefs.current.set(pv.id, el); }} onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === pv.id ? null : pv.id); }} className={btnGhost(theme)}><MoreHorizontal size={16} /></button>
                        <PortalDropdown open={openMenuId === pv.id} onClose={() => setOpenMenuId(null)} anchorEl={menuTriggerRefs.current.get(pv.id) ?? null} className={`w-32 rounded-xl border shadow-xl py-1 ${isDark ? 'bg-[#1a1f2e] border-white/10' : 'bg-white border-slate-200'}`}>
                          <button type="button" onClick={() => { handleView(pv); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}><Eye size={14} /> 查看</button>
                          <button type="button" onClick={() => { handleEdit(pv); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}><Edit2 size={14} /> 编辑</button>
                          <button type="button" onClick={() => { setDeleteTarget({ id: pv.id, name: pv.providerName }); setOpenMenuId(null); }} className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}><Trash2 size={14} /> 删除</button>
                        </PortalDropdown>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatedList>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={`text-sm ${textMuted(theme)}`}>共 {total} 条</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`p-2 rounded-xl transition-colors ${page <= 1 ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronLeft size={16} /></button>
                <span className={`text-xs font-medium ${textSecondary(theme)}`}>{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={`p-2 rounded-xl transition-colors ${page >= totalPages ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
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
                <span className={`text-sm font-medium w-24 shrink-0 ${textMuted(theme)}`}>{row.label}</span>
                <span className={`text-sm break-all ${textPrimary(theme)}`}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="删除 Provider" message={`确定要删除「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`} confirmText="删除" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};
