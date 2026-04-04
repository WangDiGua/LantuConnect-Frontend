import React, { useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { TOOLBAR_ROW_LIST, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Search, Plus, Save, Sliders, Loader2 } from 'lucide-react';
import { useRateLimits, useCreateRateLimit, useUpdateRateLimit, useDeleteRateLimit } from '../../hooks/queries/useSystemConfig';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BentoCard } from '../../components/common/BentoCard';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import {
  btnPrimary,
  btnSecondary,
  iconMuted,
  mgmtTableActionDanger,
  mgmtTableActionGhost,
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';
import type { RateLimitRule, CreateRateLimitDTO } from '../../types/dto/system-config';

interface RateLimitPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
  breadcrumbSegments: string[];
}

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

const RATE_LIMIT_TARGET_OPTIONS = [
  { value: 'global', label: '全局' },
  { value: 'user', label: '用户' },
  { value: 'role', label: '角色' },
  { value: 'ip', label: 'IP' },
  { value: 'api_key', label: 'API Key' },
  { value: 'path', label: 'HTTP 路径' },
];

const RATE_LIMIT_RESOURCE_SCOPE_OPTIONS = [
  { value: '', label: '全部资源类型' },
  { value: 'all', label: '显式 all（同全部）' },
  { value: 'agent', label: 'Agent' },
  { value: 'skill', label: 'Skill' },
  { value: 'mcp', label: 'MCP' },
  { value: 'app', label: 'App' },
  { value: 'dataset', label: 'Dataset' },
];

const RATE_LIMIT_ACTION_OPTIONS = [
  { value: 'reject', label: '拒绝' },
  { value: 'queue', label: '排队' },
  { value: 'throttle', label: '限速' },
];

const emptyDraft = (): Partial<CreateRateLimitDTO> & { enabled: boolean; targetValue?: string; resourceScope?: string } => ({
  name: '',
  target: 'global',
  targetValue: '',
  resourceScope: '',
  windowMs: 60000,
  maxRequests: 1000,
  burstLimit: 50,
  action: 'reject',
  enabled: true,
});

