/**
 * MCP 网关 invoke 响应解析：工具列表、JSON-RPC 错误、结果摘要（纯函数，便于测试与复用）。
 */

export const MCP_JSONRPC_METHODS = [
  'initialize',
  'notifications/initialized',
  'tools/list',
  'tools/call',
] as const;

/**
 * MCP `initialize` 最小合法参数。仅发送 `params: {}` 时，多数服务端会返回 JSON-RPC -32602（Invalid params）。
 * @see Model Context Protocol 规范：InitializeRequest 须含 protocolVersion、capabilities、clientInfo。
 */
export const MCP_DEFAULT_INITIALIZE_PARAMS: Record<string, unknown> = {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: {
    name: 'LantuConnect-Console',
    version: '1.0.0',
  },
};

export type McpPayloadMode = 'simple' | 'advanced';

export function newMcpTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export type McpToolListItem = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export function tryFormatJsonText(raw: string): { asJson: boolean; text: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { asJson: false, text: '' };
  try {
    return { asJson: true, text: JSON.stringify(JSON.parse(trimmed), null, 2) };
  } catch {
    return { asJson: false, text: raw };
  }
}

/** 从响应体解析 JSON-RPC error（支持整段 JSON 或 NDJSON 末行）。 */
export function parseJsonRpcErrorFromBody(raw: string): { code: number; message: string; data?: unknown } | null {
  const tryOne = (trimmed: string): { code: number; message: string; data?: unknown } | null => {
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      const o = parsed as Record<string, unknown>;
      if (!('jsonrpc' in o)) return null;
      if (o.error == null || typeof o.error !== 'object' || Array.isArray(o.error)) return null;
      const err = o.error as Record<string, unknown>;
      const code = typeof err.code === 'number' ? err.code : -1;
      const message = typeof err.message === 'string' ? err.message : 'Unknown error';
      return { code, message, data: err.data };
    } catch {
      return null;
    }
  };

  const trimmed = raw.trim();
  if (!trimmed) return null;
  const whole = tryOne(trimmed);
  if (whole) return whole;
  const lines = raw.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const e = tryOne(lines[i]!.trim());
    if (e) return e;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

/** 从任意 JSON-RPC 成功响应对象取出 result。 */
export function parseJsonRpcResultFromParsed(parsed: Record<string, unknown>): unknown {
  if ('result' in parsed) return parsed.result;
  const data = parsed.data;
  if (typeof data === 'string') {
    try {
      const inner = JSON.parse(data) as unknown;
      const rec = asRecord(inner);
      if (rec && 'result' in rec) return rec.result;
    } catch {
      /* ignore */
    }
  }
  const rec = asRecord(data);
  if (rec && 'result' in rec) return rec.result;
  return undefined;
}

function tryParseJsonObjectLine(line: string): Record<string, unknown> | null {
  const t = line.trim();
  if (!t) return null;
  try {
    const v = JSON.parse(t) as unknown;
    return asRecord(v);
  } catch {
    return null;
  }
}

/** 从 invoke 响应 body 中解析 tools/list 的 tools 数组。 */
export function parseToolsListFromInvokeBody(body: string): { ok: true; tools: McpToolListItem[] } | { ok: false; message: string } {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, message: '响应体为空，无法解析工具列表' };

  const tryExtractTools = (result: unknown): McpToolListItem[] | null => {
    const r = asRecord(result);
    if (!r) return null;
    const tools = r.tools;
    if (!Array.isArray(tools)) return null;
    const out: McpToolListItem[] = [];
    for (const t of tools) {
      const tr = asRecord(t);
      if (!tr) continue;
      const name = typeof tr.name === 'string' ? tr.name.trim() : '';
      if (!name) continue;
      const description = typeof tr.description === 'string' ? tr.description : undefined;
      const schemaRaw = tr.inputSchema;
      const inputSchema =
        schemaRaw !== null && typeof schemaRaw === 'object' && !Array.isArray(schemaRaw)
          ? (schemaRaw as Record<string, unknown>)
          : undefined;
      out.push({ name, description, inputSchema });
    }
    return out;
  };

  const attemptOnObject = (obj: Record<string, unknown>): { ok: true; tools: McpToolListItem[] } | { ok: false; message: string } => {
    const err = parseJsonRpcErrorFromBody(JSON.stringify(obj));
    if (err) return { ok: false, message: `JSON-RPC 错误 ${err.code}：${err.message}` };
    const res = parseJsonRpcResultFromParsed(obj);
    const tools = tryExtractTools(res);
    if (!tools) return { ok: false, message: '响应中未找到 result.tools 数组（可能网关包装与标准 JSON-RPC 不一致）' };
    return { ok: true, tools };
  };

  const single = tryParseJsonObjectLine(trimmed);
  if (single) {
    const inner = attemptOnObject(single);
    if (inner.ok === true) return inner;
    if (inner.message.includes('未找到')) return inner;
  }

  const lines = body.split(/\r?\n/).filter((l) => l.trim());
  for (let i = lines.length - 1; i >= 0; i--) {
    const obj = tryParseJsonObjectLine(lines[i]!);
    if (!obj) continue;
    const inner = attemptOnObject(obj);
    if (inner.ok === true) return inner;
    if (inner.message.includes('JSON-RPC 错误')) return inner;
  }

  return { ok: false, message: '无法从响应中解析 tools/list 结果' };
}

