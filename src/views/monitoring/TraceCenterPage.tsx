import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock3,
  Copy,
  ExternalLink,
  GitBranch,
  RefreshCw,
  Waypoints,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { FontSize, Theme } from '../../types';
import { buildPath } from '../../constants/consoleRoutes';
import { RESOURCE_TYPES, resourceTypeLabel } from '../../constants/resourceTypes';
import { useAlertRuleScopeOptions, useTraceDetail, useTraceList } from '../../hooks/queries/useMonitoring';
import type {
  TraceQueryParams,
  TraceSpanDetail,
  TraceSpanNode,
  TraceStatus,
} from '../../types/dto/monitoring';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { PageError } from '../../components/common/PageError';
import { EmptyState } from '../../components/common/EmptyState';
import {
  FilterSelect,
  Pagination,
  SearchInput,
  TableCellEllipsis,
} from '../../components/common';
import { LantuDateTimePicker } from '../../components/common/LantuDateTimePicker';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { formatDateTime } from '../../utils/formatDateTime';
import { distributedTraceStatusLabelZh } from '../../utils/backendEnumLabels';
import { useScrollPaginatedContentToTop } from '../../hooks/useScrollPaginatedContentToTop';
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  pageBlockStack,
  tableBodyRow,
  tableCell,
  tableHeadCell,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';

interface TraceCenterPageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PAGE_SIZE = 12;
const PAGE_DESC = '围绕失败请求排查设计的 Trace 工作台：筛选、定位、下钻到时间线、调用树和证据区都在同一页完成。';
const BREADCRUMB = ['监控运维', '链路追踪'] as const;

type TraceTreeModel = {
  roots: TraceSpanNode[];
  ordered: TraceSpanNode[];
  byId: Map<string, TraceSpanNode>;
  totalDurationMs: number;
};

