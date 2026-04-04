import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Zap, RefreshCw, TrendingUp, Database, Download, AlertCircle, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { EChartsOption } from 'echarts';
import { Theme, FontSize } from '../../types';
import { useUserRole } from '../../context/UserRoleContext';
import { developerStatsService } from '../../api/services/developer-stats.service';
import type { OwnerDeveloperStatsVO } from '../../types/dto/dashboard';
import type { DeveloperStatistics } from '../../types/dto/explore';
import { bentoCard, textMuted } from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EChartCard } from '../../components/charts/EChartCard';
import { baseGrid, baseLegend, baseTooltip, chartColors } from '../../components/charts/echartsTheme';
import { RESOURCE_TYPE_LABEL_ZH, parseResourceType } from '../../constants/resourceTypes';

interface Props { theme: Theme; fontSize: FontSize; }

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

const PERIOD_OPTIONS = [7, 14, 30, 90] as const;

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
        text: '按资源类型（网关调用，来自 call_log）',
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

  const statsToolbar =
    !loading && !error && data ? (
      <div className="flex flex-col gap-3 w-full lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className={`flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end ${cardSurface} p-4 flex-1 min-w-0`}>
          <label className={`flex flex-col gap-1 text-xs font-medium ${tm}`}>
            统计周期（天）
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className={`mt-0.5 rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-white/10 bg-neutral-900 text-neutral-100' : 'border-slate-200 bg-white text-slate-900'}`}
              aria-label="选择统计周期天数"
            >
              {PERIOD_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  近 {d} 天
                </option>
              ))}
            </select>
          </label>
          {canQueryOtherOwner ? (
            <div className={`flex flex-col gap-1 text-xs font-medium ${tm} lg:min-w-[200px]`}>
              <span>查看指定 Owner（用户 ID）</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="留空表示当前登录用户"
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
                <span className="font-normal opacity-80">审核员可全平台查询任意 Owner（与后端一致）。</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={fetchData}
          className={`shrink-0 self-end p-2 rounded-lg transition-colors motion-reduce:transition-none ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`}
          aria-label="刷新统计数据"
        >
          <RefreshCw size={16} className={tm} aria-hidden />
        </button>
      </div>
    ) : undefined;

  const desc =
    data && periodHint
      ? `Owner 资源成效 + 个人调用概览 · ${periodHint} · Owner 用户 ID ${data.ownerUserId}`
      : 'Owner 维度网关调用、用量记录与技能包下载；下方含 GET /developer/my-statistics 个人调用摘要（口径不同）';

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
    return (
      <div className="w-full space-y-5">
        <div
          className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-sky-500/25 bg-sky-500/5 text-sky-100/90' : 'border-sky-200 bg-sky-50 text-sky-950'}`}
        >
          <div className="flex gap-2">
            <AlertCircle size={18} className="shrink-0 opacity-90" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">个人调用概览（GET /developer/my-statistics）</p>
              <p className={`text-xs ${isDark ? 'text-sky-200/85' : 'text-sky-900/80'}`}>
                按当前登录用户在 <span className="font-mono">t_call_log.user_id</span> 聚合，含今日调用、错误率、近 7 日趋势、Top 资源与活跃 API Key；与下方 Owner 成效（资源归属、可选周期）指标<strong>不可逐项相加对比</strong>。
              </p>
            </div>
          </div>
        </div>

        {myOverview ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '个人总调用（call_log）', value: formatNum(myOverview.totalCalls) },
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
                <div className={`text-lg font-bold ${isDark ? 'text-neutral-100' : 'text-neutral-800'}`}>{kpi.value}</div>
                <div className={`text-xs font-medium mt-1 ${tm}`}>{kpi.label}</div>
              </motion.div>
            ))}
          </div>
        ) : null}

        {myOverview && (myOverview.topResources.length > 0 || myOverview.apiKeyUsage.length > 0) ? (
          <div className={`grid gap-3 md:grid-cols-2 ${cardSurface} p-4`}>
            {myOverview.topResources.length > 0 ? (
              <div>
                <div className={`text-xs font-semibold mb-2 ${tm}`}>Top 资源（call_log）</div>
                <ul className={`space-y-1 text-xs ${isDark ? 'text-neutral-200' : 'text-neutral-700'}`}>
                  {myOverview.topResources.slice(0, 5).map((r, idx) => (
                    <li key={`${r.name}-${idx}`} className="flex justify-between gap-2">
                      <span className="truncate" title={r.name}>{r.name}</span>
                      <span className="tabular-nums shrink-0">{formatNum(r.calls)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {myOverview.apiKeyUsage.length > 0 ? (
              <div>
                <div className={`text-xs font-semibold mb-2 ${tm}`}>API Key 使用</div>
                <ul className={`space-y-1 text-xs ${isDark ? 'text-neutral-200' : 'text-neutral-700'}`}>
                  {myOverview.apiKeyUsage.slice(0, 5).map((k, idx) => (
                    <li key={`${k.keyPrefix}-${idx}`} className="flex justify-between gap-2">
                      <span className="truncate font-mono" title={k.keyPrefix}>{k.keyPrefix}</span>
                      <span className="tabular-nums shrink-0">{formatNum(k.calls)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-500/25 bg-amber-500/5 text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950'}`}
        >
          <div className="flex gap-2">
            <AlertCircle size={18} className="shrink-0 opacity-90" aria-hidden />
            <p>
              <strong>Owner 资源成效</strong>：网关调用量来自归属到你名下资源的 invoke 类 call_log，不等同于门户全量使用；技能包下载为独立计数。「用量记录 invoke」来自 usage_record，便于与网关口径核对。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: '网关调用（总计）', value: formatNum(data.gatewayInvokeTotal), icon: Zap, color: isDark ? 'text-neutral-100' : 'text-neutral-800' },
            { label: '网关成功', value: formatNum(data.gatewayInvokeSuccess), icon: TrendingUp, color: 'text-blue-500' },
            { label: '网关非成功（估算）', value: formatNum(gatewayFail), icon: Zap, color: 'text-rose-500' },
            { label: '用量记录 invoke', value: formatNum(data.usageRecordInvokeTotal), icon: Database, color: 'text-emerald-500' },
            { label: '技能包下载', value: formatNum(data.skillPackDownloadTotal), icon: Download, color: 'text-amber-500' },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.03 }}
              className={`${cardSurface} p-5`}
            >
              <kpi.icon size={18} className={`${tm} mb-3`} />
              <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
              <div className={`text-xs font-medium mt-1 ${tm}`}>{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.12 }}>
          {data.gatewayInvokesByResourceType.length > 0 ? (
            <EChartCard theme={theme} option={byTypeOption} minHeight={Math.max(280, 48 + data.gatewayInvokesByResourceType.length * 36)} aria-label="按资源类型网关调用图" />
          ) : (
            <div className={`${cardSurface} p-10 text-center text-sm ${tm}`}>本周期暂无按类型的网关调用数据</div>
          )}
        </motion.div>
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
