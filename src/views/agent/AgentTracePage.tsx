import React, { useMemo, useState } from 'react';
import { GitBranch, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Theme, FontSize } from '../../types';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { MOCK_TRACE_LIST, MOCK_TRACE_ROOT, type TraceSpan } from '../../constants/agentObservability';
import { TOOLBAR_ROW, toolbarSearchInputClass } from '../../utils/toolbarFieldClasses';

interface AgentTracePageProps {
  theme: Theme;
  fontSize: FontSize;
}

type SpanTreeProps = {
  span: TraceSpan;
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
        className={`w-full text-left flex items-start gap-2 py-2 rounded-lg px-2 -mx-2 ${
          hasChildren ? (isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50') : ''
        }`}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown size={16} className="shrink-0 mt-0.5 text-slate-400" />
          ) : (
            <ChevronRight size={16} className="shrink-0 mt-0.5 text-slate-400" />
          )
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{span.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-400">
              {span.service}
            </span>
            <span className="text-xs tabular-nums text-slate-500">{span.durationMs} ms</span>
            {span.status === 'error' && (
              <span className="text-[10px] font-bold text-red-500">error</span>
            )}
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
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_TRACE_LIST[0]?.traceId ?? null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['tr-1', 'tr-3']));

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return MOCK_TRACE_LIST;
    return MOCK_TRACE_LIST.filter((x) => x.traceId.toLowerCase().includes(t) || x.route.toLowerCase().includes(t));
  }, [q]);

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
      description="按 Trace ID 查看调用链路与各阶段耗时（演示数据）"
      toolbar={
        <div className={TOOLBAR_ROW}>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
              size={16}
            />
            <input
              type="search"
              placeholder="Trace ID 或路由…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={toolbarSearchInputClass(theme)}
            />
          </div>
        </div>
      }
    >
      <div className="min-w-0 px-4 sm:px-6 pb-6 pt-1">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6">
          <div
            className={`rounded-2xl border overflow-hidden max-h-[520px] flex flex-col ${
              isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-white'
            }`}
          >
            <div className={`px-4 py-2.5 text-xs font-bold border-b ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
              最近 Trace
            </div>
            <ul className="overflow-y-auto custom-scrollbar flex-1">
              {list.map((item) => (
                <li key={item.traceId} className={`border-b last:border-0 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.traceId)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedId === item.traceId
                        ? isDark
                          ? 'bg-blue-500/15'
                          : 'bg-blue-50'
                        : isDark
                          ? 'hover:bg-white/[0.04]'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-mono text-xs truncate">{item.traceId}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{item.route}</div>
                    <div className="flex justify-between mt-1.5 text-[11px]">
                      <span className="text-slate-500">{item.startedAt}</span>
                      <span className="tabular-nums">{item.durationMs} ms</span>
                      <span className={item.status === 'error' ? 'text-red-500 font-semibold' : 'text-emerald-600'}>
                        {item.status}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`rounded-2xl border p-4 sm:p-5 min-h-[320px] ${
              isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200/80 bg-white'
            }`}
          >
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              调用链（示例）
              {selectedId && (
                <span className="ml-2 font-mono text-xs font-normal text-slate-500">{selectedId}</span>
              )}
            </h3>
            <SpanTree span={MOCK_TRACE_ROOT} depth={0} theme={theme} expanded={expanded} toggle={toggle} />
            <p className={`text-[11px] mt-6 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              提示：生产环境可对接 OpenTelemetry / Jaeger；此处为固定演示树，切换列表项仅高亮当前 Trace。
            </p>
          </div>
        </div>
      </div>
    </MgmtPageShell>
  );
};
