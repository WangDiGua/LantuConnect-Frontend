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
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LantuSelect } from '../../components/common/LantuSelect';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  textPrimary, textSecondary, textMuted, btnPrimary, btnSecondary, fieldErrorText, inputBaseError,
} from '../../utils/uiClasses';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import { MgmtPageShell } from './MgmtPageShell';

interface OrgStructurePageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const ORG_DESC = '部门层级与人员分布';
const BREADCRUMB = ['用户管理', '组织架构'] as const;

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

export const OrgStructurePage: React.FC<OrgStructurePageProps> = ({ theme, fontSize, showMessage = () => {} }) => {
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
  const [createNameError, setCreateNameError] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [orgDeleteTarget, setOrgDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [orgDeleting, setOrgDeleting] = useState(false);

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

  const openCreate = () => {
    setCreateName('');
    setCreateNameError('');
    setCreateParentId(primaryRoot?.id ?? parentSelectOptions[0]?.value ?? '');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!createName.trim()) {
      setCreateNameError('请填写部门名称');
      return;
    }
    setCreateNameError('');
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
    setEditNameError('');
    setEditId(id);
    setEditName(name);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editName.trim()) {
      setEditNameError('名称不能为空');
      return;
    }
    setEditNameError('');
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

  if (isLoading) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Building2} breadcrumbSegments={BREADCRUMB} description={ORG_DESC}>
        <div className="px-4 sm:px-6 py-4"><PageSkeleton type="detail" /></div>
      </MgmtPageShell>
    );
  }

  if (isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Building2} breadcrumbSegments={BREADCRUMB} description={ORG_DESC}>
        <div className="px-4 sm:px-6 py-4">
          <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
        </div>
      </MgmtPageShell>
    );
  }

  if (!data || data.length === 0) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Building2} breadcrumbSegments={BREADCRUMB} description={ORG_DESC}>
        <div className="px-4 sm:px-6 py-4">
          <EmptyState title="暂无组织数据" description="后端未返回组织树" />
        </div>
      </MgmtPageShell>
    );
  }

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Building2}
        breadcrumbSegments={BREADCRUMB}
        description={ORG_DESC}
        toolbar={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openCreate}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${isDark ? 'bg-neutral-900 text-white hover:bg-neutral-800' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}
              aria-label="新增部门"
            >
              <span>+ 新增部门</span>
            </button>
          </div>
        }
        contentScroll="document"
      >
        <div className="px-4 sm:px-6 pb-8">
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
                        <Building2 size={14} className={textMuted(theme)} aria-hidden />
                      ) : (
                        <span className={`w-3.5 h-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} aria-hidden />
                      )}
                      <span className={`font-medium text-sm truncate ${textPrimary(theme)}`} title={d.name}>{d.name}</span>
                      {d.type && <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>{typeLabel(d.type)}</span>}
                      {d.leader && <span className={`text-[11px] truncate max-w-[8rem] ${textMuted(theme)}`}>负责人: {d.leader}</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 min-w-[2.5rem] justify-end">
                        <Users size={12} className={textMuted(theme)} aria-hidden />
                        {d.memberCount != null || d.headCount != null ? (
                          <span className={`text-xs tabular-nums ${textSecondary(theme)}`}>{d.memberCount ?? d.headCount}</span>
                        ) : (
                          <span className={`text-xs ${textMuted(theme)}`}>—</span>
                        )}
                      </div>
                      <button type="button" onClick={() => openEdit(d.id, d.name)} className={`text-xs ${textMuted(theme)} hover:text-neutral-800 dark:hover:text-slate-200`} aria-label={`编辑部门 ${d.name}`}>编辑</button>
                      <button
                        type="button"
                        onClick={() => setOrgDeleteTarget({ id: d.id, name: d.name })}
                        className="text-xs text-rose-500 hover:text-rose-600"
                        aria-label={`删除部门 ${d.name}`}
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
      </MgmtPageShell>

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
            <input
              className={`${inputCls}${createNameError ? ` ${inputBaseError()}` : ''}`}
              value={createName}
              onChange={(e) => {
                setCreateName(e.target.value);
                setCreateNameError('');
              }}
              placeholder="例如：教务处"
              aria-invalid={!!createNameError}
            />
            {createNameError ? (
              <p className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
                {createNameError}
              </p>
            ) : null}
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
        <div>
          <input
            className={`${inputCls}${editNameError ? ` ${inputBaseError()}` : ''}`}
            value={editName}
            onChange={(e) => {
              setEditName(e.target.value);
              setEditNameError('');
            }}
            placeholder="部门名称"
            aria-invalid={!!editNameError}
          />
          {editNameError ? (
            <p className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
              {editNameError}
            </p>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={orgDeleteTarget != null}
        title="删除部门"
        message={orgDeleteTarget ? `确定删除「${orgDeleteTarget.name}」？` : ''}
        variant="danger"
        confirmText="删除"
        loading={orgDeleting}
        onCancel={() => {
          if (orgDeleting) return;
          setOrgDeleteTarget(null);
        }}
        onConfirm={() => {
          void (async () => {
            if (!orgDeleteTarget) return;
            setOrgDeleting(true);
            try {
              await userMgmtService.deleteOrg(orgDeleteTarget.id);
              showMessage('已删除', 'success');
              setOrgDeleteTarget(null);
              await refetch();
            } catch (e) {
              showMessage(e instanceof Error ? e.message : '删除失败', 'error');
            } finally {
              setOrgDeleting(false);
            }
          })();
        }}
      />
    </>
  );
};
