import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { useAlertRules, useCreateAlertRule } from '../../hooks/queries/useMonitoring';
import { createAlertRuleSchema, type CreateAlertRuleFormValues } from '../../schemas/monitoring.schema';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ApiException } from '../../types/api';
import type { AlertRule } from '../../types/dto/monitoring';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const CHANNEL_OPTIONS = [
  { id: 'ding', label: '钉钉' },
  { id: 'email', label: '邮件' },
  { id: 'webhook', label: 'Webhook' },
] as const;

const METRIC_OPTIONS = [
  { value: 'http_5xx_rate', label: '5xx 比例' },
  { value: 'latency_p99', label: 'P99 延迟' },
  { value: 'error_rate', label: '错误率' },
];

function ruleSummary(r: AlertRule) {
  const op = r.operator === 'gt' ? '>' : r.operator === 'lt' ? '<' : '=';
  const sev =
    r.severity === 'critical' ? '严重' : r.severity === 'warning' ? '警告' : '通知';
  const ch = (r.notifyChannels ?? []).join('、') || '—';
  return `${r.metric} ${op} ${r.threshold} · ${sev} → ${ch}`;
}

export const AlertRulesPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const rulesQ = useAlertRules();
  const createM = useCreateAlertRule();
  const [dryRunRule, setDryRunRule] = useState<AlertRule | null>(null);

  const form = useForm<CreateAlertRuleFormValues>({
    resolver: zodResolver(createAlertRuleSchema),
    defaultValues: {
      name: '',
      metric: 'http_5xx_rate',
      operator: 'gt',
      threshold: 1,
      severity: 'warning',
      notifyChannels: [],
    },
  });

  if (rulesQ.isLoading) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Bell} breadcrumbSegments={['监控中心', '告警规则']}>
        <PageSkeleton type="form" />
      </MgmtPageShell>
    );
  }

  if (rulesQ.isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Bell} breadcrumbSegments={['监控中心', '告警规则']}>
        <PageError error={rulesQ.error as Error} onRetry={() => rulesQ.refetch()} />
      </MgmtPageShell>
    );
  }

  const rules = rulesQ.data ?? [];

  const onSubmit = form.handleSubmit((values) => {
    createM.mutate(
      {
        name: values.name.trim(),
        metric: values.metric,
        operator: values.operator,
        threshold: values.threshold,
        severity: values.severity,
        notifyChannels: [...values.notifyChannels],
      },
      {
        onSuccess: () => {
          form.reset({
            name: '',
            metric: values.metric,
            operator: values.operator,
            threshold: values.threshold,
            severity: values.severity,
            notifyChannels: [],
          });
          showMessage('规则已创建', 'success');
        },
        onError: (e) => {
          const msg = e instanceof ApiException ? e.message : '创建失败';
          showMessage(msg, 'error');
        },
      }
    );
  });

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Bell} breadcrumbSegments={['监控中心', '告警规则']}>
      <div className="p-4 sm:p-6 space-y-4">
        <form onSubmit={onSubmit} className={`space-y-3 max-w-2xl ${isDark ? '' : ''}`}>
          <div className="flex flex-wrap gap-2">
            <input
              className={`flex-1 min-w-[140px] rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/30 ${
                isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-200 bg-white'
              }`}
              placeholder="规则名称"
              {...form.register('name')}
            />
            <select
              className={`rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/30 ${
                isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-200 bg-white'
              }`}
              {...form.register('metric')}
            >
              {METRIC_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              className={`rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/30 ${
                isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-200 bg-white'
              }`}
              {...form.register('operator')}
            >
              <option value="gt">大于</option>
              <option value="lt">小于</option>
              <option value="eq">等于</option>
            </select>
            <input
              type="number"
              step="any"
              className={`w-28 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/30 ${
                isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-200 bg-white'
              }`}
              {...form.register('threshold', { valueAsNumber: true })}
            />
            <select
              className={`rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/30 ${
                isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-200 bg-white'
              }`}
              {...form.register('severity')}
            >
              <option value="critical">严重</option>
              <option value="warning">警告</option>
              <option value="info">通知</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>通知渠道</span>
            <Controller
              name="notifyChannels"
              control={form.control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  {CHANNEL_OPTIONS.map((c) => {
                    const checked = field.value.includes(c.id);
                    return (
                      <label key={c.id} className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked ? field.value.filter((x) => x !== c.id) : [...field.value, c.id];
                            field.onChange(next);
                          }}
                          className="rounded border-slate-300"
                        />
                        <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{c.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </div>
          {(form.formState.errors.name?.message ||
            form.formState.errors.metric?.message ||
            form.formState.errors.threshold?.message ||
            form.formState.errors.notifyChannels?.message) && (
            <p className="text-xs text-red-500">
              {form.formState.errors.name?.message ||
                form.formState.errors.metric?.message ||
                form.formState.errors.threshold?.message ||
                (form.formState.errors.notifyChannels?.message as string | undefined)}
            </p>
          )}
          <button
            type="submit"
            disabled={createM.isPending}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
          >
            {createM.isPending ? '提交中…' : '添加'}
          </button>
        </form>

        {rules.length === 0 ? (
          <EmptyState title="暂无告警规则" description="创建规则后，将按阈值与渠道进行通知。" />
        ) : (
          <div
            className={`rounded-2xl border divide-y shadow-none ${isDark ? 'border-white/10 divide-white/10' : 'border-slate-200/80 divide-slate-100'}`}
          >
            {rules.map((r) => (
              <div key={r.id} className="p-4 flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{ruleSummary(r)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{r.enabled ? '已启用' : '已停用'}</div>
                </div>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-sm ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-slate-100 hover:bg-slate-200'}`}
                  onClick={() => setDryRunRule(r)}
                >
                  试跑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!dryRunRule}
        title="试跑告警规则"
        message={dryRunRule ? `将对「${dryRunRule.name}」执行一次策略评估（不会真实告警）。` : ''}
        variant="info"
        confirmText="开始试跑"
        loading={false}
        onCancel={() => setDryRunRule(null)}
        onConfirm={() => {
          showMessage('试跑任务已提交', 'info');
          setDryRunRule(null);
        }}
      />
    </MgmtPageShell>
  );
};
