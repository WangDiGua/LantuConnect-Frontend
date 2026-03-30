import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { GitBranch, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { SearchInput } from '../../components/common';
import { monitoringService } from '../../api/services/monitoring.service';
import type { TraceSpan as TraceSpanDTO } from '../../types/dto/monitoring';
import {
  canvasBodyBg, bentoCard, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';

interface AgentTracePageProps {
  theme: Theme;
  fontSize: FontSize;
}

interface DisplaySpan {
  id: string;
  name: string;
  service: string;
  durationMs: number;
  status: 'ok' | 'error';
  children?: DisplaySpan[];
}

interface TraceListItem {
  traceId: string;
  startedAt: string;
  durationMs: number;
  status: 'ok' | 'error';
  route: string;
}

function dtoToDisplaySpan(dto: TraceSpanDTO): DisplaySpan {
  return {
    id: dto.id, name: dto.operationName, service: dto.serviceName || dto.service,
    durationMs: dto.duration, status: dto.status, children: dto.children?.map(dtoToDisplaySpan),
  };
}

function dtoToListItem(dto: TraceSpanDTO): TraceListItem {
  return { traceId: dto.traceId, startedAt: dto.startTime, durationMs: dto.duration, status: dto.status, route: dto.operationName };
}

type SpanTreeProps = { span: DisplaySpan; depth: number; theme: Theme; expanded: Set<string>; toggle: (id: string) => void };

const SpanTree: React.FC<SpanTreeProps> = ({ span, depth, theme, expanded, toggle }) => {
  const isDark = theme === 'dark';
  const hasChildren = span.children && span.children.length > 0;
  const open = expanded.has(span.id);

  return (
    <div className={depth > 0 ? `ml-4 border-l border-dashed pl-3 ${isDark ? 'border-white/10' : 'border-slate-200'}` : ''}>
      <button
        type="button"
        onClick={() => hasChildren && toggle(span.id)}
        className={`w-full text-left flex items-start gap-2 py-2 rounded-lg px-2 -mx-2 ${hasChildren ? (isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50') : ''}`}
      >
        {hasChildren ? (
          open ? <ChevronDown size={16} className="shrink-0 mt-0.5 text-slate-400" /> : <ChevronRight size={16} className="shrink-0 mt-0.5 text-slate-400" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-xs ${textPrimary(theme)}`}>{span.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>{span.service}</span>
            <span className={`text-xs tabular-nums ${textMuted(theme)}`}>{span.durationMs} ms</span>
            {span.status === 'error' && <span className="text-xs font-bold text-rose-500">error</span>}
          </div>
        </div>
      </button>
      {hasChildren && open && (
        <div className="mt-1">
          {span.children!.map((c) => (
            <SpanTree key={c.id} span={c} depth={depth + 1} theme={theme} expanded={expanded} toggle={toggle} />
          ))}
        </div>
      )}
    </div>
  );
};

export const AgentTracePage: React.FC<AgentTracePageProps> = ({ theme }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [traceList, setTraceList] = useState<TraceListItem[]>([]);
  const [traceSpans, setTraceSpans] = useState<DisplaySpan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchTraces = useCallback(async () => {
    setLoading(true);
    try {
      const result = await monitoringService.listTraces();
      const spans = result.list.map(dtoToDisplaySpan);
      const listItems = result.list.map(dtoToListItem);
      setTraceSpans(spans);
      setTraceList(listItems);
      if (listItems.length > 0) {
        setSelectedId(listItems[0].traceId);
        if (spans.length > 0) setExpanded(new Set([spans[0].id]));
      }
    } catch (err) {
      console.error('Failed to load traces:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTraces(); }, [fetchTraces]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return traceList;
    return traceList.filter((x) => x.traceId.toLowerCase().includes(t) || x.route.toLowerCase().includes(t));
  }, [q, traceList]);

  const selectedSpan = useMemo(() => {
    if (!selectedId) return traceSpans[0] ?? null;
    const idx = traceList.findIndex(t => t.traceId === selectedId);
    return traceSpans[idx] ?? traceSpans[0] ?? null;
  }, [selectedId, traceList, traceSpans]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-300 ${canvasBodyBg(theme)}`}>
      <div className="w-full flex-1 min-h-0 overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-3 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-50'}`}>
              <GitBranch size={20} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
            </div>
            <PageTitleTagline subtitleOnly theme={theme} title={chromePageTitle || '调用追踪'} tagline="按 Trace ID 查看调用链路与各阶段耗时" />
          </div>
          <div className="w-full shrink-0 sm:max-w-xs">
            <SearchInput value={q} onChange={setQ} placeholder="Trace ID 或路由…" theme={theme} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-4">
            {/* Trace List */}
            <GlassPanel theme={theme} padding="sm" className="max-h-[520px] flex flex-col overflow-hidden">
              <div className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider border-b shrink-0 ${isDark ? 'border-white/[0.06] text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                最近 Trace
              </div>
              <ul className="overflow-y-auto flex-1">
                {list.map((item) => (
                  <li key={item.traceId} className={`border-b last:border-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.traceId)}
                      className={`w-full text-left px-4 py-3 transition-colors ${selectedId === item.traceId ? (isDark ? 'bg-neutral-900/10' : 'bg-neutral-100/60') : (isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50')}`}
                    >
                      <div className={`font-mono text-xs truncate ${textPrimary(theme)}`}>{item.traceId}</div>
                      <div className={`text-[11px] mt-1 ${textMuted(theme)}`}>{item.route}</div>
                      <div className="flex justify-between mt-1.5 text-[11px]">
                        <span className={textMuted(theme)}>{item.startedAt}</span>
                        <span className={`tabular-nums ${textSecondary(theme)}`}>{item.durationMs} ms</span>
                        <span className={item.status === 'error' ? 'text-rose-500 font-semibold' : 'text-emerald-500'}>{item.status}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </GlassPanel>

            {/* Trace Detail */}
            <BentoCard theme={theme} className="min-h-[320px]">
              <h3 className={`text-sm font-bold mb-4 ${textPrimary(theme)}`}>
                调用链
                {selectedId && <span className={`ml-2 font-mono text-xs font-normal ${textMuted(theme)}`}>{selectedId}</span>}
              </h3>
              {selectedSpan ? (
                <SpanTree span={selectedSpan} depth={0} theme={theme} expanded={expanded} toggle={toggle} />
              ) : (
                <p className={`text-sm ${textMuted(theme)}`}>暂无 Trace 数据</p>
              )}
            </BentoCard>
          </div>
        )}
      </div>
    </div>
  );
};
