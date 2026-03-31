import type { Theme } from '../../types';
import type { EChartsOption } from 'echarts';

const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export function chartColors(theme: Theme): { text: string; muted: string; border: string; bg: string; series: string[] } {
  const isDark = theme === 'dark';
  return {
    text: isDark ? '#e2e8f0' : '#334155',
    muted: isDark ? '#64748b' : '#94a3b8',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    bg: isDark ? 'transparent' : 'transparent',
    series: palette,
  };
}

/** ECharts 6 替代 `grid.containLabel: true`（官方类型中的等价配置）。 */
export function baseGrid(): EChartsOption['grid'] {
  return {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: 48,
    outerBoundsMode: 'same',
    outerBoundsContain: 'axisLabel',
  };
}

export function baseTooltip(theme: Theme): EChartsOption['tooltip'] {
  const c = chartColors(theme);
  return {
    trigger: 'axis',
    backgroundColor: theme === 'dark' ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.98)',
    borderColor: c.border,
    borderWidth: 1,
    textStyle: { color: c.text, fontSize: 12 },
  };
}

export function baseLegend(theme: Theme): EChartsOption['legend'] {
  const c = chartColors(theme);
  return {
    textStyle: { color: c.muted, fontSize: 11 },
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 16,
    top: 4,
  };
}

export function baseAxis(theme: Theme): { category: EChartsOption['xAxis']; value: EChartsOption['yAxis'] } {
  const c = chartColors(theme);
  const axisLine = { lineStyle: { color: c.border } };
  const axisLabel = { color: c.muted, fontSize: 11 };
  return {
    category: {
      type: 'category',
      axisLine: axisLine,
      axisTick: { show: false },
      axisLabel,
      splitLine: { show: false },
    },
    value: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel,
      splitLine: { lineStyle: { color: c.border, type: 'dashed' as const } },
    },
  };
}
