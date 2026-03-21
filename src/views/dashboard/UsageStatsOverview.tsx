import React, { useState, useEffect, useCallback } from 'react';
import type { Theme, FontSize } from '../../types';
import { pageBg, cardClass } from '../../utils/uiClasses';
import { BarChart3, Zap, Users, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { dashboardService } from '../../api/services/dashboard.service';
import type { UsageStatsData, UsageStatsPoint } from '../../types/dto/dashboard';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

export const UsageStatsOverview: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [data, setData] = useState<UsageStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await dashboardService.getUsageStats('7d');
      setData(result);
    } catch (err) {
      console.error('Failed to load usage stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const points = data?.points ?? [];
  const maxDailyCall = Math.max(...points.map(d => d.calls), 1);

  const KPI = [
    { label: '今日调用', value: points.length > 0 ? points[points.length - 1].calls.toLocaleString() : '0', icon: Zap, color: 'text-blue-600 bg-blue-50', dark: 'text-blue-400 bg-blue-500/15' },
    { label: '总调用', value: data ? data.totalCalls.toLocaleString() : '0', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', dark: 'text-emerald-400 bg-emerald-500/15' },
    { label: '活跃用户', value: data ? data.activeUsers.toLocaleString() : '0', icon: Users, color: 'text-purple-600 bg-purple-50', dark: 'text-purple-400 bg-purple-500/15' },
    { label: '总 Tokens', value: data ? data.totalTokens.toLocaleString() : '0', icon: Clock, color: 'text-amber-600 bg-amber-50', dark: 'text-amber-400 bg-amber-500/15' },
  ];

  const topItems = [...points].sort((a, b) => b.calls - a.calls).slice(0, 10);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${pageBg(theme)}`}>
      <div className={`shrink-0 z-20 border-b px-4 sm:px-6 py-4 flex items-center gap-3 ${isDark ? 'border-white/10' : 'border-slate-200/80'} ${pageBg(theme)}`}>
        <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
          <BarChart3 size={20} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>使用统计</h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>全平台 Agent / Skill 调用量与用户活跃度概览</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-4 space-y-5">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {KPI.map(k => (
                <div key={k.label} className={`${cardClass(theme)} p-4 flex items-center gap-3`}>
                  <div className={`p-2.5 rounded-xl ${isDark ? k.dark : k.color}`}>
                    <k.icon size={20} />
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{k.value}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{k.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${cardClass(theme)} p-5`}>
              <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>近 7 天调用趋势</h3>
              <div className="flex items-end gap-2 h-40">
                {points.map(d => {
                  const pct = maxDailyCall > 0 ? (d.calls / maxDailyCall) * 100 : 0;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{d.calls}</span>
                      <div className="w-full flex justify-center" style={{ height: '120px' }}>
                        <div
                          className={`w-full max-w-[40px] rounded-t-lg transition-all ${isDark ? 'bg-indigo-500/60' : 'bg-indigo-400'}`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={`${cardClass(theme)} overflow-hidden`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>按日期调用排行</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                        <th className={`px-4 py-2.5 font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>#</th>
                        <th className={`px-4 py-2.5 font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>日期</th>
                        <th className={`px-4 py-2.5 font-semibold text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>调用次数</th>
                        <th className={`px-4 py-2.5 font-semibold text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>活跃用户</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.map((item, i) => (
                        <tr key={item.date} className={`border-b transition-colors ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}`}>
                          <td className={`px-4 py-2.5 font-bold text-xs ${i < 3 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>{i + 1}</td>
                          <td className={`px-4 py-2.5 font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.date}</td>
                          <td className={`px-4 py-2.5 text-right font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.calls.toLocaleString()}</td>
                          <td className={`px-4 py-2.5 text-right font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.users}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`${cardClass(theme)} overflow-hidden`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Token 消耗趋势</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                        <th className={`px-4 py-2.5 font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>日期</th>
                        <th className={`px-4 py-2.5 font-semibold text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Tokens</th>
                        <th className={`px-4 py-2.5 font-semibold text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>调用次数</th>
                        <th className={`px-4 py-2.5 font-semibold text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>用户数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {points.map((pt, i) => (
                        <tr key={pt.date} className={`border-b transition-colors ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}`}>
                          <td className={`px-4 py-2.5 font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{pt.date}</td>
                          <td className={`px-4 py-2.5 text-right font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{pt.tokens.toLocaleString()}</td>
                          <td className={`px-4 py-2.5 text-right font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{pt.calls.toLocaleString()}</td>
                          <td className={`px-4 py-2.5 text-right font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{pt.users}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
