import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ClipboardList } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from './MgmtPageShell';
import { developerApplicationService } from '../../api/services/developer-application.service';
import type { DeveloperApplicationVO } from '../../types/dto/developer-application';
import type { PaginatedData } from '../../types/api';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { SearchInput } from '../../components/common/SearchInput';
import { Pagination } from '../../components/common/Pagination';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { MgmtBatchToolbar } from '../../components/management/MgmtBatchToolbar';
import { TOOLBAR_ROW_LIST } from '../../utils/toolbarFieldClasses';
import {
  bentoCard,
  btnPrimary,
  btnSecondary,
  btnGhost,
  fieldErrorText,
  inputBaseError,
  mgmtTableActionDanger,
  mgmtTableActionPositive,
  mgmtTableRowActions,
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { getErrorMessage, isConflictError } from '../../utils/errorHandler';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { getNotificationType, isNotificationMessage, subscribeRealtimePush } from '../../lib/realtimePush';

const ONBOARDING_NOTIFICATION_TYPES = new Set([
  'onboarding_submitted',
  'onboarding_approved',
  'onboarding_rejected',
]);

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PAGE_SIZE = 20;
const PAGE_DESCRIPTION = '审核开发者入驻申请，支持通过或驳回';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rejected: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  };
  const cls = map[status] ?? 'bg-slate-500/10 text-slate-500';
  const label: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
    unknown: '未知',
  };
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label[status] ?? '未知状态'}</span>;
}

