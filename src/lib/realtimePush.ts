import { env } from '../config/env';
import { tokenStorage } from './security';

/** 与 {@link JwtWebSocketHandshakeInterceptor} 约定：query access_token */
export const USER_PUSH_WS_PATH = '/ws/push' as const;

/** 服务端 JSON 事件（v=1） */
export type RealtimeServerMessage = {
  v?: number;
  type?: string;
  action?: string;
  payload?: Record<string, unknown>;
  /** notification / created */
  notification?: unknown;
  unreadCount?: number;
};

const realtimeListeners = new Set<(msg: RealtimeServerMessage) => void>();

/** 订阅解析后的实时消息；返回取消订阅函数。 */
export function subscribeRealtimePush(listener: (msg: RealtimeServerMessage) => void): () => void {
  realtimeListeners.add(listener);
  return () => realtimeListeners.delete(listener);
}

function dispatchRealtime(msg: RealtimeServerMessage) {
  for (const l of realtimeListeners) {
    try {
      l(msg);
    } catch {
      /* isolate subscriber errors */
    }
  }
}

export function isNotificationMessage(msg: RealtimeServerMessage): boolean {
  return msg.type === 'notification';
}

/** 管理端保存健康配置（非探活结果） */
export function isHealthConfigUpdated(msg: RealtimeServerMessage): boolean {
  return msg.type === 'health' && msg.action === 'config_updated';
}

export function isCircuitStateChanged(msg: RealtimeServerMessage): boolean {
  return msg.type === 'circuit' && msg.action === 'state_changed';
}

export function isAlertFiring(msg: RealtimeServerMessage): boolean {
  return msg.type === 'alert' && msg.action === 'firing';
}

export function isAuditPendingChanged(msg: RealtimeServerMessage): boolean {
  return msg.type === 'audit' && msg.action === 'pending_changed';
}

/** 定时探活写入的 health_status 变化 */
export function isHealthProbeStatusChanged(msg: RealtimeServerMessage): boolean {
  return msg.type === 'health' && msg.action === 'probe_status_changed';
}

export function isMonitoringKpiDigest(msg: RealtimeServerMessage): boolean {
  return msg.type === 'monitoring' && msg.action === 'kpi_digest';
}

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
  /** 收到站内通知类推送时触发（type=notification） */
  onServerPush?: () => void;
  /** 连接异常关闭后的重连间隔 ms，默认 4000；设为 0 不重连 */
  reconnectDelayMs?: number;
}

/**
 * 建立用户级实时推送 WebSocket；返回取消函数（关闭连接并停止重连）。
 * {@code getAccessToken} 在每次连接/重连时调用，以便 Token 刷新后使用新凭证。
 */
export function connectUserPushSocket(
  getAccessToken: () => string | null,
  opts: UserPushConnectionOptions = {},
): () => void {
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

  const handleMessage = (data: unknown) => {
    if (typeof data !== 'string') {
      return;
    }
    let parsed: RealtimeServerMessage;
    try {
      parsed = JSON.parse(data) as RealtimeServerMessage;
    } catch {
      return;
    }
    if (parsed.type === 'pong') {
      return;
    }
    dispatchRealtime(parsed);
    if (isNotificationMessage(parsed)) {
      opts.onServerPush?.();
    }
  };

  const connect = () => {
    clearRetry();
    if (stopped) return;
    const token = getAccessToken()?.trim();
    if (!token) return;
    const url = buildUserPushWebSocketUrl(token);
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
    ws.onmessage = (ev) => {
      handleMessage(ev.data);
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
