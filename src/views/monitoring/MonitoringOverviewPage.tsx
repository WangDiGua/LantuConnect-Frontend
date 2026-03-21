import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, Search, Shield } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { MonitoringOverviewCharts } from '../../components/charts/MonitoringOverviewCharts';
import { useMonitoringKpis } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import {
  pageBg, btnPrimary, btnGhost, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

interface MonitoringOverviewPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const MonitoringOverviewPage: React.FC<MonitoringOverviewPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const kpisQ = useMonitoringKpis();

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        kpisQ.refetch();
      }, 5000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, kpisQ]);

  if (kpisQ.isLoading) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
        <div className="w-full flex-1 min-h-0 px-2 sm:px-3 lg:px-4 py-2 sm:py-3">
          <PageSkeleton type="cards" />
        </div>
      </div>
    );
  }

  if (kpisQ.isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
        <PageError error={kpisQ.error as Error} onRetry={() => kpisQ.refetch()} />
      </div>
    );
  }

  const kpis = kpisQ.data ?? [];

  if (kpis.length === 0) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
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
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
              <Activity size={20} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>监控概览</h1>
              <p className={`text-xs ${textMuted(theme)}`}>调用量、成功率与延迟趋势汇总</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className={`text-xs font-medium ${textSecondary(theme)}`}>自动刷新</span>
            </label>
            <button type="button" onClick={() => kpisQ.refetch()} className={btnGhost(theme)}>
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k, i) => (
            <KpiCard
              key={k.id}
              theme={theme}
              label={k.label}
              value={k.value}
              trend={typeof k.delta === 'number' ? k.delta : undefined}
              glow={GLOW[i % 4]}
              delay={i * 0.06}
            />
          ))}
        </div>

        {/* Charts */}
        <BentoCard theme={theme}>
          <MonitoringOverviewCharts theme={theme} />
        </BentoCard>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BentoCard theme={theme} hover glow="indigo">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                <Search size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${textPrimary(theme)}`}>调用日志</p>
                <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>按路径、状态码与延迟检索历史请求</p>
              </div>
            </div>
          </BentoCard>
          <BentoCard theme={theme} hover glow="emerald">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
                <Shield size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm ${textPrimary(theme)}`}>告警管理</p>
                <p className={`text-xs mt-0.5 ${textMuted(theme)}`}>查看、确认与关闭运行告警</p>
              </div>
            </div>
          </BentoCard>
        </div>

        <p className={`text-xs ${textMuted(theme)}`}>
          <Activity size={12} className="inline mr-1 opacity-70" />
          KPI 来自监控服务；图表为示意数据，生产环境可接入 Prometheus / ELK / 云监控。
        </p>
      </div>
    </div>
  );
};
