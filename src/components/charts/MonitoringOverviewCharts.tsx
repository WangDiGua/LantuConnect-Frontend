import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Theme } from '../../types';
import type { CallSummaryByResourceRow, PerformanceMetric } from '../../types/dto/monitoring';
import { RESOURCE_TYPE_LABEL, RESOURCE_TYPE_ORDER } from '../../constants/resourceTypes';
import { EChartCard } from './EChartCard';
import {
  barSeriesColumnStyle,
  baseAxis,
  baseGrid,
  baseLegend,
  baseTooltip,
  chartColors,
  lineSeriesTrendStyle,
  withAlpha,
} from './echartsTheme';

interface MonitoringOverviewChartsProps {
  theme: Theme;
  performance: PerformanceMetric[];
  /** 近 N 小时按统一资源类型汇总（与后端 /monitoring/call-summary-by-resource 对齐） */
  resourceMix?: CallSummaryByResourceRow[];
}

function buildResourceMixSeries(mix: CallSummaryByResourceRow[] | undefined) {
  const byType = new Map((mix ?? []).map((r) => [r.type, r]));
  const ordered = RESOURCE_TYPE_ORDER.map((t) => ({
    type: t,
    label: RESOURCE_TYPE_LABEL[t] ?? t,
    calls: byType.get(t)?.calls ?? 0,
    errors: byType.get(t)?.errors ?? 0,
  }));
  const std = new Set<string>([...RESOURCE_TYPE_ORDER]);
  const extra = (mix ?? []).filter((r) => !std.has(r.type));
  const tail = extra.map((r) => ({
    type: r.type,
    label: RESOURCE_TYPE_LABEL[r.type] ?? (r.type === 'unknown' ? '未分类' : r.type),
    calls: r.calls,
    errors: r.errors,
  }));
  return [...ordered, ...tail];
}

/** 监控概览页：多图并列（真实数据） */
export const MonitoringOverviewCharts: React.FC<MonitoringOverviewChartsProps> = ({ theme, performance, resourceMix }) => {
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
          ...barSeriesColumnStyle(theme, c.series[0], withAlpha(c.series[0], 0.5), [5, 5, 0, 0], 14),
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
        {
          name: 'P50',
          data: perf12.map((p) => Number(p.p50Latency ?? p.latencyP50 ?? 0)),
          ...lineSeriesTrendStyle(theme, c.series[0], true),
        },
        {
          name: 'P99',
          data: perf12.map((p) => Number(p.p99Latency ?? p.latencyP99 ?? 0)),
          ...lineSeriesTrendStyle(theme, c.series[1] ?? c.series[0], false),
        },
      ],
    }),
    [theme, c, axis, perf12, axisLabels]
  );

  const mixSeries = useMemo(() => buildResourceMixSeries(resourceMix), [resourceMix]);

  const resourceMixOption = useMemo<EChartsOption>(
    () => ({
      title: {
        text: '近 24h 调用 · 按资源类型',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: c.text },
      },
      color: [c.series[0], withAlpha(c.series[2] ?? c.series[0], 0.65)],
      tooltip: { ...baseTooltip(theme), trigger: 'axis' },
      legend: { ...baseLegend(theme), data: ['调用量', '失败数'] },
      grid: { ...baseGrid(), top: 52 },
      xAxis: {
        ...axis.category,
        data: mixSeries.map((x) => x.label),
        axisLabel: { color: c.muted, fontSize: 11, interval: 0, rotate: mixSeries.length > 5 ? 24 : 0 },
      },
      yAxis: { ...axis.value },
      series: [
        {
          name: '调用量',
          type: 'bar',
          data: mixSeries.map((x) => x.calls),
          ...barSeriesColumnStyle(theme, c.series[0], withAlpha(c.series[0], 0.5), [5, 5, 0, 0], 14),
        },
        {
          name: '失败数',
          type: 'bar',
          data: mixSeries.map((x) => x.errors),
          ...barSeriesColumnStyle(theme, c.series[2] ?? c.series[1], withAlpha(c.series[2] ?? c.series[1], 0.45), [5, 5, 0, 0], 14),
        },
      ],
    }),
    [theme, c, axis, mixSeries],
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
      <EChartCard theme={theme} option={statusOption} minHeight={240} aria-label="成功与失败占比" />
      <div className="xl:col-span-3 min-w-0">
        <EChartCard theme={theme} option={resourceMixOption} minHeight={260} aria-label="按统一资源类型的调用与失败数" />
      </div>
      <div className="xl:col-span-3 min-w-0">
        <EChartCard theme={theme} option={latencyOption} minHeight={260} aria-label="延迟折线图" />
      </div>
    </div>
  );
};
