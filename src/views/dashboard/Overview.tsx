import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Zap,
  Cpu,
  Activity,
  Shield,
  Database,
  BookOpen,
  Wrench,
  Settings,
  User,
  ChevronRight,
  MessageSquare,
  Megaphone,
  Calendar,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { HeroCarousel, type HeroSlide } from '../../components/ui/HeroCarousel';
import { OverviewAnalyticsGrid } from '../../components/charts/OverviewAnalyticsGrid';

interface OverviewProps {
  theme: Theme;
  fontSize: FontSize;
}

const slides: HeroSlide[] = [
  {
    kicker: '工作台',
    title: '本学期办事大厅服务时间调整',
    body: '自 3 月 20 日起，线下窗口与线上预约时段同步更新，详见校内通知。',
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
  { date: '03-12', title: '知识库批量导入模板更新', tag: '更新' },
  { date: '03-08', title: '监控中心告警订阅功能开放试用', tag: '功能' },
];

/** 概览：门户式轮播 + 公告 + 能力说明（兰智通 LantuConnect） */
export const Overview: React.FC<OverviewProps> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const { hasSecondarySidebar } = useLayoutChrome();
  const outerPad = hasSecondarySidebar ? 'px-2 sm:px-3 lg:px-4' : 'px-1.5 sm:px-2 lg:px-3';
  const maxW = hasSecondarySidebar ? 'max-w-7xl mx-auto' : 'w-full max-w-none';

  /** 平台能力：与公告区一致的素色卡片 + 中性图标底，避免整卡渐变 */
  const modules = [
    {
      title: '对话助手',
      desc: '日常咨询与任务引导，按需接入工具与知识片段。',
      icon: MessageSquare,
    },
    {
      title: 'Agent 管理',
      desc: '列表、创建与测试；知识库、数据库等资产在同一模块维护。',
      icon: Bot,
    },
    {
      title: '模型服务',
      desc: '在线体验、接入配置与精调相关流程入口。',
      icon: Cpu,
    },
    {
      title: '监控中心',
      desc: '调用记录、告警与运行概览，便于值班与复盘。',
      icon: Activity,
    },
    {
      title: '用户管理',
      desc: '账号、角色、API Key 与令牌管理。',
      icon: User,
    },
    {
      title: '系统配置',
      desc: '模型接入、限流与审计日志等运维配置。',
      icon: Settings,
    },
  ];

  const shortcuts = [
    { label: '快捷入口', icon: Zap, hint: '收藏与常用能力' },
    { label: '知识库', icon: BookOpen, hint: 'Agent 管理 · 知识库' },
    { label: '数据库', icon: Database, hint: 'Agent 管理 · 数据库' },
    { label: '工具广场', icon: Wrench, hint: 'MCP 与工具发现' },
  ];

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar ${outerPad} py-2 sm:py-3 ${
        isDark ? 'bg-[#000000]' : 'bg-[#F2F2F7]'
      }`}
    >
      <div className={`${maxW} w-full space-y-8`}>
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

        {/* 平台能力：素色卡片 + 左图右文，对齐通知公告/常用入口气质 */}
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

        {/* 常用跳转：卡片分组感 */}
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
          <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            请从左侧主导航进入对应模块；含子菜单的栏目会在第二列展示目录。
          </p>
        </section>

        {/* 安全与合规：强调块 */}
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
