import React, { useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Theme, FontSize } from '../../types';
import { useAlertRules, useCreateAlertRule } from '../../hooks/queries/useMonitoring';
import { createAlertRuleSchema, type CreateAlertRuleFormValues } from '../../schemas/monitoring.schema';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { BentoCard } from '../../components/common/BentoCard';
import { AnimatedList } from '../../components/common/AnimatedList';
import { ApiException } from '../../types/api';
import type { AlertRule } from '../../types/dto/monitoring';
import { nativeInputClass, nativeSelectClass } from '../../utils/formFieldClasses';
import {
  pageBg, bentoCardHover, btnPrimary, btnSecondary, btnGhost,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

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

const SEV_STYLE: Record<string, { light: string; dark: string }> = {
  critical: { light: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60', dark: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20' },
  warning:  { light: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60', dark: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' },
  info:     { light: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60', dark: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20' },
};

const SEV_LABEL: Record<string, string> = { critical: '严重', warning: '警告', info: '通知' };

function ruleSummary(r: AlertRule) {
  const op = r.operator === 'gt' ? '>' : r.operator === 'lt' ? '<' : '=';
  const ch = (r.notifyChannels ?? []).join('、') || '—';
  return `${r.metric} ${op} ${r.threshold} → ${ch}`;
}

export const AlertRulesPage: React.FC<Props> = ({ theme, showMessage }) => {
  const isDark = theme === 'dark';
  const rulesQ = useAlertRules();
  const createM = useCreateAlertRule();
  const [dryRunRule, setDryRunRule] = useState<AlertRule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const form = useForm<CreateAlertRuleFormValues>({
    resolver: zodResolver(createAlertRuleSchema),
    defaultValues: {
      name: '', metric: 'http_5xx_rate', operator: 'gt',
      threshold: 1, severity: 'warning', notifyChannels: [],
    },
  });

  if (rulesQ.isLoading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <div className="p-4"><PageSkeleton type="form" /></div>
      </div>
    );
  }

  if (rulesQ.isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <PageError error={rulesQ.error as Error} onRetry={() => rulesQ.refetch()} />
      </div>
    );
  }

  const rules = rulesQ.data ?? [];

  const onSubmit = form.handleSubmit((values) => {
    createM.mutate(
      {
        name: values.name.trim(), metric: values.metric,
        operator: values.operator, threshold: values.threshold,
        severity: values.severity, notifyChannels: [...values.notifyChannels],
      },
      {
        onSuccess: () => {
          form.reset();
          setShowCreateModal(false);
          showMessage('规则已创建', 'success');
        },
        onError: (e) => {
          showMessage(e instanceof ApiException ? e.message : '创建失败', 'error');
        },
      }
    );
  });

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
              <Bell size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>告警规则</h1>
              <p className={`text-xs ${textMuted(theme)}`}>配置告警阈值与通知渠道</p>
            </div>
          </div>
          <button type="button" onClick={() => { form.reset(); setShowCreateModal(true); }} className={btnPrimary}>
            <Plus size={15} />
            添加规则
          </button>
        </div>

        {/* Rules list */}
        {rules.length === 0 ? (
          <BentoCard theme={theme}>
            <EmptyState title="暂无告警规则" description="创建规则后，将按阈值与渠道进行通知。" />
          </BentoCard>
        ) : (
          <AnimatedList className="space-y-2">
            {rules.map((r) => {
              const sev = SEV_STYLE[r.severity] ?? SEV_STYLE.info;
              return (
                <motion.div
                  key={r.id}
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={`${bentoCardHover(theme)} p-4 flex items-center gap-4`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${textPrimary(theme)}`}>{r.name}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isDark ? sev.dark : sev.light}`}>
                        {SEV_LABEL[r.severity] ?? r.severity}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                        {r.enabled ? '已启用' : '已停用'}
                      </span>
                    </div>
                    <div className={`text-xs mt-0.5 ${textMuted(theme)}`}>{ruleSummary(r)}</div>
                  </div>
                  <button type="button" onClick={() => setDryRunRule(r)} className={btnGhost(theme)}>
                    试跑
                  </button>
                </motion.div>
              );
            })}
          </AnimatedList>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="添加告警规则"
        theme={theme}
        size="md"
        footer={
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setShowCreateModal(false)}>取消</button>
            <button type="button" className={btnPrimary} onClick={onSubmit} disabled={createM.isPending}>
              {createM.isPending ? '提交中…' : '添加'}
            </button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>规则名称</label>
            <input className={nativeInputClass(theme)} placeholder="规则名称" {...form.register('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>指标</label>
              <select className={nativeSelectClass(theme)} {...form.register('metric')}>
                {METRIC_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>运算符</label>
              <select className={nativeSelectClass(theme)} {...form.register('operator')}>
                <option value="gt">大于</option>
                <option value="lt">小于</option>
                <option value="eq">等于</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>阈值</label>
              <input type="number" step="any" className={nativeInputClass(theme)} {...form.register('threshold', { valueAsNumber: true })} />
            </div>
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>级别</label>
              <select className={nativeSelectClass(theme)} {...form.register('severity')}>
                <option value="critical">严重</option>
                <option value="warning">警告</option>
                <option value="info">通知</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>通知渠道</label>
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
                          onChange={() => field.onChange(checked ? field.value.filter((x) => x !== c.id) : [...field.value, c.id])}
                          className="rounded border-slate-300"
                        />
                        <span className={textSecondary(theme)}>{c.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </div>
          {(form.formState.errors.name?.message || form.formState.errors.threshold?.message || form.formState.errors.notifyChannels?.message) && (
            <p className="text-xs text-rose-500">
              {form.formState.errors.name?.message || form.formState.errors.threshold?.message || (form.formState.errors.notifyChannels?.message as string | undefined)}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!dryRunRule}
        title="试跑告警规则"
        message={dryRunRule ? `将对「${dryRunRule.name}」执行一次策略评估（不会真实告警）。` : ''}
        variant="info"
        confirmText="开始试跑"
        loading={false}
        onCancel={() => setDryRunRule(null)}
        onConfirm={() => { showMessage('试跑任务已提交', 'info'); setDryRunRule(null); }}
      />
    </div>
  );
};
