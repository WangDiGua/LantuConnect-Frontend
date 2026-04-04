import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeft, Save, Fingerprint, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { PERMISSION_PRESETS } from '../../constants/userMgmt';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SearchInput, Pagination } from '../../components/common';
import { EmptyState } from '../../components/common/EmptyState';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import type { RoleRecord } from '../../types/dto/user-mgmt';
import {
  btnPrimary, btnSecondary,
  mgmtTableActionDanger, mgmtTableActionGhost,
  textPrimary, textSecondary, textMuted, tableHeadCell, tableBodyRow, tableCell,
  tableCellScrollInner,
} from '../../utils/uiClasses';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from './MgmtPageShell';

interface RoleListPageProps { theme: Theme; fontSize: FontSize; breadcrumbBase: string[]; }
type ViewMode = 'list' | 'create' | 'edit';

function permissionsFromPresets(presetIds: Set<string>): string[] { return Array.from(presetIds).map((id) => `${id}:*`); }
function presetsFromPermissions(perms: string[]): Set<string> { const s = new Set<string>(); for (const p of perms) { const b = p.split(':')[0]; if (PERMISSION_PRESETS.some((x) => x.id === b)) s.add(b); } return s; }

const emptyForm = () => ({ name: '', code: '', description: '', presetIds: new Set<string>(['agent', 'audit']) });
const PAGE_SIZE = 20;
const ROLE_LIST_DESC = '管理系统角色与权限分组预设';
const springT = { type: 'spring' as const, stiffness: 400, damping: 30 };
function safeText(v: unknown): string { return String(v ?? ''); }

export const RoleListPage: React.FC<RoleListPageProps> = ({ theme, fontSize, breadcrumbBase }) => {
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

  const listSegments = useMemo(() => [...breadcrumbBase] as const, [breadcrumbBase]);
  const formSegments = useMemo(
    () => [...breadcrumbBase, mode === 'create' ? '新建角色' : '编辑角色'] as const,
    [breadcrumbBase, mode],
  );

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
  useEffect(() => { void fetchRoles(); }, [fetchRoles]);

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
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Fingerprint}
        breadcrumbSegments={formSegments}
        description={ROLE_LIST_DESC}
        contentScroll="document"
      >
        <div className="px-4 sm:px-6 pb-8 max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setMode('list'); setEditingId(null); }} className={btnSecondary(theme)} aria-label="返回角色列表">
              <ArrowLeft size={15} aria-hidden /> 返回列表
            </button>
            <button type="button" onClick={() => void saveRole()} disabled={saving} className={btnPrimary} aria-label="保存角色">
              {saving ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Save size={15} aria-hidden />} {saving ? '保存中…' : '保存'}
            </button>
          </div>
          {errorMsg ? <p className={`text-sm ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{errorMsg}</p> : null}
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
      </MgmtPageShell>
    );
  }

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Fingerprint}
        breadcrumbSegments={listSegments}
        description={ROLE_LIST_DESC}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 justify-between min-w-0">
            <div className="min-w-0 flex-1 max-w-md">
              <SearchInput value={search} onChange={setSearch} placeholder="搜索名称、代码或描述…" theme={theme} />
            </div>
            <button type="button" onClick={openCreate} className={`shrink-0 ${btnPrimary}`} aria-label="新建角色">
              <Plus size={15} aria-hidden /> 新建角色
            </button>
          </div>
        }
      >
        <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0 flex-1">
          {infoMsg ? (
            <p className={`text-xs mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{infoMsg}</p>
          ) : null}
          {filtered.length > 0 ? (
            <p className={`text-xs mb-2 ${textMuted(theme)}`}>共 {filtered.length} 个角色</p>
          ) : null}
          {errorMsg ? (
            <EmptyState title="角色数据加载失败" description={errorMsg} action={<button type="button" onClick={() => void fetchRoles()} className={btnSecondary(theme)}>重试</button>} />
          ) : loading && roles.length === 0 ? (
            <PageSkeleton type="table" />
          ) : paginated.length === 0 ? (
            <div className={`text-center py-12 text-sm ${textMuted(theme)}`}>暂无匹配角色</div>
          ) : (
            <div className="overflow-x-auto min-h-0">
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
                      <td className={`${tableCell()} font-medium max-w-[10rem] ${textPrimary(theme)}`}>
                        <span className="block truncate" title={r.name}>{r.name}</span>
                      </td>
                      <td className={tableCell()}>
                        <span className={`inline-flex shrink-0 items-center whitespace-nowrap text-xs px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-500'}`}>{r.code}</span>
                      </td>
                      <td className={`${tableCell()} max-w-[14rem] ${textSecondary(theme)}`}>
                        <span className="line-clamp-2 break-words" title={safeText(r.description)}>{safeText(r.description) || '—'}</span>
                      </td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{r.userCount}</td>
                      <td className={tableCell()}>
                        {r.isSystem ? (
                          <span className={`inline-flex shrink-0 items-center whitespace-nowrap text-[11px] px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>是</span>
                        ) : (
                          <span className={textMuted(theme)}>否</span>
                        )}
                      </td>
                      <td className={`${tableCell()} max-w-[min(280px,100%)] align-middle ${textSecondary(theme)}`}>
                        {r.permissions?.length > 0 ? (
                          <div className={`${tableCellScrollInner} text-[12px]`} title={r.permissions.join(', ')}>
                            {r.permissions.slice(0, 3).join(', ')}{r.permissions.length > 3 ? ` +${r.permissions.length - 3}` : ''}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className={`${tableCell()} whitespace-nowrap ${textSecondary(theme)}`}>{formatDateTime(r.createdAt)}</td>
                      <td className={`${tableCell()} text-right`}>
                        <div className="inline-flex flex-nowrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            disabled={r.isSystem}
                            className={`${mgmtTableActionGhost(theme)} disabled:opacity-40 disabled:pointer-events-none`}
                            aria-label={r.isSystem ? '系统内置角色不可编辑' : `编辑角色 ${r.name}`}
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r.id)}
                            disabled={r.isSystem}
                            className={`${mgmtTableActionDanger} disabled:opacity-40 disabled:pointer-events-none`}
                            aria-label={r.isSystem ? '系统内置角色不可删除' : `删除角色 ${r.name}`}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
        </div>
      </MgmtPageShell>
      {!errorMsg && (
        <ConfirmDialog open={!!deleteTarget} title="删除角色" message="确定删除该角色？" confirmText="删除" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </>
  );
};
