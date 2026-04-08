import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Save, Users } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { MultiAvatar } from '../../components/common/MultiAvatar';
import { SearchInput, FilterSelect, Pagination } from '../../components/common';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { MgmtBatchToolbar } from '../../components/management/MgmtBatchToolbar';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { UserRecord, RoleRecord } from '../../types/dto/user-mgmt';
import {
  btnPrimary, btnSecondary,
  mgmtTableActionDanger, mgmtTableActionGhost, mgmtTableRowActions,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from './MgmtPageShell';
import { useUserRole } from '../../context/UserRoleContext';
import { useMessage } from '../../components/common/Message';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';

interface UserListPageProps {
  theme: Theme;
  fontSize: FontSize;
  breadcrumbBase: string[];
}

type ViewMode = 'list' | 'create' | 'edit';

const emptyForm = (): { username: string; email: string; password: string; role: string; status: 'active' | 'disabled' } => ({
  username: '', email: '', password: '', role: '', status: 'active',
});

const PAGE_SIZE = 20;
const USER_LIST_DESC = '管理平台用户账号、状态与角色绑定';
const USER_LIST_DESC_REVIEW = '用户目录（只读）：可检索账号信息，不含编辑与角色绑定入口';
const innerTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };
function safeText(v: unknown): string { return String(v ?? ''); }