function parsePositiveInt(raw: string | null | undefined, fallback: number): number {
  const value = Number(raw ?? '');
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function parseTraceStatus(raw: string | null): 'all' | TraceStatus {
  return raw === 'success' || raw === 'error' ? raw : 'all';
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 ms';
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}

function formatTimelineWidth(totalDurationMs: number, node: TraceSpanNode) {
  if (totalDurationMs <= 0) {
    return { left: '0%', width: '16%' };
  }
  const left = Math.max(0, Math.min(100, (node.relativeStartMs / totalDurationMs) * 100));
  const rawWidth = Math.max(6, (Math.max(node.duration, 1) / totalDurationMs) * 100);
  const width = Math.min(100 - left, rawWidth);
  return { left: `${left}%`, width: `${Math.max(width, 6)}%` };
}

function timelineBaseTimestamp(spans: TraceSpanDetail[]): number | null {
  let earliest = Number.POSITIVE_INFINITY;
  for (const span of spans) {
    const time = Date.parse(span.startTime);
    if (Number.isFinite(time)) {
      earliest = Math.min(earliest, time);
    }
  }
  return Number.isFinite(earliest) ? earliest : null;
}

function buildTraceTree(spans: TraceSpanDetail[]): TraceTreeModel {
  const sorted = [...spans].sort((left, right) => {
    const leftTime = Date.parse(left.startTime);
    const rightTime = Date.parse(right.startTime);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.id.localeCompare(right.id);
  });

  const byId = new Map<string, TraceSpanNode>();
  const baseTimestamp = timelineBaseTimestamp(sorted);

  for (const span of sorted) {
    const startTime = Date.parse(span.startTime);
    byId.set(span.id, {
      ...span,
      depth: 0,
      relativeStartMs: baseTimestamp != null && Number.isFinite(startTime) ? Math.max(0, startTime - baseTimestamp) : 0,
      children: [],
    });
  }

  const roots: TraceSpanNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const ordered: TraceSpanNode[] = [];
  const assignDepth = (nodes: TraceSpanNode[], depth: number) => {
    nodes.forEach((node) => {
      node.depth = depth;
      ordered.push(node);
      assignDepth(node.children, depth + 1);
    });
  };
  assignDepth(roots, 0);

  const totalDurationMs = ordered.reduce(
    (max, node) => Math.max(max, node.relativeStartMs + Math.max(node.duration, 0)),
    0,
  );

  return {
    roots,
    ordered,
    byId,
    totalDurationMs,
  };
}

function collectExpandedIds(activeSpanId: string | null, model: TraceTreeModel): Set<string> {
  const expanded = new Set<string>(model.roots.map((item) => item.id));
  if (!activeSpanId) {
    return expanded;
  }
  let current = model.byId.get(activeSpanId);
  while (current) {
    expanded.add(current.id);
    current = current.parentId ? model.byId.get(current.parentId) : undefined;
  }
  return expanded;
}

function tracePill(theme: Theme, status: TraceStatus, emphasized = false): string {
  const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap';
  if (status === 'error') {
    return `${base} ${
      theme === 'dark'
        ? emphasized
          ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/30'
          : 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20'
        : emphasized
          ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300/80'
          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70'
    }`;
  }
  return `${base} ${
    theme === 'dark'
      ? emphasized
        ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'
        : 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20'
      : emphasized
        ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/80'
        : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
  }`;
}

function traceSurface(theme: Theme, status: TraceStatus, selected: boolean): string {
  if (selected) {
    return theme === 'dark'
      ? 'border-rose-400/30 bg-[linear-gradient(135deg,rgba(244,63,94,0.18),rgba(15,23,42,0.82))]'
      : 'border-rose-200 bg-[linear-gradient(135deg,rgba(255,228,230,0.92),rgba(255,255,255,1))]';
  }
  if (status === 'error') {
    return theme === 'dark'
      ? 'border-white/8 bg-[linear-gradient(135deg,rgba(127,29,29,0.22),rgba(15,23,42,0.66))]'
      : 'border-rose-100 bg-[linear-gradient(135deg,rgba(255,241,242,0.88),rgba(255,255,255,1))]';
  }
  return theme === 'dark'
    ? 'border-white/8 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(30,41,59,0.65))]'
    : 'border-slate-100 bg-[linear-gradient(135deg,rgba(248,250,252,0.92),rgba(255,255,255,1))]';
}

const SpanTreeBranch: React.FC<{
  theme: Theme;
  node: TraceSpanNode;
  expanded: Set<string>;
  activeSpanId: string | null;
  onToggle: (spanId: string) => void;
  onSelect: (spanId: string) => void;
}> = ({ theme, node, expanded, activeSpanId, onToggle, onSelect }) => {
  const isDark = theme === 'dark';
  const isExpanded = expanded.has(node.id);
  const isActive = activeSpanId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div className={node.depth > 0 ? `ml-4 border-l pl-3 ${isDark ? 'border-white/10' : 'border-slate-200'}` : ''}>
      <div
        className={`rounded-2xl border transition-colors ${
          isActive
            ? isDark
              ? 'border-sky-400/40 bg-sky-500/10'
              : 'border-sky-200 bg-sky-50/90'
            : isDark
              ? 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'
              : 'border-transparent hover:border-slate-200 hover:bg-slate-50/80'
        }`}
      >
        <div className="flex items-start gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => (hasChildren ? onToggle(node.id) : onSelect(node.id))}
            className={`${btnGhost(theme)} !px-1.5 !py-1 shrink-0`}
            aria-label={hasChildren ? `${isExpanded ? '折叠' : '展开'} ${node.operationName}` : `选择 ${node.operationName}`}
          >
            <Waypoints size={14} aria-hidden className={hasChildren && isExpanded ? 'rotate-90 transition-transform' : 'transition-transform'} />
          </button>
          <button type="button" onClick={() => onSelect(node.id)} className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-sm font-semibold ${textPrimary(theme)}`}>{node.operationName}</span>
              <span className={`text-xs font-mono ${textMuted(theme)}`}>{node.serviceName}</span>
              <span className={tracePill(theme, node.status)}>{distributedTraceStatusLabelZh(node.status)}</span>
            </div>
            <div className={`mt-1 flex flex-wrap items-center gap-3 text-xs ${textMuted(theme)}`}>
              <span>开始于 {formatDateTime(node.startTime)}</span>
              <span>{formatDuration(node.duration)}</span>
              {node.tags.errorMessage ? <span className="truncate max-w-full">根因：{String(node.tags.errorMessage)}</span> : null}
            </div>
          </button>
        </div>
      </div>
      {hasChildren && isExpanded ? (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <SpanTreeBranch
              key={child.id}
              theme={theme}
              node={child}
              expanded={expanded}
              activeSpanId={activeSpanId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const TraceCenterPage: React.FC<TraceCenterPageProps> = ({
  theme,
  fontSize,
  showMessage,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keywordInput, setKeywordInput] = useState(() => searchParams.get('keyword') ?? searchParams.get('q') ?? '');
  const [debouncedKeyword, setDebouncedKeyword] = useState(() => searchParams.get('keyword') ?? searchParams.get('q') ?? '');
  const [activeSpanId, setActiveSpanId] = useState<string | null>(null);
  const [expandedSpanIds, setExpandedSpanIds] = useState<Set<string>>(new Set());

  const status = parseTraceStatus(searchParams.get('status'));
  const resourceType = searchParams.get('resourceType') ?? 'all';
  const resourceId = searchParams.get('resourceId') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const traceId = searchParams.get('traceId') ?? '';

  useScrollPaginatedContentToTop(page);

  useEffect(() => {
    setKeywordInput(searchParams.get('keyword') ?? searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keywordInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  const commitParams = useCallback((mutate: (next: URLSearchParams) => void, replace = true) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, { replace });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const currentKeyword = searchParams.get('keyword') ?? searchParams.get('q') ?? '';
    if (currentKeyword === debouncedKeyword && !searchParams.get('q')) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (debouncedKeyword) {
      next.set('keyword', debouncedKeyword);
    } else {
      next.delete('keyword');
    }
    next.delete('q');
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [debouncedKeyword, searchParams, setSearchParams]);

  const scopeOptionsQ = useAlertRuleScopeOptions();
  const resourceOptions = useMemo(() => {
    if (resourceType === 'all') {
      return [];
    }
    return (scopeOptionsQ.data?.resources ?? []).filter((item) => item.resourceType === resourceType);
  }, [resourceType, scopeOptionsQ.data?.resources]);

  useEffect(() => {
    if (resourceType === 'all' && resourceId) {
      commitParams((next) => {
        next.delete('resourceId');
        next.delete('page');
      });
      return;
    }
    if (resourceId && resourceOptions.length > 0 && !resourceOptions.some((item) => String(item.id) === resourceId)) {
      commitParams((next) => {
        next.delete('resourceId');
        next.delete('page');
      });
    }
  }, [commitParams, resourceId, resourceOptions, resourceType]);

  const traceQueryParams = useMemo<TraceQueryParams>(() => ({
    page,
    pageSize: PAGE_SIZE,
    ...(debouncedKeyword ? { keyword: debouncedKeyword } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(resourceType !== 'all' ? { resourceType } : {}),
    ...(resourceId ? { resourceId: parsePositiveInt(resourceId, 0) } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }), [debouncedKeyword, from, page, resourceId, resourceType, status, to]);

  const traceListQ = useTraceList(traceQueryParams);
  const traceDetailQ = useTraceDetail(traceId || undefined);
  const traces = traceListQ.data?.list ?? [];
  const total = traceListQ.data?.total ?? 0;

  useEffect(() => {
    if (!traceId && traces.length > 0) {
      commitParams((next) => next.set('traceId', traces[0].traceId));
    }
  }, [commitParams, traceId, traces]);

  const treeModel = useMemo(
    () => buildTraceTree(traceDetailQ.data?.spans ?? []),
    [traceDetailQ.data?.spans],
  );

  useEffect(() => {
    if (!traceDetailQ.data) {
      setActiveSpanId(null);
      setExpandedSpanIds(new Set());
      return;
    }
    const preferredSpanId = traceDetailQ.data.rootCause?.spanId && treeModel.byId.has(traceDetailQ.data.rootCause.spanId)
      ? traceDetailQ.data.rootCause.spanId
      : treeModel.roots[0]?.id ?? null;
    setActiveSpanId((prev) => (prev && treeModel.byId.has(prev) ? prev : preferredSpanId));
    setExpandedSpanIds(collectExpandedIds(preferredSpanId, treeModel));
  }, [traceDetailQ.data, treeModel]);

  const selectedSpan = useMemo(
    () => (activeSpanId ? treeModel.byId.get(activeSpanId) ?? null : treeModel.roots[0] ?? null),
    [activeSpanId, treeModel],
  );

  const copyText = useCallback(async (value: string, successMessage: string) => {
    if (!value.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showMessage(successMessage, 'success');
    } catch {
      showMessage('复制失败，请稍后重试', 'error');
    }
  }, [showMessage]);

  const openCallLogs = useCallback((targetTraceId: string) => {
    const params = new URLSearchParams();
    params.set('q', targetTraceId);
    navigate(`${buildPath('admin', 'call-logs')}?${params.toString()}`);
  }, [navigate]);

  const refreshAll = () => {
    void traceListQ.refetch();
    if (traceId) {
      void traceDetailQ.refetch();
    }
  };

  const onSelectTrace = (nextTraceId: string) => {
    commitParams((next) => next.set('traceId', nextTraceId), false);
  };

  const traceListBody = (() => {
    if (traceListQ.isLoading) {
      return <PageSkeleton type="table" rows={6} />;
    }
    if (traceListQ.isError) {
      return <PageError error={traceListQ.error as Error} onRetry={() => traceListQ.refetch()} />;
    }
    if (traces.length === 0) {
      return (
        <EmptyState
          title="没有匹配的 Trace"
          description="可以先放宽筛选条件，或等待新的调用样本落入监控系统。"
        />
      );
    }
    return (
      <div className="space-y-3">
        {traces.map((item) => {
          const selected = traceId === item.traceId;
          return (
            <button
              key={item.traceId}
              type="button"
              onClick={() => onSelectTrace(item.traceId)}
              className={`w-full rounded-[1.4rem] border p-4 text-left transition-all ${traceSurface(theme, item.status, selected)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${textPrimary(theme)}`}>
                    {item.rootDisplayName || item.rootResourceCode || item.rootOperation}
                  </div>
                  <div className={`mt-1 text-xs font-mono ${textMuted(theme)}`}>
                    {item.traceId}
                  </div>
                </div>
                <span className={tracePill(theme, item.status, selected)}>
                  {distributedTraceStatusLabelZh(item.status)}
                </span>
              </div>
              <div className={`mt-3 grid gap-2 text-xs ${textSecondary(theme)}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{resourceTypeLabel(item.rootResourceType)}</span>
                  <span>#{item.rootResourceId ?? '--'}</span>
                  <span>{formatDuration(item.durationMs)}</span>
                  <span>{item.spanCount} spans</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>入口 {item.entryService || 'unified-gateway'}</span>
                  <span>开始于 {formatDateTime(item.startedAt)}</span>
                </div>
                {item.firstErrorMessage ? (
                  <div className={`rounded-2xl px-3 py-2 ${theme === 'dark' ? 'bg-white/[0.04]' : 'bg-white/90'}`}>
                    <TableCellEllipsis
                      text={item.firstErrorMessage}
                      className={`text-xs ${item.status === 'error' ? 'text-rose-600' : textMuted(theme)}`}
                    />
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  })();

  const detailJson = useMemo(
    () => (traceDetailQ.data ? JSON.stringify(traceDetailQ.data, null, 2) : ''),
    [traceDetailQ.data],
  );

  const activeSpanJson = useMemo(
    () => (selectedSpan ? JSON.stringify(selectedSpan, null, 2) : ''),
    [selectedSpan],
  );

  const detailBody = (() => {
    if (!traceId) {
      return (
        <EmptyState
          title="选择一条 Trace"
          description="左侧列表会按失败优先排列，点选后右侧会恢复到对应的排障工作区。"
        />
      );
    }
    if (traceDetailQ.isLoading) {
      return <PageSkeleton type="detail" rows={6} />;
    }
    if (traceDetailQ.isError) {
      return <PageError error={traceDetailQ.error as Error} onRetry={() => traceDetailQ.refetch()} />;
    }
    if (!traceDetailQ.data) {
      return <EmptyState title="当前 Trace 暂无详情" description="后端尚未返回 summary / spans / callLogs 数据。" />;
    }

    const { summary, rootCause, callLogs } = traceDetailQ.data;

    return (
      <div className={pageBlockStack}>
        <BentoCard
          theme={theme}
          className={`overflow-hidden border ${
            summary.status === 'error'
              ? theme === 'dark'
                ? 'border-rose-400/20 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.9))]'
                : 'border-rose-100 bg-[radial-gradient(circle_at_top_left,rgba(254,205,211,0.55),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,241,242,0.95))]'
              : theme === 'dark'
                ? 'border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.9))]'
                : 'border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(209,250,229,0.6),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))]'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={tracePill(theme, summary.status, true)}>{distributedTraceStatusLabelZh(summary.status)}</span>
                <span className={`text-xs font-mono ${textMuted(theme)}`}>{summary.traceId}</span>
              </div>
              <h3 className={`mt-3 text-2xl font-semibold tracking-tight ${textPrimary(theme)}`}>
                {summary.rootDisplayName || summary.rootResourceCode || summary.rootOperation}
              </h3>
              <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm ${textSecondary(theme)}`}>
                <span>{resourceTypeLabel(summary.rootResourceType)}</span>
                <span>#{summary.rootResourceId ?? '--'}</span>
                <span>{summary.entryService || 'unified-gateway'}</span>
                <span>开始于 {formatDateTime(summary.startedAt)}</span>
              </div>
              <div className={`mt-3 text-sm ${textSecondary(theme)}`}>
                requestId：<span className="font-mono">{summary.requestId || '—'}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={btnSecondary(theme)}
                onClick={() => void copyText(summary.traceId, 'Trace ID 已复制')}
              >
                <Copy size={15} aria-hidden />
                复制 Trace ID
              </button>
              <button
                type="button"
                className={btnSecondary(theme)}
                onClick={() => openCallLogs(summary.traceId)}
              >
                <ExternalLink size={15} aria-hidden />
                查看调用日志
              </button>
              <button
                type="button"
                className={btnGhost(theme)}
                onClick={() => void copyText(detailJson, 'Trace JSON 已复制')}
              >
                <Copy size={14} aria-hidden />
                复制 JSON
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: '总耗时', value: formatDuration(summary.durationMs), icon: Clock3 },
              { label: 'Span 数', value: summary.spanCount, icon: Waypoints },
              { label: '错误 Span', value: summary.errorSpanCount, icon: AlertTriangle },
              { label: '调用来源', value: summary.ip || '—', icon: Activity },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-[1.25rem] border px-4 py-3 ${
                  theme === 'dark' ? 'border-white/8 bg-white/[0.04]' : 'border-white/80 bg-white/90'
                }`}
              >
                <div className={`flex items-center justify-between gap-3 text-xs ${textMuted(theme)}`}>
                  <span>{card.label}</span>
                  <card.icon size={14} aria-hidden />
                </div>
                <div className={`mt-2 text-xl font-semibold ${textPrimary(theme)}`}>{card.value}</div>
              </div>
            ))}
          </div>

          {rootCause ? (
            <div
              className={`mt-5 rounded-[1.35rem] border px-4 py-3 ${
                theme === 'dark'
                  ? 'border-rose-400/20 bg-rose-500/10'
                  : 'border-rose-200 bg-rose-50/90'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600">
                  <AlertTriangle size={16} aria-hidden />
                  根因摘要
                </span>
                {rootCause.serviceName ? <span className={`text-xs font-mono ${textMuted(theme)}`}>{rootCause.serviceName}</span> : null}
                {rootCause.operationName ? <span className={`text-xs ${textMuted(theme)}`}>{rootCause.operationName}</span> : null}
              </div>
              <p className={`mt-2 text-sm leading-6 ${textPrimary(theme)}`}>{rootCause.message}</p>
            </div>
          ) : null}
        </BentoCard>

        <BentoCard theme={theme}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className={`text-sm font-semibold ${textPrimary(theme)}`}>Waterfall 时间线</h4>
              <p className={`mt-1 text-xs ${textMuted(theme)}`}>按开始时间和耗时展示关键路径，点击任意 Span 会同步更新证据区。</p>
            </div>
          </div>
          {(treeModel.ordered.length ?? 0) === 0 ? (
            <div className={`mt-4 text-sm ${textMuted(theme)}`}>当前 Trace 还没有可展示的 Span。</div>
          ) : (
            <div className="mt-4 space-y-2">
              {treeModel.ordered.map((node) => {
                const bar = formatTimelineWidth(treeModel.totalDurationMs, node);
                const isActive = node.id === selectedSpan?.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setActiveSpanId(node.id)}
                    className={`w-full rounded-[1.15rem] border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? theme === 'dark'
                          ? 'border-sky-400/35 bg-sky-500/10'
                          : 'border-sky-200 bg-sky-50'
                        : theme === 'dark'
                          ? 'border-white/8 hover:bg-white/[0.03]'
                          : 'border-slate-100 hover:bg-slate-50/90'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-semibold ${textPrimary(theme)}`}>{node.operationName}</span>
                          <span className={`text-xs font-mono ${textMuted(theme)}`}>{node.serviceName}</span>
                          <span className={tracePill(theme, node.status)}>{distributedTraceStatusLabelZh(node.status)}</span>
                        </div>
                        <div className={`mt-1 text-xs ${textMuted(theme)}`}>
                          +{formatDuration(node.relativeStartMs)} 开始 · {formatDuration(node.duration)}
                        </div>
                      </div>
                      <div className="w-full md:w-[48%]">
                        <div className={`relative h-3 overflow-hidden rounded-full ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                          <div
                            className={`absolute top-0 h-full rounded-full ${
                              node.status === 'error' ? 'bg-rose-500/80' : 'bg-emerald-500/80'
                            }`}
                            style={bar}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </BentoCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <BentoCard theme={theme}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className={`text-sm font-semibold ${textPrimary(theme)}`}>Span 调用树</h4>
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>失败节点会显著高亮，展开后可以查看完整的平台内多跳链路。</p>
              </div>
            </div>
            {(treeModel.roots.length ?? 0) === 0 ? (
              <div className={`mt-4 text-sm ${textMuted(theme)}`}>当前 Trace 还没有结构化的调用树。</div>
            ) : (
              <div className="mt-4 space-y-3">
                {treeModel.roots.map((node) => (
                  <SpanTreeBranch
                    key={node.id}
                    theme={theme}
                    node={node}
                    expanded={expandedSpanIds}
                    activeSpanId={selectedSpan?.id ?? null}
                    onToggle={(spanId) => {
                      setExpandedSpanIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(spanId)) {
                          next.delete(spanId);
                        } else {
                          next.add(spanId);
                        }
                        return next;
                      });
                    }}
                    onSelect={(spanId) => {
                      setActiveSpanId(spanId);
                      setExpandedSpanIds((prev) => {
                        const next = new Set(prev);
                        next.add(spanId);
                        return next;
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </BentoCard>

          <BentoCard theme={theme}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className={`text-sm font-semibold ${textPrimary(theme)}`}>证据区</h4>
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>这里聚焦当前 Span 的 tags、logs 和原始 JSON，方便快速判断问题发生在哪一跳。</p>
              </div>
              {selectedSpan ? (
                <button
                  type="button"
                  className={btnGhost(theme)}
                  onClick={() => void copyText(activeSpanJson, 'Span JSON 已复制')}
                >
                  <Copy size={14} aria-hidden />
                  复制 Span JSON
                </button>
              ) : null}
            </div>

            {selectedSpan ? (
              <div className="mt-4 space-y-4">
                <div className={`rounded-[1.3rem] border px-4 py-3 ${theme === 'dark' ? 'border-white/8 bg-white/[0.04]' : 'border-slate-100 bg-slate-50/80'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold ${textPrimary(theme)}`}>{selectedSpan.operationName}</span>
                    <span className={`text-xs font-mono ${textMuted(theme)}`}>{selectedSpan.serviceName}</span>
                    <span className={tracePill(theme, selectedSpan.status)}>{distributedTraceStatusLabelZh(selectedSpan.status)}</span>
                  </div>
                  <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${textMuted(theme)}`}>
                    <span>SpanId {selectedSpan.id}</span>
                    <span>开始于 {formatDateTime(selectedSpan.startTime)}</span>
                    <span>{formatDuration(selectedSpan.duration)}</span>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className={`rounded-[1.3rem] border p-4 ${theme === 'dark' ? 'border-white/8 bg-white/[0.03]' : 'border-slate-100 bg-white/95'}`}>
                    <div className={`text-sm font-semibold ${textPrimary(theme)}`}>Tags</div>
                    {Object.keys(selectedSpan.tags).length === 0 ? (
                      <div className={`mt-3 text-sm ${textMuted(theme)}`}>当前 Span 暂无 tags。</div>
                    ) : (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {Object.entries(selectedSpan.tags).map(([key, value]) => (
                          <div
                            key={key}
                            className={`rounded-2xl border px-3 py-2 ${theme === 'dark' ? 'border-white/8 bg-slate-950/40' : 'border-slate-100 bg-slate-50/90'}`}
                          >
                            <div className={`text-[11px] uppercase tracking-wide ${textMuted(theme)}`}>{key}</div>
                            <div className={`mt-1 text-sm break-words ${textPrimary(theme)}`}>{String(value)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`rounded-[1.3rem] border p-4 ${theme === 'dark' ? 'border-white/8 bg-white/[0.03]' : 'border-slate-100 bg-white/95'}`}>
                    <div className={`text-sm font-semibold ${textPrimary(theme)}`}>Logs</div>
                    {(selectedSpan.logs.length ?? 0) === 0 ? (
                      <div className={`mt-3 text-sm ${textMuted(theme)}`}>当前 Span 暂无 logs。</div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {selectedSpan.logs.map((log, index) => (
                          <div
                            key={`${log.timestamp}-${index}`}
                            className={`rounded-2xl border px-3 py-3 ${theme === 'dark' ? 'border-white/8 bg-slate-950/40' : 'border-slate-100 bg-slate-50/90'}`}
                          >
                            <div className={`text-xs font-mono ${textMuted(theme)}`}>{log.timestamp || '—'}</div>
                            <div className={`mt-2 text-sm ${textPrimary(theme)}`}>{log.message || '—'}</div>
                            {Object.keys(log.context).length > 0 ? (
                              <pre className={`mt-3 overflow-x-auto rounded-xl p-3 text-xs ${theme === 'dark' ? 'bg-slate-950/70 text-slate-200' : 'bg-white text-slate-700'}`}>
                                {JSON.stringify(log.context, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={`rounded-[1.3rem] border p-4 ${theme === 'dark' ? 'border-white/8 bg-white/[0.03]' : 'border-slate-100 bg-white/95'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className={`text-sm font-semibold ${textPrimary(theme)}`}>Raw JSON</div>
                    <button
                      type="button"
                      className={btnGhost(theme)}
                      onClick={() => void copyText(activeSpanJson, 'Span JSON 已复制')}
                    >
                      <Copy size={14} aria-hidden />
                      复制
                    </button>
                  </div>
                  <pre className={`mt-3 overflow-x-auto rounded-[1.1rem] p-4 text-xs leading-6 ${theme === 'dark' ? 'bg-slate-950/70 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
                    {activeSpanJson}
                  </pre>
                </div>
              </div>
            ) : (
              <div className={`mt-4 text-sm ${textMuted(theme)}`}>先从时间线或调用树里选中一个 Span。</div>
            )}
          </BentoCard>
        </div>

        <BentoCard theme={theme}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className={`text-sm font-semibold ${textPrimary(theme)}`}>关联调用日志</h4>
              <p className={`mt-1 text-xs ${textMuted(theme)}`}>Trace 与 gateway call log 已打通，可以直接回到日志页继续筛查。</p>
            </div>
            <button
              type="button"
              className={btnSecondary(theme)}
              onClick={() => openCallLogs(summary.traceId)}
            >
              <ExternalLink size={15} aria-hidden />
              打开日志页
            </button>
          </div>
          {(callLogs.length ?? 0) === 0 ? (
            <div className={`mt-4 text-sm ${textMuted(theme)}`}>当前 Trace 没有关联的调用日志记录。</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['时间', '方法', '状态', '状态码', '耗时', '错误信息'].map((header) => (
                      <th key={header} className={tableHeadCell(theme)}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {callLogs.map((log, index) => (
                    <tr key={`${log.id}-${log.createdAt}`} className={tableBodyRow(theme, index)}>
                      <td className={tableCell()}>{formatDateTime(log.createdAt)}</td>
                      <td className={`${tableCell()} font-mono`}>{log.method || '—'}</td>
                      <td className={tableCell()}>
                        <span className={tracePill(theme, log.status === 'success' ? 'success' : 'error')}>
                          {distributedTraceStatusLabelZh(log.status)}
                        </span>
                      </td>
                      <td className={tableCell()}>{log.statusCode}</td>
                      <td className={tableCell()}>{formatDuration(log.latencyMs)}</td>
                      <td className={tableCell()}>
                        <TableCellEllipsis text={log.errorMessage} className={textSecondary(theme)} emptyLabel="—" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BentoCard>
      </div>
    );
  })();

  const toolbar = (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`text-xs ${textMuted(theme)}`}>
          最近失败优先，共 {total} 条 trace
        </div>
        <button type="button" className={btnGhost(theme)} onClick={refreshAll}>
          <RefreshCw size={15} aria-hidden className={traceListQ.isFetching || traceDetailQ.isFetching ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_repeat(4,minmax(0,0.82fr))]">
        <div className="min-w-0">
          <SearchInput
            value={keywordInput}
            onChange={setKeywordInput}
            placeholder="搜索 traceId、requestId、资源编码或显示名"
            theme={theme}
            ariaLabel="搜索 trace"
          />
        </div>
        <FilterSelect
          value={status}
          onChange={(value) => commitParams((next) => {
            if (value === 'all') next.delete('status');
            else next.set('status', value);
            next.delete('page');
          })}
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'error', label: '仅失败' },
            { value: 'success', label: '仅成功' },
          ]}
          theme={theme}
        />
        <FilterSelect
          value={resourceType}
          onChange={(value) => commitParams((next) => {
            if (value === 'all') next.delete('resourceType');
            else next.set('resourceType', value);
            next.delete('resourceId');
            next.delete('page');
          })}
          options={[
            { value: 'all', label: '全部资源类型' },
            ...RESOURCE_TYPES.map((item) => ({ value: item, label: resourceTypeLabel(item) })),
          ]}
          theme={theme}
        />
        <FilterSelect
          value={resourceId}
          onChange={(value) => commitParams((next) => {
            if (!value) next.delete('resourceId');
            else next.set('resourceId', value);
            next.delete('page');
          })}
          options={[
            { value: '', label: resourceType === 'all' ? '先选择资源类型' : '全部资源' },
            ...resourceOptions.map((item) => ({ value: String(item.id), label: item.displayName })),
          ]}
          theme={theme}
          disabled={resourceType === 'all'}
        />
        <div className="grid grid-cols-2 gap-2">
          <LantuDateTimePicker
            theme={theme}
            mode="datetime"
            value={from}
            onChange={(value) => commitParams((next) => {
              if (value) next.set('from', value);
              else next.delete('from');
              next.delete('page');
            })}
            placeholder="开始时间"
            compact
          />
          <LantuDateTimePicker
            theme={theme}
            mode="datetime"
            value={to}
            onChange={(value) => commitParams((next) => {
              if (value) next.set('to', value);
              else next.delete('to');
              next.delete('page');
            })}
            placeholder="结束时间"
            compact
          />
        </div>
      </div>
    </div>
  );

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
      <div className="px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(340px,0.82fr)_minmax(0,1.18fr)]">
          <GlassPanel theme={theme} padding="sm" className="flex min-h-[40rem] flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className={`text-sm font-semibold ${textPrimary(theme)}`}>Trace 结果集</div>
                <div className={`mt-1 text-xs ${textMuted(theme)}`}>失败请求优先排序，点击后右侧恢复到对应的排障工作区。</div>
              </div>
              <span className={`text-xs ${textMuted(theme)}`}>{page}/{Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)} 页</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {traceListBody}
            </div>
            <div className="border-t px-3 py-3">
              <Pagination theme={theme} page={page} pageSize={PAGE_SIZE} total={total} onChange={(nextPage) => commitParams((next) => next.set('page', String(nextPage)), false)} />
            </div>
          </GlassPanel>

          <div className="min-w-0">
            {detailBody}
          </div>
        </div>
      </div>
    </MgmtPageShell>
  );
};
