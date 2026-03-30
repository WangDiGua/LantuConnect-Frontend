import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Save, Trash2, Users, Edit2, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { MultiAvatar } from '../../components/common/MultiAvatar';
import { SearchInput, FilterSelect, Pagination } from '../../components/common';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { UserRecord, RoleRecord } from '../../types/dto/user-mgmt';
import {
  canvasBodyBg, bentoCard, bentoCardHover, btnPrimary, btnSecondary, btnGhost,
  textPrimary, textSecondary, textMuted, tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';
import { PageError } from '../../components/common/PageError';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { formatDateTime } from '../../utils/formatDateTime';

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
const innerTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };
function safeText(v: unknown): string { return String(v ?? ''); }

export const UserListPage: React.FC<UserListPageProps> = ({ theme, fontSize, breadcrumbBase }) => {
  const { chromePageTitle } = useLayoutChrome();
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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
    let cancelled = false;
    void userMgmtService.listRoles()
      .then((rows) => { if (!cancelled) setRoles(rows); })
      .catch((err) => console.error('Failed to load roles:', err));
    return () => { cancelled = true; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  const paginated = useMemo(() => users, [users]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setMode('create'); };
  const openEdit = (u: UserRecord) => { setEditingId(u.id); setForm({ username: u.username, email: u.email, password: '', role: u.role, status: u.status === 'locked' ? 'disabled' : u.status }); setMode('edit'); };

  const saveUser = async () => {
    if (!form.username.trim() || !form.email.trim()) return;
    try {
      if (mode === 'create') await userMgmtService.createUser({ username: form.username.trim(), email: form.email.trim(), password: form.password || 'temp123456', role: form.role || roles[0]?.code || 'user' });
      else if (mode === 'edit' && editingId) await userMgmtService.updateUser(editingId, { username: form.username.trim(), email: form.email.trim(), role: form.role, status: form.status } as any);
      setMode('list'); setEditingId(null); await fetchUsers();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await userMgmtService.deleteUser(deleteTarget);
      if (editingId === deleteTarget) { setMode('list'); setEditingId(null); }
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) { console.error(err); }
  };

  const labelCls = `block text-xs font-semibold mb-1 ${textSecondary(theme)}`;

  if (mode !== 'list') {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
        <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setMode('list'); setEditingId(null); }} className={btnSecondary(theme)}><ArrowLeft size={15} /> 返回列表</button>
            <button type="button" onClick={saveUser} className={btnPrimary}><Save size={15} /> 保存</button>
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
        <ConfirmDialog open={!!deleteTarget} title="删除用户" message="确定删除该用户？" confirmText="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${bentoCard(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}><Users size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} /></div>
              <PageTitleTagline
                subtitleOnly
                theme={theme}
                title={chromePageTitle || '用户管理'}
                suffix={totalUsers > 0 ? <span className={`text-xs font-normal ${textMuted(theme)}`}>共 {totalUsers} 个</span> : undefined}
              />
            </div>
            <button type="button" onClick={openCreate} className={btnPrimary}><Plus size={15} /> 新增用户</button>
          </div>

          {/* Filters */}
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }} options={[{ value: 'all', label: '全部状态' }, { value: 'active', label: '仅启用' }, { value: 'disabled', label: '仅停用' }]} theme={theme} className="w-full sm:w-32" />
              <div className="flex-1 min-w-[min(100%,200px)]"><SearchInput value={search} onChange={setSearch} placeholder="搜索用户名、邮箱或角色…" theme={theme} /></div>
            </div>
          </div>

          {/* Table rows */}
          <div className="flex-1 min-h-0 overflow-auto">
            {loading && users.length === 0 ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
            ) : loadError ? (
              <PageError error={loadError} onRetry={fetchUsers} retryLabel="重试加载用户列表" />
            ) : paginated.length === 0 ? (
              <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>暂无匹配用户</div>
            ) : (
              <table className="w-full min-w-[1100px] text-sm">
                <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <tr>
                    <th className={tableHeadCell(theme)}>用户</th>
                    <th className={tableHeadCell(theme)}>角色</th>
                    <th className={tableHeadCell(theme)}>状态</th>
                    <th className={tableHeadCell(theme)}>邮箱</th>
                    <th className={tableHeadCell(theme)}>手机</th>
                    <th className={tableHeadCell(theme)}>部门</th>
                    <th className={tableHeadCell(theme)}>最后登录</th>
                    <th className={tableHeadCell(theme)}>创建时间</th>
                    <th className={`${tableHeadCell(theme)} text-right`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u, idx) => (
                    <tr key={u.id} className={tableBodyRow(theme, idx)}>
                      <td className={tableCell()}>
                        <div className="flex items-center gap-2">
                          <MultiAvatar
                            seed={`${u.id}-${u.username}`}
                            alt={u.username}
                            className="w-8 h-8 rounded-lg border border-white/10 shrink-0"
                          />
                          <span className={`font-semibold ${textPrimary(theme)}`}>{u.username}</span>
                        </div>
                      </td>
                      <td className={tableCell()}>
                        <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-neutral-900/10 text-neutral-300' : 'bg-neutral-100 text-neutral-900'}`}>{safeText(u.role) || '—'}</span>
                      </td>
                      <td className={tableCell()}>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          u.status === 'active' ? (isDark ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60')
                          : u.status === 'locked' ? (isDark ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60')
                          : (isDark ? 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60')
                        }`}>
                          {u.status === 'active' ? '启用' : u.status === 'locked' ? '已锁定' : '停用'}
                        </span>
                      </td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{safeText(u.email) || '—'}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{safeText(u.phone) || '—'}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{safeText(u.department) || '—'}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{formatDateTime(u.lastLoginAt)}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{formatDateTime(u.createdAt)}</td>
                      <td className={`${tableCell()} text-right`}>
                        <div className="inline-flex items-center gap-1">
                          <button type="button" onClick={() => openEdit(u)} className={btnGhost(theme)} title="编辑"><Edit2 size={15} /></button>
                          <button type="button" onClick={() => setDeleteTarget(u.id)} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`} title="删除"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className={`px-4 border-t shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={totalUsers} onChange={setPage} />
          </div>
        </div>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="删除用户" message="确定删除该用户？" confirmText="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};
