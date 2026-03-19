import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MOCK_RATE_LIMIT_RULES, RateLimitRule } from '../../constants/systemConfig';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, Save, Trash2, Power, Sliders } from 'lucide-react';

interface RateLimitPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

const emptyRule = (): Omit<RateLimitRule, 'id'> => ({
  name: '',
  pathPattern: '/api/*',
  qpm: 1000,
  burst: 50,
  enabled: true,
});

export const RateLimitPage: React.FC<RateLimitPageProps> = ({
  theme,
  fontSize,
  showMessage,
  breadcrumbSegments,
}) => {
  const isDark = theme === 'dark';
  const [rules, setRules] = useState<RateLimitRule[]>(() => [...MOCK_RATE_LIMIT_RULES]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyRule);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.pathPattern.toLowerCase().includes(q);
    });
  }, [rules, search]);

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft(emptyRule());
  };

  const startEdit = (r: RateLimitRule) => {
    setCreating(false);
    setEditingId(r.id);
    setDraft({
      name: r.name,
      pathPattern: r.pathPattern,
      qpm: r.qpm,
      burst: r.burst,
      enabled: r.enabled,
    });
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
  };

  const saveForm = () => {
    if (!draft.name.trim() || !draft.pathPattern.trim()) {
      showMessage('请填写策略名称与路径模式', 'error');
      return;
    }
    if (draft.qpm < 1 || draft.burst < 1) {
      showMessage('QPM 与突发值须为正数', 'error');
      return;
    }
    if (creating) {
      setRules((prev) => [
        ...prev,
        {
          id: `rl-${Date.now()}`,
          ...draft,
          name: draft.name.trim(),
          pathPattern: draft.pathPattern.trim(),
        },
      ]);
      showMessage('已添加限流策略', 'success');
    } else if (editingId) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                ...draft,
                name: draft.name.trim(),
                pathPattern: draft.pathPattern.trim(),
              }
            : r
        )
      );
      showMessage('已保存', 'success');
    }
    cancelForm();
  };

  const toggle = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    showMessage('已更新策略状态', 'info');
  };

  const remove = (id: string) => {
    if (!confirm('确定删除该策略？')) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) cancelForm();
    showMessage('已删除', 'info');
  };

  const input = nativeInputClass(theme);
  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

  const formPanel =
    creating || editingId ? (
      <div
        className={`shrink-0 border-b px-4 sm:px-6 py-4 ${isDark ? 'border-white/10 bg-[#2C2C2E]/30' : 'border-slate-200 bg-slate-50/80'}`}
      >
        <div className="text-sm font-semibold mb-3">{creating ? '新建限流策略' : '编辑限流策略'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className={labelCls}>策略名称</label>
            <input className={input} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>路径模式</label>
            <input
              className={input}
              value={draft.pathPattern}
              onChange={(e) => setDraft((d) => ({ ...d, pathPattern: e.target.value }))}
              placeholder="/api/agent/*/invoke"
            />
          </div>
          <div>
            <label className={labelCls}>每分钟请求上限 (QPM)</label>
            <input
              type="number"
              min={1}
              className={input}
              value={draft.qpm}
              onChange={(e) => setDraft((d) => ({ ...d, qpm: Number(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className={labelCls}>突发容量 (Burst)</label>
            <input
              type="number"
              min={1}
              className={input}
              value={draft.burst}
              onChange={(e) => setDraft((d) => ({ ...d, burst: Number(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id="rl-en"
              checked={draft.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <label htmlFor="rl-en" className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
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
      titleIcon={Sliders}
      description="按路径模式配置 QPM 与突发，保护核心接口（演示数据，仅前端）"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="搜索策略名或路径…"
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
            新建策略
          </button>
        </div>
      }
    >
      {formPanel}
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead>
              <tr
                className={`border-b ${
                  isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>名称</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>路径模式</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>QPM</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Burst</th>
                <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>状态</th>
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
                  <td
                    className={`px-4 py-3 font-mono text-xs max-w-[280px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                    title={r.pathPattern}
                  >
                    {r.pathPattern}
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{r.qpm}</td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{r.burst}</td>
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
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1 justify-end">
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
