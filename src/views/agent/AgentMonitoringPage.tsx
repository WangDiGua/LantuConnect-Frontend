import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { LineChart, Activity, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { TOOLBAR_ROW } from '../../utils/toolbarFieldClasses';
import { DataTable, SearchInput, type Column } from '../../components/common';
import { monitoringService } from '../../api/services/monitoring.service';
import type { KpiMetric, PerformanceMetric } from '../../types/dto/monitoring';

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

export const AgentMonitoringPage: React.FC<AgentMonitoringPageProps> = ({ theme, fontSize }) => {
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
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['Agent 管理', 'Agent监控']}
      titleIcon={LineChart}
      description="各 Agent 调用 QPS、延迟分位与错误概况"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="flex-1 min-w-0 sm:max-w-md">
            <SearchInput value={q} onChange={setQ} placeholder="按名称筛选…" theme={theme} />
          </div>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1 space-y-6">
        {loading && kpis.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {kpis.slice(0, 4).map((k) => (
                <div
                  key={k.id}
                  className={`rounded-2xl border p-4 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50/80 border-slate-200/80'}`}
                >
                  <div className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    {k.label}
                  </div>
                  <div className={`mt-2 text-2xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {k.value}
                    {k.unit && <span className="text-sm font-medium text-slate-500 ml-0.5">{k.unit}</span>}
                  </div>
                  <div
                    className={`mt-1 text-xs font-medium flex items-center gap-0.5 ${
                      k.up ? (isDark ? 'text-amber-400' : 'text-amber-600') : isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  >
                    {k.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {typeof k.delta === 'number' ? `${k.delta > 0 ? '+' : ''}${k.delta}%` : k.delta}
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-white'}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>P99 延迟对比</h3>
              </div>
              <div className="space-y-3">
                {filtered.slice(0, 5).map((r) => (
                  <div key={r.agentName} className="flex items-center gap-3">
                    <span className={`text-xs w-32 sm:w-40 truncate shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {r.agentName}
                    </span>
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                      <div
                        className="h-full rounded-full bg-blue-500/90"
                        style={{ width: `${Math.min(100, (r.p99 / maxP99) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums w-14 text-right text-slate-500">{r.p99} ms</span>
                  </div>
                ))}
              </div>
            </div>

            <DataTable
              columns={[
                { key: 'agentName', label: 'Agent', render: (value) => <span className="font-medium">{value}</span> },
                { key: 'p50', label: 'P50', align: 'right', render: (value) => <span className="tabular-nums">{value}</span> },
                { key: 'p99', label: 'P99', align: 'right', render: (value) => <span className="tabular-nums">{value}</span> },
                { key: 'qps', label: 'QPS', align: 'right', render: (value) => <span className="tabular-nums">{value}</span> },
                { key: 'errors', label: '错误数(1h)', align: 'right', render: (value) => <span className="tabular-nums">{value}</span> },
              ]}
              data={rows}
              theme={theme}
              pagination={filtered.length > 0 ? { currentPage: page, totalPages: Math.ceil(filtered.length / PAGE_SIZE), onPageChange: setPage, pageSize: PAGE_SIZE } : undefined}
            />
          </>
        )}
      </div>
    </MgmtPageShell>
  );
};
