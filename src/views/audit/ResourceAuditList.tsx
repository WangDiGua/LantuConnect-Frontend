import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type { ResourceAuditItemVO } from '../../types/dto/resource-center';
import { resourceAuditService } from '../../api/services/resource-audit.service';
import { useUserRole } from '../../context/UserRoleContext';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  canvasBodyBg,
  mainScrollCompositorClass,
  mgmtTableActionDanger,
  mgmtTableActionPositive,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
  tableBodyRow,
  tableCell,
  tableHeadCell,
} from '../../utils/uiClasses';
import { TOOLBAR_ROW_LIST } from '../../utils/toolbarFieldClasses';
import { FilterSelect, Pagination, SearchInput } from '../../components/common';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { formatDateTime } from '../../utils/formatDateTime';
import { nullDisplay } from '../../utils/errorHandler';
import { resolvePersonDisplay } from '../../utils/personDisplay';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  defaultType?: ResourceType;
}

export const ResourceAuditList: React.FC<Props> = ({ theme, showMessage, defaultType }) => {
  const isDark = theme === 'dark';
  const { platformRole } = useUserRole();
  const canPublish = platformRole === 'platform_admin';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ResourceAuditItemVO[]>([]);
  const [resourceType, setResourceType] = useState<ResourceType | ''>(defaultType ?? '');
  const [statusFilter, setStatusFilter] = useState<'all' | ResourceAuditItemVO['status']>('pending_review');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rejectTarget, setRejectTarget] = useState<ResourceAuditItemVO | null>(null);
  const [rejectReason, setRejectReason] = useState('');
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
              <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>统一资源审核台</h2>
              <p className={`mt-0.5 text-xs ${textMuted(theme)}`}>支持 approve / reject / publish</p>
            </div>
            <div className="flex items-center gap-2">
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
                className="w-36"
              />
              <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)}>
                刷新
              </button>
            </div>
          </div>
          <div className={`px-4 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className={`${TOOLBAR_ROW_LIST} min-w-0`}>
              <FilterSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'pending_review', label: '待审核' },
                  { value: 'testing', label: '测试中' },
                  { value: 'rejected', label: '已驳回' },
                  { value: 'published', label: '已发布' },
                ]}
                theme={theme}
                className="w-36 shrink-0"
              />
              <div className="min-w-0 flex-1 shrink">
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
          </div>
          <div className="overflow-auto">
            {loading ? (
              <div className={`py-10 text-center text-sm ${textMuted(theme)}`}>加载中…</div>
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载审核列表" />
            ) : rows.length === 0 ? (
              <div className="p-4">
                <EmptyState title="暂无审核项" description="当前筛选条件下没有待处理项，可切换筛选后重试。" />
              </div>
            ) : (
              <table className="w-full min-w-[1200px] text-sm">
                <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <tr>
                    <th className={tableHeadCell(theme)}>资源名称</th>
                    <th className={tableHeadCell(theme)}>类型</th>
                    <th className={tableHeadCell(theme)}>状态</th>
                    <th className={tableHeadCell(theme)}>资源编码</th>
                    <th className={tableHeadCell(theme)}>提交者</th>
                    <th className={tableHeadCell(theme)}>提交时间</th>
                    <th className={tableHeadCell(theme)}>审核意见</th>
                    <th className={tableHeadCell(theme)}>描述</th>
                    <th className={`${tableHeadCell(theme)} text-right`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item, idx) => (
                    <tr key={item.id} className={tableBodyRow(theme, idx)}>
                      <td className={`${tableCell()} font-medium ${textPrimary(theme)}`}>{item.displayName}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{item.resourceType}</td>
                      <td className={tableCell()}>
                        <span className={statusBadgeClass(item.status, theme)}>
                          <span className={statusDot(item.status)} />
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{nullDisplay(item.resourceCode)}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>
                        {resolvePersonDisplay({ names: [item.submitterName], usernames: [item.submitter] })}
                      </td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{nullDisplay(formatDateTime(item.submitTime))}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{nullDisplay(item.reason)}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{nullDisplay(item.description, '暂无描述')}</td>
                      <td className={`${tableCell()} text-right`}>
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
                              <button type="button" className={mgmtTableActionDanger} disabled={!!runningActionId} onClick={() => setRejectTarget(item)}>
                                驳回
                              </button>
                            </>
                          )}
                          {item.status === 'testing' && (
                            <>
                              {canPublish ? (
                                <button
                                  type="button"
                                  className={mgmtTableActionPositive(theme)}
                                  disabled={runningActionId === `publish-${item.id}`}
                                  onClick={() => void runAction(`publish-${item.id}`, () => resourceAuditService.publish(item.id), '已发布，状态进入 published')}
                                >
                                  {runningActionId === `publish-${item.id}` ? '发布中…' : '发布'}
                                </button>
                              ) : (
                                <span className={`text-xs ${textMuted(theme)}`}>待平台管理员发布</span>
                              )}
                              <button type="button" className={mgmtTableActionDanger} disabled={!!runningActionId} onClick={() => setRejectTarget(item)}>
                                驳回
                              </button>
                            </>
                          )}
                          {item.status !== 'pending_review' && item.status !== 'testing' && (
                            <span className={`text-xs ${textMuted(theme)}`}>无可执行动作</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
            <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>驳回资源 · {rejectTarget.displayName}</h3>
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
              <button type="button" className={btnGhost(theme)} onClick={() => setRejectTarget(null)}>取消</button>
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
                    await resourceAuditService.reject(rejectTarget.id, { reason: rejectReason.trim() });
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
