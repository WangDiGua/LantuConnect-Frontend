import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, Users, Zap, CheckCircle2, Layers, Activity } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { dashboardService } from '../../api/services/dashboard.service';
import type { DataReportsData } from '../../types/dto/dashboard';
import {
  canvasBodyBg, consoleContentTopPad, mainScrollCompositorClass,
  textPrimary, textSecondary, textMuted, tableHeadCell, tableBodyRow, tableCell, btnSecondary,
} from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { KpiCard } from '../../components/common/KpiCard';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { LantuDateTimePicker } from '../../components/common/LantuDateTimePicker';
import { RESOURCE_TYPE_LABEL } from '../../constants/resourceTypes';
import type { DataReportResourceRow } from '../../types/dto/dashboard';

type TimeRange = 'today' | '7d' | '30d' | '90d' | 'custom';

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

export const DataReportsPage: React.FC<DataReportsPageProps> = ({ theme, fontSize: _fontSize }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<DataReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async (range: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = range === 'custom' ? { startDate: customStart, endDate: customEnd } : undefined;
      const result = await dashboardService.getDataReports(range, params);
      setData(result);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载数据报表失败'));
    } finally {
      setLoading(false);
    }
  }, [customStart, customEnd]);

  useEffect(() => {
    if (timeRange === 'custom' && customStart && customEnd) {
      fetchData('custom');
    } else if (timeRange !== 'custom') {
      fetchData(timeRange);
    }
  }, [timeRange, customStart, customEnd, fetchData]);

  const topAgents = data?.topAgents ?? [];
  const topSkills = data?.topSkills ?? [];
  const topMcps = data?.topMcps ?? [];
  const topApps = data?.topApps ?? [];
  const topDatasets = data?.topDatasets ?? [];
  const topAll = data?.topResources ?? [];
  const byType = data?.callsByResourceType ?? [];
  const methodBreakdown = data?.methodBreakdown ?? [];
  const deptStats = data?.departmentUsage ?? [];

  const totalCalls = useMemo(
    () => (byType.length > 0 ? byType.reduce((s, a) => s + a.calls, 0) : topAll.reduce((s, a) => s + a.calls, 0)),
    [byType, topAll],
  );
  const weightedSuccess = useMemo(() => {
    if (byType.length === 0) return 0;
    const w = byType.reduce((s, t) => s + t.calls * t.successRate, 0);
    const c = byType.reduce((s, t) => s + t.calls, 0);
    return c > 0 ? w / c : 0;
  }, [byType]);
  const totalUsers = deptStats.reduce((s, d) => s + d.users, 0);

  const bars = useMemo(
    () => byType.map((t) => ({ label: RESOURCE_TYPE_LABEL[t.type] ?? t.type, value: t.calls })),
    [byType],
  );
  const maxBar = useMemo(() => Math.max(...bars.map((b) => b.value), 1), [bars]);

  const miniTable = (title: string, rows: DataReportResourceRow[]) =>
    rows.length === 0 ? null : (
      <BentoCard theme={theme} padding="sm" className="!p-0 overflow-hidden">
        <div className={`px-4 py-3 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        </div>
        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={tableHeadCell(theme)}>资源</th>
                <th className={`${tableHeadCell(theme)} text-right`}>调用</th>
                <th className={`${tableHeadCell(theme)} text-right`}>成功率</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={`${a.name}-${i}`} className={tableBodyRow(theme, i)}>
                  <td className={tableCell()}><span className={`font-medium truncate block max-w-[200px] ${textPrimary(theme)}`}>{a.name}</span></td>
                  <td className={`${tableCell()} text-right tabular-nums ${textSecondary(theme)}`}>{a.calls.toLocaleString()}</td>
                  <td className={`${tableCell()} text-right tabular-nums ${textMuted(theme)}`}>{a.successRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BentoCard>
    );

  const timeButtons: { label: string; value: TimeRange }[] = [
    { label: '今天', value: 'today' },
    { label: '近7天', value: '7d' },
    { label: '近30天', value: '30d' },
    { label: '近90天', value: '90d' },
  ];

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 ${consoleContentTopPad} pb-4 sm:pb-6 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass}`}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex flex-wrap items-center justify-between gap-3 mb-5 shrink-0"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2.5 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
              <BarChart3 size={22} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
            </div>
            <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '数据报表'} tagline="按统一资源类型（智能体 / 技能 / MCP / 应用 / 数据集）与网关路径汇总调用数据" />
          </div>
        </motion.div>

        {/* Time Range Selector */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.05 }}
          className="mb-5 shrink-0"
        >
          <BentoCard theme={theme}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">时间范围</span>
              <div className={`flex gap-1.5 p-1 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100'}`}>
                {timeButtons.map((tb) => (
                  <button
                    key={tb.value}
                    type="button"
                    onClick={() => setTimeRange(tb.value)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      timeRange === tb.value
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
              <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
              <div className="flex items-center gap-2">
                <LantuDateTimePicker
                  theme={theme}
                  mode="date"
                  value={customStart}
                  onChange={(next) => { setCustomStart(next); setTimeRange('custom'); }}
                  className="w-[160px]"
                  placeholder="开始日期"
                  ariaLabel="开始日期"
                />
                <span className={`text-xs ${textMuted(theme)}`}>至</span>
                <LantuDateTimePicker
                  theme={theme}
                  mode="date"
                  value={customEnd}
                  onChange={(next) => { setCustomEnd(next); setTimeRange('custom'); }}
                  className="w-[160px]"
                  placeholder="结束日期"
                  ariaLabel="结束日期"
                />
              </div>
            </div>
          </BentoCard>
        </motion.div>

        {loading && !data ? (
          <PageSkeleton type="chart" />
        ) : loadError ? (
          <PageError error={loadError} onRetry={() => fetchData(timeRange)} retryLabel="重试加载数据报表" />
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5 shrink-0">
              {[
                { label: '总调用次数', value: totalCalls.toLocaleString(), icon: <Zap size={16} />, glow: 'indigo' as const },
                { label: '加权成功率', value: `${weightedSuccess.toFixed(1)}%`, icon: <CheckCircle2 size={16} />, glow: 'emerald' as const },
                { label: '有流量资源类型数', value: String(byType.filter((t) => t.calls > 0).length), icon: <Layers size={16} />, glow: 'rose' as const },
                { label: '活跃用户数（按院系）', value: totalUsers.toLocaleString(), icon: <Users size={16} />, glow: 'amber' as const },
                { label: '院系分组数', value: String(deptStats.length), icon: <Activity size={16} />, glow: 'indigo' as const },
              ].map((item, i) => (
                <KpiCard
                  key={item.label}
                  theme={theme}
                  label={item.label}
                  value={item.value}
                  icon={item.icon}
                  glow={item.glow}
                  delay={0.1 + i * 0.05}
                />
              ))}
            </div>

            {/* Trend Chart + Top 5 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
                className="lg:col-span-2"
              >
                <BentoCard theme={theme}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">按资源类型调用分布</h3>
                  {bars.length > 0 ? (
                    <div className="flex items-end gap-2 h-48">
                      {bars.map((bar, i) => {
                        const pct = maxBar > 0 ? (bar.value / maxBar) * 100 : 0;
                        return (
                          <motion.div
                            key={bar.label}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.25 + i * 0.04 }}
                            className="flex-1 flex flex-col items-center gap-1 h-full justify-end origin-bottom"
                          >
                            <span className={`text-xs font-medium tabular-nums ${textMuted(theme)}`}>
                              {bar.value.toLocaleString()}
                            </span>
                            <div
                              className="w-full rounded-t-lg bg-gradient-to-t from-neutral-800 to-neutral-600 transition-all duration-500"
                              style={{ height: `${Math.max(pct, 4)}%` }}
                            />
                            <span className={`text-xs text-center leading-tight px-0.5 ${textMuted(theme)}`}>{bar.label}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={`text-sm ${textMuted(theme)}`}>当前时间范围内暂无按类型聚合的调用数据</p>
                  )}
                </BentoCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.25 }}
              >
                <BentoCard theme={theme}>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">全类型 Top 5 资源</h3>
                  <div className="space-y-3">
                    {topAll.slice(0, 5).map((agent, i) => (
                      <div key={`${agent.name}-${i}`} className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${textPrimary(theme)}`}>{agent.name}</div>
                          <div className={`text-[10px] ${textMuted(theme)}`}>
                            {agent.resourceType ? (RESOURCE_TYPE_LABEL[agent.resourceType] ?? agent.resourceType) : '—'}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                              <div
                                className="h-full rounded-full bg-neutral-900 transition-all"
                                style={{ width: `${topAll[0]?.calls ? (agent.calls / topAll[0].calls) * 100 : 0}%` }}
                              />
                            </div>
                            <span className={`text-xs tabular-nums shrink-0 ${textMuted(theme)}`}>
                              {agent.calls.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </BentoCard>
              </motion.div>
            </div>

            {methodBreakdown.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.22 }} className="mb-5">
                <BentoCard theme={theme} padding="sm" className="!p-0 overflow-hidden">
                  <div className={`px-5 py-3.5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">按网关路径（method）聚合</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className={tableHeadCell(theme)}>路径</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>请求数</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>平均延迟(ms)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {methodBreakdown.map((row, i) => (
                          <tr key={row.path} className={tableBodyRow(theme, i)}>
                            <td className={tableCell()}><span className={`font-mono text-xs ${textPrimary(theme)}`}>{row.path}</span></td>
                            <td className={`${tableCell()} text-right tabular-nums ${textSecondary(theme)}`}>{row.requests.toLocaleString()}</td>
                            <td className={`${tableCell()} text-right tabular-nums ${textMuted(theme)}`}>{row.avgLatencyMs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </BentoCard>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
              {miniTable('智能体 Top', topAgents)}
              {miniTable('技能 Top', topSkills)}
              {miniTable('MCP Top', topMcps)}
              {miniTable('应用 Top', topApps)}
              {miniTable('数据集 Top', topDatasets)}
            </div>

            {/* Department + Success Rate Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 }}
              >
                <BentoCard theme={theme} padding="sm" className="!p-0 overflow-hidden">
                  <div className={`px-5 py-3.5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">按部门统计</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className={tableHeadCell(theme)}>部门</th>
                          <th className={tableHeadCell(theme)}>用户数</th>
                          <th className={tableHeadCell(theme)}>总调用量</th>
                          <th className={tableHeadCell(theme)}>占比</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptStats.map((d, i) => {
                          const totalAll = deptStats.reduce((s, x) => s + x.calls, 0);
                          const pct = totalAll > 0 ? ((d.calls / totalAll) * 100).toFixed(1) : '0';
                          return (
                            <tr key={d.department} className={tableBodyRow(theme, i)}>
                              <td className={tableCell()}><span className={`whitespace-nowrap font-medium ${textPrimary(theme)}`}>{d.department}</span></td>
                              <td className={`${tableCell()} whitespace-nowrap tabular-nums ${textSecondary(theme)}`}>{d.users}</td>
                              <td className={`${tableCell()} whitespace-nowrap tabular-nums ${textSecondary(theme)}`}>{d.calls.toLocaleString()}</td>
                              <td className={tableCell()}>
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className={`flex-1 h-1.5 rounded-full max-w-[60px] ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                                    <div className="h-full rounded-full bg-neutral-900" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className={`shrink-0 whitespace-nowrap text-xs tabular-nums ${textMuted(theme)}`}>{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </BentoCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.35 }}
              >
                <BentoCard theme={theme} padding="sm" className="!p-0 overflow-hidden">
                  <div className={`px-5 py-3.5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">全部热门资源成功率</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className={tableHeadCell(theme)}>资源</th>
                          <th className={tableHeadCell(theme)}>调用次数</th>
                          <th className={tableHeadCell(theme)}>成功率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topAll.map((a, i) => (
                          <tr key={`${a.name}-${i}`} className={tableBodyRow(theme, i)}>
                            <td className={tableCell()}>
                              <span className={`whitespace-nowrap font-medium ${textPrimary(theme)}`}>{a.name}</span>
                              <span className={`ml-2 text-xs ${textMuted(theme)}`}>
                                {a.resourceType ? (RESOURCE_TYPE_LABEL[a.resourceType] ?? a.resourceType) : ''}
                              </span>
                            </td>
                            <td className={`${tableCell()} whitespace-nowrap tabular-nums ${textSecondary(theme)}`}>{a.calls.toLocaleString()}</td>
                            <td className={`${tableCell()} whitespace-nowrap tabular-nums ${textSecondary(theme)}`}>{a.successRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </BentoCard>
              </motion.div>
            </div>

            {/* Export */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.4 }}
              className="mb-4 shrink-0"
            >
              <BentoCard theme={theme}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">数据导出</span>
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date().toISOString().slice(0, 10);
                      const rows = [
                        ['资源类型', '调用次数', '成功率(%)'],
                        ...byType.map((t) => [RESOURCE_TYPE_LABEL[t.type] ?? t.type, String(t.calls), String(t.successRate)]),
                        [],
                        ['资源', '类型', '调用', '成功率(%)'],
                        ...topAll.map((a) => [a.name, a.resourceType ?? '', String(a.calls), String(a.successRate)]),
                        [],
                        ['部门', '用户数', '调用量'],
                        ...deptStats.map((d) => [d.department, String(d.users), String(d.calls)]),
                      ];
                      const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
                      triggerDownload(csv, `report-${date}.csv`, 'text/csv;charset=utf-8');
                    }}
                    className={`${btnSecondary(theme)} gap-1.5`}
                  >
                    <Download size={14} />
                    导出 CSV
                  </button>
                </div>
              </BentoCard>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};
