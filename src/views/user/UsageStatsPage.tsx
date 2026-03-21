import React, { useState, useEffect } from 'react';
import { BarChart3, Zap, Coins, Bot, Star, Loader2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { pageBg, cardClass, tableHeadCell, tableBodyRow, tableCell } from '../../utils/uiClasses';
import { userActivityService } from '../../api/services/user-activity.service';
import type { UserUsageStats } from '../../types/dto/user-activity';

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

  const typeBadge = (type: string) => {
    const styles: Record<string, string> = {
      Agent: isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-100 text-blue-700',
      Skill: isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-100 text-purple-700',
    };
    return `inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${styles[type] || ''}`;
  };

  const rankBadge = (rank: number) => {
    if (rank === 1) return 'bg-amber-100 text-amber-700';
    if (rank === 2) return 'bg-slate-200 text-slate-600';
    if (rank === 3) return 'bg-orange-100 text-orange-600';
    return isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500';
  };

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${pageBg(theme)}`}>
        <Loader2 size={32} className={`animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        <p className={`mt-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>加载统计数据…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${pageBg(theme)}`}>
        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>暂无统计数据</p>
      </div>
    );
  }

  const kpiData = [
    { label: '本月调用次数', value: stats.monthCalls.toLocaleString(), icon: Zap, color: 'text-blue-500' },
    { label: 'Token 消耗', value: stats.tokensUsed >= 1000 ? `${(stats.tokensUsed / 1000).toFixed(1)}K` : String(stats.tokensUsed), icon: Coins, color: 'text-amber-500' },
    { label: '本周调用', value: stats.weekCalls.toLocaleString(), icon: Bot, color: 'text-violet-500' },
    { label: '收藏数', value: String(stats.favoriteCount), icon: Star, color: 'text-pink-500' },
  ];

  const dailyBars = stats.recentDays ?? [];
  const maxBar = Math.max(...dailyBars.map((b) => b.calls), 1);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
            <BarChart3 size={22} className="text-indigo-500" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>使用统计</h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>个人使用数据概览与趋势分析</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0">
          {kpiData.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className={`${cardClass(theme)} p-5`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={kpi.color} />
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{kpi.label}</span>
                </div>
                <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{kpi.value}</div>
              </div>
            );
          })}
        </div>

        {/* Trend */}
        {dailyBars.length > 0 && (
          <div className={`${cardClass(theme)} p-5 mb-4`}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>调用趋势（近期）</h3>
            <div className="flex items-end gap-2 h-48">
              {dailyBars.map((bar, i) => {
                const pct = maxBar > 0 ? (bar.calls / maxBar) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className={`text-[10px] font-medium tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {bar.calls}
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-500"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{bar.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className={`${cardClass(theme)} overflow-hidden`}>
          <div className="p-5 pb-0">
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>调用汇总</h3>
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
                    <td className={tableCell()}>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.label}</span>
                    </td>
                    <td className={tableCell()}>
                      <span className={`tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{row.value.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
