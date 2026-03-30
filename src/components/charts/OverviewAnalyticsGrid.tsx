import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Theme } from '../../types';
import { EChartCard } from './EChartCard';
import { chartColors, baseGrid, baseTooltip, baseAxis, baseLegend } from './echartsTheme';

interface OverviewAnalyticsGridProps {
  theme: Theme;
}

/** 概览页：多图并列，调用量 / 成功率 / 分布 / 雷达能力 */
export const OverviewAnalyticsGrid: React.FC<OverviewAnalyticsGridProps> = ({ theme }) => {
  const c = chartColors(theme);
  const axis = baseAxis(theme);

  const lineOption = useMemo<EChartsOption>(
    () => ({
      title: { text: '近 7 日 API 调用', left: 12, top: 8, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      grid: baseGrid(),
      tooltip: baseTooltip(theme),
      legend: { ...baseLegend(theme), data: ['对话', '工作流'] },
      xAxis: { ...axis.category, data: ['一', '二', '三', '四', '五', '六', '日'] },
      yAxis: { ...axis.value, name: '万次' },
      series: [
        {
          name: '对话',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.08 },
          data: [12, 15, 13, 18, 22, 20, 24],
        },
        {
          name: '工作流',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.08 },
          data: [4, 5, 6, 5, 7, 8, 9],
        },
      ],
    }),
    [theme, c, axis]
  );

  const barOption = useMemo<EChartsOption>(
    () => ({
      title: { text: '模型调用占比', left: 12, top: 8, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      grid: baseGrid(),
      tooltip: { ...baseTooltip(theme), trigger: 'axis' },
      xAxis: { ...axis.category, data: ['gpt-4o', '文心', '通义', 'Claude', '本地'] },
      yAxis: { ...axis.value, name: '%' },
      series: [{ type: 'bar', data: [38, 22, 18, 14, 8], barMaxWidth: 28, itemStyle: { borderRadius: [6, 6, 0, 0] } }],
    }),
    [theme, c, axis]
  );

  const pieOption = useMemo<EChartsOption>(
    () => ({
      title: { text: '请求结果分布', left: 12, top: 8, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      tooltip: { trigger: 'item' },
      legend: { ...baseLegend(theme), bottom: 4, top: 'auto', left: 'center' },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '54%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: theme === 'dark' ? '#1C1C1E' : '#fff', borderWidth: 2 },
          label: { color: c.muted, fontSize: 11 },
          data: [
            { value: 842, name: '2xx 成功' },
            { value: 42, name: '4xx 客户端' },
            { value: 12, name: '5xx 服务端' },
            { value: 8, name: '超时' },
          ],
        },
      ],
    }),
    [theme, c]
  );

  const radarOption = useMemo<EChartsOption>(
    () => ({
      title: { text: '平台健康度（演示）', left: 12, top: 8, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: [c.series[0]],
      tooltip: {},
      radar: {
        indicator: [
          { name: '可用性', max: 100 },
          { name: '延迟', max: 100 },
          { name: '饱和度', max: 100 },
          { name: '错误率', max: 100 },
          { name: '成本', max: 100 },
        ],
        splitLine: { lineStyle: { color: c.border } },
        splitArea: { show: false },
        axisName: { color: c.muted, fontSize: 11 },
      },
      series: [{ type: 'radar', data: [{ value: [92, 78, 65, 88, 72], name: '本周' }] }],
    }),
    [theme, c]
  );

  return (
    <section aria-label="数据概览图表">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>运行态势</h2>
        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>ECharts · 演示数据</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EChartCard theme={theme} option={lineOption} minHeight={260} aria-label="七日调用折线图" />
        <EChartCard theme={theme} option={barOption} minHeight={260} aria-label="模型占比柱状图" />
        <EChartCard theme={theme} option={pieOption} minHeight={280} aria-label="结果分布饼图" />
        <EChartCard theme={theme} option={radarOption} minHeight={280} aria-label="健康度雷达图" />
      </div>
    </section>
  );
};
