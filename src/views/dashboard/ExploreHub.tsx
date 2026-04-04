import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import type { LucideIcon } from 'lucide-react';
import {
  Bot, Wrench, Cpu, AppWindow, Database, BookOpen, Users, Sparkles,
  Activity, Flame, ChevronRight, Award, Megaphone, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EChartsOption } from 'echarts';
import type { Theme, FontSize } from '../../types';
import { mainScrollPadBottom, mainScrollCompositorClass, canvasBodyBg } from '../../utils/uiClasses';
import { buildPath, buildUserResourceMarketUrl } from '../../constants/consoleRoutes';
import { dashboardService } from '../../api/services/dashboard.service';
import type { ExploreHubData, ExploreResourceItem, AnnouncementItem } from '../../types/dto/explore';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { Modal } from '../../components/common/Modal';
import { MarkdownView } from '../../components/common/MarkdownView';
import { MultiAvatar } from '../../components/common/MultiAvatar';
import { EChartCard } from '../../components/charts/EChartCard';
import { baseAxis, baseGrid, baseTooltip, chartColors } from '../../components/charts/echartsTheme';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';

interface ExploreHubProps { theme: Theme; fontSize: FontSize; }

function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

const TYPE_LABEL: Record<string, string> = {
  agent: '智能体',
  skill: '技能组件',
  mcp: 'MCP 服务',
  app: '应用',
  dataset: '数据集',
};

const ANNOUNCEMENT_LABEL: Record<string, string> = {
  feature: '重磅更新',
  maintenance: '维护通知',
  update: '版本更新',
  notice: '系统通知',
};

/** 与 HubStatCard 同系边框与阴影（静态，无整卡悬停放大/抬起） */
const HUB_STAT_BASE_LIGHT = 'border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]';
const HUB_STAT_BASE_DARK = 'border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.2)]';
/** 仅 HubStatCard：悬停阴影与渐变（配合 translate，不做在其他卡片上） */
const HUB_STAT_HOVER_LIGHT =
  'hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:border-gray-200 hover:bg-gradient-to-br hover:from-white hover:to-gray-50';
const HUB_STAT_HOVER_DARK =
  'hover:shadow-[0_20px_50px_rgba(0,0,0,0.45)] hover:border-white/20 hover:bg-gradient-to-br hover:from-lantu-card hover:to-lantu-elevated';

const Card: React.FC<{ children: React.ReactNode; className?: string; isDark?: boolean }> = ({ children, className = '', isDark = false }) => (
  <div
    className={`rounded-2xl border overflow-hidden ${
      isDark ? `bg-lantu-card ${HUB_STAT_BASE_DARK}` : `bg-white ${HUB_STAT_BASE_LIGHT}`
    } ${className}`}
  >
    {children}
  </div>
);

const SectionTitle: React.FC<{ title: string; action?: string; icon?: React.ComponentType<{ size?: number; className?: string }>; isDark?: boolean }> = ({ title, action, icon: Icon, isDark = false }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-2">
      {Icon && <Icon className={isDark ? 'text-slate-300' : 'text-slate-800'} size={20} />}
      <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h2>
    </div>
    {action && (
      <button className={`text-sm font-medium flex items-center gap-1 transition-colors ${
        isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-black'
      }`}>
        {action} <ChevronRight size={16} />
      </button>
    )}
  </div>
);

