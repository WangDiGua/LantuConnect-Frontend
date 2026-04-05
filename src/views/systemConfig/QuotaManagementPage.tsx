import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CreditCard, Plus, Search } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  btnPrimary, btnSecondary, iconMuted, mgmtTableActionDanger, mgmtTableActionGhost,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { TOOLBAR_ROW_LIST, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BentoCard } from '../../components/common/BentoCard';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { quotaService } from '../../api/services/quota.service';
import type { QuotaItem, QuotaResourceCategory, RateLimitItem, ResourceRateLimitTarget } from '../../types/dto/quota';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

const QUOTA_TARGET_TYPE_OPTIONS = [
  { value: 'global', label: '全局' },
  { value: 'department', label: '部门' },
  { value: 'user', label: '用户' },
];

const QUOTA_SCOPE_FILTER_OPTIONS = [{ value: '', label: '全部范围' }, ...QUOTA_TARGET_TYPE_OPTIONS];

const QUOTA_RESOURCE_FILTER_OPTIONS: { value: QuotaResourceCategory | ''; label: string }[] = [
  { value: '', label: '全部资源维度' },
  { value: 'all', label: '通用 (all)' },
  { value: 'agent', label: 'Agent' },
  { value: 'skill', label: 'Skill' },
  { value: 'mcp', label: 'MCP' },
  { value: 'app', label: 'App' },
  { value: 'dataset', label: 'Dataset' },
];

const RL_TARGET_FILTER_OPTIONS = [
  { value: '', label: '全部目标' },
  { value: 'agent', label: 'Agent' },
  { value: 'skill', label: 'Skill' },
  { value: 'mcp', label: 'MCP' },
  { value: 'app', label: 'App' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'quota', label: '配额绑定' },
];

const SCOPE_CFG: Record<string, { label: string; light: string; dark: string }> = {
  global:     { label: '全局', light: 'bg-blue-100 text-blue-800',     dark: 'bg-blue-500/20 text-blue-300' },
  department: { label: '部门', light: 'bg-neutral-100 text-neutral-800', dark: 'bg-neutral-500/20 text-neutral-300' },
  user:       { label: '用户', light: 'bg-teal-100 text-teal-800',     dark: 'bg-teal-500/20 text-teal-300' },
};

const RESOURCE_DIM_CFG: Record<string, { label: string; light: string; dark: string }> = {
  all:     { label: '通用',     light: 'bg-slate-100 text-slate-800', dark: 'bg-slate-500/20 text-slate-300' },
  agent:   { label: 'Agent',   light: 'bg-violet-100 text-violet-800', dark: 'bg-violet-500/20 text-violet-200' },
  skill:   { label: 'Skill',   light: 'bg-indigo-100 text-indigo-800', dark: 'bg-indigo-500/20 text-indigo-200' },
  mcp:     { label: 'MCP',     light: 'bg-cyan-100 text-cyan-800', dark: 'bg-cyan-500/20 text-cyan-200' },
  app:     { label: 'App',     light: 'bg-amber-100 text-amber-900', dark: 'bg-amber-500/20 text-amber-200' },
  dataset: { label: 'Dataset', light: 'bg-rose-100 text-rose-800', dark: 'bg-rose-500/20 text-rose-200' },
  global:  { label: '其他',    light: 'bg-neutral-100 text-neutral-800', dark: 'bg-neutral-500/20 text-neutral-300' },
  quota:   { label: '配额',    light: 'bg-blue-100 text-blue-800', dark: 'bg-blue-500/20 text-blue-200' },
};

