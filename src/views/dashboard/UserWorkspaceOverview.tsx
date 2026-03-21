import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Zap,
  Cpu,
  Star,
  Clock,
  ChevronRight,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import type { UserWorkspace } from '../../types/dto/dashboard';
import { dashboardService } from '../../api/services/dashboard.service';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { pageBg, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { KpiCard } from '../../components/common/KpiCard';
import { AnimatedList } from '../../components/common/AnimatedList';

interface UserWorkspaceOverviewProps {
  theme: Theme;
  fontSize: FontSize;
}

const FALLBACK_STATS = [
  { label: '可用 Agent', value: 0, icon: Bot, glow: 'indigo' as const },
  { label: '可用 Skill', value: 0, icon: Zap, glow: 'emerald' as const },
  { label: '今日使用', value: 0, icon: Cpu, glow: 'amber' as const },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

export const UserWorkspaceOverview: React.FC<UserWorkspaceOverviewProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-7xl mx-auto' : 'w-full max-w-none';

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<UserWorkspace | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    dashboardService.getUserWorkspace()
      .then((data) => { if (!cancelled) setWorkspace(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const quickStats = workspace
    ? [
        { label: '最近 Agent', value: workspace.recentAgents.length, icon: Bot, glow: 'indigo' as const },
        { label: '最近 Skill', value: workspace.recentSkills.length, icon: Zap, glow: 'emerald' as const },
        { label: '今日使用', value: workspace.totalUsageToday, icon: Cpu, glow: 'amber' as const },
      ]
    : FALLBACK_STATS;

  const recentItems = workspace
    ? [
        ...workspace.recentAgents.map((a) => ({ name: a.displayName, type: 'Agent' as const, time: timeAgo(a.lastUsedTime), icon: a.icon })),
        ...workspace.recentSkills.map((s) => ({ name: s.displayName, type: 'Skill' as const, time: timeAgo(s.lastUsedTime), icon: s.icon })),
      ].slice(0, 5)
    : [];

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${pageBg(theme)}`}>
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

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
              {recentItems.length === 0 ? [
                <div key="empty" className={`px-5 py-8 text-center text-sm ${textMuted(theme)}`}>暂无使用记录</div>,
              ] : recentItems.map((r) => (
                <div
                  key={r.name + r.type}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    r.type === 'Agent' ? 'bg-blue-500/10 text-blue-500' : 'bg-violet-500/10 text-violet-500'
                  }`}>
                    {r.icon ? <span className="text-base">{r.icon}</span> : r.type === 'Agent' ? <Bot size={16} /> : <Zap size={16} />}
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
                  </div>
                  <span className={`text-[11px] whitespace-nowrap shrink-0 ${textMuted(theme)}`}>{r.time}</span>
                  <ChevronRight size={14} className={textMuted(theme)} />
                </div>
              ))}
            </AnimatedList>
          </BentoCard>
        </motion.div>

        {/* Quick Actions */}
        {workspace && workspace.quickActions.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Star size={16} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">快捷入口</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {workspace.quickActions.map((action, i) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 + i * 0.05 }}
                >
                  <BentoCard theme={theme} hover glow={i % 2 === 0 ? 'indigo' : 'emerald'}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{action.icon}</span>
                      <span className={`text-sm font-bold ${textPrimary(theme)}`}>{action.label}</span>
                    </div>
                  </BentoCard>
                </motion.div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
