import React from 'react';
import { BarChart3, Zap, Coins, Bot, Star } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { pageBg, cardClass, tableHeadCell, tableBodyRow, tableCell } from '../../utils/uiClasses';

interface KpiItem {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const KPI_DATA: KpiItem[] = [
  { label: '本月调用次数', value: '1,247', icon: Zap, color: 'text-blue-500' },
  { label: '本月Token消耗', value: '85.6K', icon: Coins, color: 'text-amber-500' },
  { label: '常用Agent数', value: '8', icon: Bot, color: 'text-violet-500' },
  { label: '收藏数', value: '12', icon: Star, color: 'text-pink-500' },
];

const DAILY_BARS = [
  { label: '周一', value: 186 },
  { label: '周二', value: 245 },
  { label: '周三', value: 198 },
  { label: '周四', value: 312 },
  { label: '周五', value: 276 },
  { label: '周六', value: 142 },
  { label: '周日', value: 98 },
];

const TOP_ITEMS = [
  { rank: 1, name: '选课助手', type: 'Agent', count: 342 },
  { rank: 2, name: '文献翻译', type: 'Skill', count: 218 },
  { rank: 3, name: '图书馆检索', type: 'Agent', count: 189 },
  { rank: 4, name: 'PDF摘要提取', type: 'Skill', count: 156 },
  { rank: 5, name: '成绩查询', type: 'Agent', count: 132 },
];

interface UsageStatsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const UsageStatsPage: React.FC<UsageStatsPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const maxBar = Math.max(...DAILY_BARS.map((b) => b.value));

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
          {KPI_DATA.map((kpi) => {
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

        {/* Trend + Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Bar Chart */}
          <div className={`${cardClass(theme)} p-5 lg:col-span-2`}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>调用趋势（近7天）</h3>
            <div className="flex items-end gap-2 h-48">
              {DAILY_BARS.map((bar, i) => {
                const pct = maxBar > 0 ? (bar.value / maxBar) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className={`text-[10px] font-medium tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {bar.value}
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-500"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{bar.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 5 */}
          <div className={`${cardClass(theme)} p-5`}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>常用排行</h3>
            <div className="space-y-3">
              {TOP_ITEMS.map((item) => (
                <div key={item.rank} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${rankBadge(item.rank)}`}>
                    {item.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</span>
                      <span className={typeBadge(item.type)}>{item.type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${(item.count / TOP_ITEMS[0].count) * 100}%` }}
                        />
                      </div>
                      <span className={`text-[10px] tabular-nums shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.count}次
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className={`${cardClass(theme)} overflow-hidden`}>
          <div className="p-5 pb-0">
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>详细使用统计</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={tableHeadCell(theme)}>排名</th>
                  <th className={tableHeadCell(theme)}>名称</th>
                  <th className={tableHeadCell(theme)}>类型</th>
                  <th className={tableHeadCell(theme)}>调用次数</th>
                  <th className={tableHeadCell(theme)}>占比</th>
                </tr>
              </thead>
              <tbody>
                {TOP_ITEMS.map((item, i) => {
                  const totalCalls = TOP_ITEMS.reduce((s, x) => s + x.count, 0);
                  const pct = ((item.count / totalCalls) * 100).toFixed(1);
                  return (
                    <tr key={item.rank} className={tableBodyRow(theme, i)}>
                      <td className={tableCell()}>
                        <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold ${rankBadge(item.rank)}`}>
                          {item.rank}
                        </span>
                      </td>
                      <td className={tableCell()}>
                        <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</span>
                      </td>
                      <td className={tableCell()}>
                        <span className={typeBadge(item.type)}>{item.type}</span>
                      </td>
                      <td className={tableCell()}>
                        <span className={`tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.count}</span>
                      </td>
                      <td className={tableCell()}>
                        <div className="flex items-center gap-2">
                          <div className={`flex-1 h-1.5 rounded-full max-w-[60px] ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
