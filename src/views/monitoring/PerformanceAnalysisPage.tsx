import React, { useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { usePerformanceMetrics } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { BentoCard } from '../../components/common/BentoCard';
import {
  canvasBodyBg, btnPrimary, textPrimary, textSecondary, textMuted,
  tableHeadCell, tableBodyRow, tableCell,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { formatDateTime } from '../../utils/formatDateTime';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

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

export const PerformanceAnalysisPage: React.FC<Props> = ({ theme, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
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
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
        <div className="p-4 sm:p-6"><PageSkeleton type="table" rows={4} /></div>
      </div>
    );
  }

  if (perfQ.isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${canvasBodyBg(theme)}`}>
        <PageError error={perfQ.error as Error} onRetry={() => perfQ.refetch()} />
      </div>
    );
  }

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

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
              <BarChart3 size={20} className={isDark ? 'text-neutral-300' : 'text-neutral-900'} />
            </div>
            <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '性能分析'} tagline="各服务 CPU、内存、延迟分位与吞吐指标" />
          </div>
          <button type="button" onClick={handleExport} className={btnPrimary}>
            <Download size={15} />
            导出快照
          </button>
        </div>

        {/* Service tabs */}
        <BentoCard theme={theme} padding="sm">
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSvc(s.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
                  svc === s.key
                    ? 'bg-neutral-900 text-white shadow-sm hover:shadow-[var(--shadow-glow-indigo)]'
                    : isDark
                      ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </BentoCard>

        {/* Performance table */}
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
                      <td className={tableCell()}><span className="font-mono text-xs">{formatDateTime(r.timestamp)}</span></td>
                      <td className={tableCell()}><span className={`font-mono tabular-nums ${r.cpu > 80 ? 'text-rose-500 font-semibold' : textSecondary(theme)}`}>{r.cpu}</span></td>
                      <td className={tableCell()}><span className={`font-mono tabular-nums ${r.memory > 85 ? 'text-rose-500 font-semibold' : textSecondary(theme)}`}>{r.memory}</span></td>
                      <td className={tableCell()}><span className={`font-mono tabular-nums ${textSecondary(theme)}`}>{r.latencyP50}</span></td>
                      <td className={tableCell()}><span className={`font-mono tabular-nums ${r.latencyP99 > 500 ? 'text-amber-500 font-semibold' : textSecondary(theme)}`}>{r.latencyP99}</span></td>
                      <td className={tableCell()}><span className={`font-mono tabular-nums ${textSecondary(theme)}`}>{r.throughput}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BentoCard>
      </div>
    </div>
  );
};
