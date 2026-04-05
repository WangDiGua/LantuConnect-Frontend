import React, { useCallback, useMemo, useState } from 'react';
import { Bell, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Theme, FontSize } from '../../types';
import {
  useAlertRules,
  useAlertRuleMetrics,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
} from '../../hooks/queries/useMonitoring';
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
import { nativeInputClass } from '../../utils/formFieldClasses';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  bentoCardHover, btnPrimary, btnSecondary, btnGhost,
  fieldErrorText, iconMuted, inputBaseError, mgmtTableActionDanger, mgmtTableActionGhost,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { TOOLBAR_ROW_LIST, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

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
  { value: 'gateway_invoke_total_1h', label: '网关调用量（1h）' },
  { value: 'gateway_invoke_errors_1h', label: '网关失败次数（1h）' },
];

const OPERATOR_OPTIONS = [
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' },
  { value: 'eq', label: '等于' },
];

const SEVERITY_OPTIONS = [
  { value: 'critical', label: '严重' },
  { value: 'warning', label: '警告' },
  { value: 'info', label: '通知' },
];

const SEV_STYLE: Record<string, { light: string; dark: string }> = {
  critical: { light: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60', dark: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20' },
  warning:  { light: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60', dark: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' },
  info:     { light: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/60', dark: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20' },
};

const SEV_LABEL: Record<string, string> = { critical: '严重', warning: '警告', info: '通知' };

const SEVERITY_FILTER_OPTIONS = [{ value: '', label: '全部级别' }, ...SEVERITY_OPTIONS];

function opSymbol(operator: string): string {
  switch (operator) {
    case 'gt': return '>';
    case 'gte': return '≥';
    case 'lt': return '<';
    case 'lte': return '≤';
    case 'eq': return '=';
    default: return operator;
  }
}

function ruleSummary(r: AlertRule) {
  const op = opSymbol(r.operator);
  const ch = (r.notifyChannels ?? []).join('、') || '—';
  return `${r.metric} ${op} ${r.threshold} → ${ch}`;
}

const PAGE_DESC = '配置告警阈值与通知渠道。记录入库时建议在 labels 中写入 resource_type（五类统一资源），以便「告警管理」按类型筛选。';
const BREADCRUMB = ['监控中心', '告警规则'] as const;

