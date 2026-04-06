import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot,
  Zap,
  Cpu,
  Clock,
  ChevronRight,
  Sparkles,
  FileText,
  Rocket,
  Heart,
  BarChart3,
  Bell,
  TrendingUp,
  LayoutGrid,
  Puzzle,
  AppWindow,
  Database,
} from 'lucide-react';
import { Theme, FontSize } from '../../types';
import type { UserWorkspace } from '../../types/dto/dashboard';
import type { UserDashboardData } from '../../types/dto/explore';
import { dashboardService } from '../../api/services/dashboard.service';
import { useAuthStore } from '../../stores/authStore';
import {
  bentoCard, bentoCardHover, canvasBodyBg, cardHeading, kpiGridGap,
  textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { BentoCard } from '../../components/common/BentoCard';
import { KpiCard } from '../../components/common/KpiCard';
import { AnimatedList } from '../../components/common/AnimatedList';
import { buildPath, buildUserResourceMarketUrl } from '../../constants/consoleRoutes';
import type { ResourceType } from '../../types/dto/catalog';
import { DashboardLayout } from '../../components/layout/PageLayouts';
import { formatDateTime } from '../../utils/formatDateTime';
import { useUserRole } from '../../context/UserRoleContext';

interface Props { theme: Theme; fontSize: FontSize; }

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  invoke: <Zap size={14} />,
  publish: <Rocket size={14} />,
  favorite: <Heart size={14} />,
  review: <FileText size={14} />,
};

const ACTIVITY_LABEL: Record<string, string> = {
  invoke: '调用了', publish: '发布了', favorite: '收藏了', review: '评价了',
};

const RESOURCE_TYPE_LABEL: Record<string, string> = {
  agent: '智能体',
  skill: '技能',
  mcp: 'MCP',
  app: '应用',
  dataset: '数据集',
};

const RECENT_TYPE_ICON: Record<string, typeof Bot> = {
  agent: Bot,
  skill: Zap,
  mcp: Puzzle,
  app: AppWindow,
  dataset: Database,
};

