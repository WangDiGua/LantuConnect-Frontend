import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileCheck, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { GrantApplicationVO } from '../../types/dto/grant-application';
import { grantApplicationService } from '../../api/services/grant-application.service';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination, FilterSelect } from '../../components/common';
import {
  bentoCard,
  btnGhost,
  canvasBodyBg,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
  tableHeadCell,
  tableBodyRow,
  tableCell,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { nullDisplay } from '../../utils/errorHandler';
import { formatDateTime } from '../../utils/formatDateTime';
import { buildPath, type ConsoleRole } from '../../constants/consoleRoutes';
import { marketPageForResourceType } from '../../utils/marketDeepLink';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const STATUS_MAP: Record<string, DomainStatus> = {
  pending: 'pending_review',
  approved: 'published',
  rejected: 'rejected',
};

const STATUS_LABEL_ZH: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
};

export const MyGrantApplicationsPage: React.FC<Props> = ({ theme }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const consoleRole: ConsoleRole = pathname.startsWith('/admin') ? 'admin' : 'user';
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [items, setItems] = useState<GrantApplicationVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await grantApplicationService.listMine({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(data.list);
      setTotal(data.total);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载授权申请记录失败'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${canvasBodyBg(theme)}`}>
      <div className="px-3 py-4 sm:px-4 lg:px-5">
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className={`flex items-center justify-between border-b px-6 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
                <FileCheck size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>我的授权申请</h2>
                <p className={`mt-0.5 text-xs ${textMuted(theme)}`}>查看已提交的资源授权申请及审批状态</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FilterSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: 'pending', label: '待审批' },
                  { value: 'approved', label: '已通过' },
                  { value: 'rejected', label: '已驳回' },
                ]}
                theme={theme}
                className="w-32"
              />
              <button type="button" onClick={() => void fetchData()} className={btnGhost(theme)} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                刷新
              </button>
            </div>
          </div>

          {!loadError && (
            <div className={`mx-6 mb-4 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-neutral-900/25 bg-neutral-900/10' : 'border-neutral-200 bg-neutral-100/90'}`}>
              <p className={`font-semibold ${textPrimary(theme)}`}>审批通过后怎么用？</p>
              <ul className={`mt-2 list-disc space-y-1.5 pl-4 ${textSecondary(theme)} text-sm`}>
                <li>
                  在列表中找「已通过」，点 <strong className={textPrimary(theme)}>前往资源</strong> 打开市场详情试调用。
                </li>
                <li>
                  自建接入时使用 <span className="font-mono text-xs">/catalog/resolve</span> 与 <span className="font-mono text-xs">/invoke</span>；请求头、密钥与权限规则见{' '}
                  <strong className={textPrimary(theme)}>API 文档</strong>（下方按钮）。
                </li>
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={btnGhost(theme)} onClick={() => navigate(buildPath(consoleRole, 'preferences'))}>
                  管理 API Key
                </button>
                <button type="button" className={btnGhost(theme)} onClick={() => navigate(buildPath(consoleRole, 'api-docs'))}>
                  API 文档
                </button>
              </div>
            </div>
          )}

          <div className="overflow-auto">
            {loading && items.length === 0 ? (
              <div className={`py-10 text-center text-sm ${textMuted(theme)}`}>加载中…</div>
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void fetchData()} retryLabel="重试加载" />
            ) : items.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="暂无授权申请"
                  description="你还没有提交过授权申请。可在资源市场的详情页点击「申请授权」发起。审批通过后，请回到本页使用「前往资源」打开对应市场并试调用。"
                />
              </div>
            ) : (
              <table className="w-full min-w-[900px] text-sm">
                <thead className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                  <tr>
                    <th className={tableHeadCell(theme)}>申请 ID</th>
                    <th className={tableHeadCell(theme)}>资源类型</th>
                    <th className={tableHeadCell(theme)}>资源 ID</th>
                    <th className={tableHeadCell(theme)}>API Key</th>
                    <th className={tableHeadCell(theme)}>操作权限</th>
                    <th className={tableHeadCell(theme)}>使用场景</th>
                    <th className={tableHeadCell(theme)}>状态</th>
                    <th className={tableHeadCell(theme)}>驳回原因</th>
                    <th className={tableHeadCell(theme)}>申请时间</th>
                    <th className={tableHeadCell(theme)}>下一步</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className={tableBodyRow(theme, idx)}>
                      <td className={`${tableCell()} font-mono ${textSecondary(theme)}`}>{item.id}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{nullDisplay(item.resourceType)}</td>
                      <td className={`${tableCell()} font-mono ${textSecondary(theme)}`}>{item.resourceId}</td>
                      <td className={`${tableCell()} font-mono ${textSecondary(theme)}`}>{nullDisplay(item.apiKeyId)}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{item.actions.length > 0 ? item.actions.join(', ') : '--'}</td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{nullDisplay(item.useCase)}</td>
                      <td className={tableCell()}>
                        <span className={statusBadgeClass(STATUS_MAP[item.status] ?? 'draft', theme)}>
                          <span className={statusDot(STATUS_MAP[item.status] ?? 'draft')} />
                          {STATUS_LABEL_ZH[item.status] ?? statusLabel(STATUS_MAP[item.status] ?? 'draft')}
                        </span>
                      </td>
                      <td className={`${tableCell()} ${textSecondary(theme)}`}>{nullDisplay(item.rejectReason)}</td>
                      <td className={`${tableCell()} ${textMuted(theme)}`}>{nullDisplay(formatDateTime(item.createTime))}</td>
                      <td className={tableCell()}>
                        {(() => {
                          const market = marketPageForResourceType(item.resourceType);
                          if (item.status === 'approved' && market) {
                            return (
                              <button
                                type="button"
                                className={`text-xs font-semibold ${isDark ? 'text-neutral-300 hover:text-neutral-300' : 'text-neutral-900 hover:text-neutral-800'} underline-offset-2 hover:underline`}
                                onClick={() => navigate(`${buildPath(consoleRole, market)}?resourceId=${item.resourceId}`)}
                              >
                                前往资源
                              </button>
                            );
                          }
                          if (item.status === 'pending') {
                            return <span className={`text-xs ${textMuted(theme)}`}>等待审批</span>;
                          }
                          if (item.status === 'rejected') {
                            return <span className={`text-xs ${textMuted(theme)}`}>—</span>;
                          }
                          return <span className={`text-xs ${textMuted(theme)}`}>—</span>;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={`px-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
};
