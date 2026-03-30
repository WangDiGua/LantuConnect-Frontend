import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, Bell, CheckCircle2, Clock, Loader2,
  TrendingUp, Users, Zap, Shield, ArrowUpRight, RefreshCw,
  Server, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Theme, FontSize } from '../../types';
import { bentoCard, bentoCardHover, canvasBodyBg, mainScrollCompositorClass, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { PageError } from '../../components/common/PageError';
import { buildPath } from '../../constants/consoleRoutes';
import { dashboardService } from '../../api/services/dashboard.service';
import type { AdminRealtimeData } from '../../types/dto/explore';
import type { AdminOverview } from '../../types/dto/dashboard';
import { DashboardLayout } from '../../components/layout/PageLayouts';
import { formatDateTime } from '../../utils/formatDateTime';

interface OverviewProps { theme: Theme; fontSize: FontSize; }

function formatTrendAxisLabel(hourField: string): string {
  const parsed = formatDateTime(hourField, '');
  if (parsed) return parsed;
  const n = Number(hourField);
  if (Number.isInteger(n) && n >= 0 && n <= 23) {
    const t = new Date();
    t.setHours(n, 0, 0, 0);
    return formatDateTime(t);
  }
  return hourField.trim() || '—';
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export const Overview: React.FC<OverviewProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [realtime, setRealtime] = useState<AdminRealtimeData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ov, rt] = await Promise.allSettled([
        dashboardService.getAdminOverview(),
        dashboardService.getAdminRealtime(),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (rt.status === 'fulfilled') setRealtime(rt.value);
      if (ov.status === 'rejected' && rt.status === 'rejected') {
        setLoadError(ov.reason instanceof Error ? ov.reason : new Error('加载管理概览失败'));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载管理概览失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardStatic = bentoCard(theme);
  const cardClick = `${bentoCardHover(theme)} cursor-pointer`;
  const tp = textPrimary(theme);
  const ts = textSecondary(theme);
  const tm = textMuted(theme);

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${canvasBodyBg(theme)}`}>
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`flex-1 ${canvasBodyBg(theme)}`}>
        <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载概览" />
      </div>
    );
  }

  const rt = realtime;

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <DashboardLayout className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${tp}`}>管理概览</h1>
            <p className={`text-sm ${tm}`}>实时平台运营数据</p>
          </div>
          <button type="button" onClick={fetchData} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`}>
            <RefreshCw size={16} className={tm} />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '今日调用', value: rt?.todayCalls ?? 0, icon: Zap, color: 'neutral', badge: 'Live' },
            { label: '平均延迟', value: `${rt?.avgLatencyMs ?? 0}ms`, icon: Clock, color: 'emerald', badge: rt?.avgLatencyMs && rt.avgLatencyMs < 100 ? 'OK' : '慢' },
            { label: '活跃用户', value: rt?.activeUsers ?? 0, icon: Users, color: 'blue' },
            { label: '今日错误', value: rt?.todayErrors ?? 0, icon: AlertTriangle, color: 'rose' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: i * 0.03 }}
              className={`${cardStatic} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <kpi.icon size={18} className={tm} />
                {kpi.badge && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    kpi.badge === 'Live' ? (isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700')
                    : kpi.badge === 'OK' ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                    : (isDark ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-50 text-rose-700')
                  }`}>
                    {kpi.badge}
                  </span>
                )}
              </div>
              <div className={`text-2xl font-black ${tp}`}>{typeof kpi.value === 'number' ? formatNum(kpi.value) : kpi.value}</div>
              <div className={`text-xs font-medium mt-1 ${tm}`}>{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '待审核', value: rt?.pendingAudits ?? 0, icon: CheckCircle2, page: 'agent-audit', color: 'amber' },
            { label: '活跃告警', value: rt?.activeAlerts ?? 0, icon: Bell, page: 'alert-management', color: 'rose' },
            { label: '健康检查', value: `${overview?.healthSummary?.healthy ?? 0} 正常`, icon: Shield, page: 'health-config', color: 'emerald' },
            { label: '用户管理', value: `${rt?.activeUsers ?? 0} 活跃`, icon: Users, page: 'user-list', color: 'blue' },
          ].map((action, i) => (
            <motion.div key={action.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.12 + i * 0.03 }}
              onClick={() => navigate(buildPath('admin', action.page))}
              className={`${cardClick} p-4 transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <action.icon size={16} className={ts} />
                <ArrowUpRight size={14} className={tm} />
              </div>
              <div className={`text-lg font-bold ${tp}`}>{action.value}</div>
              <div className={`text-xs ${tm}`}>{action.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Call Trend (24h) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }}
            className={`lg:col-span-2 ${cardStatic} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-bold text-sm ${tp}`}>24 小时调用趋势</h2>
              <BarChart3 size={16} className={tm} />
            </div>
            {rt?.callTrend && rt.callTrend.length > 0 ? (
              <div className="flex items-end gap-1 h-32">
                {rt.callTrend.map((point, idx) => {
                  const max = Math.max(...rt.callTrend.map(p => p.calls), 1);
                  const h = Math.max((point.calls / max) * 100, 2);
                  const axisLabel = formatTrendAxisLabel(point.hour);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-t transition-all ${isDark ? 'bg-neutral-900/40' : 'bg-neutral-200'}`}
                        style={{ height: `${h}%` }} title={`${axisLabel}: ${point.calls} 次调用`} />
                      {idx % 4 === 0 && <span className={`text-[9px] ${tm} tabular-nums`}>{axisLabel}</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`h-32 flex items-center justify-center text-sm ${tm}`}>等待后端接口数据…</div>
            )}
          </motion.div>

          {/* System Health */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.25 }}
            className={`${cardStatic} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-bold text-sm ${tp}`}>系统健康</h2>
              <Activity size={16} className={tm} />
            </div>
            {rt?.systemHealth && rt.systemHealth.length > 0 ? (
              <div className="space-y-2">
                {rt.systemHealth.map((item) => (
                  <div key={item.component} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server size={14} className={tm} />
                      <span className={`text-sm ${tp}`}>{item.component}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'healthy' ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                      : item.status === 'degraded' ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700')
                      : (isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-700')
                    }`}>
                      {item.status === 'healthy' ? '正常' : item.status === 'degraded' ? '降级' : '故障'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center py-8 text-sm ${tm}`}>
                <Shield size={24} className="mb-2" />
                <span>等待后端接口数据…</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Top Resources */}
        {rt?.topResourcesByCall && rt.topResourcesByCall.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.3 }}
            className={`${cardStatic} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-bold text-sm ${tp}`}>热门资源排行</h2>
              <TrendingUp size={16} className={tm} />
            </div>
            <div className="space-y-2">
              {rt.topResourcesByCall.slice(0, 8).map((item, idx) => (
                <div key={item.name} className={`flex items-center gap-3 py-2 ${idx > 0 ? `border-t ${isDark ? 'border-white/[0.04]' : 'border-slate-50'}` : ''}`}>
                  <span className={`w-6 text-center text-xs font-bold ${idx < 3 ? 'text-neutral-800' : tm}`}>#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${tp}`}>{item.name}</span>
                    <span className={`text-xs ml-2 ${tm}`}>{item.type}</span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${tp}`}>{formatNum(item.calls)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </DashboardLayout>
    </div>
  );
};
