import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  BellRing,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  UserRoundCheck,
} from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { userMgmtService } from '../../api/services/user-mgmt.service';
import { monitoringService } from '../../api/services/monitoring.service';
import {
  useAckAlert,
  useAlertDetail,
  useAlertRuleMetrics,
  useAlertRuleScopeOptions,
  useAlertRulesPage,
  useAlerts,
  useAlertSummary,
  useAssignAlert,
  useBatchAlertAction,
  useCreateAlertRule,
  useDeleteAlertRule,
  useReopenAlert,
  useResolveAlert,
  useSilenceAlert,
  useUpdateAlertRule,
} from '../../hooks/queries/useMonitoring';
import type {
  AlertBatchActionRequest,
  AlertEventDetail,
  AlertRecord,
  AlertRule,
  AlertRuleMetricOption,
  CreateAlertRulePayload,
} from '../../types/dto/monitoring';
import type { UserRecord } from '../../types/dto/user-mgmt';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { Pagination, SearchInput, FilterSelect, Modal, ConfirmDialog } from '../../components/common';
import { BentoCard } from '../../components/common/BentoCard';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { formatDateTime } from '../../utils/formatDateTime';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  bentoCard,
  btnGhost,
  btnPrimary,
  btnSecondary,
  btnDanger,
  fieldErrorText,
  inputBaseError,
  kpiGridGap,
  pageBlockStack,
  tableBodyRow,
  tableCell,
  tableHeadCell,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { resourceTypeLabel } from '../../constants/resourceTypes';

type TabKey = 'events' | 'rules';
type EventActionKind = 'ack' | 'assign' | 'silence' | 'resolve' | 'reopen' | 'batch';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface RuleDraft {
  id?: string;
  name: string;
  description: string;
  metric: string;
  operator: AlertRule['operator'];
  threshold: string;
  duration: string;
  severity: AlertRule['severity'];
  enabled: boolean;
  scopeType: AlertRule['scopeType'];
  scopeResourceType: string;
  scopeResourceId: string;
  labelFiltersText: string;
}

interface ActionModalState {
  type: EventActionKind;
  ids: string[];
  record?: AlertRecord;
}

const EVENT_PAGE_SIZE = 10;
const RULE_PAGE_SIZE = 10;

const STATUS_STYLE: Record<string, string> = {
  firing: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70',
  reopened: 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200/70',
  acknowledged: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/70',
  silenced: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/70',
  resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70',
};

const STATUS_LABEL: Record<string, string> = {
  firing: '进行中',
  reopened: '已重开',
  acknowledged: '已认领',
  silenced: '已静默',
  resolved: '已恢复',
};

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70',
  info: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/70',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: '严重',
  warning: '告警',
  info: '通知',
};

const TAB_BUTTON = (active: boolean, theme: Theme) =>
  `${btnGhost(theme)} rounded-2xl px-4 py-2.5 ${active ? 'bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white' : ''}`;

