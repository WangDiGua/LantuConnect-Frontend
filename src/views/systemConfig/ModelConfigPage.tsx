import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { TOOLBAR_ROW_LIST, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, Save, Cpu } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import {
  btnPrimary,
  btnSecondary,
  iconMuted,
  mgmtTableActionDanger,
  mgmtTableActionGhost,
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';
import { systemConfigService } from '../../api/services/system-config.service';
import type { ModelConfig, CreateModelConfigDTO } from '../../types/dto/system-config';

interface ModelConfigPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

const MODEL_TYPE_LABEL: Record<string, string> = { chat: '对话', embedding: '向量', image: '图像' };
const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

const MODEL_PROVIDER_OPTIONS = [
  { value: 'OpenAI', label: 'OpenAI' },
  { value: '阿里云百炼', label: '阿里云百炼' },
  { value: '百度千帆', label: '百度千帆' },
  { value: 'Azure', label: 'Azure' },
  { value: '本地 vLLM', label: '本地 vLLM' },
];

const emptyDraft = (): Omit<CreateModelConfigDTO, 'apiKey'> & { enabled: boolean } => ({
  name: '',
  provider: 'OpenAI',
  modelId: '',
  endpoint: '',
  maxTokens: 4096,
  enabled: true,
});

export const ModelConfigPage: React.FC<ModelConfigPageProps> = ({
  theme, fontSize, showMessage, breadcrumbSegments,
}) => {
  const isDark = theme === 'dark';
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<ModelConfig | null>(null);

  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;

  const fetchModels = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const result = await systemConfigService.listModelConfigs();
      setModels(result.list);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载模型配置失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((r) => {
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.provider.toLowerCase().includes(q) || r.modelId.toLowerCase().includes(q);
    });
  }, [models, search]);

  const openCreate = () => { setEditingId(null); setDraft(emptyDraft()); setModalOpen(true); };

  const openEdit = (r: ModelConfig) => {
    setEditingId(r.id);
    setDraft({ name: r.name, provider: r.provider, modelId: r.modelId, endpoint: r.endpoint, maxTokens: r.maxTokens, enabled: r.enabled });
    setModalOpen(true);
  };

  const saveForm = async () => {
    if (!draft.name.trim() || !draft.modelId.trim() || !draft.endpoint.trim()) {
      showMessage('请填写名称、模型 ID 与接入地址', 'error');
      return;
    }
    try {
      const payload: CreateModelConfigDTO = {
        name: draft.name.trim(), provider: draft.provider, modelId: draft.modelId.trim(),
        endpoint: draft.endpoint.trim(), maxTokens: draft.maxTokens,
      };
      if (editingId) {
        await systemConfigService.updateModelConfig(editingId, payload);
        showMessage('已保存', 'success');
      } else {
        await systemConfigService.createModelConfig(payload);
        showMessage('已添加模型配置', 'success');
      }
      setModalOpen(false);
      setEditingId(null);
      await fetchModels();
    } catch (err) {
      console.error(err);
      showMessage('操作失败', 'error');
    }
  };

  const toggleEnabled = (id: string) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await systemConfigService.deleteModelConfig(deleteTarget.id);
      setDeleteTarget(null);
      showMessage('已删除', 'info');
      await fetchModels();
    } catch (err) {
      console.error(err);
      showMessage('删除失败', 'error');
    }
  };

  const modelType = (r: ModelConfig) => {
    if (r.modelId.includes('embed')) return 'embedding';
    if (r.modelId.includes('dall') || r.modelId.includes('image')) return 'image';
    return 'chat';
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={Cpu}
      description="管理大模型接入点、模型标识与启用状态"
      toolbar={
        <div className={`${TOOLBAR_ROW_LIST} justify-between`}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} size={16} />
            <input type="search" placeholder="搜索名称、提供方、模型 ID…" value={search} onChange={(e) => setSearch(e.target.value)} className={toolbarSearchInputClass(theme)} />
          </div>
          <button type="button" onClick={openCreate} className={`${btnPrimary} gap-1.5 shrink-0`}>
            <Plus size={16} />
            新增配置
          </button>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        {loading && models.length === 0 ? (
          <PageSkeleton type="table" />
        ) : loadError ? (
          <PageError error={loadError} onRetry={fetchModels} retryLabel="重试加载模型配置" />
        ) : filtered.length === 0 ? (
          <p className={`text-center py-12 text-sm ${textMuted(theme)}`}>暂无匹配模型配置</p>
        ) : (
          (() => {
            const modelColumns: MgmtDataTableColumn<ModelConfig>[] = [
                  {
                    id: 'name',
                    header: '模型名称',
                    cellClassName: `align-middle font-medium ${textPrimary(theme)}`,
                    cell: (r) => r.name,
                  },
                  {
                    id: 'provider',
                    header: '提供商',
                    cellClassName: `align-middle ${textSecondary(theme)}`,
                    cell: (r) => r.provider,
                  },
                  {
                    id: 'modelId',
                    header: '模型 ID',
                    cellClassName: `align-middle font-mono text-xs ${textMuted(theme)}`,
                    cell: (r) => r.modelId,
                  },
                  {
                    id: 'type',
                    header: '类型',
                    cellClassName: 'align-middle',
                    cell: (r) => {
                      const mt = modelType(r);
                      return (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            mt === 'chat'
                              ? isDark
                                ? 'bg-blue-500/15 text-blue-400'
                                : 'bg-blue-100 text-blue-700'
                              : mt === 'embedding'
                                ? isDark
                                  ? 'bg-neutral-500/15 text-neutral-300'
                                  : 'bg-neutral-100 text-neutral-800'
                                : isDark
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {MODEL_TYPE_LABEL[mt] ?? mt}
                        </span>
                      );
                    },
                  },
                  {
                    id: 'enabled',
                    header: '状态',
                    cellClassName: 'align-middle',
                    cell: (r) => (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          r.enabled
                            ? isDark
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-emerald-100 text-emerald-800'
                            : isDark
                              ? 'bg-slate-600/40 text-slate-300'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {r.enabled ? '启用' : '停用'}
                      </span>
                    ),
                  },
                  {
                    id: 'actions',
                    header: '操作',
                    headerClassName: 'text-right',
                    cellClassName: 'text-right align-middle',
                    cell: (r) => (
                      <div className="inline-flex flex-nowrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEnabled(r.id)}
                          className={mgmtTableActionGhost(theme)}
                          title={r.enabled ? '点击停用' : '点击启用'}
                        >
                          {r.enabled ? '停用' : '启用'}
                        </button>
                        <button type="button" onClick={() => openEdit(r)} className={mgmtTableActionGhost(theme)}>
                          编辑
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(r)} className={mgmtTableActionDanger}>
                          删除
                        </button>
                      </div>
                    ),
                  },
                ];
            return (
              <MgmtDataTable
                theme={theme}
                columns={modelColumns}
                rows={filtered}
                getRowKey={(r) => r.id}
                minWidth="60rem"
                surface="plain"
              />
            );
          })()
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑模型配置' : '新增模型配置'}
        theme={theme}
        size="lg"
        footer={
          <>
            <button className={btnSecondary(theme)} onClick={() => setModalOpen(false)}>取消</button>
            <button className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={saveForm}>
              <Save size={16} />
              保存
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>显示名称</label>
            <input className={inputCls} value={draft.name} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="如 GPT-4.1" />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>提供商</label>
            <LantuSelect
              theme={theme}
              triggerClassName={INPUT_FOCUS}
              value={draft.provider}
              onChange={(v) => setDraft((d) => ({ ...d, provider: v }))}
              options={MODEL_PROVIDER_OPTIONS}
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>模型 ID</label>
            <input className={inputCls} value={draft.modelId} onChange={(e) => setDraft(d => ({ ...d, modelId: e.target.value }))} placeholder="如 gpt-4.1-mini" />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>Max Tokens</label>
            <input className={inputCls} type="number" value={draft.maxTokens} onChange={(e) => setDraft(d => ({ ...d, maxTokens: Number(e.target.value) || 0 }))} />
          </div>
          <div className="sm:col-span-2">
            <label className={`${labelCls} mb-1.5 block`}>API Base / 接入地址</label>
            <input className={inputCls} value={draft.endpoint} onChange={(e) => setDraft(d => ({ ...d, endpoint: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft(d => ({ ...d, enabled: e.target.checked }))} className="toggle toggle-primary toggle-sm" />
              <span className={`text-sm ${textSecondary(theme)}`}>启用</span>
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除模型配置"
        message={`确定要删除「${deleteTarget?.name ?? ''}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MgmtPageShell>
  );
};
