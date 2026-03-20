import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, Save, Trash2, Power, FlaskConical, Cpu, Loader2 } from 'lucide-react';
import { useModelConfigs, useCreateModelConfig, useUpdateModelConfig, useDeleteModelConfig } from '../../hooks/queries/useSystemConfig';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import type { ModelConfig, CreateModelConfigDTO } from '../../types/dto/system-config';

interface ModelConfigPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

const emptyDraft = (): Partial<CreateModelConfigDTO> & { enabled: boolean } => ({
  name: '',
  provider: 'OpenAI 兼容',
  modelId: '',
  endpoint: '',
  maxTokens: 4096,
  enabled: true,
});

export const ModelConfigPage: React.FC<ModelConfigPageProps> = ({
  theme,
  fontSize,
  showMessage,
  breadcrumbSegments,
}) => {
  const isDark = theme === 'dark';
  const { data, isLoading, isError, error, refetch } = useModelConfigs();
  const createMut = useCreateModelConfig();
  const updateMut = useUpdateModelConfig();
  const deleteMut = useDeleteModelConfig();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ModelConfig | null>(null);

  const rows = data?.list ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.modelId.toLowerCase().includes(q) ||
        r.endpoint.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const startEdit = (r: ModelConfig) => {
    setCreating(false);
    setEditingId(r.id);
    setDraft({
      name: r.name,
      provider: r.provider,
      modelId: r.modelId,
      endpoint: r.endpoint,
      maxTokens: r.maxTokens,
      enabled: r.enabled,
    });
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
  };

  const saveForm = () => {
    if (!draft.name?.trim() || !draft.modelId?.trim() || !draft.endpoint?.trim()) {
      showMessage('请填写名称、模型 ID 与接入地址', 'error');
      return;
    }
    const payload: CreateModelConfigDTO = {
      name: draft.name!.trim(),
      provider: draft.provider || 'OpenAI 兼容',
      modelId: draft.modelId!.trim(),
      endpoint: draft.endpoint!.trim(),
      maxTokens: draft.maxTokens ?? 4096,
    };

    if (creating) {
      createMut.mutate(payload, {
        onSuccess: () => { cancelForm(); showMessage('已添加模型配置', 'success'); },
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
      <div
        className={`shrink-0 border-b px-4 sm:px-6 py-4 ${isDark ? 'border-white/10 bg-[#2C2C2E]/30' : 'border-slate-200 bg-slate-50/80'}`}
      >
        <div className="text-sm font-semibold mb-3 text-inherit">
          {creating ? '新增模型配置' : '编辑模型配置'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
          <div>
            <label className={labelCls}>显示名称</label>
            <input className={input} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>提供方</label>
            <select className={sel} value={draft.provider} onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value }))}>
              <option>OpenAI 兼容</option>
              <option>Azure</option>
              <option>百度千帆</option>
              <option>本地 vLLM</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>模型 ID</label>
            <input className={input} value={draft.modelId} onChange={(e) => setDraft((d) => ({ ...d, modelId: e.target.value }))} placeholder="如 gpt-4.1-mini" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>API Base / 接入地址</label>
            <input className={input} value={draft.endpoint} onChange={(e) => setDraft((d) => ({ ...d, endpoint: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" id="mc-en" checked={draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))} className="rounded border-slate-300" />
            <label htmlFor="mc-en" className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>启用</label>
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
      <MgmtPageShell theme={theme} fontSize={fontSize} breadcrumbSegments={breadcrumbSegments} titleIcon={Cpu}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={Cpu}
      description="管理大模型接入点、模型标识与启用状态；支持连接探测"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
            <input type="search" placeholder="搜索名称、提供方、模型 ID…" value={search} onChange={(e) => setSearch(e.target.value)} className={toolbarSearchInputClass(theme)} />
          </div>
          <button type="button" onClick={startCreate} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 min-h-[2.5rem] shrink-0">
            <Plus size={16} />
            新增配置
          </button>
        </div>
      }
    >
      {formPanel}
      <ContentLoader loading={isLoading}>
        <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
          {filtered.length === 0 ? (
            <EmptyState title="无匹配项" description="调整搜索条件或新增配置" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[960px]">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>名称</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>提供方</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>模型 ID</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>接入地址</th>
                    <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>状态</th>
                    <th className={`px-4 py-3 font-semibold text-right ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} className={`border-b transition-colors ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'} hover:bg-white/5` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100/80`}`}>
                      <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{r.name}</td>
                      <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{r.provider}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{r.modelId}</td>
                      <td className={`px-4 py-3 max-w-[220px] truncate font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={r.endpoint}>{r.endpoint}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${r.enabled ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : (isDark ? 'bg-slate-600/40 text-slate-300' : 'bg-slate-200 text-slate-700')}`}>
                          {r.enabled ? '启用' : '停用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
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
        title="删除模型配置"
        message={`确定要删除「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MgmtPageShell>
  );
};
