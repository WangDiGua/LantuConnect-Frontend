import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, PencilLine, RefreshCcw, Search, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { healthService } from '../../api/services/health.service';
import type { ResourceHealthSnapshotVO } from '../../types/dto/resource-center';
import { buildPath } from '../../constants/consoleRoutes';
import { LantuSelect } from '../../components/common/LantuSelect';
import { TOOLBAR_ROW_LIST, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  btnPrimary,
  btnSecondary,
  cardHeading,
  iconMuted,
  pageBlockStack,
  tableBodyRow,
  tableCell,
  tableHeadCell,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { Modal } from '../../components/common/Modal';
import { RowActionGroup } from '../../components/management/RowActionGroup';
import { resourceTypeLabel } from '../../constants/resourceTypes';
import { formatDateTime } from '../../utils/formatDateTime';
import {
  circuitBreakerBadgeClass,
  circuitBreakerLabelZh,
  resourceHealthBadgeClass,
  resourceHealthLabelZh,
} from '../../utils/backendEnumLabels';
import {
  resourceCallabilityBadgeClass,
  resourceCallabilityLabelZh,
} from '../../utils/resourceCallability';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type HealthFilter = 'all' | 'healthy' | 'degraded' | 'down';
type CallabilityFilter =
  | 'all'
  | 'callable'
  | 'dependency_blocked'
  | 'health_down'
  | 'health_degraded'
  | 'circuit_open'
  | 'circuit_half_open'
  | 'disabled'
  | 'not_published'
  | 'not_configured';
type StrategyFilter = 'all' | 'agent_provider' | 'skill_canary' | 'mcp_jsonrpc' | 'mcp_stdio';

type PolicyDraft = {
  intervalSec: string;
  healthyThreshold: string;
  timeoutSec: string;
  failureThreshold: string;
  openDurationSec: string;
  halfOpenMaxCalls: string;
  fallbackResourceCode: string;
  fallbackMessage: string;
  probeConfigText: string;
  canaryPayloadText: string;
};

type EvidenceViewerState = {
  title: string;
  content: string;
};

const INPUT_FOCUS = 'focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-900/35';

const EMPTY_DRAFT: PolicyDraft = {
  intervalSec: '',
  healthyThreshold: '',
  timeoutSec: '',
  failureThreshold: '',
  openDurationSec: '',
  halfOpenMaxCalls: '',
  fallbackResourceCode: '',
  fallbackMessage: '',
  probeConfigText: '',
  canaryPayloadText: '',
};

function prettyJson(value: unknown): string {
  if (value == null || value === '') return 'No data';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseJsonOrUndefined(raw: string): Record<string, unknown> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = JSON.parse(trimmed);
  return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined;
}

function toOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

function strategyLabel(value?: string | null): string {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'agent_provider') return 'Agent provider canary';
  if (key === 'skill_canary') return 'Skill synthetic canary';
  if (key === 'mcp_jsonrpc') return 'MCP initialize + tools/list';
  if (key === 'mcp_stdio') return 'MCP stdio sidecar';
  return key || '--';
}

function policyValue(value: string | number | undefined | null, suffix = ''): string {
  if (value == null || value === '') return '--';
  return `${value}${suffix}`;
}

function primaryReason(item: ResourceHealthSnapshotVO | null): string {
  if (!item) return '--';
  return item.callabilityReason || item.lastFailureReason || '--';
}

function dependencySummary(item: ResourceHealthSnapshotVO): string {
  const dependencies = item.dependencies ?? [];
  if (dependencies.length === 0) return '无依赖';
  const blockedCount = dependencies.filter(
    (dependency) => dependency.callabilityState && dependency.callabilityState !== 'callable',
  ).length;
  if (blockedCount > 0) return `${blockedCount} 个阻断 / 共 ${dependencies.length} 个`;
  return `${dependencies.length} 个健康依赖`;
}

function strategyBrief(item: ResourceHealthSnapshotVO): string {
  return strategyLabel(item.probeStrategy ?? item.policy?.probeStrategy);
}

