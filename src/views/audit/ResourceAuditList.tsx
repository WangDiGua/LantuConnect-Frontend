import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type { ResourceAuditItemVO } from '../../types/dto/resource-center';
import { resourceAuditService } from '../../api/services/resource-audit.service';
import { useUserRole } from '../../context/UserRoleContext';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  mgmtTableActionDanger,
  mgmtTableActionPositive,
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
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { formatDateTime } from '../../utils/formatDateTime';
import { nullDisplay } from '../../utils/errorHandler';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { AccessPolicyBadge } from '../../components/business/AccessPolicyBadge';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  defaultType?: ResourceType;
}

const AUDIT_DESC = '支持 approve / reject / publish';

export const ResourceAuditList: React.FC<Props> = ({ theme, fontSize, showMessage, defaultType }) => {
  const isDark = theme === 'dark';
  const { platformRole } = useUserRole();
  const canPublishResource =
    platformRole === 'platform_admin' || platformRole === 'reviewer' || platformRole === 'developer';
  const canPlatformForceDeprecate = platformRole === 'platform_admin';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ResourceAuditItemVO[]>([]);
  const [resourceType, setResourceType] = useState<ResourceType | ''>(defaultType ?? '');
  const [statusFilter, setStatusFilter] = useState<'all' | ResourceAuditItemVO['status']>('pending_review');

  useEffect(() => {
    setResourceType(defaultType ?? '');
    setPage(1);
  }, [defaultType]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rejectTarget, setRejectTarget] = useState<ResourceAuditItemVO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [forceDeprecateTarget, setForceDeprecateTarget] = useState<ResourceAuditItemVO | null>(null);
  const [forceDeprecateReason, setForceDeprecateReason] = useState('');
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const pageData = await resourceAuditService.list({
        page,
        pageSize: PAGE_SIZE,
        resourceType: resourceType || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
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

  const auditColumns = useMemo<MgmtDataTableColumn<ResourceAuditItemVO>[]>(
    () => [
      {
        id: 'name',
        header: '资源名称',
        cellClassName: 'font-medium max-w-[12rem]',
        cell: (item) => <span className={`block truncate ${textPrimary(theme)}`} title={item.displayName}>{item.displayName}</span>,
      },
      { id: 'type', header: '类型', cell: (item) => <span className={textSecondary(theme)}>{item.resourceType}</span> },
      {
        id: 'policy',
        header: '消费策略',
        cellClassName: 'align-middle',
        cell: (item) => <AccessPolicyBadge theme={theme} value={item.accessPolicy} whenMissing="hide" />,
      },
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
        cell: (item) => (
          <div className="inline-flex flex-wrap items-center justify-end gap-1">
            {item.status === 'pending_review' && (
              <>
                <button
                  type="button"
                  className={mgmtTableActionPositive(theme)}
                  disabled={runningActionId === `approve-${item.id}`}
                  onClick={() => void runAction(`approve-${item.id}`, () => resourceAuditService.approve(item.id), '已通过审核，状态进入 testing')}
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
                    onClick={() => void runAction(`publish-${item.id}`, () => resourceAuditService.publish(item.id), '已发布，状态进入 published')}
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
            {item.status !== 'pending_review' &&
              item.status !== 'testing' &&
              item.status !== 'merged_live' &&
              !(item.status === 'published' && canPlatformForceDeprecate) && (
              <span className={`text-xs ${textMuted(theme)}`}>无可执行动作</span>
            )}
          </div>
        ),
      },
    ],
    [theme, runningActionId, canPublishResource, canPlatformForceDeprecate, runAction],
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
          <div className={`${TOOLBAR_ROW_LIST} min-w-0 justify-between gap-3 flex-wrap`}>
            <div className={`${TOOLBAR_ROW_LIST} min-w-0 flex-1 flex-wrap`}>
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
                className="w-36 shrink-0"
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
                className="w-36 shrink-0"
              />
              <div className="min-w-0 flex-1 shrink basis-[min(100%,240px)]">
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
              <MgmtDataTable<ResourceAuditItemVO>
                theme={theme}
                surface="plain"
                minWidth="1200px"
                columns={auditColumns}
                rows={rows}
                getRowKey={(item) => item.id}
              />
            )}
          <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
        </div>
      </MgmtPageShell>

      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => { setRejectTarget(null); setRejectReasonError(''); }}
        >
          <div className={`${bentoCard(theme)} w-full max-w-lg p-4`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>驳回资源 · {rejectTarget.displayName}</h3>
            <label htmlFor="resource-audit-reject-reason" className={`mt-3 block text-xs font-medium ${textSecondary(theme)}`}>
              驳回原因（reason）
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
              placeholder="请输入驳回原因（reason）"
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
