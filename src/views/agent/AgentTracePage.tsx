import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { GitBranch, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { SearchInput } from '../../components/common';
import { EmptyState } from '../../components/common/EmptyState';
import { monitoringService } from '../../api/services/monitoring.service';
import type { TraceSpan as TraceSpanDTO } from '../../types/dto/monitoring';
import {
  btnGhost, pageBlockStack, textPrimary, textSecondary, textMuted,
} from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { TOOLBAR_ROW_LIST } from '../../utils/toolbarFieldClasses';

interface AgentTracePageProps {
  theme: Theme;
  fontSize: FontSize;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
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

interface TraceGroup {
  traceId: string;
  listItem: TraceListItem;
  rootDisplay: DisplaySpan;
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

/** 将同一 trace 下的扁平 span 组装为树（对齐 GET /monitoring/traces 扁平分页返回） */
function buildTraceGroups(flat: TraceSpanDTO[]): TraceGroup[] {
  const byTrace = new Map<string, TraceSpanDTO[]>();
  for (const s of flat) {
    const tid = s.traceId || '';
    if (!tid) continue;
    const arr = byTrace.get(tid) ?? [];
    arr.push(s);
    byTrace.set(tid, arr);
  }

  const groups: TraceGroup[] = [];
  for (const [traceId, spans] of byTrace) {
    const byId = new Map<string, TraceSpanDTO & { children?: TraceSpanDTO[] }>();
    for (const s of spans) {
      byId.set(s.id, { ...s, children: [] });
    }
    let rootDto: TraceSpanDTO | null = null;
    for (const s of spans) {
      if (!s.parentId) {
        rootDto = s;
        break;
      }
    }
    if (!rootDto) rootDto = spans[0];

    for (const s of spans) {
      const node = byId.get(s.id)!;
      if (s.parentId) {
        const p = byId.get(s.parentId);
        if (p) {
          if (!p.children) p.children = [];
          p.children.push(node);
        }
      }
    }
    const rootNode = byId.get(rootDto.id);
    if (!rootNode) continue;

    const rootDisplay = dtoToDisplaySpan(rootNode);
    const maxDur = spans.reduce((m, x) => Math.max(m, x.duration), 0);
    const anyErr = spans.some((x) => x.status === 'error');
    const listItem: TraceListItem = {
      traceId,
      startedAt: rootDto.startTime,
      durationMs: maxDur,
      status: anyErr ? 'error' : 'ok',
      route: rootDto.operationName,
    };
    groups.push({ traceId, listItem, rootDisplay });
  }

  groups.sort((a, b) => String(b.listItem.startedAt).localeCompare(String(a.listItem.startedAt)));
  return groups;
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
        aria-expanded={hasChildren ? open : undefined}
        aria-label={hasChildren ? `${open ? '折叠' : '展开'}子跨度：${span.name}` : `${span.name}，${span.durationMs} 毫秒`}
      >
        {hasChildren ? (
          open ? <ChevronDown size={16} className="shrink-0 mt-0.5 text-slate-400" aria-hidden /> : <ChevronRight size={16} className="shrink-0 mt-0.5 text-slate-400" aria-hidden />
        ) : (
          <span className="w-4 shrink-0" aria-hidden />
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

const PAGE_DESC = '数据源：GET /monitoring/traces。网关对 Agent / Skill / MCP / App / Dataset 的调用可共享 TraceId；列表按 Trace 聚合，右侧为拼接后的调用树。';

export const AgentTracePage: React.FC<AgentTracePageProps> = ({ theme, fontSize, showMessage }) => {
  const isDark = theme === 'dark';
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<TraceGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchTraces = useCallback(async () => {
    setLoading(true);
    try {
      const result = await monitoringService.listTraces({ page: 1, pageSize: 100 });
      const built = buildTraceGroups(result.list);
      setGroups(built);
      if (built.length > 0) {
        const first = built[0];
        setSelectedId(first.traceId);
        setExpanded(new Set([first.rootDisplay.id]));
      } else {
        setSelectedId(null);
        setExpanded(new Set());
      }
    } catch (err) {
      console.error('Failed to load traces:', err);
      showMessage?.('调用链数据加载失败，请稍后重试', 'error');
      setGroups([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => { void fetchTraces(); }, [fetchTraces]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.filter((g) => g.traceId.toLowerCase().includes(t) || g.listItem.route.toLowerCase().includes(t));
  }, [q, groups]);

  const selectedGroup = useMemo(() => {
    if (!selectedId) return list[0] ?? null;
    return list.find((g) => g.traceId === selectedId) ?? list[0] ?? null;
  }, [selectedId, list]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const traceToolbar = (
    <div className={`${TOOLBAR_ROW_LIST} w-full justify-end flex-wrap gap-2`}>
      <SearchInput
        value={q}
        onChange={setQ}
        placeholder="Trace ID 或入口路由…"
        theme={theme}
        ariaLabel="按 Trace ID 或路由筛选"
        className="max-w-md flex-1 min-w-[12rem]"
      />
      <button
        type="button"
        className={btnGhost(theme)}
        onClick={() => void fetchTraces()}
        disabled={loading}
        aria-label="刷新 Trace 列表"
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden />
        刷新
      </button>
    </div>
  );

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={GitBranch}
      breadcrumbSegments={['资源与运营', '调用追踪']}
      description={PAGE_DESC}
      toolbar={traceToolbar}
      contentScroll="document"
    >
      <div className={`px-4 sm:px-6 pb-8 ${pageBlockStack}`}>
        {loading ? (
          <PageSkeleton type="table" />
        ) : list.length === 0 ? (
          <EmptyState
            title="暂无 Trace"
            description="尚未记录调用链路。完成若干次网关调用后刷新；本地演示库可执行 sql/migrations 中的 resource_ops 演示脚本写入示例数据。"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-4">
            <GlassPanel theme={theme} padding="sm" className="max-h-[520px] flex flex-col overflow-hidden">
              <div className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider border-b shrink-0 ${isDark ? 'border-white/[0.06] text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                最近 Trace（已聚合）
              </div>
              <ul className="overflow-y-auto flex-1">
                {list.map((g) => (
                  <li key={g.traceId} className={`border-b last:border-0 ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(g.traceId)}
                      className={`w-full text-left px-4 py-3 transition-colors ${selectedId === g.traceId ? (isDark ? 'bg-neutral-900/10' : 'bg-neutral-100/60') : (isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50')}`}
                      aria-current={selectedId === g.traceId ? 'true' : undefined}
                    >
                      <div className={`font-mono text-xs truncate ${textPrimary(theme)}`}>{g.traceId}</div>
                      <div className={`text-[11px] mt-1 ${textMuted(theme)}`}>{g.listItem.route}</div>
                      <div className="flex justify-between mt-1.5 text-[11px]">
                        <span className={textMuted(theme)}>{g.listItem.startedAt}</span>
                        <span className={`tabular-nums ${textSecondary(theme)}`}>{g.listItem.durationMs} ms</span>
                        <span className={g.listItem.status === 'error' ? 'text-rose-500 font-semibold' : 'text-emerald-500'}>{g.listItem.status}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </GlassPanel>

            <BentoCard theme={theme} className="min-h-[320px]">
              <h3 className={`text-sm font-bold mb-4 ${textPrimary(theme)}`}>
                调用链
                {selectedGroup && <span className={`ml-2 font-mono text-xs font-normal ${textMuted(theme)}`}>{selectedGroup.traceId}</span>}
              </h3>
              {selectedGroup ? (
                <SpanTree span={selectedGroup.rootDisplay} depth={0} theme={theme} expanded={expanded} toggle={toggle} />
              ) : (
                <p className={`text-sm ${textMuted(theme)}`}>请选择一条 Trace</p>
              )}
            </BentoCard>
          </div>
        )}
      </div>
    </MgmtPageShell>
  );
};
