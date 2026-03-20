import React, { useState } from 'react';
import { Activity, BarChart3, TrendingUp, RefreshCw } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { UserAppShell, cardClass, btnPrimaryClass, btnGhostClass } from '../userApp/UserAppShell';
import { AdminConsoleCharts } from '../../components/charts/AdminConsoleCharts';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { useAdminResources, useAdminStats, useAdminHealth } from '../../hooks/queries/useAdmin';

interface Props {
  activeSubItem: string;
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminOverviewModule: React.FC<Props> = ({ activeSubItem, theme, fontSize, showMessage }) => {
  const [range, setRange] = useState<'24h' | '7d'>('7d');
  const mult = range === '24h' ? 0.2 : 1;

  const resourcesQ = useAdminResources();
  const statsQ = useAdminStats();
  const healthQ = useAdminHealth();

  if (activeSubItem === '资源监控') {
    if (resourcesQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="资源监控" subtitle="集群与存储占用">
          <PageSkeleton type="cards" />
        </UserAppShell>
      );
    }
    if (resourcesQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="资源监控" subtitle="集群与存储占用">
          <PageError error={resourcesQ.error instanceof Error ? resourcesQ.error : null} onRetry={() => resourcesQ.refetch()} />
        </UserAppShell>
      );
    }
    const metrics = resourcesQ.data ?? [];
    return (
      <UserAppShell
        theme={theme}
        fontSize={fontSize}
        title="资源监控"
        subtitle="集群与存储占用"
        actions={
          <button
            type="button"
            className={btnGhostClass(theme)}
            onClick={() => {
              resourcesQ.refetch().then(() => showMessage('已刷新指标', 'success'));
            }}
          >
            <RefreshCw size={16} className="inline mr-1" />
            刷新
          </button>
        }
      >
        <AdminConsoleCharts theme={theme} variant="resource" />
        {metrics.length === 0 ? (
          <EmptyState title="暂无资源指标" description="集群尚未上报数据" />
        ) : (
        <div className="grid sm:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <div key={m.id} className={`${cardClass(theme)} p-4`}>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <BarChart3 size={14} />
                {m.name}
              </div>
              <div className={`text-2xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{m.usagePct}%</div>
              <div className={`mt-3 h-2 rounded-full overflow-hidden ${theme === 'light' ? 'bg-slate-100' : 'bg-white/10'}`}>
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${m.usagePct}%` }} />
              </div>
              <div className="text-xs text-slate-400 mt-2">单位：{m.unit}</div>
            </div>
          ))}
        </div>
        )}
      </UserAppShell>
    );
  }

  if (activeSubItem === '使用统计') {
    if (statsQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="使用统计" subtitle="租户与调用聚合">
          <PageSkeleton type="cards" />
        </UserAppShell>
      );
    }
    if (statsQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="使用统计" subtitle="租户与调用聚合">
          <PageError error={statsQ.error instanceof Error ? statsQ.error : null} onRetry={() => statsQ.refetch()} />
        </UserAppShell>
      );
    }
    const s = statsQ.data!;
    const statCards = [
      { k: 'DAU', v: Math.round(s.dau * mult) },
      { k: 'API 调用（万）', v: ((s.totalCalls / 10_000) * mult).toFixed(1) },
      { k: '平均延迟 (ms)', v: Math.round(s.avgLatency * mult) },
    ];
    return (
      <UserAppShell theme={theme} fontSize={fontSize} title="使用统计" subtitle="租户与调用聚合">
        <div className="flex gap-2 mb-4">
          {(['24h', '7d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={range === r ? btnPrimaryClass : btnGhostClass(theme)}
              onClick={() => setRange(r)}
            >
              {r === '24h' ? '近 24 小时' : '近 7 天'}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          {statCards.map((x) => (
            <div key={x.k} className={`${cardClass(theme)} p-4 flex items-center gap-3`}>
              <TrendingUp className="text-emerald-500 shrink-0" size={22} />
              <div>
                <div className="text-xs text-slate-500">{x.k}</div>
                <div className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{x.v}</div>
              </div>
            </div>
          ))}
        </div>
        <p className={`text-xs mb-4 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
          活跃 Agent：{Math.round(s.activeAgents * mult)}
        </p>
        <AdminConsoleCharts theme={theme} variant="usage" />
        <div className={cardClass(theme)}>
          <div className={`p-3 text-sm font-medium border-b ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}>Top 工作空间</div>
          {['教务处', '信息中心', '科研平台'].map((name, i) => (
            <div
              key={name}
              className={`p-4 flex justify-between border-b last:border-0 ${theme === 'light' ? 'border-slate-100' : 'border-white/10'}`}
            >
              <span>{name}</span>
              <span className="text-slate-500">{Math.round((90 - i * 12) * mult)}%</span>
            </div>
          ))}
        </div>
        <button type="button" className={`${btnGhostClass(theme)} mt-4`} onClick={() => showMessage('已导出报表（Mock）', 'success')}>
          导出 CSV
        </button>
      </UserAppShell>
    );
  }

  if (activeSubItem === '健康检查') {
    if (healthQ.isPending) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="健康检查" subtitle="核心服务探活">
          <PageSkeleton type="cards" rows={4} />
        </UserAppShell>
      );
    }
    if (healthQ.isError) {
      return (
        <UserAppShell theme={theme} fontSize={fontSize} title="健康检查" subtitle="核心服务探活">
          <PageError error={healthQ.error instanceof Error ? healthQ.error : null} onRetry={() => healthQ.refetch()} />
        </UserAppShell>
      );
    }
    const health = healthQ.data ?? [];
    return (
      <UserAppShell
        theme={theme}
        fontSize={fontSize}
        title="健康检查"
        subtitle="核心服务探活"
        actions={
          <button
            type="button"
            className={btnPrimaryClass}
            onClick={() => {
              healthQ.refetch().then(() => showMessage('已重新探测', 'info'));
            }}
          >
            全部探测
          </button>
        }
      >
        {health.length === 0 ? (
          <EmptyState title="暂无健康数据" description="尚未配置探活目标" />
        ) : (
        <div className="space-y-3">
          {health.map((h) => {
            const ok = h.status === 'healthy';
            return (
              <div key={h.service} className={`${cardClass(theme)} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                <div className="flex items-center gap-3">
                  <Activity className={ok ? 'text-emerald-500' : 'text-red-500'} size={22} />
                  <div>
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{h.service}</div>
                    <div className="text-xs text-slate-500">延迟 {h.latencyMs} ms</div>
                    {h.message ? <div className="text-xs text-slate-400 mt-0.5">{h.message}</div> : null}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-lg whitespace-nowrap ${
                    ok ? 'bg-emerald-500/15 text-emerald-600' : h.status === 'degraded' ? 'bg-amber-500/15 text-amber-600' : 'bg-red-500/15 text-red-500'
                  }`}
                >
                  {h.status === 'healthy' ? '正常' : h.status === 'degraded' ? '降级' : '异常'}
                </span>
              </div>
            );
          })}
        </div>
        )}
      </UserAppShell>
    );
  }

  return (
    <UserAppShell theme={theme} fontSize={fontSize} title={activeSubItem} subtitle="请选择子菜单">
      <div className={cardClass(theme)} />
    </UserAppShell>
  );
};
