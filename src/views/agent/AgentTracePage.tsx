import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { GitBranch, Search, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';
import { monitoringService } from '../../api/services/monitoring.service';
import type { TraceSpan as TraceSpanDTO } from '../../types/dto/monitoring';

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
    id: dto.id,
    name: dto.operationName,
    service: dto.serviceName || dto.service,
    durationMs: dto.duration,
    status: dto.status,
    children: dto.children?.map(dtoToDisplaySpan),
  };
}

function dtoToListItem(dto: TraceSpanDTO): TraceListItem {
  return {
    traceId: dto.traceId,
    startedAt: dto.startTime,
    durationMs: dto.duration,
    status: dto.status,
    route: dto.operationName,
  };
}

type SpanTreeProps = {
  span: DisplaySpan;
  depth: number;
  theme: Theme;
  expanded: Set<string>;
  toggle: (id: string) => void;
};

const SpanTree: React.FC<SpanTreeProps> = ({ span, depth, theme, expanded, toggle }) => {
  const isDark = theme === 'dark';
  const hasChildren = span.children && span.children.length > 0;
  const open = expanded.has(span.id);

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-dashed pl-3 border-slate-300 dark:border-white/15' : ''}>
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
            <span className={`font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{span.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-400">{span.service}</span>
            <span className="text-xs tabular-nums text-slate-500">{span.durationMs} ms</span>
            {span.status === 'error' && <span className="text-[10px] font-bold text-red-500">error</span>}
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

export const AgentTracePage: React.FC<AgentTracePageProps> = ({ theme, fontSize }) => {
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      breadcrumbSegments={['Agent 管理', 'Trace追踪']}
      titleIcon={GitBranch}
      description="按 Trace ID 查看调用链路与各阶段耗时"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
            <input type="search" placeholder="Trace ID 或路由…" value={q} onChange={(e) => setQ(e.target.value)} className={toolbarSearchInputClass(theme)} />
          </div>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6">
            <div className={`rounded-2xl border overflow-hidden max-h-[520px] flex flex-col ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-white'}`}>
              <div className={`px-4 py-2.5 text-xs font-bold border-b ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'}`}>最近 Trace</div>
              <ul className="overflow-y-auto custom-scrollbar flex-1">
                {list.map((item) => (
                  <li key={item.traceId} className={`border-b last:border-0 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.traceId)}
                      className={`w-full text-left px-4 py-3 transition-colors ${selectedId === item.traceId ? isDark ? 'bg-blue-500/15' : 'bg-blue-50' : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'}`}
                    >
                      <div className="font-mono text-xs truncate">{item.traceId}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{item.route}</div>
                      <div className="flex justify-between mt-1.5 text-[11px]">
                        <span className="text-slate-500">{item.startedAt}</span>
                        <span className="tabular-nums">{item.durationMs} ms</span>
                        <span className={item.status === 'error' ? 'text-red-500 font-semibold' : 'text-emerald-600'}>{item.status}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-2xl border p-4 sm:p-5 min-h-[320px] ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-white'}`}>
              <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                调用链
                {selectedId && <span className="ml-2 font-mono text-xs font-normal text-slate-500">{selectedId}</span>}
              </h3>
              {selectedSpan ? (
                <SpanTree span={selectedSpan} depth={0} theme={theme} expanded={expanded} toggle={toggle} />
              ) : (
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>暂无 Trace 数据</p>
              )}
            </div>
          </div>
        )}
      </div>
    </MgmtPageShell>
  );
};
