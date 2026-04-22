import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import type { LucideIcon } from 'lucide-react';
import {
  Bot, Wrench, Cpu, AppWindow, Database, BookOpen, Users, Sparkles,
  Activity, Flame, ChevronRight, Award, Megaphone, ArrowRight,
  Star, Heart, MessageCircle, Clock, Crown, TrendingUp, Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EChartsOption } from 'echarts';
import type { Theme, FontSize } from '../../types';
import {
  canvasBodyBg,
  CONSOLE_CARD_RADIUS,
  CONSOLE_CARD_SHADOW_DARK,
  CONSOLE_CARD_SHADOW_LIGHT,
  mainScrollPadBottom,
} from '../../utils/uiClasses';
import { ConsolePageFooter } from '../../components/layout/ConsolePageFooter';
import { buildPath, buildUserResourceMarketUrl } from '../../constants/consoleRoutes';
import { unifiedResourceCenterPath } from '../../utils/unifiedResourceCenterPath';
import { dashboardService } from '../../api/services/dashboard.service';
import type { ExploreHubData, ExploreResourceItem, AnnouncementItem, ContributorItem } from '../../types/dto/explore';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { Modal } from '../../components/common/Modal';
import { MarkdownView } from '../../components/common/MarkdownView';
import { MultiAvatar } from '../../components/common/MultiAvatar';
import { EChartCard } from '../../components/charts/EChartCard';
import {
  baseAxis,
  baseGrid,
  baseTooltip,
  barSeriesColumnStyle,
  chartColors,
  lineSeriesTrendStyle,
  withAlpha,
} from '../../components/charts/echartsTheme';
import { formatDateTime } from '../../utils/formatDateTime';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { useUserRole, canAccessAdminView } from '../../context/UserRoleContext';
import { useMessage } from '../../components/common/Message';
import type { ExploreHubRailConfig } from '../../constants/topNavPolicy';
import { HubPersonalRail } from '../../components/layout/HubPersonalRail';
import {
  measureTextBlockHeightCached,
  PRETEXT_FONT_MONO_11_SNUG,
  PRETEXT_FONT_MONO_14_RELAXED,
  PRETEXT_LINE_HEIGHT_11_SNUG,
  PRETEXT_LINE_HEIGHT_14_RELAXED,
} from '../../utils/pretextTypography';

interface ExploreHubProps {
  theme: Theme;
  fontSize: FontSize;
  hubRail?: ExploreHubRailConfig;
  /**
   * 为 true 时：桌面端（lg+）由 MainLayout 在滚动区外渲染左轨，本页仅占主栏+右栏；
   * 小屏仍内嵌左轨并与内容同滚动。
   */
  shellRendersRailOnDesktop?: boolean;
  /** 与 MainLayout 移动抽屉联动：打开时抑制轨内全局 ⌘/Ctrl+K */
  mobileNavDrawerOpen?: boolean;
}

