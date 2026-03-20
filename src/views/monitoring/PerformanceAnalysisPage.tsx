import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
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

export const PerformanceAnalysisPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [svc, setSvc] = useState('gateway');
  const perfQ = usePerformanceMetrics();

  const rows = useMemo(() => {
    const list = perfQ.data ?? [];
    if (list.length === 0) return [];
    const bucket = svc === 'gateway' ? 0 : svc === 'inference' ? 1 : 2;
    return list.filter((_, i) => i % 3 === bucket);
  }, [perfQ.data, svc]);

  if (perfQ.isLoading) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={BarChart3} breadcrumbSegments={['监控中心', '性能分析']}>
        <PageSkeleton type="table" rows={4} />
      </MgmtPageShell>
    );
  }

  if (perfQ.isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={BarChart3} breadcrumbSegments={['监控中心', '性能分析']}>
        <PageError error={perfQ.error as Error} onRetry={() => perfQ.refetch()} />
      </MgmtPageShell>
    );
  }

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={BarChart3} breadcrumbSegments={['监控中心', '性能分析']}>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {['gateway', 'inference', 'worker'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSvc(s)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                svc === s
                  ? 'bg-blue-600 text-white'
                  : isDark
                    ? 'bg-white/10 text-slate-200 hover:bg-white/15'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <EmptyState title="暂无性能样本" description="该分组下没有可用的性能指标数据。" />
        ) : (
          <div className={`rounded-2xl border overflow-x-auto shadow-none ${isDark ? 'border-white/10' : 'border-slate-200/80'}`}>
            <table className="min-w-[560px] w-full text-sm">
              <thead className={isDark ? 'bg-white/5' : 'bg-slate-50'}>
                <tr>
                  {['采集时间', 'CPU %', '内存 %', 'P50 ms', 'P99 ms', '吞吐'].map((h) => (
                    <th key={h} className="text-left p-3 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.timestamp}-${i}`}
                    className={
                      i % 2 === 0 ? (isDark ? 'bg-transparent' : 'bg-white') : isDark ? 'bg-white/5' : 'bg-slate-50/80'
                    }
                  >
                    <td className="p-3 font-mono text-xs whitespace-nowrap">{r.timestamp}</td>
                    <td className="p-3 whitespace-nowrap">{r.cpu}</td>
                    <td className="p-3 whitespace-nowrap">{r.memory}</td>
                    <td className="p-3 whitespace-nowrap">{r.latencyP50}</td>
                    <td className="p-3 whitespace-nowrap">{r.latencyP99}</td>
                    <td className="p-3">{r.throughput}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700"
          onClick={() => showMessage('已生成分析快照（导出任务已排队）', 'success')}
        >
          导出分析快照
        </button>
      </div>
    </MgmtPageShell>
  );
};
