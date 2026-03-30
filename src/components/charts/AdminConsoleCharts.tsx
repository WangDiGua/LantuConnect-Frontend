import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Theme } from '../../types';
import { EChartCard } from './EChartCard';
import { chartColors, baseGrid, baseTooltip, baseAxis, baseLegend } from './echartsTheme';

interface AdminConsoleChartsProps {
  theme: Theme;
  variant: 'resource' | 'usage';
}

/** 管理员「资源监控 / 使用统计」多图布局 */
export const AdminConsoleCharts: React.FC<AdminConsoleChartsProps> = ({ theme, variant }) => {
  const c = chartColors(theme);
  const axis = baseAxis(theme);

  const resourceOpts = useMemo(() => {
    const cpu: EChartsOption = {
      title: { text: '集群 CPU 占用', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: [c.series[0]],
      grid: baseGrid(),
      tooltip: baseTooltip(theme),
      xAxis: { ...axis.category, data: ['节点1', '节点2', '节点3', '节点4'] } as EChartsOption['xAxis'],
      yAxis: { ...axis.value, max: 100, name: '%' },
      series: [{ type: 'bar', data: [68, 54, 72, 41], barMaxWidth: 22, itemStyle: { borderRadius: [6, 6, 0, 0] } }],
    };
    const storage: EChartsOption = {
      title: { text: '存储与流量', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      tooltip: baseTooltip(theme),
      legend: baseLegend(theme),
      series: [
        {
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['50%', '55%'],
          label: { color: c.muted, fontSize: 11 },
          data: [
            { value: 41, name: '对象存储' },
            { value: 28, name: '块存储' },
            { value: 18, name: '归档' },
          ],
        },
      ],
    };
    return { cpu, storage };
  }, [theme, c, axis]);

  const usageOpts = useMemo(() => {
    const trend: EChartsOption = {
      title: { text: 'DAU / 调用趋势', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      grid: baseGrid(),
      tooltip: baseTooltip(theme),
      legend: { ...baseLegend(theme), data: ['DAU', '调用(万)'] },
      xAxis: { ...axis.category, data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] } as EChartsOption['xAxis'],
      yAxis: { ...axis.value },
      series: [
        { name: 'DAU', type: 'line', smooth: true, data: [3200, 3400, 3300, 3600, 3900, 2800, 2600] },
        { name: '调用(万)', type: 'line', smooth: true, yAxisIndex: 0, data: [112, 120, 118, 128, 135, 98, 92] },
      ],
    };
    const funnel: EChartsOption = {
      title: { text: '工作空间活跃占比', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      color: c.series,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'funnel',
          left: '8%',
          top: 48,
          bottom: 8,
          width: '84%',
          minSize: '12%',
          maxSize: '88%',
          sort: 'descending',
          gap: 4,
          label: { color: c.muted, fontSize: 11 },
          data: [
            { value: 100, name: '教务处' },
            { value: 78, name: '信息中心' },
            { value: 52, name: '科研平台' },
            { value: 30, name: '其他' },
          ],
        },
      ],
    };
    return { trend, funnel };
  }, [theme, c, axis]);

  if (variant === 'resource') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <EChartCard theme={theme} option={resourceOpts.cpu} minHeight={240} />
        <EChartCard theme={theme} option={resourceOpts.storage} minHeight={240} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <EChartCard theme={theme} option={usageOpts.trend} minHeight={260} />
      <EChartCard theme={theme} option={usageOpts.funnel} minHeight={260} />
    </div>
  );
};
