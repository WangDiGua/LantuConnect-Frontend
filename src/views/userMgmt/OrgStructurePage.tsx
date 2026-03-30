import React, { useMemo, useState } from 'react';
import { Building2, Users } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { OrgNode } from '../../types/dto/user-mgmt';
import { useOrgTree } from '../../hooks/queries/useUserMgmt';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { BentoCard } from '../../components/common/BentoCard';
import { Modal } from '../../components/common/Modal';
import { LantuSelect } from '../../components/common/LantuSelect';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  canvasBodyBg, textPrimary, textSecondary, textMuted, btnPrimary, btnSecondary,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { userMgmtService } from '../../api/services/user-mgmt.service';

interface OrgStructurePageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

function flattenOrg(node: OrgNode, depth = 0): { id: string; name: string; depth: number; memberCount?: number; parentId?: string | null; type?: string; headCount?: number; leader?: string }[] {
  const row = { id: node.id, name: node.name, depth, memberCount: node.memberCount, parentId: node.parentId, type: node.type, headCount: node.headCount, leader: node.leader };
  return [row, ...(node.children ?? []).flatMap((c) => flattenOrg(c, depth + 1))];
}

function typeLabel(t: string | undefined): string {
  if (t === 'company') return '学校';
  if (t === 'department') return '学院';
  if (t === 'group') return '部门';
  if (t === 'team') return '团队';
  return t ?? '';
}

export const OrgStructurePage: React.FC<OrgStructurePageProps> = ({ theme, showMessage = () => {} }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const { data, isLoading, isError, error, refetch } = useOrgTree();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createParentId, setCreateParentId] = useState('');
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const rows = useMemo(() => (data?.length ? data.flatMap((root) => flattenOrg(root)) : []), [data]);
  const primaryRoot = data?.[0];

  const parentSelectOptions = useMemo(() => {
    if (!rows.length || !primaryRoot?.id) return [];
    return rows
      .filter((r) => r.id)
      .map((r) => ({
        value: r.id,
        label: `${'\u3000'.repeat(r.depth)}${r.name}`,
      }));
  }, [rows, primaryRoot?.id]);

  if (isLoading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}>
        <div className="p-4 sm:p-6"><PageSkeleton type="detail" /></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}>
        <EmptyState title="暂无组织数据" description="后端未返回组织树" />
      </div>
    );
  }

  const openCreate = () => {
    setCreateName('');
    setCreateParentId(primaryRoot?.id ?? parentSelectOptions[0]?.value ?? '');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!createName.trim()) {
      showMessage('请填写部门名称', 'error');
      return;
    }
    setCreating(true);
    try {
      await userMgmtService.createOrg({
        name: createName.trim(),
        parentId: createParentId || primaryRoot?.id,
      });
      showMessage('已创建部门', 'success');
      setCreateOpen(false);
      await refetch();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '创建失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (id: string, name: string) => {
    setEditId(id);
    setEditName(name);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editName.trim()) {
      showMessage('名称不能为空', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      await userMgmtService.updateOrg(editId, { name: editName.trim() });
      showMessage('已更新', 'success');
      setEditOpen(false);
      await refetch();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
              <Building2 size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
            </div>
            <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '组织架构'} tagline="部门层级与人员分布" />
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={openCreate}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${isDark ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}
            >
              <span>+ 新增部门</span>
            </button>
          </div>
        </div>

        <BentoCard theme={theme}>
          {rows.length === 0 ? (
            <EmptyState title="组织为空" description="根节点下无子部门" />
          ) : (
            <ul className="space-y-1">
              {rows.map((d, rowIdx) => (
                <li
                  key={d.id ? `${d.depth}-${d.id}` : `org-row-${rowIdx}`}
                  className={`flex justify-between items-center py-2.5 px-3 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                  style={{ paddingLeft: `${d.depth * 20 + 12}px` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {d.depth === 0 ? (
                      <Building2 size={14} className={textMuted(theme)} />
                    ) : (
                      <span className={`w-3.5 h-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                    )}
                    <span className={`font-medium text-sm ${textPrimary(theme)}`}>{d.name}</span>
                    {d.type && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{typeLabel(d.type)}</span>}
                    {d.leader && <span className={`text-[11px] ${textMuted(theme)}`}>负责人: {d.leader}</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-[2.5rem] justify-end">
                      <Users size={12} className={textMuted(theme)} />
                      {d.memberCount != null || d.headCount != null ? (
                        <span className={`text-xs tabular-nums ${textSecondary(theme)}`}>{d.memberCount ?? d.headCount}</span>
                      ) : (
                        <span className={`text-xs ${textMuted(theme)}`}>—</span>
                      )}
                    </div>
                    <button type="button" onClick={() => openEdit(d.id, d.name)} className={`text-xs ${textMuted(theme)} hover:text-neutral-800 dark:hover:text-slate-200`}>编辑</button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`确定删除「${d.name}」？`)) return;
                        try {
                          await userMgmtService.deleteOrg(d.id);
                          showMessage('已删除', 'success');
                          await refetch();
                        } catch (e) {
                          showMessage(e instanceof Error ? e.message : '删除失败', 'error');
                        }
                      }}
                      className={`text-xs text-rose-500 hover:text-rose-600`}
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </div>

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="新增部门"
        theme={theme}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary(theme)} disabled={creating} onClick={() => setCreateOpen(false)}>取消</button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={creating} onClick={() => void submitCreate()}>创建</button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>上级</label>
            <LantuSelect
              theme={theme}
              value={createParentId}
              onChange={setCreateParentId}
              options={parentSelectOptions}
              placeholder="选择上级节点"
              className="!w-full"
              triggerClassName={INPUT_FOCUS}
            />
          </div>
          <div>
            <label className={`text-sm font-medium ${textSecondary(theme)} mb-1 block`}>部门名称</label>
            <input className={inputCls} value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="例如：教务处" />
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => !savingEdit && setEditOpen(false)}
        title="编辑部门名称"
        theme={theme}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary(theme)} disabled={savingEdit} onClick={() => setEditOpen(false)}>取消</button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={savingEdit} onClick={() => void submitEdit()}>保存</button>
          </div>
        }
      >
        <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="部门名称" />
      </Modal>
    </div>
  );
};