const subscribeLgUp = (onChange: () => void) => {
  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const getLgUpSnapshot = () => window.matchMedia('(min-width: 1024px)').matches;
const getLgUpServer = () => false;

function useLgUp(): boolean {
  return useSyncExternalStore(subscribeLgUp, getLgUpSnapshot, getLgUpServer);
}

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

/** 与全站 bento 一致：无边线，靠底色 + 阴影 */
const HUB_STAT_BASE_LIGHT = `border-transparent ${CONSOLE_CARD_SHADOW_LIGHT}`;
const HUB_STAT_BASE_DARK = `border-transparent ${CONSOLE_CARD_SHADOW_DARK}`;
/** 仅 HubStatCard：悬停略加重层次，边线弱于市场卡「选中」态 */
const HUB_STAT_HOVER_LIGHT =
  'hover:shadow-[var(--shadow-card-hover)] hover:border-sky-200/50 hover:bg-gradient-to-br hover:from-white hover:to-gray-50';
const HUB_STAT_HOVER_DARK =
  'hover:shadow-[var(--shadow-card-hover)] hover:border-sky-400/45 hover:bg-lantu-card-hover';

const Card: React.FC<{ children: React.ReactNode; className?: string; isDark?: boolean }> = ({ children, className = '', isDark = false }) => (
  <div
    className={`${CONSOLE_CARD_RADIUS} border border-transparent overflow-hidden ${
      isDark ? `bg-lantu-card ${CONSOLE_CARD_SHADOW_DARK}` : `bg-white ${CONSOLE_CARD_SHADOW_LIGHT}`
    } ${className}`}
  >
    {children}
  </div>
);

const sectionActionBtn = (isDark: boolean) =>
  `text-sm font-medium inline-flex items-center gap-1 rounded-lg px-2 py-1 -mr-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
    isDark
      ? 'text-lantu-text-secondary hover:text-lantu-text-primary focus-visible:ring-sky-400/50 focus-visible:ring-offset-lantu-card'
      : 'text-slate-500 hover:text-slate-900 focus-visible:ring-neutral-900/25 focus-visible:ring-offset-white'
  }`;

const SectionTitle: React.FC<{
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  isDark?: boolean;
}> = ({ title, action, onAction, icon: Icon, isDark = false }) => (
  <div className="flex items-center justify-between gap-3 mb-6">
    <div className="flex items-center gap-2 min-w-0">
      {Icon && <Icon className={`shrink-0 ${isDark ? 'text-lantu-text-primary' : 'text-slate-800'}`} size={20} />}
      <h2 className={`text-xl font-bold tracking-tight truncate ${isDark ? 'text-lantu-text-primary' : 'text-slate-900'}`}>{title}</h2>
    </div>
    {action && onAction && (
      <button type="button" onClick={onAction} className={`shrink-0 ${sectionActionBtn(isDark)}`}>
        {action} <ChevronRight size={16} className="shrink-0 opacity-70" aria-hidden />
      </button>
    )}
  </div>
);

/** 领奖台排名对应角色文案（仅作展示分层，不等同 RBAC） */
const CONTRIBUTOR_RANK_ROLE = ['平台贡献者', '优秀贡献者', '活跃贡献者'] as const;

function HubContributorStatCard({
  label,
  value,
  unit = '',
  trend,
  icon,
  isDark,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  trend?: boolean;
  icon: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div className="min-w-0">
      <div
        className={`text-[10px] font-bold uppercase tracking-[0.22em] flex items-center gap-1.5 mb-2 whitespace-nowrap ${
          isDark ? 'text-lantu-text-muted' : 'text-slate-400'
        }`}
      >
        <span className={isDark ? 'text-indigo-400' : 'text-indigo-500'}>{icon}</span>
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-[1.75rem] sm:text-[2rem] leading-none font-black tracking-tight ${isDark ? 'text-lantu-text-primary' : 'text-slate-900'}`}>{value}</span>
        {unit ? (
          <span className={`text-xs font-bold ${isDark ? 'text-lantu-text-muted' : 'text-slate-400'}`}>{unit}</span>
        ) : null}
        {trend ? (
          <TrendingUp
            size={14}
            className={`shrink-0 ml-0.5 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}

function HubContributorMiniStat({
  label,
  value,
  suffix = '',
  icon,
  isDark,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-w-0 px-1">
      <div
        className={`text-[10px] font-bold mb-1.5 text-center whitespace-nowrap tracking-[0.18em] uppercase ${
          isDark ? 'text-lantu-text-muted' : 'text-slate-400'
        }`}
      >
        {label}
      </div>
      <div className={`text-sm sm:text-[15px] font-black flex items-center gap-1 ${isDark ? 'text-lantu-text-primary' : 'text-slate-800'}`}>
        <span className="tabular-nums">{value}</span>
        {suffix ? (
          <span className={`text-[10px] font-bold ${isDark ? 'text-lantu-text-muted' : 'text-slate-400'}`}>{suffix}</span>
        ) : null}
        <span className={`shrink-0 ${isDark ? 'text-lantu-text-secondary' : 'text-slate-300'}`}>{icon}</span>
      </div>
    </div>
  );
}

function ExploreHubContributorsPodium({ contributors, isDark }: { contributors: ContributorItem[]; isDark: boolean }) {
  const top = contributors.slice(0, 3);
  const first = top[0];
  if (!first) {
    return <div className={`text-sm ${isDark ? 'text-lantu-text-secondary' : 'text-slate-500'}`}>暂无贡献者数据</div>;
  }
  const second = top[1];
  const third = top[2];

  const ringBorder = isDark ? 'border-white/15' : 'border-slate-100';
  const subtleBg = isDark ? 'bg-white/[0.03]' : 'bg-neutral-50';
  const textPri = isDark ? 'text-lantu-text-primary' : 'text-slate-900';
  const textMuted = isDark ? 'text-lantu-text-muted' : 'text-slate-400';

  const renderSide = (person: ContributorItem | undefined, rank: 2 | 3, badgeBg: string) => (
    <div className="flex-1 flex flex-col items-center min-w-0">
      <div className="relative mb-3">
        {person ? (
          <>
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 ${ringBorder} ${
                isDark ? 'bg-white/5' : 'bg-white'
              } shadow-sm flex items-center justify-center overflow-hidden`}
            >
              <MultiAvatar
                seed={`${person.userId}-${person.username}`}
                imageUrl={person.avatar}
                alt={person.username}
                className="w-[3.15rem] h-[3.15rem] sm:w-[3.5rem] sm:h-[3.5rem] rounded-full object-cover"
              />
            </div>
            <div
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${badgeBg} text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap z-10`}
            >
              TOP {rank}
            </div>
          </>
        ) : (
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed flex items-center justify-center text-[9px] font-medium px-1 text-center leading-tight ${
              isDark ? 'border-white/20 text-slate-500' : 'border-slate-200 text-slate-400'
            }`}
          >
            虚位以待
          </div>
        )}
      </div>
      {person ? (
        <>
          <p className={`text-xs sm:text-sm font-bold ${textPri} mt-1 truncate max-w-full px-0.5 text-center`}>
            {resolvePersonDisplay({
              names: [person.userName],
              usernames: [person.username],
              ids: [person.userId],
            })}
          </p>
          <p className={`text-[9px] font-bold mt-0.5 ${isDark ? 'text-lantu-text-muted' : 'text-slate-500'}`}>
            {CONTRIBUTOR_RANK_ROLE[rank - 1]}
          </p>
          <p className={`text-[10px] ${textMuted} font-medium tabular-nums`}>{formatCount(person.totalCalls)} 次调用</p>
        </>
      ) : (
        <p className={`text-xs ${textMuted} mt-1`}>—</p>
      )}
    </div>
  );

  return (
    <div
      className={`rounded-2xl border mt-2 overflow-hidden ${subtleBg} ${
        isDark ? 'border-white/10' : 'border-gray-100'
      } shadow-[var(--shadow-card)]`}
    >
      <div className="flex justify-end px-4 pt-3 sm:px-5 sm:pt-4">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap ${
            isDark ? 'text-lantu-text-muted bg-white/[0.06]' : 'text-slate-400 bg-slate-100'
          }`}
        >
          本周更新
        </span>
      </div>

      <div className="px-3 sm:px-5 pt-6 pb-4 flex items-end justify-between gap-1.5 sm:gap-3">
        {renderSide(second, 2, isDark ? 'bg-slate-500' : 'bg-slate-400')}

        <div className="flex-[1.12] sm:flex-[1.15] flex flex-col items-center relative z-10 -mt-5 sm:-mt-6 min-w-0 max-w-[46%]">
          <div className="relative mb-2.5 sm:mb-3 group">
            <div
              className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 text-amber-500 motion-safe:animate-bounce"
              aria-hidden
            >
              <Crown className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.75} fill="currentColor" />
            </div>
            <div
              className={`absolute -inset-1 sm:-inset-1.5 bg-gradient-to-tr from-amber-200/50 via-yellow-300/35 to-amber-200/50 rounded-full blur-md opacity-20 motion-safe:group-hover:opacity-40 transition-opacity ${
                isDark ? 'from-amber-400/25 via-amber-300/20' : ''
              }`}
              aria-hidden
            />
            <div
              className={`relative w-[4.75rem] h-[4.75rem] sm:w-[5.25rem] sm:h-[5.25rem] rounded-full border-[4px] sm:border-[5px] ${
                isDark ? 'border-slate-800/90 bg-slate-900' : 'border-white bg-white'
              } shadow-xl flex items-center justify-center overflow-hidden z-10`}
            >
              <MultiAvatar
                seed={`${first.userId}-${first.username}`}
                imageUrl={first.avatar}
                alt={first.username}
                className="w-16 h-16 sm:w-[4.25rem] sm:h-[4.25rem] rounded-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-600 text-white text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-full shadow-lg border-2 border-white z-20 whitespace-nowrap">
              TOP 1
            </div>
          </div>
          <h4 className={`text-sm sm:text-base font-black ${textPri} mt-1.5 sm:mt-2 text-center truncate max-w-full px-0.5`}>
            {resolvePersonDisplay({
              names: [first.userName],
              usernames: [first.username],
              ids: [first.userId],
            })}
          </h4>
          <p
            className={`text-[10px] sm:text-xs font-bold mt-1 px-2 py-0.5 rounded-full max-w-full truncate ${
              isDark ? 'text-amber-300 bg-amber-500/15' : 'text-amber-800 bg-amber-50'
            }`}
          >
            {CONTRIBUTOR_RANK_ROLE[0]}
          </p>
        </div>

        {renderSide(third, 3, isDark ? 'bg-orange-500' : 'bg-orange-400')}
      </div>

      <div
        className={`mx-3 sm:mx-5 mb-4 sm:mb-5 p-3 sm:p-5 rounded-2xl border ${
          isDark ? 'bg-black/25 border-white/[0.08]' : 'bg-white border-slate-100'
        } shadow-inner`}
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <HubContributorStatCard
            label="发布资源"
            value={first.resourceCount}
            unit="个"
            trend={(first.weeklyNewResources ?? 0) > 0}
            icon={<TrendingUp size={12} aria-hidden />}
            isDark={isDark}
          />
          <HubContributorStatCard
            label="累计调用"
            value={formatCount(first.totalCalls)}
            icon={<Zap size={12} aria-hidden />}
            isDark={isDark}
          />
        </div>
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          <HubContributorMiniStat
            label="本周新作"
            value={String(first.weeklyNewResources ?? 0)}
            suffix="个"
            icon={<Star size={10} aria-hidden />}
            isDark={isDark}
          />
          <HubContributorMiniStat
            label="本周调用"
            value={formatCount(first.weeklyCalls ?? 0)}
            icon={<TrendingUp size={10} aria-hidden />}
            isDark={isDark}
          />
          <HubContributorMiniStat
            label="资源获赞"
            value={formatCount(first.likeCount ?? 0)}
            icon={<Heart size={10} aria-hidden />}
            isDark={isDark}
          />
        </div>
      </div>

      <div
        className={`h-1 bg-gradient-to-r from-amber-200/50 via-indigo-200/50 to-amber-200/50 ${
          isDark ? 'opacity-35' : 'opacity-50'
        }`}
        aria-hidden
      />
    </div>
  );
}

function ExploreHubContributorsEditorialPanel({ contributors, isDark }: { contributors: ContributorItem[]; isDark: boolean }) {
  const top = contributors.slice(0, 3);
  const first = top[0];

  if (!first) {
    return <div className={`text-sm ${isDark ? 'text-lantu-text-secondary' : 'text-slate-500'}`}>暂无贡献者数据</div>;
  }

  const second = top[1];
  const third = top[2];
  const textPri = isDark ? 'text-lantu-text-primary' : 'text-slate-900';
  const textMuted = isDark ? 'text-lantu-text-muted' : 'text-slate-400';
  const divider = isDark ? 'border-white/10' : 'border-slate-200/80';
  const panelBg = isDark
    ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]'
    : 'bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]';
  const panelBorder = isDark ? 'border-white/10' : 'border-slate-200/80';
  const topChip = isDark ? 'bg-white/[0.06] text-lantu-text-muted' : 'bg-slate-100 text-slate-500';
  const sideBadge = isDark ? 'text-slate-400' : 'text-slate-500';
  const accentLine = isDark ? 'from-amber-400/30 via-indigo-400/20 to-cyan-400/25' : 'from-amber-200 via-indigo-100 to-cyan-100';
  const avatarShell = isDark ? 'border-white/10 bg-slate-950/80' : 'border-white bg-white';

  const renderSide = (person: ContributorItem | undefined, rank: 2 | 3) => (
    <div className="flex-1 min-w-0 flex flex-col items-center text-center justify-end">
      <div className="relative">
        {person ? (
          <div className={`w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full border-[3px] ${avatarShell} shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] flex items-center justify-center overflow-hidden`}>
            <MultiAvatar
              seed={`${person.userId}-${person.username}`}
              imageUrl={person.avatar}
              alt={person.username}
              className="w-[3.5rem] h-[3.5rem] sm:w-[4rem] sm:h-[4rem] rounded-full object-cover"
            />
          </div>
        ) : (
          <div
            className={`w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full border border-dashed flex items-center justify-center text-[10px] font-semibold leading-tight px-2 ${
              isDark ? 'border-white/15 text-slate-500 bg-white/[0.02]' : 'border-slate-200 text-slate-400 bg-slate-50/70'
            }`}
          >
            虚位以待
          </div>
        )}
      </div>

      <div className="mt-3 min-w-0">
        <div className={`text-[11px] font-black tracking-[0.28em] uppercase ${sideBadge}`}>TOP {rank}</div>
        {person ? (
          <>
            <p className={`mt-2 text-sm sm:text-[15px] font-bold ${textPri} truncate max-w-full px-1`}>
              {resolvePersonDisplay({
                names: [person.userName],
                usernames: [person.username],
                ids: [person.userId],
              })}
            </p>
            <p className={`mt-1 text-[11px] font-semibold ${isDark ? 'text-lantu-text-secondary' : 'text-slate-500'}`}>
              {CONTRIBUTOR_RANK_ROLE[rank - 1]}
            </p>
            <p className={`mt-1 text-[11px] ${textMuted} font-medium tabular-nums`}>{formatCount(person.totalCalls)} 次调用</p>
          </>
        ) : (
          <p className={`mt-2 text-xs ${textMuted}`}>敬请期待</p>
        )}
      </div>
    </div>
  );

  return (
    <div className={`relative mt-2 overflow-hidden rounded-[2rem] border px-4 py-4 sm:px-6 sm:py-5 ${panelBg} ${panelBorder}`}>
      <div className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r ${accentLine}`} aria-hidden />

      <div className="flex items-center justify-end">
        <span className={`text-[10px] font-bold uppercase tracking-[0.24em] px-2.5 py-1 rounded-full whitespace-nowrap ${topChip}`}>
          本周更新
        </span>
      </div>

      <div className="relative mt-6">
        <div
          className={`pointer-events-none absolute left-[14%] right-[14%] top-[2.5rem] sm:top-[3rem] border-t ${divider}`}
          aria-hidden
        />
        <div className="flex items-end justify-between gap-2 sm:gap-6">
          {renderSide(second, 2)}

          <div className="relative z-10 flex-[1.15] sm:flex-[1.05] min-w-0 max-w-[48%] flex flex-col items-center text-center">
            <div className="relative overflow-visible">
              <div
                className={`absolute -inset-4 rounded-full blur-2xl ${isDark ? 'bg-amber-400/15' : 'bg-amber-200/60'}`}
                aria-hidden
              />
              <div
                className={`absolute z-30 -top-5 sm:-top-6 left-1/2 -translate-x-1/2 inline-flex items-center justify-center w-10 h-10 rounded-full shadow-[0_10px_24px_-16px_rgba(245,158,11,0.85)] ${
                  isDark ? 'bg-amber-400/15 text-amber-300 border border-amber-300/20' : 'bg-amber-50 text-amber-500 border border-amber-100'
                }`}
                aria-hidden
              >
                <Crown className="w-5 h-5" strokeWidth={1.8} fill="currentColor" />
              </div>
              <div
                className={`relative z-10 w-[5.5rem] h-[5.5rem] sm:w-[6.5rem] sm:h-[6.5rem] rounded-full border-[5px] sm:border-[6px] ${avatarShell} shadow-[0_24px_50px_-30px_rgba(245,158,11,0.55)] flex items-center justify-center overflow-hidden`}
              >
                <MultiAvatar
                  seed={`${first.userId}-${first.username}`}
                  imageUrl={first.avatar}
                  alt={first.username}
                  className="w-[4.7rem] h-[4.7rem] sm:w-[5.55rem] sm:h-[5.55rem] rounded-full object-cover"
                />
              </div>
              <div className="mt-3 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-white shadow-[0_12px_30px_-18px_rgba(245,158,11,0.85)]">
                TOP 1
              </div>
            </div>

            <h4 className={`mt-4 text-base sm:text-[1.15rem] leading-none font-black ${textPri} text-center truncate max-w-full px-1`}>
              {resolvePersonDisplay({
                names: [first.userName],
                usernames: [first.username],
                ids: [first.userId],
              })}
            </h4>
            <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${isDark ? 'bg-amber-400/12 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
              {CONTRIBUTOR_RANK_ROLE[0]}
            </div>
            <p className={`mt-2 text-sm font-medium ${textMuted}`}>{formatCount(first.totalCalls)} 次累计调用</p>
          </div>

          {renderSide(third, 3)}
        </div>
      </div>

      <div className={`mt-6 border-t ${divider} pt-4 sm:pt-5`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <HubContributorStatCard
            label="发布资源"
            value={first.resourceCount}
            unit="个"
            trend={(first.weeklyNewResources ?? 0) > 0}
            icon={<TrendingUp size={12} aria-hidden />}
            isDark={isDark}
          />
          <HubContributorStatCard
            label="累计调用"
            value={formatCount(first.totalCalls)}
            icon={<Zap size={12} aria-hidden />}
            isDark={isDark}
          />
        </div>

        <div className={`mt-4 grid grid-cols-3 gap-3 border-t ${divider} pt-4`}>
          <HubContributorMiniStat
            label="本周新作"
            value={String(first.weeklyNewResources ?? 0)}
            suffix="个"
            icon={<Star size={10} aria-hidden />}
            isDark={isDark}
          />
          <HubContributorMiniStat
            label="本周调用"
            value={formatCount(first.weeklyCalls ?? 0)}
            icon={<TrendingUp size={10} aria-hidden />}
            isDark={isDark}
          />
          <HubContributorMiniStat
            label="资源获赞"
            value={formatCount(first.likeCount ?? 0)}
            icon={<Heart size={10} aria-hidden />}
            isDark={isDark}
          />
        </div>

        <div
          className={`mt-5 h-px bg-gradient-to-r ${accentLine} ${isDark ? 'opacity-60' : 'opacity-80'}`}
          aria-hidden
        />
      </div>
    </div>
  );
}

const hubResourceCardClass = (isDark: boolean) =>
  `${CONSOLE_CARD_RADIUS} border border-transparent px-6 pt-6 pb-8 flex flex-col h-full text-left cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2 ${
    isDark
      ? `bg-lantu-card ${CONSOLE_CARD_SHADOW_DARK} focus-visible:ring-offset-lantu-card hover:border-sky-400/45 hover:shadow-[var(--shadow-card-hover)]`
      : `bg-white ${CONSOLE_CARD_SHADOW_LIGHT} focus-visible:ring-offset-white hover:border-sky-200/50 hover:shadow-[var(--shadow-card-hover)]`
  }`;

const HubResourceCard: React.FC<{
  item: ExploreResourceItem;
  isDark: boolean;
  onOpen: (item: ExploreResourceItem) => void;
  rank?: number;
  showReason?: boolean;
}> = ({ item, isDark, onOpen, rank, showReason }) => {
  const authorLabel = item.author?.trim() || '平台资源';
  const metaMuted = isDark ? 'text-lantu-text-muted' : 'text-slate-400';
  const showRating = item.rating != null && item.rating > 0 && !Number.isNaN(Number(item.rating));
  const fav = item.favoriteCount != null ? Number(item.favoriteCount) : 0;
  const rev = item.reviewCount != null ? Number(item.reviewCount) : 0;
  return (
    <button type="button" onClick={() => onOpen(item)} className={hubResourceCardClass(isDark)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
              isDark ? 'bg-white/10 text-lantu-text-secondary' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {TYPE_LABEL[item.resourceType] ?? item.resourceType}
          </span>
          {showReason && item.reason?.trim() ? (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md truncate max-w-[200px] ${
                isDark ? 'bg-sky-500/15 text-sky-200 border border-sky-400/25' : 'bg-sky-50 text-sky-800 border border-sky-100'
              }`}
              title={item.reason}
            >
              {item.reason}
            </span>
          ) : null}
        </div>
        {rank != null ? (
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
              isDark ? 'bg-white/5 border-white/10 text-lantu-text-muted' : 'bg-slate-50 border-slate-100 text-slate-400'
            }`}
          >
            {rank}
          </div>
        ) : null}
      </div>

      <h4 className={`font-bold text-lg mb-2 ${isDark ? 'text-lantu-text-primary' : 'text-slate-900'}`}>{item.displayName}</h4>
      <p className={`text-sm leading-relaxed flex-grow ${isDark ? 'text-lantu-text-secondary' : 'text-slate-500'}`}>{item.description}</p>

      <div className={`flex flex-wrap gap-x-3 gap-y-1 mt-4 text-xs ${metaMuted}`}>
        {showRating ? (
          <span className="inline-flex items-center gap-1">
            <Star size={13} className="shrink-0 opacity-80" aria-hidden />
            {Number(item.rating).toFixed(1)}
          </span>
        ) : null}
        {fav > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Heart size={13} className="shrink-0 opacity-80" aria-hidden />
            {formatCount(fav)}
          </span>
        ) : null}
        {rev > 0 ? (
          <span className="inline-flex items-center gap-1">
            <MessageCircle size={13} className="shrink-0 opacity-80" aria-hidden />
            {formatCount(rev)}
          </span>
        ) : null}
        {item.publishedAt ? (
          <span className="inline-flex items-center gap-1 min-w-0">
            <Clock size={13} className="shrink-0 opacity-80" aria-hidden />
            <span className="truncate">{formatDateTime(item.publishedAt)}</span>
          </span>
        ) : null}
      </div>

      <div
        className={`flex items-center justify-between mt-6 pt-4 border-t ${
          isDark ? 'border-white/10' : 'border-slate-100'
        }`}
      >
        <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-lantu-text-secondary' : 'text-slate-500'}`}>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
              isDark ? 'bg-gradient-to-br from-slate-600 to-slate-700' : 'bg-gradient-to-br from-slate-200 to-slate-300'
            }`}
          >
            {authorLabel.charAt(0)}
          </div>
          {authorLabel}
        </div>
        <div className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-lantu-text-muted' : 'text-slate-400'}`}>
          <Activity size={14} aria-hidden />
          {item.callCount == null ? '—' : formatCount(item.callCount)}
        </div>
      </div>
    </button>
  );
};

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
    `group relative flex h-[156px] min-w-0 w-full flex-col items-center justify-center overflow-hidden ${CONSOLE_CARD_RADIUS} border`,
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
    'mb-4 flex h-12 w-12 items-center justify-center rounded-xl',
    'transition-all duration-500 ease-out',
    'group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-[var(--shadow-card-hover)]',
    isDark
      ? 'bg-white/10 text-lantu-text-secondary group-hover:bg-white group-hover:text-neutral-900'
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
          isDark ? 'text-lantu-text-primary' : 'text-gray-900'
        }`}>
          {value}
        </div>
        <div className={`text-xs font-medium transition-colors duration-300 ${
          isDark ? 'text-lantu-text-secondary group-hover:text-lantu-text-primary' : 'text-slate-500 group-hover:text-slate-800'
        }`}>
          {label}
        </div>
      </div>
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${shell} cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 ${
          isDark ? 'focus-visible:ring-offset-lantu-card' : 'focus-visible:ring-offset-white'
        }`}
      >
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

