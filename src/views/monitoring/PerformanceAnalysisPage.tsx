import React, { useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { usePerformanceMetrics } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { BentoCard } from '../../components/common/BentoCard';
import {
  btnPrimary, textSecondary,
  tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

const PAGE_DESC = '各服务 CPU、内存、延迟分位与吞吐指标';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const SERVICES = [
  { key: 'gateway', label: 'Gateway' },
  { key: 'inference', label: 'Inference' },
  { key: 'worker', label: 'Worker' },
];

const BREADCRUMB = ['监控中心', '性能分析'] as const;

export const PerformanceAnalysisPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [svc, setSvc] = useState('gateway');
  const perfQ = usePerformanceMetrics();

  const rows = useMemo(() => {
    const list = perfQ.data ?? [];
    if (list.length === 0) return [];
    const key = (svc === 'gateway' ? 'gateway' : svc === 'inference' ? 'inference' : 'worker').toLowerCase();
    const byService = list.filter((m) => m.service && String(m.service).toLowerCase() === key);
    if (byService.length > 0) return byService;
    const bucket = svc === 'gateway' ? 0 : svc === 'inference' ? 1 : 2;
    return list.filter((_, i) => i % 3 === bucket);
  }, [perfQ.data, svc]);

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    const snapshot = {
      exportTime: new Date().toISOString(),
      service: svc,
      metrics: rows.map((r) => ({
        timestamp: r.timestamp, cpu: r.cpu, memory: r.memory,
        latencyP50: r.latencyP50, latencyP99: r.latencyP99, throughput: r.throughput,
      })),
    };
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perf-snapshot-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage('分析快照已导出', 'success');
  };

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-xl text-sm font-semibold transition-colors motion-reduce:transition-none active:scale-[0.97] ${
      active
        ? 'bg-neutral-900 text-white shadow-sm'
        : isDark
          ? 'bg-white/5 text-slate-400 hover:bg-white/10'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  const toolbar =
    !perfQ.isLoading && !perfQ.isError ? (
      <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-start sm:justify-between">
        <BentoCard theme={theme} padding="sm" className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSvc(s.key)}
                className={tabCls(svc === s.key)}
                aria-pressed={svc === s.key}
                aria-label={`查看 ${s.label} 指标`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </BentoCard>
        <button type="button" onClick={handleExport} className={`${btnPrimary} shrink-0 self-start`} aria-label="导出性能分析快照 JSON">
          <Download size={15} aria-hidden />
          导出快照
        </button>
      </div>
    ) : undefined;

  const body = (() => {
    if (perfQ.isLoading) {
      return <PageSkeleton type="table" rows={4} />;
    }
    if (perfQ.isError) {
      return <PageError error={perfQ.error as Error} onRetry={() => perfQ.refetch()} />;
    }
    return (
      <BentoCard theme={theme} padding="sm">
        {rows.length === 0 ? (
          <EmptyState title="暂无性能样本" description="该分组下没有可用的性能指标数据。" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[560px] w-full text-sm">
              <thead>
                <tr>
                  {['采集时间', 'CPU %', '内存 %', 'P50 ms', 'P99 ms', '吞吐'].map((h) => (
                    <th key={h} className={tableHeadCell(theme)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.timestamp}-${i}`} className={tableBodyRow(theme, i)}>
                    <td className={`${tableCell()} whitespace-nowrap`}><span className="font-mono text-xs">{formatDateTime(r.timestamp)}</span></td>
                    <td className={`${tableCell()} whitespace-nowrap`}><span className={`font-mono tabular-nums ${r.cpu > 80 ? 'text-rose-500 font-semibold' : textSecondary(theme)}`}>{r.cpu}</span></td>
                    <td className={`${tableCell()} whitespace-nowrap`}><span className={`font-mono tabular-nums ${r.memory > 85 ? 'text-rose-500 font-semibold' : textSecondary(theme)}`}>{r.memory}</span></td>
                    <td className={`${tableCell()} whitespace-nowrap`}><span className={`font-mono tabular-nums ${textSecondary(theme)}`}>{r.latencyP50}</span></td>
                    <td className={`${tableCell()} whitespace-nowrap`}><span className={`font-mono tabular-nums ${r.latencyP99 > 500 ? 'text-amber-500 font-semibold' : textSecondary(theme)}`}>{r.latencyP99}</span></td>
                    <td className={`${tableCell()} whitespace-nowrap`}><span className={`font-mono tabular-nums ${textSecondary(theme)}`}>{r.throughput}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BentoCard>
    );
  })();

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={BarChart3}
      breadcrumbSegments={BREADCRUMB}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8 space-y-4">{body}</div>
    </MgmtPageShell>
  );
};
