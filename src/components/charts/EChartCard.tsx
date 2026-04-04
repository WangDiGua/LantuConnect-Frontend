import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { EChartsType } from 'echarts/core';
import type { EChartsOption } from 'echarts';
import { Theme } from '../../types';
import { chartMotion } from './echartsTheme';

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
    { LegacyGridContainLabel },
  ] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
    import('echarts/features'),
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
      LegacyGridContainLabel,
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
  /** 与探索页 HubStatCard 相同的边框与阴影（仅探索页等场景开启） */
  hubStatSurface?: boolean;
}

/**
 * 可复用 ECharts 卡片：自动 resize、dispose，符合 §1 圆角 Surface。
 */
export const EChartCard: React.FC<EChartCardProps> = (props) => {
  const {
    theme,
    option,
    className = '',
    minHeight = 220,
    'aria-label': ariaLabel,
  } = props;
  const useHubStatSurface = props.hubStatSurface === true;

  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const resolvedOption = useMemo(
    () => ({ ...option, ...chartMotion(reducedMotion) }) as EChartsOption,
    [option, reducedMotion],
  );

  useEffect(() => {
    let cancelled = false;
    loadECharts().then((echartsMod) => {
      if (cancelled || !hostRef.current) return;
      if (!chartRef.current) {
        chartRef.current = echartsMod.init(hostRef.current, undefined, { renderer: 'canvas' });
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !chartRef.current) return;
    chartRef.current.setOption(resolvedOption, true);
  }, [resolvedOption, isLoading]);

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
  const shell = useHubStatSurface
    ? `rounded-[24px] border overflow-hidden motion-reduce:transition-none ${
        isDark
          ? 'border-white/10 bg-lantu-card shadow-[0_2px_10px_rgba(0,0,0,0.2)]'
          : 'border-slate-200/50 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.07)]'
      }`
    : `rounded-[24px] border shadow-none overflow-hidden ${
        isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200/50 bg-white'
      }`;
  return (
    <div className={`${shell} ${className}`}>
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
