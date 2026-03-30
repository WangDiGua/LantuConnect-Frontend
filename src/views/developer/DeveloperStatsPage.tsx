import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, Zap, Clock, AlertTriangle, Key, RefreshCw, Loader2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { EChartsOption } from 'echarts';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { developerStatsService } from '../../api/services/developer-stats.service';
import type { DeveloperStatistics } from '../../types/dto/explore';
import { bentoCard, canvasBodyBg, mainScrollCompositorClass, textPrimary, textMuted } from '../../utils/uiClasses';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { PageError } from '../../components/common/PageError';
import { EChartCard } from '../../components/charts/EChartCard';
import { baseAxis, baseGrid, baseLegend, baseTooltip, chartColors } from '../../components/charts/echartsTheme';

interface Props { theme: Theme; fontSize: FontSize; }

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export const DeveloperStatsPage: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeveloperStatistics | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await developerStatsService.getMyStatistics();
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e : new Error('统计数据加载失败'));
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tp = textPrimary(theme);
  const tm = textMuted(theme);
  const cardSurface = bentoCard(theme);
  const c = chartColors(theme);
  const axis = baseAxis(theme);
  const callsByDay = data?.callsByDay ?? [];
  const topResources = data?.topResources ?? [];
  const apiKeyUsage = data?.apiKeyUsage ?? [];

  const trendOption = useMemo<EChartsOption>(() => {
    const xData = callsByDay.map((d) => (d.date.length >= 10 ? d.date.slice(5) : d.date));
    const yData = callsByDay.map((d) => d.calls);
    return {
      title: { text: '调用趋势（近 7 天）', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      grid: baseGrid(),
      color: [c.series[0]],
      tooltip: baseTooltip(theme),
      xAxis: { ...axis.category, data: xData },
      yAxis: { ...axis.value, minInterval: 1 },
      series: [{ name: '调用次数', type: 'line', smooth: true, data: yData, areaStyle: { opacity: 0.12 } }],
    };
  }, [axis.category, axis.value, c.series, c.text, callsByDay, theme]);

  const topResourcesOption = useMemo((): EChartsOption => {
    const list = [...topResources].sort((a, b) => b.calls - a.calls).slice(0, 8);
    return {
      title: { text: '热门资源', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      grid: { ...baseGrid(), left: '6%', right: '6%', bottom: '4%' },
      color: [c.series[1]],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      xAxis: { ...axis.value, minInterval: 1 },
      yAxis: { ...axis.category, type: 'category', data: list.map((item) => item.name), inverse: true },
      series: [
        {
          name: '调用次数',
          type: 'bar',
          data: list.map((item) => item.calls),
          barMaxWidth: 14,
          itemStyle: { borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: 'right', color: c.muted, fontSize: 11 },
        },
      ],
    } as EChartsOption;
  }, [axis.category, axis.value, c.muted, c.series, c.text, topResources]);

  const apiKeyUsageOption = useMemo<EChartsOption>(() => {
    const list = [...apiKeyUsage].sort((a, b) => b.calls - a.calls).slice(0, 8);
    return {
      title: { text: 'API Key 使用', left: 10, top: 6, textStyle: { fontSize: 13, fontWeight: 600, color: c.text } },
      grid: { ...baseGrid(), left: '5%', right: '5%', bottom: '4%' },
      color: [c.series[2]],
      tooltip: baseTooltip(theme),
      legend: { ...baseLegend(theme), data: ['调用次数'] },
      xAxis: {
        ...axis.category,
        data: list.map((item) => `${item.keyPrefix}***`),
        axisLabel: {
          ...(axis.category && typeof axis.category === 'object' ? (axis.category as any).axisLabel : {}),
          formatter: (value: string) => (value.length > 14 ? `${value.slice(0, 14)}...` : value),
        },
      },
      yAxis: { ...axis.value, minInterval: 1 },
      series: [
        {
          name: '调用次数',
          type: 'bar',
          data: list.map((item) => item.calls),
          barMaxWidth: 18,
          itemStyle: { borderRadius: [6, 6, 0, 0] },
        },
      ],
    };
  }, [apiKeyUsage, axis.category, axis.value, c.series, c.text, theme]);

  if (loading) return <div className={`flex-1 ${canvasBodyBg(theme)} ${outerPad} py-6`}><PageSkeleton type="cards" /></div>;
  if (error) return <div className={`flex-1 ${canvasBodyBg(theme)} ${outerPad} py-6`}><PageError error={error} onRetry={fetchData} /></div>;
  if (!data) return <div className={`flex-1 ${canvasBodyBg(theme)} ${outerPad} py-6`}><EmptyState title="暂无统计数据" description="开始使用 API 后，统计数据将在此展示" /></div>;

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${outerPad} py-4 sm:py-6 ${canvasBodyBg(theme)}`}>
      <div className="w-full space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${tp}`}>开发者统计</h1>
            <p className={`text-sm ${tm}`}>你的 API 调用数据概览</p>
          </div>
          <button type="button" onClick={fetchData} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`}>
            <RefreshCw size={16} className={tm} />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '总调用量', value: formatNum(data.totalCalls), icon: Zap, color: 'text-neutral-800' },
            { label: '今日调用', value: formatNum(data.todayCalls), icon: TrendingUp, color: 'text-blue-500' },
            { label: '平均延迟', value: `${data.avgLatencyMs}ms`, icon: Clock, color: 'text-emerald-500' },
            { label: '错误率', value: `${data.errorRate.toFixed(1)}%`, icon: AlertTriangle, color: 'text-rose-500' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.03 }}
              className={`${cardSurface} p-5`}>
              <kpi.icon size={18} className={`${tm} mb-3`} />
              <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
              <div className={`text-xs font-medium mt-1 ${tm}`}>{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Call Trend */}
        {data.callsByDay.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.12 }}>
            <EChartCard theme={theme} option={trendOption} minHeight={260} aria-label="开发者调用趋势图" />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Resources */}
          {data.topResources.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }}>
              <EChartCard theme={theme} option={topResourcesOption} minHeight={280} aria-label="开发者热门资源图" />
            </motion.div>
          )}

          {/* API Key Usage */}
          {data.apiKeyUsage.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.18 }}>
              <EChartCard theme={theme} option={apiKeyUsageOption} minHeight={280} aria-label="开发者 API Key 使用图" />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
