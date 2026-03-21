import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Download, Clock, Users, Zap, CheckCircle2, Bot, Loader2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { dashboardService } from '../../api/services/dashboard.service';
import type { DataReportsData } from '../../types/dto/dashboard';

type TimeRange = 'today' | '7d' | '30d' | '90d' | 'custom';

function TrendBadge({ value, isDark, suffix = '%' }: { value: number; isDark: boolean; suffix?: string }) {
  const isUp = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
      {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {isUp ? '+' : ''}{value}{suffix}
    </span>
  );
}

export interface DataReportsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const DataReportsPage: React.FC<DataReportsPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<DataReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (range: string) => {
    setLoading(true);
    try {
      const result = await dashboardService.getDataReports(range);
      setData(result);
    } catch (err) {
      console.error('Failed to load data reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(timeRange === 'custom' ? '30d' : timeRange);
  }, [timeRange, fetchData]);

  const topAgents = data?.topAgents ?? [];
  const deptStats = data?.departmentUsage ?? [];

  const totalCalls = topAgents.reduce((s, a) => s + a.calls, 0);
  const avgSuccess = topAgents.length > 0 ? (topAgents.reduce((s, a) => s + a.successRate, 0) / topAgents.length) : 0;
  const totalUsers = deptStats.reduce((s, d) => s + d.users, 0);

  const bars = topAgents.slice(0, 7).map(a => ({ label: a.name.slice(0, 4), value: a.calls }));
  const maxBar = useMemo(() => Math.max(...bars.map((b) => b.value), 1), [bars]);

  const cardClass = `rounded-2xl border p-5 ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`;
  const thClass = `pb-3 pr-4 text-left text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`;
  const tdClass = `py-2.5 pr-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`;
  const trBorder = `border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`;
  const inputClass = `px-3 py-2 rounded-xl text-sm border outline-none ${
    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
  }`;

  const timeButtons: { label: string; value: TimeRange }[] = [
    { label: '今天', value: 'today' },
    { label: '近7天', value: '7d' },
    { label: '近30天', value: '30d' },
    { label: '近90天', value: '90d' },
  ];

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
              <BarChart3 size={22} className="text-indigo-500" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>数据报表</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                平台调用统计、用户活跃分析与趋势报表
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Time Range */}
        <div className={`${cardClass} mb-4 shrink-0`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>时间范围</span>
            <div className="flex gap-2">
              {timeButtons.map((tb) => (
                <button
                  key={tb.value}
                  type="button"
                  onClick={() => setTimeRange(tb.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    timeRange === tb.value
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>
            <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setTimeRange('custom'); }}
                className={inputClass}
              />
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>至</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setTimeRange('custom'); }}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Section 2: KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4 shrink-0">
              {[
                { label: '总调用次数', value: totalCalls.toLocaleString(), trend: 0, icon: Zap, color: 'text-blue-500' },
                { label: '平均成功率', value: `${avgSuccess.toFixed(1)}%`, trend: 0, icon: CheckCircle2, color: 'text-emerald-500' },
                { label: 'Top Agent 数', value: String(topAgents.length), trend: 0, icon: Bot, color: 'text-pink-500' },
                { label: '活跃用户数', value: totalUsers.toLocaleString(), trend: 0, icon: Users, color: 'text-violet-500' },
                { label: '部门数', value: String(deptStats.length), trend: 0, icon: Clock, color: 'text-amber-500' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={cardClass}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={16} className={item.color} />
                      <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                    </div>
                    <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Section 3: Trend Chart + Top Agents */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className={`${cardClass} lg:col-span-2`}>
                <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>调用趋势</h3>
                <div className="flex items-end gap-2 h-48">
                  {bars.map((bar, i) => {
                    const pct = maxBar > 0 ? (bar.value / maxBar) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className={`text-[10px] font-medium tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {bar.value.toLocaleString()}
                        </span>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        />
                        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{bar.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={cardClass}>
                <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>调用量 Top 5</h3>
                <div className="space-y-3">
                  {topAgents.slice(0, 5).map((agent, i) => (
                    <div key={agent.name} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{agent.name}</div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${topAgents[0]?.calls ? (agent.calls / topAgents[0].calls) * 100 : 0}%` }}
                            />
                          </div>
                          <span className={`text-[10px] tabular-nums shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {agent.calls.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 4: Department Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className={cardClass}>
                <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>按部门统计</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={thClass}>部门</th>
                        <th className={thClass}>用户数</th>
                        <th className={thClass}>总调用量</th>
                        <th className={thClass}>占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deptStats.map((d) => {
                        const totalAll = deptStats.reduce((s, x) => s + x.calls, 0);
                        const pct = totalAll > 0 ? ((d.calls / totalAll) * 100).toFixed(1) : '0';
                        return (
                          <tr key={d.department} className={trBorder}>
                            <td className={tdClass}><span className="font-medium">{d.department}</span></td>
                            <td className={`${tdClass} tabular-nums`}>{d.users}</td>
                            <td className={`${tdClass} tabular-nums`}>{d.calls.toLocaleString()}</td>
                            <td className={tdClass}>
                              <div className="flex items-center gap-2">
                                <div className={`flex-1 h-1.5 rounded-full max-w-[60px] ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className={`text-xs tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={cardClass}>
                <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Agent 成功率</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={thClass}>Agent 名称</th>
                        <th className={thClass}>调用次数</th>
                        <th className={thClass}>成功率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topAgents.map((a) => (
                        <tr key={a.name} className={trBorder}>
                          <td className={tdClass}><span className="font-medium">{a.name}</span></td>
                          <td className={`${tdClass} tabular-nums`}>{a.calls.toLocaleString()}</td>
                          <td className={`${tdClass} tabular-nums`}>{a.successRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Section 5: Export */}
            <div className={`${cardClass} mb-4 shrink-0`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>数据导出</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date().toISOString().slice(0, 10);
                      const rows = [
                        ['Agent名称', '调用次数', '成功率(%)'],
                        ...topAgents.map((a) => [a.name, String(a.calls), String(a.successRate)]),
                        [],
                        ['部门', '用户数', '调用量'],
                        ...deptStats.map((d) => [d.department, String(d.users), String(d.calls)]),
                      ];
                      const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
                      triggerDownload(csv, `report-${date}.csv`, 'text/csv;charset=utf-8');
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Download size={14} />
                    导出 CSV
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
