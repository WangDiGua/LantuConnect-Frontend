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
import { pageBg, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { KpiCard } from '../../components/common/KpiCard';
import { AnimatedList } from '../../components/common/AnimatedList';

interface UserWorkspaceOverviewProps {
  theme: Theme;
  fontSize: FontSize;
}

const quickStats = [
  { label: '可用 Agent', value: 32, icon: Bot, glow: 'indigo' as const },
  { label: '可用 Skill', value: 89, icon: Zap, glow: 'emerald' as const },
  { label: '可用应用', value: 15, icon: Cpu, glow: 'amber' as const },
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
    glow: 'indigo' as const,
  },
  {
    name: '智能报修助手',
    type: 'Agent' as const,
    desc: '宿舍与教室设施报修，自动分派工单并跟踪进度。',
    rating: 4.6,
    calls: '8.7k',
    glow: 'emerald' as const,
  },
  {
    name: '校园通知摘要',
    type: 'Skill' as const,
    desc: '自动汇总校内各部门通知，提取关键事项与截止日期。',
    rating: 4.5,
    calls: '6.2k',
    glow: 'amber' as const,
  },
];

export const UserWorkspaceOverview: React.FC<UserWorkspaceOverviewProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-7xl mx-auto' : 'w-full max-w-none';

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${outerPad} py-4 sm:py-6 ${pageBg(theme)}`}>
      <div className={`${maxW} w-full space-y-6`}>

        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <BentoCard theme={theme} padding="lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className={isDark ? 'text-blue-400' : 'text-blue-500'} />
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">工作台</span>
            </div>
            <h1 className={`text-3xl sm:text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r ${
              isDark
                ? 'from-white via-blue-200 to-violet-300'
                : 'from-slate-900 via-blue-700 to-violet-600'
            } bg-clip-text text-transparent`}>
              欢迎回来，User
            </h1>
            <p className={`text-sm ${textSecondary(theme)}`}>
              兰智通接入平台为你提供 AI Agent、Skill 与智能应用服务。
            </p>
          </BentoCard>
        </motion.div>

        {/* Quick Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {quickStats.map((s, i) => (
            <KpiCard
              key={s.label}
              theme={theme}
              label={s.label}
              value={s.value}
              icon={<s.icon size={16} />}
              glow={s.glow}
              delay={i * 0.05}
            />
          ))}
        </section>

        {/* Recent Usage */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.15 }}
        >
          <BentoCard theme={theme} padding="sm" className="!p-0">
            <div className={`flex items-center gap-2 px-5 py-3.5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <Clock size={15} className={textMuted(theme)} />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">最近使用</h2>
            </div>
            <AnimatedList className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-slate-100'}`}>
              {recentUsed.map((r) => (
                <div
                  key={r.name}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    r.type === 'Agent' ? 'bg-blue-500/10 text-blue-500' : 'bg-violet-500/10 text-violet-500'
                  }`}>
                    {r.type === 'Agent' ? <Bot size={16} /> : <Zap size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-medium truncate ${textPrimary(theme)}`}>{r.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        r.type === 'Agent'
                          ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-700'
                          : isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-700'
                      }`}>
                        {r.type}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 truncate ${textMuted(theme)}`}>{r.desc}</p>
                  </div>
                  <span className={`text-[11px] whitespace-nowrap shrink-0 ${textMuted(theme)}`}>{r.time}</span>
                  <ChevronRight size={14} className={textMuted(theme)} />
                </div>
              ))}
            </AnimatedList>
          </BentoCard>
        </motion.div>

        {/* Recommendations */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Star size={16} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">为你推荐</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {recommendedItems.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 + i * 0.05 }}
              >
                <BentoCard theme={theme} hover glow={item.glow}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      item.type === 'Agent' ? 'bg-blue-500/10 text-blue-500' : 'bg-violet-500/10 text-violet-500'
                    }`}>
                      {item.type === 'Agent' ? <Bot size={18} /> : <Zap size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-bold truncate ${textPrimary(theme)}`}>{item.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.type === 'Agent'
                          ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-700'
                          : isDark ? 'bg-violet-500/15 text-violet-400' : 'bg-violet-50 text-violet-700'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                  <p className={`text-[12px] leading-relaxed mb-3 line-clamp-2 ${textSecondary(theme)}`}>
                    {item.desc}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <span className={`text-xs font-medium ${textPrimary(theme)}`}>{item.rating}</span>
                    </span>
                    <span className={`text-[11px] ${textMuted(theme)}`}>{item.calls} 次调用</span>
                  </div>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};
