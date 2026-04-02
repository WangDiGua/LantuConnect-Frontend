import { env } from '../config/env';
import { ApiException } from '../types/api';

export function resolveGatewayRequestUrl(path: string): string {
  const base = String(env.VITE_API_BASE_URL || '/regis').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (/^https?:\/\//i.test(base)) {
    return `${base}${p}`;
  }
  return `${base}${p}`;
}

/**
 * POST 网关流式接口（如 invoke-stream），使用 fetch + ReadableStream，避免 axios 默认 30s 超时中断长连接。
 */
export async function readStreamingInvoke(
  path: string,
  body: unknown,
  headers: Record<string, string>,
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const url = resolveGatewayRequestUrl(path);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
    // 避免向第三方 URL 误带 Cookie；同站点会话由后端与 Bearer 头负责
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let message = `请求失败（HTTP ${res.status}）`;
    try {
      const j = (await res.json()) as { message?: string; code?: number };
      if (j?.message) message = j.message;
    } catch {
      try {
        const t = await res.text();
        if (t) message = t.slice(0, 2000);
      } catch {
        /* noop */
      }
    }
    throw new ApiException({ code: res.status, status: res.status, message });
  }
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('响应不支持流式读取');
  }
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) onChunk(decoder.decode(value, { stream: true }));
  }
  onChunk(decoder.decode());
}
