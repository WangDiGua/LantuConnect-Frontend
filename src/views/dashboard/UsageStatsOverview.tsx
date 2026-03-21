import React from 'react';
import type { Theme, FontSize } from '../../types';
import { pageBg, cardClass } from '../../utils/uiClasses';
import { BarChart3, Zap, Users, Clock, TrendingUp } from 'lucide-react';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

interface DailyCall { day: string; count: number; }
interface TopItem { rank: number; name: string; type: string; calls: number; avgMs: number; }
interface DeptUsage { dept: string; calls: number; users: number; topAgent: string; }

const DAILY_CALLS: DailyCall[] = [
  { day: '03-15', count: 1240 },
  { day: '03-16', count: 980 },
  { day: '03-17', count: 1560 },
  { day: '03-18', count: 2100 },
  { day: '03-19', count: 1890 },
  { day: '03-20', count: 2350 },
  { day: '03-21', count: 1720 },
];

const TOP_ITEMS: TopItem[] = [
  { rank: 1, name: '课表查询助手', type: 'Agent', calls: 3842, avgMs: 120 },
  { rank: 2, name: '天气查询', type: 'Skill', calls: 2915, avgMs: 45 },
  { rank: 3, name: '智能问答助手', type: 'Agent', calls: 2680, avgMs: 210 },
  { rank: 4, name: '文档摘要生成', type: 'Skill', calls: 1920, avgMs: 1800 },
  { rank: 5, name: '图书检索 Agent', type: 'Agent', calls: 1756, avgMs: 85 },
  { rank: 6, name: '知识库检索', type: 'Skill', calls: 1540, avgMs: 178 },
  { rank: 7, name: '邮件发送工具', type: 'Skill', calls: 1320, avgMs: 68 },
  { rank: 8, name: '校园导航 Bot', type: 'Agent', calls: 1180, avgMs: 156 },
  { rank: 9, name: '日程提醒服务', type: 'Skill', calls: 980, avgMs: 92 },
  { rank: 10, name: '一卡通查询', type: 'Skill', calls: 850, avgMs: 310 },
];

const DEPT_USAGE: DeptUsage[] = [
  { dept: '计算机科学学院', calls: 4520, users: 312, topAgent: '课表查询助手' },
  { dept: '外国语学院', calls: 3180, users: 256, topAgent: '智能问答助手' },
  { dept: '数学与统计学院', calls: 2760, users: 198, topAgent: '天气查询' },
  { dept: '管理学院', calls: 2340, users: 175, topAgent: '文档摘要生成' },
  { dept: '机械工程学院', calls: 1890, users: 142, topAgent: '图书检索 Agent' },
  { dept: '教务处', calls: 1560, users: 28, topAgent: '教务通知推送' },
  { dept: '图书馆', calls: 1240, users: 15, topAgent: '知识库检索' },
];

const KPI = [
  { label: '今日调用', value: '1,720', icon: Zap, color: 'text-blue-600 bg-blue-50', dark: 'text-blue-400 bg-blue-500/15' },
  { label: '本周调用', value: '11,840', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', dark: 'text-emerald-400 bg-emerald-500/15' },
  { label: '月活用户', value: '1,126', icon: Users, color: 'text-purple-600 bg-purple-50', dark: 'text-purple-400 bg-purple-500/15' },
  { label: '平均响应', value: '186 ms', icon: Clock, color: 'text-amber-600 bg-amber-50', dark: 'text-amber-400 bg-amber-500/15' },
];

export const UsageStatsOverview: React.FC<Props> = ({ theme }) => {
  const isDark = theme === 'dark';
  const maxDailyCall = Math.max(...DAILY_CALLS.map(d => d.count));

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
        {/* KPI Cards */}
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

        {/* Bar Chart - 近7天调用趋势 */}
        <div className={`${cardClass(theme)} p-5`}>
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>近 7 天调用趋势</h3>
          <div className="flex items-end gap-2 h-40">
            {DAILY_CALLS.map(d => {
              const pct = maxDailyCall > 0 ? (d.count / maxDailyCall) * 100 : 0;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{d.count}</span>
                  <div className="w-full flex justify-center" style={{ height: '120px' }}>
                    <div
                      className={`w-full max-w-[40px] rounded-t-lg transition-all ${isDark ? 'bg-indigo-500/60' : 'bg-indigo-400'}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top 10 */}
          <div className={`${cardClass(theme)} overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Top 10 最常用 Agent/Skill</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                    <th className={`px-4 py-2.5 font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>#</th>
                    <th className={`px-4 py-2.5 font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>名称</th>
                    <th className={`px-4 py-2.5 font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>类型</th>
                    <th className={`px-4 py-2.5 font-semibold text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>调用次数</th>
                    <th className={`px-4 py-2.5 font-semibold text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>平均延迟</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_ITEMS.map((item, i) => (
                    <tr key={item.rank} className={`border-b transition-colors ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}`}>
                      <td className={`px-4 py-2.5 font-bold text-xs ${item.rank <= 3 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>{item.rank}</td>
                      <td className={`px-4 py-2.5 font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{item.type}</span>
                      </td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.calls.toLocaleString()}</td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.avgMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Usage */}
          <div className={`${cardClass(theme)} overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>部门使用排行</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10 bg-[#2C2C2E]/80' : 'border-slate-200 bg-slate-50'}`}>
                    <th className={`px-4 py-2.5 font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>部门</th>
                    <th className={`px-4 py-2.5 font-semibold text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>调用次数</th>
                    <th className={`px-4 py-2.5 font-semibold text-xs text-right ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>活跃用户</th>
                    <th className={`px-4 py-2.5 font-semibold text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>最常用</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPT_USAGE.map((dept, i) => (
                    <tr key={dept.dept} className={`border-b transition-colors ${isDark ? `border-white/5 ${i % 2 === 0 ? 'bg-[#1C1C1E]' : 'bg-[#2C2C2E]/40'}` : `border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}`}>
                      <td className={`px-4 py-2.5 font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{dept.dept}</td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{dept.calls.toLocaleString()}</td>
                      <td className={`px-4 py-2.5 text-right font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{dept.users}</td>
                      <td className={`px-4 py-2.5 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{dept.topAgent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
