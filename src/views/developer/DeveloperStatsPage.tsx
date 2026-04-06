import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Zap, RefreshCw, TrendingUp, Database, Download, BarChart3, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';
import type { EChartsOption } from 'echarts';
import { Theme, FontSize } from '../../types';
import { useUserRole } from '../../context/UserRoleContext';
import { developerStatsService } from '../../api/services/developer-stats.service';
import type { OwnerDeveloperStatsVO } from '../../types/dto/dashboard';
import type { DeveloperStatistics } from '../../types/dto/explore';
import { bentoCard, kpiGridGap, pageBlockStack, textMuted } from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EChartCard } from '../../components/charts/EChartCard';
import { LantuSelect } from '../../components/common/LantuSelect';
import { baseGrid, baseLegend, baseTooltip, chartColors } from '../../components/charts/echartsTheme';
import { RESOURCE_TYPE_LABEL_ZH, parseResourceType } from '../../constants/resourceTypes';

interface Props { theme: Theme; fontSize: FontSize; }

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

const PERIOD_OPTIONS = [7, 14, 30, 90] as const;

type StatsPerspective = 'owner' | 'personal';

function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function labelResourceType(resourceType: string): string {
  const t = parseResourceType(resourceType);
  return (t && RESOURCE_TYPE_LABEL_ZH[t]) || resourceType;
}

