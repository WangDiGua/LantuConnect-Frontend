import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Download, Clock, Users, Zap, CheckCircle2, Bot } from 'lucide-react';
import { Theme, FontSize } from '../../types';

type TimeRange = 'today' | '7d' | '30d' | '90d' | 'custom';

interface KpiData {
  totalCalls: number;
  callsTrend: number;
  avgSuccessRate: number;
  successTrend: number;
  avgLatency: number;
  latencyTrend: number;
  activeUsers: number;
  usersTrend: number;
  newAgents: number;
  agentsTrend: number;
}

interface DailyBar {
  label: string;
  value: number;
}

interface TopAgent {
  name: string;
  callCount: number;
  successRate: number;
}

interface ActiveUser {
  realName: string;
  department: string;
  callCount: number;
  lastActiveTime: string;
}

interface DeptStat {
  departmentName: string;
  userCount: number;
  totalCalls: number;
}

const KPI_BY_RANGE: Record<string, KpiData> = {
  today: { totalCalls: 1247, callsTrend: 12.5, avgSuccessRate: 98.2, successTrend: 0.3, avgLatency: 342, latencyTrend: -5.2, activeUsers: 89, usersTrend: 8.1, newAgents: 2, agentsTrend: 100 },
  '7d': { totalCalls: 8932, callsTrend: 15.3, avgSuccessRate: 97.8, successTrend: 1.2, avgLatency: 378, latencyTrend: -3.1, activeUsers: 234, usersTrend: 12.4, newAgents: 5, agentsTrend: 25 },
  '30d': { totalCalls: 35621, callsTrend: 22.1, avgSuccessRate: 97.5, successTrend: 0.8, avgLatency: 395, latencyTrend: -1.5, activeUsers: 567, usersTrend: 18.7, newAgents: 12, agentsTrend: 33.3 },
  '90d': { totalCalls: 98754, callsTrend: 45.2, avgSuccessRate: 97.1, successTrend: 2.1, avgLatency: 412, latencyTrend: 2.3, activeUsers: 892, usersTrend: 35.6, newAgents: 28, agentsTrend: 55.6 },
};

const DAILY_DATA: Record<string, DailyBar[]> = {
  today: [
    { label: '00-04', value: 45 }, { label: '04-08', value: 120 }, { label: '08-12', value: 380 },
    { label: '12-16', value: 310 }, { label: '16-20', value: 265 }, { label: '20-24', value: 127 },
  ],
  '7d': [
    { label: '周一', value: 1340 }, { label: '周二', value: 1520 }, { label: '周三', value: 1180 },
    { label: '周四', value: 1650 }, { label: '周五', value: 1420 }, { label: '周六', value: 890 }, { label: '周日', value: 932 },
  ],
  '30d': [
    { label: '第1周', value: 7800 }, { label: '第2周', value: 8900 }, { label: '第3周', value: 9200 }, { label: '第4周', value: 9721 },
  ],
  '90d': [
    { label: '1月', value: 28500 }, { label: '2月', value: 32100 }, { label: '3月', value: 38154 },
  ],
};

const TOP_AGENTS: TopAgent[] = [
  { name: '选课助手', callCount: 15200, successRate: 98.5 },
  { name: '图书馆检索', callCount: 9800, successRate: 97.2 },
  { name: '校园导览', callCount: 7560, successRate: 99.1 },
  { name: '考试通知', callCount: 6320, successRate: 96.8 },
  { name: '成绩查询', callCount: 5890, successRate: 98.9 },
];

const ACTIVE_USERS: ActiveUser[] = [
  { realName: '张明', department: '计算机学院', callCount: 342, lastActiveTime: '2026-03-21 14:23' },
  { realName: '李华', department: '信息工程学院', callCount: 289, lastActiveTime: '2026-03-21 13:45' },
  { realName: '王芳', department: '数学学院', callCount: 256, lastActiveTime: '2026-03-21 12:30' },
  { realName: '赵强', department: '物理学院', callCount: 234, lastActiveTime: '2026-03-21 11:15' },
  { realName: '陈婷', department: '外国语学院', callCount: 198, lastActiveTime: '2026-03-21 10:45' },
  { realName: '刘洋', department: '化学学院', callCount: 187, lastActiveTime: '2026-03-21 09:30' },
  { realName: '孙磊', department: '生命科学学院', callCount: 176, lastActiveTime: '2026-03-20 18:20' },
  { realName: '周文', department: '经济管理学院', callCount: 165, lastActiveTime: '2026-03-20 17:45' },
  { realName: '吴静', department: '教育学院', callCount: 154, lastActiveTime: '2026-03-20 16:30' },
  { realName: '郑伟', department: '艺术学院', callCount: 143, lastActiveTime: '2026-03-20 15:15' },
];

const DEPT_STATS: DeptStat[] = [
  { departmentName: '计算机学院', userCount: 156, totalCalls: 12340 },
  { departmentName: '信息工程学院', userCount: 132, totalCalls: 9870 },
  { departmentName: '数学学院', userCount: 98, totalCalls: 7650 },
  { departmentName: '物理学院', userCount: 87, totalCalls: 6540 },
  { departmentName: '外国语学院', userCount: 76, totalCalls: 5430 },
  { departmentName: '经济管理学院', userCount: 65, totalCalls: 4320 },
  { departmentName: '教育学院', userCount: 54, totalCalls: 3210 },
  { departmentName: '艺术学院', userCount: 43, totalCalls: 2100 },
];

function TrendBadge({ value, isDark, suffix = '%' }: { value: number; isDark: boolean; suffix?: string }) {
  const isUp = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
      {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {isUp ? '+' : ''}{value}{suffix}
    </span>
  );
}