/** 默认高光中心（%），略偏右上，静止态 */
const HERO_GLOW_DEFAULT_PCT = { x: 68, y: 22 };

function heroTerminalSpotlightGradient(x: number, y: number): string {
  return `radial-gradient(95% 88% at ${x.toFixed(2)}% ${y.toFixed(2)}%, rgba(255,255,255,0.09) 0%, rgba(186,230,253,0.04) 34%, rgba(165,180,252,0.025) 52%, transparent 72%)`;
}

const HeroCodeTerminal: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [typedCode, setTypedCode] = useState('');
  const codeBoxRef = useRef<HTMLDivElement>(null);
  const [codeBoxH, setCodeBoxH] = useState(() => (compact ? 132 : 300));
  const wrapRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const glowRafRef = useRef<number>(0);
  const glowPosRef = useRef({ ...HERO_GLOW_DEFAULT_PCT });
  const glowTargetRef = useRef({ ...HERO_GLOW_DEFAULT_PCT });
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

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

  const measureCodeBox = useCallback(() => {
    const el = codeBoxRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const w = Math.max(1, el.clientWidth - padX);
    const font = compact ? PRETEXT_FONT_MONO_11_SNUG : PRETEXT_FONT_MONO_14_RELAXED;
    const lh = compact ? PRETEXT_LINE_HEIGHT_11_SNUG : PRETEXT_LINE_HEIGHT_14_RELAXED;
    const maxPx = compact ? 132 : 300;
    const minPx = Math.min(compact ? 4 * lh : 6 * lh, maxPx);
    const { height } = measureTextBlockHeightCached(typedCode, w, lh, font, { whiteSpace: 'pre-wrap' });
    const capped = Math.min(Math.max(height + 4, minPx), maxPx);
    setCodeBoxH(capped);
  }, [typedCode, compact]);

  useLayoutEffect(() => {
    measureCodeBox();
  }, [measureCodeBox]);

  useEffect(() => {
    setCodeBoxH(compact ? 132 : 300);
  }, [compact]);

  useEffect(() => {
    const el = codeBoxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measureCodeBox());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureCodeBox]);

  const runGlowTick = useCallback(() => {
    const spot = spotlightRef.current;
    if (!spot) {
      glowRafRef.current = 0;
      return;
    }
    const cur = glowPosRef.current;
    const tgt = glowTargetRef.current;
    const k = 0.13;
    cur.x += (tgt.x - cur.x) * k;
    cur.y += (tgt.y - cur.y) * k;
    spot.style.background = heroTerminalSpotlightGradient(cur.x, cur.y);
    const settled = Math.abs(tgt.x - cur.x) < 0.12 && Math.abs(tgt.y - cur.y) < 0.12;
    if (settled) {
      cur.x = tgt.x;
      cur.y = tgt.y;
      spot.style.background = heroTerminalSpotlightGradient(cur.x, cur.y);
      glowRafRef.current = 0;
      return;
    }
    glowRafRef.current = requestAnimationFrame(runGlowTick);
  }, []);

  const scheduleGlow = useCallback(() => {
    if (glowRafRef.current) return;
    glowRafRef.current = requestAnimationFrame(runGlowTick);
  }, [runGlowTick]);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      glowTargetRef.current = {
        x: ((e.clientX - r.left) / Math.max(r.width, 1)) * 100,
        y: ((e.clientY - r.top) / Math.max(r.height, 1)) * 100,
      };
      scheduleGlow();
    },
    [reduceMotion, scheduleGlow],
  );

  const onMouseLeave = useCallback(() => {
    glowTargetRef.current = { ...HERO_GLOW_DEFAULT_PCT };
    if (reduceMotion) {
      const spot = spotlightRef.current;
      if (spot) {
        glowPosRef.current = { ...HERO_GLOW_DEFAULT_PCT };
        spot.style.background = heroTerminalSpotlightGradient(HERO_GLOW_DEFAULT_PCT.x, HERO_GLOW_DEFAULT_PCT.y);
      }
      return;
    }
    scheduleGlow();
  }, [reduceMotion, scheduleGlow]);

  useEffect(
    () => () => {
      if (glowRafRef.current) cancelAnimationFrame(glowRafRef.current);
    },
    [],
  );

  const outerPad = compact ? 'p-4 -m-4 max-w-[calc(100%+2rem)]' : 'p-10 -m-10 max-w-[calc(100%+5rem)]';
  const termWidth = compact ? 'w-[280px]' : 'w-[420px]';
  const codeText = compact ? 'text-xs leading-snug' : 'text-sm leading-relaxed';
  const headPad = compact ? 'px-3 py-2' : 'px-4 py-3';
  const innerPad = compact ? 'p-3' : 'p-5';
  const rotate = compact ? 'rotate(-1deg)' : 'rotate(-2deg)';

  return (
    <div
      className={`shrink-0 ${outerPad}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div
        ref={wrapRef}
        role="img"
        aria-label="示例代码窗口：deploy 智能体"
        className={`relative ${termWidth} max-w-full shrink-0 rounded-xl`}
        style={{ transform: rotate }}
      >
      {/* 环境光晕：双层椭圆径向 + 大半径 blur，低饱和避免「塑料霓虹」 */}
      <div
        className="pointer-events-none absolute -inset-[10px] z-0 rounded-2xl opacity-50"
        style={{
          background: `
            radial-gradient(ellipse 130% 95% at 18% 12%, rgba(56,189,248,0.11), transparent 58%),
            radial-gradient(ellipse 110% 130% at 92% 88%, rgba(129,140,248,0.08), transparent 55%)
          `,
          filter: 'blur(26px)',
        }}
        aria-hidden
      />
      {/* 贴边薄晕：略提高边缘存在感，仍弱于主体 */}
      <div
        className="pointer-events-none absolute -inset-[5px] z-0 rounded-2xl opacity-[0.35]"
        style={{
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, transparent 42%, rgba(125,211,252,0.04) 100%)',
          filter: 'blur(8px)',
        }}
        aria-hidden
      />
      {/* 高光：插值跟随指针，椭圆形渐变 + 柔化 blur */}
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute -inset-10 z-0 rounded-3xl"
        style={{
          filter: 'blur(44px)',
          background: heroTerminalSpotlightGradient(HERO_GLOW_DEFAULT_PCT.x, HERO_GLOW_DEFAULT_PCT.y),
        }}
        aria-hidden
      />
      <div
        className="relative z-10 overflow-hidden rounded-xl border border-white/[0.09] bg-black/40 shadow-[var(--shadow-card)] backdrop-blur-xl"
      >
      <div className={`flex items-center border-b border-white/5 ${headPad}`}>
        <div className={`flex ${compact ? 'gap-1' : 'gap-1.5'}`}>
          <div className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full bg-red-500/80`} />
          <div className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full bg-yellow-500/80`} />
          <div className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full bg-green-500/80`} />
        </div>
        <div className={`mx-auto text-gray-500 font-mono ${compact ? 'text-xs' : 'text-xs'}`}>agent-deploy.ts</div>
      </div>

      <div
        ref={codeBoxRef}
        className={`shrink-0 ${innerPad} font-mono ${codeText} overflow-y-auto overflow-x-hidden min-h-0 min-w-0`}
        style={{ height: codeBoxH }}
      >
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
    </div>
    </div>
  );
};

