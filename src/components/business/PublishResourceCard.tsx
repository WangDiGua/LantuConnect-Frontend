import React from 'react';
import { Eye, Undo2 } from 'lucide-react';
import type { Theme } from '../../types';
import type { MyPublishItem } from '../../types/dto/user-activity';
import {
  bentoCardHover,
  btnGhost,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import type { DomainStatus } from '../../utils/uiClasses';
import { PublishStatusStepper } from './PublishStatusStepper';

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
}

export const PublishResourceCard: React.FC<Props> = ({ theme, item, onView, onWithdraw }) => {
  const isDark = theme === 'dark';
  const label = item.displayName || '—';
  const initial = label.trim().charAt(0) || '?';
  const showWithdraw = item.status === 'pending_review' && onWithdraw;

  return (
    <div
      className={`${bentoCardHover(theme)} flex flex-col gap-4 p-4 transition-shadow duration-200 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5 ${
        isDark ? 'hover:bg-violet-500/[0.03]' : 'hover:bg-violet-50/40'
      }`}
    >
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
        <p className={`line-clamp-2 text-sm leading-relaxed ${textSecondary(theme)}`}>{item.description || '暂无描述'}</p>
        <PublishStatusStepper theme={theme} current={item.status} />
      </div>

      <div
        className={`flex shrink-0 flex-col justify-between gap-4 border-t pt-4 sm:w-52 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 ${
          isDark ? 'border-white/[0.06]' : 'border-slate-100'
        }`}
      >
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-1">
          <div>
            <dt className={`text-xs font-medium ${textMuted(theme)}`}>调用次数</dt>
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
          {showWithdraw && (
            <button type="button" onClick={onWithdraw} className={`${btnGhost(theme)} gap-1.5 px-3 py-2 text-amber-600 dark:text-amber-400`}>
              <Undo2 size={16} />
              撤回审核
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
