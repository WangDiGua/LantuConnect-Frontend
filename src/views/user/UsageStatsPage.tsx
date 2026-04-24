import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, Heart, History, Layers, Zap } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { userActivityService } from '../../api/services/user-activity.service';
import type { UserUsageStats } from '../../types/dto/user-activity';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import {
  textPrimary,
  textSecondary,
  textMuted,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

const PAGE_DESC = '查看个人调用量、周期汇总与资源类型分布';

interface UsageStatsPageProps {
  theme: Theme;
  fontSize: FontSize;
}

const TYPE_LABEL: Record<string, string> = {
  agent: 'Agent',
  skill: 'Skill',
  app: '应用',
  mcp: 'MCP',
  dataset: '数据集',
  unknown: '未知',
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function compactDate(value: string): string {
  if (!value) return '--';
  if (value.length >= 10) return value.slice(5, 10);
  return value;
}

export const UsageStatsPage: React.FC<UsageStatsPageProps> = ({ theme, fontSize }) => {
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<UserUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      setStats(await userActivityService.getUsageStats());
    } catch (err) {
      setLoadError(err instanceof Error ? err : new Error('加载用量统计失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const body = useMemo(() => {
    if (loading) return <PageSkeleton type="chart" />;
    if (loadError) return <PageError error={loadError} onRetry={fetchData} retryLabel="重试加载用量统计" />;
    if (!stats) return <div className={`py-16 text-center text-sm ${textMuted(theme)}`}>暂无统计数据</div>;

    const todayCalls = n(stats.todayCalls);
    const weekCalls = n(stats.weekCalls);
    const monthCalls = n(stats.monthCalls);
    const totalCalls = n(stats.totalCalls);
    const favoriteCount = n(stats.favoriteCount);
    const recentDays = (stats.recentDays ?? []).map((row) => ({
      date: String(row.date ?? ''),
      calls: n(row.calls),
    }));
    const maxDaily = Math.max(...recentDays.map((row) => row.calls), 1);
    const typeRows = [...(stats.byTargetType ?? [])]
      .map((row) => ({ type: row.type || 'unknown', calls: n(row.calls) }))
      .filter((row) => row.calls > 0)
      .sort((a, b) => b.calls - a.calls);
    const maxType = Math.max(...typeRows.map((row) => row.calls), 1);

    const kpis = [
      { label: '今日调用', value: todayCalls, icon: Calendar, note: '自然日' },
      { label: '本周调用', value: weekCalls, icon: History, note: '自然周' },
      { label: '本月调用', value: monthCalls, icon: Zap, note: '自然月' },
      { label: '累计调用', value: totalCalls, icon: BarChart3, note: '全部记录' },
      { label: '收藏数', value: favoriteCount, icon: Heart, note: '当前收藏' },
    ];

    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`rounded-[1.35rem] border px-4 py-4 ${
                  isDark ? 'border-white/[0.08] bg-lantu-card' : 'border-slate-200/70 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm font-semibold ${textSecondary(theme)}`}>{item.label}</p>
                  <Icon size={17} className={textMuted(theme)} aria-hidden />
                </div>
                <p className={`mt-3 text-3xl font-black leading-none tabular-nums ${textPrimary(theme)}`}>
                  {item.value.toLocaleString('zh-CN')}
                </p>
                <p className={`mt-2 text-xs font-medium ${textMuted(theme)}`}>{item.note}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.8fr)]">
          <section className={`rounded-[1.5rem] border p-5 ${
            isDark ? 'border-white/[0.08] bg-lantu-card' : 'border-slate-200/70 bg-white'
          }`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className={`text-base font-black ${textPrimary(theme)}`}>最近 7 天调用趋势</h3>
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>最近一周每日调用次数</p>
              </div>
            </div>
            {recentDays.length > 0 ? (
              <div className="flex h-64 items-end gap-2 overflow-hidden pb-2 sm:gap-3">
                {recentDays.map((bar, index) => {
                  const pct = maxDaily > 0 ? (bar.calls / maxDaily) * 100 : 0;
                  return (
                    <div key={`${bar.date}-${index}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <span className={`text-xs font-bold tabular-nums ${textMuted(theme)}`}>{bar.calls}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(pct, bar.calls > 0 ? 8 : 2)}%` }}
                        transition={{ duration: 0.42, delay: index * 0.035, ease: 'easeOut' }}
                        className={`w-full rounded-t-xl ${
                          isDark
                            ? 'bg-gradient-to-t from-sky-500/60 to-cyan-300/90'
                            : 'bg-gradient-to-t from-slate-900 to-slate-600'
                        }`}
                      />
                      <span className={`truncate text-xs ${textMuted(theme)}`}>{compactDate(bar.date)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`flex h-64 items-center justify-center rounded-xl border border-dashed ${
                isDark ? 'border-white/[0.1] text-lantu-text-muted' : 'border-slate-200 text-slate-500'
              }`}>
                最近 7 天暂无调用记录
              </div>
            )}
          </section>

          <section className={`rounded-[1.5rem] border p-5 ${
            isDark ? 'border-white/[0.08] bg-lantu-card' : 'border-slate-200/70 bg-white'
          }`}>
            <div className="mb-5 flex items-center gap-2">
              <Layers size={18} className={textMuted(theme)} aria-hidden />
              <h3 className={`text-base font-black ${textPrimary(theme)}`}>按资源类型汇总</h3>
            </div>
            {typeRows.length > 0 ? (
              <div className="space-y-4">
                {typeRows.map((row) => {
                  const width = `${Math.max((row.calls / maxType) * 100, 4)}%`;
                  return (
                    <div key={row.type}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className={`font-semibold ${textSecondary(theme)}`}>{TYPE_LABEL[row.type] ?? row.type}</span>
                        <span className={`font-black tabular-nums ${textPrimary(theme)}`}>{row.calls.toLocaleString('zh-CN')}</span>
                      </div>
                      <div className={`h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}>
                        <div className={`h-full rounded-full ${isDark ? 'bg-cyan-300' : 'bg-slate-900'}`} style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`flex h-48 items-center justify-center rounded-xl border border-dashed text-sm ${
                isDark ? 'border-white/[0.1] text-lantu-text-muted' : 'border-slate-200 text-slate-500'
              }`}>
                暂无资源类型分布
              </div>
            )}
          </section>
        </div>

        <section className={`rounded-[1.5rem] border p-5 ${
          isDark ? 'border-white/[0.08] bg-lantu-card' : 'border-slate-200/70 bg-white'
        }`}>
          <h3 className={`text-base font-black ${textPrimary(theme)}`}>调用汇总</h3>
          <p className={`mt-1 text-xs ${textMuted(theme)}`}>今日、本周、本月按自然周期汇总，累计为全部使用记录。</p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {[
              { label: '今日', value: todayCalls },
              { label: '本周', value: weekCalls },
              { label: '本月', value: monthCalls },
              { label: '累计', value: totalCalls },
            ].map((row) => (
              <div key={row.label} className={`rounded-xl px-4 py-3 ${
                isDark ? 'bg-white/[0.045]' : 'bg-slate-50'
              }`}>
                <p className={`text-xs font-semibold ${textMuted(theme)}`}>{row.label}</p>
                <p className={`mt-1 text-2xl font-black tabular-nums ${textPrimary(theme)}`}>{row.value.toLocaleString('zh-CN')}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }, [fetchData, isDark, loadError, loading, stats, theme]);

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={BarChart3}
      breadcrumbSegments={['工作台', '用量统计'] as const}
      description={PAGE_DESC}
      contentScroll="document"
    >
      <div className="px-4 pb-8 sm:px-6">{body}</div>
    </MgmtPageShell>
  );
};
