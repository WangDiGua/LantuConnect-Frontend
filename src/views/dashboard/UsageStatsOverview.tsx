import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Layers3,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';

import type { Theme, FontSize } from '../../types';
import type { UsageStatsData, UsageStatsPoint } from '../../types/dto/dashboard';
import { dashboardService } from '../../api/services/dashboard.service';
import { RESOURCE_TYPE_LABEL } from '../../constants/resourceTypes';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import {
  bentoCard,
  canvasBodyBg,
  mainScrollCompositorClass,
  pageBlockStack,
  tableBodyRow,
  tableCell,
  tableHeadCell,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { buildUsageStatsOverviewModel } from './usageStatsOverviewModel';

interface Props {
  theme: Theme;
  fontSize: FontSize;
}

type RangeOption = '7d' | '30d' | '90d';

const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

function shortDate(value: string): string {
  return value.length >= 5 ? value.slice(5) : value;
}

function reportCardClass(theme: Theme, extra = ''): string {
  return [
    bentoCard(theme),
    extra,
  ].join(' ');
}

function subtlePanelClass(theme: Theme, extra = ''): string {
  const isDark = theme === 'dark';
  return [
    'rounded-[20px] border',
    isDark ? 'border-white/[0.06] bg-lantu-subtle' : 'border-slate-200/80 bg-slate-50/80',
    extra,
  ].join(' ');
}

function successRateTone(theme: Theme, value: number): string {
  if (value >= 95) {
    return theme === 'dark'
      ? 'bg-emerald-500/14 text-emerald-200'
      : 'bg-emerald-50 text-emerald-700';
  }
  if (value >= 85) {
    return theme === 'dark'
      ? 'bg-sky-500/14 text-sky-200'
      : 'bg-sky-50 text-sky-700';
  }
  return theme === 'dark'
    ? 'bg-amber-500/14 text-amber-200'
    : 'bg-amber-50 text-amber-700';
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: UsageStatsPoint }>;
  label?: string;
  theme: Theme;
}

const TrendTooltip: React.FC<TrendTooltipProps> = ({ active, payload, label, theme }) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className={reportCardClass(theme, 'min-w-[160px] px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.12)]')}>
      <div className={`text-xs font-medium ${textMuted(theme)}`}>{label}</div>
      <div className={`mt-2 text-lg font-semibold tabular-nums ${textPrimary(theme)}`}>
        {formatNumber(point.calls)}
      </div>
      <div className={`mt-1 text-xs ${textSecondary(theme)}`}>
        活跃用户 {formatNumber(point.users)}
      </div>
    </div>
  );
};

