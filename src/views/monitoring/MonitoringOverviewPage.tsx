import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Search, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { MonitoringOverviewCharts } from '../../components/charts/MonitoringOverviewCharts';
import { useAlerts, useCallSummaryByResource, useMonitoringKpis, usePerformanceMetrics } from '../../hooks/queries/useMonitoring';
import { buildPath } from '../../constants/consoleRoutes';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import { btnGhost, kpiGridGap, pageBlockStack, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

const PAGE_DESC = '统一网关调用量、成功率、延迟与五类资源（智能体 / 技能 / MCP / 应用 / 数据集）分布汇总';
const BREADCRUMB = ['监控中心', '监控概览'] as const;

interface MonitoringOverviewPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const MonitoringOverviewPage: React.FC<MonitoringOverviewPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const kpisQ = useMonitoringKpis();
  const performanceQ = usePerformanceMetrics();
  const callMixQ = useCallSummaryByResource(24);
  const alertsQ = useAlerts({ page: 1, pageSize: 20 });

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        kpisQ.refetch();
        performanceQ.refetch();
        void callMixQ.refetch();
      }, 5000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, kpisQ, performanceQ, callMixQ]);

  const toolbar =
    !kpisQ.isLoading && !kpisQ.isError ? (
      <div className="flex flex-wrap items-center gap-2 w-full justify-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="toggle toggle-primary toggle-sm"
            aria-label="每 5 秒自动刷新 KPI 与性能数据"
          />
          <span className={`text-xs font-medium ${textSecondary(theme)}`}>自动刷新</span>
        </label>
        <button
          type="button"
          onClick={() => {
            void kpisQ.refetch();
            void performanceQ.refetch();
            void callMixQ.refetch();
            void alertsQ.refetch();
          }}
          className={btnGhost(theme)}
          aria-label="立即刷新监控数据"
        >
          <RefreshCw size={15} aria-hidden />
          刷新
        </button>
      </div>
    ) : undefined;

  const body = (() => {
    if (kpisQ.isLoading) {
      return <PageSkeleton type="cards" />;
    }
    if (kpisQ.isError) {
      return <PageError error={kpisQ.error as Error} onRetry={() => kpisQ.refetch()} />;
    }

    const kpis = kpisQ.data ?? [];
    const alertList = alertsQ.data?.list ?? [];
    const firingCount = alertList.filter((a) => a.status === 'firing').length;
    const resolvedCount = alertList.filter((a) => a.status === 'resolved').length;

    if (kpis.length === 0) {
      return (
        <EmptyState
          title="暂无监控数据"
          description="KPI 指标为空，请检查监控采集服务是否已启用。可点击页面右上角「刷新」重试加载。"
        />
      );
    }

    const GLOW: Array<'indigo' | 'emerald' | 'amber' | 'rose'> = ['indigo', 'emerald', 'amber', 'rose'];

    return (
      <div className={pageBlockStack}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <BentoCard theme={theme} hover glow="indigo">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
                <Search size={18} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${textPrimary(theme)}`}>调用日志</p>
                <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>按资源类型、路径、状态码与延迟检索网关调用</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 text-xs text-neutral-800 hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white"
              onClick={() => navigate(buildPath('admin', 'call-logs'))}
            >
              查看日志
            </button>
          </BentoCard>
          <BentoCard theme={theme} hover glow="emerald">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                <Shield size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${textPrimary(theme)}`}>告警中心</p>
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
              onClick={() => navigate(buildPath('admin', 'alert-center'))}
            >
              进入告警中心
            </button>
          </BentoCard>
        </div>

        <div className={`grid grid-cols-2 lg:grid-cols-4 ${kpiGridGap}`}>
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

        <BentoCard theme={theme}>
          <MonitoringOverviewCharts
            theme={theme}
            performance={performanceQ.data ?? []}
            resourceMix={callMixQ.data ?? []}
          />
        </BentoCard>

        <p className={`text-xs ${textMuted(theme)}`}>
          <Activity size={12} className="inline mr-1 opacity-70" aria-hidden />
          KPI 与图表来自调用日志聚合；资源类型分布覆盖智能体 / 技能 / MCP / 应用 / 数据集及未归类。
        </p>
      </div>
    );
  })();

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={Activity}
      breadcrumbSegments={BREADCRUMB}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8">{body}</div>
    </MgmtPageShell>
  );
};
