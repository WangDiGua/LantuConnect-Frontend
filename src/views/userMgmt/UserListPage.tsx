import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from './MgmtPageShell';
import { MOCK_USERS, MgmtUser, MOCK_ROLES } from '../../constants/userMgmt';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, ArrowLeft, Save, Trash2, Users } from 'lucide-react';

interface UserListPageProps {
  theme: Theme;
  fontSize: FontSize;
  /** 面包屑前缀，一般为 ['用户管理'] */
  breadcrumbBase: string[];
}

type ViewMode = 'list' | 'create' | 'edit';

const emptyForm = (): Pick<MgmtUser, 'username' | 'email' | 'roleId' | 'roleName' | 'status'> => ({
  username: '',
  email: '',
  roleId: MOCK_ROLES[0]?.id ?? '',
  roleName: MOCK_ROLES[0]?.name ?? '',
  status: 'active',
});

const innerTransition = { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const };

export const UserListPage: React.FC<UserListPageProps> = ({ theme, fontSize, breadcrumbBase }) => {
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<MgmtUser[]>(() => [...MOCK_USERS]);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [form, setForm] = useState(() => emptyForm());

  const roleById = (roleId: string) => MOCK_ROLES.find((r) => r.id === roleId);
  const inputCls = nativeInputClass(theme);
  const selectCls = nativeSelectClass(theme);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleName.toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setMode('create');
  };

  const openEdit = (u: MgmtUser) => {
    setEditingId(u.id);
    setForm({
      username: u.username,
      email: u.email,
      roleId: u.roleId,
      roleName: u.roleName,
      status: u.status,
    });
    setMode('edit');
  };

  const saveUser = () => {
    if (!form.username.trim() || !form.email.trim()) return;
    const r = roleById(form.roleId);
    const roleName = r?.name ?? form.roleName;
    if (mode === 'create') {
      const id = `u-${Date.now()}`;
      setUsers((prev) => [
        ...prev,
        {
          id,
          username: form.username.trim(),
          email: form.email.trim(),
          roleId: form.roleId,
          roleName,
          status: form.status,
          lastLogin: '—',
        },
      ]);
    } else if (mode === 'edit' && editingId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingId
            ? {
                ...u,
                username: form.username.trim(),
                email: form.email.trim(),
                roleId: form.roleId,
                roleName,
                status: form.status,
              }
            : u
        )
      );
    }
    setMode('list');
    setEditingId(null);
  };

  const deleteUser = (id: string) => {
    if (!confirm('确定删除该用户？')) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (editingId === id) {
      setMode('list');
      setEditingId(null);
    }
  };

  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
  const searchCls = `w-full pl-9 pr-3 py-2 rounded-xl border text-sm outline-none focus:ring-1 focus:ring-blue-500/30 ${
    isDark
      ? 'bg-[#2C2C2E] border-white/10 text-white placeholder:text-slate-500'
      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;

  const description =
    mode === 'list'
      ? '管理系统用户账号、角色与启用状态'
      : '填写登录名、邮箱并分配角色（演示数据，仅前端保存）';

  const breadcrumbSegments =
    mode === 'list'
      ? breadcrumbBase
      : [...breadcrumbBase, mode === 'create' ? '新增用户' : '编辑用户'];

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
            placeholder="搜索用户名、邮箱或角色…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={searchCls}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className={`${selectCls} w-full sm:w-[8.5rem] shrink-0`}
        >
          <option value="all">全部状态</option>
          <option value="active">仅启用</option>
          <option value="disabled">仅停用</option>
        </select>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 min-h-[2.5rem] shrink-0"
        >
          <Plus size={16} />
          新增用户
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
          onClick={saveUser}
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
      titleIcon={Users}
      description={description}
      toolbar={toolbar}
    >
      <div className="relative min-w-0">
        <AnimatePresence mode="wait">
          {mode === 'list' ? (
            <motion.div
              key="user-list"
              role="tabpanel"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={innerTransition}
              className="w-full px-4 sm:px-6 pb-6 pt-1 min-w-0"
            >
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-left text-sm min-w-[720px]">
                  <thead>
                    <tr
                      className={`border-b ${
                        isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        用户名
                      </th>
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        邮箱
                      </th>
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        角色
                      </th>
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        状态
                      </th>
                      <th className={`px-4 py-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        最近登录
                      </th>
                      <th
                        className={`px-4 py-3 font-semibold text-right ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                      >
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <tr
                        key={u.id}
                        className={`border-b transition-colors ${
                          isDark
                            ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'} hover:bg-white/5`
                            : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} hover:bg-slate-100/80`
                        }`}
                      >
                        <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {u.username}
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{u.email}</td>
                        <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{u.roleName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              u.status === 'active'
                                ? isDark
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-emerald-100 text-emerald-800'
                                : isDark
                                  ? 'bg-slate-600/40 text-slate-300'
                                  : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {u.status === 'active' ? '启用' : '停用'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{u.lastLogin}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              className={`px-2 py-1 rounded-xl text-xs font-medium ${
                                isDark ? 'text-blue-400 hover:bg-white/10' : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteUser(u.id)}
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
                  暂无匹配用户
                </p>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="user-form"
              role="tabpanel"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={innerTransition}
              className="w-full px-4 sm:px-6 pb-6 pt-1 max-w-xl min-w-0"
            >
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>用户名</label>
                  <input
                    className={inputCls}
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="登录名，如 zhangsan"
                  />
                </div>
                <div>
                  <label className={labelCls}>邮箱</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="user@school.edu.cn"
                  />
                </div>
                <div>
                  <label className={labelCls}>角色</label>
                  <select
                    className={selectCls}
                    value={form.roleId}
                    onChange={(e) => {
                      const roleId = e.target.value;
                      const role = roleById(roleId);
                      setForm((f) => ({
                        ...f,
                        roleId,
                        roleName: role?.name ?? f.roleName,
                      }));
                    }}
                  >
                    {MOCK_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>状态</label>
                  <select
                    className={selectCls}
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as 'active' | 'disabled' }))
                    }
                  >
                    <option value="active">启用</option>
                    <option value="disabled">停用</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MgmtPageShell>
  );
};
