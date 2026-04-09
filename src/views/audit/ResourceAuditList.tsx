import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type { ResourceAuditItemVO, ResourceCenterItemVO } from '../../types/dto/resource-center';
import { resourceAuditService } from '../../api/services/resource-audit.service';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { useUserRole } from '../../context/UserRoleContext';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  btnSecondary,
  mgmtTableActionDanger,
  mgmtTableActionGhost,
  mgmtTableActionPositive,
  mgmtTableRowActions,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
  fieldErrorText,
  inputBaseError,
} from '../../utils/uiClasses';
import { TOOLBAR_ROW_LIST } from '../../utils/toolbarFieldClasses';
import { FilterSelect, Pagination, SearchInput } from '../../components/common';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { MgmtBatchToolbar } from '../../components/management/MgmtBatchToolbar';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { nullDisplay } from '../../utils/errorHandler';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  defaultType?: ResourceType;
}

const AUDIT_DESC = '支持 approve / reject / publish';

function formatJsonForDisplay(value: unknown): string | null {
  if (value == null) return null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

export const ResourceAuditList: React.FC<Props> = ({ theme, fontSize, showMessage, defaultType }) => {
  const isDark = theme === 'dark';
  const { platformRole } = useUserRole();
  const canPublishResource =
    platformRole === 'platform_admin' || platformRole === 'reviewer' || platformRole === 'developer';
  const canPlatformForceDeprecate = platformRole === 'platform_admin';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ResourceAuditItemVO[]>([]);
  const [resourceType, setResourceType] = useState<ResourceType | ''>(defaultType ?? '');
  const [statusFilter, setStatusFilter] = useState<'all' | ResourceAuditItemVO['status']>('all');

  useEffect(() => {
    setResourceType(defaultType ?? '');
    setPage(1);
  }, [defaultType]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
  const [total, setTotal] = useState(0);
  const [rejectTarget, setRejectTarget] = useState<ResourceAuditItemVO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [forceDeprecateTarget, setForceDeprecateTarget] = useState<ResourceAuditItemVO | null>(null);
  const [forceDeprecateReason, setForceDeprecateReason] = useState('');
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchRejectIds, setBatchRejectIds] = useState<number[] | null>(null);
  const [batchRejectReason, setBatchRejectReason] = useState('');
  const [batchRejectReasonError, setBatchRejectReasonError] = useState('');
  const [detailTarget, setDetailTarget] = useState<ResourceAuditItemVO | null>(null);
  const [detailResource, setDetailResource] = useState<ResourceCenterItemVO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFetchError, setDetailFetchError] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const openResourceDetail = useCallback((item: ResourceAuditItemVO) => {
    setDetailTarget(item);
    setDetailResource(null);
    setDetailFetchError(null);
  }, []);

  useEffect(() => {
    if (!detailTarget?.resourceId) {
      setDetailResource(null);
      setDetailFetchError(null);
      setDetailLoading(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailFetchError(null);
    setDetailResource(null);
    void resourceCenterService
      .getById(detailTarget.resourceId)
      .then((r) => {
        if (!cancelled) {
          setDetailResource(r);
          setDetailFetchError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetailResource(null);
          setDetailFetchError(err instanceof Error ? err.message : '加载登记资源详情失败');
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailTarget]);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  useEffect(() => {
    clearSelection();
  }, [page, resourceType, statusFilter, search, clearSelection]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedKeys.has(String(i.id))),
    [items, selectedKeys],
  );
  const pendingSelected = useMemo(
    () => selectedItems.filter((i) => i.status === 'pending_review'),
    [selectedItems],
  );
  const testingSelected = useMemo(
    () => selectedItems.filter((i) => i.status === 'testing'),
    [selectedItems],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const pageData = await resourceAuditService.list({
        page,
        pageSize: PAGE_SIZE,
        resourceType: resourceType || undefined,
        /** 后端对「无 status 参数」会默认仅 pending_review；「全部状态」必须显式传 all */
        status: statusFilter === 'all' ? 'all' : statusFilter,
        keyword: search.trim() || undefined,
        sortBy: 'submitTime',
        sortOrder: 'desc',
      });
      setItems(pageData.list);
      setTotal(pageData.total);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载审核列表失败');
      setLoadError(error);
      setItems([]);
      setTotal(0);
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, resourceType, search, showMessage, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const rows = useMemo(() => items, [items]);

  const runAction = useCallback(
    async (actionKey: string, action: () => Promise<void>, okMsg: string) => {
      setRunningActionId(actionKey);
      try {
        await action();
        showMessage(okMsg, 'success');
        await fetchData();
      } catch (err) {
        showMessage(err instanceof Error ? err.message : '操作失败', 'error');
      } finally {
        setRunningActionId(null);
      }
    },
    [fetchData, showMessage],
  );

  const runBatchApprove = useCallback(async () => {
    const ids = pendingSelected.map((i) => i.id);
    if (!ids.length) {
      showMessage('请至少选择一条「待审核」记录', 'info');
      return;
    }
    setBatchRunning(true);
    try {
      await resourceAuditService.batchApprove(ids);
      showMessage(`已通过 ${ids.length} 条，资源已进入测试中`, 'success');
      clearSelection();
      await fetchData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '批量通过失败', 'error');
    } finally {
      setBatchRunning(false);
    }
  }, [pendingSelected, fetchData, showMessage, clearSelection]);

  const runBatchPublish = useCallback(async () => {
    const ids = testingSelected.map((i) => i.id);
    if (!ids.length) {
      showMessage('请至少选择一条「测试中」记录', 'info');
      return;
    }
    setBatchRunning(true);
    try {
      await resourceAuditService.batchPublish(ids);
      showMessage(`已发布 ${ids.length} 条`, 'success');
      clearSelection();
      await fetchData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '批量发布失败', 'error');
    } finally {
      setBatchRunning(false);
    }
  }, [testingSelected, fetchData, showMessage, clearSelection]);

  const openBatchReject = useCallback(() => {
    const ids = pendingSelected.map((i) => i.id);
    if (!ids.length) {
      showMessage('请至少选择一条「待审核」记录', 'info');
      return;
    }
    setBatchRejectIds(ids);
    setBatchRejectReason('');
    setBatchRejectReasonError('');
  }, [pendingSelected, showMessage]);

  const submitBatchReject = useCallback(async () => {
    if (!batchRejectIds?.length) return;
    if (!batchRejectReason.trim()) {
      setBatchRejectReasonError('驳回原因不能为空');
      return;
    }
    setBatchRejectReasonError('');
    setBatchRunning(true);
    try {
      await resourceAuditService.batchReject(batchRejectIds, { reason: batchRejectReason.trim() });
      showMessage('批量驳回完成', 'success');
      setBatchRejectIds(null);
      setBatchRejectReason('');
      clearSelection();
      await fetchData();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '批量驳回失败', 'error');
    } finally {
      setBatchRunning(false);
    }
  }, [batchRejectIds, batchRejectReason, fetchData, showMessage, clearSelection]);

  const auditColumns = useMemo<MgmtDataTableColumn<ResourceAuditItemVO>[]>(
    () => [
      {
        id: 'name',
        header: '资源名称',
        cellClassName: 'font-medium max-w-[12rem]',
        cell: (item) => (
          <button
            type="button"
            className={`block w-full max-w-full truncate text-left font-medium hover:underline ${textPrimary(theme)}`}
            title={`${item.displayName}（点击查看详情）`}
            onClick={() => openResourceDetail(item)}
          >
            {item.displayName}
          </button>
        ),
      },
      { id: 'type', header: '类型', cell: (item) => <span className={textSecondary(theme)}>{item.resourceType}</span> },
      {
        id: 'status',
        header: '状态',
        cell: (item) => (
          <span className={statusBadgeClass(item.status, theme)}>
            <span className={statusDot(item.status)} />
            {statusLabel(item.status)}
          </span>
        ),
      },
      { id: 'code', header: '资源编码', cell: (item) => <span className={textSecondary(theme)}>{nullDisplay(item.resourceCode)}</span> },
      {
        id: 'submitter',
        header: '提交者',
        cell: (item) => <span className={textSecondary(theme)}>{resolvePersonDisplay({ names: [item.submitterName], usernames: [item.submitter] })}</span>,
      },
      { id: 'submitTime', header: '提交时间', cell: (item) => <span className={textSecondary(theme)}>{nullDisplay(formatDateTime(item.submitTime))}</span> },
      { id: 'reason', header: '审核意见', cell: (item) => <span className={textSecondary(theme)}>{nullDisplay(item.reason)}</span> },
      {
        id: 'desc',
        header: '描述',
        cellClassName: 'max-w-[14rem]',
        cell: (item) => (
          <span className={`line-clamp-2 break-words ${textSecondary(theme)}`} title={item.description ?? undefined}>{nullDisplay(item.description, '暂无描述')}</span>
        ),
      },
      {
        id: 'actions',
        header: '操作',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        cellNowrap: true,
        cell: (item) => (
          <div className={mgmtTableRowActions}>
            <button type="button" className={mgmtTableActionGhost(theme)} onClick={() => openResourceDetail(item)}>
              详情
            </button>
            {item.status === 'pending_review' && (
              <>
                <button
                  type="button"
                  className={mgmtTableActionPositive(theme)}
                  disabled={runningActionId === `approve-${item.id}`}
                  onClick={() => void runAction(`approve-${item.id}`, () => resourceAuditService.approve(item.id), '已通过审核，资源已进入测试中')}
                >
                  {runningActionId === `approve-${item.id}` ? '处理中…' : '通过'}
                </button>
                <button type="button" className={mgmtTableActionDanger} disabled={!!runningActionId} onClick={() => {
                  setRejectTarget(item);
                  setRejectReason('');
                  setRejectReasonError('');
                }}>
                  驳回
                </button>
              </>
            )}
            {item.status === 'testing' && (
              <>
                {canPublishResource ? (
                  <button
                    type="button"
                    className={mgmtTableActionPositive(theme)}
                    disabled={runningActionId === `publish-${item.id}`}
                    onClick={() => void runAction(`publish-${item.id}`, () => resourceAuditService.publish(item.id), '已发布，资源已进入已发布状态')}
                  >
                    {runningActionId === `publish-${item.id}` ? '发布中…' : '发布'}
                  </button>
                ) : (
                  <span className={`text-xs ${textMuted(theme)}`}>无发布权限</span>
                )}
                <button type="button" className={mgmtTableActionDanger} disabled={!!runningActionId} onClick={() => {
                  setRejectTarget(item);
                  setRejectReason('');
                  setRejectReasonError('');
                }}>
                  驳回
                </button>
              </>
            )}
            {item.status === 'published' && canPlatformForceDeprecate && (
              <button
                type="button"
                className={mgmtTableActionDanger}
                disabled={!!runningActionId}
                onClick={() => {
                  setForceDeprecateTarget(item);
                  setForceDeprecateReason('');
                }}
              >
                平台强制下架
              </button>
            )}
          </div>
        ),
      },
    ],
    [theme, runningActionId, canPublishResource, canPlatformForceDeprecate, runAction, openResourceDetail],
  );

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={ClipboardCheck}
        breadcrumbSegments={['资源审核', '统一资源审核台']}
        description={AUDIT_DESC}
        toolbar={
          <div className={`${TOOLBAR_ROW_LIST} min-w-0 justify-between gap-2 sm:gap-3`}>
            <div className={`${TOOLBAR_ROW_LIST} min-w-0 flex-1`}>
              <FilterSelect
                value={resourceType}
                onChange={(v) => { setResourceType(v as ResourceType | ''); setPage(1); }}
                options={[
                  { value: '', label: '全部类型' },
                  { value: 'agent', label: 'Agent' },
                  { value: 'skill', label: 'Skill' },
                  { value: 'mcp', label: 'MCP' },
                  { value: 'app', label: 'App' },
                  { value: 'dataset', label: 'Dataset' },
                ]}
                theme={theme}
                className="w-[8.5rem] shrink-0 sm:w-36"
              />
              <FilterSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'pending_review', label: '待审核' },
                  { value: 'testing', label: '测试中' },
                  { value: 'rejected', label: '已驳回' },
                  { value: 'published', label: '已发布' },
                  { value: 'merged_live', label: '已合并上线' },
                ]}
                theme={theme}
                className="w-[8.5rem] shrink-0 sm:w-36"
              />
              <div className="min-w-[12rem] flex-1">
                <SearchInput
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  placeholder="搜索名称、资源编码、提交者…"
                  theme={theme}
                />
              </div>
            </div>
            <button type="button" onClick={() => void fetchData()} className={`shrink-0 ${btnGhost(theme)}`} aria-label="刷新审核列表">
              刷新
            </button>
          </div>
        }
      >
        <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0 flex-1 overflow-x-auto">
            {loading ? (
              <PageSkeleton type="table" rows={8} />
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载审核列表" />
            ) : rows.length === 0 ? (
              <div className="p-4">
                <EmptyState title="暂无审核项" description="当前筛选条件下没有待处理项，可切换筛选后重试。" />
              </div>
            ) : (
              <>
                <MgmtBatchToolbar theme={theme} count={selectedKeys.size} onClear={clearSelection}>
                  <button
                    type="button"
                    className={mgmtTableActionPositive(theme)}
                    disabled={batchRunning || !!runningActionId || selectedKeys.size === 0}
                    onClick={() => void runBatchApprove()}
                  >
                    {batchRunning ? '处理中…' : '批量通过'}
                  </button>
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    disabled={batchRunning || !!runningActionId || selectedKeys.size === 0}
                    onClick={openBatchReject}
                  >
                    批量驳回
                  </button>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={
                      batchRunning || !!runningActionId || selectedKeys.size === 0 || !canPublishResource
                    }
                    onClick={() => void runBatchPublish()}
                  >
                    {batchRunning ? '处理中…' : '批量发布'}
                  </button>
                </MgmtBatchToolbar>
                <MgmtDataTable<ResourceAuditItemVO>
                  theme={theme}
                  surface="plain"
                  minWidth="1200px"
                  columns={auditColumns}
                  rows={rows}
                  getRowKey={(item) => String(item.id)}
                  selection={{
                    selectedKeys,
                    onSelectionChange: setSelectedKeys,
                  }}
                />
              </>
            )}
          <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
        </div>
      </MgmtPageShell>

      {batchRejectIds && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => { if (!batchRunning) { setBatchRejectIds(null); setBatchRejectReasonError(''); } }}
        >
          <div className={`${bentoCard(theme)} w-full max-w-lg p-4`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>
              批量驳回 · {batchRejectIds.length} 条待审核
            </h3>
            <label htmlFor="resource-audit-batch-reject-reason" className={`mt-3 block text-xs font-medium ${textSecondary(theme)}`}>
              驳回原因（将应用于所选待审核项）
            </label>
            <AutoHeightTextarea
              id="resource-audit-batch-reject-reason"
              minRows={4}
              maxRows={14}
              value={batchRejectReason}
              onChange={(e) => {
                setBatchRejectReason(e.target.value);
                setBatchRejectReasonError('');
              }}
              className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm resize-none ${
                isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
              }${batchRejectReasonError ? ` ${inputBaseError()}` : ''}`}
              placeholder="请输入驳回原因"
              aria-invalid={!!batchRejectReasonError}
              aria-describedby={batchRejectReasonError ? 'resource-audit-batch-reject-err' : undefined}
            />
            {batchRejectReasonError ? (
              <p id="resource-audit-batch-reject-err" className={`mt-1.5 ${fieldErrorText()} text-xs`} role="alert">
                {batchRejectReasonError}
              </p>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className={btnGhost(theme)}
                disabled={batchRunning}
                onClick={() => { setBatchRejectIds(null); setBatchRejectReasonError(''); }}
              >
                取消
              </button>
              <button type="button" className={btnPrimary} disabled={batchRunning} onClick={() => void submitBatchReject()}>
                {batchRunning ? '提交中…' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => { setRejectTarget(null); setRejectReasonError(''); }}
        >
          <div className={`${bentoCard(theme)} w-full max-w-lg p-4`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>驳回资源 · {rejectTarget.displayName}</h3>
            <label htmlFor="resource-audit-reject-reason" className={`mt-3 block text-xs font-medium ${textSecondary(theme)}`}>
              驳回原因
            </label>
            <AutoHeightTextarea
              id="resource-audit-reject-reason"
              minRows={4}
              maxRows={14}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectReasonError('');
              }}
              className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm resize-none ${
                isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
              }${rejectReasonError ? ` ${inputBaseError()}` : ''}`}
              placeholder="请输入驳回原因"
              aria-invalid={!!rejectReasonError}
              aria-describedby={rejectReasonError ? 'resource-audit-reject-err' : undefined}
            />
            {rejectReasonError ? (
              <p id="resource-audit-reject-err" className={`mt-1.5 ${fieldErrorText()} text-xs`} role="alert">
                {rejectReasonError}
              </p>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className={btnGhost(theme)}
                onClick={() => { setRejectTarget(null); setRejectReasonError(''); }}
              >
                取消
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={runningActionId === `reject-${rejectTarget.id}`}
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    setRejectReasonError('驳回原因不能为空');
                    return;
                  }
                  setRejectReasonError('');
                  setRunningActionId(`reject-${rejectTarget.id}`);
                  try {
                    await resourceAuditService.reject(rejectTarget.id, { reason: rejectReason.trim() });
                    showMessage('已驳回', 'success');
                    setRejectReason('');
                    setRejectReasonError('');
                    setRejectTarget(null);
                    await fetchData();
                  } catch (err) {
                    showMessage(err instanceof Error ? err.message : '驳回失败', 'error');
                  } finally {
                    setRunningActionId(null);
                  }
                }}
              >
                {runningActionId === `reject-${rejectTarget.id}` ? '提交中…' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setDetailTarget(null)}
          role="presentation"
        >
          <div
            className={`${bentoCard(theme)} flex w-full max-w-2xl max-h-[90vh] flex-col p-4`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-audit-detail-title"
          >
            <h3 id="resource-audit-detail-title" className={`shrink-0 text-base font-semibold ${textPrimary(theme)}`}>
              资源详情（只读）· {detailTarget.displayName}
            </h3>
            <div className={`mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-sm ${textSecondary(theme)}`}>
              <section>
                <h4 className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>审核记录</h4>
                <div className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                  <span className={textMuted(theme)}>审核项 ID</span>
                  <span className={textPrimary(theme)}>{detailTarget.id}</span>
                  <span className={textMuted(theme)}>资源 ID</span>
                  <span className={textPrimary(theme)}>{detailTarget.resourceId ? detailTarget.resourceId : '—'}</span>
                  <span className={textMuted(theme)}>类型</span>
                  <span className={textPrimary(theme)}>{detailTarget.resourceType}</span>
                  <span className={textMuted(theme)}>状态</span>
                  <span className={textPrimary(theme)}>{statusLabel(detailTarget.status)}</span>
                  <span className={textMuted(theme)}>访问策略（历史）</span>
                  <span className={textPrimary(theme)}>{nullDisplay(detailTarget.accessPolicy)}</span>
                  <p className={`sm:col-span-2 text-xs leading-relaxed ${textMuted(theme)}`}>
                    对应库字段 <span className="font-mono">access_policy</span> 的快照/回显。资源级 Grant 已下线，网关 invoke 以 API Key、scope、资源是否已发布等为准，不以本字段拦截。
                  </p>
                  <span className={textMuted(theme)}>资源编码</span>
                  <span className={textPrimary(theme)}>{nullDisplay(detailTarget.resourceCode)}</span>
                  <span className={textMuted(theme)}>提交者</span>
                  <span className={textPrimary(theme)}>
                    {resolvePersonDisplay({ names: [detailTarget.submitterName], usernames: [detailTarget.submitter] })}
                  </span>
                  <span className={textMuted(theme)}>提交时间</span>
                  <span className={textPrimary(theme)}>{nullDisplay(formatDateTime(detailTarget.submitTime))}</span>
                  <span className={textMuted(theme)}>审核意见</span>
                  <span className={textPrimary(theme)}>{nullDisplay(detailTarget.reason)}</span>
                  <span className={textMuted(theme)}>复核备注</span>
                  <span className={textPrimary(theme)}>{nullDisplay(detailTarget.reviewComment)}</span>
                  <span className={textMuted(theme)}>描述</span>
                  <span className={`sm:col-span-2 ${textPrimary(theme)}`}>{nullDisplay(detailTarget.description, '暂无描述')}</span>
                </div>
              </section>

              <section>
                <h4 className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>登记资源（完整字段）</h4>
                {!detailTarget.resourceId ? (
                  <p className={`mt-2 text-xs ${textMuted(theme)}`}>该审核行未关联资源主键，无法拉取登记详情。</p>
                ) : detailLoading ? (
                  <p className={`mt-2 text-xs ${textMuted(theme)}`}>正在加载登记资源…</p>
                ) : detailFetchError ? (
                  <p className={`mt-2 text-xs text-amber-600 dark:text-amber-400`}>
                    无法加载登记资源：{detailFetchError}。上方仍为审核接口返回的可见字段。
                  </p>
                ) : detailResource ? (
                  <div className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                    <span className={textMuted(theme)}>名称</span>
                    <span className={textPrimary(theme)}>{detailResource.displayName}</span>
                    <span className={textMuted(theme)}>类型</span>
                    <span className={textPrimary(theme)}>{detailResource.resourceType}</span>
                    <span className={textMuted(theme)}>资源编码</span>
                    <span className={textPrimary(theme)}>{nullDisplay(detailResource.resourceCode)}</span>
                    <span className={textMuted(theme)}>状态</span>
                    <span className={textPrimary(theme)}>{statusLabel(detailResource.status)}</span>
                    <span className={textMuted(theme)}>访问策略（历史）</span>
                    <span className={textPrimary(theme)}>{nullDisplay(detailResource.accessPolicy)}</span>
                    <span className={textMuted(theme)}>负责人</span>
                    <span className={textPrimary(theme)}>{nullDisplay(detailResource.ownerName)}</span>
                    <span className={textMuted(theme)}>创建 / 更新</span>
                    <span className={textPrimary(theme)}>
                      {nullDisplay(formatDateTime(detailResource.createTime))} / {nullDisplay(formatDateTime(detailResource.updateTime))}
                    </span>
                    {detailResource.endpoint != null && detailResource.endpoint !== '' ? (
                      <>
                        <span className={textMuted(theme)}>Endpoint</span>
                        <span className={`font-mono text-xs break-all ${textPrimary(theme)}`}>{detailResource.endpoint}</span>
                      </>
                    ) : null}
                    {detailResource.protocol != null && detailResource.protocol !== '' ? (
                      <>
                        <span className={textMuted(theme)}>协议</span>
                        <span className={textPrimary(theme)}>{detailResource.protocol}</span>
                      </>
                    ) : null}
                    {detailResource.appUrl != null && detailResource.appUrl !== '' ? (
                      <>
                        <span className={textMuted(theme)}>应用 URL</span>
                        <span className={`font-mono text-xs break-all ${textPrimary(theme)}`}>{detailResource.appUrl}</span>
                      </>
                    ) : null}
                    <span className={textMuted(theme)}>描述</span>
                    <span className={`sm:col-span-2 ${textPrimary(theme)}`}>{nullDisplay(detailResource.description, '暂无描述')}</span>
                    {detailResource.systemPrompt != null && detailResource.systemPrompt !== '' ? (
                      <>
                        <span className={textMuted(theme)}>System Prompt</span>
                        <pre
                          className={`sm:col-span-2 mt-0 max-h-48 overflow-auto rounded-lg border px-2 py-1.5 text-xs whitespace-pre-wrap ${
                            isDark ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          {detailResource.systemPrompt}
                        </pre>
                      </>
                    ) : null}
                    {detailResource.serviceDetailMd != null && detailResource.serviceDetailMd !== '' ? (
                      <>
                        <span className={textMuted(theme)}>服务介绍（Markdown）</span>
                        <pre
                          className={`sm:col-span-2 mt-0 max-h-48 overflow-auto rounded-lg border px-2 py-1.5 text-xs whitespace-pre-wrap ${
                            isDark ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          {detailResource.serviceDetailMd}
                        </pre>
                      </>
                    ) : null}
                    {formatJsonForDisplay(detailResource.spec) != null ? (
                      <>
                        <span className={textMuted(theme)}>spec</span>
                        <pre
                          className={`sm:col-span-2 mt-0 max-h-40 overflow-auto rounded-lg border px-2 py-1 font-mono text-[11px] leading-snug ${
                            isDark ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          {formatJsonForDisplay(detailResource.spec)}
                        </pre>
                      </>
                    ) : null}
                    {formatJsonForDisplay(detailResource.parametersSchema) != null ? (
                      <>
                        <span className={textMuted(theme)}>parametersSchema</span>
                        <pre
                          className={`sm:col-span-2 mt-0 max-h-40 overflow-auto rounded-lg border px-2 py-1 font-mono text-[11px] leading-snug ${
                            isDark ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          {formatJsonForDisplay(detailResource.parametersSchema)}
                        </pre>
                      </>
                    ) : null}
                    {formatJsonForDisplay(detailResource.authConfig) != null ? (
                      <>
                        <span className={textMuted(theme)}>authConfig</span>
                        <pre
                          className={`sm:col-span-2 mt-0 max-h-40 overflow-auto rounded-lg border px-2 py-1 font-mono text-[11px] leading-snug ${
                            isDark ? 'border-white/10 bg-black/25' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          {formatJsonForDisplay(detailResource.authConfig)}
                        </pre>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className={`mt-2 text-xs ${textMuted(theme)}`}>暂无登记资源数据。</p>
                )}
              </section>
            </div>
            <div className="mt-4 flex shrink-0 justify-end">
              <button type="button" className={btnGhost(theme)} onClick={() => setDetailTarget(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {forceDeprecateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setForceDeprecateTarget(null)}>
          <div className={`${bentoCard(theme)} w-full max-w-lg p-4`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>
              平台强制下架 · {forceDeprecateTarget.displayName}
            </h3>
            <p className={`mt-2 text-xs leading-relaxed ${textMuted(theme)}`}>
              调用 <span className="font-mono">POST /audit/resources/&#123;resourceId&#125;/platform-force-deprecate</span>，资源 id：{forceDeprecateTarget.resourceId || '—'}。
            </p>
            <AutoHeightTextarea
              minRows={4}
              maxRows={14}
              value={forceDeprecateReason}
              onChange={(e) => setForceDeprecateReason(e.target.value)}
              className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm resize-none ${
                isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
              }`}
              placeholder="下架原因（可选）"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className={btnGhost(theme)} onClick={() => setForceDeprecateTarget(null)}>
                取消
              </button>
              <button
                type="button"
                className={mgmtTableActionDanger}
                disabled={runningActionId === `pfd-${forceDeprecateTarget.resourceId}`}
                onClick={() => {
                  const rid = forceDeprecateTarget.resourceId;
                  if (!rid) {
                    showMessage('缺少资源 ID，无法强制下架', 'error');
                    return;
                  }
                  void runAction(
                    `pfd-${rid}`,
                    () =>
                      resourceAuditService.platformForceDeprecate(rid, {
                        reason: forceDeprecateReason.trim() || undefined,
                      }),
                    '已平台强制下架',
                  ).finally(() => {
                    setForceDeprecateTarget(null);
                    setForceDeprecateReason('');
                  });
                }}
              >
                {runningActionId === `pfd-${forceDeprecateTarget.resourceId}` ? '执行中…' : '确认下架'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