function QuotaProgressBar({ value, max, theme }: { value: number; max: number; theme: Theme }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isDark = theme === 'dark';
  let barColor = 'bg-emerald-500';
  if (pct >= 90) barColor = 'bg-red-500';
  else if (pct >= 70) barColor = 'bg-amber-500';

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums w-10 text-right ${pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-amber-500' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const QuotaManagementPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const labelCls = `text-sm font-medium ${textSecondary(theme)}`;

  const [tab, setTab] = useState<'quota' | 'rate-limit'>('quota');
  const [quotas, setQuotas] = useState<QuotaItem[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaDraft, setQuotaDraft] = useState<{
    targetType: string;
    targetName: string;
    subjectId: string;
    resourceCategory: QuotaResourceCategory;
    dailyLimit: number;
    monthlyLimit: number;
  }>({ targetType: 'global', targetName: '全平台', subjectId: '', resourceCategory: 'all', dailyLimit: 10000, monthlyLimit: 200000 });

  const [showRLModal, setShowRLModal] = useState(false);
  const [rlDraft, setRlDraft] = useState<{
    name: string;
    targetType: ResourceRateLimitTarget;
    targetId: number;
    targetName: string;
    maxRequestsPerMin: number;
    maxRequestsPerHour: number;
    maxConcurrent: number;
  }>({ name: '', targetType: 'agent', targetId: 1, targetName: '', maxRequestsPerMin: 60, maxRequestsPerHour: 1000, maxConcurrent: 10 });

  const [listKeyword, setListKeyword] = useState('');
  const [quotaScopeFilter, setQuotaScopeFilter] = useState('');
  const [quotaResourceFilter, setQuotaResourceFilter] = useState<QuotaResourceCategory | ''>('');
  const [rlTargetFilter, setRlTargetFilter] = useState('');
  const [editingQuota, setEditingQuota] = useState<QuotaItem | null>(null);
  const [editQuotaDraft, setEditQuotaDraft] = useState({
    targetName: '',
    dailyLimit: 0,
    monthlyLimit: 0,
    resourceCategory: 'all' as QuotaResourceCategory,
  });
  const [savingQuotaEdit, setSavingQuotaEdit] = useState(false);
  const [deleteRlId, setDeleteRlId] = useState<number | null>(null);
  const [deletingRl, setDeletingRl] = useState(false);
  const [quotaDeleteTarget, setQuotaDeleteTarget] = useState<QuotaItem | null>(null);
  const [deletingQuota, setDeletingQuota] = useState(false);

  const fetchQuotas = useCallback(async () => {
    const res = await quotaService.listQuotas();
    setQuotas(res?.list ?? (Array.isArray(res) ? res as unknown as QuotaItem[] : []));
  }, []);

  const fetchRateLimits = useCallback(async () => {
    const res = await quotaService.listRateLimits();
    setRateLimits(res?.list ?? (Array.isArray(res) ? res as unknown as RateLimitItem[] : []));
  }, []);

  const fetchAll = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      await Promise.all([fetchQuotas(), fetchRateLimits()]);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载配额数据失败'));
    } finally {
      setLoading(false);
    }
  }, [fetchQuotas, fetchRateLimits]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredQuotas = useMemo(() => {
    let list = quotas;
    if (quotaScopeFilter) list = list.filter((r) => r.targetType === quotaScopeFilter);
    if (quotaResourceFilter) list = list.filter((r) => r.resourceCategory === quotaResourceFilter);
    const q = listKeyword.trim().toLowerCase();
    if (q) list = list.filter((r) => r.targetName.toLowerCase().includes(q));
    return list;
  }, [quotas, listKeyword, quotaScopeFilter, quotaResourceFilter]);

  const filteredRateLimits = useMemo(() => {
    let list = rateLimits;
    if (rlTargetFilter) list = list.filter((r) => r.targetType === rlTargetFilter);
    const q = listKeyword.trim().toLowerCase();
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || r.targetName.toLowerCase().includes(q));
    return list;
  }, [rateLimits, listKeyword, rlTargetFilter]);

  const openQuotaEdit = useCallback((r: QuotaItem) => {
    setEditingQuota(r);
    setEditQuotaDraft({
      targetName: r.targetType === 'global' ? '全平台' : r.targetName,
      dailyLimit: r.dailyLimit,
      monthlyLimit: r.monthlyLimit,
      resourceCategory: r.resourceCategory ?? 'all',
    });
  }, []);

  const confirmDeleteQuota = useCallback(async () => {
    const r = quotaDeleteTarget;
    if (!r) return;
    setDeletingQuota(true);
    try {
      await quotaService.deleteQuota(r.id);
      showMessage('已删除', 'success');
      setQuotaDeleteTarget(null);
      await fetchQuotas();
    } catch {
      showMessage('删除失败', 'error');
    } finally {
      setDeletingQuota(false);
    }
  }, [quotaDeleteTarget, fetchQuotas, showMessage]);

  const saveQuotaEdit = async () => {
    if (!editingQuota) return;
    setSavingQuotaEdit(true);
    try {
      await quotaService.updateQuota({
        id: editingQuota.id,
        targetName: editingQuota.targetType === 'global' ? '全平台' : editQuotaDraft.targetName.trim(),
        dailyLimit: editQuotaDraft.dailyLimit,
        monthlyLimit: editQuotaDraft.monthlyLimit,
        resourceCategory: editQuotaDraft.resourceCategory,
      });
      showMessage('配额已更新', 'success');
      setEditingQuota(null);
      await fetchQuotas();
    } catch {
      showMessage('保存失败', 'error');
    } finally {
      setSavingQuotaEdit(false);
    }
  };

  const deleteRateLimitRow = async () => {
    if (deleteRlId == null) return;
    setDeletingRl(true);
    try {
      await quotaService.deleteRateLimit(deleteRlId);
      showMessage('限流规则已删除', 'success');
      setDeleteRlId(null);
      await fetchRateLimits();
    } catch {
      showMessage('删除失败', 'error');
    } finally {
      setDeletingRl(false);
    }
  };

  const addQuota = async () => {
    try {
      await quotaService.createQuota({
        subjectType: quotaDraft.targetType as 'user' | 'department' | 'global',
        subjectName: quotaDraft.targetType === 'global' ? '全平台' : quotaDraft.targetName.trim() || '未命名',
        subjectId: quotaDraft.targetType === 'global' ? undefined : quotaDraft.subjectId.trim() || undefined,
        resourceCategory: quotaDraft.resourceCategory,
        dailyLimit: quotaDraft.dailyLimit,
        monthlyLimit: quotaDraft.monthlyLimit,
      });
      setShowQuotaModal(false);
      setQuotaDraft({
        targetType: 'global',
        targetName: '全平台',
        subjectId: '',
        resourceCategory: 'all',
        dailyLimit: 10000,
        monthlyLimit: 200000,
      });
      showMessage('配额规则已添加', 'success');
      await fetchQuotas();
    } catch (err) { console.error(err); showMessage('添加失败', 'error'); }
  };

  const addRateLimit = async () => {
    try {
      const label = rlDraft.targetName.trim() || `${rlDraft.targetType} #${rlDraft.targetId}`;
      await quotaService.createRateLimit({
        name: rlDraft.name || '未命名规则',
        targetType: rlDraft.targetType,
        targetId: rlDraft.targetId,
        targetName: label,
        maxRequestsPerMin: rlDraft.maxRequestsPerMin,
        maxRequestsPerHour: rlDraft.maxRequestsPerHour,
        maxConcurrent: rlDraft.maxConcurrent,
      });
      setShowRLModal(false);
      setRlDraft({
        name: '',
        targetType: 'agent',
        targetId: 1,
        targetName: '',
        maxRequestsPerMin: 60,
        maxRequestsPerHour: 1000,
        maxConcurrent: 10,
      });
      showMessage('限流规则已添加', 'success');
      await fetchRateLimits();
    } catch (err) { console.error(err); showMessage('添加失败', 'error'); }
  };

  const toggleRL = useCallback(
    async (id: number) => {
      const rl = rateLimits.find((r) => r.id === id);
      if (!rl) return;
      try {
        const nextEnabled = !rl.enabled;
        await quotaService.toggleRateLimit(id, nextEnabled);
        await fetchRateLimits();
        showMessage(nextEnabled ? '限流规则已开启' : '限流规则已关闭', 'success');
      } catch (err) {
        console.error(err);
        showMessage('操作失败', 'error');
      }
    },
    [rateLimits, fetchRateLimits, showMessage],
  );

  const quotaColumns = useMemo<MgmtDataTableColumn<QuotaItem>[]>(
    () => [
      {
        id: 'scope',
        header: '范围',
        cell: (r) => {
          const sc = SCOPE_CFG[r.targetType] ?? SCOPE_CFG.global;
          return (
            <span className={`inline-flex shrink-0 items-center whitespace-nowrap px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? sc.dark : sc.light}`}>
              {sc.label}
            </span>
          );
        },
      },
      {
        id: 'rescat',
        header: '资源维度',
        cell: (r) => {
          const rc = RESOURCE_DIM_CFG[r.resourceCategory] ?? RESOURCE_DIM_CFG.all;
          return (
            <span className={`inline-flex shrink-0 items-center whitespace-nowrap px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? rc.dark : rc.light}`}>
              {rc.label}
            </span>
          );
        },
      },
      { id: 'name', header: '名称', cellClassName: `font-medium ${textPrimary(theme)}`, cell: (r) => r.targetName },
      {
        id: 'status',
        header: '状态',
        cell: (r) => (
          <span className={`inline-flex shrink-0 items-center whitespace-nowrap text-xs font-medium ${r.enabled ? 'text-emerald-500' : textMuted(theme)}`}>
            {r.enabled ? '启用' : '停用'}
          </span>
        ),
      },
      { id: 'dailyLimit', header: '日配额', cellClassName: `text-xs tabular-nums ${textMuted(theme)}`, cell: (r) => formatNum(r.dailyLimit) },
      {
        id: 'dailyUsed',
        header: '日用量',
        cell: (r) => (
          <>
            <div className={`text-xs mb-1 tabular-nums ${textMuted(theme)}`}>{formatNum(r.dailyUsed)}</div>
            <QuotaProgressBar value={r.dailyUsed} max={r.dailyLimit} theme={theme} />
          </>
        ),
      },
      { id: 'monthlyLimit', header: '月配额', cellClassName: `text-xs tabular-nums ${textMuted(theme)}`, cell: (r) => formatNum(r.monthlyLimit) },
      {
        id: 'monthlyUsed',
        header: '月用量',
        cell: (r) => (
          <>
            <div className={`text-xs mb-1 tabular-nums ${textMuted(theme)}`}>{formatNum(r.monthlyUsed)}</div>
            <QuotaProgressBar value={r.monthlyUsed} max={r.monthlyLimit} theme={theme} />
          </>
        ),
      },
      {
        id: 'created',
        header: '创建时间',
        cellClassName: `whitespace-nowrap text-xs ${textMuted(theme)}`,
        cell: (r) => formatDateTime(r.createTime),
      },
      {
        id: 'actions',
        header: '操作',
        cell: (r) => (
          <div className="inline-flex flex-wrap items-center justify-end gap-2">
            <button type="button" className={mgmtTableActionGhost(theme)} onClick={() => openQuotaEdit(r)}>
              编辑
            </button>
            <button type="button" className={mgmtTableActionDanger} onClick={() => setQuotaDeleteTarget(r)}>
              删除
            </button>
          </div>
        ),
      },
    ],
    [theme, isDark, openQuotaEdit],
  );

  const rateLimitColumns = useMemo<MgmtDataTableColumn<RateLimitItem>[]>(
    () => [
      { id: 'name', header: '规则名称', cellClassName: `font-medium ${textPrimary(theme)}`, cell: (r) => r.name },
      {
        id: 'scope',
        header: '类型',
        cell: (r) => {
          const rc = RESOURCE_DIM_CFG[r.targetType] ?? RESOURCE_DIM_CFG.global;
          return (
            <span className={`inline-flex shrink-0 px-2 py-0.5 rounded-lg text-xs font-medium ${isDark ? rc.dark : rc.light}`}>
              {rc.label}
            </span>
          );
        },
      },
      { id: 'target', header: '目标', cellClassName: textSecondary(theme), cell: (r) => r.targetName },
      {
        id: 'rpm',
        header: '请求/分',
        cellClassName: `font-mono text-center ${textSecondary(theme)}`,
        cell: (r) => r.maxRequestsPerMin,
      },
      {
        id: 'rph',
        header: '请求/时',
        cellClassName: `font-mono text-center ${textMuted(theme)}`,
        cell: (r) => r.maxRequestsPerHour,
      },
      {
        id: 'enabled',
        header: '状态',
        cell: (r) => (
          <button
            type="button"
            onClick={() => void toggleRL(r.id)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${r.enabled ? 'bg-neutral-900' : isDark ? 'bg-white/20' : 'bg-slate-300'}`}
            role="switch"
            aria-checked={r.enabled}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${r.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        ),
      },
      {
        id: 'actions',
        header: '操作',
        cell: (r) => (
          <button type="button" className={mgmtTableActionDanger} onClick={() => setDeleteRlId(r.id)}>
            删除
          </button>
        ),
      },
    ],
    [theme, isDark, toggleRL],
  );

  const tabs = [
    { key: 'quota' as const, label: '配额管理' },
    { key: 'rate-limit' as const, label: '限流策略' },
  ];

  const tabBar = (
    <div className="flex gap-1 px-4 sm:px-6 pt-4 pb-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setTab(t.key)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === t.key
              ? isDark ? 'bg-neutral-900/20 text-neutral-300' : 'bg-neutral-100 text-neutral-800 shadow-sm'
              : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={CreditCard} breadcrumbSegments={['系统配置', '配额管理']} description="按全局 / 部门 / 用户配置用量，并按 Agent、Skill、MCP、App、Dataset 五类资源拆分配额；资源级限流与「限流策略」页的全局/用户规则互补。">
      {tabBar}

      {loading && quotas.length === 0 && rateLimits.length === 0 ? (
        <PageSkeleton type="table" />
      ) : loadError ? (
        <PageError error={loadError} onRetry={fetchAll} retryLabel="重试加载配额" />
      ) : (
        <>
          {tab === 'quota' && (
            <div className="min-w-0 px-4 sm:px-6 pb-6">
              <div className={`${TOOLBAR_ROW_LIST} justify-between min-w-0 mb-3`}>
                <div className={`${TOOLBAR_ROW_LIST} min-w-0 flex-1`}>
                  <div className="relative min-w-[8rem] shrink-0 sm:max-w-[14rem]">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} size={16} />
                    <input
                      type="search"
                      value={listKeyword}
                      onChange={(e) => setListKeyword(e.target.value)}
                      placeholder="搜索名称…"
                      className={toolbarSearchInputClass(theme)}
                      aria-label="筛选配额名称"
                    />
                  </div>
                  <LantuSelect
                    theme={theme}
                    value={quotaScopeFilter}
                    onChange={setQuotaScopeFilter}
                    options={QUOTA_SCOPE_FILTER_OPTIONS}
                    placeholder="范围"
                    className="!w-36 shrink-0"
                    triggerClassName="w-full !min-w-0"
                  />
                  <LantuSelect
                    theme={theme}
                    value={quotaResourceFilter}
                    onChange={(v) => setQuotaResourceFilter(v as QuotaResourceCategory | '')}
                    options={QUOTA_RESOURCE_FILTER_OPTIONS}
                    placeholder="资源维度"
                    className="!w-40 shrink-0"
                    triggerClassName="w-full !min-w-0"
                  />
                </div>
                <button type="button" onClick={() => setShowQuotaModal(true)} className={`${btnPrimary} gap-1.5 shrink-0`}>
                  <Plus size={15} />
                  新增配额
                </button>
              </div>
              <BentoCard theme={theme} padding="sm" className="overflow-hidden">
                <MgmtDataTable<QuotaItem>
                  theme={theme}
                  surface="plain"
                  minWidth="960px"
                  columns={quotaColumns}
                  rows={filteredQuotas}
                  getRowKey={(r) => r.id}
                />
              </BentoCard>
            </div>
          )}

          {tab === 'rate-limit' && (
            <div className="min-w-0 px-4 sm:px-6 pb-6">
              <div className={`${TOOLBAR_ROW_LIST} justify-between min-w-0 mb-3`}>
                <div className={`${TOOLBAR_ROW_LIST} min-w-0 flex-1`}>
                  <div className="relative min-w-[8rem] shrink-0 sm:max-w-[14rem]">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} size={16} />
                    <input
                      type="search"
                      value={listKeyword}
                      onChange={(e) => setListKeyword(e.target.value)}
                      placeholder="搜索规则或目标…"
                      className={toolbarSearchInputClass(theme)}
                      aria-label="筛选限流规则"
                    />
                  </div>
                  <LantuSelect
                    theme={theme}
                    value={rlTargetFilter}
                    onChange={setRlTargetFilter}
                    options={RL_TARGET_FILTER_OPTIONS}
                    placeholder="目标类型"
                    className="!w-36 shrink-0"
                    triggerClassName="w-full !min-w-0"
                  />
                </div>
                <button type="button" onClick={() => setShowRLModal(true)} className={`${btnPrimary} gap-1.5 shrink-0`}>
                  <Plus size={15} />
                  新增规则
                </button>
              </div>
              <BentoCard theme={theme} padding="sm" className="overflow-hidden">
                <MgmtDataTable<RateLimitItem>
                  theme={theme}
                  surface="plain"
                  minWidth="820px"
                  columns={rateLimitColumns}
                  rows={filteredRateLimits}
                  getRowKey={(r) => r.id}
                />
              </BentoCard>
            </div>
          )}
        </>
      )}

      <Modal open={showQuotaModal} onClose={() => setShowQuotaModal(false)} title="新增配额规则" theme={theme} size="md" footer={<><button type="button" onClick={() => setShowQuotaModal(false)} className={btnSecondary(theme)}>取消</button><button type="button" onClick={addQuota} className={btnPrimary}>添加</button></>}>
        <div className="space-y-4">
          <div>
            <label className={`${labelCls} mb-1.5 block`}>范围类型</label>
            <LantuSelect
              theme={theme}
              triggerClassName={INPUT_FOCUS}
              value={quotaDraft.targetType}
              onChange={(v) => setQuotaDraft((p) => ({ ...p, targetType: v }))}
              options={QUOTA_TARGET_TYPE_OPTIONS}
            />
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>配额作用的资源类型</label>
            <LantuSelect
              theme={theme}
              triggerClassName={INPUT_FOCUS}
              value={quotaDraft.resourceCategory}
              onChange={(v) => setQuotaDraft((p) => ({ ...p, resourceCategory: v as QuotaResourceCategory }))}
              options={QUOTA_RESOURCE_FILTER_OPTIONS.filter((o) => o.value !== '')}
            />
            <p className={`text-xs mt-1 ${textMuted(theme)}`}>「通用」对所有类型调用累计用量；细分维度需与网关传入的 resourceType 一致。</p>
          </div>
          {quotaDraft.targetType !== 'global' && (
            <>
              <div>
                <label className={`${labelCls} mb-1.5 block`}>主体 ID（数字，选填）</label>
                <input className={inputCls} inputMode="numeric" placeholder="对应部门或用户在平台上的 ID" value={quotaDraft.subjectId} onChange={(e) => setQuotaDraft((p) => ({ ...p, subjectId: e.target.value }))} />
              </div>
              <div>
                <label className={`${labelCls} mb-1.5 block`}>{quotaDraft.targetType === 'department' ? '部门显示名称' : '用户显示名称'}</label>
                <input className={inputCls} placeholder={quotaDraft.targetType === 'department' ? '如：信息工程学院' : '如：王五'} value={quotaDraft.targetName} onChange={(e) => setQuotaDraft((p) => ({ ...p, targetName: e.target.value }))} />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`${labelCls} mb-1.5 block`}>日配额</label>
              <input type="number" className={inputCls} value={quotaDraft.dailyLimit} onChange={(e) => setQuotaDraft((p) => ({ ...p, dailyLimit: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>月配额</label>
              <input type="number" className={inputCls} value={quotaDraft.monthlyLimit} onChange={(e) => setQuotaDraft((p) => ({ ...p, monthlyLimit: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editingQuota}
        onClose={() => { setEditingQuota(null); }}
        title="编辑配额"
        theme={theme}
        size="md"
        footer={
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setEditingQuota(null)}>取消</button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={savingQuotaEdit} onClick={() => void saveQuotaEdit()}>
              {savingQuotaEdit ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        {editingQuota && (
          <div className="space-y-4">
            <p className={`text-xs ${textMuted(theme)}`}>
              范围：{editingQuota.targetType} · 资源维度：{editingQuota.resourceCategory} · 用量为只读；可调整日/月上限、显示名称与资源维度。
            </p>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>资源维度</label>
              <LantuSelect
                theme={theme}
                triggerClassName={INPUT_FOCUS}
                value={editQuotaDraft.resourceCategory}
                onChange={(v) => setEditQuotaDraft((p) => ({ ...p, resourceCategory: v as QuotaResourceCategory }))}
                options={QUOTA_RESOURCE_FILTER_OPTIONS.filter((o) => o.value !== '')}
              />
            </div>
            {editingQuota.targetType !== 'global' && (
              <div>
                <label className={`${labelCls} mb-1.5 block`}>对象名称</label>
                <input className={inputCls} value={editQuotaDraft.targetName} onChange={(e) => setEditQuotaDraft((p) => ({ ...p, targetName: e.target.value }))} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`${labelCls} mb-1.5 block`}>日配额上限</label>
                <input type="number" className={inputCls} value={editQuotaDraft.dailyLimit} onChange={(e) => setEditQuotaDraft((p) => ({ ...p, dailyLimit: Number(e.target.value) }))} />
              </div>
              <div>
                <label className={`${labelCls} mb-1.5 block`}>月配额上限</label>
                <input type="number" className={inputCls} value={editQuotaDraft.monthlyLimit} onChange={(e) => setEditQuotaDraft((p) => ({ ...p, monthlyLimit: Number(e.target.value) }))} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={quotaDeleteTarget != null}
        title="删除配额"
        message={quotaDeleteTarget ? `确定删除配额「${quotaDeleteTarget.targetName}」？` : ''}
        variant="danger"
        confirmText="删除"
        loading={deletingQuota}
        onCancel={() => {
          if (deletingQuota) return;
          setQuotaDeleteTarget(null);
        }}
        onConfirm={() => void confirmDeleteQuota()}
      />

      <ConfirmDialog
        open={deleteRlId != null}
        title="删除限流规则"
        message="确定删除该限流规则？"
        variant="danger"
        confirmText="删除"
        loading={deletingRl}
        onCancel={() => setDeleteRlId(null)}
        onConfirm={() => void deleteRateLimitRow()}
      />

      <Modal open={showRLModal} onClose={() => setShowRLModal(false)} title="新增资源级限流" theme={theme} size="md" footer={<><button type="button" onClick={() => setShowRLModal(false)} className={btnSecondary(theme)}>取消</button><button type="button" onClick={addRateLimit} className={btnPrimary}>添加</button></>}>
        <div className="space-y-4">
          <p className={`text-xs ${textMuted(theme)}`}>绑定到统一资源表中的实例（resourceType + t_resource.id），网关调用时自动匹配。HTTP 路径限流请在「限流策略」页配置。</p>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>规则名称</label>
            <input className={inputCls} placeholder="如：智能问答 Agent" value={rlDraft.name} onChange={(e) => setRlDraft((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`${labelCls} mb-1.5 block`}>资源类型</label>
              <LantuSelect
                theme={theme}
                triggerClassName={INPUT_FOCUS}
                value={rlDraft.targetType}
                onChange={(v) => setRlDraft((p) => ({ ...p, targetType: v as ResourceRateLimitTarget }))}
                options={RL_TARGET_FILTER_OPTIONS.filter((o) => o.value && o.value !== 'quota')}
              />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>资源 ID（t_resource）</label>
              <input type="number" min={1} className={inputCls} value={rlDraft.targetId || ''} onChange={(e) => setRlDraft((p) => ({ ...p, targetId: Number(e.target.value) || 1 }))} />
            </div>
          </div>
          <div>
            <label className={`${labelCls} mb-1.5 block`}>显示名称（选填）</label>
            <input className={inputCls} placeholder="列表中展示，默认可由系统自动拼接" value={rlDraft.targetName} onChange={(e) => setRlDraft((p) => ({ ...p, targetName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`${labelCls} mb-1.5 block`}>请求/分</label>
              <input type="number" className={inputCls} value={rlDraft.maxRequestsPerMin} onChange={(e) => setRlDraft((p) => ({ ...p, maxRequestsPerMin: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>请求/时</label>
              <input type="number" className={inputCls} value={rlDraft.maxRequestsPerHour} onChange={(e) => setRlDraft((p) => ({ ...p, maxRequestsPerHour: Number(e.target.value) }))} />
            </div>
            <div>
              <label className={`${labelCls} mb-1.5 block`}>并发上限</label>
              <input type="number" className={inputCls} value={rlDraft.maxConcurrent} onChange={(e) => setRlDraft((p) => ({ ...p, maxConcurrent: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
      </Modal>
    </MgmtPageShell>
  );
};
