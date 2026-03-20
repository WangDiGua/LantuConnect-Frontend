import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from './MgmtPageShell';
import { MOCK_ROLES, MgmtRole, PERMISSION_PRESETS } from '../../constants/userMgmt';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, ArrowLeft, Save, Trash2, Fingerprint } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';

interface RoleListPageProps {
  theme: Theme;
  fontSize: FontSize;
  breadcrumbBase: string[];
}

type ViewMode = 'list' | 'create' | 'edit';

function permissionsFromPresets(presetIds: Set<string>): string[] {
  return Array.from(presetIds).map((id) => `${id}:*`);
}

function presetsFromPermissions(perms: string[]): Set<string> {
  const s = new Set<string>();
  for (const p of perms) {
    const base = p.split(':')[0];
    if (PERMISSION_PRESETS.some((x) => x.id === base)) s.add(base);
  }
  return s;
}

const emptyForm = () => ({
  name: '',
  code: '',
  description: '',
  presetIds: new Set<string>(['agent', 'audit']),
});

const innerTransition = { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const };
const PAGE_SIZE = 20;

export const RoleListPage: React.FC<RoleListPageProps> = ({ theme, fontSize, breadcrumbBase }) => {
  const isDark = theme === 'dark';
  const [roles, setRoles] = useState<MgmtRole[]>(() => MOCK_ROLES.map((r) => ({ ...r })));
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const inputCls = nativeInputClass(theme);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((r) => {
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    });
  }, [roles, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setMode('create');
  };

  const openEdit = (r: MgmtRole) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      code: r.code,
      description: r.description,
      presetIds: presetsFromPermissions(r.permissions),
    });
    setMode('edit');
  };

  const togglePreset = (id: string) => {
    setForm((f) => {
      const next = new Set(f.presetIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...f, presetIds: next };
    });
  };

  const saveRole = () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const permissions = permissionsFromPresets(form.presetIds);
    if (mode === 'create') {
      const id = `r-${Date.now()}`;
      setRoles((prev) => [
        ...prev,
        {
          id,
          name: form.name.trim(),
          code: form.code.trim().replace(/\s+/g, '_').toLowerCase(),
          description: form.description.trim() || '—',
          userCount: 0,
          permissions,
        },
      ]);
    } else if (mode === 'edit' && editingId) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                name: form.name.trim(),
                code: form.code.trim().replace(/\s+/g, '_').toLowerCase(),
                description: form.description.trim() || r.description,
                permissions,
              }
            : r
        )
      );
    }
    setMode('list');
    setEditingId(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setRoles((prev) => prev.filter((r) => r.id !== deleteTarget));
    if (editingId === deleteTarget) {
      setMode('list');
      setEditingId(null);
    }
    setDeleteTarget(null);
    setPage(1);
  };

  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
  const searchCls = toolbarSearchInputClass(theme);

  const description =
    mode === 'list'
      ? '维护角色与权限范围，可与用户管理中的角色分配联动（演示数据）'
      : '配置角色标识与权限分组（演示：勾选即生成对应通配权限）';

  const breadcrumbSegments =
    mode === 'list'
      ? breadcrumbBase
      : [...breadcrumbBase, mode === 'create' ? '新建角色' : '编辑角色'];

  const toolbar =
    mode === 'list' ? (
      <div className={TOOLBAR_ROW}>
        <div className="relative flex-1 min-w-0 sm:max-w-md">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            size={16}
          />
          <input
            type="search"
            placeholder="搜索名称、代码或描述…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={searchCls}
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 min-h-[2.5rem] shrink-0"
        >
          <Plus size={16} />
          新建角色
        </button>
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('list');
            setEditingId(null);
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border ${
            isDark
              ? 'border-white/10 text-slate-200 hover:bg-white/5'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ArrowLeft size={16} />
          返回列表
        </button>
        <button
          type="button"
          onClick={saveRole}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          <Save size={16} />
          保存
        </button>
      </div>
    );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={Fingerprint}
      description={description}
      toolbar={toolbar}
    >
      <div className="relative min-w-0">
        <AnimatePresence mode="wait">
          {mode === 'list' ? (
            <motion.div
              key="role-list"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={innerTransition}
              className="w-full px-4 sm:px-6 pb-6 pt-1 min-w-0"
            >
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead>
                    <tr
                      className={`border-b ${
                        isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        名称
                      </th>
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        代码
                      </th>
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        描述
                      </th>
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        用户数
                      </th>
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        权限摘要
                      </th>
                      <th
                        className={`px-4 py-3 font-semibold text-right ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                      >
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`border-b transition-colors ${
                          isDark
                            ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'} hover:bg-white/5`
                            : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100/80`
                        }`}
                      >
                        <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {r.name}
                        </td>
                        <td className={`px-4 py-3 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {r.code}
                        </td>
                        <td className={`px-4 py-3 max-w-[200px] truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {r.description}
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{r.userCount}</td>
                        <td
                          className={`px-4 py-3 text-xs font-mono max-w-[220px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                        >
                          {r.permissions.join(', ')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              className={`px-2 py-1 rounded-xl text-xs font-medium ${
                                isDark ? 'text-blue-400 hover:bg-white/10' : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(r.id)}
                              className={`p-1 rounded-xl ${isDark ? 'text-red-400 hover:bg-white/10' : 'text-red-600 hover:bg-red-50'}`}
                              title="删除"
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
                <p className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  暂无匹配角色
                </p>
              ) : null}
              {filtered.length > 0 && (
                <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="role-form"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={innerTransition}
              className="w-full px-4 sm:px-6 pb-6 pt-1 max-w-2xl min-w-0"
            >
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>角色名称</label>
                  <input
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="如：学科助理"
                  />
                </div>
                <div>
                  <label className={labelCls}>角色代码</label>
                  <input
                    className={inputCls}
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="英文标识，如 subject_assistant"
                  />
                </div>
                <div>
                  <label className={labelCls}>描述</label>
                  <textarea
                rows={3}
                className={`${inputCls} min-h-[5.5rem]`}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="简要说明该角色的使用场景"
                  />
                </div>
                <div>
                  <span className={labelCls}>权限分组</span>
                  <div
                    className={`rounded-xl border p-3 space-y-2 ${
                      isDark ? 'border-white/10 bg-[#2C2C2E]/50' : 'border-slate-200 bg-slate-50/80'
                    }`}
                  >
                    {PERMISSION_PRESETS.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 cursor-pointer rounded-lg px-2 py-2 ${
                          isDark ? 'hover:bg-white/5' : 'hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.presetIds.has(p.id)}
                          onChange={() => togglePreset(p.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{p.label}</span>
                        <span className={`text-xs ml-auto font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          {p.id}:*
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除角色"
        message="确定删除该角色？已分配用户的角色需先调整。"
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MgmtPageShell>
  );
};
