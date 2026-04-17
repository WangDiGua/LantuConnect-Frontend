import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, Bell, CheckCircle2, Clock,
  TrendingUp, Users, Zap, Shield, ArrowUpRight, RefreshCw,
  Server, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Theme, FontSize } from '../../types';
import { bentoCard, bentoCardHover, canvasBodyBg, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { buildPath } from '../../constants/consoleRoutes';
import { dashboardService } from '../../api/services/dashboard.service';
import type { AdminRealtimeData } from '../../types/dto/explore';
import type { AdminOverview, HealthSummary } from '../../types/dto/dashboard';
import { DashboardLayout } from '../../components/layout/PageLayouts';
import { formatDateTime } from '../../utils/formatDateTime';
import { RESOURCE_TYPE_LABEL, RESOURCE_TYPE_ORDER } from '../../constants/resourceTypes';
import { useMessage } from '../../components/common/Message';
import {
  isAuditPendingChanged,
  isNotificationMessage,
  getNotificationType,
  subscribeRealtimePush,
  isHealthConfigUpdated,
  isCircuitStateChanged,
} from '../../lib/realtimePush';

interface OverviewProps { theme: Theme; fontSize: FontSize; }

function formatTrendAxisLabel(hourField: string | number): string {
  const n = Number(hourField);
  if (Number.isInteger(n) && n >= 0 && n <= 23) {
    const t = new Date();
    t.setHours(n, 0, 0, 0);
    return formatDateTime(t);
  }
  const parsed = formatDateTime(String(hourField), '');
  if (parsed) return parsed;
  return String(hourField).trim() || '—';
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
  const { showMessage } = useMessage();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [realtime, setRealtime] = useState<AdminRealtimeData | null>(null);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ov, rt, hs] = await Promise.allSettled([
        dashboardService.getAdminOverview(),
        dashboardService.getAdminRealtime(),
        dashboardService.getHealthSummary(),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (rt.status === 'fulfilled') setRealtime(rt.value);
      if (hs.status === 'fulfilled') setHealthSummary(hs.value);
      if (ov.status === 'rejected' && rt.status === 'rejected' && hs.status === 'rejected') {
        setLoadError(ov.reason instanceof Error ? ov.reason : new Error('加载管理概览失败'));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载管理概览失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshHealthAndRealtimeQuiet = useCallback(async () => {
    try {
      const [rt, hs] = await Promise.allSettled([
        dashboardService.getAdminRealtime(),
        dashboardService.getHealthSummary(),
      ]);
      if (rt.status === 'fulfilled') setRealtime(rt.value);
      if (hs.status === 'fulfilled') setHealthSummary(hs.value);
      showMessage('监控与健康数据已同步', 'info', 2800);
    } catch {
      /* 静默失败，保留当前展示 */
    }
  }, [showMessage]);

  const refreshRealtimeQuiet = useCallback(async () => {
    try {
      const rt = await dashboardService.getAdminRealtime();
      setRealtime(rt);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    return subscribeRealtimePush((msg) => {
      if (isHealthConfigUpdated(msg) || isCircuitStateChanged(msg)) {
        void refreshHealthAndRealtimeQuiet();
        return;
      }
      if (isAuditPendingChanged(msg)) {
        void refreshRealtimeQuiet();
        return;
      }
      if (isNotificationMessage(msg)) {
        const type = getNotificationType(msg);
        if (type === 'resource_submitted' || type === 'audit_approved' || type === 'audit_rejected') {
          void refreshRealtimeQuiet();
        }
      }
    });
  }, [refreshHealthAndRealtimeQuiet, refreshRealtimeQuiet]);

  const cardStatic = bentoCard(theme);
  const cardClick = `${bentoCardHover(theme)} cursor-pointer`;
  const tp = textPrimary(theme);
  const ts = textSecondary(theme);
  const tm = textMuted(theme);

  if (loading) {
    return (
      <div className={`flex-1 ${canvasBodyBg(theme)}`}>
        <PageSkeleton type="dashboard" />
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
    <div className={`w-full ${canvasBodyBg(theme)}`}>
      <DashboardLayout className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${tp}`}>管理概览</h1>
            <p className={`text-sm ${tm}`}>实时平台运营数据（五类统一资源：智能体 / 技能 / MCP / 应用 / 数据集）</p>
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
              <div className={`text-2xl font-black tabular-nums min-h-[2rem] ${tp}`}>
                {typeof kpi.value === 'number' ? formatNum(kpi.value) : kpi.value}
              </div>
              <div className={`text-xs font-medium mt-1 ${tm}`}>{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        {(rt?.publishedResourceCounts || rt?.callsByResourceType7d?.length) ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }}
            className={`${cardStatic} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-bold text-sm ${tp}`}>资源类型概览</h2>
              <Server size={16} className={tm} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              {RESOURCE_TYPE_ORDER.map((t) => (
                <div key={t} className={`rounded-xl p-3 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                  <div className={`text-xs font-medium ${tm}`}>{RESOURCE_TYPE_LABEL[t]}</div>
                  <div className={`text-lg font-bold tabular-nums ${tp}`}>
                    {rt?.publishedResourceCounts?.[t] ?? '—'}
                  </div>
                  <div className={`text-[10px] ${tm}`}>已登记资源</div>
                </div>
              ))}
            </div>
            {rt?.callsByResourceType7d && rt.callsByResourceType7d.length > 0 && (() => {
              const maxT = Math.max(...rt.callsByResourceType7d.map((x) => x.calls), 1);
              return (
                <div>
                  <div className={`text-xs font-semibold mb-2 ${ts}`}>近 7 日网关调用（按类型）</div>
                  <div className="space-y-2">
                    {rt.callsByResourceType7d.map((row) => (
                      <div key={row.type} className="flex items-center gap-3">
                        <span className={`w-20 shrink-0 text-xs ${tm}`}>{RESOURCE_TYPE_LABEL[row.type] ?? row.type}</span>
                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`}>
                          <div
                            className={`h-full rounded-full ${isDark ? 'bg-blue-500/70' : 'bg-blue-600'}`}
                            style={{ width: `${Math.max((row.calls / maxT) * 100, 2)}%` }}
                          />
                        </div>
                        <span className={`w-12 text-right text-xs tabular-nums ${tp}`}>{formatNum(row.calls)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        ) : null}

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: '待审核', value: rt?.pendingAudits ?? 0, icon: CheckCircle2, page: 'resource-audit', color: 'amber' },
            { label: '活跃告警', value: rt?.activeAlerts ?? 0, icon: Bell, page: 'alert-center', color: 'rose' },
            { label: '健康检查', value: `${healthSummary?.healthy ?? overview?.healthSummary?.healthy ?? 0} 正常`, icon: Shield, page: 'health-governance', color: 'emerald' },
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

        {healthSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.18 }}
            className={`${cardStatic} p-5`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className={`font-bold text-sm ${tp}`}>健康摘要增强视图</h2>
              <Shield size={16} className={tm} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className={`rounded-lg p-3 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <div className={`text-xs ${tm}`}>状态分布</div>
                <div className={`mt-1 text-sm ${tp}`}>
                  healthy: {healthSummary.statusDistribution?.healthy ?? healthSummary.healthy} / degraded: {healthSummary.statusDistribution?.degraded ?? healthSummary.degraded} / down: {healthSummary.statusDistribution?.down ?? healthSummary.down}
                </div>
              </div>
              <div className={`rounded-lg p-3 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <div className={`text-xs ${tm}`}>检查项</div>
                <div className={`mt-1 text-sm ${tp}`}>{healthSummary.checks?.length ?? 0} 项</div>
              </div>
              <div className={`rounded-lg p-3 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                <div className={`text-xs ${tm}`}>降级资源</div>
                <div className={`mt-1 text-sm ${tp}`}>{healthSummary.degradedResources?.length ?? 0} 个</div>
              </div>
            </div>
          </motion.div>
        )}

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
                    <div key={`call-trend-${String(point.hour)}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
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
                {rt.systemHealth.map((item, idx) => (
                  <div key={`${item.component}-${idx}`} className="flex items-center justify-between">
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
              <h2 className={`font-bold text-sm ${tp}`}>热门资源排行（近 7 日 · 含类型）</h2>
              <TrendingUp size={16} className={tm} />
            </div>
            <div className="space-y-2">
              {rt.topResourcesByCall.slice(0, 8).map((item, idx) => (
                <div key={`${item.type}-${item.name}-${idx}`} className={`flex items-center gap-3 py-2 ${idx > 0 ? `border-t ${isDark ? 'border-white/[0.04]' : 'border-slate-50'}` : ''}`}>
                  <span className={`w-6 text-center text-xs font-bold ${idx < 3 ? 'text-neutral-800' : tm}`}>#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${tp}`}>{item.name}</span>
                    <span className={`text-xs ml-2 ${tm}`}>{RESOURCE_TYPE_LABEL[item.type] ?? item.type}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${tp}`}>{formatNum(item.calls)}</span>
                    {item.successRate != null && item.successRate > 0 ? (
                      <div className={`text-[10px] tabular-nums ${tm}`}>成功率 {item.successRate}%</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </DashboardLayout>
    </div>
  );
};
