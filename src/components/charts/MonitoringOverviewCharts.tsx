import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Theme } from '../../types';
import { EChartCard } from './EChartCard';
import { chartColors, baseGrid, baseTooltip, baseAxis, baseLegend } from './echartsTheme';

interface MonitoringOverviewChartsProps {
  theme: Theme;
}

/** 监控概览页：多图并列（替换原 CSS 柱状示意） */
export const MonitoringOverviewCharts: React.FC<MonitoringOverviewChartsProps> = ({ theme }) => {
  const c = chartColors(theme);
  const axis = baseAxis(theme);

  const volumeOption = useMemo<EChartsOption>(
    () => ({
      title: { text: '近 12 小时调用量', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: [c.series[0]],
      grid: baseGrid(),
      tooltip: baseTooltip(theme),
      xAxis: {
        ...axis.category,
        data: Array.from({ length: 12 }, (_, i) => `${i + 1}h`),
      },
      yAxis: { ...axis.value },
      series: [
        {
          type: 'bar',
          data: [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88],
          barMaxWidth: 14,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
        },
      ],
    }),
    [theme, c, axis]
  );

  const latencyOption = useMemo<EChartsOption>(
    () => ({
      title: { text: 'P50 / P99 延迟趋势', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      grid: baseGrid(),
      tooltip: baseTooltip(theme),
      legend: { ...baseLegend(theme), data: ['P50', 'P99'] },
      xAxis: { ...axis.category, data: ['一', '二', '三', '四', '五', '六', '日'] },
      yAxis: { ...axis.value, name: 'ms' },
      series: [
        { name: 'P50', type: 'line', smooth: true, data: [120, 132, 128, 140, 135, 142, 138] },
        { name: 'P99', type: 'line', smooth: true, data: [820, 910, 780, 1020, 890, 950, 880] },
      ],
    }),
    [theme, c, axis]
  );

  const statusOption = useMemo<EChartsOption>(
    () => ({
      title: { text: '状态码占比', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['36%', '62%'],
          center: ['50%', '56%'],
          label: { color: c.muted, fontSize: 11 },
          data: [
            { value: 9420, name: '2xx' },
            { value: 320, name: '4xx' },
            { value: 48, name: '5xx' },
          ],
        },
      ],
    }),
    [theme, c]
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