export const AlertRulesPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const rulesQ = useAlertRules();
  const metricsQ = useAlertRuleMetrics();
  const createM = useCreateAlertRule();
  const updateM = useUpdateAlertRule();
  const deleteM = useDeleteAlertRule();
  const [dryRunRule, setDryRunRule] = useState<AlertRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertRule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ruleSearch, setRuleSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const form = useForm<CreateAlertRuleFormValues>({
    resolver: zodResolver(createAlertRuleSchema),
    defaultValues: {
      name: '', metric: 'http_5xx_rate', operator: 'gte',
      threshold: 1, severity: 'warning', notifyChannels: [],
    },
  });

  const editForm = useForm<CreateAlertRuleFormValues>({
    resolver: zodResolver(createAlertRuleSchema),
    defaultValues: {
      name: '', metric: 'http_5xx_rate', operator: 'gte',
      threshold: 1, severity: 'warning', notifyChannels: [],
    },
  });

  const rules = Array.isArray(rulesQ.data) ? rulesQ.data : [];

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    return rules.filter((r) => {
      if (severityFilter && r.severity !== severityFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q)
        || r.metric.toLowerCase().includes(q)
        || ruleSummary(r).toLowerCase().includes(q)
      );
    });
  }, [rules, ruleSearch, severityFilter]);

  const metricOptionsForEdit = useMemo(() => {
    const base = [...METRIC_OPTIONS];
    if (editingRule && !base.some((o) => o.value === editingRule.metric)) {
      base.unshift({ value: editingRule.metric, label: editingRule.metric });
    }
    return base;
  }, [editingRule]);

  const onSubmit = form.handleSubmit((values) => {
    createM.mutate(
      {
        name: values.name.trim(), metric: values.metric,
        operator: values.operator, threshold: values.threshold,
        severity: values.severity, duration: '5m', notifyChannels: [...values.notifyChannels],
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

  const openEdit = useCallback(
    (r: AlertRule) => {
      setEditingRule(r);
      const op = r.operator;
      const safeOp: CreateAlertRuleFormValues['operator'] = op === 'gt' || op === 'lt' || op === 'eq' ? op : 'gt';
      const ch = r.notifyChannels?.length ? r.notifyChannels : r.channels ?? [];
      editForm.reset({
        name: r.name,
        metric: r.metric || 'http_5xx_rate',
        operator: safeOp,
        threshold: r.threshold,
        severity: r.severity,
        notifyChannels: [...ch],
      });
    },
    [editForm],
  );

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editingRule) return;
    updateM.mutate(
      {
        id: editingRule.id,
        data: {
          name: values.name.trim(),
          metric: values.metric,
          operator: values.operator,
          threshold: values.threshold,
          severity: values.severity,
          duration: '5m',
          notifyChannels: [...values.notifyChannels],
        },
      },
      {
        onSuccess: () => {
          setEditingRule(null);
          editForm.reset();
          showMessage('规则已更新', 'success');
        },
        onError: (e) => {
          showMessage(e instanceof ApiException ? e.message : '更新失败', 'error');
        },
      },
    );
  });

  const toolbar = rules.length > 0 ? (
    <div className={`${TOOLBAR_ROW_LIST} flex-col sm:flex-row justify-between min-w-0 gap-3 w-full sm:items-center`}>
      <div className={`${TOOLBAR_ROW_LIST} min-w-0 flex-1`}>
        <div className="relative min-w-[8rem] shrink-0 sm:max-w-[14rem]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} size={16} aria-hidden />
          <input
            type="search"
            value={ruleSearch}
            onChange={(e) => setRuleSearch(e.target.value)}
            placeholder="搜索规则名、指标…"
            className={toolbarSearchInputClass(theme)}
            aria-label="搜索告警规则"
          />
        </div>
        <LantuSelect
          theme={theme}
          value={severityFilter}
          onChange={setSeverityFilter}
          options={SEVERITY_FILTER_OPTIONS}
          placeholder="级别"
          className="!w-36 shrink-0"
          triggerClassName="w-full !min-w-0"
        />
      </div>
      <button type="button" onClick={() => { form.reset(); setShowCreateModal(true); }} className={`${btnPrimary} shrink-0 w-full sm:w-auto`} aria-label="添加告警规则">
        <Plus size={15} aria-hidden />
        添加规则
      </button>
    </div>
  ) : (
    <div className="flex justify-end w-full">
      <button type="button" onClick={() => { form.reset(); setShowCreateModal(true); }} className={btnPrimary} aria-label="添加告警规则">
        <Plus size={15} aria-hidden />
        添加规则
      </button>
    </div>
  );

  const listBlock = rules.length === 0 ? (
    <BentoCard theme={theme}>
      <EmptyState title="暂无告警规则" description="创建规则后，将按阈值与渠道进行通知。" />
    </BentoCard>
  ) : filteredRules.length === 0 ? (
    <BentoCard theme={theme}>
      <EmptyState title="无匹配规则" description="请调整关键词或级别筛选。" />
    </BentoCard>
  ) : (
    <AnimatedList className="space-y-2">
      {filteredRules.map((r) => {
        const sev = SEV_STYLE[r.severity] ?? SEV_STYLE.info;
        return (
          <motion.div
            key={r.id}
            className={`${bentoCardHover(theme)} p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold ${textPrimary(theme)}`}>{r.name}</span>
                <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isDark ? sev.dark : sev.light}`}>
                  {SEV_LABEL[r.severity] ?? r.severity}
                </span>
                <span className={`inline-flex shrink-0 items-center whitespace-nowrap text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                  {r.enabled ? '已启用' : '已停用'}
                </span>
              </div>
              <div className={`text-xs mt-0.5 ${textMuted(theme)}`}>{ruleSummary(r)}</div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              <button type="button" onClick={() => openEdit(r)} className={mgmtTableActionGhost(theme)}>
                编辑
              </button>
              <button type="button" onClick={() => setDeleteTarget(r)} className={mgmtTableActionDanger}>
                删除
              </button>
              <button type="button" onClick={() => setDryRunRule(r)} className={btnGhost(theme)}>
                试跑
              </button>
            </div>
          </motion.div>
        );
      })}
    </AnimatedList>
  );

  const shellBody = rulesQ.isLoading ? (
    <PageSkeleton type="form" />
  ) : rulesQ.isError ? (
    <PageError error={rulesQ.error as Error} onRetry={() => rulesQ.refetch()} />
  ) : (
    <div className="space-y-4">{listBlock}</div>
  );

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={Bell}
        breadcrumbSegments={BREADCRUMB}
        description={PAGE_DESC}
        toolbar={!rulesQ.isLoading && !rulesQ.isError ? toolbar : undefined}
        contentScroll="document"
      >
        <div className="px-4 sm:px-6 pb-8">{shellBody}</div>
      </MgmtPageShell>

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
            <input
              className={`${nativeInputClass(theme)}${form.formState.errors.name ? ` ${inputBaseError()}` : ''}`}
              placeholder="规则名称"
              aria-invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
            {form.formState.errors.name?.message ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {String(form.formState.errors.name.message)}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>指标</label>
              <Controller
                name="metric"
                control={form.control}
                render={({ field }) => (
                  <LantuSelect theme={theme} value={field.value} onChange={field.onChange} options={METRIC_OPTIONS} />
                )}
              />
              {form.formState.errors.metric?.message ? (
                <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                  {String(form.formState.errors.metric.message)}
                </p>
              ) : null}
            </div>
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>运算符</label>
              <Controller
                name="operator"
                control={form.control}
                render={({ field }) => (
                  <LantuSelect theme={theme} value={field.value} onChange={field.onChange} options={OPERATOR_OPTIONS} />
                )}
              />
              {form.formState.errors.operator?.message ? (
                <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                  {String(form.formState.errors.operator.message)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>阈值</label>
              <input
                type="number"
                step="any"
                className={`${nativeInputClass(theme)}${form.formState.errors.threshold ? ` ${inputBaseError()}` : ''}`}
                aria-invalid={!!form.formState.errors.threshold}
                {...form.register('threshold', { valueAsNumber: true })}
              />
              {form.formState.errors.threshold?.message ? (
                <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                  {String(form.formState.errors.threshold.message)}
                </p>
              ) : null}
            </div>
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>级别</label>
              <Controller
                name="severity"
                control={form.control}
                render={({ field }) => (
                  <LantuSelect theme={theme} value={field.value} onChange={field.onChange} options={SEVERITY_OPTIONS} />
                )}
              />
              {form.formState.errors.severity?.message ? (
                <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                  {String(form.formState.errors.severity.message)}
                </p>
              ) : null}
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
                          className="toggle toggle-primary toggle-sm"
                        />
                        <span className={textSecondary(theme)}>{c.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {form.formState.errors.notifyChannels?.message ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {String(form.formState.errors.notifyChannels.message)}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editingRule}
        onClose={() => { setEditingRule(null); editForm.reset(); }}
        title="编辑告警规则"
        theme={theme}
        size="md"
        footer={
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => { setEditingRule(null); editForm.reset(); }}>取消</button>
            <button type="button" className={btnPrimary} onClick={onEditSubmit} disabled={updateM.isPending}>
              {updateM.isPending ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        <form onSubmit={onEditSubmit} className="space-y-4">
          <div>
            <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>规则名称</label>
            <input
              className={`${nativeInputClass(theme)}${editForm.formState.errors.name ? ` ${inputBaseError()}` : ''}`}
              placeholder="规则名称"
              aria-invalid={!!editForm.formState.errors.name}
              {...editForm.register('name')}
            />
            {editForm.formState.errors.name?.message ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {String(editForm.formState.errors.name.message)}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>指标</label>
              <Controller
                name="metric"
                control={editForm.control}
                render={({ field }) => (
                  <LantuSelect theme={theme} value={field.value} onChange={field.onChange} options={metricOptionsForEdit} />
                )}
              />
              {editForm.formState.errors.metric?.message ? (
                <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                  {String(editForm.formState.errors.metric.message)}
                </p>
              ) : null}
            </div>
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>运算符</label>
              <Controller
                name="operator"
                control={editForm.control}
                render={({ field }) => (
                  <LantuSelect theme={theme} value={field.value} onChange={field.onChange} options={OPERATOR_OPTIONS} />
                )}
              />
              {editForm.formState.errors.operator?.message ? (
                <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                  {String(editForm.formState.errors.operator.message)}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>阈值</label>
              <input
                type="number"
                step="any"
                className={`${nativeInputClass(theme)}${editForm.formState.errors.threshold ? ` ${inputBaseError()}` : ''}`}
                aria-invalid={!!editForm.formState.errors.threshold}
                {...editForm.register('threshold', { valueAsNumber: true })}
              />
              {editForm.formState.errors.threshold?.message ? (
                <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                  {String(editForm.formState.errors.threshold.message)}
                </p>
              ) : null}
            </div>
            <div>
              <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>级别</label>
              <Controller
                name="severity"
                control={editForm.control}
                render={({ field }) => (
                  <LantuSelect theme={theme} value={field.value} onChange={field.onChange} options={SEVERITY_OPTIONS} />
                )}
              />
              {editForm.formState.errors.severity?.message ? (
                <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                  {String(editForm.formState.errors.severity.message)}
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <label className={`text-xs font-semibold block mb-1 ${textSecondary(theme)}`}>通知渠道</label>
            <Controller
              name="notifyChannels"
              control={editForm.control}
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
                          className="toggle toggle-primary toggle-sm"
                        />
                        <span className={textSecondary(theme)}>{c.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {editForm.formState.errors.notifyChannels?.message ? (
              <p className={`mt-1 ${fieldErrorText()}`} role="alert">
                {String(editForm.formState.errors.notifyChannels.message)}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除告警规则"
        message={deleteTarget ? `确定删除规则「${deleteTarget.name}」？此操作不可撤销。` : ''}
        variant="danger"
        confirmText="删除"
        loading={deleteM.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteM.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(null);
              showMessage('规则已删除', 'success');
            },
            onError: (e) => {
              showMessage(e instanceof ApiException ? e.message : '删除失败', 'error');
            },
          });
        }}
      />

      <ConfirmDialog
        open={!!dryRunRule}
        title="试跑告警规则"
        message={dryRunRule ? `将对「${dryRunRule.name}」执行一次策略评估（不会真实告警）。` : ''}
        variant="info"
        confirmText="开始试跑"
        loading={false}
        onCancel={() => setDryRunRule(null)}
        onConfirm={async () => {
          if (!dryRunRule) return;
          try {
            const { monitoringService } = await import('../../api/services/monitoring.service');
            const result = await monitoringService.dryRunAlertRule(dryRunRule.id, {
              sampleValue: Number(dryRunRule.threshold ?? 0),
            });
            showMessage(result.wouldFire ? `试跑结果：会触发（${result.detail}）` : `试跑结果：不触发（${result.detail}）`, result.wouldFire ? 'info' : 'success');
          } catch (err) {
            showMessage(err instanceof Error ? err.message : '试跑失败', 'error');
          } finally {
            setDryRunRule(null);
          }
        }}
      />
    </>
  );
};
