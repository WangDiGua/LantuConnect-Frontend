import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, ClipboardList } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from './MgmtPageShell';
import { developerApplicationService } from '../../api/services/developer-application.service';
import type { DeveloperApplicationVO } from '../../types/dto/developer-application';
import type { PaginatedData } from '../../types/api';
import { BentoCard } from '../../components/common/BentoCard';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function statusBadge(status: string, isDark: boolean) {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    rejected: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  };
  const cls = map[status] ?? 'bg-slate-500/10 text-slate-500';
  const label: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label[status] ?? status}</span>;
}

export const DeveloperApplicationListPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedData<DeveloperApplicationVO> | null>(null);
  const [actionTarget, setActionTarget] = useState<{ app: DeveloperApplicationVO; action: 'approve' | 'reject' } | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchList = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await developerApplicationService.list({ page: p, pageSize: 20 });
      setData(res);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => { fetchList(page); }, [page, fetchList]);

  const handleAction = async () => {
    if (!actionTarget) return;
    setSubmitting(true);
    try {
      if (actionTarget.action === 'approve') {
        await developerApplicationService.approve(actionTarget.app.id);
        showMessage('已通过该申请', 'success');
      } else {
        if (!rejectComment.trim()) {
          showMessage('请填写驳回原因', 'error');
          setSubmitting(false);
          return;
        }
        await developerApplicationService.reject(actionTarget.app.id, { reviewComment: rejectComment.trim() });
        showMessage('已驳回该申请', 'success');
      }
      setActionTarget(null);
      setRejectComment('');
      fetchList(page);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '操作失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={ClipboardList} breadcrumbSegments={['用户与权限', '入驻审批']}>
        <PageSkeleton type="table" />
      </MgmtPageShell>
    );
  }

  const list = data?.list ?? [];

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={ClipboardList} breadcrumbSegments={['用户与权限', '入驻审批']}>
      <div className="px-4 sm:px-6 pb-6">
        {list.length === 0 ? (
          <EmptyState title="暂无入驻申请" description="目前没有待处理的开发者入驻申请" />
        ) : (
          <>
            <BentoCard theme={theme} padding="sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <th className={`px-4 py-3 text-left font-medium ${textSecondary(theme)}`}>申请人</th>
                    <th className={`px-4 py-3 text-left font-medium ${textSecondary(theme)}`}>邮箱</th>
                    <th className={`px-4 py-3 text-left font-medium ${textSecondary(theme)}`}>单位</th>
                    <th className={`px-4 py-3 text-left font-medium ${textSecondary(theme)}`}>状态</th>
                    <th className={`px-4 py-3 text-left font-medium ${textSecondary(theme)}`}>申请时间</th>
                    <th className={`px-4 py-3 text-right font-medium ${textSecondary(theme)}`}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((app) => (
                    <tr key={app.id} className={`border-b last:border-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-50'}`}>
                      <td className={`px-4 py-3 ${textPrimary(theme)}`}>
                        {resolvePersonDisplay({
                          names: [app.userName],
                          usernames: [app.username],
                          ids: [app.userId ?? app.id],
                        })}
                      </td>
                      <td className={`px-4 py-3 ${textMuted(theme)}`}>
                        <div>{app.contactEmail}</div>
                        {app.contactPhone && <div className="text-[11px] mt-0.5">{app.contactPhone}</div>}
                      </td>
                      <td className={`px-4 py-3 ${textMuted(theme)}`}>{app.companyName || '-'}</td>
                      <td className="px-4 py-3">{statusBadge(app.status, isDark)}</td>
                      <td className={`px-4 py-3 ${textMuted(theme)}`}>
                        <div>{formatDateTime(app.createTime, '-')}</div>
                        {app.applyReason && <div className={`text-[11px] mt-0.5 line-clamp-1 max-w-[200px] ${textMuted(theme)}`} title={app.applyReason}>原因: {app.applyReason}</div>}
                        {app.reviewComment && <div className={`text-[11px] mt-0.5 line-clamp-1 max-w-[200px] text-amber-500`} title={app.reviewComment}>意见: {app.reviewComment}</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {app.status === 'pending' && (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                              onClick={() => setActionTarget({ app, action: 'approve' })}
                            >
                              <CheckCircle2 size={13} /> 通过
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
                              onClick={() => setActionTarget({ app, action: 'reject' })}
                            >
                              <XCircle size={13} /> 驳回
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </BentoCard>

            {(data?.total ?? 0) > 20 && (
              <div className="flex justify-center gap-2 mt-4">
                <button type="button" className={btnSecondary(theme)} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
                <span className={`flex items-center text-sm ${textMuted(theme)}`}>第 {page} 页</span>
                <button type="button" className={btnSecondary(theme)} disabled={list.length < 20} onClick={() => setPage((p) => p + 1)}>下一页</button>
              </div>
            )}
          </>
        )}
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
        onCancel={() => { setActionTarget(null); setRejectComment(''); }}
      />

      <Modal
        open={actionTarget?.action === 'reject'}
        onClose={() => { setActionTarget(null); setRejectComment(''); }}
        title="驳回入驻申请"
        theme={theme}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary(theme)} onClick={() => { setActionTarget(null); setRejectComment(''); }}>取消</button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={submitting} onClick={handleAction}>
              {submitting ? <><Loader2 size={14} className="animate-spin" /> 驳回中…</> : '驳回'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className={textSecondary(theme)}>请填写驳回原因：</p>
          <textarea
            className={`w-full rounded-xl border px-3 py-2 text-sm min-h-[80px] resize-none outline-none ${
              isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="驳回原因（必填）"
          />
        </div>
      </Modal>
    </MgmtPageShell>
  );
};
