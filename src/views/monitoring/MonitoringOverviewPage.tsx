import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, Search, Shield } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Theme, FontSize } from '../../types';
import { MonitoringOverviewCharts } from '../../components/charts/MonitoringOverviewCharts';
import {
  useAlertSummary,
  useCallSummaryByResource,
  useMonitoringKpis,
  usePerformanceAnalysis,
} from '../../hooks/queries/useMonitoring';
import { buildPath } from '../../constants/consoleRoutes';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import { PerformanceAnalysisPanel } from './PerformanceAnalysisPanel';
import {
  btnGhost,
  kpiGridGap,
  pageBlockStack,
  textMuted,
  textPrimary,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

const PAGE_DESC = '统一承载平台监控总览与调用性能分析，总览看整体，性能分析看真实分位数、排行与下钻排障。';
const BREADCRUMB = ['监控运维', '监控概览'] as const;
const GLOW: Array<'indigo' | 'emerald' | 'amber' | 'rose'> = ['indigo', 'emerald', 'amber', 'rose'];

type OverviewTab = 'overview' | 'performance';

interface MonitoringOverviewPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function normalizeTab(raw: string | null): OverviewTab {
  return raw === 'performance' ? 'performance' : 'overview';
}

export const MonitoringOverviewPage: React.FC<MonitoringOverviewPageProps> = ({
  theme,
  fontSize,
  showMessage,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const activeTab = normalizeTab(searchParams.get('tab'));

  const kpisQ = useMonitoringKpis();
  const overviewPerfQ = usePerformanceAnalysis({ window: '24h' });
  const callMixQ = useCallSummaryByResource(24);
  const alertSummaryQ = useAlertSummary();

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => {
      void kpisQ.refetch();
      void overviewPerfQ.refetch();
      void callMixQ.refetch();
      void alertSummaryQ.refetch();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [alertSummaryQ, autoRefresh, callMixQ, kpisQ, overviewPerfQ]);

  const setActiveTab = (nextTab: OverviewTab) => {
    const next = new URLSearchParams(searchParams);
    if (nextTab === 'performance') {
      next.set('tab', 'performance');
    } else {
      next.delete('tab');
    }
    setSearchParams(next, { replace: true });
  };

  const refreshAll = () => {
    void kpisQ.refetch();
    void overviewPerfQ.refetch();
    void callMixQ.refetch();
    void alertSummaryQ.refetch();
  };

  const toolbar = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`${btnGhost(theme)} rounded-2xl px-4 py-2.5 ${activeTab === 'overview' ? 'bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white' : ''}`}
        >
          总览
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`${btnGhost(theme)} rounded-2xl px-4 py-2.5 ${activeTab === 'performance' ? 'bg-neutral-900 text-white hover:bg-neutral-900 hover:text-white' : ''}`}
        >
          性能分析
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
            className="toggle toggle-primary toggle-sm"
            aria-label="每 5 秒自动刷新监控总览数据"
          />
          自动刷新
        </label>
        <button type="button" onClick={refreshAll} className={btnGhost(theme)} aria-label="立即刷新监控数据">
          <RefreshCw size={15} aria-hidden />
          刷新
        </button>
      </div>
    </div>
  );

  const overviewBody = (() => {
    if (kpisQ.isLoading || overviewPerfQ.isLoading) {
      return <PageSkeleton type="cards" />;
    }
    if (kpisQ.isError) {
      return <PageError error={kpisQ.error as Error} onRetry={() => kpisQ.refetch()} />;
    }
    if (overviewPerfQ.isError) {
      return <PageError error={overviewPerfQ.error as Error} onRetry={() => overviewPerfQ.refetch()} />;
    }

    const kpis = kpisQ.data ?? [];
    const firingCount = alertSummaryQ.data?.firing ?? 0;
    const resolvedCount = alertSummaryQ.data?.resolvedToday ?? 0;

    if (kpis.length === 0) {
      return (
        <EmptyState
          title="暂无监控数据"
          description="KPI 指标为空，请检查监控采集服务是否已经启用。"
        />
      );
    }

    return (
      <div className={pageBlockStack}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <BentoCard theme={theme} hover glow="indigo">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-neutral-100">
                <Search size={18} className="text-neutral-900" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${textPrimary(theme)}`}>调用日志</p>
                <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>
                  按资源类型、方法、状态码与延迟检索统一网关调用记录。
                </p>
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
              <div className="p-2.5 rounded-xl bg-emerald-50">
                <Shield size={18} className="text-emerald-600" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${textPrimary(theme)}`}>告警中心</p>
                <div className={`text-xs mt-0.5 ${textMuted(theme)}`}>
                  {alertSummaryQ.isLoading ? '加载告警摘要中…' : `进行中 ${firingCount} 条 · 今日已恢复 ${resolvedCount} 条`}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 text-xs text-emerald-600 hover:text-emerald-700"
              onClick={() => navigate(buildPath('admin', 'alert-center'))}
            >
              进入告警中心
            </button>
          </BentoCard>
        </div>

        <div className={`grid grid-cols-2 lg:grid-cols-4 ${kpiGridGap}`}>
          {kpis.map((item, index) => (
            <KpiCard
              key={item.name}
              theme={theme}
              label={item.label}
              value={item.unit && !String(item.value).endsWith(item.unit) ? `${item.value} ${item.unit}` : item.value}
              trend={item.trend}
              trendType={item.changeType}
              previousValue={item.previousValue}
              glow={GLOW[index % 4]}
              delay={index * 0.06}
            />
          ))}
        </div>

        <BentoCard theme={theme}>
          <MonitoringOverviewCharts
            theme={theme}
            performance={overviewPerfQ.data?.buckets ?? []}
            resourceMix={callMixQ.data ?? []}
          />
        </BentoCard>

        <p className={`text-xs ${textMuted(theme)}`}>
          <Activity size={12} className="inline mr-1 opacity-70" aria-hidden />
          总览图表来自调用日志真实聚合，性能分析页会基于同一口径继续下钻到分位数、资源排行和慢方法。
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
      <div className="px-4 sm:px-6 pb-8">
        {activeTab === 'overview' ? overviewBody : <PerformanceAnalysisPanel theme={theme} showMessage={showMessage} />}
      </div>
    </MgmtPageShell>
  );
};
