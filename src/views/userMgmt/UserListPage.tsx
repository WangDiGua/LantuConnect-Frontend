import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from './MgmtPageShell';
import { MOCK_USERS, MgmtUser, MOCK_ROLES } from '../../constants/userMgmt';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { TOOLBAR_ROW } from '../../utils/toolbarFieldClasses';
import { Plus, ArrowLeft, Save, Trash2, Users } from 'lucide-react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DataTable, SearchInput, FilterSelect, type Column, type RowAction } from '../../components/common';

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

const PAGE_SIZE = 20;

export const UserListPage: React.FC<UserListPageProps> = ({ theme, fontSize, breadcrumbBase }) => {
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<MgmtUser[]>(() => [...MOCK_USERS]);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [form, setForm] = useState(() => emptyForm());
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

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

  const handleDelete = () => {
    if (!deleteTarget) return;
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget));
    if (editingId === deleteTarget) {
      setMode('list');
      setEditingId(null);
    }
    setDeleteTarget(null);
    setPage(1);
  };

  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`;

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
        <div className="flex-1 min-w-0 sm:max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="搜索用户名、邮箱或角色…"
            theme={theme}
          />
        </div>
        <FilterSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as typeof statusFilter)}
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'active', label: '仅启用' },
            { value: 'disabled', label: '仅停用' },
          ]}
          theme={theme}
          className="w-full sm:w-[8.5rem] shrink-0"
        />
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
              {filtered.length === 0 ? (
                <p className={`text-center py-12 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  暂无匹配用户
                </p>
              ) : (
                <DataTable<MgmtUser>
                  columns={[
                    {
                      key: 'username',
                      label: '用户名',
                      render: (value) => <span className="font-medium">{value}</span>,
                    },
                    {
                      key: 'email',
                      label: '邮箱',
                    },
                    {
                      key: 'roleName',
                      label: '角色',
                    },
                    {
                      key: 'status',
                      label: '状态',
                      render: (value) => (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            value === 'active'
                              ? isDark
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-emerald-100 text-emerald-800'
                              : isDark
                                ? 'bg-slate-600/40 text-slate-300'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {value === 'active' ? '启用' : '停用'}
                        </span>
                      ),
                    },
                    {
                      key: 'lastLogin',
                      label: '最近登录',
                    },
                  ]}
                  data={paginated}
                  theme={theme}
                  rowActions={[
                    {
                      label: '编辑',
                      onClick: (row) => openEdit(row),
                    },
                    {
                      label: '删除',
                      onClick: (row) => setDeleteTarget(row.id),
                      icon: <Trash2 size={16} />,
                      variant: 'danger',
                    },
                  ]}
                  pagination={
                    filtered.length > 0
                      ? {
                          currentPage: page,
                          totalPages: Math.ceil(filtered.length / PAGE_SIZE),
                          onPageChange: setPage,
                          pageSize: PAGE_SIZE,
                        }
                      : undefined
                  }
                />
              )}
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
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除用户"
        message="确定删除该用户？"
        confirmText="删除"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MgmtPageShell>
  );
};
