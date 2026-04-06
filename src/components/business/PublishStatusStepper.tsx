import React from 'react';
import type { Theme } from '../../types';
import type { AgentStatus } from '../../types/dto/agent';
import { textMuted, textSecondary } from '../../utils/uiClasses';

const DEFAULT_FLOW: AgentStatus[] = ['draft', 'pending_review', 'testing', 'published'];

const STEP_LABEL: Record<AgentStatus, string> = {
  draft: '草稿',
  pending_review: '待审核',
  testing: '测试中',
  published: '已发布',
  rejected: '已驳回',
  deprecated: '已暂停对外',
};

interface Props {
  theme: Theme;
  current: AgentStatus | string;
  flow?: AgentStatus[];
}

export const PublishStatusStepper: React.FC<Props> = ({ theme, current, flow = DEFAULT_FLOW }) => {
  const isDark = theme === 'dark';
  const st = current as AgentStatus;

  if (st === 'rejected' || st === 'deprecated') {
    const isRej = st === 'rejected';
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-xs font-semibold ${
            isRej
              ? isDark
                ? 'text-rose-400'
                : 'text-rose-600'
              : isDark
                ? 'text-slate-400'
                : 'text-slate-500'
          }`}
        >
          {STEP_LABEL[st]}
        </span>
        <span className={`text-xs ${textMuted(theme)}`}>
          {isRej ? '未通过审核，可修改后重新提交' : '该资源已暂停对外开放'}
        </span>
      </div>
    );
  }

  const currentIdx = flow.indexOf(st);
  const activeIdx = currentIdx >= 0 ? currentIdx : 0;

  const lineLeftDone = (i: number) => i > 0 && activeIdx >= i;
  const lineRightDone = (i: number) => i < flow.length - 1 && activeIdx > i;
  const lineRightActive = (i: number) => i < flow.length - 1 && activeIdx === i;

  const lineDoneCls = isDark ? 'bg-emerald-500/45' : 'bg-emerald-400';
  const lineIdleCls = isDark ? 'bg-slate-700' : 'bg-slate-200';
  const lineActiveCls = isDark
    ? 'bg-gradient-to-r from-neutral-500/55 to-slate-600'
    : 'bg-gradient-to-r from-neutral-600 to-slate-200';

  return (
    <div className="w-full" role="list" aria-label="发布进度">
      <div className="flex w-full items-start">
        {flow.map((step, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;

          const dotCls = done
            ? isDark
              ? 'bg-emerald-400 ring-2 ring-emerald-400/30'
              : 'bg-emerald-500 ring-2 ring-emerald-500/25'
            : active
              ? isDark
                ? 'bg-neutral-300 ring-2 ring-neutral-400/35'
                : 'bg-neutral-900 ring-2 ring-neutral-900/25'
              : isDark
                ? 'bg-slate-600 ring-1 ring-white/10'
                : 'bg-slate-200 ring-1 ring-slate-300/80';

          const labelCls = done
            ? isDark
              ? 'text-emerald-400 font-medium'
              : 'text-emerald-700 font-medium'
            : active
              ? isDark
                ? 'text-neutral-300 font-semibold'
                : 'text-neutral-800 font-semibold'
              : textSecondary(theme);

          return (
            <div key={step} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`mx-0.5 h-0.5 min-w-[6px] flex-1 rounded-full ${lineLeftDone(i) ? lineDoneCls : lineIdleCls}`}
                    aria-hidden
                  />
                )}
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${dotCls}`}
                  aria-current={active ? 'step' : undefined}
                />
                {i < flow.length - 1 && (
                  <div
                    className={`mx-0.5 h-0.5 min-w-[6px] flex-1 rounded-full ${
                      lineRightDone(i) ? lineDoneCls : lineRightActive(i) ? lineActiveCls : lineIdleCls
                    }`}
                    aria-hidden
                  />
                )}
              </div>
              <span className={`mt-2 max-w-[5.5rem] text-center text-xs leading-tight sm:max-w-none ${labelCls}`}>
                {STEP_LABEL[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
