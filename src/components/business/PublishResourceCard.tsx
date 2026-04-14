import React, { useState } from 'react';
import { Eye, Undo2 } from 'lucide-react';
import type { Theme } from '../../types';
import type { MyPublishItem } from '../../types/dto/user-activity';
import { resourceAuditService } from '../../api/services/resource-audit.service';
import {
  bentoCard,
  bentoCardHover,
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
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { PublishStatusStepper } from './PublishStatusStepper';
import { AutoHeightTextarea } from '../common/AutoHeightTextarea';
import { descriptionClampMinHeightPx } from '../../utils/pretextTypography';
import { lantuCheckboxPrimaryClass } from '../../utils/formFieldClasses';

const ICON_BG = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'] as const;
function pickColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return ICON_BG[Math.abs(h) % ICON_BG.length];
}

interface Props {
  theme: Theme;
  item: MyPublishItem;
  onView: () => void;
  onWithdraw?: () => void;
  /** 默认「调用次数」；无网关 invoke 的资源可改为「热度」等，避免误导 */
  callCountLabel?: string;
  /** 与统一资源中心 / ResourceAuditList 一致：待审核时可执行通过、驳回 */
  canAuditPending?: boolean;
  /** 测试中（testing）时是否显示「发布上架」（与资源中心 publish 权限一致） */
  canPublishFromTesting?: boolean;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  /** 审核或发布后回调（例如刷新列表） */
  onLifecycleMutated?: () => void;
  /** 列表页批量撤回：在待审核行左侧展示复选框 */
  batchSelectMode?: boolean;
  withdrawSelectable?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
}

