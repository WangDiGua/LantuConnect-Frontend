import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Save, Trash2, Fingerprint, Edit2, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { PERMISSION_PRESETS } from '../../constants/userMgmt';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SearchInput, Pagination } from '../../components/common';
import { EmptyState } from '../../components/common/EmptyState';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { RoleRecord } from '../../types/dto/user-mgmt';
import {
  canvasBodyBg, bentoCard, bentoCardHover, btnPrimary, btnSecondary, btnGhost,
  textPrimary, textSecondary, textMuted, tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { formatDateTime } from '../../utils/formatDateTime';

interface RoleListPageProps { theme: Theme; fontSize: FontSize; breadcrumbBase: string[]; }
type ViewMode = 'list' | 'create' | 'edit';

function permissionsFromPresets(presetIds: Set<string>): string[] { return Array.from(presetIds).map((id) => `${id}:*`); }
function presetsFromPermissions(perms: string[]): Set<string> { const s = new Set<string>(); for (const p of perms) { const b = p.split(':')[0]; if (PERMISSION_PRESETS.some((x) => x.id === b)) s.add(b); } return s; }

const emptyForm = () => ({ name: '', code: '', description: '', presetIds: new Set<string>(['agent', 'audit']) });
const PAGE_SIZE = 20;
const springT = { type: 'spring' as const, stiffness: 400, damping: 30 };
function safeText(v: unknown): string { return String(v ?? ''); }

export const RoleListPage: React.FC<RoleListPageProps> = ({ theme }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      setRoles(await userMgmtService.listRoles());
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '角色列表加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((r) =>
      !q
      || safeText(r.name).toLowerCase().includes(q)
      || safeText(r.code).toLowerCase().includes(q)
      || safeText(r.description).toLowerCase().includes(q));
  }, [roles, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => { const s = (page - 1) * PAGE_SIZE; return filtered.slice(s, s + PAGE_SIZE); }, [filtered, page]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openCreate = () => { setForm(emptyForm()); setEditingId(null); setMode('create'); };
  const openEdit = (r: RoleRecord) => { setEditingId(r.id); setForm({ name: r.name, code: r.code, description: r.description, presetIds: presetsFromPermissions(r.permissions) }); setMode('edit'); };
  const togglePreset = (id: string) => setForm((f) => { const n = new Set(f.presetIds); if (n.has(id)) n.delete(id); else n.add(id); return { ...f, presetIds: n }; });

  const saveRole = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const editingRole = roles.find((r) => r.id === editingId);
    if (mode === 'edit' && editingRole?.isSystem) {
      setErrorMsg('系统内置角色不允许编辑');
      return;
    }
    const permissions = permissionsFromPresets(form.presetIds);
    setSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      if (mode === 'create') await userMgmtService.createRole({ name: form.name.trim(), code: form.code.trim().replace(/\s+/g, '_').toLowerCase(), description: form.description.trim() || '—', permissions });
      else if (editingId) await userMgmtService.updateRole(editingId, { name: form.name.trim(), code: form.code.trim().replace(/\s+/g, '_').toLowerCase(), description: form.description.trim(), permissions });
      setMode('list'); setEditingId(null); await fetchRoles();
      setInfoMsg(mode === 'create' ? '角色创建成功' : '角色更新成功');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '角色保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetRole = roles.find((r) => r.id === deleteTarget);
    if (targetRole?.isSystem) {
      setErrorMsg('系统内置角色不允许删除');
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await userMgmtService.deleteRole(deleteTarget);
      if (editingId === deleteTarget) { setMode('list'); setEditingId(null); }
      setDeleteTarget(null);
      setPage(1);
      await fetchRoles();
      setInfoMsg('角色已删除');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '角色删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const labelCls = `block text-xs font-semibold mb-1 ${textSecondary(theme)}`;

  if (mode !== 'list') {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
        <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setMode('list'); setEditingId(null); }} className={btnSecondary(theme)}><ArrowLeft size={15} /> 返回列表</button>
            <button type="button" onClick={saveRole} disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {saving ? '保存中…' : '保存'}
            </button>
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
                    <input type="checkbox" checked={form.presetIds.has(p.id)} onChange={() => togglePreset(p.id)} className="toggle toggle-primary toggle-sm" />
                    <span className={`text-sm ${textSecondary(theme)}`}>{p.label}</span>
                    <span className={`text-xs ml-auto font-mono ${textMuted(theme)}`}>{p.id}:*</span>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
        <div className={`${bentoCard(theme)} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}><Fingerprint size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} /></div>
              <PageTitleTagline
                subtitleOnly
                theme={theme}
                title={chromePageTitle || '角色管理'}
                suffix={filtered.length > 0 ? <span className={`text-xs font-normal ${textMuted(theme)}`}>共 {filtered.length} 个</span> : undefined}
              />
            </div>
            <button type="button" onClick={openCreate} className={btnPrimary}><Plus size={15} /> 新建角色</button>
          </div>
          <div className={`px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <SearchInput value={search} onChange={setSearch} placeholder="搜索名称、代码或描述…" theme={theme} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {errorMsg ? (
              <EmptyState title="角色数据加载失败" description={errorMsg} action={<button type="button" onClick={fetchRoles} className={btnSecondary(theme)}>重试</button>} />
            ) : loading && roles.length === 0 ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
            ) : paginated.length === 0 ? (
              <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>暂无匹配角色</div>
            ) : (
              <table className="w-full min-w-[1000px] text-sm">
                <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <tr>
                    <th className={tableHeadCell(theme)}>角色名称</th>
                    <th className={tableHeadCell(theme)}>角色代码</th>
                    <th className={tableHeadCell(theme)}>描述</th>
                    <th className={tableHeadCell(theme)}>用户数</th>
                    <th className={tableHeadCell(theme)}>系统内置</th>
                    <th className={tableHeadCell(theme)}>权限摘要</th>
                    <th className={tableHeadCell(theme)}>创建时间</th>
                    <th className={`${tableHeadCell(theme)} text-right`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r, idx) => (
                    <tr key={r.id} className={tableBodyRow(theme, idx)}>
                      <td className={`${tableCell()} font-medium ${textPrimary(theme)}`}>{r.name}</td>
                      <td className={tableCell()}>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-500'}`}>{r.code}</span>
                      </td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{safeText(r.description) || '—'}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{r.userCount}</td>
                      <td className={tableCell()}>
                        {r.isSystem ? (
                          <span className={`text-[11px] px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>是</span>
                        ) : (
                          <span className={textMuted(theme)}>否</span>
                        )}
                      </td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>
                        {r.permissions?.length > 0
                          ? <span title={r.permissions.join(', ')}>{r.permissions.slice(0, 3).join(', ')}{r.permissions.length > 3 ? ` +${r.permissions.length - 3}` : ''}</span>
                          : '—'}
                      </td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{formatDateTime(r.createdAt)}</td>
                      <td className={`${tableCell()} text-right`}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            disabled={r.isSystem}
                            className={btnGhost(theme)}
                            title={r.isSystem ? '系统内置角色不可编辑' : '编辑'}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r.id)}
                            disabled={r.isSystem}
                            className={`p-2 rounded-xl transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={r.isSystem ? '系统内置角色不可删除' : '删除'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className={`px-4 border-t shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
          </div>
        </div>
      </div>
      {infoMsg && (
        <div className={`mx-4 mb-2 text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{infoMsg}</div>
      )}
      {!errorMsg && (
        <ConfirmDialog open={!!deleteTarget} title="删除角色" message="确定删除该角色？" confirmText="删除" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
};
