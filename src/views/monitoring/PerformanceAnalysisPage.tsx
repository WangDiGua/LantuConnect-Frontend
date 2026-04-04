import React, { useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { usePerformanceMetrics } from '../../hooks/queries/useMonitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { BentoCard } from '../../components/common/BentoCard';
import { bentoCard, btnPrimary, pageBlockStack, textSecondary } from '../../utils/uiClasses';
import { formatDateTime } from '../../utils/formatDateTime';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MgmtDataTable } from '../../components/management/MgmtDataTable';
import type { MgmtDataTableColumn } from '../../components/management/MgmtDataTable';
import type { PerformanceMetric } from '../../types/dto/monitoring';
import { RESOURCE_TYPE_LABEL } from '../../constants/resourceTypes';

const PAGE_DESC = '按统一资源类型查看近 24 小时网关调用延迟与吞吐（数据来自 t_call_log 按小时聚合）';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const RESOURCE_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'agent', label: RESOURCE_TYPE_LABEL.agent },
  { key: 'skill', label: RESOURCE_TYPE_LABEL.skill },
  { key: 'mcp', label: RESOURCE_TYPE_LABEL.mcp },
  { key: 'app', label: RESOURCE_TYPE_LABEL.app },
  { key: 'dataset', label: RESOURCE_TYPE_LABEL.dataset },
  { key: 'unknown', label: '未分类' },
];

const BREADCRUMB = ['监控中心', '性能分析'] as const;

export const PerformanceAnalysisPage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [resourceTab, setResourceTab] = useState('all');
  const perfQ = usePerformanceMetrics(resourceTab === 'all' ? undefined : resourceTab);

  const rows = useMemo(() => perfQ.data ?? [], [perfQ.data]);

  const perfColumns = useMemo<MgmtDataTableColumn<PerformanceMetric>[]>(
    () => [
      {
        id: 'ts',
        header: '采集时间',
        cell: (r) => <span className="font-mono text-xs whitespace-nowrap">{formatDateTime(r.timestamp)}</span>,
      },
      {
        id: 'req',
        header: '请求量',
        cell: (r) => (
          <span className={`font-mono tabular-nums whitespace-nowrap ${textSecondary(theme)}`}>{r.requestRate}</span>
        ),
      },
      {
        id: 'err',
        header: '错误率',
        cell: (r) => (
          <span className={`font-mono tabular-nums whitespace-nowrap ${r.errorRate > 0.05 ? 'text-amber-500 font-semibold' : textSecondary(theme)}`}>
            {(r.errorRate * 100).toFixed(1)}%
          </span>
        ),
      },
      {
        id: 'p50',
        header: 'P50 ms',
        cell: (r) => <span className={`font-mono tabular-nums whitespace-nowrap ${textSecondary(theme)}`}>{r.latencyP50}</span>,
      },
      {
        id: 'p99',
        header: 'P99 ms',
        cell: (r) => (
          <span className={`font-mono tabular-nums whitespace-nowrap ${r.latencyP99 > 500 ? 'text-amber-500 font-semibold' : textSecondary(theme)}`}>{r.latencyP99}</span>
        ),
      },
      {
        id: 'tp',
        header: '吞吐',
        cell: (r) => <span className={`font-mono tabular-nums whitespace-nowrap ${textSecondary(theme)}`}>{r.throughput}</span>,
      },
    ],
    [theme],
  );

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    const snapshot = {
      exportTime: new Date().toISOString(),
      resourceType: resourceTab,
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
            {RESOURCE_TABS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setResourceTab(s.key)}
                className={tabCls(resourceTab === s.key)}
                aria-pressed={resourceTab === s.key}
                aria-label={`查看 ${s.label} 调用性能`}
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
      <div className={`${bentoCard(theme)} p-4`}>
        {rows.length === 0 ? (
          <EmptyState title="暂无性能样本" description="该分组下没有可用的性能指标数据。" />
        ) : (
          <MgmtDataTable<PerformanceMetric>
            theme={theme}
            surface="plain"
            minWidth="560px"
            columns={perfColumns}
            rows={rows}
            getRowKey={(r, idx) => `${r.timestamp}-${idx}`}
          />
        )}
      </div>
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
      <div className={`px-4 sm:px-6 pb-8 ${pageBlockStack}`}>{body}</div>
    </MgmtPageShell>
  );
};