export interface DataReportsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const DataReportsPage: React.FC<DataReportsPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const kpi = useMemo(() => {
    if (timeRange === 'custom') return KPI_BY_RANGE['30d'];
    return KPI_BY_RANGE[timeRange];
  }, [timeRange]);

  const bars = useMemo(() => {
    if (timeRange === 'custom') return DAILY_DATA['30d'];
    return DAILY_DATA[timeRange];
  }, [timeRange]);

  const maxBar = useMemo(() => Math.max(...bars.map((b) => b.value)), [bars]);

  const cardClass = `rounded-2xl border p-5 ${isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'}`;
  const thClass = `pb-3 pr-4 text-left text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`;
  const tdClass = `py-2.5 pr-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`;
  const trBorder = `border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`;
  const inputClass = `px-3 py-2 rounded-xl text-sm border outline-none ${
    isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
  }`;

  const timeButtons: { label: string; value: TimeRange }[] = [
    { label: '今天', value: 'today' },
    { label: '近7天', value: '7d' },
    { label: '近30天', value: '30d' },
    { label: '近90天', value: '90d' },
  ];

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
      <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 lg:px-4 py-2 sm:py-3 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200/80'}`}>
              <BarChart3 size={22} className="text-indigo-500" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>数据报表</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                平台调用统计、用户活跃分析与趋势报表
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Time Range */}
        <div className={`${cardClass} mb-4 shrink-0`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>时间范围</span>
            <div className="flex gap-2">
              {timeButtons.map((tb) => (
                <button
                  key={tb.value}
                  type="button"
                  onClick={() => setTimeRange(tb.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    timeRange === tb.value
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tb.label}
                </button>
              ))}
            </div>
            <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setTimeRange('custom'); }}
                className={inputClass}
              />
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>至</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setTimeRange('custom'); }}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 2: KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4 shrink-0">
          {[
            { label: '总调用次数', value: kpi.totalCalls.toLocaleString(), trend: kpi.callsTrend, icon: Zap, color: 'text-blue-500' },
            { label: '平均成功率', value: `${kpi.avgSuccessRate}%`, trend: kpi.successTrend, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: '平均响应时间', value: `${kpi.avgLatency}ms`, trend: kpi.latencyTrend, icon: Clock, color: 'text-amber-500' },
            { label: '活跃用户数', value: kpi.activeUsers.toLocaleString(), trend: kpi.usersTrend, icon: Users, color: 'text-violet-500' },
            { label: '新注册 Agent', value: kpi.newAgents.toString(), trend: kpi.agentsTrend, icon: Bot, color: 'text-pink-500' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={cardClass}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={item.color} />
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.label}</span>
                </div>
                <div className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</div>
                <TrendBadge value={item.trend} isDark={isDark} />
              </div>
            );
          })}
        </div>

        {/* Section 3: Trend Chart + Top Agents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Bar Chart */}
          <div className={`${cardClass} lg:col-span-2`}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>调用趋势</h3>
            <div className="flex items-end gap-2 h-48">
              {bars.map((bar, i) => {
                const pct = maxBar > 0 ? (bar.value / maxBar) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className={`text-[10px] font-medium tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {bar.value.toLocaleString()}
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{bar.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 5 Agents */}
          <div className={cardClass}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>调用量 Top 5</h3>
            <div className="space-y-3">
              {TOP_AGENTS.map((agent, i) => (
                <div key={agent.name} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{agent.name}</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${(agent.callCount / TOP_AGENTS[0].callCount) * 100}%` }}
                        />
                      </div>
                      <span className={`text-[10px] tabular-nums shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {agent.callCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: User Dimension */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Top 10 Active Users */}
          <div className={cardClass}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Top 10 活跃用户</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={thClass}>姓名</th>
                    <th className={thClass}>部门</th>
                    <th className={thClass}>调用次数</th>
                    <th className={thClass}>最后活跃</th>
                  </tr>
                </thead>
                <tbody>
                  {ACTIVE_USERS.map((u) => (
                    <tr key={u.realName} className={trBorder}>
                      <td className={tdClass}><span className="font-medium">{u.realName}</span></td>
                      <td className={tdClass}>{u.department}</td>
                      <td className={`${tdClass} tabular-nums`}>{u.callCount}</td>
                      <td className={`${tdClass} text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{u.lastActiveTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Stats */}
          <div className={cardClass}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>按部门统计</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={thClass}>部门</th>
                    <th className={thClass}>用户数</th>
                    <th className={thClass}>总调用量</th>
                    <th className={thClass}>占比</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPT_STATS.map((d) => {
                    const totalAll = DEPT_STATS.reduce((s, x) => s + x.totalCalls, 0);
                    const pct = ((d.totalCalls / totalAll) * 100).toFixed(1);
                    return (
                      <tr key={d.departmentName} className={trBorder}>
                        <td className={tdClass}><span className="font-medium">{d.departmentName}</span></td>
                        <td className={`${tdClass} tabular-nums`}>{d.userCount}</td>
                        <td className={`${tdClass} tabular-nums`}>{d.totalCalls.toLocaleString()}</td>
                        <td className={tdClass}>
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

        {/* Section 5: Export */}
        <div className={`${cardClass} mb-4 shrink-0`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>数据导出</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => alert('导出 CSV 功能开发中（演示）')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Download size={14} />
                导出 CSV
              </button>
              <button
                type="button"
                onClick={() => alert('导出 PDF 功能开发中（演示）')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Download size={14} />
                导出 PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