export const RateLimitPage: React.FC<RateLimitPageProps> = ({
  theme, fontSize, showMessage, breadcrumbSegments,
}) => {
  const isDark = theme === 'dark';
  const { data, isLoading, isError, error, refetch } = useRateLimits();
  const createMut = useCreateRateLimit();
  const updateMut = useUpdateRateLimit();
  const deleteMut = useDeleteRateLimit();

  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RateLimitRule | null>(null);

  const rules: RateLimitRule[] = Array.isArray(data) ? data : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (!q) return true;
      return (r.name ?? '').toLowerCase().includes(q)
        || (r.target ?? '').toLowerCase().includes(q)
        || (r.resourceScope ?? '').toLowerCase().includes(q);
    });
  }, [rules, search]);

  const startCreate = () => { setCreating(true); setEditingId(null); setDraft(emptyDraft()); };
  const startEdit = (r: RateLimitRule) => {
    setCreating(false);
    setEditingId(r.id);
    setDraft({
      name: r.name,
      target: r.target,
      targetValue: r.targetValue ?? '',
      resourceScope: r.resourceScope ?? '',
      windowMs: r.windowMs,
      maxRequests: r.maxRequests,
      burstLimit: r.burstLimit ?? 50,
      action: r.action,
      priority: r.priority,
      enabled: r.enabled,
    });
  };
  const cancelForm = () => { setCreating(false); setEditingId(null); };

  const saveForm = () => {
    if (!draft.name?.trim()) { showMessage('请填写策略名称', 'error'); return; }
    if ((draft.maxRequests ?? 0) < 1) { showMessage('最大请求数须为正数', 'error'); return; }

    const scopeRaw = (draft.resourceScope ?? '').trim();
    const payload: CreateRateLimitDTO = {
      name: draft.name!.trim(),
      target: draft.target as RateLimitRule['target'] ?? 'global',
      targetValue: (draft.targetValue ?? '').trim() || undefined,
      windowMs: draft.windowMs ?? 60000,
      maxRequests: draft.maxRequests ?? 1000,
      burstLimit: draft.burstLimit ?? 50,
      action: draft.action as RateLimitRule['action'] ?? 'reject',
      priority: draft.priority,
      resourceScope: scopeRaw === '' ? undefined : scopeRaw === 'all' ? 'all' : scopeRaw,
    };

    if (creating) {
      createMut.mutate(payload, {
        onSuccess: () => { cancelForm(); showMessage('已添加限流策略', 'success'); },
        onError: (e) => showMessage(e instanceof Error ? e.message : '创建失败', 'error'),
      });
    } else if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { cancelForm(); showMessage('已保存', 'success'); },
        onError: (e) => showMessage(e instanceof Error ? e.message : '保存失败', 'error'),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (editingId === deleteTarget.id) cancelForm();
        setDeleteTarget(null);
        showMessage('已删除', 'info');
      },
    });
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  const formPanel =
    creating || editingId ? (
      <BentoCard theme={theme} padding="md" className="mx-4 sm:mx-6 mb-4">
        <div className={`text-sm font-semibold mb-3 ${textPrimary(theme)}`}>{creating ? '新建限流策略' : '编辑限流策略'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>策略名称</label>
            <input className={inputCls} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>目标类型</label>
            <LantuSelect
              theme={theme}
              triggerClassName={INPUT_FOCUS}
              value={String(draft.target ?? 'global')}
              onChange={(v) => setDraft((d) => ({ ...d, target: v as RateLimitRule['target'] }))}
              options={RATE_LIMIT_TARGET_OPTIONS}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={`${labelCls} mb-1.5 block`}>目标值</label>
            <input className={inputCls} placeholder="用户 ID / 角色编码 / 路径 Ant 模式 /** 等" value={draft.targetValue ?? ''} onChange={(e) => setDraft((d) => ({ ...d, targetValue: e.target.value }))} />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>网关资源作用域</label>
            <LantuSelect
              theme={theme}
              triggerClassName={INPUT_FOCUS}
              value={draft.resourceScope ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, resourceScope: v }))}
              options={RATE_LIMIT_RESOURCE_SCOPE_OPTIONS}
            />
            <p className={`text-xs mt-1 ${textMuted(theme)}`}>仅影响资源网关调用计数；留空表示不限定资源大类。</p>
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>优先级（大者优先）</label>
            <input type="number" className={inputCls} value={draft.priority ?? 0} onChange={(e) => setDraft((d) => ({ ...d, priority: Number(e.target.value) }))} />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>时间窗口 (ms)</label>
            <input type="number" min={1000} className={inputCls} value={draft.windowMs} onChange={(e) => setDraft((d) => ({ ...d, windowMs: Number(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>最大请求数</label>
            <input type="number" min={1} className={inputCls} value={draft.maxRequests} onChange={(e) => setDraft((d) => ({ ...d, maxRequests: Number(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>突发容量 (Burst)</label>
            <input type="number" min={1} className={inputCls} value={draft.burstLimit} onChange={(e) => setDraft((d) => ({ ...d, burstLimit: Number(e.target.value) || 0 }))} />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>超限动作</label>
            <LantuSelect
              theme={theme}
              triggerClassName={INPUT_FOCUS}
              value={String(draft.action ?? 'reject')}
              onChange={(v) => setDraft((d) => ({ ...d, action: v as RateLimitRule['action'] }))}
              options={RATE_LIMIT_ACTION_OPTIONS}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={draft.enabled} onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))} />
            <span className={`text-sm ${textSecondary(theme)}`}>启用</span>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={saveForm} disabled={isSaving} className={`${btnPrimary} inline-flex items-center gap-1.5 disabled:opacity-50`}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            保存
          </button>
          <button type="button" onClick={cancelForm} className={btnSecondary(theme)}>取消</button>
        </div>
      </BentoCard>
    ) : null;

  if (isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} breadcrumbSegments={breadcrumbSegments} titleIcon={Sliders}>
        <PageError error={error instanceof Error ? error : null} onRetry={() => refetch()} />
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={breadcrumbSegments}
      titleIcon={Sliders}
      description="用户/角色/IP 等维度限流；可选资源作用域限定 Agent、Skill、MCP、App、Dataset。路径型规则走 HTTP Filter，与网关配额互补。"
      toolbar={
        <div className={`${TOOLBAR_ROW_LIST} justify-between`}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} size={16} />
            <input type="search" placeholder="搜索策略名或目标…" value={search} onChange={(e) => setSearch(e.target.value)} className={toolbarSearchInputClass(theme)} />
          </div>
          <button type="button" onClick={startCreate} className={`${btnPrimary} gap-1.5 shrink-0`}>
            <Plus size={16} />
            新建策略
          </button>
        </div>
      }
    >
      {formPanel}
      <ContentLoader loading={isLoading}>
        <div className="min-w-0 px-4 sm:px-6 pb-6">
          {filtered.length === 0 ? (
            <EmptyState title="无匹配项" description="调整搜索或新建策略" />
          ) : (
            (() => {
              const rateColumns: MgmtDataTableColumn<RateLimitRule>[] = [
                {
                  id: 'name',
                  header: '名称',
                  cellClassName: `align-middle font-medium ${textPrimary(theme)}`,
                  cell: (r) => r.name,
                },
                {
                  id: 'target',
                  header: '目标',
                  cellClassName: `align-middle font-mono text-xs ${textMuted(theme)}`,
                  cell: (r) => `${r.target}${r.targetValue ? `: ${r.targetValue}` : ''}`,
                },
                {
                  id: 'rscope',
                  header: '资源域',
                  cellClassName: `align-middle text-xs ${textSecondary(theme)}`,
                  cell: (r) => r.resourceScope || '—',
                },
                {
                  id: 'window',
                  header: '窗口',
                  cellClassName: `align-middle ${textSecondary(theme)}`,
                  cell: (r) => `${(r.windowMs / 1000).toFixed(0)}s`,
                },
                {
                  id: 'max',
                  header: '最大请求',
                  cellClassName: `align-middle ${textSecondary(theme)}`,
                  cell: (r) => r.maxRequests,
                },
                {
                  id: 'enabled',
                  header: '状态',
                  cellClassName: 'align-middle',
                  cell: (r) => (
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        r.enabled
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-emerald-100 text-emerald-800'
                          : isDark
                            ? 'bg-slate-600/40 text-slate-300'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {r.enabled ? '启用' : '停用'}
                    </span>
                  ),
                },
                {
                  id: 'actions',
                  header: '操作',
                  headerClassName: 'text-right',
                  cellClassName: 'text-right align-middle',
                  cell: (r) => (
                    <div className="inline-flex flex-nowrap items-center justify-end gap-2">
                      <button type="button" onClick={() => startEdit(r)} className={mgmtTableActionGhost(theme)}>
                        编辑
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(r)} className={mgmtTableActionDanger}>
                        删除
                      </button>
                    </div>
                  ),
                },
              ];
              return (
                <MgmtDataTable
                  theme={theme}
                  columns={rateColumns}
                  rows={filtered}
                  getRowKey={(r) => r.id}
                  minWidth="50rem"
                  surface="plain"
                />
              );
            })()
          )}
        </div>
      </ContentLoader>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除限流策略"
        message={`确定要删除「${deleteTarget?.name ?? ''}」吗？`}
        confirmText="删除"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MgmtPageShell>
  );
};
