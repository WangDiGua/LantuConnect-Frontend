import React, { useMemo, useState } from 'react';
import { LineChart, Search, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { AGENT_MONITOR_KPIS, MOCK_AGENT_LATENCY } from '../../constants/agentObservability';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';

interface AgentMonitoringPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const AgentMonitoringPage: React.FC<AgentMonitoringPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return MOCK_AGENT_LATENCY;
    return MOCK_AGENT_LATENCY.filter((r) => r.agentName.toLowerCase().includes(t));
  }, [q]);

  const maxP99 = Math.max(...MOCK_AGENT_LATENCY.map((r) => r.p99), 1);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['Agent 管理', 'Agent监控']}
      titleIcon={LineChart}
      description="各 Agent 调用 QPS、延迟分位与错误概况（演示数据，可对接真实观测后端）"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="按 Agent 名称筛选…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={toolbarSearchInputClass(theme)}
            />
          </div>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {AGENT_MONITOR_KPIS.map((k) => (
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
                {k.trend}
              </div>
            </div>
          ))}
        </div>

        <div
          className={`rounded-2xl border p-4 sm:p-5 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-white'}`}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>P99 延迟对比（示意）</h3>
          </div>
          <div className="space-y-3">
            {MOCK_AGENT_LATENCY.map((r) => (
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              <tr className={`border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <th className="py-2.5 text-left font-semibold">Agent</th>
                <th className="py-2.5 text-right font-semibold">P50</th>
                <th className="py-2.5 text-right font-semibold">P99</th>
                <th className="py-2.5 text-right font-semibold">QPS</th>
                <th className="py-2.5 text-right font-semibold">错误数(1h)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.agentName}
                  className={`border-b ${isDark ? 'border-white/5' : 'border-slate-100'} ${
                    isDark ? (idx % 2 === 1 ? 'bg-white/5' : '') : idx % 2 === 1 ? 'bg-slate-50/80' : ''
                  }`}
                >
                  <td className="py-3 font-medium">{r.agentName}</td>
                  <td className="py-3 text-right tabular-nums">{r.p50}</td>
                  <td className="py-3 text-right tabular-nums">{r.p99}</td>
                  <td className="py-3 text-right tabular-nums">{r.qps}</td>
                  <td className="py-3 text-right tabular-nums">{r.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MgmtPageShell>
  );
};
