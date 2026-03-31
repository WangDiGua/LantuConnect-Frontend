import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Theme } from '../../types';
import type { PerformanceMetric } from '../../types/dto/monitoring';
import { EChartCard } from './EChartCard';
import { chartColors, baseGrid, baseTooltip, baseAxis, baseLegend } from './echartsTheme';

interface MonitoringOverviewChartsProps {
  theme: Theme;
  performance: PerformanceMetric[];
}

/** 监控概览页：多图并列（真实数据） */
export const MonitoringOverviewCharts: React.FC<MonitoringOverviewChartsProps> = ({ theme, performance }) => {
  const c = chartColors(theme);
  const axis = baseAxis(theme);
  const perf = performance ?? [];
  const perf12 = perf.slice(-12);
  const axisLabels = perf12.map((p, i) => {
    const raw = String(p.timestamp ?? '').trim();
    if (!raw) return `#${i + 1}`;
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) {
      return `${String(dt.getHours()).padStart(2, '0')}:00`;
    }
    return raw;
  });

  const volumeOption = useMemo<EChartsOption>(
    () => ({
      title: { text: '近 12 小时调用量', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: [c.series[0]],
      grid: baseGrid(),
      tooltip: baseTooltip(theme),
      xAxis: {
        ...axis.category,
        data: axisLabels,
      },
      yAxis: { ...axis.value },
      series: [
        {
          type: 'bar',
          data: perf12.map((p) => Math.max(0, Number(p.requestRate ?? 0))),
          barMaxWidth: 14,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        },
      ],
    }),
    [theme, c, axis, perf12, axisLabels]
  );

  const latencyOption = useMemo<EChartsOption>(
    () => ({
      title: { text: 'P50 / P99 延迟趋势', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      grid: baseGrid(),
      tooltip: baseTooltip(theme),
      legend: { ...baseLegend(theme), data: ['P50', 'P99'] },
      xAxis: { ...axis.category, data: axisLabels },
      yAxis: { ...axis.value, name: 'ms' },
      series: [
        { name: 'P50', type: 'line', smooth: true, data: perf12.map((p) => Number(p.p50Latency ?? p.latencyP50 ?? 0)) },
        { name: 'P99', type: 'line', smooth: true, data: perf12.map((p) => Number(p.p99Latency ?? p.latencyP99 ?? 0)) },
      ],
    }),
    [theme, c, axis, perf12, axisLabels]
  );

  const statusOption = useMemo<EChartsOption>(
    () => ({
      title: { text: '请求结果占比', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['36%', '62%'],
          center: ['50%', '56%'],
          label: { color: c.muted, fontSize: 11 },
          data: [
            { value: perf.reduce((sum, p) => sum + Math.max(0, Number(p.requestRate ?? 0) * (1 - Number(p.errorRate ?? 0))), 0), name: '成功' },
            { value: perf.reduce((sum, p) => sum + Math.max(0, Number(p.requestRate ?? 0) * Number(p.errorRate ?? 0)), 0), name: '失败' },
          ],
        },
      ],
    }),
    [theme, c, perf]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-w-0">
      <div className="xl:col-span-2 min-w-0">
        <EChartCard theme={theme} option={volumeOption} minHeight={240} aria-label="调用量柱状图" />
      </div>
      <EChartCard theme={theme} option={statusOption} minHeight={240} aria-label="状态码饼图" />
      <div className="xl:col-span-3 min-w-0">
        <EChartCard theme={theme} option={latencyOption} minHeight={260} aria-label="延迟折线图" />
      </div>
    </div>
  );
};
