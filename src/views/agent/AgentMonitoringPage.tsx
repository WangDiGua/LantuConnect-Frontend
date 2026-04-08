import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { LineChart, Activity } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { FilterSelect, SearchInput } from '../../components/common';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import { monitoringService } from '../../api/services/monitoring.service';
import type { CallSummaryByResourceRow, KpiMetric, PerformanceMetric } from '../../types/dto/monitoring';
import { useQualityHistory } from '../../hooks/queries/useMonitoring';
import {
  kpiGridGap, pageBlockStack,
  textPrimary, textSecondary, textMuted,
  tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { LantuDateTimePicker } from '../../components/common/LantuDateTimePicker';
import { nativeInputClass } from '../../utils/formFieldClasses';

interface AgentMonitoringPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

interface LatencyRow {
  agentName: string;
  p50: number;
  p99: number;
  qps: number;
  errors: number;
}

const PAGE_SIZE = 20;
const GLOW: Array<'indigo' | 'emerald' | 'amber' | 'rose'> = ['indigo', 'emerald', 'amber', 'rose'];

const QUALITY_RESOURCE_TYPE_OPTIONS = [
  { value: 'agent', label: 'Agent' },
  { value: 'skill', label: 'Skill' },
  { value: 'mcp', label: 'MCP' },
  { value: 'app', label: 'App' },
  { value: 'dataset', label: 'Dataset' },
] as const;

const PAGE_DESC =
  '网关层 KPI、近 24 小时按小时的吞吐/延迟曲线、五类资源调用占比与按资源维度的质量历史。';

const PERF_RESOURCE_OPTIONS = [
  { value: 'all', label: '全部资源类型' },
  ...QUALITY_RESOURCE_TYPE_OPTIONS,
  { value: 'unknown', label: '未分类' },
] as const;

function resourceSummaryLabel(type: string): string {
  const t = type.toLowerCase();
  const hit = QUALITY_RESOURCE_TYPE_OPTIONS.find((o) => o.value === t);
  if (hit) return hit.label;
  if (t === 'unknown') return '未分类';
  return type || '—';
}

export const AgentMonitoringPage: React.FC<AgentMonitoringPageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [kpis, setKpis] = useState<KpiMetric[]>([]);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetric[]>([]);
  const [callSummaryByResource, setCallSummaryByResource] = useState<CallSummaryByResourceRow[]>([]);
  const [perfResourceType, setPerfResourceType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [qualityResourceType, setQualityResourceType] = useState<string>('agent');
  const [qualityResourceId, setQualityResourceId] = useState('');
  const [qualityFrom, setQualityFrom] = useState('');
  const [qualityTo, setQualityTo] = useState('');
  const resolvedQualityResourceId = Number(qualityResourceId);
  const qualityQ = useQualityHistory(
    qualityResourceType,
    Number.isFinite(resolvedQualityResourceId) && resolvedQualityResourceId > 0 ? resolvedQualityResourceId : 0,
    qualityFrom ? `${qualityFrom.replace('T', ' ')}:00` : undefined,
    qualityTo ? `${qualityTo.replace('T', ' ')}:00` : undefined,
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const perfRt = perfResourceType === 'all' ? undefined : perfResourceType;
      const [kpiResult, perfResult, summaryResult] = await Promise.all([
        monitoringService.getKpis(),
        monitoringService.getPerformanceMetrics(perfRt),
        monitoringService.getCallSummaryByResource(24),
      ]);
      setKpis(kpiResult);
      setPerfMetrics(perfResult);
      setCallSummaryByResource(summaryResult);
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
      showMessage?.('监控数据加载失败，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
  }, [perfResourceType, showMessage]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const latencyRows: LatencyRow[] = useMemo(() => {
    return perfMetrics.map((m, i) => ({
      agentName: `服务节点 ${i + 1}`,
      p50: m.latencyP50 ?? m.p50Latency,
      p99: m.latencyP99 ?? m.p99Latency,
      qps: Math.round(m.requestRate),
      errors: Math.round(m.errorRate * 100),
    }));
  }, [perfMetrics]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return latencyRows;
    return latencyRows.filter((r) => r.agentName.toLowerCase().includes(t));
  }, [q, latencyRows]);

  const rows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const maxP99 = Math.max(...latencyRows.map((r) => r.p99), 1);

  const monitoringToolbar = (
    <div className="w-full max-w-md sm:ml-auto">
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="按名称筛选…"
        theme={theme}
        ariaLabel="按节点名称筛选监控表格"
      />
    </div>
  );

  const maxSummaryCalls = Math.max(...callSummaryByResource.map((r) => r.calls), 1);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={LineChart}
      breadcrumbSegments={['资源与运营', '运行监控']}
      description={PAGE_DESC}
      toolbar={monitoringToolbar}
      contentScroll="document"
    >
      <div className={`px-4 sm:px-6 pb-8 ${pageBlockStack}`}>
        {loading && kpis.length === 0 ? (
          <PageSkeleton type="chart" />
        ) : (
          <>
            {/* KPI Cards */}
            <div className={`grid grid-cols-2 lg:grid-cols-4 ${kpiGridGap}`}>
              {kpis.slice(0, 4).map((k, i) => (
                <KpiCard
                  key={k.name}
                  theme={theme}
                  label={k.label}
                  value={k.unit && !String(k.value).endsWith(k.unit) ? `${k.value} ${k.unit}` : k.value}
                  trend={k.trend}
                  trendType={k.changeType}
                  previousValue={k.previousValue}
                  glow={GLOW[i % 4]}
                  delay={i * 0.06}
                />
              ))}
            </div>

            <BentoCard theme={theme}>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>近 24h 调用分布（按资源类型）</h3>
                  <p className={`mt-1 text-xs leading-relaxed ${textMuted(theme)}`}>
                    与 <span className="font-mono">GET /monitoring/call-summary-by-resource</span>{' '}
                    一致；未带类型的历史请求归入「未分类」。
                  </p>
                </div>
                <div className="w-full sm:w-56 shrink-0">
                  <p className={`mb-1 text-xs font-medium ${textSecondary(theme)}`}>性能曲线筛选（网关日志）</p>
                  <FilterSelect
                    value={perfResourceType}
                    onChange={setPerfResourceType}
                    options={[...PERF_RESOURCE_OPTIONS]}
                    theme={theme}
                  />
                </div>
              </div>
              {callSummaryByResource.length === 0 ? (
                <p className={`text-sm ${textMuted(theme)}`}>暂无近 24 小时调用，可先执行仓库内 sql/seed_resource_ops_demo.sql 注入演示数据。</p>
              ) : (
                <ul className="space-y-3" aria-label="各资源类型调用量">
                  {callSummaryByResource.map((row) => (
                    <li key={row.type} className="flex items-center gap-3">
                      <span className={`w-24 shrink-0 text-xs sm:w-28 ${textSecondary(theme)}`}>
                        {resourceSummaryLabel(row.type)}
                      </span>
                      <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                        <div
                          className="h-full rounded-full bg-indigo-500/90 dark:bg-indigo-400/90"
                          style={{ width: `${Math.min(100, (row.calls / maxSummaryCalls) * 100)}%` }}
                        />
                      </div>
                      <span className={`w-28 shrink-0 text-right text-xs font-mono tabular-nums ${textMuted(theme)}`}>
                        {row.calls} 次 · 失败 {row.errors} · 均延 {row.avgLatencyMs}ms
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </BentoCard>

            {/* P99 Bar Chart */}
            <BentoCard theme={theme}>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className={textMuted(theme)} aria-hidden />
                <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>按小时桶的延迟均值（示意 P99）</h3>
              </div>
              <p className={`mb-3 text-xs ${textMuted(theme)}`}>
                数据来自当前筛选条件下的调用日志聚合；每条为整点小时桶。
              </p>
              <div className="space-y-3">
                {filtered.slice(0, 5).map((r) => (
                  <div key={r.agentName} className="flex items-center gap-3">
                    <span className={`text-xs w-32 sm:w-40 truncate shrink-0 ${textSecondary(theme)}`}>{r.agentName}</span>
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                      <div className="h-full rounded-full bg-neutral-800/90" style={{ width: `${Math.min(100, (r.p99 / maxP99) * 100)}%` }} />
                    </div>
                    <span className={`text-xs font-mono tabular-nums w-14 text-right ${textMuted(theme)}`}>{r.p99} ms</span>
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* Data Table */}
            <BentoCard theme={theme} padding="sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {['Agent', 'P50', 'P99', 'QPS', '错误数(1h)'].map((h) => (
                        <th key={h} className={tableHeadCell(theme)}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.agentName} className={tableBodyRow(theme, i)}>
                        <td className={`${tableCell()} max-w-[200px]`}><span className={`block truncate font-medium ${textPrimary(theme)}`} title={r.agentName}>{r.agentName}</span></td>
                        <td className={`${tableCell()} whitespace-nowrap`}><span className={`tabular-nums ${textSecondary(theme)}`}>{r.p50}</span></td>
                        <td className={`${tableCell()} whitespace-nowrap`}><span className={`tabular-nums ${r.p99 > 500 ? 'text-amber-500 font-semibold' : textSecondary(theme)}`}>{r.p99}</span></td>
                        <td className={`${tableCell()} whitespace-nowrap`}><span className={`tabular-nums ${textSecondary(theme)}`}>{r.qps}</span></td>
                        <td className={`${tableCell()} whitespace-nowrap`}><span className={`tabular-nums ${r.errors > 5 ? 'text-rose-500 font-semibold' : textSecondary(theme)}`}>{r.errors}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BentoCard>

            <BentoCard theme={theme}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>质量历史（按资源）</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-28">
                    <FilterSelect
                      value={qualityResourceType}
                      onChange={setQualityResourceType}
                      options={[...QUALITY_RESOURCE_TYPE_OPTIONS]}
                      theme={theme}
                    />
                  </div>
                  <div className="w-24 min-w-0">
                    <input
                      className={`${nativeInputClass(theme)} min-h-[2rem] px-2.5 py-1.5 text-xs`}
                      placeholder="资源ID"
                      value={qualityResourceId}
                      onChange={(e) => setQualityResourceId(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <LantuDateTimePicker
                    theme={theme}
                    mode="datetime"
                    compact
                    value={qualityFrom}
                    onChange={setQualityFrom}
                    className="w-[158px]"
                    placeholder="开始时间"
                    ariaLabel="质量历史开始时间"
                  />
                  <LantuDateTimePicker
                    theme={theme}
                    mode="datetime"
                    compact
                    value={qualityTo}
                    onChange={setQualityTo}
                    className="w-[158px]"
                    placeholder="结束时间"
                    ariaLabel="质量历史结束时间"
                  />
                </div>
              </div>
              <p className={`mb-2 text-xs leading-relaxed ${textMuted(theme)}`}>
                统计统一网关 invoke 写入的调用日志。迁移后新数据带 <span className="font-mono">resource_type</span>；
                旧库中无类型字段的记录仅在类型选「Agent」时与历史行为一致一并统计。
              </p>
              {qualityQ.isLoading ? (
                <PageSkeleton type="table" rows={3} />
              ) : qualityQ.data && qualityQ.data.length > 0 ? (
                <div className="space-y-1">
                  {qualityQ.data.slice(-8).map((p) => (
                    <div key={p.bucketTime} className={`flex items-center justify-between text-xs ${textSecondary(theme)}`}>
                      <span>{p.bucketTime}</span>
                      <span>score {p.qualityScore}</span>
                      <span>success {(p.successRate * 100).toFixed(1)}%</span>
                      <span>latency {p.avgLatencyMs}ms</span>
                      <span>calls {p.callCount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-xs ${textMuted(theme)}`}>输入资源 ID 后可查看质量趋势</p>
              )}
            </BentoCard>
          </>
        )}
      </div>
    </MgmtPageShell>
  );
};
