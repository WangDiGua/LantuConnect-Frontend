import React, { useCallback, useEffect, useState } from 'react';
import type { Theme, FontSize } from '../../types';
import type { GrantApplicationVO } from '../../types/dto/grant-application';
import { grantApplicationService } from '../../api/services';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  canvasBodyBg,
  mainScrollCompositorClass,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
  tableBodyRow,
  tableCell,
  tableCellActionChipsRow,
  tableCellScrollInnerMono,
  tableHeadCell,
  mgmtTableActionDanger,
  mgmtTableActionPositive,
  type DomainStatus,
} from '../../utils/uiClasses';
import { TOOLBAR_ROW_LIST } from '../../utils/toolbarFieldClasses';
import { FilterSelect, Pagination, SearchInput } from '../../components/common';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { nullDisplay } from '../../utils/errorHandler';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

function grantToDomainStatus(status: GrantApplicationVO['status']): DomainStatus {
  if (status === 'pending') return 'pending_review';
  if (status === 'approved') return 'published';
  return 'rejected';
}

export const GrantApplicationListPage: React.FC<Props> = ({ theme, showMessage }) => {
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
        status: statusFilter === 'all' ? undefined : statusFilter,
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

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <div className="px-3 py-4 sm:px-4 lg:px-5">
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div>
              <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>授权申请审批</h2>
              <p className={`mt-0.5 text-xs ${textMuted(theme)}`}>
                列表范围由后端按角色过滤：资源拥有者审本人资源上的申请；部门管理员审本部拥有者资源；平台管理员可审全部。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)}>
                刷新
              </button>
            </div>
          </div>
          <div className={`px-4 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className={`${TOOLBAR_ROW_LIST} min-w-0`}>
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
          </div>
          <div className="overflow-auto">
            {loading ? (
              <PageSkeleton type="table" rows={8} />
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载列表" />
            ) : rows.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title={debouncedSearch || statusFilter !== 'all' ? '无匹配申请' : '暂无授权申请'}
                  description={debouncedSearch || statusFilter !== 'all' ? '请调整关键词或状态筛选。' : '当前筛选条件下没有申请记录，可切换筛选后重试。'}
                />
              </div>
            ) : (
              <table className="w-full min-w-[1200px] text-sm">
                <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <tr>
                    <th className={tableHeadCell(theme)}>ID</th>
                    <th className={tableHeadCell(theme)}>资源类型</th>
                    <th className={tableHeadCell(theme)}>资源ID</th>
                    <th className={tableHeadCell(theme)}>API Key</th>
                    <th className={tableHeadCell(theme)}>操作权限</th>
                    <th className={tableHeadCell(theme)}>使用场景</th>
                    <th className={tableHeadCell(theme)}>状态</th>
                    <th className={tableHeadCell(theme)}>申请人 / 审核人</th>
                    <th className={tableHeadCell(theme)}>申请时间</th>
                    <th className={`${tableHeadCell(theme)} text-right`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item, idx) => {
                    const domainStatus = grantToDomainStatus(item.status);
                    return (
                      <tr key={item.id} className={tableBodyRow(theme, idx)}>
                        <td className={`${tableCell()} font-medium ${textPrimary(theme)}`}>{item.id}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{nullDisplay(item.resourceType)}</td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{item.resourceId}</td>
                        <td className={`${tableCell()} max-w-[200px] align-middle font-mono ${textSecondary(theme)}`}>
                          {item.apiKeyId ? (
                            <div className={tableCellScrollInnerMono}>{item.apiKeyId}</div>
                          ) : (
                            nullDisplay(undefined)
                          )}
                        </td>
                        <td className={`${tableCell()} max-w-[min(260px,100%)] align-middle ${textSecondary(theme)}`}>
                          {item.actions?.length ? (
                            <div className={tableCellActionChipsRow()}>
                              {item.actions.map((a) => (
                                <span
                                  key={a}
                                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${
                                    isDark ? 'border-white/[0.08] bg-white/[0.06]' : 'border-slate-200/80 bg-slate-50'
                                  }`}
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          ) : (
                            nullDisplay(undefined)
                          )}
                        </td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>{nullDisplay(item.useCase)}</td>
                        <td className={`${tableCell()} align-middle`}>
                          <span className={statusBadgeClass(domainStatus, theme)}>
                            <span className={statusDot(domainStatus)} />
                            {statusLabel(domainStatus)}
                          </span>
                        </td>
                        <td className={`${tableCell()} ${textSecondary(theme)}`}>
                          <div>申请：{resolvePersonDisplay({ names: [item.applicantName], ids: [item.applicantId] })}</div>
                          <div className={`text-[11px] ${textMuted(theme)}`}>
                            审核：{resolvePersonDisplay({ names: [item.reviewerName], ids: [item.reviewerId] })}
                          </div>
                        </td>
                        <td className={`${tableCell()} whitespace-nowrap ${textSecondary(theme)}`}>
                          {nullDisplay(formatDateTime(item.createTime))}
                        </td>
                        <td className={`${tableCell()} text-right`}>
                          <div className="inline-flex items-center gap-1">
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
                                  onClick={() => setRejectTarget(item)}
                                >
                                  驳回
                                </button>
                              </>
                            ) : (
                              <span className={`text-xs ${textMuted(theme)}`}>无可执行动作</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className={`px-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        </div>
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setRejectTarget(null)}>
          <div className={`${bentoCard(theme)} w-full max-w-lg p-4`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>
              驳回授权申请 · ID {rejectTarget.id}
            </h3>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm ${
                isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
              }`}
              placeholder="请输入驳回原因（reason）"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className={btnGhost(theme)} onClick={() => setRejectTarget(null)}>
                取消
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={runningActionId === `reject-${rejectTarget.id}`}
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    showMessage('驳回原因不能为空', 'warning');
                    return;
                  }
                  setRunningActionId(`reject-${rejectTarget.id}`);
                  try {
                    await grantApplicationService.reject(rejectTarget.id, { reason: rejectReason.trim() });
                    showMessage('已驳回', 'success');
                    setRejectReason('');
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
    </div>
  );
};
