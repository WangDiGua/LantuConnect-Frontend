import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Zap,
  Cpu,
  Activity,
  Shield,
  Database,
  Settings,
  User,
  Megaphone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Server,
  Loader2,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { HeroCarousel, type HeroSlide } from '../../components/ui/HeroCarousel';
import { OverviewAnalyticsGrid } from '../../components/charts/OverviewAnalyticsGrid';
import { dashboardService } from '../../api/services/dashboard.service';
import type { AdminOverview } from '../../types/dto/dashboard';
import { pageBg, textPrimary, textSecondary, textMuted } from '../../utils/uiClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { KpiCard } from '../../components/common/KpiCard';
import { AnimatedList } from '../../components/common/AnimatedList';

interface OverviewProps {
  theme: Theme;
  fontSize: FontSize;
}

const slides: HeroSlide[] = [
  {
    kicker: '接入平台',
    title: '新一批 Agent 已完成注册审核',
    body: '本周已通过 8 个 Agent 和 12 个 Skill 的注册审核，涵盖教务查询、课表管理等场景。',
    lightMesh: 'from-slate-100 via-white to-blue-50/90',
    darkMesh: 'from-[#141418] via-[#1C1C1E] to-blue-950/40',
    kickerLight: 'text-slate-600',
    kickerDark: 'text-slate-400',
  },
  {
    kicker: '数据服务',
    title: '教务与一卡通数据对接巡检完成',
    body: '本周已完成接口健康检查，异常率低于阈值；各单位可按流程提交变更申请。',
    lightMesh: 'from-blue-50/80 via-white to-indigo-50/70',
    darkMesh: 'from-blue-950/50 via-[#1C1C1E] to-indigo-950/35',
    kickerLight: 'text-blue-700',
    kickerDark: 'text-blue-300',
  },
  {
    kicker: '运维',
    title: '夜间维护窗口：周日 00:00–02:00',
    body: '模型网关将滚动升级，期间可能出现短暂排队，请提前安排批量任务。',
    lightMesh: 'from-amber-50/90 via-white to-orange-50/60',
    darkMesh: 'from-amber-950/30 via-[#1C1C1E] to-orange-950/25',
    kickerLight: 'text-amber-800',
    kickerDark: 'text-amber-200',
  },
];

const announcements = [
  { date: '03-18', title: '关于统一身份认证升级的配合事项', tag: '重要' },
  { date: '03-15', title: 'API 调用配额统计口径说明', tag: '说明' },
  { date: '03-12', title: '新增 Dataset 批量导入功能', tag: '更新' },
  { date: '03-08', title: '监控中心告警订阅功能开放试用', tag: '功能' },
];

const KPI_GLOWS: ('indigo' | 'emerald' | 'amber' | 'rose')[] = ['indigo', 'emerald', 'emerald', 'amber', 'rose'];
const KPI_ICONS_LIST = [Bot, Zap, Cpu, Database, Server];

const STATUS_DISPLAY: Record<string, { light: string; dark: string; label: string }> = {
  published: { light: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60', dark: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20', label: '已发布' },
  testing: { light: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60', dark: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20', label: '测试中' },
  pending_review: { light: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60', dark: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20', label: '待审核' },
};

const modules = [
  { title: 'Agent 管理', desc: 'Agent 注册、审核、测试与发布全流程管理。', icon: Bot, glow: 'indigo' as const },
  { title: 'Skill 管理', desc: 'MCP 工具注册与参数配置，支持 HTTP/内置类型。', icon: Zap, glow: 'emerald' as const },
  { title: '智能应用', desc: '应用注册、嵌入配置与上架管理。', icon: Cpu, glow: 'amber' as const },
  { title: '监控中心', desc: '调用日志、性能分析、告警规则与告警记录。', icon: Activity, glow: 'rose' as const },
  { title: '用户管理', desc: '账号、角色、API Key 与组织架构管理。', icon: User, glow: 'indigo' as const },
  { title: '系统配置', desc: '分类管理、Provider 配置与审计日志。', icon: Settings, glow: 'emerald' as const },
];

