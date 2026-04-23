import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ban, Boxes, CheckCircle2, Clock3, GitBranch, Pencil, Plus, RefreshCw, Trash2, Undo2, XCircle } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type {
  LifecycleTimelineEventVO,
  LifecycleTimelineVO,
  ObservabilitySummaryVO,
  ResourceCenterItemVO,
  ResourceHealthSnapshotVO,
  ResourceStatus,
  ResourceVersionVO,
} from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { resourceAuditService } from '../../api/services/resource-audit.service';
import { useUserRole, canAccessAdminView } from '../../context/UserRoleContext';
import { useAuthStore } from '../../stores/authStore';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';
import { RESOURCE_TYPES, RESOURCE_TYPE_LABEL_ZH } from '../../constants/resourceTypes';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { FilterSelect, Pagination, SearchInput } from '../../components/common';
import { MgmtBatchToolbar } from '../../components/management/MgmtBatchToolbar';
import { lantuCheckboxPrimaryClass } from '../../utils/formFieldClasses';
import {
  bentoCard,
  bentoCardHover,
  btnGhost,
  btnPrimary,
  btnSecondary,
  coerceToDomainStatus,
  fieldErrorText,
  inputBaseError,
  mgmtTableActionDanger,
  mgmtTableActionGhost,
  mgmtTableActionPositive,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import {
  circuitBreakerBadgeClass,
  circuitBreakerLabelZh,
  resourceHealthBadgeClass,
  resourceHealthLabelZh,
  resourceVersionSnapshotLabelZh,
} from '../../utils/backendEnumLabels';
import { resourceCallabilityBadgeClass, resourceCallabilityLabelZh } from '../../utils/resourceCallability';
import { nullDisplay } from '../../utils/errorHandler';
import { formatDateTime } from '../../utils/formatDateTime';
import { lifecycleTimelineEventTitleZh } from '../../utils/lifecycleTimelineLabels';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { healthService } from '../../api/services/health.service';
import { RowActionGroup } from '../../components/management/RowActionGroup';
import { useSilentRealtimeRefresh } from '../../hooks/useSilentRealtimeRefresh';
import { RESOURCE_WORKFLOW_NOTIFICATION_TYPES } from '../../lib/realtimeUiSignal';
import { buildPath } from '../../constants/consoleRoutes';
import { canManagePlatformOperations } from '../../constants/platformRoleAccess';
import { isUnifiedAgentExposure } from './agentDeliveryMode';

/** 生命周期时间轴节点颜色（按 status / eventType 粗分） */
function lifecycleTimelineNodeClass(ev: LifecycleTimelineEventVO): string {
  const s = (ev.status ?? '').trim().toLowerCase();
  const t = (ev.eventType ?? '').trim().toLowerCase();
  if (s === 'published' || t === 'published') return 'bg-emerald-500 ring-emerald-500/25';
  if (s === 'pending_review' || t === 'submitted') return 'bg-amber-500 ring-amber-500/25';
  if (s === 'rejected' || t === 'rejected') return 'bg-red-500 ring-red-500/25';
  if (s === 'draft' || t === 'created') return 'bg-neutral-400 ring-neutral-400/20';
  if (s === 'deprecated') return 'bg-orange-500 ring-orange-500/25';
  if (s === 'merged_live') return 'bg-teal-500 ring-teal-500/25';
  return 'bg-sky-500 ring-sky-500/25';
}

function skillSubmitBlocked(item: ResourceCenterItemVO): boolean {
  if (item.resourceType !== 'skill') return false;
  return !Boolean(item.contextPrompt?.trim());
}

function displayResourceType(item: ResourceCenterItemVO): ResourceType {
  if (item.resourceType === 'app' && isUnifiedAgentExposure(item.agentExposure)) {
    return 'agent';
  }
  return item.resourceType;
}

function isCatalogItemOwner(item: ResourceCenterItemVO, userId: number): boolean {
  if (!Number.isFinite(userId)) return false;
  if (item.ownerId == null || item.ownerId === '') return false;
  return Number(item.ownerId) === userId;
}

function isActionAllowed(item: ResourceCenterItemVO, action: string): boolean {
  // 后端若明确返回 []，表示当前状态无可执行动作；仅在字段缺失时回退前端兜底规则。
  if (Array.isArray(item.allowedActions)) {
    return item.allowedActions.includes(action);
  }
  const s = item.status;
  switch (action) {
    case 'update':
      return s === 'draft' || s === 'rejected' || s === 'deprecated' || s === 'published';
    case 'submit':
      return s === 'draft' || s === 'rejected' || s === 'deprecated' || s === 'published';
    case 'withdraw':
      return (
        s === 'pending_review' ||
        (s === 'published' && Boolean(item.pendingPublishedUpdate))
      );
    case 'deprecate':
      return s === 'published';
    case 'delete':
      return s === 'draft';
    case 'createVersion':
      return s !== 'pending_review';
    case 'switchVersion':
      return s === 'published';
    default:
      return false;
  }
}

function normalizeVersionKey(label: string): string {
  return label.trim().toLowerCase();
}

/** 与 @VersionText 一致：v?数字(.数字)…，可选 -rc1 等后缀；比较大小时忽略后缀。 */
function parseNumericVersionBase(label: string): { segments: number[]; hasV: boolean } | null {
  const t = label.trim();
  const m = t.match(/^(v?)(\d+(?:\.\d+)*)(?:-[a-z0-9.]+)?$/i);
  if (!m) return null;
  const hasV = m[1].toLowerCase() === 'v';
  const segs = m[2].split('.').map((x) => Number.parseInt(x, 10));
  if (segs.some((n) => !Number.isFinite(n))) return null;
  return { segments: segs, hasV };
}

function compareSegmentLists(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const da = a[i] ?? 0;
    const db = b[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

function formatSemanticVersion(segments: number[], useVPrefix: boolean): string {
  const body = segments.join('.');
  return useVPrefix ? `v${body}` : body;
}

function bumpLastNumericSegment(segments: number[]): number[] {
  const next = [...segments];
  const last = next[next.length - 1];
  if (last == null || !Number.isFinite(last)) return next;
  next[next.length - 1] = last + 1;
  return next;
}

/**
 * 根据已有版本标签（含当前默认版本）生成下一版本号，避免与列表重复。
 */
function nextVersionLabelFromExisting(labels: string[]): string {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of labels) {
    const t = (raw ?? '').trim();
    if (!t) continue;
    const k = normalizeVersionKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(t);
  }

  if (unique.length === 0) return 'v1';

  const parsed: { segments: number[]; hasV: boolean }[] = [];
  for (const t of unique) {
    const p = parseNumericVersionBase(t);
    if (p) parsed.push(p);
  }

  if (parsed.length === 0) {
    let n = 1;
    let candidate = `v${n}`;
    while (seen.has(normalizeVersionKey(candidate)) && n < 100_000) {
      n += 1;
      candidate = `v${n}`;
    }
    return candidate;
  }

  let maxSeg = parsed[0]!.segments;
  for (let i = 1; i < parsed.length; i++) {
    const seg = parsed[i]!.segments;
    if (compareSegmentLists(seg, maxSeg) > 0) maxSeg = seg;
  }
  const withVCount = parsed.filter((p) => p.hasV).length;
  const useV = withVCount * 2 >= parsed.length;

  let candidateSeg = bumpLastNumericSegment(maxSeg);
  let candidate = formatSemanticVersion(candidateSeg, useV);
  let guard = 0;
  while (seen.has(normalizeVersionKey(candidate)) && guard < 10_000) {
    candidateSeg = bumpLastNumericSegment(candidateSeg);
    candidate = formatSemanticVersion(candidateSeg, useV);
    guard += 1;
  }
  return candidate;
}

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  resourceType?: ResourceType;
  allowTypeSwitch?: boolean;
  onTypeChange?: (type: ResourceType) => void;
  onNavigateRegister: (resourceType: ResourceType, id?: number) => void;
}

export const ResourceCenterManagementPage: React.FC<Props> = ({
  theme,
  fontSize,
  showMessage,
  resourceType,
  allowTypeSwitch = false,
  onTypeChange,
  onNavigateRegister,
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const authUser = useAuthStore((s) => s.user);
  const myUserId = authUser?.id ? Number(authUser.id) : NaN;
  const { platformRole, hasPermission } = useUserRole();
  const isAdminConsoleUser = canAccessAdminView(platformRole);
  const consoleRole = isAdminConsoleUser ? 'admin' : 'user';
  /** 与 AuditController publish 一致：owner / 部门管理员 / 平台侧开发者账号 */
  /** 待审核：与 ResourceAuditList / POST .../audit/resources/:id/approve|reject 一致 */
  const canAuditPendingInCatalog =
    platformRole === 'platform_admin' ||
    platformRole === 'reviewer' ||
    hasPermission('resource:audit');
  const isPlatformAdmin = platformRole === 'platform_admin';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ResourceCenterItemVO[]>([]);
  const [versionTarget, setVersionTarget] = useState<ResourceCenterItemVO | null>(null);
  const [versions, setVersions] = useState<ResourceVersionVO[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [makeNewVersionCurrent, setMakeNewVersionCurrent] = useState(true);
  const [activeType, setActiveType] = useState<ResourceType>(resourceType ?? 'agent');
  const [runningActionKey, setRunningActionKey] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ResourceStatus>('all');
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; type: 'remove' | 'deprecate' | 'withdraw' } | null>(null);
  const [platformForceTarget, setPlatformForceTarget] = useState<ResourceCenterItemVO | null>(null);
  const [platformForceReason, setPlatformForceReason] = useState('');
  const [auditRejectTarget, setAuditRejectTarget] = useState<ResourceCenterItemVO | null>(null);
  const [auditRejectReason, setAuditRejectReason] = useState('');
  const [auditRejectReasonError, setAuditRejectReasonError] = useState('');
  const [timelineTarget, setTimelineTarget] = useState<ResourceCenterItemVO | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineData, setTimelineData] = useState<LifecycleTimelineVO | null>(null);
  const [observabilityData, setObservabilityData] = useState<ObservabilitySummaryVO | null>(null);
  const [resourceHealthSnapshot, setResourceHealthSnapshot] = useState<ResourceHealthSnapshotVO | null>(null);
  const [selectedRcIds, setSelectedRcIds] = useState<Set<string>>(new Set());
  const [batchWithdrawOpen, setBatchWithdrawOpen] = useState(false);
  const [batchRcBusy, setBatchRcBusy] = useState(false);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (resourceType) setActiveType(resourceType);
  }, [resourceType]);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const pageData = await resourceCenterService.listMine({
        page,
        pageSize: PAGE_SIZE,
        resourceType: activeType,
        keyword: keyword.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortOrder: 'desc',
      });
      setItems(pageData.list);
      setTotal(pageData.total);
      setLoadError(null);
    } catch (err) {
      if (!silent) {
      const error = err instanceof Error ? err : new Error('加载资源失败');
      setLoadError(error);
      setItems([]);
      setTotal(0);
      showMessage(error.message, 'error');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [activeType, keyword, page, showMessage, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!timelineTarget) {
      setResourceHealthSnapshot(null);
      return;
    }
    let cancelled = false;
    healthService.getResourceHealth(timelineTarget.id)
      .then((snapshot) => {
        if (!cancelled) {
          setResourceHealthSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResourceHealthSnapshot(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [timelineTarget]);

  const refreshLifecyclePanelsQuiet = useCallback(async () => {
    if (!timelineTarget) return;
    const [timelineResult, observabilityResult, healthResult] = await Promise.allSettled([
      resourceCenterService.getLifecycleTimeline(timelineTarget.id),
      resourceCenterService.getObservabilitySummary(timelineTarget.resourceType, timelineTarget.id),
      healthService.getResourceHealth(timelineTarget.id),
    ]);
    if (timelineResult.status === 'fulfilled') {
      setTimelineData(timelineResult.value);
    }
    if (observabilityResult.status === 'fulfilled') {
      setObservabilityData(observabilityResult.value);
    }
    if (healthResult.status === 'fulfilled') {
      setResourceHealthSnapshot(healthResult.value);
    }
  }, [timelineTarget]);

  useSilentRealtimeRefresh(
    async () => {
      await fetchData({ silent: true });
      await refreshLifecyclePanelsQuiet();
    },
    { categories: ['audit_sync', 'health_config_sync', 'health_runtime_sync'] },
    { debounceMs: 350 },
  );

  useSilentRealtimeRefresh(
    async () => {
      await fetchData({ silent: true });
      await refreshLifecyclePanelsQuiet();
    },
    {
      categories: ['workflow_notification_sync'],
      notificationTypes: [...RESOURCE_WORKFLOW_NOTIFICATION_TYPES],
    },
    { debounceMs: 350 },
  );

  const clearRcSelection = useCallback(() => setSelectedRcIds(new Set()), []);

  useEffect(() => {
    clearRcSelection();
  }, [page, keyword, statusFilter, activeType, clearRcSelection]);

  const runBatchWithdraw = useCallback(async () => {
    const ids = items
      .filter(
        (i) =>
          selectedRcIds.has(String(i.id)) &&
          isActionAllowed(i, 'withdraw') &&
          isCatalogItemOwner(i, myUserId),
      )
      .map((i) => i.id);
    if (!ids.length) return;
    setBatchRcBusy(true);
    try {
      await resourceCenterService.batchWithdraw(ids);
      showMessage(`已批量撤回 ${ids.length} 条资源`, 'success');
      setBatchWithdrawOpen(false);
      clearRcSelection();
      await fetchData();
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '批量撤回失败', 'error');
    } finally {
      setBatchRcBusy(false);
    }
  }, [items, selectedRcIds, myUserId, showMessage, fetchData, clearRcSelection]);

  const title = useMemo(() => {
    if (allowTypeSwitch) return '资源中心';
    return `${RESOURCE_TYPE_LABEL_ZH[activeType]}资源管理`;
  }, [allowTypeSwitch, activeType]);

  /** 新建版本号：根据版本列表与当前默认版本自动递增，不可手填。 */
  const autoNewVersion = useMemo(() => {
    if (versionTarget == null) return 'v1';
    const fromList = versions.map((v) => String(v.version ?? '').trim()).filter(Boolean);
    const cur = versionTarget.currentVersion?.trim() ?? '';
    const labels = cur ? [...fromList, cur] : [...fromList];
    return nextVersionLabelFromExisting(labels);
  }, [versionTarget, versions]);

  const closeVersionModal = () => {
    setVersionTarget(null);
    setVersions([]);
    setMakeNewVersionCurrent(true);
  };

  const openVersions = async (item: ResourceCenterItemVO) => {
    setVersionTarget(item);
    setVersions([]);
    setVersionsLoading(true);
    setMakeNewVersionCurrent(true);
    try {
      const data = await resourceCenterService.listVersions(item.id);
      setVersions(data);
    } catch (err) {
      setVersions([]);
      showMessage(err instanceof Error ? err.message : '加载版本列表失败', 'error');
    } finally {
      setVersionsLoading(false);
    }
  };

  const runAction = async (actionKey: string, action: () => Promise<void>, okText: string) => {
    setRunningActionKey(actionKey);
    try {
      await action();
      showMessage(okText, 'success');
      await fetchData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setRunningActionKey(null);
    }
  };

  const runMutationAction = async (
    actionKey: string,
    action: () => Promise<ResourceCenterItemVO>,
    okText: string,
  ): Promise<ResourceCenterItemVO | undefined> => {
    setRunningActionKey(actionKey);
    try {
      const updated = await action();
      setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)));
      showMessage(updated.statusHint || okText, 'success');
      await fetchData();
      return updated;
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '操作失败', 'error');
      return undefined;
    } finally {
      setRunningActionKey(null);
    }
  };

  /** 创建/切换版本后同步弹窗标题区的「当前版本」与列表行状态，避免仅刷新外层列表、弹窗仍显示旧元数据 */
  const syncVersionModalFromServer = useCallback(
    async (resourceId: number) => {
      try {
        const [fresh, vers] = await Promise.all([
          resourceCenterService.getById(resourceId),
          resourceCenterService.listVersions(resourceId),
        ]);
        setVersionTarget(fresh);
        setVersions(vers);
      } catch (e) {
        showMessage(e instanceof Error ? e.message : '刷新版本信息失败', 'error');
      }
    },
    [showMessage],
  );

  const canApplyVersionSnapshotToWorkingCopy = useMemo(() => {
    if (versionTarget == null) return false;
    if (versionTarget.pendingPublishedUpdate) return false;
    const st = String(versionTarget.status ?? '').trim().toLowerCase();
    return st !== 'pending_review';
  }, [versionTarget]);

  const writeBackBlockedByMainStatus = useMemo(() => {
    if (versionTarget == null) return false;
    if (versionTarget.pendingPublishedUpdate) return true;
    const st = String(versionTarget.status ?? '').trim().toLowerCase();
    return st === 'pending_review';
  }, [versionTarget]);

  const applyWriteBackDisabled =
    !canApplyVersionSnapshotToWorkingCopy || !!runningActionKey;
  const applyWriteBackDisabledClass = applyWriteBackDisabled
    ? 'cursor-not-allowed opacity-45'
    : '';

  const runApplyVersionToWorkingCopy = useCallback(
    async (versionLabel: string, openEditorAfter: boolean) => {
      if (!versionTarget) return;
      const key = openEditorAfter
        ? `apply-open-${versionTarget.id}-${versionLabel}`
        : `apply-wc-${versionTarget.id}-${versionLabel}`;
      setRunningActionKey(key);
      try {
        await resourceCenterService.applyVersionToWorkingCopy(versionTarget.id, versionLabel);
        showMessage(
          openEditorAfter
            ? `版本 ${versionLabel} 已写入登记草稿，正在打开登记页`
            : versionTarget.status === 'published'
              ? `版本 ${versionLabel} 已写入登记草稿（已发布资源在审核通过前不影响线上默认解析）`
              : `已将版本 ${versionLabel} 快照写回主资源，可在列表点「编辑」后继续提审/发布`,
          'success',
        );
        await fetchData();
        await syncVersionModalFromServer(versionTarget.id);
        if (openEditorAfter) {
          onNavigateRegister(versionTarget.resourceType, versionTarget.id);
          setVersionTarget(null);
          setVersions([]);
          setMakeNewVersionCurrent(true);
        }
      } catch (err) {
        showMessage(err instanceof Error ? err.message : '写回主资源失败', 'error');
      } finally {
        setRunningActionKey(null);
      }
    },
    [versionTarget, showMessage, fetchData, syncVersionModalFromServer, onNavigateRegister],
  );

  const openLifecycleModal = async (item: ResourceCenterItemVO) => {
    setTimelineTarget(item);
    setTimelineLoading(true);
    setTimelineData(null);
    setObservabilityData(null);
    setResourceHealthSnapshot(null);
    try {
      const [timelineResult, observabilityResult] = await Promise.allSettled([
        resourceCenterService.getLifecycleTimeline(item.id),
        resourceCenterService.getObservabilitySummary(item.resourceType, item.id),
      ]);
      if (timelineResult.status === 'fulfilled') {
        setTimelineData(timelineResult.value);
      }
      if (observabilityResult.status === 'fulfilled') {
        setObservabilityData(observabilityResult.value);
      }
      if (timelineResult.status === 'rejected' && observabilityResult.status === 'rejected') {
        showMessage('加载生命周期失败', 'error');
      } else if (timelineResult.status === 'rejected' || observabilityResult.status === 'rejected') {
        showMessage('生命周期/观测数据部分加载失败，已展示可用数据', 'warning');
      }
    } finally {
      setTimelineLoading(false);
    }
  };

  const resourceListActions = (
    <>
      <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)} aria-label="刷新资源列表">
        <RefreshCw size={15} aria-hidden />
        刷新
      </button>
      <button
        type="button"
        onClick={() => navigate(`${buildPath(consoleRole, 'capability-register')}?type=${activeType}`)}
        className={btnSecondary(theme)}
        aria-label="智能导入能力"
        title="智能导入能力"
      >
        <Boxes size={15} aria-hidden />
        智能导入能力
      </button>
      {activeType === 'skill' ? (
        <button type="button" onClick={() => onNavigateRegister('skill')} className={btnPrimary}>
          <Plus size={15} aria-hidden />
          注册 Context 技能
        </button>
      ) : (
        <button type="button" onClick={() => onNavigateRegister(activeType)} className={btnPrimary}>
          <Plus size={15} aria-hidden />
          注册{RESOURCE_TYPE_LABEL_ZH[activeType]}
        </button>
      )}
    </>
  );

  const shellToolbar = allowTypeSwitch ? undefined : (
    <div className="flex flex-wrap items-center justify-end gap-2 w-full">{resourceListActions}</div>
  );

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Boxes}
        breadcrumbSegments={['资源中心', title]}
        description={
          isAdminConsoleUser
            ? '仅展示您本人登记与维护的资源。全站资源的查看与审批请使用侧栏「资源与运营 → 资源审核」。'
            : '资源中心闭环：注册、提审、审核（待审核时审核员可在此通过/驳回）、测试发布、版本、下线'
        }
        toolbar={shellToolbar}
        contentScroll="document"
      >
        <div className="px-4 sm:px-6 pb-8">
          <div className={`${bentoCard(theme)} overflow-hidden`}>
            {allowTypeSwitch && (
            <div
              className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-3 border-b px-6 py-4 ${
                isDark ? 'border-white/[0.06]' : 'border-slate-100'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {RESOURCE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setActiveType(type);
                      setPage(1);
                      onTypeChange?.(type);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                      type === activeType
                        ? 'bg-neutral-900 text-white'
                        : isDark
                          ? 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {RESOURCE_TYPE_LABEL_ZH[type]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">{resourceListActions}</div>
            </div>
          )}

          <div className={`px-6 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-40">
                <FilterSelect
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value as typeof statusFilter);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: '全部状态' },
                    { value: 'draft', label: '草稿' },
                    { value: 'pending_review', label: '待审核' },
                    { value: 'published', label: '已发布' },
                    { value: 'rejected', label: '已驳回' },
                    { value: 'deprecated', label: '已暂停对外' },
                    { value: 'merged_live', label: '已合并上线' },
                  ]}
                  theme={theme}
                />
              </div>
              <div className="flex-1 min-w-[min(100%,220px)]">
                <SearchInput
                  value={keyword}
                  onChange={(value) => {
                    setKeyword(value);
                    setPage(1);
                  }}
                  placeholder="搜索名称、编码、描述..."
                  theme={theme}
                />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {loading ? (
              <PageSkeleton type="table" rows={8} />
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载资源" />
            ) : items.length === 0 ? (
              <EmptyState
                title="暂无资源"
                description="当前筛选条件下没有资源，可调整状态或搜索条件；新建资源请使用标签行右侧按钮。"
              />
            ) : (
              <>
              <div className="px-1">
                <MgmtBatchToolbar theme={theme} count={selectedRcIds.size} onClear={clearRcSelection}>
                  <button
                    type="button"
                    className={mgmtTableActionGhost(theme)}
                    disabled={batchRcBusy || selectedRcIds.size === 0}
                    onClick={() => setBatchWithdrawOpen(true)}
                  >
                    批量撤回（需为资源负责人且可撤回）
                  </button>
                </MgmtBatchToolbar>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={`${item.resourceType}-${item.id}`} className={`${bentoCardHover(theme)} p-4`}>
                    <div className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      className={`${lantuCheckboxPrimaryClass} mt-1 shrink-0`}
                      checked={selectedRcIds.has(String(item.id))}
                      disabled={!isActionAllowed(item, 'withdraw') || !isCatalogItemOwner(item, myUserId)}
                      onChange={() => {
                        setSelectedRcIds((prev) => {
                          const next = new Set(prev);
                          const k = String(item.id);
                          if (next.has(k)) next.delete(k);
                          else next.add(k);
                          return next;
                        });
                      }}
                      aria-label={`多选撤回：${item.displayName}`}
                    />
                    <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate font-semibold ${textPrimary(theme)}`}>
                          {item.displayName}
                          <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {RESOURCE_TYPE_LABEL_ZH[displayResourceType(item)]}
                          </span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={statusBadgeClass(item.status, theme)}>
                            <span className={statusDot(item.status)} />
                            {statusLabel(item.status)}
                          </span>
                          <span className={`text-xs ${textMuted(theme)}`}>
                            {nullDisplay(item.resourceCode)} · 线上 {nullDisplay(item.currentVersion, '—')}
                            {item.status === 'published' && item.hasWorkingDraft ? ' · 草稿已保存' : ''}
                            {item.status === 'published' && item.pendingPublishedUpdate ? ' · 变更待审核' : ''}
                            {item.sourceType ? ` · ${item.sourceType}` : ''}
                            {item.ownerName ? ` · ${item.ownerName}` : ''}
                          </span>
                        </div>
                        <div className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-xs ${textMuted(theme)}`}>
                          <span>创建: {nullDisplay(formatDateTime(item.createTime))}</span>
                          <span>更新: {nullDisplay(formatDateTime(item.updateTime))}</span>
                          {item.catalogTagNames && item.catalogTagNames.length > 0 && (
                            <span>目录标签: {item.catalogTagNames.slice(0, 5).join(', ')}</span>
                          )}
                          {item.resourceType === 'dataset' && item.tags && item.tags.length > 0 && (
                            <span>
                              {item.catalogTagNames?.length ? ' · ' : ''}数据标签: {item.tags.slice(0, 3).join(', ')}
                            </span>
                          )}
                          {item.endpoint && <span className="font-mono">端点: {item.endpoint}</span>}
                          {item.resourceType === 'skill' && (
                            <span>
                              技能形态:{' '}
                              <span className={textSecondary(theme)}>Context（目录 / resolve）</span>
                            </span>
                          )}
                          {item.resourceType === 'skill' && item.relatedMcpResourceIds && item.relatedMcpResourceIds.length > 0 && (
                            <span className="font-mono" title="skill_depends_mcp">
                              绑定 MCP: {item.relatedMcpResourceIds.join(', ')}
                            </span>
                          )}
                          {item.resourceType === 'agent' && item.relatedMcpResourceIds && item.relatedMcpResourceIds.length > 0 && (
                            <span className="font-mono" title="agent_depends_mcp">
                              绑定 MCP: {item.relatedMcpResourceIds.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <RowActionGroup
                          theme={theme}
                          actions={[
                            {
                              key: 'edit',
                              label: '编辑',
                              icon: Pencil,
                              hidden: !isActionAllowed(item, 'update'),
                              onClick: () => onNavigateRegister(displayResourceType(item), item.id),
                            },
                            {
                              key: 'version',
                              label: '版本',
                              icon: GitBranch,
                              hidden: !isActionAllowed(item, 'createVersion'),
                              onClick: () => void openVersions(item),
                            },
                            {
                              key: 'lifecycle',
                              label: '生命周期',
                              icon: Clock3,
                              onClick: () => void openLifecycleModal(item),
                            },
                            {
                              key: 'submit',
                              label: runningActionKey === `submit-${item.id}` ? '提交中' : '提交审核',
                              icon: CheckCircle2,
                              tone: 'positive',
                              hidden: !isActionAllowed(item, 'submit'),
                              disabled: runningActionKey === `submit-${item.id}` || skillSubmitBlocked(item),
                              title:
                                skillSubmitBlocked(item) && item.resourceType === 'skill'
                                  ? 'Context 技能须填写规范 Markdown（contextPrompt）后再提交审核'
                                  : undefined,
                              onClick: () =>
                                void runMutationAction(`submit-${item.id}`, () => resourceCenterService.submit(item.id), '已提交审核'),
                            },
                            {
                              key: 'approve',
                              label: runningActionKey === `audit-approve-${item.id}` ? '处理中' : '通过审核',
                              icon: CheckCircle2,
                              tone: 'positive',
                              hidden: item.status !== 'pending_review' || !canAuditPendingInCatalog,
                              disabled: !!runningActionKey && runningActionKey !== `audit-approve-${item.id}`,
                              title: '与“资源审核”台一致：通过后直接发布上线',
                              onClick: () =>
                                void runAction(
                                  `audit-approve-${item.id}`,
                                  () => resourceAuditService.approve(item.id),
                                  '已通过审核，资源已直接发布上线',
                                ),
                            },
                            {
                              key: 'reject',
                              label: '驳回',
                              icon: XCircle,
                              tone: 'danger',
                              hidden: item.status !== 'pending_review' || !canAuditPendingInCatalog,
                              disabled: !!runningActionKey,
                              onClick: () => {
                                setAuditRejectTarget(item);
                                setAuditRejectReason('');
                                setAuditRejectReasonError('');
                              },
                            },
                            {
                              key: 'withdraw',
                              label: runningActionKey === `withdraw-${item.id}` ? '撤回中' : '撤回审核',
                              icon: Undo2,
                              hidden: !isActionAllowed(item, 'withdraw') || !isCatalogItemOwner(item, myUserId),
                              disabled: runningActionKey === `withdraw-${item.id}`,
                              onClick: () => setConfirmAction({ id: item.id, type: 'withdraw' }),
                            },
                            {
                              key: 'deprecate',
                              label: runningActionKey === `deprecate-${item.id}` ? '处理中' : '暂停对外',
                              icon: Ban,
                              hidden: !isActionAllowed(item, 'deprecate'),
                              disabled: runningActionKey === `deprecate-${item.id}`,
                              onClick: () => setConfirmAction({ id: item.id, type: 'deprecate' }),
                            },
                            {
                              key: 'delete',
                              label: runningActionKey === `remove-${item.id}` ? '删除中' : '删除',
                              icon: Trash2,
                              tone: 'danger',
                              hidden: !isActionAllowed(item, 'delete'),
                              disabled: runningActionKey === `remove-${item.id}`,
                              onClick: () => setConfirmAction({ id: item.id, type: 'remove' }),
                            },
                            {
                              key: 'force-deprecate',
                              label: '强制下架',
                              icon: Ban,
                              tone: 'danger',
                              hidden: item.status !== 'published' || !isPlatformAdmin,
                              disabled: runningActionKey === `pfdep-${item.id}`,
                              onClick: () => {
                                setPlatformForceTarget(item);
                                setPlatformForceReason('');
                              },
                            },
                          ]}
                        />
                      </div>
                    </div>
                    <p className={`mt-2 text-xs ${textSecondary(theme)}`}>{nullDisplay(item.description, '暂无描述')}</p>
                    <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${textSecondary(theme)}`}>
                      <span>运行健康</span>
                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${resourceHealthBadgeClass(theme, item.healthStatus)}`}
                        title={
                          item.degradationHint
                            ? `健康探针结论与运营提示：${item.degradationHint}`
                            : item.healthStatus
                              ? `与监控中心健康检查表一致，原始值：${item.healthStatus}。广场「调用状态」与网关一致：仅 down/disabled 与健康拦截，熔断仅 OPEN/FORCED_OPEN；降级提示来自最近一次调用或熔断状态，不等同于探针结论`
                              : '未返回健康字段时多为未配置探测'
                        }
                      >
                        {resourceHealthLabelZh(item.healthStatus)}
                      </span>
                      <span>调用状态</span>
                      <span
                        className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${resourceCallabilityBadgeClass(theme, item.callabilityState)}`}
                        title={item.callabilityReason ? `最终裁决原因：${item.callabilityReason}` : undefined}
                      >
                        {resourceCallabilityLabelZh(item.callabilityState)}
                      </span>
                      {item.circuitState && item.circuitState !== 'unknown' ? (
                        <span className="opacity-80" title="熔断状态">
                          · 熔断 {circuitBreakerLabelZh(item.circuitState)}
                        </span>
                      ) : null}
                    </div>
                    {(item.statusHint || item.lastRejectReason || item.degradationHint) && (
                      <div className={`mt-2 rounded-lg px-2 py-1.5 text-xs ${isDark ? 'bg-white/[0.03] text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                        {item.statusHint ? <div>登记/生命周期提示: {item.statusHint}</div> : null}
                        {item.lastRejectReason && item.status !== 'rejected' ? <div>驳回原因: {item.lastRejectReason}</div> : null}
                        {item.degradationHint ? <div>降级提示: {item.degradationHint}</div> : null}
                      </div>
                    )}
                    </div>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
          <div className={`px-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        </div>
        </div>
      </MgmtPageShell>

      <Modal
        open={!!versionTarget}
        onClose={closeVersionModal}
        title={versionTarget ? `版本管理 · ${versionTarget.displayName}` : '版本管理'}
        theme={theme}
        size="lg"
      >
        {versionTarget && (
          <>
            <div
              className={`mb-3 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
                isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className={textSecondary(theme)}>
                <span className="font-medium text-slate-900 dark:text-slate-100">版本在做什么：</span>
                新建版本会把<strong className="font-medium">当时线上默认解析用的配置</strong>打成快照存入历史，便于<strong>回退默认版本</strong>；<strong>不会</strong>自动生成「可编辑副本」。
                列表中每条<strong className="font-medium">生效中</strong>的版本可使用<strong className="font-medium">写回登记</strong>：对已发布资源写入<strong>登记草稿</strong>（不影响线上解析，需保存后提交审核合并）；首次处于<strong className="font-medium">待审核</strong>时请先审结或撤回。
              </p>
              {versionTarget.status === 'published' && (
                <p className={`mt-2 ${isDark ? 'text-amber-200/95' : 'text-amber-900'}`}>
                  <span className="font-medium">若要改 URL、说明等再继续上架：</span>
                  若需将整个资源改为可任意编辑的<strong className="font-medium">已暂停对外</strong>状态，可在列表点「暂停对外」。日常改版推荐：直接点「编辑」改<strong>草稿</strong>并「保存并提审」。快照与「设为当前」仅影响<strong>默认解析版本</strong>。
                </p>
              )}
              {(versionTarget.status === 'draft' ||
                versionTarget.status === 'rejected' ||
                versionTarget.status === 'deprecated') && (
                <p className={`mt-2 ${textMuted(theme)}`}>
                  当前可编辑：可直接关闭本窗口，在列表点「编辑」更新主资源；保存后主表变更，需要时可再来此<strong>新建版本</strong>保留历史快照。
                </p>
              )}
            </div>
            <details className={`mb-3 text-xs ${textMuted(theme)}`}>
              <summary className="cursor-pointer select-none font-medium text-slate-600 dark:text-slate-400">
                开发者：接口与快照行为说明
              </summary>
              <p className="mt-2 leading-relaxed pl-0.5">
                列表 <span className="font-mono text-xs">GET /resource-center/resources/:id/versions</span>；新建{' '}
                <span className="font-mono text-xs">POST …/versions</span>（body：<span className="font-mono text-xs">version</span>、
                <span className="font-mono text-xs">makeCurrent</span>）写入当前主资源快照；切换默认{' '}
                <span className="font-mono text-xs">POST …/versions/:version/switch</span>，仅 <span className="font-mono text-xs">active</span> 可切；
                写回主资源 <span className="font-mono text-xs">POST …/versions/:version/apply-to-working-copy</span>。
              </p>
            </details>
            {isActionAllowed(versionTarget, 'update') && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`${btnSecondary(theme)} inline-flex items-center gap-1.5`}
                  onClick={() => {
                    onNavigateRegister(versionTarget.resourceType, versionTarget.id);
                    closeVersionModal();
                  }}
                >
                  <Pencil size={14} aria-hidden />
                  去编辑登记页（改主资源）
                </button>
              </div>
            )}
            {writeBackBlockedByMainStatus && (
              <p
                className={`mb-3 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
                  isDark
                    ? 'border-amber-500/35 bg-amber-500/10 text-amber-100'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                <span className="font-medium">写回按钮当前不可点：</span>
                {versionTarget.pendingPublishedUpdate
                  ? '已发布变更正在审核中，请先等待审结或撤回后再写回版本快照。'
                  : `主资源为「${statusLabel(versionTarget.status)}」且处于待审流程时不可写回。请等待审结或撤回到可编辑态。`}
              </p>
            )}
            <div className="space-y-2">
              {versionsLoading ? (
                <p className={`py-4 text-center text-sm ${textMuted(theme)}`}>加载版本列表…</p>
              ) : versions.length === 0 ? (
                <p className={`text-sm ${textMuted(theme)}`}>
                  暂无版本记录。创建第一个版本时，后端会根据当前资源自动生成快照并写入。
                </p>
              ) : (
                versions.map((ver) => {
                  const status = (ver.status ?? 'active').toLowerCase();
                  const canSwitch = !ver.isCurrent && status === 'active';
                  const applyKey = `apply-wc-${versionTarget.id}-${ver.version}`;
                  const applyOpenKey = `apply-open-${versionTarget.id}-${ver.version}`;
                  return (
                    <div
                      key={`${ver.id}-${ver.version}`}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-medium ${textPrimary(theme)}`}>{ver.version}</span>
                          {ver.isCurrent && (
                            <span className={`rounded px-1.5 py-0.5 text-xs ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'}`}>
                              当前默认
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                              status === 'active'
                                ? isDark
                                  ? 'bg-emerald-500/15 text-emerald-200'
                                  : 'bg-emerald-100 text-emerald-900'
                                : isDark
                                  ? 'bg-amber-500/15 text-amber-200'
                                  : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {resourceVersionSnapshotLabelZh(ver.status)}
                          </span>
                        </div>
                        {ver.createTime && (
                          <p className={`mt-0.5 text-xs ${textMuted(theme)}`}>创建 {formatDateTime(ver.createTime)}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                        {canSwitch && (
                          <button
                            type="button"
                            title="将网关解析与目录默认指向此版本（回退即切换到较早的 active 版本）"
                            disabled={!!runningActionKey}
                            onClick={async () => {
                              const updated = await runMutationAction(
                                `switch-version-${versionTarget.id}-${ver.version}`,
                                () => resourceCenterService.switchVersion(versionTarget.id, ver.version),
                                `已设为当前版本 ${ver.version}`,
                              );
                              if (updated) {
                                await syncVersionModalFromServer(versionTarget.id);
                              }
                            }}
                            className={btnGhost(theme)}
                          >
                            设为当前
                          </button>
                        )}
                        {status === 'active' && (
                          <>
                            <button
                              type="button"
                              title={
                                canApplyVersionSnapshotToWorkingCopy
                                  ? '将该版本快照写入登记草稿（已发布时保存后不影响线上）'
                                  : '待审核中或已有待审的已发布变更时不可写回'
                              }
                              disabled={applyWriteBackDisabled}
                              onClick={() => void runApplyVersionToWorkingCopy(ver.version, false)}
                              className={`${btnGhost(theme)} ${applyWriteBackDisabledClass}`}
                            >
                              {runningActionKey === applyKey ? '写回中…' : '写回登记'}
                            </button>
                            <button
                              type="button"
                              title={
                                canApplyVersionSnapshotToWorkingCopy
                                  ? '写入草稿并打开登记页'
                                  : '待审核中或已有待审的已发布变更时不可写回'
                              }
                              disabled={applyWriteBackDisabled}
                              onClick={() => void runApplyVersionToWorkingCopy(ver.version, true)}
                              className={`${btnSecondary(theme)} text-sm ${applyWriteBackDisabledClass}`}
                            >
                              {runningActionKey === applyOpenKey ? '打开中…' : '写回并打开登记页'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className={`mt-4 border-t pt-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
              <p className={`mb-2 text-xs ${textSecondary(theme)}`}>
                新建版本：下一版本号由系统根据已有版本自动递增；格式须符合{' '}
                <span className="font-mono">v?数字[.数字]…</span>，可选后缀如 <span className="font-mono">-rc1</span>（与后端{' '}
                <span className="font-mono">@VersionText</span> 一致）。
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  readOnly
                  value={autoNewVersion}
                  className={`min-w-0 flex-1 cursor-default rounded-xl border px-3 py-2 text-sm ${isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                  aria-label="将创建的版本号（自动递增）"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const vv = autoNewVersion.trim();
                    if (!vv) {
                      showMessage('无法生成版本号，请刷新后重试', 'error');
                      return;
                    }
                    setRunningActionKey(`create-version-${versionTarget.id}`);
                    try {
                      await resourceCenterService.createVersion(versionTarget.id, {
                        version: vv,
                        makeCurrent: makeNewVersionCurrent,
                      });
                      showMessage(
                        makeNewVersionCurrent ? `已创建并设为当前版本 ${vv}` : `已创建版本 ${vv}（可在列表中切换默认）`,
                        'success',
                      );
                      await fetchData();
                      await syncVersionModalFromServer(versionTarget.id);
                    } catch (err) {
                      showMessage(err instanceof Error ? err.message : '创建版本失败', 'error');
                    } finally {
                      setRunningActionKey(null);
                    }
                  }}
                  disabled={runningActionKey === `create-version-${versionTarget.id}`}
                  className={btnPrimary}
                >
                  {runningActionKey === `create-version-${versionTarget.id}` ? '创建中…' : '新建版本'}
                </button>
              </div>
              <label className={`mt-2 flex cursor-pointer items-center gap-2 text-sm ${textSecondary(theme)}`}>
                <input
                  type="checkbox"
                  className={lantuCheckboxPrimaryClass}
                  checked={makeNewVersionCurrent}
                  onChange={(e) => setMakeNewVersionCurrent(e.target.checked)}
                />
                创建后立即设为当前默认解析版本
              </label>
              {!makeNewVersionCurrent && (
                <p className={`mt-1 text-xs ${isDark ? 'text-amber-200/90' : 'text-amber-800'}`}>
                  若取消勾选，新版本可能不会成为「当前」解析版本，直至你手动「设为当前」。
                </p>
              )}
            </div>
          </>
        )}
      </Modal>
      {auditRejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => { setAuditRejectTarget(null); setAuditRejectReasonError(''); }}
        >
          <div className={`${bentoCard(theme)} w-full max-w-lg p-4`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>
              驳回资源审核 · {auditRejectTarget.displayName}
            </h3>
            <p className={`mt-1 text-xs leading-relaxed ${textMuted(theme)}`}>
              与「资源审核」台相同接口：<span className="font-mono">POST /audit/resources/{'{id}'}/reject</span>，id 为资源主键。
            </p>
            <label htmlFor="resource-center-audit-reject-reason" className={`mt-3 block text-xs font-medium ${textSecondary(theme)}`}>
              驳回原因
            </label>
            <AutoHeightTextarea
              id="resource-center-audit-reject-reason"
              minRows={4}
              maxRows={14}
              value={auditRejectReason}
              onChange={(e) => {
                setAuditRejectReason(e.target.value);
                setAuditRejectReasonError('');
              }}
              className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm resize-none ${
                isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
              }${auditRejectReasonError ? ` ${inputBaseError()}` : ''}`}
              placeholder="请输入驳回原因"
              aria-invalid={!!auditRejectReasonError}
              aria-describedby={auditRejectReasonError ? 'resource-center-audit-reject-err' : undefined}
            />
            {auditRejectReasonError ? (
              <p id="resource-center-audit-reject-err" className={`mt-1.5 ${fieldErrorText()} text-xs`} role="alert">
                {auditRejectReasonError}
              </p>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className={btnGhost(theme)}
                onClick={() => { setAuditRejectTarget(null); setAuditRejectReasonError(''); }}
              >
                取消
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={runningActionKey === `audit-reject-${auditRejectTarget.id}`}
                onClick={async () => {
                  if (!auditRejectReason.trim()) {
                    setAuditRejectReasonError('驳回原因不能为空');
                    return;
                  }
                  setAuditRejectReasonError('');
                  setRunningActionKey(`audit-reject-${auditRejectTarget.id}`);
                  try {
                    await resourceAuditService.reject(auditRejectTarget.id, { reason: auditRejectReason.trim() });
                    showMessage('已驳回', 'success');
                    setAuditRejectReason('');
                    setAuditRejectTarget(null);
                    await fetchData();
                  } catch (err) {
                    showMessage(err instanceof Error ? err.message : '驳回失败', 'error');
                  } finally {
                    setRunningActionKey(null);
                  }
                }}
              >
                {runningActionKey === `audit-reject-${auditRejectTarget.id}` ? '提交中…' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
      {platformForceTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setPlatformForceTarget(null)}
        >
          <div className={`${bentoCard(theme)} w-full max-w-lg p-4`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>
              平台强制下架 · {platformForceTarget.displayName}
            </h3>
            <p className={`mt-2 text-xs leading-relaxed ${textMuted(theme)}`}>
              仅平台管理员可操作；资源将进入「已暂停对外」，与开发者自助下线不同。原因会通知资源负责人。
            </p>
            <AutoHeightTextarea
              minRows={4}
              maxRows={14}
              value={platformForceReason}
              onChange={(e) => setPlatformForceReason(e.target.value)}
              className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm resize-none ${
                isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
              }`}
              placeholder="下架原因（可选，空则记为「平台强制下架」）"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className={btnGhost(theme)} onClick={() => setPlatformForceTarget(null)}>
                取消
              </button>
              <button
                type="button"
                className={mgmtTableActionDanger}
                disabled={runningActionKey === `pfdep-${platformForceTarget.id}`}
                onClick={() => {
                  const id = platformForceTarget.id;
                  void runAction(
                    `pfdep-${id}`,
                    () =>
                      resourceAuditService.platformForceDeprecate(id, {
                        reason: platformForceReason.trim() || undefined,
                      }),
                    '已执行平台强制下架',
                  ).finally(() => {
                    setPlatformForceTarget(null);
                    setPlatformForceReason('');
                  });
                }}
              >
                {runningActionKey === `pfdep-${platformForceTarget.id}` ? '执行中…' : '确认下架'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={batchWithdrawOpen}
        title="批量撤回资源"
        message={`将撤回已选且符合条件的资源（与单条「撤回审核」相同接口）。确认撤回 ${items.filter((i) => selectedRcIds.has(String(i.id)) && isActionAllowed(i, 'withdraw') && isCatalogItemOwner(i, myUserId)).length} 条？`}
        variant="warning"
        confirmText="确认撤回"
        loading={batchRcBusy}
        onConfirm={() => void runBatchWithdraw()}
        onCancel={() => setBatchWithdrawOpen(false)}
      />
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'remove' ? '删除资源' : confirmAction?.type === 'deprecate' ? '暂停对外开放' : '撤回审核'}
        message={
          confirmAction?.type === 'remove'
            ? '确认删除该草稿资源？删除后不可恢复。'
            : confirmAction?.type === 'deprecate'
              ? '确认将资源标记为「已暂停对外」？历史版本数据将保留。'
              : '确认将该资源撤回到草稿状态？'
        }
        confirmText={
          confirmAction?.type === 'remove'
            ? '确认删除'
            : confirmAction?.type === 'deprecate'
              ? '确认暂停对外'
              : '确认撤回'
        }
        variant={confirmAction?.type === 'withdraw' ? 'warning' : 'danger'}
        loading={!!confirmAction && runningActionKey === `${confirmAction.type}-${confirmAction.id}`}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          const { id, type } = confirmAction;
          const actionKey = `${type}-${id}`;
          if (type === 'remove') {
            void runAction(actionKey, () => resourceCenterService.remove(id), '已删除').finally(() => setConfirmAction(null));
            return;
          }
          if (type === 'deprecate') {
            void runMutationAction(actionKey, () => resourceCenterService.deprecate(id), '已暂停对外开放').finally(() =>
              setConfirmAction(null),
            );
            return;
          }
          void runMutationAction(actionKey, () => resourceCenterService.withdraw(id), '已撤回').finally(() => setConfirmAction(null));
        }}
      />
      <Modal
        open={!!timelineTarget}
        onClose={() => {
          setTimelineTarget(null);
          setTimelineData(null);
          setObservabilityData(null);
        }}
        title={timelineTarget ? `生命周期与观测 · ${timelineTarget.displayName}` : '生命周期与观测'}
        theme={theme}
        size="lg"
      >
        {timelineLoading ? (
          <PageSkeleton type="detail" />
        ) : (
          <div className="space-y-3">
            {observabilityData && (
              <div className={`rounded-xl border p-3 text-xs ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex flex-wrap items-center gap-2 py-0.5">
                  <span className={textSecondary(theme)}>健康</span>
                  <span
                    className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${resourceHealthBadgeClass(theme, observabilityData.healthStatus)}`}
                    title={observabilityData.healthStatus ? `原始值：${observabilityData.healthStatus}` : undefined}
                  >
                    {resourceHealthLabelZh(observabilityData.healthStatus)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 py-0.5">
                  <span className={textSecondary(theme)}>熔断</span>
                  <span
                    className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${circuitBreakerBadgeClass(theme, observabilityData.circuitState)}`}
                    title={observabilityData.circuitState ? `原始值：${observabilityData.circuitState}` : undefined}
                  >
                    {circuitBreakerLabelZh(observabilityData.circuitState)}
                  </span>
                </div>
                <div className={`mt-1.5 ${textPrimary(theme)}`}>质量分: {nullDisplay(observabilityData.qualityScore)}</div>
                {observabilityData.generatedAt ? (
                  <div className={`mt-1 ${textSecondary(theme)}`}>生成时间: {nullDisplay(formatDateTime(observabilityData.generatedAt))}</div>
                ) : null}
                {observabilityData.degradationHint?.userFacingHint ? (
                  <div className={`mt-1.5 ${textSecondary(theme)}`}>提示: {observabilityData.degradationHint.userFacingHint}</div>
                ) : null}
              </div>
            )}
            {resourceHealthSnapshot && (
              <div className={`rounded-xl border p-3 text-xs ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={textSecondary(theme)}>资源健康</span>
                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${resourceHealthBadgeClass(theme, resourceHealthSnapshot.healthStatus)}`}>
                    {resourceHealthLabelZh(resourceHealthSnapshot.healthStatus)}
                  </span>
                  <span className={textSecondary(theme)}>可调用</span>
                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${resourceCallabilityBadgeClass(theme, resourceHealthSnapshot.callabilityState)}`}>
                    {resourceCallabilityLabelZh(resourceHealthSnapshot.callabilityState)}
                  </span>
                  <span className={textSecondary(theme)}>熔断</span>
                  <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${circuitBreakerBadgeClass(theme, resourceHealthSnapshot.circuitState)}`}>
                    {circuitBreakerLabelZh(resourceHealthSnapshot.circuitState)}
                  </span>
                </div>
                <div className={`mt-1.5 ${textPrimary(theme)}`}>原因: {nullDisplay(resourceHealthSnapshot.callabilityReason || resourceHealthSnapshot.lastFailureReason, '暂无')}</div>
                <div className={`mt-1 ${textSecondary(theme)}`}>
                  最近探测: {nullDisplay(formatDateTime(resourceHealthSnapshot.lastProbeAt))}
                  {' · '}
                  连续失败: {nullDisplay(resourceHealthSnapshot.consecutiveFailure)}
                  {' · '}
                  延迟: {nullDisplay(resourceHealthSnapshot.probeLatencyMs)}ms
                </div>
                {resourceHealthSnapshot.probePayloadSummary ? (
                  <div className={`mt-1 ${textSecondary(theme)}`}>探测摘要: {resourceHealthSnapshot.probePayloadSummary}</div>
                ) : null}
                {canManagePlatformOperations(platformRole) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnSecondary(theme)}
                      onClick={async () => {
                        if (!timelineTarget) return;
                        setTimelineLoading(true);
                        try {
                          const snapshot = await healthService.probeResourceHealth(timelineTarget.id);
                          setResourceHealthSnapshot(snapshot);
                          await refreshLifecyclePanelsQuiet();
                          showMessage('资源健康已重新探测', 'success');
                        } catch (e) {
                          showMessage(e instanceof Error ? e.message : '重新探测失败', 'error');
                        } finally {
                          setTimelineLoading(false);
                        }
                      }}
                    >
                      立即探测
                    </button>
                    <button
                      type="button"
                      className={btnSecondary(theme)}
                      onClick={async () => {
                        if (!timelineTarget) return;
                        setTimelineLoading(true);
                        try {
                          const snapshot = await healthService.manualBreakResource(timelineTarget.id);
                          setResourceHealthSnapshot(snapshot);
                          await refreshLifecyclePanelsQuiet();
                          showMessage('资源已手动熔断', 'success');
                        } catch (e) {
                          showMessage(e instanceof Error ? e.message : '手动熔断失败', 'error');
                        } finally {
                          setTimelineLoading(false);
                        }
                      }}
                    >
                      手动熔断
                    </button>
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={async () => {
                        if (!timelineTarget) return;
                        setTimelineLoading(true);
                        try {
                          const snapshot = await healthService.manualRecoverResource(timelineTarget.id);
                          setResourceHealthSnapshot(snapshot);
                          await refreshLifecyclePanelsQuiet();
                          showMessage('资源已恢复可用', 'success');
                        } catch (e) {
                          showMessage(e instanceof Error ? e.message : '手动恢复失败', 'error');
                        } finally {
                          setTimelineLoading(false);
                        }
                      }}
                    >
                      手动恢复
                    </button>
                  </div>
                ) : null}
              </div>
            )}
            {timelineData ? (
              <div className={`rounded-xl border p-3 text-xs ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={textSecondary(theme)}>当前状态</span>
                  <span
                    className={statusBadgeClass(coerceToDomainStatus(timelineData.currentStatus), theme)}
                    title={timelineData.currentStatus ? `接口原始值：${timelineData.currentStatus}` : undefined}
                  >
                    <span className={statusDot(coerceToDomainStatus(timelineData.currentStatus))} />
                    {statusLabel(coerceToDomainStatus(timelineData.currentStatus))}
                  </span>
                </div>
                <div className={`mt-1.5 ${textPrimary(theme)}`}>资源编码: {nullDisplay(timelineData.resourceCode)}</div>
              </div>
            ) : null}
            {timelineData?.events?.length ? (
              <div>
                <p className={`mb-3 text-xs font-medium uppercase tracking-wide ${textSecondary(theme)}`}>事件时间轴</p>
                <div className="relative">
                  {timelineData.events.map((ev, idx) => {
                    const isLast = idx === timelineData.events.length - 1;
                    const key = `${ev.eventType}-${idx}-${ev.eventTime ?? ''}-${ev.title ?? ''}`;
                    return (
                      <div key={key} className="flex gap-3">
                        <div className="flex w-5 shrink-0 flex-col items-center">
                          <div
                            className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ${isDark ? 'ring-slate-950' : 'ring-white'} ${lifecycleTimelineNodeClass(ev)}`}
                            aria-hidden
                          />
                          {!isLast ? (
                            <div className={`mt-0.5 w-px flex-1 min-h-[2.5rem] ${isDark ? 'bg-white/15' : 'bg-slate-200'}`} aria-hidden />
                          ) : null}
                        </div>
                        <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-5'}`}>
                          <div className={`text-sm font-medium ${textPrimary(theme)}`}>
                            {lifecycleTimelineEventTitleZh(ev.title, ev.eventType)}
                          </div>
                          <div className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${textMuted(theme)}`}>
                            <span className={statusBadgeClass(coerceToDomainStatus(ev.status), theme)}>
                              <span className={statusDot(coerceToDomainStatus(ev.status))} />
                              {statusLabel(coerceToDomainStatus(ev.status))}
                            </span>
                            <span className="opacity-50">·</span>
                            <span>{nullDisplay(ev.actor, '—')}</span>
                            <span className="opacity-50">·</span>
                            <span>{nullDisplay(formatDateTime(ev.eventTime))}</span>
                          </div>
                          {ev.reason ? (
                            <div className={`mt-1.5 rounded-lg px-2 py-1.5 text-xs ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'} ${textSecondary(theme)}`}>
                              {ev.reason}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className={`text-sm ${textMuted(theme)}`}>暂无生命周期事件</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
