/** Agent 监控 · 演示 KPI */
export const AGENT_MONITOR_KPIS = [
  { id: 'qps', label: '实时 QPS', value: '42', unit: '', trend: '+8%', up: true },
  { id: 'p99', label: 'P99 延迟', value: '186', unit: 'ms', trend: '-12ms', up: false },
  { id: 'err', label: '错误率', value: '0.32', unit: '%', trend: '+0.02%', up: true },
  { id: 'succ', label: '成功率', value: '99.68', unit: '%', trend: '+0.1%', up: true },
];

export interface AgentLatencyRow {
  agentName: string;
  p50: number;
  p99: number;
  qps: number;
  errors: number;
}

export const MOCK_AGENT_LATENCY: AgentLatencyRow[] = [
  { agentName: '学生办事助手', p50: 120, p99: 340, qps: 18, errors: 2 },
  { agentName: '教务查询助手', p50: 95, p99: 280, qps: 12, errors: 0 },
  { agentName: '智能问答', p50: 210, p99: 890, qps: 6, errors: 5 },
];

/** Trace 演示 */
export interface TraceSpan {
  id: string;
  name: string;
  service: string;
  durationMs: number;
  status: 'ok' | 'error';
  children?: TraceSpan[];
}

export const MOCK_TRACE_ROOT: TraceSpan = {
  id: 'tr-1',
  name: 'POST /v1/agents/chat',
  service: 'gateway',
  durationMs: 842,
  status: 'ok',
  children: [
    {
      id: 'tr-2',
      name: 'auth.verify',
      service: 'iam',
      durationMs: 12,
      status: 'ok',
    },
    {
      id: 'tr-3',
      name: 'agent.invoke',
      service: 'agent-runtime',
      durationMs: 780,
      status: 'ok',
      children: [
        { id: 'tr-4', name: 'llm.completion', service: 'model-proxy', durationMs: 620, status: 'ok' },
        { id: 'tr-5', name: 'tool.mcp.fetch', service: 'mcp-bridge', durationMs: 98, status: 'ok' },
      ],
    },
  ],
};

export interface TraceListItem {
  traceId: string;
  startedAt: string;
  durationMs: number;
  status: 'ok' | 'error';
  route: string;
}

export const MOCK_TRACE_LIST: TraceListItem[] = [
  { traceId: 'a3f2c9…8e1', startedAt: '14:32:01', durationMs: 842, status: 'ok', route: '/v1/agents/chat' },
  { traceId: 'b7d1e4…2a0', startedAt: '14:31:48', durationMs: 12040, status: 'error', route: '/v1/agents/chat' },
  { traceId: 'c9e8f1…5b3', startedAt: '14:31:22', durationMs: 156, status: 'ok', route: '/v1/tools/list' },
];
