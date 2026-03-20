import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { EChartsType } from 'echarts/core';
import type { EChartsOption } from 'echarts';
import { Theme } from '../../types';

// 动态导入echarts以优化初始加载性能
let echartsInstance: any = null;
let echartsInitialized = false;

async function loadECharts() {
  if (echartsInstance) return echartsInstance;
  
  const [
    echartsCore,
    { LineChart, BarChart, PieChart, FunnelChart, RadarChart },
    {
      GridComponent,
      TooltipComponent,
      LegendComponent,
      TitleComponent,
      DataZoomComponent,
      RadarComponent,
    },
    { CanvasRenderer },
  ] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ]);

  const echarts = echartsCore as any;
  
  if (!echartsInitialized) {
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
    echartsInitialized = true;
  }
  
  echartsInstance = echarts;
  return echarts;
}

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadECharts().then((echarts) => {
      if (!mounted) return;
      setIsLoading(false);
      const el = hostRef.current;
      if (!el) return;
      if (!chartRef.current) {
        chartRef.current = echarts.init(el, undefined, { renderer: 'canvas' });
      }
      chartRef.current.setOption(option, true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !chartRef.current) return;
    chartRef.current.setOption(option, true);
  }, [option, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading]);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
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