export const UserListPage: React.FC<UserListPageProps> = ({ theme, fontSize, breadcrumbBase }) => {
  const { showMessage } = useMessage();
  const { hasPermission } = useUserRole();
  const canMutateUsers = hasPermission('user:create') || hasPermission('user:update');
  const listDescription = canMutateUsers ? USER_LIST_DESC : USER_LIST_DESC_REVIEW;
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [form, setForm] = useState(emptyForm());
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchDisableConfirm, setBatchDisableConfirm] = useState(false);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  useEffect(() => {
    clearSelection();
  }, [page, search, statusFilter, clearSelection]);

  const listSegments = useMemo(() => [...breadcrumbBase, '用户列表'] as const, [breadcrumbBase]);
  const formSegments = useMemo(
    () => [...breadcrumbBase, mode === 'create' ? '新增用户' : '编辑用户'] as const,
    [breadcrumbBase, mode],
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const usersResult = await userMgmtService.listUsers({
        page,
        pageSize: PAGE_SIZE,
        keyword: search.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setUsers(usersResult.list);
      setTotalUsers(usersResult.total ?? usersResult.list.length);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载用户列表失败'));
    } finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!canMutateUsers) return;
    let cancelled = false;
    void userMgmtService.listRoles()
      .then((rows) => { if (!cancelled) setRoles(rows); })
      .catch((err) => console.error('Failed to load roles:', err));
    return () => { cancelled = true; };
  }, [canMutateUsers]);

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const paginated = useMemo(() => users, [users]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const selectedUsers = useMemo(
    () => paginated.filter((u) => selectedKeys.has(String(u.id))),
    [paginated, selectedKeys],
  );

  const runBatchSetStatus = useCallback(
    async (status: 'active' | 'disabled') => {
      const targets = selectedUsers.filter((u) => u.status !== 'locked');
      const ids = targets.map((u) => u.id);
      if (!ids.length) {
        showMessage('所选账号中没有可变更状态的记录（已锁定账号需单独处理）', 'info');
        return;
      }
      setBatchBusy(true);
      try {
        await userMgmtService.batchPatchUsers(ids, { status });
        showMessage(status === 'active' ? '已批量启用' : '已批量停用', 'success');
        clearSelection();
        setBatchDisableConfirm(false);
        await fetchUsers();
      } catch (err) {
        showMessage(err instanceof Error ? err.message : '批量操作失败', 'error');
      } finally {
        setBatchBusy(false);
      }
    },
    [selectedUsers, fetchUsers, showMessage, clearSelection],
  );

  const openCreate = useCallback(() => { setForm(emptyForm()); setEditingId(null); setMode('create'); }, []);
  const openEdit = useCallback((u: UserRecord) => {
    setEditingId(u.id);
    setForm({ username: u.username, email: u.email, password: '', role: u.role, status: u.status === 'locked' ? 'disabled' : u.status });
    setMode('edit');
  }, []);

  const userColumns = useMemo<MgmtDataTableColumn<UserRecord>[]>(() => {
    const base: MgmtDataTableColumn<UserRecord>[] = [
      {
        id: 'user',
        header: '用户',
        cell: (u) => (
          <div className="flex items-center gap-2 min-w-0">
            <MultiAvatar seed={`${u.id}-${u.username}`} alt={u.username} className="w-8 h-8 rounded-lg border border-white/10 shrink-0" />
            <span className={`font-semibold truncate ${textPrimary(theme)}`} title={u.username}>{u.username}</span>
          </div>
        ),
      },
      {
        id: 'role',
        header: '角色',
        cell: (u) => (
          <span className={`inline-flex shrink-0 items-center whitespace-nowrap text-xs px-2 py-0.5 rounded ${isDark ? 'bg-neutral-900/10 text-neutral-300' : 'bg-neutral-100 text-neutral-900'}`}>
            {safeText(u.role) || '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: '状态',
        cell: (u) => (
          <span
            className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              u.status === 'active'
                ? isDark
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60'
                : u.status === 'locked'
                  ? isDark
                    ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'
                  : isDark
                    ? 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20'
                    : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60'
            }`}
          >
            {u.status === 'active' ? '启用' : u.status === 'locked' ? '已锁定' : '停用'}
          </span>
        ),
      },
      {
        id: 'email',
        header: '邮箱',
        cellClassName: 'max-w-[10rem]',
        cell: (u) => (
          <span className={`block truncate ${textSecondary(theme)}`} title={safeText(u.email)}>{safeText(u.email) || '—'}</span>
        ),
      },
      {
        id: 'phone',
        header: '手机',
        cell: (u) => <span className={textSecondary(theme)}>{safeText(u.phone) || '—'}</span>,
      },
      {
        id: 'dept',
        header: '部门',
        cellClassName: 'max-w-[8rem]',
        cell: (u) => (
          <span className={`block truncate ${textSecondary(theme)}`} title={safeText(u.department)}>{safeText(u.department) || '—'}</span>
        ),
      },
      {
        id: 'lastLogin',
        header: '最后登录',
        cell: (u) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(u.lastLoginAt)}</span>,
      },
      {
        id: 'created',
        header: '创建时间',
        cell: (u) => <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(u.createdAt)}</span>,
      },
    ];
    if (!canMutateUsers) return base;
    return [
      ...base,
      {
        id: 'actions',
        header: '操作',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        cellNowrap: true,
        cell: (u) => (
          <div className={mgmtTableRowActions}>
            <button type="button" onClick={() => openEdit(u)} className={mgmtTableActionGhost(theme)} aria-label={`编辑用户 ${u.username}`}>
              编辑
            </button>
            <button type="button" onClick={() => setDeleteTarget(u.id)} className={mgmtTableActionDanger} aria-label={`删除用户 ${u.username}`}>
              删除
            </button>
          </div>
        ),
      },
    ];
  }, [theme, isDark, canMutateUsers, openEdit]);

  const saveUser = async () => {
    if (!form.username.trim() || !form.email.trim()) return;
    try {
      if (mode === 'create') {
        await userMgmtService.createUser({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password || 'temp123456',
          role: form.role || roles[0]?.code || 'user',
        });
        showMessage('用户创建成功', 'success');
      } else if (mode === 'edit' && editingId) {
        await userMgmtService.updateUser(editingId, {
          username: form.username.trim(),
          email: form.email.trim(),
          role: form.role,
          status: form.status,
        } as any);
        showMessage('用户更新成功', 'success');
      }
      setMode('list');
      setEditingId(null);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showMessage(err instanceof Error ? err.message : '保存失败，请重试', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await userMgmtService.deleteUser(deleteTarget);
      if (editingId === deleteTarget) {
        setMode('list');
        setEditingId(null);
      }
      setDeleteTarget(null);
      await fetchUsers();
      showMessage('删除成功', 'success');
    } catch (err) {
      console.error(err);
      showMessage(err instanceof Error ? err.message : '删除失败，请重试', 'error');
    }
  };

  const labelCls = `block text-xs font-semibold mb-1 ${textSecondary(theme)}`;

  if (mode !== 'list') {
    return (
      <>
        <MgmtPageShell
          theme={theme}
          fontSize={fontSize}
          titleIcon={Users}
          breadcrumbSegments={formSegments}
          description={listDescription}
          contentScroll="document"
        >
          <div className="px-4 sm:px-6 pb-8 max-w-xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setMode('list'); setEditingId(null); }} className={btnSecondary(theme)} aria-label="返回用户列表">
                <ArrowLeft size={15} aria-hidden /> 返回列表
              </button>
              <button type="button" onClick={saveUser} className={btnPrimary} aria-label="保存用户">
                <Save size={15} aria-hidden /> 保存
              </button>
            </div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={innerTransition} className="space-y-4">
              <div><label className={labelCls}>用户名</label><input className={nativeInputClass(theme)} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="登录名" /></div>
              <div><label className={labelCls}>邮箱</label><input type="email" className={nativeInputClass(theme)} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@school.edu.cn" /></div>
              <div>
                <label className={labelCls}>角色</label>
                <LantuSelect
                  theme={theme}
                  value={form.role}
                  onChange={(v) => setForm((f) => ({ ...f, role: v }))}
                  options={roles.map((r) => ({ value: r.code, label: r.name }))}
                  placeholder="选择角色"
                />
              </div>
              <div>
                <label className={labelCls}>状态</label>
                <LantuSelect
                  theme={theme}
                  value={form.status}
                  onChange={(v) => setForm((f) => ({ ...f, status: v as 'active' | 'disabled' }))}
                  options={[
                    { value: 'active', label: '启用' },
                    { value: 'disabled', label: '停用' },
                  ]}
                />
              </div>
            </motion.div>
          </div>
        </MgmtPageShell>
        <ConfirmDialog open={!!deleteTarget} title="删除用户" message="确定删除该用户？" confirmText="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      </>
    );
  }

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Users}
        breadcrumbSegments={listSegments}
        description={listDescription}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 justify-between min-w-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
              <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }} options={[{ value: 'all', label: '全部状态' }, { value: 'active', label: '仅启用' }, { value: 'disabled', label: '仅停用' }]} theme={theme} className="w-full sm:w-32 shrink-0" />
              <div className="flex-1 min-w-[min(100%,200px)]"><SearchInput value={search} onChange={setSearch} placeholder="搜索用户名、邮箱或角色…" theme={theme} /></div>
            </div>
            {canMutateUsers ? (
              <button type="button" onClick={openCreate} className={`shrink-0 ${btnPrimary}`} aria-label="新增用户">
                <Plus size={15} aria-hidden /> 新增用户
              </button>
            ) : null}
          </div>
        }
      >
        <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0 flex-1">
          {totalUsers > 0 ? (
            <p className={`text-xs mb-2 ${textMuted(theme)}`}>共 {totalUsers} 个用户</p>
          ) : null}
          {loading && users.length === 0 ? (
            <PageSkeleton type="table" />
          ) : loadError ? (
            <PageError error={loadError} onRetry={fetchUsers} retryLabel="重试加载用户列表" />
          ) : paginated.length === 0 ? (
            <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>暂无匹配用户</div>
          ) : (
            <>
              {canMutateUsers ? (
                <MgmtBatchToolbar theme={theme} count={selectedKeys.size} onClear={clearSelection}>
                  <button
                    type="button"
                    disabled={batchBusy || selectedKeys.size === 0}
                    className={mgmtTableActionPositive(theme)}
                    onClick={() => void runBatchSetStatus('active')}
                  >
                    批量启用
                  </button>
                  <button
                    type="button"
                    disabled={batchBusy || selectedKeys.size === 0}
                    className={btnSecondary(theme)}
                    onClick={() => setBatchDisableConfirm(true)}
                  >
                    批量停用
                  </button>
                </MgmtBatchToolbar>
              ) : null}
              <MgmtDataTable<UserRecord>
                theme={theme}
                surface="plain"
                minWidth="1100px"
                columns={userColumns}
                rows={paginated}
                getRowKey={(u) => String(u.id)}
                selection={
                  canMutateUsers
                    ? {
                        selectedKeys,
                        onSelectionChange: setSelectedKeys,
                        getSelectable: (u) => u.status !== 'locked',
                      }
                    : undefined
                }
              />
            </>
          )}
          <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={totalUsers} onChange={setPage} />
        </div>
      </MgmtPageShell>
      <ConfirmDialog open={!!deleteTarget} title="删除用户" message="确定删除该用户？" confirmText="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <ConfirmDialog
        open={batchDisableConfirm}
        title="批量停用用户"
        message={`将停用已选中的 ${selectedKeys.size} 个账号（已锁定项已自动排除）。确认继续？`}
        variant="warning"
        confirmText="停用"
        loading={batchBusy}
        onConfirm={() => void runBatchSetStatus('disabled')}
        onCancel={() => setBatchDisableConfirm(false)}
      />
    </>
  );
};
