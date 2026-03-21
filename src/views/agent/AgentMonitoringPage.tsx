import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { LineChart, Activity, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { SearchInput } from '../../components/common';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import { monitoringService } from '../../api/services/monitoring.service';
import type { KpiMetric, PerformanceMetric } from '../../types/dto/monitoring';
import {
  pageBg, textPrimary, textSecondary, textMuted,
  tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';

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

export const AgentMonitoringPage: React.FC<AgentMonitoringPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [kpis, setKpis] = useState<KpiMetric[]>([]);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
              <LineChart size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>Agent 监控</h1>
              <p className={`text-xs ${textMuted(theme)}`}>各 Agent 调用 QPS、延迟分位与错误概况</p>
            </div>
          </div>
          <div className="w-full sm:max-w-xs">
            <SearchInput value={q} onChange={setQ} placeholder="按名称筛选…" theme={theme} />
          </div>
        </div>

        {loading && kpis.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {kpis.slice(0, 4).map((k, i) => (
                <KpiCard
                  key={k.id}
                  theme={theme}
                  label={k.label}
                  value={`${k.value}${k.unit ? ` ${k.unit}` : ''}`}
                  trend={typeof k.delta === 'number' ? k.delta : undefined}
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
                      <div className="h-full rounded-full bg-indigo-500/90" style={{ width: `${Math.min(100, (r.p99 / maxP99) * 100)}%` }} />
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
                        <td className={tableCell()}><span className={`font-medium ${textPrimary(theme)}`}>{r.agentName}</span></td>
                        <td className={tableCell()}><span className={`tabular-nums ${textSecondary(theme)}`}>{r.p50}</span></td>
                        <td className={tableCell()}><span className={`tabular-nums ${r.p99 > 500 ? 'text-amber-500 font-semibold' : textSecondary(theme)}`}>{r.p99}</span></td>
                        <td className={tableCell()}><span className={`tabular-nums ${textSecondary(theme)}`}>{r.qps}</span></td>
                        <td className={tableCell()}><span className={`tabular-nums ${r.errors > 5 ? 'text-rose-500 font-semibold' : textSecondary(theme)}`}>{r.errors}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BentoCard>
          </>
        )}
      </div>
    </div>
  );
};
