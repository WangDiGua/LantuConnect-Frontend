import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Theme, FontSize } from '../../types';
import { canvasBodyBg, textPrimary, textSecondary, textMuted, tableHeadCell, tableBodyRow, tableCell } from '../../utils/uiClasses';
import { BarChart3, Zap, Users, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { dashboardService } from '../../api/services/dashboard.service';
import type { UsageStatsData } from '../../types/dto/dashboard';
import { BentoCard } from '../../components/common/BentoCard';
import { KpiCard } from '../../components/common/KpiCard';
import { PageError } from '../../components/common/PageError';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

export const UsageStatsOverview: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [data, setData] = useState<UsageStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await dashboardService.getUsageStats('7d');
      setData(result);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载使用统计失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const points = data?.points ?? [];
  const maxDailyCall = Math.max(...points.map(d => d.calls), 1);

  const kpis: { label: string; value: string; icon: React.ReactNode; glow: 'indigo' | 'emerald' | 'amber' | 'rose' }[] = [
    { label: '今日调用', value: points.length > 0 ? points[points.length - 1].calls.toLocaleString() : '0', icon: <Zap size={16} />, glow: 'indigo' },
    { label: '总调用', value: data ? data.totalCalls.toLocaleString() : '0', icon: <TrendingUp size={16} />, glow: 'emerald' },
    { label: '活跃用户', value: data ? data.activeUsers.toLocaleString() : '0', icon: <Users size={16} />, glow: 'amber' },
    { label: '总 Tokens', value: data ? data.totalTokens.toLocaleString() : '0', icon: <Clock size={16} />, glow: 'rose' },
  ];

  const topItems = [...points].sort((a, b) => b.calls - a.calls).slice(0, 10);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      {/* Header */}
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-3 ${isDark ? 'border-white/[0.06]' : 'border-slate-200/40'} ${canvasBodyBg(theme)}`}>
        <div className={`p-2.5 rounded-xl ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
          <BarChart3 size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${textPrimary(theme)}`}>使用统计</h2>
          <p className={`text-xs ${textSecondary(theme)}`}>全平台智能体/技能调用量与用户活跃度概览</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-5 space-y-5">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : loadError ? (
          <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载使用统计" />
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpis.map((k, i) => (
                <KpiCard
                  key={k.label}
                  theme={theme}
                  label={k.label}
                  value={k.value}
                  icon={k.icon}
                  glow={k.glow}
                  delay={i * 0.05}
                />
              ))}
            </div>

            {/* Trend Chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.15 }}
            >
              <BentoCard theme={theme}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">近 7 天调用趋势</h3>
                <div className="flex items-end gap-2 h-40">
                  {points.map((d, i) => {
                    const pct = maxDailyCall > 0 ? (d.calls / maxDailyCall) * 100 : 0;
                    return (
                      <motion.div
                        key={d.date}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 + i * 0.04 }}
                        className="flex-1 flex flex-col items-center gap-1.5 origin-bottom"
                      >
                        <span className={`text-xs font-mono ${textMuted(theme)}`}>{d.calls}</span>
                        <div className="w-full flex justify-center" style={{ height: '120px' }}>
                          <div
                            className={`w-full max-w-[40px] rounded-t-lg transition-all ${isDark ? 'bg-neutral-800/80' : 'bg-neutral-600'}`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs ${textMuted(theme)}`}>{d.date.slice(5)}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </BentoCard>
            </motion.div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.25 }}
              >
                <BentoCard theme={theme} padding="sm" className="!p-0 overflow-hidden">
                  <div className={`px-5 py-3.5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">按日期调用排行</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className={tableHeadCell(theme)}>#</th>
                          <th className={tableHeadCell(theme)}>日期</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>调用次数</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>活跃用户</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topItems.map((item, i) => (
                          <tr key={item.date} className={tableBodyRow(theme, i)}>
                            <td className={tableCell()}>
                              <span className={`font-bold text-xs ${i < 3 ? (isDark ? 'text-amber-400' : 'text-amber-600') : textMuted(theme)}`}>
                                {i + 1}
                              </span>
                            </td>
                            <td className={tableCell()}>
                              <span className={`font-medium ${textPrimary(theme)}`}>{item.date}</span>
                            </td>
                            <td className={`${tableCell()} text-right font-mono ${textSecondary(theme)}`}>{item.calls.toLocaleString()}</td>
                            <td className={`${tableCell()} text-right font-mono ${textMuted(theme)}`}>{item.users}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </BentoCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 }}
              >
                <BentoCard theme={theme} padding="sm" className="!p-0 overflow-hidden">
                  <div className={`px-5 py-3.5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Token 消耗趋势</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className={tableHeadCell(theme)}>日期</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>Tokens</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>调用次数</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>用户数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {points.map((pt, i) => (
                          <tr key={pt.date} className={tableBodyRow(theme, i)}>
                            <td className={tableCell()}>
                              <span className={`font-medium ${textPrimary(theme)}`}>{pt.date}</span>
                            </td>
                            <td className={`${tableCell()} text-right font-mono ${textSecondary(theme)}`}>{pt.tokens.toLocaleString()}</td>
                            <td className={`${tableCell()} text-right font-mono ${textMuted(theme)}`}>{pt.calls.toLocaleString()}</td>
                            <td className={`${tableCell()} text-right font-mono ${textMuted(theme)}`}>{pt.users}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </BentoCard>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
