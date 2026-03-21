import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Zap,
  Cpu,
  Star,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';

interface UserWorkspaceOverviewProps {
  theme: Theme;
  fontSize: FontSize;
}

const quickStats = [
  { label: '可用 Agent', value: '32', icon: Bot, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: '可用 Skill', value: '89', icon: Zap, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { label: '可用应用', value: '15', icon: Cpu, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const recentUsed = [
  { name: '课表查询 Agent', type: 'Agent' as const, time: '10 分钟前', desc: '查询了本周三的课表' },
  { name: '图书馆座位查询', type: 'Skill' as const, time: '1 小时前', desc: '查询了 3 楼自习室空位' },
  { name: '一卡通余额', type: 'Skill' as const, time: '2 小时前', desc: '查询了校园卡余额' },
  { name: '智能选课助手', type: 'Agent' as const, time: '昨天', desc: '咨询了数据结构课程评价' },
  { name: '校园地图导航', type: 'Skill' as const, time: '昨天', desc: '导航至行政楼 A302' },
];

const recommendedItems = [
  {
    name: '教务成绩查询 Agent',
    type: 'Agent' as const,
    desc: '快速查询各学期成绩、GPA 与排名，支持成绩趋势分析。',
    rating: 4.8,
    calls: '12.3k',
  },
  {
    name: '智能报修助手',
    type: 'Agent' as const,
    desc: '宿舍与教室设施报修，自动分派工单并跟踪进度。',
    rating: 4.6,
    calls: '8.7k',
  },
  {
    name: '校园通知摘要',
    type: 'Skill' as const,
    desc: '自动汇总校内各部门通知，提取关键事项与截止日期。',
    rating: 4.5,
    calls: '6.2k',
  },
];

export const UserWorkspaceOverview: React.FC<UserWorkspaceOverviewProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-7xl mx-auto' : 'w-full max-w-none';

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar ${outerPad} py-2 sm:py-3 ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className={`${maxW} w-full space-y-8`}>
        {/* 欢迎区域 */}
        <section
          className={`rounded-2xl p-6 sm:p-8 ${
            isDark
              ? 'bg-gradient-to-br from-blue-950/40 via-[#1C1C1E] to-violet-950/30 border border-white/10'
              : 'bg-gradient-to-br from-blue-50 via-white to-violet-50/60 border border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className={isDark ? 'text-blue-400' : 'text-blue-500'} />
            <span className={`text-xs font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>工作台</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            欢迎回来，User
          </h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            兰智通接入平台为你提供 AI Agent、Skill 与智能应用服务。
          </p>
        </section>

        {/* 快捷统计 */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {quickStats.map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl border p-5 shadow-none transition-colors ${
                  isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
                    <s.icon size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.value}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 最近使用 */}
        <section className="space-y-4">
          <h2
            className={`text-sm font-bold tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <Clock size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            最近使用
          </h2>
          <div
            className={`rounded-2xl border overflow-hidden shadow-none ${
              isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
            } divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}
          >
            {recentUsed.map((r, i) => (
              <div
                key={r.name}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    r.type === 'Agent'
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-violet-500/10 text-violet-500'
                  }`}
                >
                  {r.type === 'Agent' ? <Bot size={16} /> : <Zap size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {r.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        r.type === 'Agent'
                          ? isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                          : isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                      }`}
                    >
                      {r.type}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{r.desc}</p>
                </div>
                <span className={`text-[11px] whitespace-nowrap shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {r.time}
                </span>
                <ChevronRight size={14} className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              </div>
            ))}
          </div>
        </section>

        {/* 推荐 Agent / Skill */}
        <section className="space-y-4">
          <h2
            className={`text-sm font-bold tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <Star size={16} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
            为你推荐
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {recommendedItems.map((item) => (
              <motion.div
                key={item.name}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.18 }}
                className={`rounded-2xl border p-5 shadow-none cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-[#1C1C1E] border-white/10 hover:border-white/[0.14] hover:bg-[#222226]'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      item.type === 'Agent'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-violet-500/10 text-violet-500'
                    }`}
                  >
                    {item.type === 'Agent' ? <Bot size={18} /> : <Zap size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {item.name}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.type === 'Agent'
                          ? isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                          : isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                </div>
                <p className={`text-[12px] leading-relaxed mb-3 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item.desc}
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.rating}</span>
                  </span>
                  <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {item.calls} 次调用
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