const BREADCRUMB = ['监控运维', '告警中心'] as const;
const DESCRIPTION = '统一承载告警事件、规则策略与站内通知联动。主区只保留决策信息，详情、处置与试跑都通过弹窗查看。';

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '--';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours}h ${restMinutes}m` : `${hours}h`;
}

function emptyRuleDraft(metrics: AlertRuleMetricOption[]): RuleDraft {
  return {
    name: '',
    description: '',
    metric: metrics[0]?.value ?? 'error_rate',
    operator: 'gte',
    threshold: '1',
    duration: '5m',
    severity: 'warning',
    enabled: true,
    scopeType: 'global',
    scopeResourceType: 'agent',
    scopeResourceId: '',
    labelFiltersText: '',
  };
}

function draftFromRule(rule: AlertRule): RuleDraft {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description ?? '',
    metric: rule.metric,
    operator: rule.operator,
    threshold: String(rule.threshold),
    duration: rule.duration || '5m',
    severity: rule.severity,
    enabled: rule.enabled,
    scopeType: rule.scopeType,
    scopeResourceType: rule.scopeResourceType ?? 'agent',
    scopeResourceId: rule.scopeResourceId == null ? '' : String(rule.scopeResourceId),
    labelFiltersText: Object.entries(rule.labelFilters ?? {})
      .map(([key, value]) => `${key}=${value}`)
      .join('\n'),
  };
}

function parseLabelFilters(text: string): Record<string, string> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const separator = line.includes('=') ? '=' : ':';
      const [rawKey, ...rest] = line.split(separator);
      const key = rawKey?.trim();
      const value = rest.join(separator).trim();
      if (key && value) acc[key] = value;
      return acc;
    }, {});
}

function buildRulePayload(draft: RuleDraft): CreateAlertRulePayload {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    metric: draft.metric,
    operator: draft.operator,
    threshold: Number(draft.threshold),
    duration: draft.duration.trim() || '5m',
    severity: draft.severity,
    enabled: draft.enabled,
    scopeType: draft.scopeType,
    scopeResourceType: draft.scopeType === 'global' ? undefined : draft.scopeResourceType,
    scopeResourceId: draft.scopeType === 'resource' && draft.scopeResourceId ? Number(draft.scopeResourceId) : undefined,
    labelFilters: parseLabelFilters(draft.labelFiltersText),
  };
}

function validateRuleDraft(draft: RuleDraft): string | null {
  if (!draft.name.trim()) return '规则名称不能为空';
  if (!draft.metric.trim()) return '请选择指标';
  if (Number.isNaN(Number(draft.threshold))) return '阈值必须是有效数字';
  if (draft.scopeType !== 'global' && !draft.scopeResourceType) return '请选择作用资源类型';
  if (draft.scopeType === 'resource' && !draft.scopeResourceId) return '请选择单资源作用域';
  return null;
}

function alertActionLabel(type: EventActionKind): string {
  switch (type) {
    case 'ack':
      return '认领事件';
    case 'assign':
      return '分配责任人';
    case 'silence':
      return '静默事件';
    case 'resolve':
      return '手动恢复';
    case 'reopen':
      return '重新打开';
    case 'batch':
      return '批量处置';
    default:
      return '处置';
  }
}

export const AlertCenterPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const [tab, setTab] = useState<TabKey>('events');
  const [eventPage, setEventPage] = useState(1);
  const [rulePage, setRulePage] = useState(1);
  const [eventSearch, setEventSearch] = useState('');
  const [ruleSearch, setRuleSearch] = useState('');
  const [eventFilters, setEventFilters] = useState({
    severity: 'all',
    status: 'all',
    resourceType: 'all',
    scopeType: 'all',
    onlyMine: false,
  });
  const [ruleFilters, setRuleFilters] = useState({
    severity: 'all',
    scopeType: 'all',
    resourceType: 'all',
    enabled: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft | null>(null);
  const [ruleError, setRuleError] = useState('');
  const [dryRunTarget, setDryRunTarget] = useState<AlertRule | null>(null);
  const [dryRunResult, setDryRunResult] = useState<Awaited<ReturnType<typeof monitoringService.dryRunAlertRule>> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertRule | null>(null);

  const summaryQ = useAlertSummary();
  const eventsQ = useAlerts({
    page: eventPage,
    pageSize: EVENT_PAGE_SIZE,
    keyword: eventSearch.trim() || undefined,
    severity: eventFilters.severity !== 'all' ? eventFilters.severity : undefined,
    alertStatus: eventFilters.status !== 'all' ? eventFilters.status : undefined,
    resourceType: eventFilters.resourceType !== 'all' ? eventFilters.resourceType : undefined,
    scopeType: eventFilters.scopeType !== 'all' ? eventFilters.scopeType : undefined,
    onlyMine: eventFilters.onlyMine || undefined,
  });
  const detailQ = useAlertDetail(detailId ?? undefined);
  const rulesQ = useAlertRulesPage({
    page: rulePage,
    pageSize: RULE_PAGE_SIZE,
    keyword: ruleSearch.trim() || undefined,
    severity: ruleFilters.severity !== 'all' ? ruleFilters.severity : undefined,
    scopeType: ruleFilters.scopeType !== 'all' ? ruleFilters.scopeType : undefined,
    resourceType: ruleFilters.resourceType !== 'all' ? ruleFilters.resourceType : undefined,
    enabled: ruleFilters.enabled === 'all' ? undefined : ruleFilters.enabled === 'enabled',
  });
  const metricsQ = useAlertRuleMetrics();
  const scopeOptionsQ = useAlertRuleScopeOptions();
  const usersQ = useQuery({
    queryKey: ['alert-center', 'assignees'],
    queryFn: async () => {
      const page = await userMgmtService.listUsers({ page: 1, pageSize: 100, status: 'active' });
      return page.list;
    },
    staleTime: 5 * 60_000,
  });

  const createRuleM = useCreateAlertRule();
  const updateRuleM = useUpdateAlertRule();
  const deleteRuleM = useDeleteAlertRule();
  const ackM = useAckAlert();
  const assignM = useAssignAlert();
  const silenceM = useSilenceAlert();
  const resolveM = useResolveAlert();
  const reopenM = useReopenAlert();
  const batchM = useBatchAlertAction();

  const summary = summaryQ.data;
  const events = eventsQ.data?.list ?? [];
  const rules = rulesQ.data?.list ?? [];
  const users = usersQ.data ?? [];
  const metrics = metricsQ.data ?? [];
  const resourceOptions = scopeOptionsQ.data?.resources ?? [];

  useEffect(() => {
    setSelectedIds([]);
  }, [eventPage, eventSearch, eventFilters]);

  useEffect(() => {
    if (!ruleModalOpen || ruleDraft) return;
    setRuleDraft(emptyRuleDraft(metrics));
  }, [ruleModalOpen, ruleDraft, metrics]);

  const filteredResourceOptions = useMemo(
    () => resourceOptions.filter((item) => item.resourceType === (ruleDraft?.scopeResourceType ?? 'agent')),
    [resourceOptions, ruleDraft?.scopeResourceType],
  );

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={TAB_BUTTON(tab === 'events', theme)} onClick={() => setTab('events')}>
          <BellRing size={16} aria-hidden />
          告警事件
        </button>
        <button type="button" className={TAB_BUTTON(tab === 'rules', theme)} onClick={() => setTab('rules')}>
          <SlidersHorizontal size={16} aria-hidden />
          规则策略
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnGhost(theme)}
          onClick={() => {
            void summaryQ.refetch();
            void eventsQ.refetch();
            void rulesQ.refetch();
          }}
        >
          <RefreshCw size={15} aria-hidden />
          刷新
        </button>
        {tab === 'rules' ? (
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setRuleDraft(emptyRuleDraft(metrics));
              setRuleError('');
              setRuleModalOpen(true);
            }}
          >
            <Plus size={15} aria-hidden />
            新建规则
          </button>
        ) : null}
      </div>
    </div>
  );

  const summaryCards = (
    <div className={`grid grid-cols-2 xl:grid-cols-6 ${kpiGridGap}`}>
      {[
        { label: '进行中', value: summary?.firing ?? 0, icon: ShieldAlert },
        { label: '已认领', value: summary?.acknowledged ?? 0, icon: UserRoundCheck },
        { label: '已静默', value: summary?.silenced ?? 0, icon: Bell },
        { label: '今日恢复', value: summary?.resolvedToday ?? 0, icon: ClipboardList },
        { label: '我负责的事件', value: summary?.mine ?? 0, icon: UserRoundCheck },
        { label: '启用规则', value: summary?.enabledRules ?? 0, icon: SlidersHorizontal },
      ].map((item) => (
        <BentoCard key={item.label} theme={theme} padding="sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={`text-xs font-medium ${textMuted(theme)}`}>{item.label}</div>
              <div className={`mt-2 text-3xl font-semibold ${textPrimary(theme)}`}>{item.value}</div>
            </div>
            <div className="rounded-2xl bg-neutral-100 p-3 text-neutral-700">
              <item.icon size={18} aria-hidden />
            </div>
          </div>
        </BentoCard>
      ))}
    </div>
  );

  const eventFiltersBar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[220px] flex-1">
        <SearchInput value={eventSearch} onChange={setEventSearch} placeholder="搜索规则、消息或规则 ID" theme={theme} />
      </div>
      <FilterSelect
        value={eventFilters.severity}
        onChange={(value) => {
          setEventFilters((prev) => ({ ...prev, severity: value }));
          setEventPage(1);
        }}
        options={[
          { value: 'all', label: '全部级别' },
          { value: 'critical', label: '严重' },
          { value: 'warning', label: '告警' },
          { value: 'info', label: '通知' },
        ]}
        theme={theme}
        className="w-32"
      />
      <FilterSelect
        value={eventFilters.status}
        onChange={(value) => {
          setEventFilters((prev) => ({ ...prev, status: value }));
          setEventPage(1);
        }}
        options={[
          { value: 'all', label: '全部状态' },
          { value: 'firing', label: '进行中' },
          { value: 'acknowledged', label: '已认领' },
          { value: 'silenced', label: '已静默' },
          { value: 'resolved', label: '已恢复' },
          { value: 'reopened', label: '已重开' },
        ]}
        theme={theme}
        className="w-36"
      />
      <FilterSelect
        value={eventFilters.scopeType}
        onChange={(value) => {
          setEventFilters((prev) => ({ ...prev, scopeType: value }));
          setEventPage(1);
        }}
        options={[
          { value: 'all', label: '全部作用域' },
          { value: 'global', label: '全平台' },
          { value: 'resource_type', label: '资源类型' },
          { value: 'resource', label: '单资源' },
        ]}
        theme={theme}
        className="w-36"
      />
      <FilterSelect
        value={eventFilters.resourceType}
        onChange={(value) => {
          setEventFilters((prev) => ({ ...prev, resourceType: value }));
          setEventPage(1);
        }}
        options={[
          { value: 'all', label: '全部资源' },
          { value: 'agent', label: 'Agent' },
          { value: 'skill', label: 'Skill' },
          { value: 'mcp', label: 'MCP' },
          { value: 'app', label: '应用' },
          { value: 'dataset', label: '数据集' },
        ]}
        theme={theme}
        className="w-32"
      />
      <button
        type="button"
        className={btnGhost(theme)}
        onClick={() => {
          setEventFilters((prev) => ({ ...prev, onlyMine: !prev.onlyMine }));
          setEventPage(1);
        }}
      >
        {eventFilters.onlyMine ? '仅看我负责' : '全部责任人'}
      </button>
    </div>
  );

  const ruleFiltersBar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-[220px] flex-1">
        <SearchInput value={ruleSearch} onChange={setRuleSearch} placeholder="搜索规则名、指标或描述" theme={theme} />
      </div>
      <FilterSelect
        value={ruleFilters.severity}
        onChange={(value) => {
          setRuleFilters((prev) => ({ ...prev, severity: value }));
          setRulePage(1);
        }}
        options={[
          { value: 'all', label: '全部级别' },
          { value: 'critical', label: '严重' },
          { value: 'warning', label: '告警' },
          { value: 'info', label: '通知' },
        ]}
        theme={theme}
        className="w-32"
      />
      <FilterSelect
        value={ruleFilters.scopeType}
        onChange={(value) => {
          setRuleFilters((prev) => ({ ...prev, scopeType: value }));
          setRulePage(1);
        }}
        options={[
          { value: 'all', label: '全部作用域' },
          { value: 'global', label: '全平台' },
          { value: 'resource_type', label: '资源类型' },
          { value: 'resource', label: '单资源' },
        ]}
        theme={theme}
        className="w-36"
      />
      <FilterSelect
        value={ruleFilters.resourceType}
        onChange={(value) => {
          setRuleFilters((prev) => ({ ...prev, resourceType: value }));
          setRulePage(1);
        }}
        options={[
          { value: 'all', label: '全部资源' },
          { value: 'agent', label: 'Agent' },
          { value: 'skill', label: 'Skill' },
          { value: 'mcp', label: 'MCP' },
          { value: 'app', label: '应用' },
          { value: 'dataset', label: '数据集' },
        ]}
        theme={theme}
        className="w-32"
      />
      <FilterSelect
        value={ruleFilters.enabled}
        onChange={(value) => {
          setRuleFilters((prev) => ({ ...prev, enabled: value }));
          setRulePage(1);
        }}
        options={[
          { value: 'all', label: '全部状态' },
          { value: 'enabled', label: '启用中' },
          { value: 'disabled', label: '已停用' },
        ]}
        theme={theme}
        className="w-32"
      />
    </div>
  );

  const allCurrentPageSelected = events.length > 0 && events.every((item) => selectedIds.includes(item.id));

  async function submitActionModal() {
    if (!actionModal) return;
    try {
      if (actionModal.type === 'ack' && actionModal.record) {
        await ackM.mutateAsync({ id: actionModal.record.id, note: actionNote.trim() || undefined });
        showMessage('事件已认领', 'success');
      } else if (actionModal.type === 'assign' && actionModal.record) {
        if (!assigneeId) {
          showMessage('请选择责任人', 'error');
          return;
        }
        await assignM.mutateAsync({ id: actionModal.record.id, assigneeUserId: Number(assigneeId), note: actionNote.trim() || undefined });
        showMessage('责任人已更新', 'success');
      } else if (actionModal.type === 'silence' && actionModal.record) {
        await silenceM.mutateAsync({ id: actionModal.record.id, note: actionNote.trim() || undefined });
        showMessage('事件已静默', 'success');
      } else if (actionModal.type === 'resolve' && actionModal.record) {
        await resolveM.mutateAsync({ id: actionModal.record.id, note: actionNote.trim() || undefined });
        showMessage('事件已恢复', 'success');
      } else if (actionModal.type === 'reopen' && actionModal.record) {
        await reopenM.mutateAsync({ id: actionModal.record.id, note: actionNote.trim() || undefined });
        showMessage('事件已重新打开', 'success');
      } else if (actionModal.type === 'batch') {
        const payload: AlertBatchActionRequest = {
          ids: actionModal.ids,
          action: assigneeId ? 'assign' : 'silence',
          assigneeUserId: assigneeId ? Number(assigneeId) : undefined,
          note: actionNote.trim() || undefined,
        };
        await batchM.mutateAsync(payload);
        showMessage('批量处置已提交', 'success');
        setSelectedIds([]);
      }
      setActionModal(null);
      setActionNote('');
      setAssigneeId('');
      void eventsQ.refetch();
      if (detailId) void detailQ.refetch();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '处置失败', 'error');
    }
  }

  async function submitRuleModal() {
    if (!ruleDraft) return;
    const validationError = validateRuleDraft(ruleDraft);
    if (validationError) {
      setRuleError(validationError);
      return;
    }
    try {
      const payload = buildRulePayload(ruleDraft);
      if (ruleDraft.id) {
        await updateRuleM.mutateAsync({ id: ruleDraft.id, data: payload });
        showMessage('规则已更新', 'success');
      } else {
        await createRuleM.mutateAsync(payload);
        showMessage('规则已创建', 'success');
      }
      setRuleModalOpen(false);
      setRuleDraft(null);
      setRuleError('');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '保存规则失败', 'error');
    }
  }

  async function runDryRun(rule: AlertRule) {
    try {
      const result = await monitoringService.dryRunAlertRule(rule.id, { mode: 'preview' });
      setDryRunTarget(rule);
      setDryRunResult(result);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '试跑失败', 'error');
    }
  }

  const body = (() => {
    if (summaryQ.isLoading && !summary) {
      return <PageSkeleton type="cards" />;
    }
    if (summaryQ.isError) {
      return <PageError error={summaryQ.error as Error} onRetry={() => summaryQ.refetch()} />;
    }
    return (
      <div className={pageBlockStack}>
        {summaryCards}

        {tab === 'events' ? (
          <BentoCard theme={theme}>
            <div className="space-y-4">
              {eventFiltersBar}

              {selectedIds.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-4 py-3">
                  <span className={`text-sm font-medium ${textSecondary(theme)}`}>已选 {selectedIds.length} 条事件</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={() => setActionModal({ type: 'batch', ids: selectedIds })}>
                      批量处置
                    </button>
                    <button type="button" className={btnGhost(theme)} onClick={() => setSelectedIds([])}>
                      清空选择
                    </button>
                  </div>
                </div>
              ) : null}

              {eventsQ.isLoading ? (
                <PageSkeleton type="table" rows={6} />
              ) : eventsQ.isError ? (
                <PageError error={eventsQ.error as Error} onRetry={() => eventsQ.refetch()} />
              ) : events.length === 0 ? (
                <EmptyState title="当前没有匹配的告警事件" description="调整筛选条件，或者等待下一轮规则评估结果。" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px]">
                      <thead>
                        <tr>
                          <th className={tableHeadCell(theme)}>
                            <input
                              type="checkbox"
                              checked={allCurrentPageSelected}
                              onChange={(event) => {
                                setSelectedIds(event.target.checked ? events.map((item) => item.id) : []);
                              }}
                            />
                          </th>
                          <th className={tableHeadCell(theme)}>事件</th>
                          <th className={tableHeadCell(theme)}>级别</th>
                          <th className={tableHeadCell(theme)}>状态</th>
                          <th className={tableHeadCell(theme)}>作用域</th>
                          <th className={tableHeadCell(theme)}>资源</th>
                          <th className={tableHeadCell(theme)}>最近触发</th>
                          <th className={tableHeadCell(theme)}>持续时长</th>
                          <th className={tableHeadCell(theme)}>责任人</th>
                          <th className={tableHeadCell(theme)}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((item, index) => (
                          <tr key={item.id} className={tableBodyRow(theme, index)}>
                            <td className={tableCell()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(item.id)}
                                onChange={(event) => {
                                  setSelectedIds((prev) =>
                                    event.target.checked
                                      ? [...prev, item.id]
                                      : prev.filter((candidate) => candidate !== item.id));
                                }}
                              />
                            </td>
                            <td className={tableCell()}>
                              <div className="space-y-1">
                                <div className={`font-semibold ${textPrimary(theme)}`}>{item.ruleName}</div>
                                <div className={`max-w-[320px] truncate text-xs ${textMuted(theme)}`} title={item.message}>{item.message}</div>
                                <div className={`text-xs ${textMuted(theme)}`}>规则表达式: {item.ruleExpression || '--'}</div>
                              </div>
                            </td>
                            <td className={tableCell()}>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_STYLE[item.severity]}`}>
                                {SEVERITY_LABEL[item.severity]}
                              </span>
                            </td>
                            <td className={tableCell()}>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[item.status]}`}>
                                {STATUS_LABEL[item.status] ?? item.status}
                              </span>
                            </td>
                            <td className={tableCell()}>
                              <div className={`text-sm ${textSecondary(theme)}`}>{item.scopeLabel || '--'}</div>
                            </td>
                            <td className={tableCell()}>
                              <div className="space-y-1">
                                <div className={`text-sm ${textSecondary(theme)}`}>{item.resourceName || '--'}</div>
                                <div className={`text-xs ${textMuted(theme)}`}>{resourceTypeLabel(item.resourceType)}</div>
                              </div>
                            </td>
                            <td className={tableCell()}>
                              <div className={`text-sm ${textSecondary(theme)}`}>{formatDateTime(item.firedAt)}</div>
                            </td>
                            <td className={tableCell()}>
                              <div className={`text-sm ${textSecondary(theme)}`}>{formatDuration(item.activeSeconds)}</div>
                            </td>
                            <td className={tableCell()}>
                              <div className={`text-sm ${textSecondary(theme)}`}>{item.assigneeName || '未分配'}</div>
                            </td>
                            <td className={tableCell()}>
                              <div className="flex flex-wrap items-center gap-2">
                                <button type="button" className={btnGhost(theme)} onClick={() => setDetailId(item.id)}>详情</button>
                                <button type="button" className={btnGhost(theme)} onClick={() => {
                                  setActionModal({ type: 'ack', ids: [item.id], record: item });
                                  setActionNote('');
                                }}>认领</button>
                                <button type="button" className={btnGhost(theme)} onClick={() => {
                                  setActionModal({ type: 'assign', ids: [item.id], record: item });
                                  setActionNote('');
                                  setAssigneeId(item.assigneeUserId ? String(item.assigneeUserId) : '');
                                }}>分配</button>
                                {item.status === 'resolved' ? (
                                  <button type="button" className={btnGhost(theme)} onClick={() => {
                                    setActionModal({ type: 'reopen', ids: [item.id], record: item });
                                    setActionNote('');
                                  }}>重开</button>
                                ) : (
                                  <>
                                    <button type="button" className={btnGhost(theme)} onClick={() => {
                                      setActionModal({ type: 'silence', ids: [item.id], record: item });
                                      setActionNote('');
                                    }}>静默</button>
                                    <button type="button" className={btnGhost(theme)} onClick={() => {
                                      setActionModal({ type: 'resolve', ids: [item.id], record: item });
                                      setActionNote('');
                                    }}>恢复</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    theme={theme}
                    page={eventPage}
                    pageSize={EVENT_PAGE_SIZE}
                    total={eventsQ.data?.total ?? 0}
                    onChange={setEventPage}
                  />
                </>
              )}
            </div>
          </BentoCard>
        ) : (
          <BentoCard theme={theme}>
            <div className="space-y-4">
              {ruleFiltersBar}
              {rulesQ.isLoading ? (
                <PageSkeleton type="table" rows={6} />
              ) : rulesQ.isError ? (
                <PageError error={rulesQ.error as Error} onRetry={() => rulesQ.refetch()} />
              ) : rules.length === 0 ? (
                <EmptyState title="还没有告警规则" description="先创建一条规则，事件中心才会开始沉淀告警事件。" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px]">
                      <thead>
                        <tr>
                          <th className={tableHeadCell(theme)}>规则</th>
                          <th className={tableHeadCell(theme)}>指标</th>
                          <th className={tableHeadCell(theme)}>级别</th>
                          <th className={tableHeadCell(theme)}>作用域</th>
                          <th className={tableHeadCell(theme)}>标签过滤</th>
                          <th className={tableHeadCell(theme)}>状态</th>
                          <th className={tableHeadCell(theme)}>更新时间</th>
                          <th className={tableHeadCell(theme)}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((rule, index) => (
                          <tr key={rule.id} className={tableBodyRow(theme, index)}>
                            <td className={tableCell()}>
                              <div className="space-y-1">
                                <div className={`font-semibold ${textPrimary(theme)}`}>{rule.name}</div>
                                <div className={`text-xs ${textMuted(theme)}`}>{rule.description || '站内消息通知，支持 dry-run 预览。'}</div>
                              </div>
                            </td>
                            <td className={tableCell()}>
                              <div className="space-y-1">
                                <div className={`text-sm ${textSecondary(theme)}`}>{rule.metric}</div>
                                <div className={`text-xs ${textMuted(theme)}`}>{rule.operator} {rule.threshold} / {rule.duration}</div>
                              </div>
                            </td>
                            <td className={tableCell()}>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_STYLE[rule.severity]}`}>
                                {SEVERITY_LABEL[rule.severity]}
                              </span>
                            </td>
                            <td className={tableCell()}>
                              <div className={`text-sm ${textSecondary(theme)}`}>
                                {rule.scopeType === 'global'
                                  ? '全平台'
                                  : rule.scopeType === 'resource_type'
                                    ? `资源类型 / ${resourceTypeLabel(rule.scopeResourceType)}`
                                    : `单资源 / ${resourceTypeLabel(rule.scopeResourceType)} / #${rule.scopeResourceId}`}
                              </div>
                            </td>
                            <td className={tableCell()}>
                              <div className={`max-w-[180px] truncate text-sm ${textSecondary(theme)}`} title={Object.entries(rule.labelFilters ?? {}).map(([key, value]) => `${key}=${value}`).join(', ') || '--'}>
                                {Object.keys(rule.labelFilters ?? {}).length > 0
                                  ? Object.entries(rule.labelFilters).map(([key, value]) => `${key}=${value}`).join(', ')
                                  : '--'}
                              </div>
                            </td>
                            <td className={tableCell()}>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${rule.enabled ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/70'}`}>
                                {rule.enabled ? '启用中' : '已停用'}
                              </span>
                            </td>
                            <td className={tableCell()}>
                              <div className={`text-sm ${textSecondary(theme)}`}>{formatDateTime(rule.updatedAt)}</div>
                            </td>
                            <td className={tableCell()}>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  className={btnGhost(theme)}
                                  onClick={() => {
                                    setRuleDraft(draftFromRule(rule));
                                    setRuleError('');
                                    setRuleModalOpen(true);
                                  }}
                                >
                                  编辑
                                </button>
                                <button type="button" className={btnGhost(theme)} onClick={() => { void runDryRun(rule); }}>试跑</button>
                                <button type="button" className={btnDanger} onClick={() => setDeleteTarget(rule)}>删除</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    theme={theme}
                    page={rulePage}
                    pageSize={RULE_PAGE_SIZE}
                    total={rulesQ.data?.total ?? 0}
                    onChange={setRulePage}
                  />
                </>
              )}
            </div>
          </BentoCard>
        )}
      </div>
    );
  })();

  return (
    <>
      <MgmtPageShell
        theme={theme}
        fontSize={fontSize}
        titleIcon={BellRing}
        breadcrumbSegments={BREADCRUMB}
        description={DESCRIPTION}
        toolbar={toolbar}
        contentScroll="document"
      >
        <div className="px-4 sm:px-6 pb-8">{body}</div>
      </MgmtPageShell>

      <Modal
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title="事件详情"
        theme={theme}
        size="xl"
      >
        {detailQ.isLoading ? (
          <PageSkeleton type="detail" rows={5} />
        ) : detailQ.isError ? (
          <PageError error={detailQ.error as Error} onRetry={() => detailQ.refetch()} />
        ) : detailQ.data ? (
          <AlertDetailContent theme={theme} detail={detailQ.data} />
        ) : (
          <EmptyState title="未找到事件详情" description="这条事件可能已经被清理。" />
        )}
      </Modal>

      <Modal
        open={Boolean(actionModal)}
        onClose={() => {
          setActionModal(null);
          setActionNote('');
          setAssigneeId('');
        }}
        title={actionModal ? alertActionLabel(actionModal.type) : '处置'}
        theme={theme}
        size="md"
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setActionModal(null)}>取消</button>
            <button type="button" className={btnPrimary} onClick={() => void submitActionModal()}>
              提交
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <div className={`text-sm ${textSecondary(theme)}`}>
            {actionModal?.type === 'batch'
              ? `准备批量处置 ${actionModal.ids.length} 条事件。默认执行批量静默；若选择责任人则改为批量分配。`
              : `当前事件：${actionModal?.record?.ruleName ?? '--'}`}
          </div>
          {(actionModal?.type === 'assign' || actionModal?.type === 'batch') ? (
            <div>
              <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>责任人</label>
              <select
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                className={nativeInputClass(theme)}
              >
                <option value="">{actionModal?.type === 'batch' ? '不分配，仅批量静默' : '请选择责任人'}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.realName || user.username}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>备注</label>
            <textarea
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
              className={`${nativeInputClass(theme)} min-h-28`}
              placeholder="写下这次处置的背景、影响或备注"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={ruleModalOpen}
        onClose={() => {
          setRuleModalOpen(false);
          setRuleDraft(null);
          setRuleError('');
        }}
        title={ruleDraft?.id ? '编辑规则' : '新建规则'}
        theme={theme}
        size="lg"
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setRuleModalOpen(false)}>取消</button>
            <button type="button" className={btnPrimary} onClick={() => void submitRuleModal()}>
              {ruleDraft?.id ? '保存规则' : '创建规则'}
            </button>
          </>
        )}
      >
        {ruleDraft ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>规则名称</label>
                <input
                  value={ruleDraft.name}
                  onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, name: event.target.value } : prev)}
                  className={`${nativeInputClass(theme)}${ruleError && !ruleDraft.name.trim() ? ` ${inputBaseError()}` : ''}`}
                  placeholder="例如：MCP 错误率过高"
                />
              </div>
              <div>
                <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>通知方式</label>
                <div className={`${bentoCard(theme)} px-4 py-3 text-sm ${textSecondary(theme)}`}>仅站内消息</div>
              </div>
            </div>

            <div>
              <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>规则说明</label>
              <textarea
                value={ruleDraft.description}
                onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, description: event.target.value } : prev)}
                className={`${nativeInputClass(theme)} min-h-24`}
                placeholder="描述触发原因、业务背景或运维建议"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>指标</label>
                <select
                  value={ruleDraft.metric}
                  onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, metric: event.target.value } : prev)}
                  className={nativeInputClass(theme)}
                >
                  {metrics.map((metric) => (
                    <option key={metric.value} value={metric.value}>{metric.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>运算符</label>
                <select
                  value={ruleDraft.operator}
                  onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, operator: event.target.value as AlertRule['operator'] } : prev)}
                  className={nativeInputClass(theme)}
                >
                  <option value="gt">大于</option>
                  <option value="gte">大于等于</option>
                  <option value="lt">小于</option>
                  <option value="lte">小于等于</option>
                  <option value="eq">等于</option>
                </select>
              </div>
              <div>
                <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>阈值</label>
                <input
                  value={ruleDraft.threshold}
                  onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, threshold: event.target.value } : prev)}
                  className={nativeInputClass(theme)}
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>持续窗口</label>
                <input
                  value={ruleDraft.duration}
                  onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, duration: event.target.value } : prev)}
                  className={nativeInputClass(theme)}
                  placeholder="5m / 1h"
                />
              </div>
              <div>
                <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>严重级别</label>
                <select
                  value={ruleDraft.severity}
                  onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, severity: event.target.value as AlertRule['severity'] } : prev)}
                  className={nativeInputClass(theme)}
                >
                  <option value="critical">严重</option>
                  <option value="warning">告警</option>
                  <option value="info">通知</option>
                </select>
              </div>
              <div>
                <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>作用域</label>
                <select
                  value={ruleDraft.scopeType}
                  onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, scopeType: event.target.value as AlertRule['scopeType'] } : prev)}
                  className={nativeInputClass(theme)}
                >
                  <option value="global">全平台</option>
                  <option value="resource_type">资源类型</option>
                  <option value="resource">单资源</option>
                </select>
              </div>
              <div>
                <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>启用状态</label>
                <select
                  value={ruleDraft.enabled ? 'enabled' : 'disabled'}
                  onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, enabled: event.target.value === 'enabled' } : prev)}
                  className={nativeInputClass(theme)}
                >
                  <option value="enabled">启用中</option>
                  <option value="disabled">已停用</option>
                </select>
              </div>
            </div>

            {ruleDraft.scopeType !== 'global' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>资源类型</label>
                  <select
                    value={ruleDraft.scopeResourceType}
                    onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, scopeResourceType: event.target.value, scopeResourceId: '' } : prev)}
                    className={nativeInputClass(theme)}
                  >
                    {(scopeOptionsQ.data?.resourceTypes ?? ['agent', 'skill', 'mcp', 'app', 'dataset']).map((type) => (
                      <option key={type} value={type}>{resourceTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>
                {ruleDraft.scopeType === 'resource' ? (
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>单资源目标</label>
                    <select
                      value={ruleDraft.scopeResourceId}
                      onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, scopeResourceId: event.target.value } : prev)}
                      className={nativeInputClass(theme)}
                    >
                      <option value="">请选择资源</option>
                      {filteredResourceOptions.map((resource) => (
                        <option key={resource.id} value={resource.id}>{resource.displayName}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className={`mb-1 block text-xs font-semibold ${textSecondary(theme)}`}>标签过滤</label>
              <textarea
                value={ruleDraft.labelFiltersText}
                onChange={(event) => setRuleDraft((prev) => prev ? { ...prev, labelFiltersText: event.target.value } : prev)}
                className={`${nativeInputClass(theme)} min-h-24`}
                placeholder={`支持一行一个键值，例如：\nstatus=error\nmethod=POST /invoke`}
              />
            </div>

            {ruleError ? <p className={fieldErrorText()}>{ruleError}</p> : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(dryRunTarget && dryRunResult)}
        onClose={() => {
          setDryRunTarget(null);
          setDryRunResult(null);
        }}
        title="规则试跑结果"
        theme={theme}
        size="lg"
      >
        {dryRunTarget && dryRunResult ? (
          <div className="space-y-4">
            <div className={`text-lg font-semibold ${textPrimary(theme)}`}>{dryRunTarget.name}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${dryRunResult.wouldFire ? STATUS_STYLE.firing : STATUS_STYLE.resolved}`}>
                {dryRunResult.wouldFire ? '当前会触发' : '当前不会触发'}
              </span>
              <span className={`text-sm ${textSecondary(theme)}`}>样本来源：{dryRunResult.sampleSource || '--'}</span>
            </div>
            <div className={`${bentoCard(theme)} space-y-3 p-4`}>
              <div className={`text-sm ${textSecondary(theme)}`}>样本值：{dryRunResult.sampleValue}</div>
              <div className={`text-sm ${textSecondary(theme)}`}>阈值：{dryRunResult.threshold}</div>
              <div className={`text-sm ${textSecondary(theme)}`}>详情：{dryRunResult.detail}</div>
              <div className={`text-sm ${textSecondary(theme)}`}>命中原因：{dryRunResult.reason || '--'}</div>
              <pre className="overflow-x-auto rounded-2xl bg-neutral-950 p-4 text-xs text-neutral-100">
                {JSON.stringify(dryRunResult.snapshot ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除告警规则"
        message={deleteTarget ? `确定删除规则“${deleteTarget.name}”吗？这会保留历史事件，但规则本身会被移除。` : ''}
        confirmText="删除"
        variant="danger"
        loading={deleteRuleM.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteRuleM.mutate(deleteTarget.id, {
            onSuccess: () => {
              showMessage('规则已删除', 'success');
              setDeleteTarget(null);
            },
            onError: (error) => {
              showMessage(error instanceof Error ? error.message : '删除规则失败', 'error');
            },
          });
        }}
      />
    </>
  );
};

const AlertDetailContent: React.FC<{ theme: Theme; detail: AlertEventDetail }> = ({ theme, detail }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_STYLE[detail.severity]}`}>{SEVERITY_LABEL[detail.severity]}</span>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[detail.status]}`}>{STATUS_LABEL[detail.status] ?? detail.status}</span>
        <span className={`text-sm ${textSecondary(theme)}`}>{detail.scopeLabel || '全平台'}</span>
      </div>

      <div className={`${bentoCard(theme)} space-y-3 p-4`}>
        <div className={`text-lg font-semibold ${textPrimary(theme)}`}>{detail.ruleName}</div>
        <div className={`text-sm ${textSecondary(theme)}`}>{detail.message}</div>
        <div className="grid gap-3 md:grid-cols-2">
          <DetailLine theme={theme} label="规则表达式" value={detail.ruleExpression || '--'} />
          <DetailLine theme={theme} label="最近样本值" value={detail.lastSampleValue == null ? '--' : String(detail.lastSampleValue)} />
          <DetailLine theme={theme} label="最近触发" value={formatDateTime(detail.firedAt)} />
          <DetailLine theme={theme} label="持续时长" value={detail.duration || formatDuration(detail.activeSeconds)} />
          <DetailLine theme={theme} label="责任人" value={detail.assigneeName || '未分配'} />
          <DetailLine theme={theme} label="站内通知" value={`${detail.notificationCount ?? 0} 条`} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className={`${bentoCard(theme)} space-y-3 p-4`}>
          <div className={`text-sm font-semibold ${textPrimary(theme)}`}>触发证据</div>
          <pre className="overflow-x-auto rounded-2xl bg-neutral-950 p-4 text-xs text-neutral-100">
            {JSON.stringify(detail.triggerSnapshot ?? {}, null, 2)}
          </pre>
        </div>
        <div className={`${bentoCard(theme)} space-y-3 p-4`}>
          <div className={`text-sm font-semibold ${textPrimary(theme)}`}>规则快照</div>
          <pre className="overflow-x-auto rounded-2xl bg-neutral-950 p-4 text-xs text-neutral-100">
            {JSON.stringify(detail.ruleSnapshot ?? {}, null, 2)}
          </pre>
        </div>
      </div>

      <div className={`${bentoCard(theme)} space-y-3 p-4`}>
        <div className={`text-sm font-semibold ${textPrimary(theme)}`}>处置时间线</div>
        {detail.actions.length === 0 ? (
          <div className={`text-sm ${textMuted(theme)}`}>暂无处置记录</div>
        ) : (
          <div className="space-y-3">
            {detail.actions.map((action) => (
              <div key={action.id} className="rounded-2xl bg-neutral-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={`text-sm font-medium ${textSecondary(theme)}`}>{action.actionType}</div>
                  <div className={`text-xs ${textMuted(theme)}`}>{formatDateTime(action.createTime)}</div>
                </div>
                <div className={`mt-1 text-sm ${textMuted(theme)}`}>
                  {action.operatorName || '系统'} · {action.previousStatus || '--'} → {action.nextStatus || '--'}
                </div>
                {action.note ? <div className={`mt-2 text-sm ${textSecondary(theme)}`}>{action.note}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`${bentoCard(theme)} space-y-3 p-4`}>
        <div className={`text-sm font-semibold ${textPrimary(theme)}`}>站内通知记录</div>
        {detail.notifications.length === 0 ? (
          <div className={`text-sm ${textMuted(theme)}`}>当前事件还没有关联的站内通知。</div>
        ) : (
          <div className="space-y-3">
            {detail.notifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl bg-neutral-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={`text-sm font-medium ${textSecondary(theme)}`}>{notification.title}</div>
                  <div className={`text-xs ${textMuted(theme)}`}>{formatDateTime(notification.createTime)}</div>
                </div>
                <div className={`mt-2 whitespace-pre-wrap text-sm ${textMuted(theme)}`}>{notification.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DetailLine: React.FC<{ theme: Theme; label: string; value: string }> = ({ theme, label, value }) => (
  <div>
    <div className={`text-xs font-medium ${textMuted(theme)}`}>{label}</div>
    <div className={`mt-1 text-sm ${textSecondary(theme)}`}>{value}</div>
  </div>
);
