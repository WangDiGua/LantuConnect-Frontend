import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import { TOOLBAR_ROW_LIST } from '../../utils/toolbarFieldClasses';
import {
  btnPrimary,
  btnSecondary,
  fieldErrorText,
  inputBaseError,
  mgmtTableActionDanger,
  mgmtTableActionPositive,
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';

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
  const [data, setData] = useState<PaginatedData<DeveloperApplicationVO> | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionTarget, setActionTarget] = useState<{ app: DeveloperApplicationVO; action: 'approve' | 'reject' } | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectCommentError, setRejectCommentError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      showMessage(e instanceof Error ? e.message : '操作失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const list = data?.list ?? [];
  const filteredList = list;

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
            {app.contactPhone ? <div className="text-[11px] mt-0.5">{app.contactPhone}</div> : null}
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
              <div className={`text-[11px] mt-0.5 line-clamp-1 max-w-[200px]`} title={app.applyReason}>
                原因: {app.applyReason}
              </div>
            ) : null}
            {app.reviewComment ? (
              <div className="text-[11px] mt-0.5 line-clamp-1 max-w-[200px] text-amber-500" title={app.reviewComment}>
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
        cell: (app) =>
          app.status === 'pending' ? (
            <div className="inline-flex flex-wrap items-center justify-end gap-1 h-8">
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
          <MgmtDataTable
            theme={theme}
            columns={columns}
            rows={filteredList}
            getRowKey={(app) => app.id}
            minWidth="72rem"
            surface="plain"
          />
        )}
        <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
      </div>

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
