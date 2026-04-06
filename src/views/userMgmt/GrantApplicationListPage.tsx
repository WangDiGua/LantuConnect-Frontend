import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { GrantApplicationVO } from '../../types/dto/grant-application';
import { grantApplicationService } from '../../api/services';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
  fieldErrorText,
  inputBaseError,
  tableCellActionChipsRow,
  tableCellScrollInnerMono,
  mgmtTableActionDanger,
  mgmtTableActionPositive,
  type DomainStatus,
} from '../../utils/uiClasses';
import { TOOLBAR_ROW_LIST } from '../../utils/toolbarFieldClasses';
import { FilterSelect, Pagination, SearchInput } from '../../components/common';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { nullDisplay } from '../../utils/errorHandler';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { MgmtPageShell } from './MgmtPageShell';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const GRANT_PAGE_DESC =
  '待办范围由后端按角色过滤：platform_admin、admin、reviewer 可查看职责范围内的全部申请；其余用户仅能看到「自己是资源创建者」的资源上的申请。「全部状态」包含待审批、已通过、已驳回。';

function grantToDomainStatus(status: GrantApplicationVO['status']): DomainStatus {
  if (status === 'pending') return 'pending_review';
  if (status === 'approved') return 'published';
  return 'rejected';
}

export const GrantApplicationListPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<GrantApplicationVO[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rejectTarget, setRejectTarget] = useState<GrantApplicationVO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const pageData = await grantApplicationService.listPending({
        status: statusFilter === 'all' ? 'all' : statusFilter,
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedSearch ? { keyword: debouncedSearch } : {}),
      });
      setItems(pageData.list);
      setTotal(pageData.total);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载授权申请列表失败');
      setLoadError(error);
      setItems([]);
      setTotal(0);
      showMessage(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, showMessage, statusFilter, debouncedSearch]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const rows = items;

  const runAction = async (actionKey: string, action: () => Promise<void>, okMsg: string) => {
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
  };

  const columns = useMemo<MgmtDataTableColumn<GrantApplicationVO>[]>(
    () => [
      {
        id: 'id',
        header: 'ID',
        cell: (item) => <span className={`font-medium ${textPrimary(theme)}`}>{item.id}</span>,
      },
      {
        id: 'resourceType',
        header: '资源类型',
        cell: (item) => <span className={textSecondary(theme)}>{nullDisplay(item.resourceType)}</span>,
      },
      {
        id: 'resourceId',
        header: '资源ID',
        cell: (item) => <span className={textSecondary(theme)}>{item.resourceId}</span>,
      },
      {
        id: 'apiKeyId',
        header: 'API Key',
        cell: (item) =>
          item.apiKeyId ? (
            <div className={`max-w-[200px] font-mono ${textSecondary(theme)}`}>
              <div className={tableCellScrollInnerMono}>{item.apiKeyId}</div>
            </div>
          ) : (
            <span className={textSecondary(theme)}>{nullDisplay(undefined)}</span>
          ),
      },
      {
        id: 'actions',
        header: '操作权限',
        cell: (item) =>
          item.actions?.length ? (
            <div className={`max-w-[min(260px,100%)] ${textSecondary(theme)}`}>
              <div className={tableCellActionChipsRow()}>
                {item.actions.map((a) => (
                  <span
                    key={a}
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                      isDark ? 'border-white/[0.08] bg-white/[0.06]' : 'border-slate-200/80 bg-slate-50'
                    }`}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <span className={textSecondary(theme)}>{nullDisplay(undefined)}</span>
          ),
      },
      {
        id: 'useCase',
        header: '使用场景',
        cell: (item) => <span className={textSecondary(theme)}>{nullDisplay(item.useCase)}</span>,
      },
      {
        id: 'status',
        header: '状态',
        cell: (item) => {
          const domainStatus = grantToDomainStatus(item.status);
          return (
            <span className={statusBadgeClass(domainStatus, theme)}>
              <span className={statusDot(domainStatus)} />
              {statusLabel(domainStatus)}
            </span>
          );
        },
      },
      {
        id: 'people',
        header: '申请人 / 审核人',
        cell: (item) => (
          <span className={textSecondary(theme)}>
            <div>申请：{resolvePersonDisplay({ names: [item.applicantName], ids: [item.applicantId] })}</div>
            <div className={`text-xs ${textMuted(theme)}`}>
              审核：{resolvePersonDisplay({ names: [item.reviewerName], ids: [item.reviewerId] })}
            </div>
          </span>
        ),
      },
      {
        id: 'createTime',
        header: '申请时间',
        cell: (item) => (
          <span className={`whitespace-nowrap ${textSecondary(theme)}`}>{nullDisplay(formatDateTime(item.createTime))}</span>
        ),
      },
      {
        id: 'ops',
        header: '操作',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        cell: (item) => (
          <div className="inline-flex items-center justify-end gap-1">
            {item.status === 'pending' ? (
              <>
                <button
                  type="button"
                  className={mgmtTableActionPositive(theme)}
                  disabled={runningActionId === `approve-${item.id}`}
                  onClick={() =>
                    void runAction(`approve-${item.id}`, () => grantApplicationService.approve(item.id), '已通过该授权申请')
                  }
                >
                  {runningActionId === `approve-${item.id}` ? '处理中…' : '通过'}
                </button>
                <button
                  type="button"
                  className={mgmtTableActionDanger}
                  disabled={!!runningActionId}
                  onClick={() => {
                    setRejectTarget(item);
                    setRejectReason('');
                    setRejectReasonError('');
                  }}
                >
                  驳回
                </button>
              </>
            ) : (
              <span className={`text-xs ${textMuted(theme)}`}>无可执行动作</span>
            )}
          </div>
        ),
      },
    ],
    [isDark, runningActionId, runAction, showMessage, theme],
  );

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={ClipboardList}
        breadcrumbSegments={['用户与权限', '授权申请审批']}
        description={GRANT_PAGE_DESC}
        toolbar={
          <div className={`${TOOLBAR_ROW_LIST} min-w-0 justify-between gap-3`}>
            <div className={`${TOOLBAR_ROW_LIST} min-w-0 flex-1`}>
              <FilterSelect
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v as typeof statusFilter);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'pending', label: '待审批' },
                  { value: 'approved', label: '已通过' },
                  { value: 'rejected', label: '已驳回' },
                ]}
                theme={theme}
                className="w-36 shrink-0"
              />
              <div className="min-w-0 flex-1 shrink">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="搜索 ID、资源、API Key、权限、场景…"
                  theme={theme}
                />
              </div>
            </div>
            <button type="button" onClick={() => void fetchData()} className={`shrink-0 ${btnGhost(theme)}`} aria-label="刷新列表">
              刷新
            </button>
          </div>
        }
      >
        <div className="px-4 sm:px-6 pb-6 flex flex-col min-h-0 flex-1">
          {loading ? (
            <PageSkeleton type="table" rows={8} />
          ) : loadError ? (
            <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载列表" />
          ) : rows.length === 0 ? (
            <div className="py-2">
              <EmptyState
                title={debouncedSearch || statusFilter !== 'all' ? '无匹配申请' : '暂无待你处理的授权申请'}
                description={
                  debouncedSearch || statusFilter !== 'all'
                    ? '请调整关键词或状态筛选。'
                    : '若你不是任何资源的创建者，且账号不具有平台或审核角色，此处通常为空。有申请待审时，资源所有者会收到系统通知；也可在「我的授权申请」查看你自己提交的工单。'
                }
              />
            </div>
          ) : (
            <MgmtDataTable<GrantApplicationVO>
              theme={theme}
              columns={columns}
              rows={rows}
              getRowKey={(item) => item.id}
              minWidth="1200px"
              surface="plain"
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
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>
              驳回授权申请 · ID {rejectTarget.id}
            </h3>
            <label htmlFor="grant-reject-reason" className={`mt-3 block text-xs font-medium ${textSecondary(theme)}`}>
              驳回原因（reason）
            </label>
            <AutoHeightTextarea
              id="grant-reject-reason"
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
              aria-describedby={rejectReasonError ? 'grant-reject-reason-err' : undefined}
            />
            {rejectReasonError ? (
              <p id="grant-reject-reason-err" className={`mt-1.5 ${fieldErrorText()} text-xs`} role="alert">
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
                    await grantApplicationService.reject(rejectTarget.id, { reason: rejectReason.trim() });
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
    </>
  );
};
