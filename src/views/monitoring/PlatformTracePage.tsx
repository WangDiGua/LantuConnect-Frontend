import React, { useMemo, useState } from 'react';
import { GitBranch } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { useTraces } from '../../hooks/queries/useMonitoring';
import type { TraceSpan } from '../../types/dto/monitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import { BentoCard } from '../../components/common/BentoCard';
import { nativeInputClass } from '../../utils/formFieldClasses';
import {
  pageBg, btnPrimary, btnGhost, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';

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
    return nodes.map((node, i) => {
      const isLast = i === nodes.length - 1;
      const branch = isLast ? '└─ ' : '├─ ';
      const line = `${prefix}${branch}${node.service} · ${node.operationName} (${node.duration}ms) [${node.status}]\n`;
      const children = byParent.get(node.id) ?? [];
      const nextPrefix = prefix + (isLast ? '   ' : '│  ');
      return line + (children.length ? walk(children, nextPrefix) : '');
    }).join('');
  }
  return `trace=${traceId}\n` + walk(roots, '');
}

export const PlatformTracePage: React.FC<Props> = ({ theme, showMessage }) => {
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
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <div className="p-4 sm:p-6 max-w-2xl"><PageSkeleton type="detail" /></div>
      </div>
    );
  }

  if (tracesQ.isError) {
    return (
      <div className={`flex-1 flex flex-col min-h-0 ${pageBg(theme)}`}>
        <PageError error={tracesQ.error as Error} onRetry={() => tracesQ.refetch()} />
      </div>
    );
  }

  const spans = tracesQ.data ?? [];

  const runLookup = () => {
    const id = traceId.trim();
    if (!id) { showMessage('请输入 Trace ID', 'error'); return; }
    const tree = formatTraceTree(spans, id);
    if (!tree) { setDetail(null); showMessage('未找到该 Trace ID', 'error'); return; }
    setDetail(tree);
    showMessage('已加载 Trace', 'success');
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${pageBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
            <GitBranch size={20} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${textPrimary(theme)}`}>全链路 Trace</h1>
            <p className={`text-xs ${textMuted(theme)}`}>输入 Trace ID 查看完整调用链路</p>
          </div>
        </div>

        {/* Quick select */}
        {traceIds.length > 0 && (
          <BentoCard theme={theme} padding="sm">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`text-xs font-semibold ${textMuted(theme)}`}>快速选择</span>
              {traceIds.slice(0, 6).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={btnGhost(theme) + ' !text-xs font-mono'}
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
          </BentoCard>
        )}

        {/* Search */}
        <div className="flex flex-wrap gap-2">
          <input
            className={`${nativeInputClass(theme)} flex-1 min-w-[200px]`}
            placeholder="Trace ID"
            value={traceId}
            onChange={(e) => setTraceId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runLookup()}
          />
          <button type="button" className={btnPrimary} onClick={runLookup}>查询</button>
        </div>

        {spans.length === 0 && !detail && (
          <EmptyState title="暂无 Trace 数据" description="后端未返回 Span，或链路采集未开启。" />
        )}

        {detail && (
          <BentoCard theme={theme}>
            <pre className={`text-xs font-mono whitespace-pre-wrap ${textSecondary(theme)}`}>
              {detail}
            </pre>
          </BentoCard>
        )}
      </div>
    </div>
  );
};
