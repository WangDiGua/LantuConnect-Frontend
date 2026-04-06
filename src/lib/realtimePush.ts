import { env } from '../config/env';
import { tokenStorage } from './security';

/** 与 {@link JwtWebSocketHandshakeInterceptor} 约定：query access_token */
export const USER_PUSH_WS_PATH = '/ws/push' as const;

/**
 * 由 API base（HTTP）推导 WebSocket base（WS/WSS），支持绝对 URL 与站点相对路径（如 `/regis`）。
 */
export function resolveUserPushWsBase(): string | null {
  const base = (env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!base) return null;
  if (base.startsWith('http://')) return 'ws://' + base.slice('http://'.length);
  if (base.startsWith('https://')) return 'wss://' + base.slice('https://'.length);
  const pathBase = base.startsWith('/') ? base : `/${base}`;
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.host : '';
  if (!host) return null;
  return `${proto}//${host}${pathBase}`;
}

export function buildUserPushWebSocketUrl(accessToken: string): string | null {
  const wsBase = resolveUserPushWsBase();
  if (!wsBase || !accessToken.trim()) return null;
  const enc = encodeURIComponent(accessToken.trim());
  return `${wsBase}${USER_PUSH_WS_PATH}?access_token=${enc}`;
}

export function readAccessTokenForRealtime(): string | null {
  return tokenStorage.get(env.VITE_TOKEN_KEY);
}

export interface UserPushConnectionOptions {
  /** 收到任意服务端推送时触发（含 notification 事件） */
  onServerPush?: () => void;
  /** 连接异常关闭后的重连间隔 ms，默认 4000；设为 0 不重连 */
  reconnectDelayMs?: number;
}

/**
 * 建立用户级实时推送 WebSocket；返回取消函数（关闭连接并停止重连）。
 */
export function connectUserPushSocket(accessToken: string, opts: UserPushConnectionOptions = {}): () => void {
  const reconnectDelayMs = opts.reconnectDelayMs ?? 4000;
  let ws: WebSocket | null = null;
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const clearRetry = () => {
    if (retryTimer != null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const connect = () => {
    clearRetry();
    if (stopped) return;
    const url = buildUserPushWebSocketUrl(accessToken);
    if (!url) return;
    try {
      ws = new WebSocket(url);
    } catch {
      if (!stopped && reconnectDelayMs > 0) {
        retryTimer = setTimeout(connect, reconnectDelayMs);
      }
      return;
    }
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    ws.onmessage = () => {
      opts.onServerPush?.();
    };
    ws.onopen = () => {
      clearRetry();
      pingTimer = setInterval(() => {
        if (ws != null && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'ping', v: 1 }));
          } catch {
            /* ignore */
          }
        }
      }, 25_000);
    };
    ws.onerror = () => {
      /* 具体原因见 onclose */
    };
    ws.onclose = (ev) => {
      if (pingTimer != null) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      ws = null;
      if (stopped || reconnectDelayMs <= 0) return;
      if (ev.code === 1000 || ev.code === 1001) return;
      retryTimer = setTimeout(connect, reconnectDelayMs);
    };
  };

  connect();

  return () => {
    stopped = true;
    clearRetry();
    try {
      ws?.close(1000, 'client dispose');
    } catch {
      /* ignore */
    }
    ws = null;
  };
}
