import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import { PresetOrCustomNumberField } from '../../components/common/PresetOrCustomNumberField';
import {
  RATE_LIMIT_BURST,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_PRIORITY,
  RATE_LIMIT_WINDOW_MS,
} from '../../utils/numericFormPresets';
import { TOOLBAR_ROW_LIST, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Loader2, PencilLine, Plus, Save, Search, Sliders, Trash2 } from 'lucide-react';
import { useRateLimits, useCreateRateLimit, useUpdateRateLimit, useDeleteRateLimit } from '../../hooks/queries/useSystemConfig';
import { ContentLoader } from '../../components/common/ContentLoader';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BentoCard } from '../../components/common/BentoCard';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { MgmtBatchToolbar } from '../../components/management/MgmtBatchToolbar';
import { systemConfigService } from '../../api/services/system-config.service';
import {
  btnPrimary,
  btnSecondary,
  fieldErrorText,
  iconMuted,
  inputBaseError,
  mgmtTableActionDanger,
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';
import type { RateLimitRule, CreateRateLimitDTO } from '../../types/dto/system-config';
import { RowActionGroup } from '../../components/management/RowActionGroup';

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
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [rateLimitFieldErrors, setRateLimitFieldErrors] = useState<{ name?: string; maxRequests?: string }>({});

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [search]);

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

  const startCreate = () => {
    setRateLimitFieldErrors({});
    setCreating(true);
    setEditingId(null);
    setDraft(emptyDraft());
  };
  const startEdit = (r: RateLimitRule) => {
    setRateLimitFieldErrors({});
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
  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
    setRateLimitFieldErrors({});
  };

  const selectedRuleIds = useMemo(
    () => filtered.filter((r) => selectedKeys.has(String(r.id))).map((r) => r.id),
    [filtered, selectedKeys],
  );

  const clearRuleSelection = useCallback(() => setSelectedKeys(new Set()), []);

  const runBatchEnabled = useCallback(
    async (enabled: boolean) => {
      if (!selectedRuleIds.length) return;
      setBatchBusy(true);
      try {
        await systemConfigService.batchPatchRateLimits(selectedRuleIds, { enabled });
        showMessage(enabled ? '已批量启用' : '已批量停用', 'success');
        clearRuleSelection();
        await refetch();
      } catch (e) {
        showMessage(e instanceof Error ? e.message : '批量操作失败', 'error');
      } finally {
        setBatchBusy(false);
      }
    },
    [selectedRuleIds, showMessage, refetch, clearRuleSelection],
  );

  const runBatchDelete = useCallback(async () => {
    if (!selectedRuleIds.length) return;
    setBatchBusy(true);
    try {
      await systemConfigService.batchDeleteRateLimits(selectedRuleIds);
      showMessage('已批量删除', 'info');
      setBatchDeleteOpen(false);
      if (editingId && selectedRuleIds.includes(editingId)) cancelForm();
      clearRuleSelection();
      await refetch();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '批量删除失败', 'error');
    } finally {
      setBatchBusy(false);
    }
  }, [selectedRuleIds, editingId, showMessage, refetch, clearRuleSelection]);

  const saveForm = () => {
    const next: { name?: string; maxRequests?: string } = {};
    if (!draft.name?.trim()) next.name = '请填写策略名称';
    if ((draft.maxRequests ?? 0) < 1) next.maxRequests = '最大请求数须为正数';
    if (Object.keys(next).length > 0) {
      setRateLimitFieldErrors(next);
      return;
    }
    setRateLimitFieldErrors({});

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
            <input
              className={`${inputCls}${rateLimitFieldErrors.name ? ` ${inputBaseError()}` : ''}`}
              value={draft.name}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((d) => ({ ...d, name: v }));
                if (v.trim()) setRateLimitFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              aria-invalid={!!rateLimitFieldErrors.name}
            />
            {rateLimitFieldErrors.name ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {rateLimitFieldErrors.name}
              </p>
            ) : null}
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
            <PresetOrCustomNumberField
              theme={theme}
              value={Math.round(draft.priority ?? 0)}
              onChange={(n) => setDraft((d) => ({ ...d, priority: n }))}
              presets={RATE_LIMIT_PRIORITY.presets}
              customMin={RATE_LIMIT_PRIORITY.customMin}
              customMax={RATE_LIMIT_PRIORITY.customMax}
              customSeed={RATE_LIMIT_PRIORITY.customSeed}
              inputClassName={inputCls}
              ariaLabel="限流优先级"
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>时间窗口 (ms)</label>
            <PresetOrCustomNumberField
              theme={theme}
              value={draft.windowMs}
              onChange={(n) => setDraft((d) => ({ ...d, windowMs: n }))}
              presets={RATE_LIMIT_WINDOW_MS.presets}
              customMin={RATE_LIMIT_WINDOW_MS.customMin}
              customMax={RATE_LIMIT_WINDOW_MS.customMax}
              customSeed={RATE_LIMIT_WINDOW_MS.customSeed}
              inputClassName={inputCls}
              ariaLabel="限流时间窗口毫秒"
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>最大请求数</label>
            <PresetOrCustomNumberField
              theme={theme}
              value={draft.maxRequests}
              onChange={(n) => {
                setDraft((d) => ({ ...d, maxRequests: n }));
                if (n >= 1) setRateLimitFieldErrors((prev) => ({ ...prev, maxRequests: undefined }));
              }}
              presets={RATE_LIMIT_MAX_REQUESTS.presets}
              customMin={RATE_LIMIT_MAX_REQUESTS.customMin}
              customMax={RATE_LIMIT_MAX_REQUESTS.customMax}
              customSeed={RATE_LIMIT_MAX_REQUESTS.customSeed}
              inputClassName={`${inputCls}${rateLimitFieldErrors.maxRequests ? ` ${inputBaseError()}` : ''}`}
              ariaLabel="限流最大请求数"
            />
            {rateLimitFieldErrors.maxRequests ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {rateLimitFieldErrors.maxRequests}
              </p>
            ) : null}
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>突发容量 (Burst)</label>
            <PresetOrCustomNumberField
              theme={theme}
              value={draft.burstLimit}
              onChange={(n) => setDraft((d) => ({ ...d, burstLimit: n }))}
              presets={RATE_LIMIT_BURST.presets}
              customMin={RATE_LIMIT_BURST.customMin}
              customMax={RATE_LIMIT_BURST.customMax}
              customSeed={RATE_LIMIT_BURST.customSeed}
              inputClassName={inputCls}
              ariaLabel="限流突发容量"
            />
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
      description="用户/角色/IP 等维度限流；可选资源作用域限定 Agent、Skill、MCP、App、Dataset。路径型规则走 HTTP Filter，与网关层统一承接。"
      toolbar={
        <div className={`${TOOLBAR_ROW_LIST} justify-between`}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} size={16} />
            <input type="search" placeholder="搜索策略名或目标…" value={search} onChange={(e) => setSearch(e.target.value)} className={toolbarSearchInputClass(theme)} aria-label="搜索限流策略" />
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
                  cellNowrap: true,
                  cell: (r) => (
                    <RowActionGroup
                      theme={theme}
                      actions={[
                        {
                          key: 'edit',
                          label: '编辑',
                          icon: PencilLine,
                          onClick: () => startEdit(r),
                        },
                        {
                          key: 'delete',
                          label: '删除',
                          icon: Trash2,
                          tone: 'danger',
                          onClick: () => setDeleteTarget(r),
                        },
                      ]}
                    />
                  ),
                },
              ];
              return (
                <>
                  <MgmtBatchToolbar theme={theme} count={selectedKeys.size} onClear={clearRuleSelection}>
                    <button
                      type="button"
                      disabled={batchBusy || selectedKeys.size === 0}
                      className={btnSecondary(theme)}
                      onClick={() => void runBatchEnabled(true)}
                    >
                      批量启用
                    </button>
                    <button
                      type="button"
                      disabled={batchBusy || selectedKeys.size === 0}
                      className={btnSecondary(theme)}
                      onClick={() => void runBatchEnabled(false)}
                    >
                      批量停用
                    </button>
                    <button
                      type="button"
                      disabled={batchBusy || selectedKeys.size === 0}
                      className={mgmtTableActionDanger}
                      onClick={() => setBatchDeleteOpen(true)}
                    >
                      批量删除
                    </button>
                  </MgmtBatchToolbar>
                  <MgmtDataTable
                    theme={theme}
                    columns={rateColumns}
                    rows={filtered}
                    getRowKey={(r) => String(r.id)}
                    minWidth="50rem"
                    surface="plain"
                    selection={{
                      selectedKeys,
                      onSelectionChange: setSelectedKeys,
                    }}
                  />
                </>
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
      <ConfirmDialog
        open={batchDeleteOpen}
        title="批量删除限流策略"
        message={`确定删除已选的 ${selectedKeys.size} 条策略？`}
        confirmText="删除"
        variant="danger"
        loading={batchBusy}
        onConfirm={() => void runBatchDelete()}
        onCancel={() => setBatchDeleteOpen(false)}
      />
    </MgmtPageShell>
  );
};