export const UsageStatsOverview: React.FC<Props> = ({ theme, fontSize: _fontSize }) => {
  const isDark = theme === 'dark';
  const [range, setRange] = useState<RangeOption>('7d');
  const [data, setData] = useState<UsageStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await dashboardService.getUsageStats(range);
      setData(result);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载用量分析失败'));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const model = useMemo(() => (data ? buildUsageStatsOverviewModel(data) : null), [data]);

  const statCards = useMemo(() => {
    if (!model) return [] as Array<{ label: string; value: string; detail: string; icon: React.ReactNode }>;

    return [
      {
        label: '总调用',
        value: formatNumber(model.totalCalls),
        detail: `${model.rangeLabel} 汇总`,
        icon: <Activity size={16} />,
      },
      {
        label: '最近一天',
        value: formatNumber(model.latestCalls),
        detail: model.peakPoint ? `峰值 ${formatNumber(model.peakPoint.calls)}` : '暂无峰值',
        icon: <Zap size={16} />,
      },
      {
        label: '活跃用户',
        value: formatNumber(model.activeUsers),
        detail: `${model.points.length} 个统计点`,
        icon: <Users size={16} />,
      },
      {
        label: '整体成功率',
        value: formatRate(model.overallSuccessRate),
        detail: model.leadingResourceType ? `主力 ${model.leadingResourceType.label}` : '暂无资源类型',
        icon: <ShieldCheck size={16} />,
      },
    ];
  }, [model]);

  const chartStroke = isDark ? '#7dd3fc' : '#2563eb';
  const chartGrid = isDark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.2)';
  const chartAxis = isDark ? '#64748b' : '#94a3b8';
  const chartFillStart = isDark ? 'rgba(56,189,248,0.28)' : 'rgba(37,99,235,0.18)';
  const chartFillEnd = isDark ? 'rgba(56,189,248,0.01)' : 'rgba(37,99,235,0.02)';

  return (
    <div className={`flex-1 min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div
        className={`flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-5 sm:px-6 sm:pb-8 ${mainScrollCompositorClass} ${pageBlockStack}`}
      >
        {loading && !data ? (
          <PageSkeleton type="dashboard" />
        ) : loadError && !data ? (
          <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载用量分析" />
        ) : model ? (
          <>
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
            >
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300">
                  <BarChart3 size={12} />
                  管理报表
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-2xl p-3 ${isDark ? 'bg-sky-500/10 text-sky-200' : 'bg-sky-50 text-sky-700'}`}>
                      <BarChart3 size={18} />
                    </div>
                    <div>
                      <h2 className={`text-[28px] font-semibold tracking-tight ${textPrimary(theme)}`}>用量分析</h2>
                      <p className={`text-sm ${textSecondary(theme)}`}>
                        以统一网关调用为口径，聚焦趋势、结构分布与关键排行。
                      </p>
                    </div>
                  </div>
                  <p className={`max-w-3xl text-sm leading-6 ${textMuted(theme)}`}>
                    页面优先回答三个问题：调用总量在怎么变化、主要消耗集中在哪些资源类型、当前谁在贡献最多调用。
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className={subtlePanelClass(theme, 'inline-flex items-center gap-1 p-1')}>
                  {RANGE_OPTIONS.map((option) => {
                    const active = option.value === range;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRange(option.value)}
                        disabled={loading && option.value === range}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? isDark
                              ? 'bg-sky-400/15 text-sky-100'
                              : 'bg-slate-900 text-white'
                            : isDark
                              ? 'text-slate-300 hover:bg-white/[0.06]'
                              : 'text-slate-600 hover:bg-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className={`text-xs ${textMuted(theme)}`}>
                  数据口径：网关调用成功率与资源结构聚合
                  {loading && data ? <span className="ml-2">更新中…</span> : null}
                </div>
              </div>
            </motion.section>

            {loadError && data ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className={`rounded-[20px] border px-4 py-3 text-sm ${
                  isDark ? 'border-amber-400/20 bg-amber-500/8 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                当前展示的是最近一次成功加载的数据。本次刷新失败：{loadError.message}
              </motion.div>
            ) : null}

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.05 }}
              className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4"
            >
              {statCards.map((card) => (
                <div key={card.label} className={reportCardClass(theme, 'px-5 py-5')}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${textMuted(theme)}`}>
                        {card.label}
                      </div>
                      <div className={`mt-3 text-[32px] font-semibold tracking-tight tabular-nums ${textPrimary(theme)}`}>
                        {card.value}
                      </div>
                    </div>
                    <div className={`rounded-2xl p-2 ${isDark ? 'bg-white/[0.04] text-slate-200' : 'bg-slate-50 text-slate-600'}`}>
                      {card.icon}
                    </div>
                  </div>
                  <div className={`mt-4 text-xs ${textSecondary(theme)}`}>{card.detail}</div>
                </div>
              ))}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.1 }}
              className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]"
            >
              <div className={reportCardClass(theme, 'overflow-hidden px-0 py-0')}>
                <div className={`flex flex-col gap-3 border-b px-6 py-5 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'} sm:flex-row sm:items-end sm:justify-between`}>
                  <div>
                    <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>调用趋势</h3>
                    <p className={`mt-1 text-sm ${textSecondary(theme)}`}>
                      {model.rangeLabel} 内按日统计，帮助判断波峰位置与回落节奏。
                    </p>
                  </div>
                  <div className={`text-xs ${textMuted(theme)}`}>
                    峰值日 {model.peakPoint ? `${shortDate(model.peakPoint.date)} / ${formatNumber(model.peakPoint.calls)}` : '--'}
                  </div>
                </div>

                <div className="h-[320px] px-3 pb-4 pt-2 sm:px-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={model.points} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`usage-trend-fill-${theme}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartFillStart} />
                          <stop offset="100%" stopColor={chartFillEnd} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={chartGrid} vertical={false} strokeDasharray="4 4" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: chartAxis, fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: chartAxis, fontSize: 12 }}
                        width={46}
                        tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`)}
                      />
                      <Tooltip
                        cursor={{ stroke: chartStroke, strokeDasharray: '3 3', strokeOpacity: 0.35 }}
                        content={<TrendTooltip theme={theme} />}
                      />
                      <Area
                        type="monotone"
                        dataKey="calls"
                        stroke={chartStroke}
                        fill={`url(#usage-trend-fill-${theme})`}
                        strokeWidth={2.5}
                        activeDot={{ r: 4, fill: chartStroke, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <div className={reportCardClass(theme, 'px-5 py-5')}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>周期摘要</h3>
                      <p className={`mt-1 text-sm ${textSecondary(theme)}`}>面向管理阅读的关键结论。</p>
                    </div>
                    <div className={`rounded-2xl p-2 ${isDark ? 'bg-sky-400/12 text-sky-200' : 'bg-sky-50 text-sky-700'}`}>
                      <ArrowUpRight size={16} />
                    </div>
                  </div>

                  <dl className="mt-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <dt className={`text-sm ${textMuted(theme)}`}>统计周期</dt>
                      <dd className={`text-sm font-semibold ${textPrimary(theme)}`}>{model.rangeLabel}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className={`text-sm ${textMuted(theme)}`}>日均调用</dt>
                      <dd className={`text-sm font-semibold tabular-nums ${textPrimary(theme)}`}>
                        {formatNumber(model.averageDailyCalls)}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className={`text-sm ${textMuted(theme)}`}>峰值日期</dt>
                      <dd className={`text-sm font-semibold ${textPrimary(theme)}`}>
                        {model.peakPoint ? shortDate(model.peakPoint.date) : '--'}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className={`text-sm ${textMuted(theme)}`}>主力资源</dt>
                      <dd className={`text-sm font-semibold ${textPrimary(theme)}`}>
                        {model.leadingResourceType ? model.leadingResourceType.label : '--'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className={subtlePanelClass(theme, 'px-5 py-5')}>
                  <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${textMuted(theme)}`}>
                    最新一天 vs 日均
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {model.latestVsAverageDelta == null ? (
                      <div className={`text-sm font-medium ${textSecondary(theme)}`}>暂无对比数据</div>
                    ) : (
                      <>
                        <div
                          className={`inline-flex rounded-full p-2 ${
                            model.latestVsAverageDelta >= 0
                              ? isDark
                                ? 'bg-emerald-500/14 text-emerald-200'
                                : 'bg-emerald-50 text-emerald-700'
                              : isDark
                                ? 'bg-amber-500/14 text-amber-200'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {model.latestVsAverageDelta >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                        <div>
                          <div className={`text-2xl font-semibold tabular-nums ${textPrimary(theme)}`}>
                            {model.latestVsAverageDelta > 0 ? '+' : ''}
                            {model.latestVsAverageDelta.toFixed(1)}%
                          </div>
                          <div className={`mt-1 text-xs ${textSecondary(theme)}`}>
                            最近一天调用相较日均的偏移幅度
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className={`mt-5 border-t pt-5 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}>
                    <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${textMuted(theme)}`}>
                      主力资源占比
                    </div>
                    <div className="mt-3">
                      <div className={`text-lg font-semibold ${textPrimary(theme)}`}>
                        {model.leadingResourceType ? formatRate(model.leadingResourceType.share) : '--'}
                      </div>
                      <div className={`mt-1 text-sm ${textSecondary(theme)}`}>
                        {model.leadingResourceType ? `${model.leadingResourceType.label} 占总调用比重` : '暂无资源结构数据'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {model.resourceTypeBreakdown.length > 0 ? (
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.15 }}
                className={reportCardClass(theme, 'px-6 py-6')}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>资源类型结构</h3>
                    <p className={`mt-1 text-sm ${textSecondary(theme)}`}>
                      以调用量为主轴，结合成功率判断哪类资源正在主导当前时间窗口。
                    </p>
                  </div>
                  <div className={`rounded-2xl p-2 ${isDark ? 'bg-white/[0.04] text-slate-200' : 'bg-slate-50 text-slate-600'}`}>
                    <Layers3 size={16} />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {model.resourceTypeBreakdown.map((row) => (
                    <div
                      key={row.type}
                      className={`grid gap-3 rounded-[18px] border px-4 py-4 md:grid-cols-[140px_minmax(0,1fr)_110px_100px] md:items-center ${
                        isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold ${textPrimary(theme)}`}>{row.label}</div>
                        <div className={`mt-1 text-xs uppercase tracking-[0.16em] ${textMuted(theme)}`}>
                          {row.type}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className={`flex items-center justify-between text-xs ${textSecondary(theme)}`}>
                          <span>占比</span>
                          <span className="tabular-nums">{formatRate(row.share)}</span>
                        </div>
                        <div className={`h-2.5 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200/80'}`}>
                          <div
                            className={`h-full rounded-full ${isDark ? 'bg-sky-300' : 'bg-slate-900'}`}
                            style={{ width: `${Math.max(row.share, 4)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className={`text-xs ${textMuted(theme)}`}>调用量</div>
                        <div className={`mt-1 text-sm font-semibold tabular-nums ${textPrimary(theme)}`}>
                          {formatNumber(row.calls)}
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <div className={`text-xs ${textMuted(theme)}`}>成功率</div>
                        <div className="mt-1">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${successRateTone(theme, row.successRate)}`}>
                            {formatRate(row.successRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            ) : null}

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.2 }}
              className="grid grid-cols-1 gap-4 xl:grid-cols-2"
            >
              {model.ownerRows && model.ownerRows.length > 0 ? (
                <div className={reportCardClass(theme, 'overflow-hidden px-0 py-0')}>
                  <div className={`border-b px-6 py-5 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}>
                    <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>Owner 成效排行</h3>
                    <p className={`mt-1 text-sm ${textSecondary(theme)}`}>结合资源数、调用量和成功率观察贡献度。</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className={tableHeadCell(theme)}>Owner</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>资源数</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>调用</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>成功率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {model.ownerRows.slice(0, 8).map((row, index) => (
                          <tr key={`${row.ownerName}-${index}`} className={tableBodyRow(theme, index)}>
                            <td className={tableCell()}>
                              <div className={`font-medium ${textPrimary(theme)}`}>{row.ownerName || '--'}</div>
                              <div className={`mt-1 text-xs ${textMuted(theme)}`}>
                                Owner #{row.ownerUserId ?? '--'}
                              </div>
                            </td>
                            <td className={`${tableCell()} text-right tabular-nums ${textSecondary(theme)}`}>
                              {formatNumber(row.resourceCount)}
                            </td>
                            <td className={`${tableCell()} text-right tabular-nums ${textSecondary(theme)}`}>
                              {formatNumber(row.calls)}
                            </td>
                            <td className={`${tableCell()} text-right`}>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${successRateTone(theme, row.successRate)}`}>
                                {formatRate(row.successRate)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {model.topResources.length > 0 ? (
                <div className={reportCardClass(theme, 'overflow-hidden px-0 py-0')}>
                  <div className={`border-b px-6 py-5 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}>
                    <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>热门资源 TOP</h3>
                    <p className={`mt-1 text-sm ${textSecondary(theme)}`}>优先识别高调用资源，辅助判断热点集中区域。</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className={tableHeadCell(theme)}>资源</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>调用</th>
                          <th className={`${tableHeadCell(theme)} text-right`}>成功率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {model.topResources.slice(0, 8).map((row, index) => (
                          <tr key={`${row.name}-${index}`} className={tableBodyRow(theme, index)}>
                            <td className={tableCell()}>
                              <div className={`font-medium ${textPrimary(theme)}`}>{row.name || '--'}</div>
                              <div className={`mt-1 text-xs ${textMuted(theme)}`}>
                                {row.resourceType ? (RESOURCE_TYPE_LABEL[row.resourceType] ?? row.resourceType) : '--'}
                              </div>
                            </td>
                            <td className={`${tableCell()} text-right tabular-nums ${textSecondary(theme)}`}>
                              {formatNumber(row.calls)}
                            </td>
                            <td className={`${tableCell()} text-right`}>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${successRateTone(theme, row.successRate)}`}>
                                {formatRate(row.successRate)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </motion.section>

            {model.departmentRows && model.departmentRows.length > 0 ? (
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.25 }}
                className={reportCardClass(theme, 'overflow-hidden px-0 py-0')}
              >
                <div className={`border-b px-6 py-5 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}>
                  <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>部门用量分布</h3>
                  <p className={`mt-1 text-sm ${textSecondary(theme)}`}>补充观察组织侧的调用集中度与用户覆盖情况。</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className={tableHeadCell(theme)}>部门</th>
                        <th className={`${tableHeadCell(theme)} text-right`}>调用</th>
                        <th className={`${tableHeadCell(theme)} text-right`}>用户</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.departmentRows.slice(0, 10).map((row, index) => (
                        <tr key={`${row.department}-${index}`} className={tableBodyRow(theme, index)}>
                          <td className={tableCell()}>
                            <span className={`font-medium ${textPrimary(theme)}`}>{row.department || '--'}</span>
                          </td>
                          <td className={`${tableCell()} text-right tabular-nums ${textSecondary(theme)}`}>
                            {formatNumber(row.calls)}
                          </td>
                          <td className={`${tableCell()} text-right tabular-nums ${textMuted(theme)}`}>
                            {formatNumber(row.users)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};