export const DeveloperStatsPage: React.FC<Props> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const { platformRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OwnerDeveloperStatsVO | null>(null);
  const [myOverview, setMyOverview] = useState<DeveloperStatistics | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(7);
  const [ownerDraft, setOwnerDraft] = useState('');
  const [ownerUserId, setOwnerUserId] = useState<number | undefined>(undefined);
  const [perspective, setPerspective] = useState<StatsPerspective>('owner');

  const canQueryOtherOwner = platformRole === 'platform_admin' || platformRole === 'reviewer';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [ownerSettled, mySettled] = await Promise.allSettled([
      developerStatsService.getOwnerResourceStats({
        periodDays,
        ownerUserId,
      }),
      developerStatsService.getMyStatistics(),
    ]);

    if (mySettled.status === 'fulfilled') {
      setMyOverview(mySettled.value);
    } else {
      setMyOverview(null);
    }

    if (ownerSettled.status === 'fulfilled') {
      setData(ownerSettled.value);
      setError(null);
    } else {
      setData(null);
      const e = ownerSettled.reason;
      setError(e instanceof Error ? e : new Error('统计数据加载失败'));
    }
    setLoading(false);
  }, [periodDays, ownerUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyOwnerFilter = () => {
    const s = ownerDraft.trim();
    if (!s) {
      setOwnerUserId(undefined);
      return;
    }
    const id = Number(s);
    if (!Number.isInteger(id) || id <= 0) return;
    setOwnerUserId(id);
  };

  const tm = textMuted(theme);
  const cardSurface = bentoCard(theme);
  const c = chartColors(theme);

  const gatewayFail = useMemo(() => {
    if (!data) return 0;
    return Math.max(0, data.gatewayInvokeTotal - data.gatewayInvokeSuccess);
  }, [data]);

  const byTypeOption = useMemo((): EChartsOption => {
    const list = [...(data?.gatewayInvokesByResourceType ?? [])].sort((a, b) => b.invokeCount - a.invokeCount);
    const labels = list.map((x) => labelResourceType(x.resourceType));
    const success = list.map((x) => x.successCount);
    const rest = list.map((x) => Math.max(0, x.invokeCount - x.successCount));
    const axisLine = { lineStyle: { color: c.border } };
    const axisLabel = { color: c.muted, fontSize: 11 };
    return {
      title: {
        text: '各资源类型 · 网关调用量分布',
        left: 10,
        top: 6,
        textStyle: { fontSize: 13, fontWeight: 600, color: c.text },
      },
      grid: { ...baseGrid(), left: '14%', right: '8%', bottom: '4%' },
      color: [c.series[1], c.series[3]],
      tooltip: { ...baseTooltip(theme), axisPointer: { type: 'shadow' } },
      legend: { ...baseLegend(theme), data: ['成功', '失败/未计成功'] },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel,
        splitLine: { lineStyle: { color: c.border, type: 'dashed' as const } },
      },
      yAxis: {
        type: 'category',
        data: labels,
        inverse: true,
        axisLine,
        axisTick: { show: false },
        axisLabel,
        splitLine: { show: false },
      },
      series: [
        {
          name: '成功',
          type: 'bar',
          stack: 'total',
          data: success,
          barMaxWidth: 18,
          itemStyle: { borderRadius: [0, 0, 0, 0] },
          emphasis: { focus: 'series' },
        },
        {
          name: '失败/未计成功',
          type: 'bar',
          stack: 'total',
          data: rest,
          barMaxWidth: 18,
          itemStyle: { borderRadius: [0, 6, 6, 0] },
          emphasis: { focus: 'series' },
        },
      ],
    };
  }, [c.border, c.muted, c.series, c.text, data?.gatewayInvokesByResourceType, theme]);

  const periodHint =
    data?.periodStart && data?.periodEnd
      ? `${data.periodStart.slice(0, 10)} — ${data.periodEnd.slice(0, 10)}`
      : data ? `近 ${data.periodDays} 天` : '';

  const tabBtn = (active: boolean) =>
    [
      'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors motion-reduce:transition-none sm:flex-initial sm:px-4',
      active
        ? isDark
          ? 'bg-white/[0.12] text-white shadow-sm'
          : 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90'
        : isDark
          ? 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
          : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900',
    ].join(' ');

  const statsToolbar =
    !loading && !error && data ? (
      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div
            className={`inline-flex w-full max-w-xl gap-1 rounded-2xl border p-1 ${isDark ? 'border-white/[0.08] bg-black/25' : 'border-slate-200/90 bg-slate-100/80'}`}
            role="tablist"
            aria-label="统计视角"
          >
            <button
              type="button"
              role="tab"
              aria-selected={perspective === 'owner'}
              id="devstats-tab-owner"
              className={tabBtn(perspective === 'owner')}
              onClick={() => setPerspective('owner')}
            >
              <Users size={16} aria-hidden />
              资源被调用
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={perspective === 'personal'}
              id="devstats-tab-personal"
              className={tabBtn(perspective === 'personal')}
              onClick={() => setPerspective('personal')}
            >
              <User size={16} aria-hidden />
              我的调用
            </button>
          </div>

          {perspective === 'owner' ? (
            <div className={`flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end ${cardSurface} p-4`}>
              <label className={`flex min-w-[11rem] flex-col gap-1 text-xs font-medium ${tm}`}>
                统计周期
                <span className="mt-0.5">
                  <LantuSelect
                    theme={theme}
                    value={String(periodDays)}
                    onChange={(v) => setPeriodDays(Number(v))}
                    options={PERIOD_OPTIONS.map((d) => ({
                      value: String(d),
                      label: `近 ${d} 天`,
                    }))}
                    chevronSize={15}
                  />
                </span>
              </label>
              {canQueryOtherOwner ? (
                <div className={`flex flex-col gap-1 text-xs font-medium ${tm} lg:min-w-[200px]`}>
                  <span>查看指定资源归属用户（ID）</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="留空 = 当前登录用户"
                      value={ownerDraft}
                      onChange={(e) => setOwnerDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyOwnerFilter()}
                      className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-white/10 bg-neutral-900 text-neutral-100 placeholder:text-neutral-500' : 'border-slate-200 bg-white text-slate-900'}`}
                      aria-label="指定 Owner 用户 ID"
                    />
                    <button
                      type="button"
                      onClick={applyOwnerFilter}
                      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      应用
                    </button>
                  </div>
                  {platformRole === 'reviewer' ? (
                    <span className="font-normal opacity-80">审核员可查询任意归属用户（与后台权限一致）</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={fetchData}
          className={`shrink-0 self-start p-2.5 rounded-xl border transition-colors motion-reduce:transition-none ${isDark ? 'border-white/10 hover:bg-white/[0.06]' : 'border-slate-200 hover:bg-slate-50'}`}
          aria-label="刷新统计数据"
        >
          <RefreshCw size={16} className={tm} aria-hidden />
        </button>
      </div>
    ) : undefined;

  const desc = useMemo(() => {
    if (loading || error || !data) {
      return '在两种视角间切换：① 你发布的资源被谁调用了多少；② 你自己发起了多少次调用。二者不可相加对比。';
    }
    const hint =
      data.periodStart && data.periodEnd
        ? `${data.periodStart.slice(0, 10)} — ${data.periodEnd.slice(0, 10)}`
        : `近 ${data.periodDays} 天`;
    if (perspective === 'owner') {
      return `当前：资源被调用 · ${hint} · 归属用户 ${data.ownerUserId}（含所有调用方）`;
    }
    return '当前：我的调用 · 仅本人发起（与他人是否访问你的资源无关）';
  }, [data, error, loading, perspective]);

  const body = (() => {
    if (loading) {
      return <PageSkeleton type="cards" />;
    }
    if (error) {
      return <PageError error={error} onRetry={fetchData} />;
    }
    if (!data) {
      return null;
    }
    const detailCls = `mt-2 rounded-lg border px-3 py-2 text-xs ${isDark ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-slate-50/90'}`;

    return (
      <div className={`w-full ${pageBlockStack}`}>
        <div
          role="tabpanel"
          id="devstats-panel"
          aria-labelledby={perspective === 'owner' ? 'devstats-tab-owner' : 'devstats-tab-personal'}
          className="space-y-5"
        >
          {perspective === 'owner' ? (
            <>
              <div
                className={`rounded-xl border px-4 py-3 sm:px-5 sm:py-4 ${isDark ? 'border-emerald-500/20 bg-emerald-500/[0.07]' : 'border-emerald-200/80 bg-emerald-50/70'}`}
              >
                <h2 className={`text-sm font-bold ${isDark ? 'text-emerald-100' : 'text-emerald-950'}`}>你的资源被调用了多少次</h2>
                <p className={`mt-1.5 text-xs leading-relaxed sm:text-[13px] ${isDark ? 'text-emerald-100/85' : 'text-emerald-950/85'}`}>
                  按资源<strong>归属用户</strong>汇总，<strong className="font-semibold">包含任何调用方</strong>（不限于你自己）。周期与归属用户可在上方工具栏调整。
                </p>
                <details className={detailCls}>
                  <summary className={`cursor-pointer font-medium ${tm}`}>技术说明（可选展开）</summary>
                  <p className={`mt-2 leading-relaxed ${tm}`}>
                    数据来自 <span className="font-mono">GET /dashboard/owner-resource-stats</span>：以 <span className="font-mono">t_resource.created_by</span> 关联{' '}
                    <span className="font-mono">t_call_log</span>（网关 invoke）。「用量记录 invoke」来自 <span className="font-mono">t_usage_record</span>，便于与网关日志核对；技能包下载单独统计。
                  </p>
                </details>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {[
                  { label: '网关调用（总计）', value: formatNum(data.gatewayInvokeTotal), icon: Zap, color: isDark ? 'text-neutral-100' : 'text-neutral-800' },
                  { label: '网关成功', value: formatNum(data.gatewayInvokeSuccess), icon: TrendingUp, color: 'text-blue-500' },
                  { label: '未成功（估算）', value: formatNum(gatewayFail), icon: Zap, color: 'text-rose-500' },
                  { label: '用量记录 invoke', value: formatNum(data.usageRecordInvokeTotal), icon: Database, color: 'text-emerald-500' },
                  { label: '技能包下载', value: formatNum(data.skillPackDownloadTotal), icon: Download, color: 'text-amber-500' },
                ].map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: i * 0.03 }}
                    className={`${cardSurface} p-4 sm:p-5`}
                  >
                    <kpi.icon size={17} className={`${tm} mb-2`} aria-hidden />
                    <div className={`text-xl font-black tabular-nums sm:text-2xl ${kpi.color}`}>{kpi.value}</div>
                    <div className={`mt-1 text-[11px] font-medium leading-snug sm:text-xs ${tm}`}>{kpi.label}</div>
                  </motion.div>
                ))}
              </div>

              <p className={`text-center text-[11px] ${tm}`}>
                统计区间：{periodHint || `近 ${data.periodDays} 天`}
              </p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.08 }}>
                {data.gatewayInvokesByResourceType.length > 0 ? (
                  <EChartCard
                    theme={theme}
                    option={byTypeOption}
                    minHeight={Math.max(280, 48 + data.gatewayInvokesByResourceType.length * 36)}
                    aria-label="按资源类型网关调用图"
                  />
                ) : (
                  <div className={`${cardSurface} p-10 text-center text-sm ${tm}`}>本周期暂无按资源类型的网关调用数据</div>
                )}
              </motion.div>
            </>
          ) : (
            <>
              <div
                className={`rounded-xl border px-4 py-3 sm:px-5 sm:py-4 ${isDark ? 'border-violet-500/25 bg-violet-500/[0.07]' : 'border-violet-200/80 bg-violet-50/70'}`}
              >
                <h2 className={`text-sm font-bold ${isDark ? 'text-violet-100' : 'text-violet-950'}`}>你本人发起了多少次调用</h2>
                <p className={`mt-1.5 text-xs leading-relaxed sm:text-[13px] ${isDark ? 'text-violet-100/85' : 'text-violet-950/85'}`}>
                  只统计当前账号作为<strong>调用方</strong>产生的网关日志，<strong className="font-semibold">不包含</strong>别人访问你资源时的次数。趋势图为<strong>固定近 7 天</strong>（与上方资源视角的可选周期无关）。
                </p>
                <details className={detailCls}>
                  <summary className={`cursor-pointer font-medium ${tm}`}>技术说明（可选展开）</summary>
                  <p className={`mt-2 leading-relaxed ${tm}`}>
                    数据来自 <span className="font-mono">GET /developer/my-statistics</span>，按 <span className="font-mono">t_call_log.user_id</span> 聚合；API Key 列表来自当前用户名下活跃 Key 的计数字段。
                  </p>
                </details>
              </div>

              {myOverview ? (
                <>
                  <div className={`grid grid-cols-2 sm:grid-cols-4 ${kpiGridGap}`}>
                    {[
                      { label: '总调用次数', value: formatNum(myOverview.totalCalls) },
                      { label: '今日调用', value: formatNum(myOverview.todayCalls) },
                      { label: '错误率', value: `${Number(myOverview.errorRate ?? 0).toFixed(2)}%` },
                      { label: '平均延迟', value: `${Number(myOverview.avgLatencyMs ?? 0).toFixed(0)} ms` },
                    ].map((kpi, i) => (
                      <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, delay: i * 0.02 }}
                        className={`${cardSurface} p-4`}
                      >
                        <div className={`text-lg font-bold tabular-nums ${isDark ? 'text-neutral-100' : 'text-neutral-800'}`}>{kpi.value}</div>
                        <div className={`mt-1 text-xs font-medium ${tm}`}>{kpi.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  {myOverview.topResources.length > 0 || myOverview.apiKeyUsage.length > 0 ? (
                    <div className={`grid gap-4 md:grid-cols-2 ${cardSurface} p-5 sm:p-6`}>
                      {myOverview.topResources.length > 0 ? (
                        <div>
                          <div className={`mb-2 text-xs font-semibold ${tm}`}>我常调用的资源</div>
                          <ul className={`space-y-2 text-xs ${isDark ? 'text-neutral-200' : 'text-neutral-700'}`}>
                            {myOverview.topResources.slice(0, 8).map((r, idx) => (
                              <li key={`${r.name}-${idx}`} className="flex items-baseline justify-between gap-3 border-b border-dashed border-black/[0.06] pb-2 last:border-0 last:pb-0 dark:border-white/[0.08]">
                                <span className="min-w-0 flex-1 truncate font-medium" title={r.name}>
                                  {r.name}
                                </span>
                                <span className="tabular-nums text-[11px] font-semibold opacity-90">{formatNum(r.calls)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {myOverview.apiKeyUsage.length > 0 ? (
                        <div>
                          <div className={`mb-2 text-xs font-semibold ${tm}`}>名下 API Key 累计次数</div>
                          <ul className={`space-y-2 text-xs ${isDark ? 'text-neutral-200' : 'text-neutral-700'}`}>
                            {myOverview.apiKeyUsage.slice(0, 8).map((k, idx) => (
                              <li key={`${k.keyPrefix}-${idx}`} className="flex items-baseline justify-between gap-3 border-b border-dashed border-black/[0.06] pb-2 last:border-0 last:pb-0 dark:border-white/[0.08]">
                                <span className="min-w-0 flex-1 truncate font-mono text-[11px]" title={k.keyPrefix}>
                                  {k.keyPrefix}
                                </span>
                                <span className="tabular-nums font-semibold opacity-90">{formatNum(k.calls)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={`${cardSurface} p-8 text-center text-sm ${tm}`}>暂无 Top 资源或 Key 使用明细</div>
                  )}
                </>
              ) : (
                <div className={`${cardSurface} p-8 text-center text-sm ${tm}`}>个人概览暂不可用，请稍后重试刷新</div>
              )}
            </>
          )}
        </div>
      </div>
    );
  })();

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={BarChart3}
      breadcrumbSegments={['开发者中心', '开发者统计']}
      description={desc}
      toolbar={statsToolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8">{body}</div>
    </MgmtPageShell>
  );
};
