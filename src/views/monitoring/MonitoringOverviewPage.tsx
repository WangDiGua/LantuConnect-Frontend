import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, Search, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { MonitoringOverviewCharts } from '../../components/charts/MonitoringOverviewCharts';
import { useAlerts, useMonitoringKpis, usePerformanceMetrics } from '../../hooks/queries/useMonitoring';
import { buildPath } from '../../constants/consoleRoutes';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import {
  canvasBodyBg, btnPrimary, btnGhost, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

interface MonitoringOverviewPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const MonitoringOverviewPage: React.FC<MonitoringOverviewPageProps> = ({ theme }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const kpisQ = useMonitoringKpis();
  const performanceQ = usePerformanceMetrics();
  const alertsQ = useAlerts({ page: 1, pageSize: 20 });

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        kpisQ.refetch();
        performanceQ.refetch();
      }, 5000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, kpisQ, performanceQ]);

  if (kpisQ.isLoading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
        <div className="w-full flex-1 min-h-0 px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
          <PageSkeleton type="cards" />
        </div>
      </div>
    );
  }

  if (kpisQ.isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
        <PageError error={kpisQ.error as Error} onRetry={() => kpisQ.refetch()} />
      </div>
    );
  }

  const kpis = kpisQ.data ?? [];
  const alertList = alertsQ.data?.list ?? [];
  const firingCount = alertList.filter((a) => a.status === 'firing').length;
  const resolvedCount = alertList.filter((a) => a.status === 'resolved').length;

  if (kpis.length === 0) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
        <EmptyState
          title="暂无监控数据"
          description="KPI 指标为空，请检查监控采集服务是否已启用。"
          action={
            <button type="button" onClick={() => kpisQ.refetch()} className={btnPrimary}>
              重新加载
            </button>
          }
        />
      </div>
    );
  }

  const GLOW: Array<'indigo' | 'emerald' | 'amber' | 'rose'> = ['indigo', 'emerald', 'amber', 'rose'];

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
              <Activity size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
            </div>
            <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '监控概览'} tagline="调用量、成功率与延迟趋势汇总" />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="toggle toggle-primary toggle-sm"
              />
              <span className={`text-xs font-medium ${textSecondary(theme)}`}>自动刷新</span>
            </label>
            <button
              type="button"
              onClick={() => {
                void kpisQ.refetch();
                void performanceQ.refetch();
              }}
              className={btnGhost(theme)}
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k, i) => (
            <KpiCard
              key={k.name}
              theme={theme}
              label={k.label}
              value={k.unit && !String(k.value).endsWith(k.unit) ? `${k.value} ${k.unit}` : k.value}
              trend={k.trend}
              trendType={k.changeType}
              previousValue={k.previousValue}
              glow={GLOW[i % 4]}
              delay={i * 0.06}
            />
          ))}
        </div>

        {/* Charts */}
        <BentoCard theme={theme}>
          <MonitoringOverviewCharts theme={theme} performance={performanceQ.data ?? []} />
        </BentoCard>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BentoCard theme={theme} hover glow="indigo">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
                <Search size={18} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${textPrimary(theme)}`}>调用日志</p>
                <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>按路径、状态码与延迟检索历史请求</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 text-xs text-neutral-800 hover:text-neutral-900"
              onClick={() => navigate(buildPath('admin', 'call-logs'))}
            >
              查看日志
            </button>
          </BentoCard>
          <BentoCard theme={theme} hover glow="emerald">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                <Shield size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${textPrimary(theme)}`}>告警管理</p>
                <div className={`text-xs mt-0.5 ${textMuted(theme)}`}>
                  {alertsQ.isLoading ? (
                    <span
                      className="inline-block h-3.5 w-44 max-w-full rounded-md animate-pulse bg-slate-200 dark:bg-white/10 align-middle"
                      aria-busy="true"
                      aria-label="加载告警摘要"
                    />
                  ) : (
                    `进行中 ${firingCount} 条 · 已恢复 ${resolvedCount} 条`
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 text-xs text-emerald-500 hover:text-emerald-600"
              onClick={() => navigate(buildPath('admin', 'alert-management'))}
            >
              进入告警管理
            </button>
          </BentoCard>
        </div>

        <p className={`text-xs ${textMuted(theme)}`}>
          <Activity size={12} className="inline mr-1 opacity-70" />
          KPI 与图表均来自监控服务实时数据。
        </p>
      </div>
    </div>
  );
};