export const ExploreHub: React.FC<ExploreHubProps> = ({
  theme,
  fontSize: _fontSize,
  hubRail,
  shellRendersRailOnDesktop = false,
  mobileNavDrawerOpen = false,
}) => {
  const navigate = useNavigate();
  const { platformRole } = useUserRole();
  const { showMessage } = useMessage();
  const isDark = theme === 'dark';
  const lgUp = useLgUp();
  const hasHubRail = Boolean(hubRail);
  const embedRailColumn = hasHubRail && (!shellRendersRailOnDesktop || !lgUp);
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
  const recentItems = (hubData?.recentPublished ?? []).slice(0, 4);
  const recommendedItems = (hubData?.recommendedForUser ?? []).slice(0, 4);
  const announcements = (hubData?.announcements ?? []).slice(0, 3);
  const topContributors = useMemo(
    () => [...(hubData?.topContributors ?? [])].sort((a, b) => b.totalCalls - a.totalCalls).slice(0, 3),
    [hubData?.topContributors],
  );
  const c = chartColors(theme);
  const axis = baseAxis(theme);

  const callsTrendOption = useMemo<EChartsOption>(() => {
    const rows = stats?.callsTrend7d ?? [];
    const lineColor = c.series[0] ?? '#3b82f6';
    return {
      title: {
        text: '调用趋势（近7天）',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: c.text },
      },
      color: [lineColor],
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
          data: rows.map((r) => Number(r.calls) || 0),
          ...lineSeriesTrendStyle(theme, lineColor),
        },
      ],
    };
  }, [axis.category, axis.value, c.series, c.text, stats?.callsTrend7d, theme]);

  const newResourcesTrendOption = useMemo<EChartsOption>(() => {
    const rows = stats?.newResourcesTrend7d ?? [];
    const isDark = theme === 'dark';
    const top = isDark ? c.series[4] ?? '#64748b' : c.series[1] ?? '#8b5cf6';
    const bottom = isDark ? withAlpha(c.muted, 0.95) : withAlpha(top, 0.42);
    return {
      title: {
        text: '新增资源（近7天）',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: c.text },
      },
      color: [top],
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
          ...barSeriesColumnStyle(theme, top, bottom, [7, 7, 0, 0]),
        },
      ],
    };
  }, [axis.category, axis.value, c.muted, c.series, c.text, stats?.newResourcesTrend7d, theme]);

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

  /** 与主画布内容区留出足够内边距，避免区块贴边 */
  const pageContainer = 'w-full min-w-0';

  /** Hero：压低高度、参考魔搭「中间栏横幅」；有左轨时仅占主栏宽度 */
  const heroRingOffset = isDark ? 'focus-visible:ring-offset-lantu-canvas' : 'focus-visible:ring-offset-[#0a0a0a]';
  const heroShellClass = isDark
    ? `relative w-full overflow-hidden rounded-2xl border border-transparent bg-gradient-to-b from-[#252830] via-[#1e2128] to-[#181b22] px-5 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.055),var(--shadow-card)] sm:px-6 sm:py-5`
    : `relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] px-5 py-4 shadow-[var(--shadow-card)] sm:px-6 sm:py-5`;
  const heroGridStyle: React.CSSProperties = {
    backgroundImage: isDark
      ? 'linear-gradient(to right, rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.045) 1px, transparent 1px)'
      : 'linear-gradient(to right, rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.055) 1px, transparent 1px)',
    backgroundSize: '32px 32px',
  };
  const heroVignetteFrom = isDark ? '#1e2128' : '#0a0a0a';
  const heroLeadClass = isDark
    ? 'text-lantu-text-secondary text-sm sm:text-[15px] font-normal leading-relaxed max-w-xl mb-4'
    : 'text-slate-300 text-sm sm:text-[15px] font-light leading-relaxed max-w-xl mb-4';

  const heroCompactTerminal = Boolean(hubRail);

  const hubHeroBanner = (
    <div className={heroShellClass} style={heroGridStyle}>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to right, ${heroVignetteFrom}, transparent 12%, transparent 88%, ${heroVignetteFrom})`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to top, ${heroVignetteFrom}, transparent 38%, transparent 62%, ${heroVignetteFrom})`,
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-6 lg:justify-between">
        {/* 与下方统计栅格、资源卡同宽：主栏内占满可用宽；段落在 heroLeadClass 中另控行长 */}
        <div className="w-full min-w-0 lg:flex-1">
          <button
            type="button"
            onClick={() => navigate(unifiedResourceCenterPath(platformRole))}
            className={`group mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1.5 text-left shadow-[var(--shadow-control)] backdrop-blur-md transition-colors hover:border-white/[0.16] hover:bg-white/[0.11] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/55 focus-visible:ring-offset-2 ${heroRingOffset}`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-400" strokeWidth={2} aria-hidden />
            <span className="text-xs font-medium text-white sm:text-sm">Nexus Pro 2.0 现已发布</span>
            <ChevronRight
              className="ml-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400"
              strokeWidth={2}
              aria-hidden
            />
          </button>

          <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-bold text-white tracking-tight leading-snug mb-3">
            Build the future of <span className="whitespace-nowrap">campus AI.</span>
          </h1>

          <p className={heroLeadClass}>
            数字化资产与能力门户：目录发现与按权消费；统一注册、审核与 API Key / scope 详见接入指南。
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => navigate(unifiedResourceCenterPath(platformRole))}
              className={`bg-white text-black px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-neutral-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-[var(--shadow-control)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 ${heroRingOffset}`}
            >
              开始发布 <ArrowRight size={15} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'developer-docs'))}
              className={`text-slate-400 text-sm font-medium hover:text-white transition-colors rounded-lg px-2 py-1.5 -ml-1 border border-transparent hover:border-white/15 hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-2 ${heroRingOffset}`}
            >
              查看文档
            </button>
          </div>
        </div>

        <div
          className={`mt-5 flex justify-center lg:mt-0 lg:shrink-0 ${heroCompactTerminal ? 'hidden min-[1280px]:flex' : 'hidden lg:flex'} lg:justify-end`}
        >
          <div className={`relative max-w-full ${heroCompactTerminal ? '' : 'w-[420px]'}`}>
            <HeroCodeTerminal compact={heroCompactTerminal} />
          </div>
        </div>
      </div>
    </div>
  );

  const statsGridEl = (
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
  );

  return (
    <>
      <div className={`w-full min-w-0 ${mainScrollPadBottom} ${canvasBodyBg(theme)}`}>
        {!hubRail ? <div className={pageContainer}>{hubHeroBanner}</div> : null}

        <main className={`${pageContainer} ${hubRail ? 'mt-0' : 'mt-6 sm:mt-7'} space-y-8`}>
          {hubRail ? null : statsGridEl}

          <div
            className={`grid grid-cols-1 items-stretch gap-8 lg:gap-10 ${
              embedRailColumn ? 'lg:grid-cols-12' : hasHubRail ? 'lg:grid-cols-10' : 'lg:grid-cols-12'
            }`}
          >
            {embedRailColumn ? (
              <div
                className="order-2 col-span-1 flex min-h-0 flex-col lg:order-1 lg:col-span-2 lg:sticky lg:top-0 lg:z-[1] lg:self-start lg:max-h-[calc(100dvh-5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] lg:overflow-y-auto lg:overscroll-y-contain custom-scrollbar lantu-hub-sticky-rail-scroll lg:pr-6"
              >
                <HubPersonalRail
                  theme={theme}
                  sections={hubRail!.sections}
                  displayName={hubRail!.displayName}
                  roleLabel={hubRail!.roleLabel}
                  avatarSeed={hubRail!.avatarSeed}
                  activeSidebar={hubRail!.activeSidebar}
                  activeSubItem={hubRail!.activeSubItem}
                  routeRole={hubRail!.routeRole}
                  onSubItemClick={hubRail!.onSubItemClick}
                  suppressGlobalMenuSearchHotkey={mobileNavDrawerOpen}
                  outerScrollOnly
                />
              </div>
            ) : null}
            <div
              className={`space-y-8 order-1 ${hasHubRail ? 'lg:col-span-7' : 'lg:col-span-8'}${
                hasHubRail ? (embedRailColumn ? ' lg:order-2' : ' lg:order-1') : ''
              }`}
            >
              {hubRail ? (
                <div className="space-y-6">
                  {hubHeroBanner}
                  {statsGridEl}
                </div>
              ) : null}
              <div>
                <SectionTitle
                  title="校园热门资源"
                  icon={Flame}
                  action="浏览全部"
                  onAction={() => navigate(buildUserResourceMarketUrl('agent'))}
                  isDark={isDark}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {hotResources.map((res, idx) => (
                    <HubResourceCard
                      key={`${res.resourceType}-${res.resourceId}`}
                      item={res}
                      isDark={isDark}
                      onOpen={navigateToResource}
                      rank={idx + 1}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                  <SectionTitle
                    title="最新上架"
                    icon={BookOpen}
                    action="资源中心"
                    onAction={() => navigate(unifiedResourceCenterPath(platformRole))}
                    isDark={isDark}
                  />
                  {recentItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {recentItems.map((res) => (
                        <HubResourceCard
                          key={`recent-${res.resourceType}-${res.resourceId}`}
                          item={res}
                          isDark={isDark}
                          onOpen={navigateToResource}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${isDark ? 'text-lantu-text-muted' : 'text-slate-500'}`}>暂无最新上架资源</p>
                  )}
                </div>
                <div>
                  <SectionTitle
                    title="为你推荐"
                    icon={Sparkles}
                    action="去逛逛"
                    onAction={() => navigate(buildUserResourceMarketUrl('agent'))}
                    isDark={isDark}
                  />
                  {recommendedItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {recommendedItems.map((res) => (
                        <HubResourceCard
                          key={`rec-${res.resourceType}-${res.resourceId}`}
                          item={res}
                          isDark={isDark}
                          onOpen={navigateToResource}
                          showReason
                        />
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${isDark ? 'text-lantu-text-muted' : 'text-slate-500'}`}>暂无个性化推荐，可多使用资源与收藏以便生成推荐</p>
                  )}
                </div>
              </div>

              <div>
                <SectionTitle
                  title="平台公告"
                  icon={Megaphone}
                  action="历史公告"
                  onAction={() => {
                    if (canAccessAdminView(platformRole)) {
                      navigate(buildPath('admin', 'announcements'));
                    } else {
                      showMessage('完整公告列表在管理后台，您可关注本页最新公告。', 'info');
                    }
                  }}
                  isDark={isDark}
                />
                <Card className="overflow-hidden" isDark={isDark}>
                  <div className={`divide-y ${isDark ? 'divide-white/10' : 'divide-slate-100'}`}>
                    {announcements.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setDetailAnnouncement(item)}
                        className={`w-full p-6 flex gap-5 transition-colors cursor-pointer group text-left rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/40 ${
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
                            <h4 className={`font-bold text-lg ${isDark ? 'text-lantu-text-primary group-hover:text-white' : 'text-slate-900 group-hover:text-black'}`}>{item.title}</h4>
                            <span className={`text-xs px-2 py-1 rounded-md ${
                              isDark ? 'text-lantu-text-secondary bg-white/5' : 'text-slate-400 bg-slate-50'
                            }`}>{formatDateTime(item.createdAt)}</span>
                          </div>
                          <p className={`text-sm leading-relaxed mt-2 ${isDark ? 'text-lantu-text-secondary' : 'text-slate-500'}`}>{item.summary}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>

            <div
              className={`space-y-8 order-3 ${hasHubRail ? 'lg:col-span-3' : 'lg:col-span-4'}${
                hasHubRail && !embedRailColumn ? ' lg:order-2' : ''
              }`}
            >
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
                <ExploreHubContributorsEditorialPanel contributors={topContributors} isDark={isDark} />
              </Card>
            </div>
          </div>
        </main>
      </div>

      <ConsolePageFooter theme={theme} />

      <Modal
        open={!!detailAnnouncement}
        onClose={() => setDetailAnnouncement(null)}
        title={detailAnnouncement?.title ?? '公告详情'}
        theme={isDark ? 'dark' : 'light'}
        size="lg"
      >
        {detailAnnouncement && (
          <div className="space-y-3">
            <div className={`text-xs ${isDark ? 'text-lantu-text-muted' : 'text-slate-500'}`}>
              <span
                className={`px-2 py-0.5 rounded-md mr-2 font-medium ${
                  isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {ANNOUNCEMENT_LABEL[detailAnnouncement.type] ?? detailAnnouncement.type}
              </span>
              发布时间：{formatDateTime(detailAnnouncement.createdAt)}
            </div>
            <MarkdownView value={detailAnnouncement.content?.trim() ? detailAnnouncement.content : (detailAnnouncement.summary ?? '')} />
          </div>
        )}
      </Modal>
    </>
  );
};
