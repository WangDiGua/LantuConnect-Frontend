import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Save, Trash2, Fingerprint, ChevronLeft, ChevronRight, Edit2, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { PERMISSION_PRESETS } from '../../constants/userMgmt';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AnimatedList } from '../../components/common/AnimatedList';
import { SearchInput } from '../../components/common';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { RoleRecord } from '../../types/dto/user-mgmt';
import {
  pageBg, bentoCard, bentoCardHover, btnPrimary, btnSecondary, btnGhost,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

interface RoleListPageProps { theme: Theme; fontSize: FontSize; breadcrumbBase: string[]; }
type ViewMode = 'list' | 'create' | 'edit';

function permissionsFromPresets(presetIds: Set<string>): string[] { return Array.from(presetIds).map((id) => `${id}:*`); }
function presetsFromPermissions(perms: string[]): Set<string> { const s = new Set<string>(); for (const p of perms) { const b = p.split(':')[0]; if (PERMISSION_PRESETS.some((x) => x.id === b)) s.add(b); } return s; }

const emptyForm = () => ({ name: '', code: '', description: '', presetIds: new Set<string>(['agent', 'audit']) });
const PAGE_SIZE = 20;
const springT = { type: 'spring' as const, stiffness: 400, damping: 30 };

export const RoleListPage: React.FC<RoleListPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => { setLoading(true); try { setRoles(await userMgmtService.listRoles()); } catch (err) { console.error(err); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return roles.filter((r) => !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)); }, [roles, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => { const s = (page - 1) * PAGE_SIZE; return filtered.slice(s, s + PAGE_SIZE); }, [filtered, page]);

  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setMode('create'); };
  const openEdit = (r: RoleRecord) => { setEditingId(r.id); setForm({ name: r.name, code: r.code, description: r.description, presetIds: presetsFromPermissions(r.permissions) }); setMode('edit'); };
  const togglePreset = (id: string) => setForm((f) => { const n = new Set(f.presetIds); if (n.has(id)) n.delete(id); else n.add(id); return { ...f, presetIds: n }; });

  const saveRole = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const permissions = permissionsFromPresets(form.presetIds);
    try {
      if (mode === 'create') await userMgmtService.createRole({ name: form.name.trim(), code: form.code.trim().replace(/\s+/g, '_').toLowerCase(), description: form.description.trim() || '—', permissions });
      else if (editingId) await userMgmtService.updateRole(editingId, { name: form.name.trim(), code: form.code.trim().replace(/\s+/g, '_').toLowerCase(), description: form.description.trim(), permissions });
      setMode('list'); setEditingId(null); await fetchRoles();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => { if (!deleteTarget) return; try { await userMgmtService.deleteRole(deleteTarget); if (editingId === deleteTarget) { setMode('list'); setEditingId(null); } setDeleteTarget(null); setPage(1); await fetchRoles(); } catch (err) { console.error(err); } };

  const labelCls = `block text-xs font-semibold mb-1 ${textSecondary(theme)}`;

  if (mode !== 'list') {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
        <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setMode('list'); setEditingId(null); }} className={btnSecondary(theme)}><ArrowLeft size={15} /> 返回列表</button>
            <button type="button" onClick={saveRole} className={btnPrimary}><Save size={15} /> 保存</button>
          </div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springT} className="space-y-4">
            <div><label className={labelCls}>角色名称</label><input className={nativeInputClass(theme)} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="如：学科助理" /></div>
            <div><label className={labelCls}>角色代码</label><input className={nativeInputClass(theme)} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="英文标识" /></div>
            <div><label className={labelCls}>描述</label><textarea rows={3} className={`${nativeInputClass(theme)} min-h-[5.5rem]`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="简要说明" /></div>
            <div>
              <span className={labelCls}>权限分组</span>
              <div className={`rounded-xl border p-3 space-y-2 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
                {PERMISSION_PRESETS.map((p) => (
                  <label key={p.id} className={`flex items-center gap-3 cursor-pointer rounded-lg px-2 py-2 ${isDark ? 'hover:bg-white/5' : 'hover:bg-white'}`}>
                    <input type="checkbox" checked={form.presetIds.has(p.id)} onChange={() => togglePreset(p.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className={`text-sm ${textSecondary(theme)}`}>{p.label}</span>
                    <span className={`text-xs ml-auto font-mono ${textMuted(theme)}`}>{p.id}:*</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
        <ConfirmDialog open={!!deleteTarget} title="删除角色" message="确定删除该角色？已分配用户的角色需先调整。" confirmText="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${bentoCard(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}><Fingerprint size={20} className={isDark ? 'text-violet-400' : 'text-violet-600'} /></div>
              <div>
                <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>角色管理</h1>
                {filtered.length > 0 && <span className={`text-xs ${textMuted(theme)}`}>共 {filtered.length} 个</span>}
              </div>
            </div>
            <button type="button" onClick={openCreate} className={btnPrimary}><Plus size={15} /> 新建角色</button>
          </div>
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <SearchInput value={search} onChange={setSearch} placeholder="搜索名称、代码或描述…" theme={theme} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {loading && roles.length === 0 ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
            ) : paginated.length === 0 ? (
              <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>暂无匹配角色</div>
            ) : (
              <AnimatedList className="p-3 space-y-2">
                {paginated.map((r) => (
                  <motion.div key={r.id} whileHover={{ y: -2 }} transition={springT} className={`${bentoCardHover(theme)} p-4 flex items-center gap-4`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${textPrimary(theme)}`}>{r.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>{r.code}</span>
                      </div>
                      <div className={`text-xs mt-0.5 truncate ${textMuted(theme)}`}>{r.description} · {r.userCount} 人</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => openEdit(r)} className={btnGhost(theme)} title="编辑"><Edit2 size={15} /></button>
                      <button type="button" onClick={() => setDeleteTarget(r.id)} className={`p-2 rounded-xl transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`} title="删除"><Trash2 size={15} /></button>
                    </div>
                  </motion.div>
                ))}
              </AnimatedList>
            )}
          </div>
          {totalPages > 1 && (
            <div className={`px-4 py-3 border-t shrink-0 flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <span className={`text-sm ${textMuted(theme)}`}>共 {filtered.length} 条</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`p-2 rounded-xl transition-colors ${page <= 1 ? (isDark ? 'text-slate-600' : 'text-slate-300') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronLeft size={16} /></button>
                <span className={`text-xs font-medium ${textSecondary(theme)}`}>{page} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={`p-2 rounded-xl transition-colors ${page >= totalPages ? (isDark ? 'text-slate-600' : 'text-slate-300') : (isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100')}`}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="删除角色" message="确定删除该角色？" confirmText="删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};