/** 探索页顶部 8 宫格指标：网格内等分变宽 + 巨型水印悬浮动效 */
const HubStatCard: React.FC<{
  icon: LucideIcon;
  value: string;
  label: string;
  clickable: boolean;
  onClick?: () => void;
  isDark: boolean;
}> = ({ icon: Icon, value, label, clickable, onClick, isDark }) => {
  const shell = [
    'group relative w-full min-w-0 h-[156px] rounded-[20px] border flex flex-col items-center justify-center overflow-hidden',
    'transition-all duration-500 ease-out hover:-translate-y-2',
    isDark
      ? `bg-lantu-card ${HUB_STAT_BASE_DARK} ${HUB_STAT_HOVER_DARK}`
      : `bg-white ${HUB_STAT_BASE_LIGHT} ${HUB_STAT_HOVER_LIGHT}`,
  ].join(' ');

  const watermarkCls = [
    'absolute -bottom-2 -right-2 w-32 h-32 transform translate-y-12 translate-x-12 rotate-[30deg] scale-50',
    'transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    'opacity-0 pointer-events-none z-0 flex items-center justify-center',
    'group-hover:opacity-[0.08] group-hover:translate-y-4 group-hover:translate-x-4 group-hover:rotate-[-10deg] group-hover:scale-[2.5]',
    isDark ? 'text-white' : 'text-gray-900',
  ].join(' ');

  const iconBoxCls = [
    'w-12 h-12 mb-4 rounded-[14px] flex items-center justify-center',
    'transition-all duration-500 ease-out',
    'group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)]',
    isDark
      ? 'bg-white/10 text-slate-300 group-hover:bg-white group-hover:text-slate-900'
      : 'bg-slate-50 text-slate-600 group-hover:bg-[#09090b] group-hover:text-white',
  ].join(' ');

  const body = (
    <>
      <div className={watermarkCls}>
        <Icon className="h-full w-full" strokeWidth={0.5} />
      </div>
      <div className="relative z-10 flex flex-col items-center transition-transform duration-500 ease-out group-hover:-translate-y-1">
        <div className={iconBoxCls}>
          <Icon size={22} strokeWidth={2} />
        </div>
        <div className={`mb-1.5 text-[2rem] font-black leading-none tracking-tight font-sans transition-colors duration-300 ${
          isDark ? 'text-slate-100' : 'text-gray-900'
        }`}>
          {value}
        </div>
        <div className={`text-[11px] font-medium transition-colors duration-300 ${
          isDark ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-500 group-hover:text-slate-800'
        }`}>
          {label}
        </div>
      </div>
    </>
  );

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={`${shell} cursor-pointer text-left`}>
        {body}
      </button>
    );
  }
  return <div className={`${shell} cursor-default`}>{body}</div>;
};

const HERO_TERMINAL_CODE = `import { Nexus } from '@campus/ai';

// 初始化科研智能体
const agent = new Nexus.Agent({
  name: 'ResearchBot',
  skills: ['DataAnalysis', 'NLP'],
  model: 'nexus-pro-max'
});

await agent.deploy();
console.log('✨ 智能体已上线');`;

const HeroCodeTerminal: React.FC = () => {
  const [typedCode, setTypedCode] = useState('');

  useEffect(() => {
    let i = 0;
    const typingInterval = window.setInterval(() => {
      if (i < HERO_TERMINAL_CODE.length) {
        setTypedCode(HERO_TERMINAL_CODE.slice(0, i + 1));
        i += 1;
      } else {
        window.clearInterval(typingInterval);
      }
    }, 45);
    return () => window.clearInterval(typingInterval);
  }, []);

  return (
    <div
      className="relative w-[420px] max-w-full shrink-0 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
      style={{ transform: 'rotate(-2deg)' }}
    >
      <div className="flex items-center px-4 py-3 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="mx-auto text-xs text-gray-500 font-mono">agent-deploy.ts</div>
      </div>

      <div className="h-[300px] shrink-0 p-5 font-mono text-sm leading-relaxed overflow-y-auto overflow-x-hidden min-h-0 min-w-0">
        <div className="text-gray-300 whitespace-pre-wrap break-words min-w-0 pb-1 inline-block max-w-full align-top">
          <Highlight theme={themes.vsDark} code={typedCode} language="tsx">
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={`${className} whitespace-pre-wrap break-words m-0 p-0 bg-transparent`}
                style={{ ...style, background: 'transparent', margin: 0, padding: 0 }}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
          <span className="inline-block w-2 h-4 bg-blue-400 ml-1 align-text-bottom animate-pulse" aria-hidden />
        </div>
      </div>
    </div>
  );
};

