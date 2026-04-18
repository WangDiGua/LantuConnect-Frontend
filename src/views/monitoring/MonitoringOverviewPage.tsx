import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bell, GitBranch, RefreshCw, Search, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { Theme, FontSize } from '../../types';
import { MonitoringOverviewCharts } from '../../components/charts/MonitoringOverviewCharts';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import { useSilentRealtimeRefresh } from '../../hooks/useSilentRealtimeRefresh';
import {
  useAlertSummary,
  useCallSummaryByResource,
  useMonitoringKpis,
  usePerformanceAnalysis,
} from '../../hooks/queries/useMonitoring';
import { buildPath } from '../../constants/consoleRoutes';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import {
  btnGhost,
  btnPrimary,
  kpiGridGap,
  pageBlockStack,
  textMuted,
  textPrimary,
} from '../../utils/uiClasses';

const PAGE_DESC =
  '实时态势只承接运维总控信息：吞吐、成功率、错误率、延迟、活跃告警与异常资源，一跳下钻到性能、日志、链路、告警与健康治理。';
const BREADCRUMB = ['监控运维', '实时态势'] as const;
const GLOW: Array<'indigo' | 'emerald' | 'amber' | 'rose'> = ['indigo', 'emerald', 'amber', 'rose'];

interface MonitoringOverviewPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MonitoringOverviewPage: React.FC<MonitoringOverviewPageProps> = ({
  theme,
  fontSize: _fontSize,
}) => {
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(false);

  const kpisQ = useMonitoringKpis();
  const overviewPerfQ = usePerformanceAnalysis({ window: '24h' });
  const callMixQ = useCallSummaryByResource(24);
  const alertSummaryQ = useAlertSummary();

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      kpisQ.refetch(),
      overviewPerfQ.refetch(),
      callMixQ.refetch(),
      alertSummaryQ.refetch(),
    ]);
  }, [alertSummaryQ, callMixQ, kpisQ, overviewPerfQ]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => {
      void refreshAll();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refreshAll]);

  useSilentRealtimeRefresh(
    refreshAll,
    { categories: ['monitoring_sync', 'critical_alert'] },
    { debounceMs: 350 },
  );

  const anomalyCards = useMemo(() => {
    const perf = overviewPerfQ.data;
    const alerts = alertSummaryQ.data;
    const slowest = perf?.resourceLeaderboard?.[0];
    const slowMethod = perf?.methodLeaderboard?.[0] ?? perf?.slowMethods?.[0];
    return [
      {
        title: '性能分析中心',
        description: slowest
          ? `${slowest.resourceName} 当前 P99 ${Math.round(slowest.p99LatencyMs)}ms，适合直接进入分位和方法排查。`
          : '按窗口、资源和方法查看成功率、延迟分位、慢方法和质量历史。',
        icon: Timer,
        action: '进入性能分析',
        href: buildPath('admin', 'performance-center'),
        tone: 'indigo' as const,
      },
      {
        title: '调用日志中心',
        description: '从最近失败调用、状态码、错误信息与请求元数据继续下钻。',
        icon: Search,
        action: '查看调用日志',
        href: buildPath('admin', 'call-logs'),
        tone: 'amber' as const,
      },
      {
        title: '链路追踪中心',
        description: slowMethod
          ? `慢方法 ${slowMethod.method} 已进入排行，可直接联动 Trace 查看 waterfall 与 span tree。`
          : '失败 trace 优先排序，支持 waterfall、span tree、根因与证据区排查。',
        icon: GitBranch,
        action: '进入链路追踪',
        href: buildPath('admin', 'trace-center'),
        tone: 'rose' as const,
      },
      {
        title: '告警与健康治理',
        description:
          alerts && alerts.firing > 0
            ? `当前有 ${alerts.firing} 条活跃告警，建议联动健康治理查看异常资源与治理动作。`
            : '从告警处置中心与健康治理中心统一完成认领、静默、恢复和策略治理。',
        icon: Bell,
        action: '进入告警处置',
        href: buildPath('admin', 'alert-center'),
        secondaryHref: buildPath('admin', 'health-governance'),
        secondaryLabel: '健康治理',
        tone: 'emerald' as const,
      },
    ];
  }, [alertSummaryQ.data, overviewPerfQ.data]);

  const toolbar = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className={`text-xs ${textMuted(theme)}`}>
        自动刷新打开后，每 5 秒同步一次 KPI、性能概览、资源调用结构和告警摘要。
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
            className="toggle toggle-primary toggle-sm"
            aria-label="每 5 秒自动刷新实时态势数据"
          />
          自动刷新
        </label>
        <button
          type="button"
          onClick={() => navigate(buildPath('admin', 'performance-center'))}
          className={btnPrimary}
        >
          <Timer size={15} aria-hidden />
          进入性能分析中心
        </button>
        <button
          type="button"
          onClick={() => void refreshAll()}
          className={btnGhost(theme)}
          aria-label="立即刷新实时态势数据"
        >
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
    const perf = overviewPerfQ.data;

    if (kpis.length === 0) {
      return <EmptyState title="暂无监控数据" description="KPI 指标为空，请检查监控采集服务是否已经启用。" />;
    }

    return (
      <div className={pageBlockStack}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-5">
          {anomalyCards.map((card) => (
            <BentoCard key={card.title} theme={theme} hover glow={card.tone}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-neutral-100 p-2.5">
                  <card.icon size={18} className="text-neutral-900" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${textPrimary(theme)}`}>{card.title}</p>
                  <p className={`mt-0.5 text-xs ${textMuted(theme)}`}>{card.description}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  className="text-neutral-800 hover:text-neutral-900"
                  onClick={() => navigate(card.href)}
                >
                  {card.action}
                </button>
                {card.secondaryHref && card.secondaryLabel ? (
                  <button
                    type="button"
                    className={`hover:underline ${textMuted(theme)}`}
                    onClick={() => navigate(card.secondaryHref)}
                  >
                    {card.secondaryLabel}
                  </button>
                ) : null}
              </div>
            </BentoCard>
          ))}
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <BentoCard theme={theme}>
            <MonitoringOverviewCharts
              theme={theme}
              performance={perf?.buckets ?? []}
              resourceMix={callMixQ.data ?? []}
            />
          </BentoCard>

          <BentoCard theme={theme}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className={`text-sm font-semibold ${textPrimary(theme)}`}>实时异常摘要</h3>
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>告警、慢资源和高错误率入口都从这里继续下钻。</p>
              </div>
              <AlertTriangle size={18} className={textMuted(theme)} aria-hidden />
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-rose-700">活跃告警</span>
                  <span className="text-lg font-bold text-rose-700">{firingCount}</span>
                </div>
                <p className="mt-1 text-xs text-rose-700/80">
                  今日已恢复 {resolvedCount} 条，可进入告警处置中心认领、静默或恢复。
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-amber-800">最高 P99 资源</span>
                  <span className="text-xs font-mono text-amber-700">
                    {perf?.resourceLeaderboard?.[0]?.resourceName ?? '--'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-800/80">
                  {perf?.resourceLeaderboard?.[0]
                    ? `P99 ${Math.round(perf.resourceLeaderboard[0].p99LatencyMs)}ms，平均延迟 ${Math.round(perf.resourceLeaderboard[0].avgLatencyMs)}ms。`
                    : '当前窗口暂无高延迟资源样本。'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">最高错误方法</span>
                  <span className="text-xs font-mono text-slate-600">
                    {perf?.methodLeaderboard?.[0]?.method ?? perf?.slowMethods?.[0]?.method ?? '--'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {perf?.methodLeaderboard?.[0] ?? perf?.slowMethods?.[0]
                    ? `错误率 ${Math.round((((perf.methodLeaderboard?.[0] ?? perf.slowMethods?.[0])?.errorRate ?? 0) * 100))}%，适合进入性能分析中心和链路追踪继续排查。`
                    : '当前窗口暂无方法级异常摘要。'}
                </p>
              </div>
            </div>
          </BentoCard>
        </div>

        <p className={`text-xs ${textMuted(theme)}`}>
          <Activity size={12} className="mr-1 inline opacity-70" aria-hidden />
          实时态势只保留运维监控信号；经营分析、部门分布、报表导出等管理内容已从这里收回到运营总览域。
        </p>
      </div>
    );
  })();

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={_fontSize}
      titleIcon={Activity}
      breadcrumbSegments={BREADCRUMB}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 pb-8 sm:px-6">{overviewBody}</div>
    </MgmtPageShell>
  );
};
