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
  btnPrimary, btnGhost, pageBlockStack, textSecondary, textMuted, fieldErrorText, inputBaseError,
} from '../../utils/uiClasses';
import { distributedTraceStatusLabelZh } from '../../utils/backendEnumLabels';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

const PAGE_DESC = '输入 Trace ID 查看完整调用链路';

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
      const serviceName = node.service || node.serviceName || '未知服务';
      const statusZh = distributedTraceStatusLabelZh(node.status);
      const line = `${prefix}${branch}${serviceName} · ${node.operationName} (${node.duration}ms) [${statusZh}]\n`;
      const children = byParent.get(node.id) ?? [];
      const nextPrefix = prefix + (isLast ? '   ' : '│  ');
      return line + (children.length ? walk(children, nextPrefix) : '');
    }).join('');
  }
  return `trace=${traceId}\n` + walk(roots, '');
}

const BREADCRUMB = ['监控中心', '全链路 Trace'] as const;

const TRACE_INPUT_ID = 'platform-trace-id-input';

export const PlatformTracePage: React.FC<Props> = ({ theme, fontSize, showMessage }) => {
  const [traceId, setTraceId] = useState('');
  const [traceIdError, setTraceIdError] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  const tracesQ = useTraces();

  const traceIds = useMemo(() => {
    const spans = tracesQ.data ?? [];
    return [...new Set(spans.map((s) => s.traceId))];
  }, [tracesQ.data]);

  const spans = tracesQ.data ?? [];

  const runLookup = () => {
    const id = traceId.trim();
    if (!id) {
      setTraceIdError('请输入 Trace ID');
      return;
    }
    const tree = formatTraceTree(spans, id);
    if (!tree) {
      setDetail(null);
      setTraceIdError('未找到该 Trace ID');
      return;
    }
    setTraceIdError('');
    setDetail(tree);
    showMessage('已加载 Trace', 'success');
  };

  const toolbar = !tracesQ.isLoading && !tracesQ.isError ? (
    <div className="space-y-3 w-full">
      {traceIds.length > 0 && (
        <BentoCard theme={theme} padding="sm">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-xs font-semibold ${textMuted(theme)}`}>快速选择</span>
            {traceIds.slice(0, 6).map((id) => (
              <button
                key={id}
                type="button"
                className={`${btnGhost(theme)} !text-xs font-mono`}
                onClick={() => {
                  setTraceId(id);
                  setTraceIdError('');
                  const tree = formatTraceTree(spans, id);
                  setDetail(tree || null);
                  if (tree) showMessage('已加载 Trace', 'success');
                }}
                title={id}
                aria-label={`加载 Trace ${id}`}
              >
                {id.length > 14 ? `${id.slice(0, 8)}…` : id}
              </button>
            ))}
          </div>
        </BentoCard>
      )}
      <div className="flex flex-wrap gap-2 items-start">
        <div className="flex-1 min-w-[200px]">
          <input
            id={TRACE_INPUT_ID}
            className={`${nativeInputClass(theme)} w-full${traceIdError ? ` ${inputBaseError()}` : ''}`}
            placeholder="Trace ID"
            value={traceId}
            onChange={(e) => {
              setTraceId(e.target.value);
              setTraceIdError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && runLookup()}
            aria-label="Trace ID"
            aria-invalid={!!traceIdError}
            aria-describedby={traceIdError ? `${TRACE_INPUT_ID}-err` : undefined}
          />
          {traceIdError ? (
            <p id={`${TRACE_INPUT_ID}-err`} className={`mt-1 ${fieldErrorText()} text-xs`} role="alert">
              {traceIdError}
            </p>
          ) : null}
        </div>
        <button type="button" className={btnPrimary} onClick={runLookup}>查询</button>
      </div>
    </div>
  ) : undefined;

  const body = (() => {
    if (tracesQ.isLoading) {
      return <div className="max-w-2xl"><PageSkeleton type="detail" /></div>;
    }
    if (tracesQ.isError) {
      return <PageError error={tracesQ.error as Error} onRetry={() => tracesQ.refetch()} />;
    }
    return (
      <div className={`max-w-3xl ${pageBlockStack}`}>
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
    );
  })();

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={GitBranch}
      breadcrumbSegments={BREADCRUMB}
      description={PAGE_DESC}
      toolbar={toolbar}
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8">{body}</div>
    </MgmtPageShell>
  );
};