export const PublishResourceCard: React.FC<Props> = ({
  theme,
  item,
  onView,
  onWithdraw,
  callCountLabel = '调用次数',
  canAuditPending = false,
  canPublishFromTesting = false,
  showMessage,
  onLifecycleMutated,
  batchSelectMode = false,
  withdrawSelectable = false,
  selected = false,
  onToggleSelected,
}) => {
  const isDark = theme === 'dark';
  const label = item.displayName || '—';
  const initial = label.trim().charAt(0) || '?';
  const showWithdraw = Boolean(onWithdraw);
  const showAuditActions = item.status === 'pending_review' && canAuditPending;
  const showPublish = item.status === 'testing' && canPublishFromTesting;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [runningKey, setRunningKey] = useState<string | null>(null);

  const runAuditAction = async (key: string, work: () => Promise<void>, okMsg: string) => {
    setRunningKey(key);
    try {
      await work();
      showMessage?.(okMsg, 'success');
      onLifecycleMutated?.();
    } catch (err) {
      showMessage?.(err instanceof Error ? err.message : '操作失败', 'error');
    } finally {
      setRunningKey(null);
    }
  };

  const showBatchCheckbox = batchSelectMode && withdrawSelectable;

  return (
    <>
    <div
      className={`${bentoCardHover(theme)} flex flex-col gap-4 p-4 transition-shadow duration-200 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5 ${
        isDark ? 'hover:bg-violet-500/[0.03]' : 'hover:bg-violet-50/40'
      }`}
    >
      {showBatchCheckbox && (
        <input
          type="checkbox"
          className={`${lantuCheckboxPrimaryClass} mt-1 shrink-0 self-start sm:mt-2`}
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggleSelected?.()}
          aria-label={`多选撤回审核：${item.displayName}`}
        />
      )}
      <div className="flex shrink-0 items-start gap-3 sm:flex-col sm:items-center">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${pickColor(item.displayName)}`}
        >
          {item.icon && !/^https?:\/\//i.test(item.icon) && item.icon.length <= 12 ? (
            <span className="leading-none">{item.icon}</span>
          ) : (
            initial
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`truncate text-base font-bold ${textPrimary(theme)}`}>{item.displayName}</h3>
          <span className={statusBadgeClass(item.status as DomainStatus, theme)}>
            <span className={statusDot(item.status as DomainStatus)} />
            {statusLabel(item.status as DomainStatus)}
          </span>
        </div>
        <p
          className={`line-clamp-2 text-sm leading-relaxed ${textSecondary(theme)}`}
          style={{ minHeight: descriptionClampMinHeightPx(2) }}
        >
          {item.description || '暂无描述'}
        </p>
        <PublishStatusStepper theme={theme} current={item.status} />
      </div>

      <div
        className={`flex shrink-0 flex-col justify-between gap-4 border-t pt-4 sm:w-52 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 ${
          isDark ? 'border-white/[0.06]' : 'border-slate-100'
        }`}
      >
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-1">
          <div>
            <dt className={`text-xs font-medium ${textMuted(theme)}`}>{callCountLabel}</dt>
            <dd className={`mt-0.5 font-semibold tabular-nums ${textPrimary(theme)}`}>{item.callCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt className={`text-xs font-medium ${textMuted(theme)}`}>质量分</dt>
            <dd className={`mt-0.5 font-semibold tabular-nums ${textPrimary(theme)}`}>{item.qualityScore}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className={`text-xs font-medium ${textMuted(theme)}`}>创建</dt>
            <dd className={`mt-0.5 text-xs ${textSecondary(theme)}`}>{item.createTime}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className={`text-xs font-medium ${textMuted(theme)}`}>更新</dt>
            <dd className={`mt-0.5 text-xs ${textSecondary(theme)}`}>{item.updateTime}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onView} className={`${btnGhost(theme)} gap-1.5 px-3 py-2`}>
            <Eye size={16} />
            详情
          </button>
          {showAuditActions && (
            <>
              <button
                type="button"
                disabled={!!runningKey}
                onClick={() =>
                  void runAuditAction(
                    `audit-approve-${item.id}`,
                    () => resourceAuditService.approve(item.id),
                    '已通过审核，资源进入测试中',
                  )
                }
                className={mgmtTableActionPositive(theme)}
              >
                {runningKey === `audit-approve-${item.id}` ? '处理中…' : '通过审核'}
              </button>
              <button
                type="button"
                disabled={!!runningKey}
                onClick={() => {
                  setRejectReason('');
                  setRejectOpen(true);
                }}
                className={mgmtTableActionDanger}
              >
                驳回
              </button>
            </>
          )}
          {showPublish && (
            <button
              type="button"
              disabled={!!runningKey}
              onClick={() =>
                void runAuditAction(`publish-${item.id}`, () => resourceAuditService.publish(item.id), '已发布上架')
              }
              className={mgmtTableActionPositive(theme)}
            >
              {runningKey === `publish-${item.id}` ? '发布中…' : '发布上架'}
            </button>
          )}
          {showWithdraw && (
            <button type="button" onClick={onWithdraw} className={`${btnGhost(theme)} gap-1.5 px-3 py-2 text-amber-600 dark:text-amber-400`}>
              <Undo2 size={16} />
              撤回审核
            </button>
          )}
        </div>
      </div>
    </div>
    {rejectOpen && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
        onClick={() => setRejectOpen(false)}
      >
        <div className={`${bentoCard(theme)} w-full max-w-lg p-4`} onClick={(e) => e.stopPropagation()}>
          <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>
            驳回资源审核 · {item.displayName}
          </h3>
          <p className={`mt-1 text-xs leading-relaxed ${textMuted(theme)}`}>
            与「资源审核」台相同接口：<span className="font-mono">POST /audit/resources/{'{id}'}/reject</span>，id 为资源主键。
          </p>
          <AutoHeightTextarea
            minRows={3}
            maxRows={12}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm resize-none ${
              isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
            }`}
            placeholder="请输入驳回原因"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className={btnGhost(theme)} onClick={() => setRejectOpen(false)}>
              取消
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={runningKey === `audit-reject-${item.id}`}
              onClick={() => {
                if (!rejectReason.trim()) {
                  showMessage?.('驳回原因不能为空', 'warning');
                  return;
                }
                void (async () => {
                  setRunningKey(`audit-reject-${item.id}`);
                  try {
                    await resourceAuditService.reject(item.id, { reason: rejectReason.trim() });
                    showMessage?.('已驳回', 'success');
                    setRejectReason('');
                    setRejectOpen(false);
                    onLifecycleMutated?.();
                  } catch (err) {
                    showMessage?.(err instanceof Error ? err.message : '驳回失败', 'error');
                  } finally {
                    setRunningKey(null);
                  }
                })();
              }}
            >
              {runningKey === `audit-reject-${item.id}` ? '提交中…' : '确认驳回'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
