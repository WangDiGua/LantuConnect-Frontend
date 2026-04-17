import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Layers3,
  RefreshCw,
  ScrollText,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Theme, FontSize } from '../../types';
import { bentoCard, bentoCardHover, canvasBodyBg, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { buildPath } from '../../constants/consoleRoutes';
import { dashboardService } from '../../api/services/dashboard.service';
import type { AdminOverview } from '../../types/dto/dashboard';
import type { AdminRealtimeData } from '../../types/dto/explore';
import { DashboardLayout } from '../../components/layout/PageLayouts';
import { formatDateTime } from '../../utils/formatDateTime';
import { RESOURCE_TYPE_LABEL, RESOURCE_TYPE_ORDER } from '../../constants/resourceTypes';
import { useMessage } from '../../components/common/Message';
import {
  getNotificationType,
  isAuditPendingChanged,
  isCircuitStateChanged,
  isHealthConfigUpdated,
  isNotificationMessage,
  subscribeRealtimePush,
} from '../../lib/realtimePush';

interface OverviewProps {
  theme: Theme;
  fontSize: FontSize;
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

function formatNum(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function totalPublishedResources(data: AdminRealtimeData | null): number {
  const counts = data?.publishedResourceCounts;
  if (!counts) return 0;
  return Object.values(counts).reduce((sum, value) => sum + Number(value ?? 0), 0);
}

function formatTrendAxisLabel(hourField: string | number): string {
  const n = Number(hourField);
  if (Number.isInteger(n) && n >= 0 && n <= 23) {
    return `${String(n).padStart(2, '0')}:00`;
  }
  return String(hourField ?? '--');
}

export const Overview: React.FC<OverviewProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { showMessage } = useMessage();

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
        setLoadError(ov.reason instanceof Error ? ov.reason : new Error('加载经营驾驶舱失败'));
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error : new Error('加载经营驾驶舱失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSignalsQuiet = useCallback(async () => {
    try {
      const [ov, rt] = await Promise.allSettled([
        dashboardService.getAdminOverview(),
        dashboardService.getAdminRealtime(),
      ]);
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (rt.status === 'fulfilled') setRealtime(rt.value);
    } catch {
      /* keep current UI */
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    return subscribeRealtimePush((msg) => {
      if (isHealthConfigUpdated(msg) || isCircuitStateChanged(msg) || isAuditPendingChanged(msg)) {
        void refreshSignalsQuiet();
        return;
      }
      if (isNotificationMessage(msg)) {
        const type = getNotificationType(msg);
        if (type === 'resource_submitted' || type === 'audit_approved' || type === 'audit_rejected') {
          void refreshSignalsQuiet();
        }
      }
    });
  }, [refreshSignalsQuiet]);

  const cardStatic = bentoCard(theme);
  const cardClick = `${bentoCardHover(theme)} cursor-pointer`;
  const tp = textPrimary(theme);
  const ts = textSecondary(theme);
  const tm = textMuted(theme);
  const publishedTotal = totalPublishedResources(realtime);

  const quickLinks = useMemo(
    () => [
      {
        label: '用量分析',
        hint: '按类型、部门、Owner 和资源查看调用趋势',
        value: `${realtime?.todayCalls ?? 0} 次`,
        icon: BarChart3,
        page: 'usage-statistics',
      },
      {
        label: '经营报表中心',
        hint: '导出经营视图与排行榜，保留当前时间窗口',
        value: `${realtime?.activeUsers ?? 0} 活跃`,
        icon: ScrollText,
        page: 'data-reports',
      },
      {
        label: '资源审核',
        hint: '处理待审核资源，推动供给进入测试和发布',
        value: `${realtime?.pendingAudits ?? 0} 待处理`,
        icon: ClipboardCheck,
        page: 'resource-audit',
      },
      {
        label: '健康提醒',
        hint: '只保留摘要提醒，详细治理统一进入监控运维域',
        value: `${overview?.healthSummary?.degraded ?? 0} 降级`,
        icon: Shield,
        page: 'health-governance',
      },
    ],
    [overview?.healthSummary?.degraded, realtime?.activeUsers, realtime?.pendingAudits, realtime?.todayCalls],
  );

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
        <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载驾驶舱" />
      </div>
    );
  }

  const registrations = overview?.recentRegistrations ?? [];
  const callTrend = realtime?.callTrend ?? [];
  const maxTrend = Math.max(...callTrend.map((point) => point.calls), 1);
  const topResources = realtime?.topResourcesByCall ?? [];
  const callMix = realtime?.callsByResourceType7d ?? [];
  const maxCallMix = Math.max(...callMix.map((item) => item.calls), 1);

  return (
    <div className={`w-full ${canvasBodyBg(theme)}`}>
      <DashboardLayout className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className={`text-xl font-bold ${tp}`}>经营驾驶舱</h1>
            <p className={`text-sm ${tm}`}>
              这里聚焦管理视角：供给规模、使用活跃度、审核积压和经营关注点，实时排障入口统一收口到监控运维。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void fetchData();
              showMessage('经营驾驶舱已刷新', 'info');
            }}
            className={`rounded-lg p-2 transition-colors ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`}
            aria-label="刷新经营驾驶舱"
          >
            <RefreshCw size={16} className={tm} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: '今日调用', value: realtime?.todayCalls ?? 0, icon: Zap },
            { label: '活跃用户', value: realtime?.activeUsers ?? 0, icon: Users },
            { label: '待审核资源', value: realtime?.pendingAudits ?? 0, icon: CheckCircle2 },
            { label: '已发布资源', value: publishedTotal, icon: Layers3 },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: index * 0.03 }}
              className={`${cardStatic} p-5`}
            >
              <div className="mb-3 flex items-center justify-between">
                <item.icon size={18} className={tm} />
              </div>
              <div className={`min-h-[2rem] text-2xl font-black tabular-nums ${tp}`}>{formatNum(item.value)}</div>
              <div className={`mt-1 text-xs font-medium ${tm}`}>{item.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {quickLinks.map((item, index) => (
            <motion.button
              key={item.label}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.08 + index * 0.03 }}
              onClick={() => navigate(buildPath('admin', item.page))}
              className={`${cardClick} p-4 text-left`}
            >
              <div className="mb-2 flex items-center justify-between">
                <item.icon size={16} className={ts} />
                <ArrowUpRight size={14} className={tm} />
              </div>
              <div className={`text-base font-bold ${tp}`}>{item.label}</div>
              <div className={`mt-1 text-xs ${tm}`}>{item.hint}</div>
              <div className={`mt-3 text-sm font-semibold ${ts}`}>{item.value}</div>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.16 }}
            className={`${cardStatic} p-5`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-sm font-bold ${tp}`}>供给结构与使用热度</h2>
              <Sparkles size={16} className={tm} />
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {RESOURCE_TYPE_ORDER.map((type) => (
                <div key={type} className={`rounded-xl p-3 ${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
                  <div className={`text-xs font-medium ${tm}`}>{RESOURCE_TYPE_LABEL[type]}</div>
                  <div className={`text-lg font-bold tabular-nums ${tp}`}>{realtime?.publishedResourceCounts?.[type] ?? '--'}</div>
                  <div className={`text-[10px] ${tm}`}>已发布供给</div>
                </div>
              ))}
            </div>

            {callMix.length > 0 ? (
              <div className="space-y-2">
                <div className={`mb-2 text-xs font-semibold ${ts}`}>近 7 日使用热度</div>
                {callMix.map((row) => (
                  <div key={row.type} className="flex items-center gap-3">
                    <span className={`w-20 shrink-0 text-xs ${tm}`}>{RESOURCE_TYPE_LABEL[row.type] ?? row.type}</span>
                    <div className={`h-2 flex-1 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`}>
                      <div
                        className={`${isDark ? 'bg-blue-500/70' : 'bg-blue-600'} h-full rounded-full`}
                        style={{ width: `${Math.max((row.calls / maxCallMix) * 100, 2)}%` }}
                      />
                    </div>
                    <span className={`w-12 text-right text-xs tabular-nums ${tp}`}>{formatNum(row.calls)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-sm ${tm}`}>当前还没有可展示的按类型用量聚合。</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className={`${cardStatic} p-5`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-sm font-bold ${tp}`}>最近登记与待办</h2>
              <ClipboardCheck size={16} className={tm} />
            </div>
            {registrations.length > 0 ? (
              <div className="space-y-3">
                {registrations.slice(0, 6).map((item, index) => (
                  <div
                    key={`${item.name}-${item.time}-${index}`}
                    className={`flex items-start justify-between gap-3 ${index > 0 ? `border-t pt-3 ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}` : ''}`}
                  >
                    <div className="min-w-0">
                      <div className={`truncate text-sm font-medium ${tp}`}>{item.name}</div>
                      <div className={`mt-1 text-xs ${tm}`}>{item.type} · {item.status}</div>
                    </div>
                    <div className={`shrink-0 text-xs ${tm}`}>{formatDateTime(item.time)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-sm ${tm}`}>最近暂无新的资源登记记录。</div>
            )}

            <button
              type="button"
              onClick={() => navigate(buildPath('admin', 'resource-audit'))}
              className={`mt-4 inline-flex items-center gap-2 text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
            >
              进入资源审核
              <ArrowUpRight size={14} aria-hidden />
            </button>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.24 }}
            className={`${cardStatic} p-5`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-sm font-bold ${tp}`}>最近 24 小时调用趋势</h2>
              <BarChart3 size={16} className={tm} />
            </div>
            {callTrend.length > 0 ? (
              <div className="flex h-32 items-end gap-1">
                {callTrend.map((point, index) => {
                  const height = Math.max((point.calls / maxTrend) * 100, 2);
                  const axisLabel = formatTrendAxisLabel(point.hour);
                  return (
                    <div key={`${point.hour}-${index}`} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t transition-all ${isDark ? 'bg-neutral-900/40' : 'bg-neutral-200'}`}
                        style={{ height: `${height}%` }}
                        title={`${axisLabel}: ${point.calls} 次调用`}
                      />
                      {index % 4 === 0 ? <span className={`text-[9px] tabular-nums ${tm}`}>{axisLabel}</span> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`flex h-32 items-center justify-center text-sm ${tm}`}>当前没有可展示的趋势样本。</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.28 }}
            className={`${cardStatic} p-5`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-sm font-bold ${tp}`}>热门资源排行</h2>
              <TrendingUp size={16} className={tm} />
            </div>
            {topResources.length > 0 ? (
              <div className="space-y-2">
                {topResources.slice(0, 8).map((item, index) => (
                  <div
                    key={`${item.type}-${item.name}-${index}`}
                    className={`flex items-center gap-3 py-2 ${index > 0 ? `border-t ${isDark ? 'border-white/[0.04]' : 'border-slate-50'}` : ''}`}
                  >
                    <span className={`w-6 text-center text-xs font-bold ${index < 3 ? 'text-neutral-800' : tm}`}>#{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <span className={`text-sm font-medium ${tp}`}>{item.name}</span>
                      <span className={`ml-2 text-xs ${tm}`}>{RESOURCE_TYPE_LABEL[item.type] ?? item.type}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold tabular-nums ${tp}`}>{formatNum(item.calls)}</span>
                      {item.successRate != null ? (
                        <div className={`text-[10px] tabular-nums ${tm}`}>成功率 {item.successRate}%</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-sm ${tm}`}>当前没有热门资源排行数据。</div>
            )}
          </motion.div>
        </div>
      </DashboardLayout>
    </div>
  );
};