export const Overview: React.FC<OverviewProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-7xl mx-auto' : 'w-full max-w-none';

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await dashboardService.getAdminOverview();
      setOverview(result);
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const platformKpis = (overview?.kpis ?? []).map((k, i) => ({
    label: k.label,
    value: String(k.value),
    trend: k.trend,
    icon: KPI_ICONS_LIST[i % KPI_ICONS_LIST.length],
    glow: KPI_GLOWS[i % KPI_GLOWS.length],
  }));

  const healthSummary = overview?.healthSummary ?? { healthy: 0, warning: 0, down: 0 };
  const recentRegistrations = overview?.recentRegistrations ?? [];

  if (loading && !overview) {
    return (
      <div className={`flex-1 flex items-center justify-center ${pageBg(theme)}`}>
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${outerPad} py-4 sm:py-6 ${pageBg(theme)}`}>
      <div className={`${maxW} w-full space-y-6`}>

        {/* KPI Row */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {platformKpis.map((k, i) => (
            <KpiCard
              key={k.label}
              theme={theme}
              label={k.label}
              value={k.value}
              trend={k.trend}
              icon={<k.icon size={16} />}
              glow={k.glow}
              delay={i * 0.05}
            />
          ))}
        </section>

        {/* Carousel + Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <BentoCard theme={theme} padding="sm" className="lg:col-span-2 overflow-hidden !p-0">
            <HeroCarousel theme={theme} slides={slides} />
          </BentoCard>

          <BentoCard theme={theme} padding="sm" className="flex flex-col min-h-0 !p-0">
            <div className={`flex items-center gap-2 px-5 py-3.5 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <Megaphone size={15} className={textMuted(theme)} />
              <h2 className={`text-sm font-semibold uppercase tracking-wider ${textSecondary(theme)}`}>通知公告</h2>
            </div>
            <AnimatedList className="flex-1 overflow-y-auto custom-scrollbar max-h-[280px] lg:max-h-none">
              {announcements.map((a) => (
                <button
                  key={a.title}
                  type="button"
                  className={`w-full text-left px-5 py-3 flex gap-3 items-start transition-colors ${
                    isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-lg ${
                    isDark ? 'bg-white/[0.06] text-slate-500' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Calendar size={10} className="opacity-70" />
                    {a.date}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] font-medium leading-snug ${textPrimary(theme)}`}>
                      {a.title}
                    </span>
                    <span className={`text-[10px] mt-0.5 inline-block ${textMuted(theme)}`}>
                      {a.tag}
                    </span>
                  </span>
                </button>
              ))}
            </AnimatedList>
          </BentoCard>
        </div>

        <OverviewAnalyticsGrid theme={theme} />

        {/* Health + Recent Registrations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.15 }}
          >
            <BentoCard theme={theme}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                健康状态
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '正常运行', count: healthSummary.healthy, icon: CheckCircle2, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50' },
                  { label: '告警中', count: healthSummary.warning, icon: AlertTriangle, color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
                  { label: '维护中', count: healthSummary.down, icon: Clock, color: isDark ? 'text-slate-400' : 'text-slate-500', bg: isDark ? 'bg-white/[0.04]' : 'bg-slate-50' },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl p-3 text-center ${item.bg}`}>
                    <item.icon size={20} className={`${item.color} mx-auto mb-1.5`} />
                    <p className={`text-2xl font-bold tracking-tight ${textPrimary(theme)}`}>{item.count}</p>
                    <p className={`text-[11px] mt-0.5 ${textSecondary(theme)}`}>{item.label}</p>
                  </div>
                ))}
              </div>
            </BentoCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
          >
            <BentoCard theme={theme} padding="sm" className="!p-0 h-full flex flex-col">
              <div className={`flex items-center gap-2 px-5 py-3.5 border-b shrink-0 ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">最近注册</h2>
              </div>
              <AnimatedList className={`flex-1 overflow-y-auto custom-scrollbar divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-slate-100'}`}>
                {recentRegistrations.map((r) => {
                  const badge = STATUS_DISPLAY[r.status] ?? STATUS_DISPLAY.published;
                  return (
                    <div
                      key={r.name}
                      className={`px-5 py-3 flex items-center gap-3 transition-colors ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        r.type === 'Agent' ? 'bg-blue-500/10 text-blue-500' : 'bg-violet-500/10 text-violet-500'
                      }`}>
                        {r.type === 'Agent' ? <Bot size={14} /> : <Zap size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium truncate ${textPrimary(theme)}`}>{r.name}</p>
                        <p className={`text-[11px] ${textMuted(theme)}`}>{r.type} · {r.time}</p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${isDark ? badge.dark : badge.light}`}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </AnimatedList>
            </BentoCard>
          </motion.div>
        </div>

        {/* Platform Capabilities */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">平台能力</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {modules.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: i * 0.05 }}
              >
                <BentoCard theme={theme} hover glow={m.glow}>
                  <div className="flex gap-4 items-start">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDark ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <m.icon size={20} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className={`text-[15px] font-bold leading-snug mb-1 ${textPrimary(theme)}`}>{m.title}</h3>
                      <p className={`text-[12px] leading-relaxed ${textSecondary(theme)}`}>{m.desc}</p>
                    </div>
                  </div>
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Security Banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.35 }}
        >
          <BentoCard theme={theme} glow="emerald" className="!border-l-4 !border-l-emerald-500/80">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <Shield size={24} />
              </div>
              <div className="min-w-0">
                <h3 className={`font-bold text-sm ${textPrimary(theme)}`}>安全与审计</h3>
                <p className={`text-[12px] mt-1 leading-relaxed ${textSecondary(theme)}`}>
                  密钥与令牌在用户管理中维护；限流与审计日志在系统配置中查看。生产环境请对接统一身份与机构存储策略。
                </p>
              </div>
            </div>
          </BentoCard>
        </motion.div>
      </div>
    </div>
  );
};
