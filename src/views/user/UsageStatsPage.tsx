import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Zap, Coins, Bot, Star, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { userActivityService } from '../../api/services/user-activity.service';
import type { UserUsageStats } from '../../types/dto/user-activity';
import { KpiCard } from '../../components/common/KpiCard';
import { BentoCard } from '../../components/common/BentoCard';
import { PageError } from '../../components/common/PageError';
import {
  canvasBodyBg, textPrimary, textSecondary, textMuted,
  tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

interface UsageStatsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

export const UsageStatsPage: React.FC<UsageStatsPageProps> = ({ theme }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<UserUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const data = await userActivityService.getUsageStats();
      const isAllZero =
        Number(data.todayCalls ?? 0) === 0
        && Number(data.weekCalls ?? 0) === 0
        && Number(data.monthCalls ?? 0) === 0
        && Number(data.totalCalls ?? 0) === 0
        && Number(data.tokensUsed ?? 0) === 0
        && (data.recentDays?.length ?? 0) === 0;

      if (!isAllZero) {
        setStats(data);
        return;
      }

      // 回退：当后端统计聚合未刷新时，使用记录明细做前端实时聚合，避免页面长期全 0。
      const usage = await userActivityService.getUsageRecords({ page: 1, pageSize: 200, range: '30d' });
      const rows = usage.list ?? [];
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);

      let todayCalls = 0;
      let weekCalls = 0;
      let monthCalls = 0;
      let tokensUsed = 0;
      const byDay = new Map<string, number>();

      rows.forEach((r) => {
        const t = String(r.createTime ?? '');
        const d = t.length >= 10 ? t.slice(0, 10) : '';
        const ts = d ? new Date(`${d}T00:00:00`) : null;
        if (d) byDay.set(d, (byDay.get(d) ?? 0) + 1);
        if (d === todayKey) todayCalls += 1;
        if (ts && ts >= weekAgo) weekCalls += 1;
        if (ts && ts >= monthAgo) monthCalls += 1;
        tokensUsed += Number(r.tokenCost ?? 0) || 0;
      });

      setStats({
        ...data,
        todayCalls,
        weekCalls,
        monthCalls,
        totalCalls: rows.length,
        tokensUsed,
        recentDays: Array.from(byDay.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-14)
          .map(([date, calls]) => ({ date, calls })),
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载用量统计失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${canvasBodyBg(theme)}`}>
        <Loader2 size={32} className="animate-spin text-slate-400" />
        <p className={`mt-3 text-sm ${textMuted(theme)}`}>加载统计数据…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}>
        <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载用量统计" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${canvasBodyBg(theme)}`}>
        <p className={`text-sm ${textMuted(theme)}`}>暂无统计数据</p>
      </div>
    );
  }

  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const monthCalls = n(stats.monthCalls);
  const weekCalls = n(stats.weekCalls);
  const todayCalls = n(stats.todayCalls);
  const totalCalls = n(stats.totalCalls);
  const tokensUsed = n(stats.tokensUsed);
  const favoriteCount = n(stats.favoriteCount);

  const kpiData: Array<{ label: string; value: string; icon: React.ReactNode; glow: 'indigo' | 'emerald' | 'amber' | 'rose' }> = [
    { label: '本月调用次数', value: monthCalls.toLocaleString(), icon: <Zap size={16} />, glow: 'indigo' },
    { label: 'Token 消耗', value: tokensUsed >= 1000 ? `${(tokensUsed / 1000).toFixed(1)}K` : String(tokensUsed), icon: <Coins size={16} />, glow: 'amber' },
    { label: '本周调用', value: weekCalls.toLocaleString(), icon: <Bot size={16} />, glow: 'emerald' },
    { label: '收藏数', value: String(favoriteCount), icon: <Star size={16} />, glow: 'rose' },
  ];

  const dailyBars = (stats.recentDays ?? []).map((b) => ({
    date: String(b?.date ?? ''),
    calls: n(b?.calls),
  }));
  const maxBar = Math.max(...dailyBars.map((b) => b.calls), 1);

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex min-w-0 items-center gap-3">
          <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
            <BarChart3 size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
          </div>
          <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '用量统计'} tagline="个人使用数据概览与趋势分析" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiData.map((kpi, i) => (
            <KpiCard key={kpi.label} theme={theme} label={kpi.label} value={kpi.value} icon={kpi.icon} glow={kpi.glow} delay={i * 0.06} />
          ))}
        </div>

        {/* Trend chart */}
        {dailyBars.length > 0 && (
          <BentoCard theme={theme}>
            <h3 className={`text-sm font-bold mb-4 ${textPrimary(theme)}`}>调用趋势（近期）</h3>
            <div className="flex items-end gap-2 h-48">
              {dailyBars.map((bar, i) => {
                const pct = maxBar > 0 ? (bar.calls / maxBar) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className={`text-xs font-medium tabular-nums ${textMuted(theme)}`}>{bar.calls}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(pct, 4)}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-neutral-800 to-neutral-600"
                    />
                    <span className={`text-xs ${textMuted(theme)}`}>{bar.date.length > 5 ? bar.date.slice(5) : bar.date || '—'}</span>
                  </div>
                );
              })}
            </div>
          </BentoCard>
        )}

        {/* Summary table */}
        <BentoCard theme={theme} padding="sm">
          <div className="px-4 pt-4 pb-2">
            <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>调用汇总</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={tableHeadCell(theme)}>维度</th>
                  <th className={tableHeadCell(theme)}>调用次数</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '今日', value: todayCalls },
                  { label: '本周', value: weekCalls },
                  { label: '本月', value: monthCalls },
                  { label: '累计', value: totalCalls },
                ].map((row, i) => (
                  <tr key={row.label} className={tableBodyRow(theme, i)}>
                    <td className={tableCell()}><span className={`font-medium ${textPrimary(theme)}`}>{row.label}</span></td>
                    <td className={tableCell()}><span className={`tabular-nums ${textSecondary(theme)}`}>{row.value.toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BentoCard>
      </div>
    </div>
  );
};
