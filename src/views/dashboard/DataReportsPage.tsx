import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Download,
  Layers3,
  ScrollText,
  Users,
} from 'lucide-react';

import type { FontSize, Theme } from '../../types';
import { dashboardService } from '../../api/services/dashboard.service';
import type { DataReportResourceRow, DataReportsData } from '../../types/dto/dashboard';
import {
  bentoCard,
  btnSecondary,
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
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { LantuDateTimePicker } from '../../components/common/LantuDateTimePicker';
import { buildDataReportsWorkbenchModel } from './dataReportsWorkbenchModel';

type TimeRange = 'today' | '7d' | '30d' | '90d' | 'custom';

export interface DataReportsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function reportCardClass(theme: Theme, extra = ''): string {
  return `${bentoCard(theme)} ${extra}`.trim();
}

function insetPanelClass(theme: Theme, extra = ''): string {
  const isDark = theme === 'dark';
  return [
    'rounded-[22px] border',
    isDark ? 'border-white/[0.06] bg-lantu-subtle' : 'border-slate-200/80 bg-slate-50/85',
    extra,
  ].join(' ');
}

function activeRangeButtonClass(theme: Theme): string {
  return theme === 'dark' ? 'bg-sky-400/15 text-sky-100' : 'bg-slate-900 text-white';
}

function inactiveRangeButtonClass(theme: Theme): string {
  return theme === 'dark'
    ? 'text-slate-300 hover:bg-white/[0.06]'
    : 'text-slate-600 hover:bg-white';
}

function exportCsv(data: DataReportsData) {
  const rows: string[][] = [
    ['资源类型', '调用次数', '成功率'],
    ...data.callsByResourceType.map((row) => [row.type, String(row.calls), String(row.successRate)]),
    [],
    ['资源', '资源类型', '调用次数', '成功率'],
    ...data.topResources.map((row) => [row.name, row.resourceType ?? '', String(row.calls), String(row.successRate)]),
    [],
    ['请求路径', '请求数', '平均延迟(ms)'],
    ...(data.methodBreakdown ?? []).map((row) => [row.path, String(row.requests), String(row.avgLatencyMs)]),
    [],
    ['部门', '用户数', '调用次数'],
    ...data.departmentUsage.map((row) => [row.department, String(row.users), String(row.calls)]),
  ];

  const csv = `\uFEFF${rows.map((row) => row.join(',')).join('\n')}`;
  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(csv, `data-reports-${date}.csv`, 'text/csv;charset=utf-8');
}

function ResourceCollectionCard({
  theme,
  title,
  rows,
}: {
  theme: Theme;
  title: string;
  rows: DataReportResourceRow[];
}) {
  const isDark = theme === 'dark';
  const topCalls = rows[0]?.calls ?? 0;

  return (
    <div className={reportCardClass(theme, 'overflow-hidden p-0')}>
      <div className={`border-b px-5 py-4 ${isDark ? 'border-white/[0.06]' : 'border-slate-200/80'}`}>
        <h3 className={`text-sm font-semibold ${textPrimary(theme)}`}>{title}</h3>
      </div>
      <div className="space-y-3 px-5 py-4">
        {rows.slice(0, 4).map((row, index) => (
          <div key={`${title}-${row.name}-${index}`} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`truncate text-sm font-medium ${textPrimary(theme)}`}>{row.name}</div>
                <div className={`mt-1 text-xs ${textMuted(theme)}`}>成功率 {formatRate(row.successRate)}</div>
              </div>
              <div className={`shrink-0 text-sm font-semibold tabular-nums ${textPrimary(theme)}`}>
                {formatNumber(row.calls)}
              </div>
            </div>
            <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`}>
              <div
                className={`h-full rounded-full ${isDark ? 'bg-sky-400/70' : 'bg-sky-600'}`}
                style={{ width: `${topCalls > 0 ? (row.calls / topCalls) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const DataReportsPage: React.FC<DataReportsPageProps> = ({ theme, fontSize: _fontSize }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<DataReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async (range: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = range === 'custom' ? { startDate: customStart, endDate: customEnd } : undefined;
      const result = await dashboardService.getDataReports(range, params);
      setData(result);
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载经营报表失败'));
    } finally {
      setLoading(false);
    }
  }, [customStart, customEnd]);

  useEffect(() => {
    if (timeRange === 'custom') {
      if (customStart && customEnd) void fetchData('custom');
      return;
    }
    void fetchData(timeRange);
  }, [customEnd, customStart, fetchData, timeRange]);

  const model = useMemo(() => (data ? buildDataReportsWorkbenchModel(data) : null), [data]);
  const visibleCollections = useMemo(
    () => model?.collectionSections.filter((section) => section.rows.length > 0) ?? [],
    [model],
  );

  const rangeButtons: Array<{ value: TimeRange; label: string }> = [
    { value: 'today', label: '今天' },
    { value: '7d', label: '近7天' },
    { value: '30d', label: '近30天' },
    { value: '90d', label: '近90天' },
  ];

  const statCards = model
    ? [
        { label: '总调用次数', value: formatNumber(model.totalCalls), detail: `${model.rangeLabel} 聚合`, icon: <BarChart3 size={16} /> },
        { label: '加权成功率', value: formatRate(model.weightedSuccessRate), detail: model.leadingType ? `主力 ${model.leadingType.label}` : '暂无主力类型', icon: <CheckCircle2 size={16} /> },
        { label: '活跃资源类型', value: String(model.activeTypeCount), detail: model.leadingType ? `Top share ${formatRate(model.leadingType.share)}` : '暂无分布', icon: <Layers3 size={16} /> },
        { label: '活跃用户数', value: formatNumber(model.activeUsers), detail: `${model.departmentCount} 个院系分组`, icon: <Users size={16} /> },
      ]
    : [];

  return (
    <div className={`flex-1 min-h-0 overflow-hidden ${canvasBodyBg(theme)}`}>
      <div className={`flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-5 sm:px-6 sm:pb-8 ${mainScrollCompositorClass} ${pageBlockStack}`}>
        {loading && !data ? (
          <PageSkeleton type="dashboard" />
        ) : loadError && !data ? (
          <PageError error={loadError} onRetry={() => fetchData(timeRange)} retryLabel="重试加载经营报表" />
        ) : model ? (
          <>
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="flex flex-col gap-4"
            >
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? 'border-white/[0.08] bg-white/[0.04] text-slate-300' : 'border-slate-200/80 bg-white/80 text-slate-500 shadow-sm'}`}>
                  <ScrollText size={12} />
                  管理报表
                </div>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-2xl p-3 ${isDark ? 'bg-sky-500/10 text-sky-200' : 'bg-sky-50 text-sky-700'}`}>
                        <ScrollText size={18} />
                      </div>
                      <div>
                        <h2 className={`text-[28px] font-semibold tracking-tight ${textPrimary(theme)}`}>
                          {chromePageTitle || '经营报表中心'}
                        </h2>
                        <p className={`text-sm ${textSecondary(theme)}`}>
                          先筛选时间窗口，再读结构分布、热门排行和请求路径，适合做日常经营盘点。
                        </p>
                      </div>
                    </div>
                    <p className={`max-w-3xl text-sm leading-6 ${textMuted(theme)}`}>
                      这一版按“分析工作台”重排：筛选在最上方，结构图与排行榜作为主舞台，表格与导出放在下半区，读起来会更稳、更像真正的经营报表。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportCsv(data)}
                    className={`${btnSecondary(theme)} shrink-0 gap-2`}
                  >
                    <Download size={14} />
                    导出 CSV
                  </button>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.04 }}
              className={reportCardClass(theme, 'p-5')}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3">
                  <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${textMuted(theme)}`}>
                    分析筛选
                  </div>
                  <div className={insetPanelClass(theme, 'inline-flex w-fit flex-wrap items-center gap-1 p-1')}>
                    {rangeButtons.map((option) => {
                      const active = option.value === timeRange;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setTimeRange(option.value)}
                          className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${active ? activeRangeButtonClass(theme) : inactiveRangeButtonClass(theme)}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <LantuDateTimePicker
                      theme={theme}
                      mode="date"
                      value={customStart}
                      onChange={(next) => {
                        setCustomStart(next);
                        setTimeRange('custom');
                      }}
                      className="w-[168px]"
                      placeholder="开始日期"
                      ariaLabel="开始日期"
                    />
                    <span className={`text-xs ${textMuted(theme)}`}>至</span>
                    <LantuDateTimePicker
                      theme={theme}
                      mode="date"
                      value={customEnd}
                      onChange={(next) => {
                        setCustomEnd(next);
                        setTimeRange('custom');
                      }}
                      className="w-[168px]"
                      placeholder="结束日期"
                      ariaLabel="结束日期"
                    />
                  </div>
                  <div className={`text-xs ${textMuted(theme)}`}>
                    数据口径：统一网关调用日志聚合。
                    {timeRange === 'custom' && (!customStart || !customEnd) ? ' 请选择完整日期后查询。' : null}
                  </div>
                </div>
              </div>
            </motion.section>

            {loadError && data ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className={`rounded-[20px] border px-4 py-3 text-sm ${isDark ? 'border-amber-400/20 bg-amber-500/8 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
              >
                当前显示的是最近一次成功加载的数据。本次刷新失败：{loadError.message}
              </motion.div>
            ) : null}

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.08 }}
              className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4"
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
                    <div className={`rounded-2xl p-2 ${isDark ? 'bg-white/[0.05] text-slate-200' : 'bg-slate-50 text-slate-600'}`}>
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
              transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.12 }}
              className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]"
            >
              <div className={reportCardClass(theme, 'px-6 py-6')}>
                <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>资源结构分布</h3>
                    <p className={`mt-1 text-sm ${textSecondary(theme)}`}>
                      按资源类型看调用体量、占比和成功率，先判断量主要落在谁身上。
                    </p>
                  </div>
                  <div className={`text-xs ${textMuted(theme)}`}>
                    当前窗口：{model.rangeLabel}
                  </div>
                </div>

                {model.leadingType ? (
                  <div className={`mt-5 flex flex-col gap-4 rounded-[22px] border px-5 py-4 ${isDark ? 'border-sky-400/14 bg-sky-500/[0.08]' : 'border-sky-100 bg-sky-50/70'} lg:flex-row lg:items-center lg:justify-between`}>
                    <div>
                      <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDark ? 'text-sky-200' : 'text-sky-700'}`}>
                        主力资源类型
                      </div>
                      <div className={`mt-2 text-2xl font-semibold ${textPrimary(theme)}`}>
                        {model.leadingType.label}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className={textMuted(theme)}>调用</div>
                        <div className={`mt-1 font-semibold tabular-nums ${textPrimary(theme)}`}>
                          {formatNumber(model.leadingType.calls)}
                        </div>
                      </div>
                      <div>
                        <div className={textMuted(theme)}>占比</div>
                        <div className={`mt-1 font-semibold tabular-nums ${textPrimary(theme)}`}>
                          {formatRate(model.leadingType.share)}
                        </div>
                      </div>
                      <div>
                        <div className={textMuted(theme)}>成功率</div>
                        <div className={`mt-1 font-semibold tabular-nums ${textPrimary(theme)}`}>
                          {formatRate(model.leadingType.successRate)}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 space-y-4">
                  {model.structureRows.map((row) => (
                    <div key={row.type} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`text-sm font-medium ${textPrimary(theme)}`}>{row.label}</div>
                          <div className={`mt-1 text-xs ${textMuted(theme)}`}>
                            成功率 {formatRate(row.successRate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold tabular-nums ${textPrimary(theme)}`}>
                            {formatNumber(row.calls)}
                          </div>
                          <div className={`mt-1 text-xs tabular-nums ${textMuted(theme)}`}>
                            {formatRate(row.share)}
                          </div>
                        </div>
                      </div>
                      <div className={`h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`}>
                        <div
                          className={`h-full rounded-full ${isDark ? 'bg-gradient-to-r from-sky-500 to-cyan-300' : 'bg-gradient-to-r from-sky-600 to-cyan-500'}`}
                          style={{ width: `${row.share}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className={reportCardClass(theme, 'px-5 py-5')}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>工作台摘要</h3>
                      <p className={`mt-1 text-sm ${textSecondary(theme)}`}>
                        给管理阅读的三条关键信号。
                      </p>
                    </div>
                    <div className={`rounded-2xl p-2 ${isDark ? 'bg-sky-400/12 text-sky-200' : 'bg-sky-50 text-sky-700'}`}>
                      <ArrowUpRight size={16} />
                    </div>
                  </div>

                  <dl className="mt-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <dt className={`text-sm ${textMuted(theme)}`}>统计窗口</dt>
                      <dd className={`text-sm font-semibold ${textPrimary(theme)}`}>{model.rangeLabel}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className={`text-sm ${textMuted(theme)}`}>主力类型</dt>
                      <dd className={`text-sm font-semibold ${textPrimary(theme)}`}>
                        {model.leadingType ? model.leadingType.label : '--'}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className={`text-sm ${textMuted(theme)}`}>主通路</dt>
                      <dd className={`text-sm font-semibold ${textPrimary(theme)}`}>
                        {model.methodRows[0]?.path ?? '--'}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className={`text-sm ${textMuted(theme)}`}>Top 资源数</dt>
                      <dd className={`text-sm font-semibold ${textPrimary(theme)}`}>
                        {model.topLeaderboard.length}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className={reportCardClass(theme, 'px-5 py-5')}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>热门资源排行</h3>
                      <p className={`mt-1 text-sm ${textSecondary(theme)}`}>
                        先看全类型前六名，再决定往下钻哪一类。
                      </p>
                    </div>
                    <div className={`text-xs ${textMuted(theme)}`}>Top {model.topLeaderboard.length}</div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {model.topLeaderboard.map((row) => (
                      <div key={`${row.rank}-${row.name}`} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${row.rank === 1 ? 'bg-amber-100 text-amber-700' : row.rank === 2 ? 'bg-slate-200 text-slate-700' : row.rank === 3 ? 'bg-orange-100 text-orange-700' : isDark ? 'bg-white/[0.08] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                            {row.rank}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-sm font-medium ${textPrimary(theme)}`}>{row.name}</div>
                            <div className={`mt-1 text-xs ${textMuted(theme)}`}>
                              {row.label} · 成功率 {formatRate(row.successRate)}
                            </div>
                          </div>
                          <div className={`shrink-0 text-sm font-semibold tabular-nums ${textPrimary(theme)}`}>
                            {formatNumber(row.calls)}
                          </div>
                        </div>
                        <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`}>
                          <div
                            className={`h-full rounded-full ${isDark ? 'bg-sky-400/70' : 'bg-sky-600'}`}
                            style={{ width: `${row.width}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.16 }}
              className={reportCardClass(theme, 'overflow-hidden p-0')}
            >
              <div className={`flex flex-col gap-3 border-b px-6 py-5 sm:flex-row sm:items-end sm:justify-between ${isDark ? 'border-white/[0.06]' : 'border-slate-200/80'}`}>
                <div>
                  <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>请求路径工作区</h3>
                  <p className={`mt-1 text-sm ${textSecondary(theme)}`}>
                    看请求量和平均延迟，先识别主通路，再判断是否要去性能分析里深挖。
                  </p>
                </div>
                <div className={`text-xs ${textMuted(theme)}`}>
                  主通路占比 {formatRate(model.methodRows[0]?.requestShare ?? 0)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className={tableHeadCell(theme)}>路径</th>
                      <th className={`${tableHeadCell(theme)} text-right`}>请求数</th>
                      <th className={`${tableHeadCell(theme)} text-right`}>占比</th>
                      <th className={`${tableHeadCell(theme)} text-right`}>平均延迟(ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.methodRows.map((row, index) => (
                      <tr key={row.path} className={tableBodyRow(theme, index)}>
                        <td className={tableCell()}>
                          <span className={`font-mono text-xs ${textPrimary(theme)}`}>{row.path}</span>
                        </td>
                        <td className={`${tableCell()} text-right tabular-nums ${textPrimary(theme)}`}>
                          {formatNumber(row.requests)}
                        </td>
                        <td className={`${tableCell()} text-right tabular-nums ${textSecondary(theme)}`}>
                          {formatRate(row.requestShare)}
                        </td>
                        <td className={`${tableCell()} text-right tabular-nums ${textMuted(theme)}`}>
                          {row.avgLatencyMs.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.2 }}
              className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
            >
              <div className={reportCardClass(theme, 'overflow-hidden p-0')}>
                <div className={`border-b px-6 py-5 ${isDark ? 'border-white/[0.06]' : 'border-slate-200/80'}`}>
                  <h3 className={`text-base font-semibold ${textPrimary(theme)}`}>部门用量分布</h3>
                  <p className={`mt-1 text-sm ${textSecondary(theme)}`}>
                    帮你判断调用是否过度集中在少数团队。
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className={tableHeadCell(theme)}>部门</th>
                        <th className={`${tableHeadCell(theme)} text-right`}>用户</th>
                        <th className={`${tableHeadCell(theme)} text-right`}>调用</th>
                        <th className={`${tableHeadCell(theme)} text-right`}>占比</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.departmentRows.map((row, index) => (
                        <tr key={row.department} className={tableBodyRow(theme, index)}>
                          <td className={`${tableCell()} ${textPrimary(theme)}`}>{row.department}</td>
                          <td className={`${tableCell()} text-right tabular-nums ${textSecondary(theme)}`}>
                            {formatNumber(row.users)}
                          </td>
                          <td className={`${tableCell()} text-right tabular-nums ${textPrimary(theme)}`}>
                            {formatNumber(row.calls)}
                          </td>
                          <td className={tableCell()}>
                            <div className="flex items-center justify-end gap-2">
                              <div className={`h-1.5 w-16 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`}>
                                <div
                                  className={`h-full rounded-full ${isDark ? 'bg-sky-400/70' : 'bg-sky-600'}`}
                                  style={{ width: `${row.share}%` }}
                                />
                              </div>
                              <span className={`w-12 text-right text-xs tabular-nums ${textMuted(theme)}`}>
                                {formatRate(row.share)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {visibleCollections.map((section) => (
                  <ResourceCollectionCard
                    key={section.key}
                    theme={theme}
                    title={section.title}
                    rows={section.rows}
                  />
                ))}
                <div className={reportCardClass(theme, 'flex flex-col justify-between p-5 md:col-span-2')}>
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${textMuted(theme)}`}>
                      导出与复盘
                    </div>
                    <h3 className={`mt-3 text-base font-semibold ${textPrimary(theme)}`}>把当前筛选窗口沉淀成经营快照</h3>
                    <p className={`mt-2 max-w-2xl text-sm leading-6 ${textSecondary(theme)}`}>
                      先在上方切换时间窗口或自定义日期，再导出 CSV。这样你拿到的就是已经过筛选的结构分布、热门资源、请求路径和部门用量，不需要二次整理。
                    </p>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className={`text-xs ${textMuted(theme)}`}>
                      当前窗口：{model.rangeLabel}
                    </div>
                    <button
                      type="button"
                      onClick={() => exportCsv(data)}
                      className={`${btnSecondary(theme)} gap-2`}
                    >
                      <Download size={14} />
                      导出当前结果
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          </>
        ) : null}
      </div>
    </div>
  );
};