export const ExploreHub: React.FC<ExploreHubProps> = ({ theme }) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [hubData, setHubData] = useState<ExploreHubData | null>(null);
  const [detailAnnouncement, setDetailAnnouncement] = useState<AnnouncementItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await dashboardService.getExploreHub();
      setHubData(data);
    } catch (err) {
      setHubData(null);
      setLoadError(err instanceof Error ? err : new Error('加载探索页面失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const stats = hubData?.platformStats;
  const byTypeMap = Object.fromEntries((stats?.byType ?? []).map((x) => [x.type, Number(x.cnt) || 0]));
  const totalResources = Number(stats?.totalResources ?? 0) || (
    Number(stats?.totalAgents ?? byTypeMap.agent ?? 0)
    + Number(stats?.totalSkills ?? byTypeMap.skill ?? 0)
    + Number(stats?.totalMcps ?? byTypeMap.mcp ?? 0)
    + Number(stats?.totalApps ?? byTypeMap.app ?? 0)
    + Number(stats?.totalDatasets ?? byTypeMap.dataset ?? 0)
  );

  const statsData = useMemo(() => [
    { id: 'agent', label: '智能体 Agent', value: Number(stats?.totalAgents ?? byTypeMap.agent ?? 0), icon: Bot, marketTab: 'agent' as const },
    { id: 'skill', label: '技能 Skill', value: Number(stats?.totalSkills ?? byTypeMap.skill ?? 0), icon: Wrench, marketTab: 'skill' as const },
    { id: 'mcp', label: '服务 MCP', value: Number(stats?.totalMcps ?? byTypeMap.mcp ?? 0), icon: Cpu, marketTab: 'mcp' as const },
    { id: 'app', label: '应用 App', value: Number(stats?.totalApps ?? byTypeMap.app ?? 0), icon: AppWindow, marketTab: 'app' as const },
    { id: 'dataset', label: '数据集 Data', value: Number(stats?.totalDatasets ?? byTypeMap.dataset ?? 0), icon: Database, marketTab: 'dataset' as const },
    { id: 'total', label: '总资源数', value: totalResources, icon: BookOpen, marketTab: null },
    { id: 'users', label: '活跃师生', value: Number(stats?.totalUsers ?? 0), icon: Users, marketTab: null },
    { id: 'calls', label: '今日网关调用', value: Number(stats?.totalCallsToday ?? 0), icon: Activity, marketTab: null },
  ], [byTypeMap.agent, byTypeMap.app, byTypeMap.dataset, byTypeMap.mcp, byTypeMap.skill, stats?.totalAgents, stats?.totalApps, stats?.totalCallsToday, stats?.totalDatasets, stats?.totalMcps, stats?.totalSkills, stats?.totalUsers, totalResources]);

  const hotResources = (hubData?.trendingResources ?? []).slice(0, 4);
  const announcements = (hubData?.announcements ?? []).slice(0, 3);
  const contributors = [...(hubData?.topContributors ?? [])].sort((a, b) => b.totalCalls - a.totalCalls);
  const c = chartColors(theme);
  const axis = baseAxis(theme);

  const callsTrendOption = useMemo<EChartsOption>(() => {
    const rows = stats?.callsTrend7d ?? [];
    return {
      title: {
        text: '调用趋势（近7天）',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: c.text },
      },
      grid: { ...baseGrid(), top: 46, left: '6%', right: '6%', bottom: '14%' },
      tooltip: baseTooltip(theme),
      xAxis: {
        ...axis.category,
        data: rows.map((r) => (r.day || '').slice(5)),
      },
      yAxis: { ...axis.value, minInterval: 1 },
      series: [
        {
          name: '调用次数',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: rows.map((r) => Number(r.calls) || 0),
          lineStyle: { width: 2.5, color: '#2563eb' },
          itemStyle: { color: '#2563eb' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(37,99,235,0.30)' },
                { offset: 1, color: 'rgba(37,99,235,0.03)' },
              ],
            },
          },
        },
      ],
    };
  }, [axis.category, axis.value, c.text, stats?.callsTrend7d, theme]);

  const newResourcesTrendOption = useMemo<EChartsOption>(() => {
    const rows = stats?.newResourcesTrend7d ?? [];
    return {
      title: {
        text: '新增资源（近7天）',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: c.text },
      },
      grid: { ...baseGrid(), top: 46, left: '6%', right: '6%', bottom: '14%' },
      tooltip: baseTooltip(theme),
      xAxis: {
        ...axis.category,
        data: rows.map((r) => (r.day || '').slice(5)),
      },
      yAxis: { ...axis.value, minInterval: 1 },
      series: [
        {
          name: '新增资源',
          type: 'bar',
          data: rows.map((r) => Number(r.count) || 0),
          barMaxWidth: 20,
          itemStyle: {
            borderRadius: [7, 7, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#1e2435' },
                { offset: 1, color: '#64748b' },
              ],
            },
          },
        },
      ],
    };
  }, [axis.category, axis.value, c.text, stats?.newResourcesTrend7d, theme]);

  const navigateToResource = (item: ExploreResourceItem) => {
    navigate(buildUserResourceMarketUrl(item.resourceType));
  };

  if (loading) {
    return (
      <div className="flex-1">
        <PageSkeleton type="dashboard" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1">
        <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载探索页" />
      </div>
    );
  }

  /** 与主画布（MainLayout 圆角卡片）留出足够内边距，避免区块贴边 */
  const pageContainer = 'w-full px-4 sm:px-5 lg:px-6 xl:px-8';

  return (
    <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${mainScrollPadBottom}`}>
      <div className={`min-h-screen pt-2 sm:pt-3 pb-20 ${canvasBodyBg(theme)}`}>
        <div className={pageContainer}>
          <div
            className="w-full relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#050505] py-6 md:py-7 px-8 md:px-12 lg:px-14 shadow-2xl"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] pointer-events-none" />

            <div className="relative z-10 w-full lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div className="w-full lg:max-w-[58%]">
                <button
                  type="button"
                  onClick={() => navigate(buildPath('user', 'resource-center'))}
                  className="group mb-6 inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2.5 text-left shadow-lg backdrop-blur-md transition-colors hover:bg-white/[0.1]"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-sky-400" strokeWidth={2} aria-hidden />
                  <span className="text-sm font-medium text-white">Nexus Pro 2.0 现已发布</span>
                  <ChevronRight
                    className="ml-0.5 h-4 w-4 shrink-0 text-white/45 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>

                <h1 className="text-5xl md:text-[6rem] font-bold text-white tracking-tighter leading-[0.95] mb-6">
                  Build the future<br />of campus AI.
                </h1>

                <p className="text-white/40 text-lg md:text-xl font-light leading-relaxed max-w-xl mb-8">
                  数字化资产与能力门户：目录发现与按权消费；网关调用量不等同于全部使用量（技能下载等单独统计）。统一注册、审核发布与 API Key / Grant / accessPolicy 详见接入指南。
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <button
                    type="button"
                    onClick={() => navigate(buildPath('user', 'resource-center'))}
                    className="bg-white text-black px-8 py-4 rounded-lg text-sm font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    开始发布 <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(buildPath('user', 'api-docs'))}
                    className="text-white/40 text-sm font-medium hover:text-white transition-colors border-b border-transparent hover:border-white/40 pb-0.5"
                  >
                    查看文档
                  </button>
                </div>
              </div>

              <div className="hidden lg:flex lg:w-[38%] lg:min-w-0 lg:justify-end">
                <div className="relative shrink-0 w-[420px] max-w-full">
                  <div className="absolute -inset-8 bg-indigo-500/10 blur-3xl pointer-events-none" />
                  <HeroCodeTerminal />
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className={`${pageContainer} mt-10 space-y-12`}>
          <div className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-3 md:gap-4">
            {statsData.map((stat) => (
              <HubStatCard
                key={stat.id}
                icon={stat.icon}
                value={formatCount(stat.value)}
                label={stat.label}
                clickable={Boolean(stat.marketTab)}
                onClick={stat.marketTab ? () => navigate(buildUserResourceMarketUrl(stat.marketTab)) : undefined}
                isDark={isDark}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              <div>
                <SectionTitle title="校园热门资源" icon={Flame} action="浏览全部" isDark={isDark} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {hotResources.map((res, idx) => (
                    <button
                      key={`${res.resourceType}-${res.resourceId}`}
                      type="button"
                      onClick={() => navigateToResource(res)}
                      className={`rounded-2xl border px-6 pt-6 pb-8 flex flex-col h-full text-left cursor-pointer ${
                        isDark ? `bg-lantu-card ${HUB_STAT_BASE_DARK}` : `bg-white ${HUB_STAT_BASE_LIGHT}`
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {TYPE_LABEL[res.resourceType] ?? res.resourceType}
                          </span>
                        </div>
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${
                          isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-400'
                        }`}>
                          {idx + 1}
                        </div>
                      </div>

                      <h4 className={`font-bold text-lg mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{res.displayName}</h4>
                      <p className={`text-sm leading-relaxed flex-grow ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{res.description}</p>

                      <div className={`flex items-center justify-between mt-6 pt-4 border-t ${
                        isDark ? 'border-white/10' : 'border-slate-100'
                      }`}>
                        <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] ${
                            isDark ? 'bg-gradient-to-br from-slate-600 to-slate-700' : 'bg-gradient-to-br from-slate-200 to-slate-300'
                          }`}>
                            {(res.author?.trim() || res.displayName).charAt(0)}
                          </div>
                          {res.author?.trim() || '平台资源'}
                        </div>
                        <div className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                          <Activity size={14} /> {formatCount(res.callCount)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle title="平台公告" icon={Megaphone} action="历史公告" isDark={isDark} />
                <Card className="overflow-hidden" isDark={isDark}>
                  <div className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-100'}`}>
                    {announcements.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDetailAnnouncement(item)}
                        className={`w-full p-6 flex gap-5 transition-colors cursor-pointer group text-left ${
                          isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <span className={`text-xs font-bold px-2.5 py-1.5 rounded-lg ${
                            item.type === 'feature'
                              ? (isDark ? 'bg-slate-100 text-slate-900' : 'bg-black text-white')
                              : (isDark ? 'bg-white/10 text-slate-300 border border-white/15' : 'bg-slate-100 text-slate-600 border border-slate-200')
                          }`}>
                            {ANNOUNCEMENT_LABEL[item.type] ?? item.type}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`font-bold text-lg ${isDark ? 'text-slate-100 group-hover:text-white' : 'text-slate-900 group-hover:text-black'}`}>{item.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-md ${
                              isDark ? 'text-slate-400 bg-white/5' : 'text-slate-400 bg-slate-50'
                            }`}>{formatDateTime(item.createdAt)}</span>
                          </div>
                          <p className={`text-sm leading-relaxed mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.summary}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-10">
              {(stats?.callsTrend7d?.length ?? 0) > 0 && (
                <EChartCard
                  theme={theme}
                  option={callsTrendOption}
                  minHeight={230}
                  className="px-4 pt-3 pb-5"
                  aria-label="探索页近7天调用趋势图"
                  hubStatSurface={true}
                />
              )}
              {(stats?.newResourcesTrend7d?.length ?? 0) > 0 && (
                <EChartCard
                  theme={theme}
                  option={newResourcesTrendOption}
                  minHeight={230}
                  className="px-4 pt-3 pb-5"
                  aria-label="探索页近7天新增资源图"
                  hubStatSurface={true}
                />
              )}

              <Card className="p-6" isDark={isDark}>
                <SectionTitle title="杰出贡献者" icon={Award} isDark={isDark} />
                {contributors.length > 0 ? (
                  <>
                    <div
                      className={`rounded-2xl p-6 flex flex-col items-center justify-center text-center border mt-2 ${
                        isDark
                          ? 'bg-white/[0.03] border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.2)]'
                          : 'bg-neutral-50 border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                      }`}
                    >
                      <div className="relative mb-4">
                        <div className={`w-20 h-20 rounded-full border-4 shadow-sm overflow-hidden flex items-center justify-center ${
                          isDark ? 'bg-white/10 border-white/20' : 'bg-white border-white'
                        }`}>
                          <MultiAvatar
                            seed={`${contributors[0].userId}-${contributors[0].username}`}
                            alt={contributors[0].username}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full border-2 border-white shadow-sm">
                          TOP 1
                        </div>
                      </div>

                      <h4 className={`font-bold mb-1 text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {resolvePersonDisplay({ names: [contributors[0].userName], usernames: [contributors[0].username], ids: [contributors[0].userId] })}
                      </h4>
                      <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>平台贡献者</p>

                      <div className={`w-full grid grid-cols-2 gap-4 border-t pt-5 ${
                        isDark ? 'border-white/10' : 'border-slate-200/60'
                      }`}>
                        <div>
                          <div className={`text-xs mb-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>发布资源</div>
                          <div className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{contributors[0].resourceCount} <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>个</span></div>
                        </div>
                        <div>
                          <div className={`text-xs mb-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>累计调用</div>
                          <div className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{formatCount(contributors[0].totalCalls)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      {contributors.slice(1, 3).map((c, i) => (
                        <div key={c.userId} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border border-transparent ${
                          isDark ? 'hover:bg-white/[0.03] hover:border-white/10' : 'hover:bg-slate-50 hover:border-slate-100'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className={`font-bold text-sm w-8 h-8 flex items-center justify-center rounded-lg ${
                              isDark ? 'text-slate-300 bg-white/10' : 'text-slate-400 bg-slate-100'
                            }`}>
                              0{i + 2}
                            </div>
                            <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                              {resolvePersonDisplay({ names: [c.userName], usernames: [c.username], ids: [c.userId] })}
                            </div>
                          </div>
                          <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-slate-300'} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">暂无贡献者数据</div>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>

      <Modal
        open={!!detailAnnouncement}
        onClose={() => setDetailAnnouncement(null)}
        title={detailAnnouncement?.title ?? '公告详情'}
        theme={isDark ? 'dark' : 'light'}
        size="lg"
      >
        {detailAnnouncement && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded mr-2 bg-slate-100 text-slate-700">
                {ANNOUNCEMENT_LABEL[detailAnnouncement.type] ?? detailAnnouncement.type}
              </span>
              发布时间：{formatDateTime(detailAnnouncement.createdAt)}
            </div>
            <MarkdownView value={detailAnnouncement.content?.trim() ? detailAnnouncement.content : (detailAnnouncement.summary ?? '')} />
          </div>
        )}
      </Modal>
    </div>
  );
};
