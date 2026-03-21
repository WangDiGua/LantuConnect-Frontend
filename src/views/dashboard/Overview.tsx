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
  ChevronRight,
  MessageSquare,
  Megaphone,
  Calendar,
  ArrowUpRight,
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

const KPI_ICONS: { icon: React.ElementType; color: string; bg: string }[] = [
  { icon: Bot, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: Zap, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { icon: Cpu, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: Database, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { icon: Server, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
];

const STATUS_DISPLAY: Record<string, { light: string; dark: string; label: string }> = {
  published: { light: 'bg-emerald-100 text-emerald-800', dark: 'bg-emerald-500/20 text-emerald-300', label: '已发布' },
  testing: { light: 'bg-blue-100 text-blue-800', dark: 'bg-blue-500/20 text-blue-300', label: '测试中' },
  pending_review: { light: 'bg-amber-100 text-amber-900', dark: 'bg-amber-500/20 text-amber-300', label: '待审核' },
};

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
    delta: k.trend > 0 ? `+${k.trend}%` : `${k.trend}%`,
    up: k.trend >= 0,
    ...(KPI_ICONS[i % KPI_ICONS.length]),
  }));

  const healthSummary = overview?.healthSummary ?? { healthy: 0, warning: 0, down: 0 };
  const recentRegistrations = overview?.recentRegistrations ?? [];

  const modules = [
    { title: 'Agent 管理', desc: 'Agent 注册、审核、测试与发布全流程管理。', icon: Bot },
    { title: 'Skill 管理', desc: 'MCP 工具注册与参数配置，支持 HTTP/内置类型。', icon: Zap },
    { title: '智能应用', desc: '应用注册、嵌入配置与上架管理。', icon: Cpu },
    { title: '监控中心', desc: '调用日志、性能分析、告警规则与告警记录。', icon: Activity },
    { title: '用户管理', desc: '账号、角色、API Key 与组织架构管理。', icon: User },
    { title: '系统配置', desc: '分类管理、Provider 配置与审计日志。', icon: Settings },
  ];

  const shortcuts = [
    { label: 'Agent 列表', icon: Bot, hint: 'Agent 管理 · 查看全部' },
    { label: 'Skill 列表', icon: Zap, hint: 'Skill 管理 · 查看全部' },
    { label: '数据集', icon: Database, hint: '数据集管理 · 查看全部' },
    { label: '监控概览', icon: Activity, hint: '监控中心 · 运行概览' },
  ];

  if (loading && !overview) {
    return (
      <div className={`flex-1 flex items-center justify-center ${isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'}`}>
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar ${outerPad} py-2 sm:py-3 ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className={`${maxW} w-full space-y-8`}>
        {/* KPI 总览 */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {platformKpis.map((k) => (
              <div
                key={k.label}
                className={`rounded-2xl border p-4 shadow-none transition-colors ${
                  isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.bg} ${k.color}`}>
                    <k.icon size={16} strokeWidth={2} />
                  </div>
                  <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{k.label}</span>
                </div>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{k.value}</p>
                <p className={`text-xs mt-1 flex items-center gap-0.5 ${k.up ? 'text-emerald-500' : 'text-red-400'}`}>
                  <ArrowUpRight size={12} className={k.up ? '' : 'rotate-90'} />
                  {k.delta}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 轮播 + 公告 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <HeroCarousel theme={theme} slides={slides} className="lg:col-span-2" />

          <aside className="card card-border bg-base-100 border-base-200 shadow-none rounded-2xl flex flex-col min-h-0">
            <div className="card-body p-0 flex flex-col min-h-0">
            <div
              className={`flex items-center gap-2 px-4 py-3 border-b shrink-0 ${
                isDark ? 'border-white/10' : 'border-base-200'
              }`}
            >
              <Megaphone size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <h2 className={`card-title text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>通知公告</h2>
            </div>
            <ul className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-dashed max-h-[280px] lg:max-h-none">
              {announcements.map((a) => (
                <li key={a.title}>
                  <button
                    type="button"
                    className={`w-full text-left px-4 py-3 flex gap-3 items-start transition-colors ${
                      isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-lg ${
                        isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Calendar size={10} className="opacity-70" />
                      {a.date}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] font-medium leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {a.title}
                      </span>
                      <span className={`text-[10px] mt-0.5 inline-block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        {a.tag}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            </div>
          </aside>
        </div>

        <OverviewAnalyticsGrid theme={theme} />

        {/* 健康状态 + 最近注册 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* 健康状态 */}
          <section
            className={`rounded-2xl border p-5 shadow-none ${
              isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
            }`}
          >
            <h2
              className={`text-sm font-bold tracking-tight flex items-center gap-2 mb-4 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span className="w-1 h-4 rounded-full bg-emerald-500 shrink-0" aria-hidden />
              健康状态
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div
                className={`rounded-xl p-3 text-center ${
                  isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
                }`}
              >
                <CheckCircle2 size={20} className="text-emerald-500 mx-auto mb-1" />
                <p className={`text-lg font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{healthSummary.healthy}</p>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>正常运行</p>
              </div>
              <div
                className={`rounded-xl p-3 text-center ${
                  isDark ? 'bg-amber-500/10' : 'bg-amber-50'
                }`}
              >
                <AlertTriangle size={20} className="text-amber-500 mx-auto mb-1" />
                <p className={`text-lg font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{healthSummary.warning}</p>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>告警中</p>
              </div>
              <div
                className={`rounded-xl p-3 text-center ${
                  isDark ? 'bg-slate-500/10' : 'bg-slate-50'
                }`}
              >
                <Clock size={20} className={`mx-auto mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                <p className={`text-lg font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{healthSummary.down}</p>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>维护中</p>
              </div>
            </div>
          </section>

          {/* 最近注册 */}
          <section
            className={`rounded-2xl border shadow-none ${
              isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
            }`}
          >
            <div
              className={`flex items-center gap-2 px-5 py-3 border-b ${
                isDark ? 'border-white/10' : 'border-slate-100'
              }`}
            >
              <MessageSquare size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>最近注册</h2>
            </div>
            <ul className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {recentRegistrations.map((r) => {
                const badge = STATUS_DISPLAY[r.status] ?? STATUS_DISPLAY.published;
                return (
                  <li
                    key={r.name}
                    className={`px-5 py-3 flex items-center gap-3 transition-colors ${
                      isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        r.type === 'Agent'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-violet-500/10 text-violet-500'
                      }`}
                    >
                      {r.type === 'Agent' ? <Bot size={14} /> : <Zap size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {r.name}
                      </p>
                      <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{r.type} · {r.time}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium shrink-0 ${isDark ? badge.dark : badge.light}`}>
                      {badge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* 平台能力 */}
        <section className="space-y-5">
          <h2
            className={`text-sm font-bold tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            <span className="w-1 h-4 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" aria-hidden />
            平台能力
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {modules.map((m) => (
              <motion.div
                key={m.title}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.18 }}
                className={`rounded-2xl border shadow-none transition-colors duration-200 ${
                  isDark
                    ? 'bg-[#1C1C1E] border-white/10 hover:border-white/[0.14] hover:bg-[#222226]'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex gap-4 p-4 sm:p-5 items-start">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDark ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <m.icon size={20} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className={`text-[15px] font-bold leading-snug mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {m.title}
                    </h3>
                    <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>{m.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 常用入口 */}
        <section className="space-y-5">
          <h2
            className={`text-sm font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            <span className="w-1 h-4 rounded-full bg-indigo-500 shrink-0" aria-hidden />
            常用入口
          </h2>
          <div
            className={`rounded-2xl border overflow-hidden ${
              isDark ? 'bg-[#1C1C1E] border-white/10 shadow-lg shadow-black/10' : 'bg-white border-slate-200/80 shadow-md shadow-slate-200/40'
            } divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}
          >
            {shortcuts.map((s, i) => (
              <div
                key={s.label}
                className={`flex items-center gap-4 px-5 py-4 transition-all duration-200 ${
                  isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'
                } ${i % 2 === 1 ? (isDark ? 'bg-white/[0.02]' : 'bg-slate-50/50') : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <s.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-[13px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.label}</div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{s.hint}</div>
                </div>
                <ChevronRight size={16} className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              </div>
            ))}
          </div>
        </section>

        {/* 安全与合规 */}
        <section
          className={`rounded-2xl border-l-4 border-emerald-500/80 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 ${
            isDark
              ? 'bg-gradient-to-r from-emerald-950/30 to-transparent border-slate-800 border-l-emerald-500/60'
              : 'bg-gradient-to-r from-emerald-50/80 to-white border-slate-200/80'
          } ${isDark ? 'shadow-lg shadow-black/10' : 'shadow-md shadow-slate-200/30'}`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <Shield size={24} />
          </div>
          <div className="min-w-0">
            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>安全与审计</h3>
            <p className={`text-[12px] mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              密钥与令牌在用户管理中维护；限流与审计日志在系统配置中查看。生产环境请对接统一身份与机构存储策略。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
