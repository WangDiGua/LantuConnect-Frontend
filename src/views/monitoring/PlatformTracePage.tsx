import React, { useMemo, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { useTraces } from '../../hooks/queries/useMonitoring';
import type { TraceSpan } from '../../types/dto/monitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function formatTraceTree(spans: TraceSpan[], traceId: string): string {
  const relevant = spans.filter((s) => s.traceId === traceId);
  if (relevant.length === 0) return '';

  const byParent = new Map<string | undefined, TraceSpan[]>();
  for (const s of relevant) {
    const p = s.parentId;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(s);
  }

  const roots = relevant.filter((s) => !s.parentId || !relevant.some((x) => x.id === s.parentId));

  function walk(nodes: TraceSpan[], prefix: string): string {
    return nodes
      .map((node, i) => {
        const isLast = i === nodes.length - 1;
        const branch = isLast ? '└─ ' : '├─ ';
        const line = `${prefix}${branch}${node.service} · ${node.operationName} (${node.duration}ms) [${node.status}]\n`;
        const children = byParent.get(node.id) ?? [];
        const nextPrefix = prefix + (isLast ? '   ' : '│  ');
        return line + (children.length ? walk(children, nextPrefix) : '');
      })
      .join('');
  }

  return `trace=${traceId}\n` + walk(roots, '');
}

export const PlatformTracePage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [traceId, setTraceId] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  const tracesQ = useTraces();

  const traceIds = useMemo(() => {
    const spans = tracesQ.data ?? [];
    return [...new Set(spans.map((s) => s.traceId))];
  }, [tracesQ.data]);

  if (tracesQ.isLoading) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={GitBranch} breadcrumbSegments={['监控中心', '全链路 Trace']}>
        <div className="p-4 sm:p-6 max-w-2xl">
          <PageSkeleton type="detail" />
        </div>
      </MgmtPageShell>
    );
  }

  if (tracesQ.isError) {
    return (
      <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={GitBranch} breadcrumbSegments={['监控中心', '全链路 Trace']}>
        <PageError error={tracesQ.error as Error} onRetry={() => tracesQ.refetch()} />
      </MgmtPageShell>
    );
  }

  const spans = tracesQ.data ?? [];

  const runLookup = () => {
    const id = traceId.trim();
    if (!id) {
      showMessage('请输入 Trace ID', 'error');
      return;
    }
    const tree = formatTraceTree(spans, id);
    if (!tree) {
      setDetail(null);
      showMessage('未找到该 Trace ID', 'error');
      return;
    }
    setDetail(tree);
    showMessage('已加载 Trace', 'success');
  };

  return (
    <MgmtPageShell theme={theme} fontSize={fontSize} titleIcon={GitBranch} breadcrumbSegments={['监控中心', '全链路 Trace']}>
      <div className="p-4 sm:p-6 space-y-4 max-w-2xl">
        {traceIds.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>快速选择</span>
            {traceIds.slice(0, 6).map((id) => (
              <button
                key={id}
                type="button"
                className={`px-2 py-1 rounded-lg font-mono ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-slate-100 hover:bg-slate-200'}`}
                onClick={() => {
                  setTraceId(id);
                  const tree = formatTraceTree(spans, id);
                  setDetail(tree || null);
                  if (tree) showMessage('已加载 Trace', 'success');
                }}
                title={id}
              >
                {id.length > 14 ? `${id.slice(0, 8)}…` : id}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            className={`flex-1 min-w-[200px] rounded-xl border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500/30 ${
              isDark ? 'border-white/10 bg-black/30 text-white' : 'border-slate-200 bg-white'
            }`}
            placeholder="Trace ID"
            value={traceId}
            onChange={(e) => setTraceId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runLookup()}
          />
          <button type="button" className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700" onClick={runLookup}>
            查询
          </button>
        </div>
        {spans.length === 0 && !detail ? (
          <EmptyState title="暂无 Trace 数据" description="后端未返回 Span，或链路采集未开启。" />
        ) : null}
        {detail && (
          <pre
            className={`rounded-2xl border p-4 text-xs font-mono whitespace-pre-wrap shadow-none ${
              isDark ? 'border-white/10 bg-[#2C2C2E]/40 text-slate-200' : 'border-slate-200/80 bg-slate-50 text-slate-800'
            }`}
          >
            {detail}
          </pre>
        )}
      </div>
    </MgmtPageShell>
  );
};
