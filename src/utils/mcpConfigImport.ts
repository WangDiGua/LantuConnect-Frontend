/**
 * 从常见 MCP 客户端配置（mcp.json / Claude mcpServers 等）提取远程 URL 登记所需字段。
 * 纯登记平台：不支持直接落库 command/stdio，仅能提示用户自备 HTTP/ws 边车。
 */

export type McpImportResult = {
  endpoint?: string;
  mcpRegisterMode?: 'http_json' | 'http_sse' | 'websocket' | 'stdio_sidecar';
  authType?: string;
  authConfig?: Record<string, unknown>;
  hint?: string;
};

function mapRemoteEntry(entry: Record<string, unknown>): McpImportResult {
  if (typeof entry.command === 'string') {
    return {
      hint:
        '检测到 command/stdio 类配置。本平台只做目录登记，不托管进程：请先在您侧用边车或隧道把 MCP 暴露为 http(s)/ws(s) URL，再填写服务地址。',
    };
  }
  const urlRaw =
    typeof entry.url === 'string'
      ? entry.url
      : typeof entry.serverUrl === 'string'
        ? entry.serverUrl
        : typeof entry.endpoint === 'string'
          ? entry.endpoint
          : '';
  const url = urlRaw.trim();
  if (!url) {
    return { hint: '未找到 url / serverUrl / endpoint（当前仅解析远程 URL 类 MCP）' };
  }
  const authConfig: Record<string, unknown> = { method: 'tools/call' };
  let authType = 'none';

  if (entry.headers && typeof entry.headers === 'object' && !Array.isArray(entry.headers)) {
    const h = entry.headers as Record<string, unknown>;
    authConfig.headers = { ...h };
    const authz = h.Authorization ?? h.authorization;
    if (typeof authz === 'string') {
      const a = authz.trim();
      if (/^bearer\s+/i.test(a)) {
        authType = 'bearer';
        authConfig.token = a.replace(/^bearer\s+/i, '').trim();
        const nextHeaders = { ...(authConfig.headers as Record<string, unknown>) };
        delete nextHeaders.Authorization;
        delete nextHeaders.authorization;
        authConfig.headers = nextHeaders;
      }
    }
    const xKey = h['X-Api-Key'] ?? h['x-api-key'];
    if (typeof xKey === 'string' && xKey.trim()) {
      authType = 'api_key';
      authConfig.headerName = 'X-Api-Key';
      authConfig.apiKey = xKey.trim();
      const nextHeaders = { ...(authConfig.headers as Record<string, unknown>) };
      delete nextHeaders['X-Api-Key'];
      delete nextHeaders['x-api-key'];
      authConfig.headers = nextHeaders;
    }
  }

  const lower = url.toLowerCase();
  const mcpRegisterMode: McpImportResult['mcpRegisterMode'] =
    lower.startsWith('ws://') || lower.startsWith('wss://') ? 'websocket' : 'http_json';

  return { endpoint: url, mcpRegisterMode, authType, authConfig };
}

/**
 * 粘贴整块 JSON：支持根级含 mcpServers，或直接一个 server 条目对象。
 */
export function parseMcpConfigPaste(text: string): McpImportResult {
  const trimmed = text.trim();
  if (!trimmed) return { hint: '内容为空' };
  let root: unknown;
  try {
    root = JSON.parse(trimmed);
  } catch {
    return { hint: '不是合法 JSON' };
  }
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    return { hint: '根节点须为 JSON 对象' };
  }
  const o = root as Record<string, unknown>;

  const servers = o.mcpServers;
  if (servers && typeof servers === 'object' && !Array.isArray(servers)) {
    const entries = Object.entries(servers as Record<string, unknown>);
    if (entries.length === 0) return { hint: 'mcpServers 为空' };
    const [, first] = entries[0];
    if (!first || typeof first !== 'object' || Array.isArray(first)) {
      return { hint: 'mcpServers 中每一项应为对象' };
    }
    return mapRemoteEntry(first as Record<string, unknown>);
  }

  if (typeof o.url === 'string' || typeof o.serverUrl === 'string' || typeof o.command === 'string') {
    return mapRemoteEntry(o);
  }

  return { hint: '未找到 mcpServers；请输入含 mcpServers 的 JSON，或单个远程 server 对象（含 url）' };
}
