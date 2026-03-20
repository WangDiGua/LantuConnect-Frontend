import React, { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, FunnelChart, RadarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  RadarComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsType } from 'echarts/core';
import type { EChartsOption } from 'echarts';
import { Theme } from '../../types';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  FunnelChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  RadarComponent,
  CanvasRenderer,
]);

export interface EChartCardProps {
  theme: Theme;
  option: EChartsOption;
  className?: string;
  /** 图表区域最小高度 */
  minHeight?: number;
  'aria-label'?: string;
}

/**
 * 可复用 ECharts 卡片：自动 resize、dispose，符合 §1 圆角 Surface。
 */
export const EChartCard: React.FC<EChartCardProps> = ({
  theme,
  option,
  className = '',
  minHeight = 220,
  'aria-label': ariaLabel,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  const apply = useCallback(() => {
    const el = hostRef.current;
    if (!el) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(el, undefined, { renderer: 'canvas' });
    }
    chartRef.current.setOption(option, true);
  }, [option]);

  useEffect(() => {
    apply();
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [apply]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isDark = theme === 'dark';
  return (
    <div
      className={`rounded-2xl border shadow-none overflow-hidden ${
        isDark ? 'border-white/10 bg-[#1C1C1E]' : 'border-slate-200/80 bg-white'
      } ${className}`}
    >
      <div
        ref={hostRef}
        style={{ minHeight, height: minHeight }}
        className="w-full"
        role="img"
        aria-label={ariaLabel ?? '数据图表'}
      />
    </div>
  );
};