/** 从 tools/call 类响应中提取可读文本摘要（MCP content 数组中的 text）。 */
export function tryParseJsonObject(input: string): { ok: true; payload?: Record<string, unknown>; message?: string } | { ok: false; message: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true };
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: '调用参数必须是 JSON 对象' };
    }
    return { ok: true, payload: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, message: '调用参数 JSON 解析失败' };
  }
}

export function buildMcpInvokePayload(
  mcpPayloadMode: McpPayloadMode,
  invokePayload: string,
  mcpMethod: string,
  mcpParamsJson: string,
): { ok: true; payload: Record<string, unknown> } | { ok: false; message: string } {
  if (mcpPayloadMode === 'advanced') {
    const parsed = tryParseJsonObject(invokePayload);
    if (!parsed.ok) return { ok: false, message: parsed.message };
    const raw = parsed.payload;
    if (!raw || Object.keys(raw).length === 0) {
      return { ok: true, payload: { method: 'initialize', params: { ...MCP_DEFAULT_INITIALIZE_PARAMS } } };
    }
    return { ok: true, payload: raw };
  }
  const trimmed = mcpParamsJson.trim() || '{}';
  try {
    const params = JSON.parse(trimmed);
    if (params === null || typeof params !== 'object' || Array.isArray(params)) {
      return { ok: false, message: 'params 须为 JSON 对象' };
    }
    return { ok: true, payload: { method: mcpMethod, params } };
  } catch {
    return { ok: false, message: 'params JSON 解析失败' };
  }
}

export function validateMcpInvokePayload(payload: Record<string, unknown>, opts: {
  hasApiKey: boolean;
  hasResourceId: boolean;
  invokeTimeoutSec: number;
  invokeUseStream: boolean;
}): string | null {
  if (!opts.hasApiKey) return 'API Key 为空，请先填写可用的 X-Api-Key';
  if (!opts.hasResourceId) return '资源ID为空，请重新选择资源后重试';
  const maxSec = opts.invokeUseStream ? 600 : 120;
  if (!Number.isFinite(opts.invokeTimeoutSec) || opts.invokeTimeoutSec < 1 || opts.invokeTimeoutSec > maxSec) {
    return opts.invokeUseStream
      ? `超时秒数必须为 1~${maxSec}（流式与网关上限一致）`
      : '超时秒数必须为 1~120 之间的数字';
  }
  const method = payload.method;
  if (typeof method !== 'string' || !method.trim()) return 'payload.method 不能为空';
  const params = payload.params;
  if (params !== undefined && (typeof params !== 'object' || params === null || Array.isArray(params))) {
    return 'payload.params 必须为 JSON 对象';
  }
  if (method === 'tools/call') {
    const obj = (params ?? {}) as Record<string, unknown>;
    if (typeof obj.name !== 'string' || !obj.name.trim()) return 'tools/call 时 params.name 不能为空';
    if (typeof obj.arguments !== 'object' || obj.arguments === null || Array.isArray(obj.arguments)) {
      return 'tools/call 时 params.arguments 必须是 JSON 对象';
    }
  }
  return null;
}

export function extractParamsFromMcpPayload(obj: Record<string, unknown>): Record<string, unknown> {
  const p = obj.params;
  if (p !== undefined && typeof p === 'object' && p !== null && !Array.isArray(p)) {
    return { ...(p as Record<string, unknown>) };
  }
  const next = { ...obj };
  delete next.method;
  return next;
}

export function extractMcpContentSummary(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;

  const lines = trimmed.split(/\r?\n/);
  const candidates: Record<string, unknown>[] = [];
  const first = tryParseJsonObjectLine(trimmed);
  if (first) candidates.push(first);
  for (let i = lines.length - 1; i >= 0; i--) {
    const o = tryParseJsonObjectLine(lines[i]!);
    if (o) candidates.push(o);
  }

  for (const obj of candidates) {
    const err = parseJsonRpcErrorFromBody(JSON.stringify(obj));
    if (err) continue;
    const res = parseJsonRpcResultFromParsed(obj);
    const rec = asRecord(res);
    if (!rec) continue;
    const content = rec.content;
    if (!Array.isArray(content)) continue;
    const texts: string[] = [];
    for (const c of content) {
      const cr = asRecord(c);
      if (!cr) continue;
      if (cr.type === 'text' && typeof cr.text === 'string') texts.push(cr.text);
    }
    if (texts.length) return texts.join('\n\n');
  }
  return null;
}