export const UserWorkspaceOverview: React.FC<Props> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { hasPermission } = useUserRole();

  const quickActions = useMemo(() => {
    const items: Array<{
      label: string;
      icon: typeof Bot;
      page: string;
      marketTab?: ResourceType;
      perm?: string;
      anyPerm?: readonly string[];
    }> = [
      { label: '智能体市场', icon: Bot, page: 'resource-market', marketTab: 'agent' },
      { label: '技能市场', icon: Zap, page: 'resource-market', marketTab: 'skill' },
      {
        label: '我的发布',
        icon: Rocket,
        page: 'my-agents-pub',
        anyPerm: ['agent:create', 'skill:create', 'mcp:create', 'app:create', 'dataset:create'],
      },
      { label: '使用统计', icon: BarChart3, page: 'usage-stats' },
      { label: '资源成效统计', icon: TrendingUp, page: 'developer-statistics', perm: 'developer:portal' },
      { label: '快捷入口', icon: LayoutGrid, page: 'quick-access' },
    ];
    return items.filter((a) => {
      if (a.perm && !hasPermission(a.perm)) return false;
      if (a.anyPerm && !a.anyPerm.some((p) => hasPermission(p))) return false;
      return true;
    });
  }, [hasPermission]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [workspace, setWorkspace] = useState<UserWorkspace | null>(null);
  const [dashboard, setDashboard] = useState<UserDashboardData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ws, db] = await Promise.allSettled([
        dashboardService.getUserWorkspace(),
        dashboardService.getUserDashboard(),
      ]);
      if (ws.status === 'fulfilled') setWorkspace(ws.value);
      if (db.status === 'fulfilled') setDashboard(db.value);
      if (ws.status === 'rejected' && db.status === 'rejected') {
        setLoadError(ws.reason instanceof Error ? ws.reason : new Error('加载工作台数据失败'));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载工作台数据失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tp = textPrimary(theme);
  const ts = textSecondary(theme);
  const tm = textMuted(theme);

  const displayName = user?.nickname || user?.username || '用户';
  const quota = dashboard?.quotaUsage;
  const myRes = dashboard?.myResources;
  const activities = dashboard?.recentActivity ?? [];
  const todayUsage = dashboard?.quotaUsage?.dailyUsed ?? workspace?.totalUsageToday ?? 0;
  const unreadCount = dashboard?.unreadNotifications ?? workspace?.unreadNotifications ?? 0;

  const recentItems = workspace?.recentUsages?.length
    ? workspace.recentUsages.slice(0, 8).map((u) => ({
        id: u.id,
        resourceId: u.resourceId,
        name: u.displayName,
        typeLabel: RESOURCE_TYPE_LABEL[u.resourceType] ?? u.resourceType,
        time: formatDateTime(u.lastUsedTime),
        icon: u.icon,
        marketTab: u.resourceType as ResourceType,
      }))
    : [];

  const recentCountByType = (rt: ResourceType) =>
    workspace?.recentUsages?.filter((u) => u.resourceType === rt).length ?? 0;

  if (loading) {
    return (
      <div className={`flex-1 ${canvasBodyBg(theme)}`}>
        <PageSkeleton type="dashboard" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`flex-1 ${canvasBodyBg(theme)}`}>
        <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载工作台" />
      </div>
    );
  }

  return (
    <div className={`w-full ${canvasBodyBg(theme)}`}>
      <DashboardLayout>

        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
          <BentoCard theme={theme} padding="lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className={isDark ? 'text-blue-400' : 'text-blue-500'} />
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">工作台</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r ${
              isDark ? 'from-white via-blue-200 to-neutral-300' : 'from-slate-900 via-blue-800 to-neutral-800'
            } bg-clip-text text-transparent`}>
              欢迎回来，{displayName}
            </h1>
            <p className={`text-sm ${ts}`}>
              Nexus AI 协同平台为你提供智能体、技能、MCP、数据集与应用等资源；下方「最近使用」与顶部导航五类市场对齐。
            </p>
          </BentoCard>
        </motion.div>

        {/* 最近使用条数：与 usage_record 中各类 invoke 一致（同一批最多 8 条内计数） */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 ${kpiGridGap}`}>
          <KpiCard theme={theme} label="最近·智能体" value={recentCountByType('agent')} icon={<Bot size={16} />} glow="indigo" delay={0.05} />
          <KpiCard theme={theme} label="最近·技能" value={recentCountByType('skill')} icon={<Zap size={16} />} glow="emerald" delay={0.07} />
          <KpiCard theme={theme} label="最近·MCP" value={recentCountByType('mcp')} icon={<Puzzle size={16} />} glow="violet" delay={0.09} />
          <KpiCard theme={theme} label="最近·应用" value={recentCountByType('app')} icon={<AppWindow size={16} />} glow="cyan" delay={0.11} />
          <KpiCard theme={theme} label="最近·数据集" value={recentCountByType('dataset')} icon={<Database size={16} />} glow="emerald" delay={0.13} />
        </div>
        <div className={`grid grid-cols-2 ${kpiGridGap}`}>
          <KpiCard theme={theme} label="今日使用" value={todayUsage} icon={<Cpu size={16} />} glow="amber" delay={0.15} />
          <KpiCard theme={theme} label="未读通知" value={unreadCount} icon={<Bell size={16} />} glow="rose" delay={0.17} />
        </div>

        {/* Quota Usage */}
        {quota && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }}
            className={`${bentoCard(theme)} p-5`}>
            <h2 className={`${cardHeading(theme)} mb-4`}>调用配额</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: '日配额', used: quota.dailyUsed, limit: quota.dailyLimit },
                { label: '月配额', used: quota.monthlyUsed, limit: quota.monthlyLimit },
              ].map((q) => {
                const unlimited = q.limit < 0;
                const pct = unlimited ? 0 : q.limit > 0 ? Math.min((q.used / q.limit) * 100, 100) : 0;
                const barColor = unlimited ? 'bg-slate-400' : pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500';
                const limitLabel = unlimited ? '无上限' : q.limit.toLocaleString();
                return (
                  <div key={q.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className={`text-xs font-medium ${ts}`}>{q.label}</span>
                      <span className={`text-xs font-bold ${tp}`}>
                        {q.used.toLocaleString()} / {limitLabel}
                      </span>
                    </div>
                    <div className={`h-2 rounded-full ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}>
                      {!unlimited && (
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* My Resources Status */}
          {myRes && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.18 }}
              className={`${bentoCard(theme)} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={cardHeading(theme)}>我的资源</h2>
                <button
                  type="button"
                  onClick={() => navigate(buildPath('user', 'resource-center'))}
                  className={`text-xs font-medium ${ts} transition-colors rounded-lg px-2 py-1 -mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    isDark
                      ? 'hover:text-neutral-200 focus-visible:ring-sky-400/45 focus-visible:ring-offset-lantu-card'
                      : 'hover:text-neutral-800 focus-visible:ring-neutral-900/20 focus-visible:ring-offset-white'
                  }`}
                >
                  管理 →
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { label: '草稿', value: myRes.draft, color: 'text-slate-500' },
                  { label: '审核中', value: myRes.pendingReview, color: 'text-amber-500' },
                  { label: '已发布', value: myRes.published, color: 'text-emerald-500' },
                  { label: '总计', value: myRes.total, color: isDark ? 'text-neutral-300' : 'text-neutral-900' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                    <div className={`text-xs mt-0.5 ${tm}`}>{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recent Activity Timeline */}
          {activities.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 }}
              className={`${bentoCard(theme)} p-5`}>
              <h2 className={`${cardHeading(theme)} mb-4`}>最近动态</h2>
              <div className="space-y-3">
                {activities.slice(0, 6).map((a, idx) => {
                  const act = String(a.action ?? 'invoke').toLowerCase();
                  const rtKey = String(a.resourceType ?? '').toLowerCase();
                  const typeBadge = RESOURCE_TYPE_LABEL[rtKey] ?? (a.resourceType || '');
                  return (
                    <div key={`${act}-${a.timestamp}-${idx}`} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isDark ? 'bg-neutral-900/10 text-neutral-300' : 'bg-neutral-100 text-neutral-900'
                      }`}>
                        {ACTIVITY_ICON[act] ?? <Zap size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${tp} flex flex-wrap items-center gap-1.5`}>
                          <span className={tm}>{ACTIVITY_LABEL[act] ?? '操作了'}</span>
                          <span className="font-medium">{a.resourceName}</span>
                          {typeBadge ? (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              isDark ? 'bg-white/[0.08] text-neutral-400' : 'bg-slate-100 text-slate-600'
                            }`}>{typeBadge}</span>
                          ) : null}
                        </div>
                        <div className={`text-xs ${tm}`}>{formatDateTime(a.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Recent Usage List */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.22 }}>
          <BentoCard theme={theme} padding="sm" className="!p-0">
            <div className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <Clock size={15} className={tm} />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">最近使用</h2>
              </div>
              <button type="button" onClick={() => navigate(buildPath('user', 'usage-records'))}
                className={`text-xs font-medium ${ts} hover:text-neutral-800 transition-colors`}>
                查看全部 →
              </button>
            </div>
            <AnimatedList className={`divide-y ${isDark ? 'divide-white/[0.04]' : 'divide-slate-100'}`}>
              {recentItems.length === 0 ? [
                <div key="empty" className={`px-5 py-8 text-center text-sm ${tm}`}>暂无使用记录</div>,
              ] : recentItems.map((r) => {
                const TypeIcon = RECENT_TYPE_ICON[r.marketTab] ?? Zap;
                const badgeTone =
                  r.marketTab === 'agent'
                    ? isDark
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-blue-50 text-blue-700'
                    : r.marketTab === 'skill'
                      ? isDark
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-emerald-50 text-emerald-800'
                      : r.marketTab === 'mcp'
                        ? isDark
                          ? 'bg-violet-500/15 text-violet-300'
                          : 'bg-violet-50 text-violet-800'
                        : r.marketTab === 'app'
                          ? isDark
                            ? 'bg-sky-500/15 text-sky-300'
                            : 'bg-sky-50 text-sky-800'
                          : isDark
                            ? 'bg-teal-500/15 text-teal-300'
                            : 'bg-teal-50 text-teal-900';
                const iconWrap =
                  r.marketTab === 'agent'
                    ? 'bg-blue-500/10 text-blue-500'
                    : r.marketTab === 'skill'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : r.marketTab === 'mcp'
                        ? 'bg-violet-500/10 text-violet-600'
                        : r.marketTab === 'app'
                          ? 'bg-sky-500/10 text-sky-600'
                          : 'bg-teal-500/10 text-teal-700';
                return (
                  <div
                    key={`${r.id}-${r.marketTab}-${r.time}`}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate(
                        buildUserResourceMarketUrl(r.marketTab, {
                          resourceId: r.resourceId != null ? r.resourceId : undefined,
                        }),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(
                          buildUserResourceMarketUrl(r.marketTab, {
                            resourceId: r.resourceId != null ? r.resourceId : undefined,
                          }),
                        );
                      }
                    }}
                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors cursor-pointer ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconWrap}`}>
                      {r.icon ? <span className="text-base">{r.icon}</span> : <TypeIcon size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${tp}`}>{r.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 font-medium ${badgeTone}`}>{r.typeLabel}</span>
                      </div>
                    </div>
                    <span className={`text-xs whitespace-nowrap shrink-0 ${tm}`}>{r.time}</span>
                    <ChevronRight size={14} className={tm} />
                  </div>
                );
              })}
            </AnimatedList>
          </BentoCard>
        </motion.div>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action, i) => (
            <motion.div key={action.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.25 + i * 0.03 }}>
              <button type="button" onClick={() => navigate(action.marketTab ? buildUserResourceMarketUrl(action.marketTab) : buildPath('user', action.page))}
                className={`w-full p-4 flex items-center gap-3 text-left ${bentoCardHover(theme)}`}>
                <action.icon size={18} className={ts} />
                <span className={`text-sm font-bold ${tp}`}>{action.label}</span>
              </button>
            </motion.div>
          ))}
        </section>

      </DashboardLayout>
    </div>
  );
};
