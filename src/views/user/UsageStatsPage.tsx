import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Zap, Coins, Bot, Star, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { userActivityService } from '../../api/services/user-activity.service';
import type { UserUsageStats } from '../../types/dto/user-activity';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import {
  pageBg, textPrimary, textSecondary, textMuted,
  tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';

interface UsageStatsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const UsageStatsPage: React.FC<UsageStatsPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<UserUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userActivityService.getUsageStats()
      .then(data => setStats(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${pageBg(theme)}`}>
        <Loader2 size={32} className="animate-spin text-slate-400" />
        <p className={`mt-3 text-sm ${textMuted(theme)}`}>加载统计数据…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${pageBg(theme)}`}>
        <p className={`text-sm ${textMuted(theme)}`}>暂无统计数据</p>
      </div>
    );
  }

  const kpiData: Array<{ label: string; value: string; icon: React.ReactNode; glow: 'indigo' | 'emerald' | 'amber' | 'rose' }> = [
    { label: '本月调用次数', value: stats.monthCalls.toLocaleString(), icon: <Zap size={16} />, glow: 'indigo' },
    { label: 'Token 消耗', value: stats.tokensUsed >= 1000 ? `${(stats.tokensUsed / 1000).toFixed(1)}K` : String(stats.tokensUsed), icon: <Coins size={16} />, glow: 'amber' },
    { label: '本周调用', value: stats.weekCalls.toLocaleString(), icon: <Bot size={16} />, glow: 'emerald' },
    { label: '收藏数', value: String(stats.favoriteCount), icon: <Star size={16} />, glow: 'rose' },
  ];

  const dailyBars = stats.recentDays ?? [];
  const maxBar = Math.max(...dailyBars.map((b) => b.calls), 1);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
            <BarChart3 size={20} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>使用统计</h1>
            <p className={`text-xs ${textMuted(theme)}`}>个人使用数据概览与趋势分析</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiData.map((kpi, i) => (
            <KpiCard key={kpi.label} theme={theme} label={kpi.label} value={kpi.value} icon={kpi.icon} glow={kpi.glow} delay={i * 0.06} />
          ))}
        </div>

        {/* Trend chart */}
        {dailyBars.length > 0 && (
          <BentoCard theme={theme}>
            <h3 className={`text-sm font-bold mb-4 ${textPrimary(theme)}`}>调用趋势（近期）</h3>
            <div className="flex items-end gap-2 h-48">
              {dailyBars.map((bar, i) => {
                const pct = maxBar > 0 ? (bar.calls / maxBar) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className={`text-[10px] font-medium tabular-nums ${textMuted(theme)}`}>{bar.calls}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, 4)}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400"
                    />
                    <span className={`text-[10px] ${textMuted(theme)}`}>{bar.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </BentoCard>
        )}

        {/* Summary table */}
        <BentoCard theme={theme} padding="sm">
          <div className="px-4 pt-4 pb-2">
            <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>调用汇总</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={tableHeadCell(theme)}>维度</th>
                  <th className={tableHeadCell(theme)}>调用次数</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '今日', value: stats.todayCalls },
                  { label: '本周', value: stats.weekCalls },
                  { label: '本月', value: stats.monthCalls },
                  { label: '累计', value: stats.totalCalls },
                ].map((row, i) => (
                  <tr key={row.label} className={tableBodyRow(theme, i)}>
                    <td className={tableCell()}><span className={`font-medium ${textPrimary(theme)}`}>{row.label}</span></td>
                    <td className={tableCell()}><span className={`tabular-nums ${textSecondary(theme)}`}>{row.value.toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoCard>
      </div>
    </div>
  );
};
