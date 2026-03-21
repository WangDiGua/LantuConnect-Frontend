import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, Save, Trash2, Users, ChevronLeft, ChevronRight, Edit2, MoreHorizontal, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AnimatedList } from '../../components/common/AnimatedList';
import { SearchInput, FilterSelect } from '../../components/common';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { UserRecord, RoleRecord } from '../../types/dto/user-mgmt';
import {
  pageBg, bentoCard, bentoCardHover, btnPrimary, btnSecondary, btnGhost,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

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

export const UserListPage: React.FC<UserListPageProps> = ({ theme, fontSize, breadcrumbBase }) => {
  const isDark = theme === 'dark';
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [form, setForm] = useState(emptyForm());
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResult, rolesResult] = await Promise.all([userMgmtService.listUsers(), userMgmtService.listRoles()]);
      setUsers(usersResult.list); setRoles(rolesResult);
    } catch (err) { console.error('Failed to load users:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      return u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
    });
  }, [users, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => { const start = (page - 1) * PAGE_SIZE; return filtered.slice(start, start + PAGE_SIZE); }, [filtered, page]);

  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setMode('create'); };
  const openEdit = (u: UserRecord) => { setEditingId(u.id); setForm({ username: u.username, email: u.email, password: '', role: u.role, status: u.status === 'locked' ? 'disabled' : u.status }); setMode('edit'); };

  const saveUser = async () => {
    if (!form.username.trim() || !form.email.trim()) return;
    try {
      if (mode === 'create') await userMgmtService.createUser({ username: form.username.trim(), email: form.email.trim(), password: form.password || 'temp123456', role: form.role || roles[0]?.code || 'user' });
      else if (mode === 'edit' && editingId) await userMgmtService.updateUser(editingId, { username: form.username.trim(), email: form.email.trim(), role: form.role });
      setMode('list'); setEditingId(null); await fetchUsers();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await userMgmtService.deleteUser(deleteTarget);
      if (editingId === deleteTarget) { setMode('list'); setEditingId(null); }
      setDeleteTarget(null); setPage(1); await fetchUsers();
    } catch (err) { console.error(err); }
  };

  const labelCls = `block text-xs font-semibold mb-1 ${textSecondary(theme)}`;

  if (mode !== 'list') {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
        <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setMode('list'); setEditingId(null); }} className={btnSecondary(theme)}><ArrowLeft size={15} /> 返回列表</button>
            <button type="button" onClick={saveUser} className={btnPrimary}><Save size={15} /> 保存</button>
          </div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={innerTransition} className="space-y-4">
            <div><label className={labelCls}>用户名</label><input className={nativeInputClass(theme)} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="登录名" /></div>
            <div><label className={labelCls}>邮箱</label><input type="email" className={nativeInputClass(theme)} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="user@school.edu.cn" /></div>
            <div><label className={labelCls}>角色</label><select className={nativeSelectClass(theme)} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>{roles.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)}</select></div>
            <div><label className={labelCls}>状态</label><select className={nativeSelectClass(theme)} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'disabled' }))}><option value="active">启用</option><option value="disabled">停用</option></select></div>
          </motion.div>
        </div>
        <ConfirmDialog open={!!deleteTarget} title="删除用户" message="确定删除该用户？" confirmText="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${bentoCard(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}><Users size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} /></div>
              <div>
                <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>用户管理</h1>
                {filtered.length > 0 && <span className={`text-xs ${textMuted(theme)}`}>共 {filtered.length} 个</span>}
              </div>
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

          {/* Card rows */}
          <div className="flex-1 min-h-0 overflow-auto">
            {loading && users.length === 0 ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
            ) : paginated.length === 0 ? (
              <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>暂无匹配用户</div>
            ) : (
              <AnimatedList className="p-3 space-y-2">
                {paginated.map((u) => (
                  <motion.div key={u.id} whileHover={{ y: -2 }} transition={innerTransition} className={`${bentoCardHover(theme)} p-4 flex items-center gap-4`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${textPrimary(theme)}`}>{u.username}</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${u.status === 'active' ? (isDark ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60') : (isDark ? 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20' : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60')}`}>
                          {u.status === 'active' ? '启用' : '停用'}
                        </span>
                      </div>
                      <div className={`text-xs mt-0.5 truncate ${textMuted(theme)}`}>{u.email} · {u.role}</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => openEdit(u)} className={btnGhost(theme)} title="编辑"><Edit2 size={15} /></button>
                      <button type="button" onClick={() => setDeleteTarget(u.id)} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`} title="删除"><Trash2 size={15} /></button>
                    </div>
                  </motion.div>
                ))}
              </AnimatedList>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={`text-sm ${textMuted(theme)}`}>共 {filtered.length} 条</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`p-2 rounded-xl transition-colors ${page <= 1 ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronLeft size={16} /></button>
                <span className={`text-xs font-medium ${textSecondary(theme)}`}>{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={`p-2 rounded-xl transition-colors ${page >= totalPages ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="删除用户" message="确定删除该用户？" confirmText="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};