export const DeveloperApplicationListPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  useScrollPaginatedContentToTop(page);
  const [data, setData] = useState<PaginatedData<DeveloperApplicationVO> | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionTarget, setActionTarget] = useState<{ app: DeveloperApplicationVO; action: 'approve' | 'reject' } | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectCommentError, setRejectCommentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchRejectIds, setBatchRejectIds] = useState<number[] | null>(null);
  const [batchRejectComment, setBatchRejectComment] = useState('');
  const [batchRejectCommentError, setBatchRejectCommentError] = useState('');
  const refreshTimerRef = useRef<number | null>(null);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  useEffect(() => {
    clearSelection();
  }, [page, debouncedSearch, clearSelection]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchList = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await developerApplicationService.list({
          page: p,
          pageSize: PAGE_SIZE,
          ...(debouncedSearch ? { keyword: debouncedSearch } : {}),
        });
        setData(res);
      } catch (e) {
        showMessage(e instanceof Error ? e.message : '加载失败', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showMessage, debouncedSearch],
  );

  useEffect(() => {
    void fetchList(page);
  }, [page, fetchList]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current != null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      void fetchList(page);
      refreshTimerRef.current = null;
    }, 250);
  }, [fetchList, page]);

  useEffect(() => () => {
    if (refreshTimerRef.current != null) {
      window.clearTimeout(refreshTimerRef.current);
    }
  }, []);

  useEffect(() => {
    return subscribeRealtimePush((msg) => {
      if (!isNotificationMessage(msg)) return;
      const type = getNotificationType(msg);
      if (type && ONBOARDING_NOTIFICATION_TYPES.has(type)) {
        scheduleRefresh();
      }
    });
  }, [scheduleRefresh]);

  const handleReviewError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const message = getErrorMessage(error) || fallbackMessage;
      if (
        isConflictError(error) ||
        message.includes('其他审核员') ||
        message.includes('刷新列表') ||
        message.includes('已被处理')
      ) {
        scheduleRefresh();
        showMessage('该申请已被其他审核员处理，列表已自动刷新', 'info');
        return;
      }
      showMessage(message, 'error');
    },
    [scheduleRefresh, showMessage],
  );

  const handleAction = async () => {
    if (!actionTarget) return;
    setSubmitting(true);
    try {
      if (actionTarget.action === 'approve') {
        await developerApplicationService.approve(actionTarget.app.id);
        showMessage('已通过该申请', 'success');
      } else {
        if (!rejectComment.trim()) {
          setRejectCommentError('请填写驳回原因');
          setSubmitting(false);
          return;
        }
        setRejectCommentError('');
        await developerApplicationService.reject(actionTarget.app.id, { reviewComment: rejectComment.trim() });
        showMessage('已驳回该申请', 'success');
      }
      setActionTarget(null);
      setRejectComment('');
      void fetchList(page);
    } catch (e) {
      handleReviewError(e, '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const list = data?.list ?? [];
  const filteredList = list;

  const selectedApps = useMemo(
    () => list.filter((a) => selectedKeys.has(String(a.id))),
    [list, selectedKeys],
  );
  const pendingSelected = useMemo(
    () => selectedApps.filter((a) => a.status === 'pending'),
    [selectedApps],
  );

  const runBatchApprove = useCallback(async () => {
    const ids = pendingSelected.map((a) => a.id);
    if (!ids.length) {
      showMessage('请至少选择一条「待审核」申请', 'info');
      return;
    }
    setBatchRunning(true);
    try {
      await developerApplicationService.batchApprove(ids, {});
      showMessage(`已批量通过 ${ids.length} 条`, 'success');
      clearSelection();
      void fetchList(page);
    } catch (e) {
      handleReviewError(e, '批量通过失败');
    } finally {
      setBatchRunning(false);
    }
  }, [pendingSelected, fetchList, page, showMessage, clearSelection, handleReviewError]);

  const openBatchReject = useCallback(() => {
    const ids = pendingSelected.map((a) => a.id);
    if (!ids.length) {
      showMessage('请至少选择一条「待审核」申请', 'info');
      return;
    }
    setBatchRejectIds(ids);
    setBatchRejectComment('');
    setBatchRejectCommentError('');
  }, [pendingSelected, showMessage]);

  const submitBatchReject = useCallback(async () => {
    if (!batchRejectIds?.length) return;
    if (!batchRejectComment.trim()) {
      setBatchRejectCommentError('请填写驳回原因');
      return;
    }
    setBatchRejectCommentError('');
    setBatchRunning(true);
    try {
      await developerApplicationService.batchReject(batchRejectIds, { reviewComment: batchRejectComment.trim() });
      showMessage('批量驳回完成', 'success');
      setBatchRejectIds(null);
      setBatchRejectComment('');
      clearSelection();
      void fetchList(page);
    } catch (e) {
      handleReviewError(e, '批量驳回失败');
    } finally {
      setBatchRunning(false);
    }
  }, [batchRejectIds, batchRejectComment, fetchList, page, showMessage, clearSelection, handleReviewError]);

  const columns = useMemo<MgmtDataTableColumn<DeveloperApplicationVO>[]>(
    () => [
      {
        id: 'applicant',
        header: '申请人',
        cellClassName: 'align-middle',
        cell: (app) => (
          <span className={textPrimary(theme)}>
            {resolvePersonDisplay({
              names: [app.userName],
              usernames: [app.username],
              ids: [app.userId ?? app.id],
            })}
          </span>
        ),
      },
      {
        id: 'email',
        header: '邮箱',
        cellClassName: `align-middle ${textMuted(theme)}`,
        cell: (app) => (
          <div>
            <div>{app.contactEmail}</div>
            {app.contactPhone ? <div className="text-xs mt-0.5">{app.contactPhone}</div> : null}
          </div>
        ),
      },
      {
        id: 'company',
        header: '单位',
        cellClassName: `align-middle ${textMuted(theme)}`,
        cell: (app) => app.companyName || '—',
      },
      {
        id: 'status',
        header: '状态',
        cellClassName: 'align-middle',
        cell: (app) => statusBadge(app.status),
      },
      {
        id: 'time',
        header: '申请时间',
        cellClassName: `align-middle ${textMuted(theme)}`,
        cell: (app) => (
          <div>
            <div className="whitespace-nowrap">{formatDateTime(app.createTime, '-')}</div>
            {app.applyReason ? (
              <div className={`text-xs mt-0.5 line-clamp-1 max-w-[200px]`} title={app.applyReason}>
                原因: {app.applyReason}
              </div>
            ) : null}
            {app.reviewComment ? (
              <div className="text-xs mt-0.5 line-clamp-1 max-w-[200px] text-amber-500" title={app.reviewComment}>
                意见: {app.reviewComment}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '操作',
        headerClassName: 'text-right',
        cellClassName: 'text-right align-middle',
        cellNowrap: true,
        cell: (app) =>
          app.status === 'pending' ? (
            <div className={`${mgmtTableRowActions} h-8`}>
              <button
                type="button"
                className={mgmtTableActionPositive(theme)}
                onClick={() => setActionTarget({ app, action: 'approve' })}
              >
                通过
              </button>
              <button
                type="button"
                className={mgmtTableActionDanger}
                onClick={() => setActionTarget({ app, action: 'reject' })}
              >
                驳回
              </button>
            </div>
          ) : (
            <span className={`text-xs ${textMuted(theme)}`}>—</span>
          ),
      },
    ],
    [theme],
  );

  if (loading && !data) {
    return (
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={ClipboardList}
        breadcrumbSegments={['用户与权限', '入驻审批']}
        description={PAGE_DESCRIPTION}
      >
        <PageSkeleton type="table" />
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={ClipboardList}
      breadcrumbSegments={['用户与权限', '入驻审批']}
      description={PAGE_DESCRIPTION}
      toolbar={
        <div className={`${TOOLBAR_ROW_LIST} justify-between min-w-0`}>
          <div className="min-w-0 flex-1 shrink sm:max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="申请人、邮箱、单位…"
              theme={theme}
            />
          </div>
        </div>
      }
    >
      <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0">
        {list.length === 0 ? (
          <EmptyState title="暂无入驻申请" description="目前没有待处理的开发者入驻申请" />
        ) : filteredList.length === 0 ? (
          <EmptyState title="无匹配申请" description="请调整搜索关键词或切换页码" />
        ) : (
          <>
            <MgmtBatchToolbar theme={theme} count={selectedKeys.size} onClear={clearSelection}>
              <button
                type="button"
                className={mgmtTableActionPositive(theme)}
                disabled={batchRunning || selectedKeys.size === 0}
                onClick={() => void runBatchApprove()}
              >
                {batchRunning ? '处理中…' : '批量通过'}
              </button>
              <button
                type="button"
                className={btnSecondary(theme)}
                disabled={batchRunning || selectedKeys.size === 0}
                onClick={openBatchReject}
              >
                批量驳回
              </button>
            </MgmtBatchToolbar>
            <MgmtDataTable
              theme={theme}
              columns={columns}
              rows={filteredList}
              getRowKey={(app) => String(app.id)}
              minWidth="72rem"
              surface="plain"
              selection={{
                selectedKeys,
                onSelectionChange: setSelectedKeys,
              }}
            />
          </>
        )}
        <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
      </div>

      {batchRejectIds && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => { if (!batchRunning) { setBatchRejectIds(null); setBatchRejectCommentError(''); } }}
        >
          <div className={`${bentoCard(theme)} w-full max-w-lg p-4`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>批量驳回 · {batchRejectIds.length} 条待审核</h3>
            <label htmlFor="dev-batch-reject-comment" className={`mt-3 block text-xs font-medium ${textSecondary(theme)}`}>
              驳回原因
            </label>
            <AutoHeightTextarea
              id="dev-batch-reject-comment"
              minRows={4}
              maxRows={14}
              value={batchRejectComment}
              onChange={(e) => {
                setBatchRejectComment(e.target.value);
                setBatchRejectCommentError('');
              }}
              className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm resize-none ${
                isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
              }${batchRejectCommentError ? ` ${inputBaseError()}` : ''}`}
              placeholder="请输入驳回原因"
              aria-invalid={!!batchRejectCommentError}
            />
            {batchRejectCommentError ? (
              <p className={`mt-1.5 ${fieldErrorText()} text-xs`} role="alert">
                {batchRejectCommentError}
              </p>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className={btnGhost(theme)}
                disabled={batchRunning}
                onClick={() => { setBatchRejectIds(null); setBatchRejectCommentError(''); }}
              >
                取消
              </button>
              <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={batchRunning} onClick={() => void submitBatchReject()}>
                {batchRunning ? '提交中…' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={actionTarget?.action === 'approve'}
        title="通过入驻申请"
        message={`确认通过 ${resolvePersonDisplay({
          names: [actionTarget?.app.userName],
          usernames: [actionTarget?.app.username],
          ids: [actionTarget?.app.userId ?? actionTarget?.app.id],
          empty: '',
        })} 的开发者入驻申请？`}
        variant="info"
        confirmText="通过"
        loading={submitting}
        onConfirm={handleAction}
        onCancel={() => {
          setActionTarget(null);
          setRejectComment('');
          setRejectCommentError('');
        }}
      />

      <Modal
        open={actionTarget?.action === 'reject'}
        onClose={() => {
          setActionTarget(null);
          setRejectComment('');
          setRejectCommentError('');
        }}
        title="驳回入驻申请"
        theme={theme}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => {
                setActionTarget(null);
                setRejectComment('');
                setRejectCommentError('');
              }}
            >
              取消
            </button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={submitting} onClick={handleAction}>
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> 驳回中…
                </>
              ) : (
                '驳回'
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className={textSecondary(theme)}>请填写驳回原因：</p>
          <AutoHeightTextarea
            minRows={4}
            maxRows={14}
            className={`w-full rounded-xl border px-3 py-2 text-sm resize-none outline-none ${
              isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
            }${rejectCommentError ? ` ${inputBaseError()}` : ''}`}
            value={rejectComment}
            onChange={(e) => {
              setRejectComment(e.target.value);
              setRejectCommentError('');
            }}
            placeholder="驳回原因（必填）"
            aria-invalid={!!rejectCommentError}
          />
          {rejectCommentError ? (
            <p className={`${fieldErrorText()} text-xs`} role="alert">
              {rejectCommentError}
            </p>
          ) : null}
        </div>
      </Modal>
    </MgmtPageShell>
  );
};
