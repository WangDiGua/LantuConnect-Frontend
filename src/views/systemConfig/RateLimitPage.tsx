import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, Save, Trash2, Power, Sliders, Loader2 } from 'lucide-react';
import { useRateLimits, useCreateRateLimit, useUpdateRateLimit, useDeleteRateLimit } from '../../hooks/queries/useSystemConfig';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { RateLimitRule, CreateRateLimitDTO } from '../../types/dto/system-config';

interface RateLimitPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

const emptyDraft = (): Partial<CreateRateLimitDTO> & { enabled: boolean } => ({
  name: '',
  target: 'global',
  windowMs: 60000,
  maxRequests: 1000,
  burstLimit: 50,
  action: 'reject',
  enabled: true,
});

export const RateLimitPage: React.FC<RateLimitPageProps> = ({
  theme,
  fontSize,
  showMessage,
  breadcrumbSegments,
}) => {
  const isDark = theme === 'dark';
  const { data, isLoading, isError, error, refetch } = useRateLimits();
  const createMut = useCreateRateLimit();
  const updateMut = useUpdateRateLimit();
  const deleteMut = useDeleteRateLimit();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RateLimitRule | null>(null);

  const rules: RateLimitRule[] = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.target.toLowerCase().includes(q);
    });
  }, [rules, search]);

  const startCreate = () => { setCreating(true); setEditingId(null); setDraft(emptyDraft()); };

  const startEdit = (r: RateLimitRule) => {
    setCreating(false);
    setEditingId(r.id);
    setDraft({
      name: r.name,
      target: r.target,
      windowMs: r.windowMs,
      maxRequests: r.maxRequests,
      burstLimit: r.burstLimit ?? 50,
      action: r.action,
      enabled: r.enabled,
    });
  };

  const cancelForm = () => { setCreating(false); setEditingId(null); };

  const saveForm = () => {
    if (!draft.name?.trim()) { showMessage('请填写策略名称', 'error'); return; }
    if ((draft.maxRequests ?? 0) < 1) { showMessage('最大请求数须为正数', 'error'); return; }

    const payload: CreateRateLimitDTO = {
      name: draft.name!.trim(),
      target: draft.target as RateLimitRule['target'] ?? 'global',
      windowMs: draft.windowMs ?? 60000,
      maxRequests: draft.maxRequests ?? 1000,
      burstLimit: draft.burstLimit ?? 50,
      action: draft.action as RateLimitRule['action'] ?? 'reject',
    };

    if (creating) {
      createMut.mutate(payload, {
        onSuccess: () => { cancelForm(); showMessage('已添加限流策略', 'success'); },
        onError: (e) => showMessage(e instanceof Error ? e.message : '创建失败', 'error'),
      });
    } else if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { cancelForm(); showMessage('已保存', 'success'); },
        onError: (e) => showMessage(e instanceof Error ? e.message : '保存失败', 'error'),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (editingId === deleteTarget.id) cancelForm();
        setDeleteTarget(null);
        showMessage('已删除', 'info');
      },
    });
  };

  const input = nativeInputClass(theme);
  const sel = nativeSelectClass(theme);
  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
  const isSaving = createMut.isPending || updateMut.isPending;

  const formPanel =
    creating || editingId ? (
      <div className={`shrink-0 border-b px-4 sm:px-6 py-4 ${isDark ? 'border-white/10 bg-[#2C2C2E]/30' : 'border-slate-200 bg-slate-50/80'}`}>
        <div className="text-sm font-semibold mb-3">{creating ? '新建限流策略' : '编辑限流策略'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className={labelCls}>策略名称</label>
            <input className={input} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>目标类型</label>
            <select className={sel} value={draft.target} onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value as any }))}>
              <option value="global">全局</option>
              <option value="user">用户</option>
              <option value="role">角色</option>
              <option value="ip">IP</option>
              <option value="api_key">API Key</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>时间窗口 (ms)</label>
            <input type="number" min={1000} className={input} value={draft.windowMs} onChange={(e) => setDraft((d) => ({ ...d, windowMs: Number(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className={labelCls}>最大请求数</label>
            <input type="number" min={1} className={input} value={draft.maxRequests} onChange={(e) => setDraft((d) => ({ ...d, maxRequests: Number(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className={labelCls}>突发容量 (Burst)</label>
            <input type="number" min={1} className={input} value={draft.burstLimit} onChange={(e) => setDraft((d) => ({ ...d, burstLimit: Number(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className={labelCls}>超限动作</label>
            <select className={sel} value={draft.action} onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value as any }))}>
              <option value="reject">拒绝</option>
              <option value="queue">排队</option>
              <option value="throttle">限速</option>
            </select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" id="rl-en" checked={draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))} className="rounded border-slate-300" />
            <label htmlFor="rl-en" className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>启用</label>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={saveForm} disabled={isSaving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            保存
          </button>
          <button type="button" onClick={cancelForm} className={`px-4 py-2 rounded-xl text-sm border ${isDark ? 'border-white/10 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            取消
          </button>
        </div>
      </div>
    ) : null;

  if (isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} breadcrumbSegments={breadcrumbSegments} titleIcon={Sliders}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={Sliders}
      description="配置限流策略，保护核心接口"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
            <input type="search" placeholder="搜索策略名或目标…" value={search} onChange={(e) => setSearch(e.target.value)} className={toolbarSearchInputClass(theme)} />
          </div>
          <button type="button" onClick={startCreate} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 min-h-[2.5rem] shrink-0">
            <Plus size={16} />
            新建策略
          </button>
        </div>
      }
    >
      {formPanel}
      <ContentLoader loading={isLoading}>
        <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
          {filtered.length === 0 ? (
            <EmptyState title="无匹配项" description="调整搜索或新建策略" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>名称</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>目标</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>窗口</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>最大请求</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>状态</th>
                    <th className={`px-4 py-3 font-semibold text-right ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} className={`border-b transition-colors ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'} hover:bg-white/5` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100/80`}`}>
                      <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{r.name}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.target}{r.targetValue ? `: ${r.targetValue}` : ''}</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{(r.windowMs / 1000).toFixed(0)}s</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{r.maxRequests}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${r.enabled ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : (isDark ? 'bg-slate-600/40 text-slate-300' : 'bg-slate-200 text-slate-700')}`}>
                          {r.enabled ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1 justify-end">
                          <button type="button" onClick={() => startEdit(r)} className={`px-2 py-1 rounded-xl text-xs font-medium ${isDark ? 'text-blue-400 hover:bg-white/10' : 'text-blue-600 hover:bg-blue-50'}`}>编辑</button>
                          <button type="button" onClick={() => setDeleteTarget(r)} className={`p-1.5 rounded-xl ${isDark ? 'text-red-400 hover:bg-white/10' : 'text-red-600 hover:bg-red-50'}`}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ContentLoader>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除限流策略"
        message={`确定要删除「${deleteTarget?.name ?? ''}」吗？`}
        confirmText="删除"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MgmtPageShell>
  );
};
