import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { LineChart, Activity } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { FilterSelect, SearchInput } from '../../components/common';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import { monitoringService } from '../../api/services/monitoring.service';
import type { KpiMetric, PerformanceMetric } from '../../types/dto/monitoring';
import { useQualityHistory } from '../../hooks/queries/useMonitoring';
import {
  canvasBodyBg, textPrimary, textSecondary, textMuted,
  tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { PageSkeleton } from '../../components/common/PageSkeleton';

interface AgentMonitoringPageProps {
  theme: Theme;
  fontSize: FontSize;
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

export const AgentMonitoringPage: React.FC<AgentMonitoringPageProps> = ({ theme }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [kpis, setKpis] = useState<KpiMetric[]>([]);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetric[]>([]);
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
      const [kpiResult, perfResult] = await Promise.all([
        monitoringService.getKpis(),
        monitoringService.getPerformanceMetrics(),
      ]);
      setKpis(kpiResult);
      setPerfMetrics(perfResult);
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
              <LineChart size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '运行监控'} tagline="各 Agent 调用 QPS、延迟分位与错误概况" />
          </div>
          <div className="w-full shrink-0 sm:max-w-xs">
            <SearchInput value={q} onChange={setQ} placeholder="按名称筛选…" theme={theme} />
          </div>
        </div>

        {loading && kpis.length === 0 ? (
          <PageSkeleton type="chart" />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

            {/* P99 Bar Chart */}
            <BentoCard theme={theme}>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className={textMuted(theme)} />
                <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>P99 延迟对比</h3>
              </div>
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
                  <input
                    className={`rounded-lg border px-2 py-1 text-xs ${theme === 'dark' ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
                    placeholder="资源ID"
                    value={qualityResourceId}
                    onChange={(e) => setQualityResourceId(e.target.value)}
                  />
                  <input
                    type="datetime-local"
                    className={`rounded-lg border px-2 py-1 text-xs ${theme === 'dark' ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
                    value={qualityFrom}
                    onChange={(e) => setQualityFrom(e.target.value)}
                  />
                  <input
                    type="datetime-local"
                    className={`rounded-lg border px-2 py-1 text-xs ${theme === 'dark' ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}
                    value={qualityTo}
                    onChange={(e) => setQualityTo(e.target.value)}
                  />
                </div>
              </div>
              <p className={`mb-2 text-[11px] leading-relaxed ${textMuted(theme)}`}>
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
    </div>
  );
};