function buildDraft(item: ResourceHealthSnapshotVO): PolicyDraft {
  const policy = item.policy;
  return {
    intervalSec: policy?.intervalSec != null ? String(policy.intervalSec) : '',
    healthyThreshold: policy?.healthyThreshold != null ? String(policy.healthyThreshold) : '',
    timeoutSec: policy?.timeoutSec != null ? String(policy.timeoutSec) : '',
    failureThreshold: policy?.failureThreshold != null ? String(policy.failureThreshold) : '',
    openDurationSec: policy?.openDurationSec != null ? String(policy.openDurationSec) : '',
    halfOpenMaxCalls: policy?.halfOpenMaxCalls != null ? String(policy.halfOpenMaxCalls) : '',
    fallbackResourceCode: policy?.fallbackResourceCode ?? '',
    fallbackMessage: policy?.fallbackMessage ?? '',
    probeConfigText: prettyJson(policy?.probeConfig),
    canaryPayloadText: prettyJson(policy?.canaryPayload),
  };
}

export const HealthGovernancePage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const inputCls = `${nativeInputClass(theme)} ${INPUT_FOCUS}`;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState<ResourceHealthSnapshotVO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [callabilityFilter, setCallabilityFilter] = useState<CallabilityFilter>('all');
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('all');
  const [detailResourceId, setDetailResourceId] = useState<number | null>(() => {
    const raw = Number(searchParams.get('resourceId') ?? '');
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  });
  const [detailSnapshot, setDetailSnapshot] = useState<ResourceHealthSnapshotVO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [policyResourceId, setPolicyResourceId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<'probe' | 'break' | 'recover' | null>(null);
  const [draft, setDraft] = useState<PolicyDraft>(EMPTY_DRAFT);
  const [evidenceViewer, setEvidenceViewer] = useState<EvidenceViewerState | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    healthService
      .listResourceHealth({
        resourceType: typeFilter === 'all' ? undefined : typeFilter,
        healthStatus: healthFilter === 'all' ? undefined : healthFilter,
        callabilityState: callabilityFilter === 'all' ? undefined : callabilityFilter,
        probeStrategy: strategyFilter === 'all' ? undefined : strategyFilter,
      })
      .then((data) => setItems(data))
      .catch((error) => {
        console.error(error);
        showMessage('加载健康治理数据失败', 'error');
      })
      .finally(() => setLoading(false));
  }, [callabilityFilter, healthFilter, showMessage, strategyFilter, typeFilter]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      item.displayName.toLowerCase().includes(term)
      || item.resourceCode.toLowerCase().includes(term)
      || String(item.callabilityReason ?? '').toLowerCase().includes(term)
      || String(item.lastFailureReason ?? '').toLowerCase().includes(term)
      || strategyBrief(item).toLowerCase().includes(term));
  }, [items, query]);

  const detailItem = useMemo(() => {
    if (detailSnapshot && detailSnapshot.resourceId === detailResourceId) {
      return detailSnapshot;
    }
    return filtered.find((item) => item.resourceId === detailResourceId)
      ?? items.find((item) => item.resourceId === detailResourceId)
      ?? null;
  }, [detailResourceId, detailSnapshot, filtered, items]);

  const policyItem = useMemo(
    () => items.find((item) => item.resourceId === policyResourceId) ?? null,
    [items, policyResourceId],
  );

  const summary = useMemo(() => ({
    healthy: items.filter((item) => item.healthStatus === 'healthy').length,
    degraded: items.filter((item) => item.healthStatus === 'degraded').length,
    down: items.filter((item) => item.healthStatus === 'down').length,
    callable: items.filter((item) => item.callabilityState === 'callable').length,
  }), [items]);

  const updateSnapshot = (snapshot: ResourceHealthSnapshotVO) => {
    setItems((prev) => prev.map((item) => (item.resourceId === snapshot.resourceId ? snapshot : item)));
  };

  const openPolicyEditor = (item: ResourceHealthSnapshotVO) => {
    setDraft(buildDraft(item));
    setPolicyResourceId(item.resourceId);
  };

  const closeDetail = () => {
    setDetailResourceId(null);
    setDetailSnapshot(null);
    setEvidenceViewer(null);
  };

  useEffect(() => {
    if (!detailResourceId) {
      setDetailSnapshot(null);
      return;
    }
    setDetailLoading(true);
    healthService
      .getResourceHealth(detailResourceId)
      .then((snapshot) => {
        setDetailSnapshot(snapshot);
        updateSnapshot(snapshot);
      })
      .catch((error) => {
        console.error(error);
        showMessage('加载健康详情失败', 'error');
      })
      .finally(() => setDetailLoading(false));
  }, [detailResourceId, showMessage]);

  const savePolicy = async () => {
    if (!policyItem) return;
    setSaving(true);
    try {
      let probeConfig: Record<string, unknown> | undefined;
      let canaryPayload: Record<string, unknown> | undefined;
      try {
        probeConfig = parseJsonOrUndefined(draft.probeConfigText);
        canaryPayload = parseJsonOrUndefined(draft.canaryPayloadText);
      } catch {
        showMessage('Probe config 或 canary payload 不是合法 JSON', 'error');
        setSaving(false);
        return;
      }

      const snapshot = await healthService.updateResourcePolicy(policyItem.resourceId, {
        intervalSec: toOptionalNumber(draft.intervalSec),
        healthyThreshold: toOptionalNumber(draft.healthyThreshold),
        timeoutSec: toOptionalNumber(draft.timeoutSec),
        failureThreshold: toOptionalNumber(draft.failureThreshold),
        openDurationSec: toOptionalNumber(draft.openDurationSec),
        halfOpenMaxCalls: toOptionalNumber(draft.halfOpenMaxCalls),
        fallbackResourceCode: draft.fallbackResourceCode.trim() || undefined,
        fallbackMessage: draft.fallbackMessage.trim() || undefined,
        probeConfig,
        canaryPayload,
      });
      updateSnapshot(snapshot);
      setPolicyResourceId(null);
      showMessage('健康治理策略已保存', 'success');
    } catch (error) {
      console.error(error);
      showMessage(error instanceof Error ? error.message : '保存策略失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (item: ResourceHealthSnapshotVO, action: 'probe' | 'break' | 'recover') => {
    setActionLoading(action);
    try {
      const snapshot = action === 'probe'
        ? await healthService.probeResourceHealth(item.resourceId)
        : action === 'break'
          ? await healthService.manualBreakResource(
            item.resourceId,
            item.policy?.openDurationSec ?? item.intervalSec,
          )
          : await healthService.manualRecoverResource(item.resourceId);
      updateSnapshot(snapshot);
      showMessage(
        action === 'probe'
          ? '资源已重新探测'
          : action === 'break'
            ? '资源已手动熔断'
            : '资源已手动恢复',
        action === 'break' ? 'info' : 'success',
      );
    } catch (error) {
      console.error(error);
      showMessage(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const toolbar = (
    <div className={`${TOOLBAR_ROW_LIST} min-w-0`}>
      <div className="relative min-w-0 flex-1 shrink sm:max-w-md">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconMuted(theme)}`} size={16} />
        <input
          type="search"
          placeholder="搜索资源、探测策略或失败原因..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={toolbarSearchInputClass(theme)}
        />
      </div>
      <LantuSelect
        theme={theme}
        className="!w-36 shrink-0"
        value={typeFilter}
        onChange={setTypeFilter}
        options={[
          { value: 'all', label: '全部类型' },
          { value: 'agent', label: 'Agent' },
          { value: 'skill', label: 'Skill' },
          { value: 'mcp', label: 'MCP' },
        ]}
      />
      <LantuSelect
        theme={theme}
        className="!w-36 shrink-0"
        value={healthFilter}
        onChange={(value) => setHealthFilter(value as HealthFilter)}
        options={[
          { value: 'all', label: '全部健康' },
          { value: 'healthy', label: '健康' },
          { value: 'degraded', label: '降级' },
          { value: 'down', label: '故障' },
        ]}
      />
      <LantuSelect
        theme={theme}
        className="!w-40 shrink-0"
        value={callabilityFilter}
        onChange={(value) => setCallabilityFilter(value as CallabilityFilter)}
        options={[
          { value: 'all', label: '全部可调用' },
          { value: 'callable', label: '可调用' },
          { value: 'dependency_blocked', label: '依赖阻断' },
          { value: 'health_down', label: '健康拦截' },
          { value: 'health_degraded', label: '降级可用' },
          { value: 'circuit_open', label: '熔断打开' },
          { value: 'circuit_half_open', label: '半开探测' },
        ]}
      />
      <LantuSelect
        theme={theme}
        className="!w-48 shrink-0"
        value={strategyFilter}
        onChange={(value) => setStrategyFilter(value as StrategyFilter)}
        options={[
          { value: 'all', label: '全部探测策略' },
          { value: 'agent_provider', label: 'Agent provider' },
          { value: 'skill_canary', label: 'Skill canary' },
          { value: 'mcp_jsonrpc', label: 'MCP JSON-RPC' },
          { value: 'mcp_stdio', label: 'MCP stdio' },
        ]}
      />
      <button type="button" className={btnSecondary(theme)} onClick={() => void fetchData()}>
        <RefreshCcw size={16} />
        刷新
      </button>
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={ShieldCheck}
      breadcrumbSegments={['监控运维', '健康治理']}
      description="面向 Agent、Skill、MCP 的统一健康治理工作台。主页面只保留决策信息，策略、依赖和证据统一进入弹窗查看。"
      toolbar={toolbar}
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6">
        {loading ? (
          <PageSkeleton type="table" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <BentoCard theme={theme} padding="sm">
                <div className={`text-xs ${textMuted(theme)}`}>健康资源</div>
                <div className={`mt-1 text-2xl font-bold ${textPrimary(theme)}`}>{summary.healthy}</div>
              </BentoCard>
              <BentoCard theme={theme} padding="sm">
                <div className={`text-xs ${textMuted(theme)}`}>降级资源</div>
                <div className={`mt-1 text-2xl font-bold ${textPrimary(theme)}`}>{summary.degraded}</div>
              </BentoCard>
              <BentoCard theme={theme} padding="sm">
                <div className={`text-xs ${textMuted(theme)}`}>故障资源</div>
                <div className={`mt-1 text-2xl font-bold ${textPrimary(theme)}`}>{summary.down}</div>
              </BentoCard>
              <BentoCard theme={theme} padding="sm">
                <div className={`text-xs ${textMuted(theme)}`}>当前可调用</div>
                <div className={`mt-1 text-2xl font-bold ${textPrimary(theme)}`}>{summary.callable}</div>
              </BentoCard>
            </div>

            <BentoCard theme={theme} padding="sm" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead>
                    <tr>
                      {['资源', '类型', '健康', '可调用', '熔断', '探测策略', '最近探测', '操作'].map((head) => (
                        <th key={head} className={tableHeadCell(theme)}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, index) => (
                      <tr key={item.resourceId} className={tableBodyRow(theme, index)}>
                        <td className={tableCell()}>
                          <div className={`font-medium ${textPrimary(theme)}`}>{item.displayName}</div>
                          <div className={`mt-1 text-xs ${textMuted(theme)}`}>{item.resourceCode}</div>
                          <div className={`mt-1 text-xs ${textSecondary(theme)}`}>{primaryReason(item)}</div>
                        </td>
                        <td className={`${tableCell()} text-xs ${textMuted(theme)}`}>{resourceTypeLabel(item.resourceType)}</td>
                        <td className={tableCell()}>
                          <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${resourceHealthBadgeClass(theme, item.healthStatus)}`}>
                            {resourceHealthLabelZh(item.healthStatus)}
                          </span>
                        </td>
                        <td className={tableCell()}>
                          <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${resourceCallabilityBadgeClass(theme, item.callabilityState)}`}>
                            {resourceCallabilityLabelZh(item.callabilityState)}
                          </span>
                        </td>
                        <td className={tableCell()}>
                          <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${circuitBreakerBadgeClass(theme, item.circuitState)}`}>
                            {circuitBreakerLabelZh(item.circuitState)}
                          </span>
                        </td>
                        <td className={`${tableCell()} text-xs ${textMuted(theme)}`}>
                          <div>{strategyBrief(item)}</div>
                          <div className="mt-1">{dependencySummary(item)}</div>
                        </td>
                        <td className={`${tableCell()} text-xs whitespace-nowrap ${textMuted(theme)}`}>
                          <div>{formatDateTime(item.lastProbeAt) || '--'}</div>
                          <div className="mt-1">{item.probeLatencyMs != null ? `${item.probeLatencyMs}ms` : '--'}</div>
                        </td>
                        <td className={tableCell()}>
                          <RowActionGroup
                            theme={theme}
                            actions={[
                              {
                                key: 'detail',
                                label: '详情',
                                icon: Eye,
                                onClick: () => setDetailResourceId(item.resourceId),
                              },
                              {
                                key: 'policy',
                                label: '策略',
                                icon: PencilLine,
                                onClick: () => openPolicyEditor(item),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BentoCard>
          </div>
        )}
      </div>

      <Modal
        open={detailItem != null}
        onClose={closeDetail}
        theme={theme}
        size="2xl"
        title={detailItem ? `健康治理详情 · ${detailItem.displayName}` : '健康治理详情'}
      >
        {detailItem ? (
          <div className="space-y-4">
            {detailLoading ? (
              <div className={`rounded-[1.1rem] border px-4 py-3 text-sm ${isDark ? 'border-white/10 bg-white/[0.03] text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                正在同步这条资源的最新健康快照与证据链…
              </div>
            ) : null}
            <BentoCard theme={theme} padding="sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className={`text-lg font-semibold ${textPrimary(theme)}`}>{detailItem.displayName}</div>
                  <div className={`mt-1 text-xs ${textMuted(theme)}`}>{detailItem.resourceCode} · {resourceTypeLabel(detailItem.resourceType)}</div>
                </div>
                <button type="button" className={btnSecondary(theme)} onClick={() => openPolicyEditor(detailItem)}>
                  编辑策略
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${resourceHealthBadgeClass(theme, detailItem.healthStatus)}`}>
                  {resourceHealthLabelZh(detailItem.healthStatus)}
                </span>
                <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${resourceCallabilityBadgeClass(theme, detailItem.callabilityState)}`}>
                  {resourceCallabilityLabelZh(detailItem.callabilityState)}
                </span>
                <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${circuitBreakerBadgeClass(theme, detailItem.circuitState)}`}>
                  {circuitBreakerLabelZh(detailItem.circuitState)}
                </span>
              </div>
              <div className={`mt-3 text-sm ${textPrimary(theme)}`}>{primaryReason(detailItem)}</div>
              <div className={`mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs ${textSecondary(theme)}`}>
                <div>最近探测: {formatDateTime(detailItem.lastProbeAt) || '--'}</div>
                <div>最近成功: {formatDateTime(detailItem.lastSuccessAt) || '--'}</div>
                <div>连续失败: {policyValue(detailItem.consecutiveFailure)}</div>
                <div>探测延迟: {detailItem.probeLatencyMs != null ? `${detailItem.probeLatencyMs}ms` : '--'}</div>
              </div>
              {detailItem.probePayloadSummary ? (
                <div className={`mt-2 text-xs ${textSecondary(theme)}`}>探测摘要: {detailItem.probePayloadSummary}</div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnSecondary(theme)}
                  onClick={() => void runAction(detailItem, 'probe')}
                  disabled={actionLoading != null}
                >
                  立即探测
                </button>
                <button
                  type="button"
                  className={btnSecondary(theme)}
                  onClick={() => void runAction(detailItem, 'break')}
                  disabled={actionLoading != null}
                >
                  手动熔断
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => void runAction(detailItem, 'recover')}
                  disabled={actionLoading != null}
                >
                  手动恢复
                </button>
              </div>
            </BentoCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BentoCard theme={theme} padding="sm">
                <div className={cardHeading(theme)}>策略摘要</div>
                <div className={`mt-3 space-y-2 text-xs ${textSecondary(theme)}`}>
                  <div>探测策略: {strategyBrief(detailItem)}</div>
                  <div>检查类型: {policyValue(detailItem.policy?.checkType ?? detailItem.checkType)}</div>
                  <div>检查地址: {policyValue(detailItem.policy?.checkUrl ?? detailItem.checkUrl)}</div>
                  <div>探测间隔: {policyValue(detailItem.policy?.intervalSec ?? detailItem.intervalSec, 's')}</div>
                  <div>健康阈值: {policyValue(detailItem.policy?.healthyThreshold ?? detailItem.healthyThreshold)}</div>
                  <div>超时时间: {policyValue(detailItem.policy?.timeoutSec ?? detailItem.timeoutSec, 's')}</div>
                </div>
              </BentoCard>

              <BentoCard theme={theme} padding="sm">
                <div className={cardHeading(theme)}>熔断摘要</div>
                <div className={`mt-3 space-y-2 text-xs ${textSecondary(theme)}`}>
                  <div>熔断状态: {circuitBreakerLabelZh(detailItem.circuitState)}</div>
                  <div>失败阈值: {policyValue(detailItem.policy?.failureThreshold)}</div>
                  <div>打开时长: {policyValue(detailItem.policy?.openDurationSec, 's')}</div>
                  <div>半开最大调用: {policyValue(detailItem.policy?.halfOpenMaxCalls)}</div>
                  <div>降级资源: {policyValue(detailItem.policy?.fallbackResourceCode)}</div>
                  <div>降级提示: {policyValue(detailItem.policy?.fallbackMessage)}</div>
                </div>
              </BentoCard>
            </div>

            <BentoCard theme={theme} padding="sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={cardHeading(theme)}>依赖闭包</div>
                  <div className={`mt-1 text-xs ${textSecondary(theme)}`}>{dependencySummary(detailItem)}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    onClick={() => setEvidenceViewer({
                      title: `${detailItem.displayName} · 探测证据`,
                      content: prettyJson(detailItem.lastProbeEvidence ?? detailItem.probeEvidence),
                    })}
                  >
                    查看探测证据
                  </button>
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    onClick={() => setEvidenceViewer({
                      title: `${detailItem.displayName} · Probe config`,
                      content: prettyJson(detailItem.policy?.probeConfig),
                    })}
                  >
                    查看 Probe config
                  </button>
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    onClick={() => setEvidenceViewer({
                      title: `${detailItem.displayName} · Canary payload`,
                      content: prettyJson(detailItem.policy?.canaryPayload),
                    })}
                  >
                    查看 Canary payload
                  </button>
                </div>
              </div>

              {(detailItem.dependencies?.length ?? 0) === 0 ? (
                <div className={`mt-3 text-xs ${textMuted(theme)}`}>当前没有依赖资源。</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {detailItem.dependencies?.map((dependency) => (
                    <div
                      key={`${dependency.resourceId}-${dependency.resourceCode ?? 'dependency'}`}
                      className={`rounded-xl border px-3 py-3 text-xs ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <div className={`font-medium ${textPrimary(theme)}`}>{dependency.displayName}</div>
                      <div className={`mt-1 ${textMuted(theme)}`}>{dependency.resourceCode ?? dependency.resourceId}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-lg border px-2 py-0.5 font-semibold ${resourceHealthBadgeClass(theme, dependency.healthStatus)}`}>
                          {resourceHealthLabelZh(dependency.healthStatus)}
                        </span>
                        <span className={`inline-flex rounded-lg border px-2 py-0.5 font-semibold ${resourceCallabilityBadgeClass(theme, dependency.callabilityState)}`}>
                          {resourceCallabilityLabelZh(dependency.callabilityState)}
                        </span>
                      </div>
                      {dependency.callabilityReason ? (
                        <div className={`mt-2 ${textSecondary(theme)}`}>{dependency.callabilityReason}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </BentoCard>

            <BentoCard theme={theme} padding="sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={cardHeading(theme)}>最近失败证据</div>
                  <div className={`mt-1 text-xs ${textSecondary(theme)}`}>
                    从健康治理直接回到调用日志、链路追踪和告警处置，形成治理闭环。
                  </div>
                </div>
                <button
                  type="button"
                  className={btnSecondary(theme)}
                  onClick={() => navigate(`${buildPath('admin', 'call-logs')}?resourceId=${detailItem.resourceId}`)}
                >
                  查看该资源调用日志
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className={`rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`text-sm font-semibold ${textPrimary(theme)}`}>最近调用</div>
                  {(detailItem.recentCallLogs?.length ?? 0) === 0 ? (
                    <div className={`mt-3 text-xs ${textMuted(theme)}`}>暂无最近调用证据。</div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {detailItem.recentCallLogs?.map((entry) => (
                        <button
                          key={`${entry.id}-${entry.createdAt}`}
                          type="button"
                          onClick={() => navigate(`${buildPath('admin', 'call-logs')}?q=${encodeURIComponent(entry.traceId || entry.id)}`)}
                          className={`w-full rounded-xl border px-3 py-3 text-left ${isDark ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-white'}`}
                        >
                          <div className={`text-sm font-medium ${textPrimary(theme)}`}>{entry.resourceName || detailItem.displayName}</div>
                          <div className={`mt-1 text-xs ${textMuted(theme)}`}>{entry.method || '--'} · {formatDateTime(entry.createdAt)}</div>
                          <div className={`mt-2 text-xs ${textSecondary(theme)}`}>{entry.statusCode} · {entry.latencyMs}ms</div>
                          {entry.errorMessage ? <div className={`mt-2 text-xs ${textSecondary(theme)}`}>{entry.errorMessage}</div> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`text-sm font-semibold ${textPrimary(theme)}`}>最近 Trace</div>
                  {(detailItem.recentTraces?.length ?? 0) === 0 ? (
                    <div className={`mt-3 text-xs ${textMuted(theme)}`}>暂无最近链路证据。</div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {detailItem.recentTraces?.map((entry) => (
                        <button
                          key={entry.traceId}
                          type="button"
                          onClick={() => navigate(`${buildPath('admin', 'trace-center')}?traceId=${encodeURIComponent(entry.traceId)}`)}
                          className={`w-full rounded-xl border px-3 py-3 text-left ${isDark ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-white'}`}
                        >
                          <div className={`text-sm font-medium ${textPrimary(theme)}`}>{entry.rootDisplayName || entry.rootResourceCode || entry.rootOperation}</div>
                          <div className={`mt-1 text-xs font-mono ${textMuted(theme)}`}>{entry.traceId}</div>
                          <div className={`mt-2 text-xs ${textSecondary(theme)}`}>{entry.spanCount} spans · {entry.durationMs}ms</div>
                          {entry.firstErrorMessage ? <div className={`mt-2 text-xs ${textSecondary(theme)}`}>{entry.firstErrorMessage}</div> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`text-sm font-semibold ${textPrimary(theme)}`}>最近告警</div>
                  {(detailItem.recentAlerts?.length ?? 0) === 0 ? (
                    <div className={`mt-3 text-xs ${textMuted(theme)}`}>暂无最近告警证据。</div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {detailItem.recentAlerts?.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => navigate(`${buildPath('admin', 'alert-center')}?detailId=${encodeURIComponent(entry.id)}`)}
                          className={`w-full rounded-xl border px-3 py-3 text-left ${isDark ? 'border-white/10 bg-slate-950/40' : 'border-slate-200 bg-white'}`}
                        >
                          <div className={`text-sm font-medium ${textPrimary(theme)}`}>{entry.ruleName || '--'}</div>
                          <div className={`mt-1 text-xs ${textMuted(theme)}`}>{entry.severity} / {entry.status}</div>
                          <div className={`mt-2 text-xs ${textSecondary(theme)}`}>{entry.message || '--'}</div>
                          <div className={`mt-2 text-xs ${textMuted(theme)}`}>{formatDateTime(entry.firedAt)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </BentoCard>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={policyItem != null}
        onClose={() => setPolicyResourceId(null)}
        theme={theme}
        size="xl"
        title={policyItem ? `健康治理策略 · ${policyItem.displayName}` : '健康治理策略'}
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setPolicyResourceId(null)}>取消</button>
            <button type="button" className={btnPrimary} onClick={() => void savePolicy()} disabled={saving}>保存</button>
          </>
        )}
      >
        <div className={`${pageBlockStack} min-h-0`}>
          <div className={`text-xs ${textSecondary(theme)}`}>
            `probeStrategy` 和 `checkType` 由后端按资源类型固化，这里只编辑运行策略、熔断阈值以及 canary 配置。
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>间隔(s)</label>
              <input className={inputCls} value={draft.intervalSec} onChange={(event) => setDraft((prev) => ({ ...prev, intervalSec: event.target.value }))} />
            </div>
            <div>
              <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>健康阈值</label>
              <input className={inputCls} value={draft.healthyThreshold} onChange={(event) => setDraft((prev) => ({ ...prev, healthyThreshold: event.target.value }))} />
            </div>
            <div>
              <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>超时(s)</label>
              <input className={inputCls} value={draft.timeoutSec} onChange={(event) => setDraft((prev) => ({ ...prev, timeoutSec: event.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>失败阈值</label>
              <input className={inputCls} value={draft.failureThreshold} onChange={(event) => setDraft((prev) => ({ ...prev, failureThreshold: event.target.value }))} />
            </div>
            <div>
              <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>熔断时长(s)</label>
              <input className={inputCls} value={draft.openDurationSec} onChange={(event) => setDraft((prev) => ({ ...prev, openDurationSec: event.target.value }))} />
            </div>
            <div>
              <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>半开最大调用</label>
              <input className={inputCls} value={draft.halfOpenMaxCalls} onChange={(event) => setDraft((prev) => ({ ...prev, halfOpenMaxCalls: event.target.value }))} />
            </div>
          </div>
          <div>
            <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>降级资源编码</label>
            <input className={inputCls} value={draft.fallbackResourceCode} onChange={(event) => setDraft((prev) => ({ ...prev, fallbackResourceCode: event.target.value }))} />
          </div>
          <div>
            <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>降级提示</label>
            <textarea className={`${inputCls} min-h-24`} value={draft.fallbackMessage} onChange={(event) => setDraft((prev) => ({ ...prev, fallbackMessage: event.target.value }))} />
          </div>
          <div>
            <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>Probe config JSON</label>
            <textarea className={`${inputCls} min-h-32 font-mono text-xs`} value={draft.probeConfigText} onChange={(event) => setDraft((prev) => ({ ...prev, probeConfigText: event.target.value }))} />
          </div>
          <div>
            <label className={`mb-1.5 block text-sm ${textSecondary(theme)}`}>Canary payload JSON</label>
            <textarea className={`${inputCls} min-h-32 font-mono text-xs`} value={draft.canaryPayloadText} onChange={(event) => setDraft((prev) => ({ ...prev, canaryPayloadText: event.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={evidenceViewer != null}
        onClose={() => setEvidenceViewer(null)}
        theme={theme}
        size="xl"
        title={evidenceViewer?.title ?? '查看内容'}
      >
        <pre className={`overflow-x-auto rounded-xl p-4 text-xs ${isDark ? 'bg-white/[0.04] text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
          {evidenceViewer?.content}
        </pre>
      </Modal>
    </MgmtPageShell>
  );
};

