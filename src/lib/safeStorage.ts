/** localStorage 安全与体积：校验结构、截断、防异常大包拖垮页面 */

export const MAX_STORED_API_KEY_LENGTH = 8192;
export const MAX_PLAYGROUND_HISTORY_ITEMS = 24;
export const MAX_PLAYGROUND_BODY_CHARS = 24_000;
export const MAX_PLAYGROUND_URL_LENGTH = 4096;
export const MAX_WORKSPACE_AGENT_IDS = 500;

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

export interface PlaygroundHistoryEntry {
  method: string;
  url: string;
  status: number;
  time: number;
  body: string;
  responseBody: string;
}

export function truncateForStorage(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… [已截断 ${text.length - max} 字符]`;
}

export function readBoundedLocalStorage(key: string, maxLen: number): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v == null) return null;
    if (v.length > maxLen) return null;
    return v;
  } catch {
    return null;
  }
}

export function normalizePlaygroundHistory(entries: unknown): PlaygroundHistoryEntry[] {
  if (!Array.isArray(entries)) return [];
  const out: PlaygroundHistoryEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    const methodRaw = typeof o.method === 'string' ? o.method.toUpperCase() : 'GET';
    if (!HTTP_METHODS.has(methodRaw)) continue;
    const url = typeof o.url === 'string' ? o.url : '';
    if (url.length > MAX_PLAYGROUND_URL_LENGTH) continue;
    const status = typeof o.status === 'number' && Number.isFinite(o.status) ? o.status : 0;
    const time = typeof o.time === 'number' && Number.isFinite(o.time) ? o.time : 0;
    const body = typeof o.body === 'string' ? truncateForStorage(o.body, MAX_PLAYGROUND_BODY_CHARS) : '';
    const responseBody =
      typeof o.responseBody === 'string' ? truncateForStorage(o.responseBody, MAX_PLAYGROUND_BODY_CHARS) : '';
    out.push({ method: methodRaw, url, status, time, body, responseBody });
    if (out.length >= MAX_PLAYGROUND_HISTORY_ITEMS) break;
  }
  return out;
}

export function parsePlaygroundHistoryFromStorage(raw: string | null): PlaygroundHistoryEntry[] {
  if (!raw) return [];
  try {
    return normalizePlaygroundHistory(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function parseQuickLinkIds(raw: string | null, fallback: readonly string[], allowed: Set<string>): string[] {
  try {
    const parsed = JSON.parse(raw ?? 'null') as unknown;
    if (!Array.isArray(parsed)) {
      return fallback.filter((id) => allowed.has(id));
    }
    const ids = parsed.filter((x): x is string => typeof x === 'string' && allowed.has(x));
    const uniq = [...new Set(ids)];
    return uniq.length > 0 ? uniq : fallback.filter((id) => allowed.has(id));
  } catch {
    return fallback.filter((id) => allowed.has(id));
  }
}

const AGENT_ID_STORAGE_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export function parseWorkspaceAgentIdsFromStorage(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const ids = parsed
      .filter((x): x is string => typeof x === 'string' && AGENT_ID_STORAGE_PATTERN.test(x))
      .slice(0, MAX_WORKSPACE_AGENT_IDS);
    return [...new Set(ids)];
  } catch {
    return [];
  }
}
