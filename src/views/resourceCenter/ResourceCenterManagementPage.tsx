import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, RefreshCw, Store } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type {
  LifecycleTimelineVO,
  ObservabilitySummaryVO,
  ResourceCenterItemVO,
  ResourceStatus,
  ResourceVersionVO,
} from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { resourceAuditService } from '../../api/services/resource-audit.service';
import { useUserRole } from '../../context/UserRoleContext';
import { RESOURCE_TYPES, RESOURCE_TYPE_LABEL_ZH } from '../../constants/resourceTypes';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { FilterSelect, Pagination, SearchInput } from '../../components/common';
import {
  bentoCard,
  bentoCardHover,
  btnGhost,
  btnPrimary,
  mgmtTableActionDanger,
  mgmtTableActionGhost,
  mgmtTableActionPositive,
  canvasBodyBg,
  mainScrollCompositorClass,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { nullDisplay } from '../../utils/errorHandler';
import { formatDateTime } from '../../utils/formatDateTime';

function skillSubmitBlocked(item: ResourceCenterItemVO): boolean {
  if (item.resourceType !== 'skill') return false;
  const ok = String(item.packValidationStatus ?? '').toLowerCase() === 'valid';
  const hasUri = Boolean(item.artifactUri?.trim());
  return !ok || !hasUri;
}

/** 与「下载制品」接口一致：仅技能且已通过校验并具备 artifactUri 时可下载 */
function skillCanDownloadArtifact(item: ResourceCenterItemVO): boolean {
  if (item.resourceType !== 'skill') return false;
  if (String(item.packValidationStatus ?? '').toLowerCase() !== 'valid') return false;
  return Boolean(item.artifactUri?.trim());
}

function isActionAllowed(item: ResourceCenterItemVO, action: string): boolean {
  // 后端若明确返回 []，表示当前状态无可执行动作；仅在字段缺失时回退前端兜底规则。
  if (Array.isArray(item.allowedActions)) {
    return item.allowedActions.includes(action);
  }
  const s = item.status;
  switch (action) {
    case 'update':
      return s === 'draft' || s === 'rejected' || s === 'deprecated';
    case 'submit':
      return s === 'draft' || s === 'rejected' || s === 'deprecated';
    case 'withdraw':
      return s === 'pending_review' || s === 'testing';
    case 'deprecate':
      return s === 'testing' || s === 'published';
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

/** 新建版本输入框的默认建议（后端校验以 @VersionText 为准） */
function bumpVersionLabel(current: string): string {
  const trimmed = current.trim();
  const vm = trimmed.match(/^(v?)(\d+)$/i);
  if (vm) {
    const n = Number.parseInt(vm[2], 10);
    if (Number.isFinite(n)) return `${vm[1]}${n + 1}`;
  }
  const hasV = /^v/i.test(trimmed);
  const bare = trimmed.replace(/^v/i, '');
  const seg = bare.split('.').filter((s) => s.length > 0);
  if (seg.length > 0) {
    const lastRaw = seg[seg.length - 1];
    const tailNum = Number.parseInt(lastRaw, 10);
    if (Number.isFinite(tailNum)) {
      seg[seg.length - 1] = String(tailNum + 1);
      return (hasV ? 'v' : '') + seg.join('.');
    }
  }
  return `${trimmed}-2`;
}

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  resourceType?: ResourceType;
  allowTypeSwitch?: boolean;
  onTypeChange?: (type: ResourceType) => void;
  onNavigateRegister: (resourceType: ResourceType, id?: number) => void;
  /** 平台管理员在「技能」页打开在线市场 */
  onOpenSkillExternalMarket?: () => void;
}

export const ResourceCenterManagementPage: React.FC<Props> = ({
  theme,
  showMessage,
  resourceType,
  allowTypeSwitch = false,
  onTypeChange,
  onNavigateRegister,
  onOpenSkillExternalMarket,
}) => {
  const isDark = theme === 'dark';
  const { platformRole } = useUserRole();
  const canPublish = platformRole === 'platform_admin';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ResourceCenterItemVO[]>([]);
  const [versionTarget, setVersionTarget] = useState<ResourceCenterItemVO | null>(null);
  const [versions, setVersions] = useState<ResourceVersionVO[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [newVersion, setNewVersion] = useState('v2');
  const [makeNewVersionCurrent, setMakeNewVersionCurrent] = useState(true);
  const [activeType, setActiveType] = useState<ResourceType>(resourceType ?? 'agent');
  const [runningActionKey, setRunningActionKey] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ResourceStatus>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; type: 'remove' | 'deprecate' | 'withdraw' } | null>(null);
  const [timelineTarget, setTimelineTarget] = useState<ResourceCenterItemVO | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineData, setTimelineData] = useState<LifecycleTimelineVO | null>(null);
  const [observabilityData, setObservabilityData] = useState<ObservabilitySummaryVO | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (resourceType) setActiveType(resourceType);
  }, [resourceType]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
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
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载资源失败');
      setLoadError(error);
      setItems([]);
      setTotal(0);
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [activeType, keyword, page, showMessage, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const title = useMemo(() => {
    if (allowTypeSwitch) return '统一资源管理';
    return `${RESOURCE_TYPE_LABEL_ZH[activeType]}资源管理`;
  }, [allowTypeSwitch, activeType]);

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
    const suggested =
      item.currentVersion && item.currentVersion.trim()
        ? bumpVersionLabel(item.currentVersion.trim())
        : 'v1';
    setNewVersion(suggested);
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
  ) => {
    setRunningActionKey(actionKey);
    try {
      const updated = await action();
      setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)));
      showMessage(updated.statusHint || okText, 'success');
      await fetchData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setRunningActionKey(null);
    }
  };

  const openLifecycleModal = async (item: ResourceCenterItemVO) => {
    setTimelineTarget(item);
    setTimelineLoading(true);
    setTimelineData(null);
    setObservabilityData(null);
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

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <div className="px-3 py-4 sm:px-4 lg:px-5">
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>{title}</h2>
              <p className={`mt-0.5 text-xs ${textMuted(theme)}`}>资源中心闭环：注册、提审、发布、版本、下线</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)}>
                <RefreshCw size={15} />
                刷新
              </button>
              {allowTypeSwitch && activeType === 'skill' && canPublish && onOpenSkillExternalMarket ? (
                <button type="button" onClick={onOpenSkillExternalMarket} className={btnGhost(theme)}>
                  <Store size={15} />
                  在线市场
                </button>
              ) : null}
              <button type="button" onClick={() => onNavigateRegister(activeType)} className={btnPrimary}>
                <Plus size={15} />
                注册{RESOURCE_TYPE_LABEL_ZH[activeType]}
              </button>
            </div>
          </div>

          {allowTypeSwitch && (
            <div className={`flex flex-wrap items-center gap-2 border-b px-6 py-3 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
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
          )}

          <div className={`px-6 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex flex-wrap items-center gap-2">
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
                    { value: 'testing', label: '测试中' },
                    { value: 'published', label: '已发布' },
                    { value: 'rejected', label: '已驳回' },
                    { value: 'deprecated', label: '已下线' },
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

          <div className="p-3">
            {loading ? (
              <PageSkeleton type="table" rows={8} />
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载资源" />
            ) : items.length === 0 ? (
              <EmptyState
                title="暂无资源"
                description="当前筛选条件下没有资源，试试调整筛选或注册新资源。"
                action={(
                  <button type="button" onClick={() => onNavigateRegister(activeType)} className={btnPrimary}>
                    <Plus size={15} />
                    注册{RESOURCE_TYPE_LABEL_ZH[activeType]}
                  </button>
                )}
              />
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={`${item.resourceType}-${item.id}`} className={`${bentoCardHover(theme)} p-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate font-semibold ${textPrimary(theme)}`}>
                          {item.displayName}
                          <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {RESOURCE_TYPE_LABEL_ZH[item.resourceType]}
                          </span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={statusBadgeClass(item.status, theme)}>
                            <span className={statusDot(item.status)} />
                            {statusLabel(item.status)}
                          </span>
                          <span className={`text-xs ${textMuted(theme)}`}>
                            {nullDisplay(item.resourceCode)} · {nullDisplay(item.currentVersion, 'v1')}
                            {item.sourceType ? ` · ${item.sourceType}` : ''}
                            {item.ownerName ? ` · ${item.ownerName}` : ''}
                          </span>
                        </div>
                        <div className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] ${textMuted(theme)}`}>
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
                          {item.resourceType === 'skill' && item.packValidationStatus && (
                            <span>
                              技能包:{' '}
                              <span
                                className={
                                  String(item.packValidationStatus).toLowerCase() === 'valid'
                                    ? isDark
                                      ? 'text-emerald-300'
                                      : 'text-emerald-700'
                                    : String(item.packValidationStatus).toLowerCase() === 'invalid'
                                      ? isDark
                                        ? 'text-rose-300'
                                        : 'text-rose-700'
                                      : textMuted(theme)
                                }
                              >
                                {item.packValidationStatus}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {isActionAllowed(item, 'update') && (
                          <button type="button" onClick={() => onNavigateRegister(item.resourceType, item.id)} className={mgmtTableActionGhost(theme)}>
                            编辑
                          </button>
                        )}
                        {isActionAllowed(item, 'createVersion') && (
                          <button type="button" onClick={() => void openVersions(item)} className={mgmtTableActionGhost(theme)}>
                            版本
                          </button>
                        )}
                        <button type="button" onClick={() => void openLifecycleModal(item)} className={mgmtTableActionGhost(theme)}>
                          生命周期
                        </button>
                        {skillCanDownloadArtifact(item) && (
                          <button
                            type="button"
                            disabled={runningActionKey === `dl-artifact-${item.id}`}
                            title="下载后端已校验的技能包（GET …/skill-artifact）"
                            onClick={() => void runAction(
                              `dl-artifact-${item.id}`,
                              () => resourceCenterService.downloadSkillArtifact(item.id, item.displayName),
                              '已开始下载',
                            )}
                            className={mgmtTableActionGhost(theme)}
                          >
                            {runningActionKey === `dl-artifact-${item.id}` ? (
                              '下载中…'
                            ) : (
                              <>
                                <Download size={14} className="inline-block align-[-2px] mr-1" />
                                下载制品
                              </>
                            )}
                          </button>
                        )}
                        {isActionAllowed(item, 'submit') && (
                          <button
                            type="button"
                            disabled={runningActionKey === `submit-${item.id}` || skillSubmitBlocked(item)}
                            title={
                              skillSubmitBlocked(item) && item.resourceType === 'skill'
                                ? '技能须先上传 zip 且 pack_validation_status=valid'
                                : undefined
                            }
                            onClick={() => void runMutationAction(`submit-${item.id}`, () => resourceCenterService.submit(item.id), '已提交审核')}
                            className={mgmtTableActionPositive(theme)}
                          >
                            {runningActionKey === `submit-${item.id}` ? '提交中…' : '提交审核'}
                          </button>
                        )}
                        {isActionAllowed(item, 'withdraw') && (
                          <button
                            type="button"
                            disabled={runningActionKey === `withdraw-${item.id}`}
                            onClick={() => setConfirmAction({ id: item.id, type: 'withdraw' })}
                            className={mgmtTableActionGhost(theme)}
                          >
                            {runningActionKey === `withdraw-${item.id}` ? '撤回中…' : '撤回审核'}
                          </button>
                        )}
                        {isActionAllowed(item, 'deprecate') && (
                          <button
                            type="button"
                            disabled={runningActionKey === `deprecate-${item.id}`}
                            onClick={() => setConfirmAction({ id: item.id, type: 'deprecate' })}
                            className={mgmtTableActionGhost(theme)}
                          >
                            {runningActionKey === `deprecate-${item.id}` ? '下线中…' : '下线'}
                          </button>
                        )}
                        {isActionAllowed(item, 'delete') && (
                          <button
                            type="button"
                            disabled={runningActionKey === `remove-${item.id}`}
                            onClick={() => setConfirmAction({ id: item.id, type: 'remove' })}
                            className={mgmtTableActionDanger}
                          >
                            {runningActionKey === `remove-${item.id}` ? '删除中…' : '删除'}
                          </button>
                        )}
                        {item.status === 'testing' && canPublish && (
                          <button
                            type="button"
                            disabled={runningActionKey === `publish-${item.id}`}
                            onClick={() => void runAction(`publish-${item.id}`, () => resourceAuditService.publish(item.id), '已发布上架')}
                            className={mgmtTableActionPositive(theme)}
                          >
                            {runningActionKey === `publish-${item.id}` ? '发布中…' : '发布上架'}
                          </button>
                        )}
                        {item.status === 'testing' && !canPublish && (
                          <span className={`text-xs ${textMuted(theme)}`}>待平台管理员发布</span>
                        )}
                      </div>
                    </div>
                    <p className={`mt-2 text-xs ${textSecondary(theme)}`}>{nullDisplay(item.description, '暂无描述')}</p>
                    {(item.statusHint || item.lastRejectReason || item.degradationHint) && (
                      <div className={`mt-2 rounded-lg px-2 py-1.5 text-[11px] ${isDark ? 'bg-white/[0.03] text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                        {item.statusHint ? <div>提示: {item.statusHint}</div> : null}
                        {item.lastRejectReason && item.status !== 'rejected' ? <div>驳回原因: {item.lastRejectReason}</div> : null}
                        {item.degradationHint ? <div>降级提示: {item.degradationHint}</div> : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`px-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        </div>
      </div>

      <Modal
        open={!!versionTarget}
        onClose={closeVersionModal}
        title={versionTarget ? `版本管理 · ${versionTarget.displayName}` : '版本管理'}
        theme={theme}
        size="lg"
      >
        {versionTarget && (
          <>
            <p className={`mb-3 text-xs leading-relaxed ${textMuted(theme)}`}>
              与后端对齐：加载列表为 <span className="font-mono text-[11px]">GET …/resources/:id/versions</span>；新建版本会写入当前资源快照（
              <span className="font-mono text-[11px]">POST …/versions</span>，body 含 <span className="font-mono text-[11px]">version</span>、可选{' '}
              <span className="font-mono text-[11px]">makeCurrent</span>）。回退或切换默认版本使用{' '}
              <span className="font-mono text-[11px]">POST …/versions/:version/switch</span>，且仅 <span className="font-mono text-[11px]">status=active</span>{' '}
              的行可切换。
            </p>
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
                  return (
                    <div
                      key={`${ver.id}-${ver.version}`}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-50'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-medium ${textPrimary(theme)}`}>{ver.version}</span>
                          {ver.isCurrent && (
                            <span className={`rounded px-1.5 py-0.5 text-[11px] ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'}`}>
                              当前默认
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-mono ${
                              status === 'active'
                                ? isDark
                                  ? 'bg-white/10 text-slate-300'
                                  : 'bg-slate-200/80 text-slate-700'
                                : isDark
                                  ? 'bg-amber-500/15 text-amber-200'
                                  : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {status === 'active' ? 'active · 可切换' : `status: ${ver.status ?? '—'}`}
                          </span>
                        </div>
                        {ver.createTime && (
                          <p className={`mt-0.5 text-[11px] ${textMuted(theme)}`}>创建 {formatDateTime(ver.createTime)}</p>
                        )}
                      </div>
                      {canSwitch && (
                        <button
                          type="button"
                          title="将网关解析与目录默认指向此版本（回退即切换到较早的 active 版本）"
                          onClick={async () => {
                            await runMutationAction(
                              `switch-version-${versionTarget.id}-${ver.version}`,
                              () => resourceCenterService.switchVersion(versionTarget.id, ver.version),
                              `已设为当前版本 ${ver.version}`,
                            );
                            setVersions(await resourceCenterService.listVersions(versionTarget.id));
                          }}
                          className={btnGhost(theme)}
                        >
                          设为当前
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className={`mt-4 border-t pt-4 ${isDark ? 'border-white/[0.08]' : 'border-slate-100'}`}>
              <p className={`mb-2 text-xs ${textSecondary(theme)}`}>
                新建版本：版本号须匹配 <span className="font-mono">v?数字[.数字]…</span>，可选后缀如{' '}
                <span className="font-mono">-rc1</span>（与后端 <span className="font-mono">@VersionText</span> 一致）。
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm ${isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
                  placeholder="例如 v2、1.0.0、v1-rc1"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const vv = newVersion.trim();
                    if (!vv) {
                      showMessage('请填写版本号', 'warning');
                      return;
                    }
                    await runAction(
                      `create-version-${versionTarget.id}`,
                      () =>
                        resourceCenterService
                          .createVersion(versionTarget.id, { version: vv, makeCurrent: makeNewVersionCurrent })
                          .then(() => undefined),
                      makeNewVersionCurrent ? `已创建并设为当前版本 ${vv}` : `已创建版本 ${vv}`,
                    );
                    setVersions(await resourceCenterService.listVersions(versionTarget.id));
                  }}
                  className={btnPrimary}
                >
                  新建版本
                </button>
              </div>
              <label className={`mt-2 flex cursor-pointer items-center gap-2 text-sm ${textSecondary(theme)}`}>
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={makeNewVersionCurrent}
                  onChange={(e) => setMakeNewVersionCurrent(e.target.checked)}
                />
                创建后立即设为当前默认版本（对应 <span className="font-mono">makeCurrent: true</span>）
              </label>
              {!makeNewVersionCurrent && (
                <p className={`mt-1 text-[11px] ${isDark ? 'text-amber-200/90' : 'text-amber-800'}`}>
                  若取消勾选，新版本可能不会成为「当前」解析版本，直至你手动「设为当前」。
                </p>
              )}
            </div>
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === 'remove' ? '删除资源' : confirmAction?.type === 'deprecate' ? '下线资源' : '撤回审核'}
        message={
          confirmAction?.type === 'remove'
            ? '确认删除该草稿资源？删除后不可恢复。'
            : confirmAction?.type === 'deprecate'
              ? '确认将该资源下线为 deprecated 状态？'
              : '确认将该资源撤回到草稿状态？'
        }
        confirmText={
          confirmAction?.type === 'remove'
            ? '确认删除'
            : confirmAction?.type === 'deprecate'
              ? '确认下线'
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
            void runMutationAction(actionKey, () => resourceCenterService.deprecate(id), '已下线').finally(() => setConfirmAction(null));
            return;
          }
          void runMutationAction(actionKey, () => resourceCenterService.withdraw(id), '已撤回到草稿').finally(() => setConfirmAction(null));
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
                <div>健康: {nullDisplay(observabilityData.healthStatus)}</div>
                <div>熔断: {nullDisplay(observabilityData.circuitState)}</div>
                <div>质量分: {nullDisplay(observabilityData.qualityScore)}</div>
                {observabilityData.generatedAt ? <div>生成时间: {nullDisplay(formatDateTime(observabilityData.generatedAt))}</div> : null}
                {observabilityData.degradationHint?.userFacingHint ? (
                  <div>提示: {observabilityData.degradationHint.userFacingHint}</div>
                ) : null}
              </div>
            )}
            {timelineData ? (
              <div className={`rounded-xl border p-3 text-xs ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'}`}>
                <div>当前状态: {nullDisplay(timelineData.currentStatus)}</div>
                <div>资源编码: {nullDisplay(timelineData.resourceCode)}</div>
              </div>
            ) : null}
            {timelineData?.events?.length ? (
              timelineData.events.map((ev, idx) => (
                <div key={`${ev.eventType}-${idx}`} className={`rounded-lg border px-3 py-2 text-xs ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <div className={`font-medium ${textPrimary(theme)}`}>{ev.title || ev.eventType}</div>
                  <div className={textMuted(theme)}>
                    {nullDisplay(ev.status)} · {nullDisplay(ev.actor)} · {nullDisplay(formatDateTime(ev.eventTime))}
                  </div>
                  {ev.reason ? <div className={`mt-1 ${textSecondary(theme)}`}>{ev.reason}</div> : null}
                </div>
              ))
            ) : (
              <p className={`text-sm ${textMuted(theme)}`}>暂无生命周期事件</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
