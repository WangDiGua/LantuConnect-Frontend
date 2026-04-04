import type { Theme } from '../../types';
import type { EChartsOption } from 'echarts';

const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export function chartColors(theme: Theme): { text: string; muted: string; border: string; bg: string; series: string[] } {
  const isDark = theme === 'dark';
  return {
    text: isDark ? '#e2e8f0' : '#334155',
    muted: isDark ? '#64748b' : '#94a3b8',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)',
    bg: isDark ? 'transparent' : 'transparent',
    series: palette,
  };
}

/** 与 prefers-reduced-motion 配合：在 EChartCard 中并入 option */
export function chartMotion(
  reducedMotion: boolean,
): Pick<EChartsOption, 'animation' | 'animationDuration' | 'animationDurationUpdate' | 'animationEasing'> {
  if (reducedMotion) {
    return {
      animation: false,
      animationDuration: 0,
      animationDurationUpdate: 0,
      animationEasing: 'linear',
    };
  }
  return {
    animation: true,
    animationDuration: 720,
    animationDurationUpdate: 360,
    animationEasing: 'cubicOut',
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return Number.isFinite(r) ? { r, g, b } : null;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return Number.isFinite(r) ? { r, g, b } : null;
  }
  return null;
}

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('rgba') || color.startsWith('rgb(')) return color;
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/** 折线面积图常用垂直渐变（自上而下变淡） */
export function areaGradientFromSeriesColor(lineColor: string) {
  return {
    color: {
      type: 'linear' as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: withAlpha(lineColor, 0.28) },
        { offset: 1, color: withAlpha(lineColor, 0.04) },
      ],
    },
  };
}

/** 竖向柱条：圆角 + 可选纵向渐变 + hover 强调 */
export function barSeriesColumnStyle(
  theme: Theme,
  topColor: string,
  bottomColor: string,
  borderRadius: number | [number, number, number, number] = [8, 8, 0, 0],
  barMaxWidth = 20,
) {
  const isDark = theme === 'dark';
  return {
    barMaxWidth,
    itemStyle: {
      borderRadius,
      color: {
        type: 'linear' as const,
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: topColor },
          { offset: 1, color: bottomColor },
        ],
      },
    },
    emphasis: {
      focus: 'series' as const,
      itemStyle: {
        shadowBlur: isDark ? 14 : 10,
        shadowColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(15,23,42,0.12)',
      },
    },
  };
}

/** 折线：线宽、平滑、标记、面积渐变、强调 */
export function lineSeriesTrendStyle(theme: Theme, lineColor: string, fillArea = true) {
  const isDark = theme === 'dark';
  return {
    type: 'line' as const,
    smooth: true,
    symbol: 'circle' as const,
    symbolSize: 6,
    lineStyle: { width: 2.5, color: lineColor },
    itemStyle: { color: lineColor },
    ...(fillArea ? { areaStyle: areaGradientFromSeriesColor(lineColor) } : {}),
    emphasis: {
      focus: 'series' as const,
      lineStyle: { width: 3 },
      itemStyle: { borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.35)' : '#fff' },
    },
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
  const isDark = theme === 'dark';
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
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.07)' : c.border,
          type: 'dashed' as const,
        },
      },
    },
  };
}
