import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MOCK_MODEL_CONFIGS, ModelConfigRow } from '../../constants/systemConfig';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, Save, Trash2, Power, FlaskConical, Cpu } from 'lucide-react';

interface ModelConfigPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

const emptyRow = (): Omit<ModelConfigRow, 'id'> => ({
  name: '',
  provider: 'OpenAI 兼容',
  modelId: '',
  endpoint: '',
  enabled: true,
});

export const ModelConfigPage: React.FC<ModelConfigPageProps> = ({
  theme,
  fontSize,
  showMessage,
  breadcrumbSegments,
}) => {
  const isDark = theme === 'dark';
  const [rows, setRows] = useState<ModelConfigRow[]>(() => [...MOCK_MODEL_CONFIGS]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyRow);
  const [creating, setCreating] = useState(false);

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
    setDraft(emptyRow());
  };

  const startEdit = (r: ModelConfigRow) => {
    setCreating(false);
    setEditingId(r.id);
    setDraft({
      name: r.name,
      provider: r.provider,
      modelId: r.modelId,
      endpoint: r.endpoint,
      enabled: r.enabled,
    });
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
  };

  const saveForm = () => {
    if (!draft.name.trim() || !draft.modelId.trim() || !draft.endpoint.trim()) {
      showMessage('请填写名称、模型 ID 与接入地址', 'error');
      return;
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    if (creating) {
      setRows((prev) => [
        ...prev,
        {
          id: `mc-${Date.now()}`,
          ...draft,
          name: draft.name.trim(),
          modelId: draft.modelId.trim(),
          endpoint: draft.endpoint.trim(),
          lastChecked: '—',
        },
      ]);
      showMessage('已添加模型配置', 'success');
    } else if (editingId) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                ...draft,
                name: draft.name.trim(),
                modelId: draft.modelId.trim(),
                endpoint: draft.endpoint.trim(),
              }
            : r
        )
      );
      showMessage('已保存', 'success');
    }
    cancelForm();
  };

  const toggle = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    showMessage('已更新启用状态', 'info');
  };

  const testConn = (id: string) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, lastChecked: now } : r)));
    showMessage('连接探测已发送（演示）', 'success');
  };

  const remove = (id: string) => {
    if (!confirm('确定删除该条配置？')) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) cancelForm();
    showMessage('已删除', 'info');
  };

  const input = nativeInputClass(theme);
  const sel = nativeSelectClass(theme);
  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

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
            <select
              className={sel}
              value={draft.provider}
              onChange={(e) => setDraft((d) => ({ ...d, provider: e.target.value }))}
            >
              <option>OpenAI 兼容</option>
              <option>Azure</option>
              <option>百度千帆</option>
              <option>本地 vLLM</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>模型 ID</label>
            <input
              className={input}
              value={draft.modelId}
              onChange={(e) => setDraft((d) => ({ ...d, modelId: e.target.value }))}
              placeholder="如 gpt-4.1-mini"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>API Base / 接入地址</label>
            <input
              className={input}
              value={draft.endpoint}
              onChange={(e) => setDraft((d) => ({ ...d, endpoint: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="mc-en"
              checked={draft.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <label htmlFor="mc-en" className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              启用
            </label>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={saveForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            <Save size={16} />
            保存
          </button>
          <button
            type="button"
            onClick={cancelForm}
            className={`px-4 py-2 rounded-xl text-sm border ${
              isDark ? 'border-white/10 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            取消
          </button>
        </div>
      </div>
    ) : null;

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={Cpu}
      description="管理大模型接入点、模型标识与启用状态；支持连接探测（演示，数据仅前端）"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="搜索名称、提供方、模型 ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={toolbarSearchInputClass(theme)}
            />
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 min-h-[2.5rem] shrink-0"
          >
            <Plus size={16} />
            新增配置
          </button>
        </div>
      }
    >
      {formPanel}
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[960px]">
            <thead>
              <tr
                className={`border-b ${
                  isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>名称</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>提供方</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>模型 ID</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>接入地址</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>状态</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>最近探测</th>
                <th className={`px-4 py-3 font-semibold text-right ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b transition-colors ${
                    isDark
                      ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'} hover:bg-white/5`
                      : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100/80`
                  }`}
                >
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{r.name}</td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{r.provider}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {r.modelId}
                  </td>
                  <td
                    className={`px-4 py-3 max-w-[220px] truncate font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    title={r.endpoint}
                  >
                    {r.endpoint}
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className={`px-4 py-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {r.lastChecked ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => toggle(r.id)}
                        className={`p-1.5 rounded-xl ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
                        title="启停"
                      >
                        <Power size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => testConn(r.id)}
                        className={`p-1.5 rounded-xl ${isDark ? 'text-blue-400 hover:bg-white/10' : 'text-blue-600 hover:bg-blue-50'}`}
                        title="探测"
                      >
                        <FlaskConical size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className={`px-2 py-1 rounded-xl text-xs font-medium ${isDark ? 'text-blue-400 hover:bg-white/10' : 'text-blue-600 hover:bg-blue-50'}`}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className={`p-1.5 rounded-xl ${isDark ? 'text-red-400 hover:bg-white/10' : 'text-red-600 hover:bg-red-50'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 ? (
          <p className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>无匹配项</p>
        ) : null}
      </div>
    </MgmtPageShell>
  );
};
