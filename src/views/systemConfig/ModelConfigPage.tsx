import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, Save, Trash2, Cpu, Power } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { btnPrimary, btnSecondary } from '../../utils/uiClasses';

interface ModelConfigPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

interface LocalModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  modelType: 'chat' | 'embedding' | 'image';
  endpoint: string;
  maxTokens: number;
  enabled: boolean;
}

const MODEL_TYPE_LABEL: Record<string, string> = { chat: '对话', embedding: '向量', image: '图像' };

const INITIAL_MODELS: LocalModelConfig[] = [
  { id: 'm1', name: 'GPT-4.1', provider: 'OpenAI', modelId: 'gpt-4.1', modelType: 'chat', endpoint: 'https://api.openai.com/v1', maxTokens: 32768, enabled: true },
  { id: 'm2', name: 'GPT-4.1-mini', provider: 'OpenAI', modelId: 'gpt-4.1-mini', modelType: 'chat', endpoint: 'https://api.openai.com/v1', maxTokens: 16384, enabled: true },
  { id: 'm3', name: 'Qwen-Plus', provider: '阿里云百炼', modelId: 'qwen-plus', modelType: 'chat', endpoint: 'https://dashscope.aliyuncs.com/v1', maxTokens: 8192, enabled: true },
  { id: 'm4', name: 'ERNIE-Bot 4.0', provider: '百度千帆', modelId: 'ernie-bot-4', modelType: 'chat', endpoint: 'https://aip.baidubce.com/rpc/2.0', maxTokens: 8192, enabled: false },
  { id: 'm5', name: 'text-embedding-3-large', provider: 'OpenAI', modelId: 'text-embedding-3-large', modelType: 'embedding', endpoint: 'https://api.openai.com/v1', maxTokens: 8191, enabled: true },
  { id: 'm6', name: 'DALL·E 3', provider: 'OpenAI', modelId: 'dall-e-3', modelType: 'image', endpoint: 'https://api.openai.com/v1', maxTokens: 0, enabled: false },
];

const emptyDraft = (): Omit<LocalModelConfig, 'id'> => ({
  name: '',
  provider: 'OpenAI',
  modelId: '',
  modelType: 'chat',
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
  const [models, setModels] = useState<LocalModelConfig[]>(INITIAL_MODELS);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<LocalModelConfig | null>(null);

  const input = nativeInputClass(theme);
  const sel = nativeSelectClass(theme);
  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((r) => {
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.modelId.toLowerCase().includes(q)
      );
    });
  }, [models, search]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  };

  const openEdit = (r: LocalModelConfig) => {
    setEditingId(r.id);
    setDraft({ name: r.name, provider: r.provider, modelId: r.modelId, modelType: r.modelType, endpoint: r.endpoint, maxTokens: r.maxTokens, enabled: r.enabled });
    setModalOpen(true);
  };

  const saveForm = () => {
    if (!draft.name.trim() || !draft.modelId.trim() || !draft.endpoint.trim()) {
      showMessage('请填写名称、模型 ID 与接入地址', 'error');
      return;
    }
    if (editingId) {
      setModels(prev => prev.map(m => m.id === editingId ? { ...m, ...draft } : m));
      showMessage('已保存', 'success');
    } else {
      const id = `m-${Date.now()}`;
      setModels(prev => [...prev, { id, ...draft }]);
      showMessage('已添加模型配置', 'success');
    }
    setModalOpen(false);
    setEditingId(null);
  };

  const toggleEnabled = (id: string) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setModels(prev => prev.filter(m => m.id !== deleteTarget.id));
    setDeleteTarget(null);
    showMessage('已删除', 'info');
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={Cpu}
      description="管理大模型接入点、模型标识与启用状态（演示数据）"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
            <input type="search" placeholder="搜索名称、提供方、模型 ID…" value={search} onChange={(e) => setSearch(e.target.value)} className={toolbarSearchInputClass(theme)} />
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 min-h-[2.5rem] shrink-0">
            <Plus size={16} />
            新增配置
          </button>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        {filtered.length === 0 ? (
          <p className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            暂无匹配模型配置
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[960px]">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>模型名称</th>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>提供商</th>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>模型 ID</th>
                  <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>类型</th>
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
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        r.modelType === 'chat' ? (isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-700')
                        : r.modelType === 'embedding' ? (isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-700')
                        : (isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700')
                      }`}>
                        {MODEL_TYPE_LABEL[r.modelType] ?? r.modelType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${r.enabled ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800') : (isDark ? 'bg-slate-600/40 text-slate-300' : 'bg-slate-200 text-slate-700')}`}>
                        {r.enabled ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        <button type="button" onClick={() => toggleEnabled(r.id)} className={`p-1.5 rounded-xl ${isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`} title={r.enabled ? '停用' : '启用'}>
                          <Power size={16} />
                        </button>
                        <button type="button" onClick={() => openEdit(r)} className={`px-2 py-1 rounded-xl text-xs font-medium ${isDark ? 'text-blue-400 hover:bg-white/10' : 'text-blue-600 hover:bg-blue-50'}`}>编辑</button>
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑模型配置' : '新增模型配置'}
        theme={theme}
        size="lg"
        footer={
          <>
            <button className={btnSecondary(theme)} onClick={() => setModalOpen(false)}>取消</button>
            <button className={btnPrimary} onClick={saveForm}>
              <Save size={16} className="inline mr-1" />
              保存
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>显示名称</label>
            <input className={input} value={draft.name} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="如 GPT-4.1" />
          </div>
          <div>
            <label className={labelCls}>提供商</label>
            <select className={sel} value={draft.provider} onChange={(e) => setDraft(d => ({ ...d, provider: e.target.value }))}>
              <option>OpenAI</option>
              <option>阿里云百炼</option>
              <option>百度千帆</option>
              <option>Azure</option>
              <option>本地 vLLM</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>模型 ID</label>
            <input className={input} value={draft.modelId} onChange={(e) => setDraft(d => ({ ...d, modelId: e.target.value }))} placeholder="如 gpt-4.1-mini" />
          </div>
          <div>
            <label className={labelCls}>模型类型</label>
            <select className={sel} value={draft.modelType} onChange={(e) => setDraft(d => ({ ...d, modelType: e.target.value as LocalModelConfig['modelType'] }))}>
              <option value="chat">对话 (chat)</option>
              <option value="embedding">向量 (embedding)</option>
              <option value="image">图像 (image)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>API Base / 接入地址</label>
            <input className={input} value={draft.endpoint} onChange={(e) => setDraft(d => ({ ...d, endpoint: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Max Tokens</label>
            <input className={input} type="number" value={draft.maxTokens} onChange={(e) => setDraft(d => ({ ...d, maxTokens: Number(e.target.value) || 0 }))} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft(d => ({ ...d, enabled: e.target.checked }))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>启用</span>
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
