import React, { useMemo } from 'react';
import { Cpu } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { usePerformanceMetrics } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const InfraResourceMonitorPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const perfQ = usePerformanceMetrics();

  const nodes = useMemo(() => {
    const list = perfQ.data ?? [];
    const tail = list.slice(-8);
    return tail.map((m, idx) => ({
      id: `${m.timestamp}-${idx}`,
      name: `采样点 ${idx + 1}`,
      cpu: Math.min(100, Math.round(m.cpu)),
      mem: Math.min(100, Math.round(m.memory)),
      pod: Math.max(1, Math.round(m.throughput / 10)),
    }));
  }, [perfQ.data]);

  if (perfQ.isLoading) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Cpu} breadcrumbSegments={['监控中心', '资源监控']}>
        <PageSkeleton type="cards" />
      </MgmtPageShell>
    );
  }

  if (perfQ.isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Cpu} breadcrumbSegments={['监控中心', '资源监控']}>
        <PageError error={perfQ.error as Error} onRetry={() => perfQ.refetch()} />
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={Cpu} breadcrumbSegments={['监控中心', '资源监控']}>
      <div className="p-4 sm:p-6 space-y-4">
        <button
          type="button"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            void perfQ.refetch();
            showMessage('指标已刷新', 'info');
          }}
        >
          刷新
        </button>
        {nodes.length === 0 ? (
          <EmptyState title="暂无资源数据" description="性能采集返回为空，请检查采集端或稍后重试。" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {nodes.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl border p-4 shadow-none ${isDark ? 'border-white/10 bg-[#2C2C2E]/40' : 'border-slate-200/80 bg-slate-50/80'}`}
              >
                <div className="font-semibold">{n.name}</div>
                <div className="text-xs text-slate-500 mt-2">负载单元（由吞吐推导）{n.pod}</div>
                <div className="mt-2 space-y-2">
                  {[
                    { k: 'CPU', v: n.cpu },
                    { k: '内存', v: n.mem },
                  ].map((x) => (
                    <div key={x.k}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{x.k}</span>
                        <span>{x.v}%</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${x.v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MgmtPageShell>
  );
};
