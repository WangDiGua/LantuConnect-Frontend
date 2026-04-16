import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Theme } from '../../types';
import type { CallSummaryByResourceRow, PerformanceBucket } from '../../types/dto/monitoring';
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
  performance: PerformanceBucket[];
  resourceMix?: CallSummaryByResourceRow[];
}

function buildResourceMixSeries(mix: CallSummaryByResourceRow[] | undefined) {
  const byType = new Map((mix ?? []).map((row) => [row.type, row]));
  const ordered = RESOURCE_TYPE_ORDER.map((type) => ({
    type,
    label: RESOURCE_TYPE_LABEL[type] ?? type,
    calls: byType.get(type)?.calls ?? 0,
    errors: byType.get(type)?.errors ?? 0,
  }));
  const standard = new Set<string>([...RESOURCE_TYPE_ORDER]);
  const extras = (mix ?? [])
    .filter((row) => !standard.has(row.type))
    .map((row) => ({
      type: row.type,
      label: RESOURCE_TYPE_LABEL[row.type] ?? (row.type === 'unknown' ? '未分类' : row.type),
      calls: row.calls,
      errors: row.errors,
    }));
  return [...ordered, ...extras];
}

export const MonitoringOverviewCharts: React.FC<MonitoringOverviewChartsProps> = ({
  theme,
  performance,
  resourceMix,
}) => {
  const colors = chartColors(theme);
  const axis = baseAxis(theme);
  const perf = performance ?? [];
  const perf12 = perf.slice(-12);
  const axisLabels = perf12.map((bucket, index) => {
    const raw = String(bucket.bucket ?? '').trim();
    if (!raw) return `#${index + 1}`;
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return raw.includes(':00:00')
        ? `${String(date.getHours()).padStart(2, '0')}:00`
        : `${date.getMonth() + 1}/${date.getDate()}`;
    }
    return raw;
  });

  const volumeOption = useMemo<EChartsOption>(
    () => ({
      title: {
        text: '近 12 个分桶请求量',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: colors.text },
      },
      color: [colors.series[0], colors.series[2] ?? colors.series[1]],
      grid: baseGrid(),
      tooltip: baseTooltip(theme),
      legend: { ...baseLegend(theme), data: ['请求数', '错误数'] },
      xAxis: {
        ...axis.category,
        data: axisLabels,
      },
      yAxis: { ...axis.value },
      series: [
        {
          name: '请求数',
          type: 'bar',
          data: perf12.map((item) => Math.max(0, Number(item.requestCount ?? 0))),
          ...barSeriesColumnStyle(theme, colors.series[0], withAlpha(colors.series[0], 0.5), [5, 5, 0, 0], 14),
        },
        {
          name: '错误数',
          type: 'line',
          data: perf12.map((item) => Math.max(0, Number(item.errorCount ?? 0))),
          ...lineSeriesTrendStyle(theme, colors.series[2] ?? colors.series[1], false),
        },
      ],
    }),
    [theme, colors, axis, perf12, axisLabels],
  );

  const latencyOption = useMemo<EChartsOption>(
    () => ({
      title: {
        text: 'P50 / P99 延迟趋势',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: colors.text },
      },
      color: colors.series,
      grid: baseGrid(),
      tooltip: baseTooltip(theme),
      legend: { ...baseLegend(theme), data: ['P50', 'P99'] },
      xAxis: { ...axis.category, data: axisLabels },
      yAxis: { ...axis.value, name: 'ms' },
      series: [
        {
          name: 'P50',
          data: perf12.map((item) => Number(item.p50LatencyMs ?? 0)),
          ...lineSeriesTrendStyle(theme, colors.series[0], true),
        },
        {
          name: 'P99',
          data: perf12.map((item) => Number(item.p99LatencyMs ?? 0)),
          ...lineSeriesTrendStyle(theme, colors.series[1] ?? colors.series[0], false),
        },
      ],
    }),
    [theme, colors, axis, perf12, axisLabels],
  );

  const mixSeries = useMemo(() => buildResourceMixSeries(resourceMix), [resourceMix]);

  const resourceMixOption = useMemo<EChartsOption>(
    () => ({
      title: {
        text: '近 24h 调用分布',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: colors.text },
      },
      color: [colors.series[0], withAlpha(colors.series[2] ?? colors.series[1], 0.65)],
      tooltip: { ...baseTooltip(theme), trigger: 'axis' },
      legend: { ...baseLegend(theme), data: ['调用量', '失败量'] },
      grid: { ...baseGrid(), top: 52 },
      xAxis: {
        ...axis.category,
        data: mixSeries.map((item) => item.label),
        axisLabel: {
          color: colors.muted,
          fontSize: 11,
          interval: 0,
          rotate: mixSeries.length > 5 ? 24 : 0,
        },
      },
      yAxis: { ...axis.value },
      series: [
        {
          name: '调用量',
          type: 'bar',
          data: mixSeries.map((item) => item.calls),
          ...barSeriesColumnStyle(theme, colors.series[0], withAlpha(colors.series[0], 0.5), [5, 5, 0, 0], 14),
        },
        {
          name: '失败量',
          type: 'bar',
          data: mixSeries.map((item) => item.errors),
          ...barSeriesColumnStyle(
            theme,
            colors.series[2] ?? colors.series[1],
            withAlpha(colors.series[2] ?? colors.series[1], 0.45),
            [5, 5, 0, 0],
            14,
          ),
        },
      ],
    }),
    [theme, colors, axis, mixSeries],
  );

  const statusOption = useMemo<EChartsOption>(
    () => ({
      title: {
        text: '请求结果占比',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: colors.text },
      },
      color: colors.series,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['36%', '62%'],
          center: ['50%', '56%'],
          label: { color: colors.muted, fontSize: 11 },
          data: [
            {
              value: perf.reduce((sum, item) => sum + Math.max(0, Number(item.successCount ?? 0)), 0),
              name: '成功',
            },
            {
              value: perf.reduce((sum, item) => sum + Math.max(0, Number(item.errorCount ?? 0)), 0),
              name: '失败',
            },
          ],
        },
      ],
    }),
    [theme, colors, perf],
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-w-0">
      <div className="xl:col-span-2 min-w-0">
        <EChartCard theme={theme} option={volumeOption} minHeight={240} aria-label="请求量图表" />
      </div>
      <EChartCard theme={theme} option={statusOption} minHeight={240} aria-label="结果占比图表" />
      <div className="xl:col-span-3 min-w-0">
        <EChartCard theme={theme} option={resourceMixOption} minHeight={260} aria-label="资源类型分布图表" />
      </div>
      <div className="xl:col-span-3 min-w-0">
        <EChartCard theme={theme} option={latencyOption} minHeight={260} aria-label="延迟趋势图表" />
      </div>
    </div>
  );
};
