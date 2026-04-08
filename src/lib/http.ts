import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { env } from '../config/env';
import { MAX_STORED_API_KEY_LENGTH, readBoundedLocalStorage } from './safeStorage';
import { tokenStorage } from './security';
import { ApiException, ApiResponse } from '../types/api';

let getToken: () => string | null = () => tokenStorage.get(env.VITE_TOKEN_KEY);
let getRefreshToken: () => string | null = () => tokenStorage.get(env.VITE_REFRESH_TOKEN_KEY);
let getUserId: () => string | null = () => null;
let getLoginName: () => string | null = () => null;
let onLogout: () => void = () => {};
let onRefreshSuccess: (token: string, refresh: string) => void = () => {};
let onServerError: ((message: string) => void) | undefined;
let lastServerErrorToastAt = 0;

/** Optional UI hooks (e.g. global toast). Server / gateway 5xx only — no navigation. */
export function bindHttpUiCallbacks(cbs: { onServerError?: (message: string) => void }) {
  onServerError = cbs.onServerError;
}

/** @returns whether the global toast was actually shown (false when throttled). */
function notifyServerError(message: string): boolean {
  const now = Date.now();
  if (now - lastServerErrorToastAt < 2000) return false;
  lastServerErrorToastAt = now;
  onServerError?.(message);
  return true;
}

export function bindAuthCallbacks(cbs: {
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  getUserId?: () => string | null;
  getLoginName?: () => string | null;
  onLogout: () => void;
  onRefreshSuccess: (token: string, refresh: string) => void;
}) {
  getToken = cbs.getToken;
  getRefreshToken = cbs.getRefreshToken;
  if (cbs.getUserId) getUserId = cbs.getUserId;
  if (cbs.getLoginName) getLoginName = cbs.getLoginName;
  onLogout = cbs.onLogout;
  onRefreshSuccess = cbs.onRefreshSuccess;
}

/** 与 axios 网关请求对齐的鉴权头，供 invoke-stream 等 fetch 长连接使用。 */
export function buildGatewayAuthHeaders(opts: { apiKey: string; traceId?: string }): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Api-Key': opts.apiKey.trim(),
  };
  const trace = opts.traceId?.trim() || buildRequestId();
  headers['X-Trace-Id'] = trace;
  headers['X-Request-Id'] = buildRequestId();
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const userId = getUserId();
  if (userId) headers['X-User-Id'] = userId;
  const loginName = getLoginName();
  if (loginName) headers['X-Username'] = loginName;
  return headers;
}

const instance: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

const API_KEY_STORAGE_KEY = 'lantu_api_key';
const SANDBOX_TOKEN_STORAGE_KEY = 'lantu_sandbox_token';

function getStoredApiKey(): string | null {
  return readBoundedLocalStorage(API_KEY_STORAGE_KEY, MAX_STORED_API_KEY_LENGTH);
}

function getStoredSandboxToken(): string | null {
  return readBoundedLocalStorage(SANDBOX_TOKEN_STORAGE_KEY, MAX_STORED_API_KEY_LENGTH);
}

function buildRequestId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeRequestPath(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    try {
      return new URL(url).pathname || '';
    } catch {
      return url;
    }
  }
  return url;
}

function ensureRequiredHeaders(config: InternalAxiosRequestConfig): void {
  const path = normalizeRequestPath(config.url);
  const headers = config.headers || {};
  const hasApiKey = Boolean(headers['X-Api-Key']);
  const hasSandboxToken = Boolean(headers['X-Sandbox-Token']);
  const hasUserId = Boolean(headers['X-User-Id']);

  if (path === '/invoke' && !hasApiKey) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /invoke 必须提供 X-Api-Key' });
  }
  if (path === '/invoke-stream' && !hasApiKey) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /invoke-stream 必须提供 X-Api-Key' });
  }
  if (path.startsWith('/sdk/v1/') && !hasApiKey) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /sdk/v1/* 必须提供 X-Api-Key' });
  }
  if (path === '/sandbox/invoke' && !hasSandboxToken) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /sandbox/invoke 必须提供 X-Sandbox-Token' });
  }
  if (path === '/sandbox/sessions' && (!hasApiKey || !hasUserId)) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /sandbox/sessions 必须提供 X-User-Id 与 X-Api-Key' });
  }
  if (path.startsWith('/resource-center/resources') && !hasUserId) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /resource-center/resources* 必须提供 X-User-Id' });
  }
  if (path.startsWith('/audit/') && !hasUserId) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /audit/* 必须提供 X-User-Id' });
  }
  if ((path === '/system-config/params' || path === '/system-config/security') && config.method?.toLowerCase() === 'put' && !hasUserId) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 PUT /system-config/params|security 必须提供 X-User-Id' });
  }
  if (path === '/resource-center/skill-external-catalog/settings' && config.method?.toLowerCase() === 'put' && !hasUserId) {
    throw new ApiException({
      code: 1001,
      status: 400,
      message: '调用 PUT /resource-center/skill-external-catalog/settings 必须提供 X-User-Id（请确认已登录）',
    });
  }
  if ((path === '/system-config/network/apply' || path === '/system-config/acl/publish') && config.method?.toLowerCase() === 'post' && !hasUserId) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 POST /system-config/network/apply|acl/publish 必须提供 X-User-Id' });
  }
  if (path === '/reviews' && config.method?.toLowerCase() === 'post' && !hasUserId) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 POST /reviews 必须提供 X-User-Id（请确认已登录且已绑定 getUserId）' });
  }
  if (/^\/reviews\/[^/]+$/.test(path) && config.method?.toLowerCase() === 'delete' && !hasUserId) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 DELETE /reviews/{id} 必须提供 X-User-Id（请确认已登录且已绑定 getUserId）' });
  }
  if (path === '/dashboard/admin-overview' && !hasUserId) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /dashboard/admin-overview 必须提供 X-User-Id' });
  }
  if (path.startsWith('/developer/applications') && !hasUserId) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /developer/applications* 必须提供 X-User-Id' });
  }
  if (path === '/catalog/resolve' && !hasApiKey) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 POST /catalog/resolve 必须提供 X-Api-Key' });
  }
  if (path.startsWith('/catalog/resources') && !hasUserId && !hasApiKey) {
    throw new ApiException({ code: 1001, status: 400, message: '浏览目录接口必须至少提供 X-User-Id（登录）或 X-Api-Key' });
  }
  if (path === '/reviews/page' && !hasUserId && !hasApiKey) {
    throw new ApiException({ code: 1001, status: 400, message: '调用 /reviews/page 必须至少提供 X-User-Id（登录）或 X-Api-Key' });
  }
}

function mapErrorMessage(status: number, code?: number, fallback?: string): string {
  if (status === 401 || code === 1002 || code === 2001 || code === 2002 || code === 2008) {
    return fallback || '认证已失效，请重新登录后重试';
  }
  if (code === 1009) {
    return fallback || '请绑定有效的 X-Api-Key（创建 Key 时的完整 secretPlain）';
  }
  if (status === 403 || code === 1003) {
    return fallback || '无权限执行当前操作（请检查登录态、RBAC 与 API Key scope）';
  }
  if (status === 404 || code === 1004) {
    return fallback || '资源不存在或已删除，请返回列表后重试';
  }
  if (status === 409 || code === 1005 || code === 1006 || code === 4001) {
    return fallback || '当前状态与操作冲突，请刷新状态后重试';
  }
  if (code === 3001) {
    return fallback || '请求过于频繁，请稍后重试';
  }
  if (code === 3002) return fallback || '今日调用额度已用尽，请明日再试';
  if (code === 3003) return fallback || '本月调用额度已用尽，请下月再试';
  if (code === 3004) return fallback || '服务熔断中，请稍后重试';
  if (code === 3005) return fallback || '配额已耗尽，请联系管理员调整';
  if (code === 3006) return fallback || '资源健康检查未通过，暂不可调用';
  if (status === 429) {
    return fallback || '请求过于频繁，请稍后重试';
  }
  if (status === 400 || code === 1001) return fallback || '请求参数错误，请检查必填字段';
  if (code === 1007) return fallback || '文件类型不受支持，请更换上传文件';
  if (code === 1008) return fallback || '文件大小超出限制，请压缩后重试';
  if (code === 2003) return fallback || '账号已锁定，请联系管理员';
  if (code === 2004) return fallback || '用户名或密码错误';
  if (code === 2007) return fallback || '会话校验失败，请刷新后重试';
  if (code === 2009) return fallback || '原密码不正确';
  if (code === 2010) return fallback || '验证码错误，请刷新验证码后重试';
  if (code === 4002) return fallback || '驳回原因不能为空';
  if (code === 4003) return fallback || '名称或编码重复，请修改后重试';
  if (code === 4004) return fallback || '版本号重复，请更换版本号';
  if (code === 4005) return fallback || '已发布资源不允许删除';
  if (code === 4006) return fallback || '当前账号无数据集访问权限';
  if (code === 4007) return fallback || '该资源已收藏';
  if (code === 4008) return fallback || '不能评价自己发布的资源';
  if (code === 4009) return fallback || '系统内置角色不允许删除';
  if (code === 4010) return fallback || '当前业务对象已有待处理的申请';
  if (code === 4011) return fallback || '申请记录不存在';
  if (code === 4012) return fallback || '申请状态已变更，请刷新后重试';
  if (code === 5002) return fallback || '下游服务异常，请稍后重试';
  if (code === 5003) return fallback || '请求超时，请稍后重试';
  if (code === 5004) return fallback || '文件存储失败，请稍后重试';
  if (code === 5005) return fallback || '邮件发送失败，请稍后重试';
  if (status >= 500 || code === 5001) return fallback || '服务器异常，请稍后重试并携带 TraceId 联系管理员';
  return fallback || '请求失败';
}

function readApiErrorDetails(body: ApiResponse<unknown> | undefined): Record<string, string[]> | undefined {
  if (body == null || typeof body !== 'object') return undefined;
  const b = body as { details?: unknown };
  const d = b.details;
  if (d && typeof d === 'object' && !Array.isArray(d)) return d as Record<string, string[]>;
  return undefined;
}

function sanitizeUserMessage(message: string): string {
  if (!message) return message;
  return message
    .replace(/\s*[（(]\s*traceid\s*[:：]\s*[^)）]+\s*[)）]/ig, '')
    .replace(/\s*traceid\s*[:：]\s*[a-z0-9-]+/ig, '')
    .trim();
}

function withPathHint(path: string, message: string): string {
  if ((path === '/invoke' || path.startsWith('/sdk/v1/')) && message.includes('无权限')) {
    return `${message}。调用链路需同时满足：RBAC + API Key scope + 资源发布与网关策略。`;
  }
  if (path === '/catalog/resolve' && message.includes('无权限')) {
    return `${message}。POST /catalog/resolve 须提供有效的 X-Api-Key。`;
  }
  if (path.startsWith('/catalog/resources') && message.includes('无权限')) {
    return `${message}。浏览目录至少需要登录（X-User-Id）或 X-Api-Key。`;
  }
  return message;
}

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config.headers) return config;
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const userId = getUserId();
  if (userId) config.headers['X-User-Id'] = userId;
  const loginName = getLoginName();
  if (loginName) config.headers['X-Username'] = loginName;
  const requestId = buildRequestId();
  const traceId = (config.headers['X-Trace-Id'] as string | undefined) || requestId;
  config.headers['X-Request-Id'] = requestId;
  config.headers['X-Trace-Id'] = traceId;

  if (!config.headers['X-Api-Key']) {
    const path = normalizeRequestPath(config.url);
    const method = (config.method ?? 'get').toLowerCase();
    /** 市场目录 GET 应以登录态 RBAC 为准；自动附带个人 Key 可能与目录裁剪逻辑叠加，导致列表与 solely 登录态不一致 */
    const skipAutoApiKeyForCatalogGet =
      method === 'get' &&
      (path === '/catalog/resources' ||
        path.startsWith('/catalog/resources/trending') ||
        path.startsWith('/catalog/resources/search-suggestions') ||
        /^\/catalog\/resources\/[^/]+\/[^/]+(\/stats)?$/.test(path));
    if (!skipAutoApiKeyForCatalogGet) {
      const apiKey = getStoredApiKey();
      if (apiKey) config.headers['X-Api-Key'] = apiKey;
    }
  }
  if (!config.headers['X-Sandbox-Token']) {
    const sandboxToken = getStoredSandboxToken();
    if (sandboxToken) config.headers['X-Sandbox-Token'] = sandboxToken;
  }
  ensureRequiredHeaders(config);
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  refreshQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  refreshQueue = [];
}

instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const body = response.data;
    if (body && typeof body.code === 'number' && body.code !== 0) {
      if (body.code === 1002) {
        onLogout();
      }
      const baseMsg = mapErrorMessage(response.status, body.code, body.message);
      const traceId = (response.config?.headers?.['X-Trace-Id'] as string | undefined) ?? '';
      const isServerErr = body.code === 5001 || (body.code >= 5000 && body.code < 6000) || response.status >= 500;
      const message = sanitizeUserMessage(baseMsg);
      const serverErrorNotified = isServerErr ? notifyServerError(message) : false;
      return Promise.reject(
        new ApiException({
          code: body.code,
          message,
          status: response.status,
          serverErrorNotified,
        }),
      );
    }
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(instance(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post<ApiResponse<{ token: string; refreshToken: string }>>(
          `${env.VITE_API_BASE_URL}/auth/refresh`,
          { refreshToken },
        );

        const newToken = data.data.token;
        const newRefresh = data.data.refreshToken;
        onRefreshSuccess(newToken, newRefresh);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        processQueue(null, newToken);
        return instance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        onLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const status = error.response?.status;
    const body = error.response?.data as ApiResponse | undefined;
    const bizCode = body?.code;
    const path = normalizeRequestPath(originalRequest?.url);
    const traceId = (originalRequest?.headers?.['X-Trace-Id'] as string | undefined) ?? '';

    if (status === 403) {
      const baseMessage = mapErrorMessage(403, bizCode, body?.message);
      return Promise.reject(
        new ApiException({
          code: bizCode ?? 403,
          message: sanitizeUserMessage(withPathHint(path, baseMessage)),
          status: 403,
          details: readApiErrorDetails(body),
        }),
      );
    }

    if (status === 404) {
      return Promise.reject(
        new ApiException({
          code: bizCode ?? 1004,
          message: sanitizeUserMessage(mapErrorMessage(404, bizCode, body?.message)),
          status: 404,
        }),
      );
    }

    if (status === 409) {
      return Promise.reject(
        new ApiException({
          code: bizCode ?? 1005,
          message: sanitizeUserMessage(mapErrorMessage(409, bizCode, body?.message)),
          status: 409,
        }),
      );
    }

    if (status === 429) {
      return Promise.reject(
        new ApiException({
          code: bizCode ?? 3001,
          message: sanitizeUserMessage(mapErrorMessage(429, bizCode, body?.message)),
          status: 429,
        }),
      );
    }

    if (status && status >= 500) {
      const base = mapErrorMessage(status, bizCode, body?.message);
      const message = sanitizeUserMessage(base);
      const serverErrorNotified = notifyServerError(message);
      return Promise.reject(
        new ApiException({ code: bizCode ?? status, message, status, serverErrorNotified }),
      );
    }

    if (!error.response) {
      return Promise.reject(
        new ApiException({ code: 0, message: '网络异常，请检查您的网络连接', status: 0 }),
      );
    }

    return Promise.reject(
      new ApiException({
        code: bizCode ?? status!,
        message: sanitizeUserMessage(mapErrorMessage(status!, bizCode, body?.message)),
        status: status!,
        details: readApiErrorDetails(body),
      }),
    );
  },
);

function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  const body = res.data as ApiResponse<T> | null | undefined;
  if (body == null || typeof body !== 'object') {
    return undefined as T;
  }
  const data = body.data as unknown;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const rec = data as Record<string, unknown>;
    const list = rec.list;
    if (Array.isArray(list) && (rec.total === undefined || rec.total === null)) {
      const totalCount = res.headers?.['x-total-count'];
      if (totalCount !== undefined) {
        const parsed = Number(totalCount);
        if (!Number.isNaN(parsed)) rec.total = parsed;
      }
    }
  }
  return data as T;
}

export const http = {
  instance,

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.get<ApiResponse<T>>(url, config);
    return unwrap(res);
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.post<ApiResponse<T>>(url, data, config);
    return unwrap(res);
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.put<ApiResponse<T>>(url, data, config);
    return unwrap(res);
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.patch<ApiResponse<T>>(url, data, config);
    return unwrap(res);
  },

  async delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.delete<ApiResponse<T>>(url, config);
    return unwrap(res);
  },

  /**
   * FormData 上传。实例默认 `Content-Type: application/json` 时若不剥掉，部分环境下会把 body 序列化成
   * `{"file":{}}`，后端按 JSON 解析失败（file 须为 Base64 字符串或为 multipart 二进制）。
   */
  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.post<ApiResponse<T>>(url, formData, {
      timeout: config?.timeout ?? 120_000,
      ...config,
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData && headers) {
            const h = headers as unknown;
            if (
              typeof h === 'object' &&
              h !== null &&
              'delete' in h &&
              typeof (h as { delete: (k: string) => void }).delete === 'function'
            ) {
              (h as { delete: (k: string) => void }).delete('Content-Type');
            } else if (typeof h === 'object' && h !== null) {
              delete (h as Record<string, unknown>)['Content-Type'];
            }
          }
          return data;
        },
      ],
      headers: { ...config?.headers },
    });
    return unwrap(res);
  },

  /**
   * 二进制下载：不走 `unwrap`。若网关以 JSON 包错误体，会解析为 `ApiException`。
   */
  async getBlob(url: string, config?: AxiosRequestConfig): Promise<{ blob: Blob; fileName?: string }> {
    const res = await instance.get<Blob>(url, { ...config, responseType: 'blob' });
    const blob = res.data;
    const ct = String(res.headers['content-type'] ?? '').toLowerCase();
    if (ct.includes('application/json') || blob.type === 'application/json') {
      const text = await blob.text();
      try {
        const j = JSON.parse(text) as ApiResponse;
        if (j && typeof j === 'object' && typeof j.code === 'number' && j.code !== 0) {
          throw new ApiException({
            code: j.code,
            message: sanitizeUserMessage(mapErrorMessage(res.status, j.code, j.message)),
            status: res.status,
          });
        }
      } catch (e) {
        if (e instanceof ApiException) throw e;
      }
    }
    const cd = res.headers['content-disposition'] as string | undefined;
    let fileName: string | undefined;
    if (cd) {
      const star = /filename\*\s*=\s*UTF-8''([^;\s]+)/i.exec(cd);
      if (star) {
        try {
          fileName = decodeURIComponent(star[1]);
        } catch {
          fileName = star[1];
        }
      }
      if (!fileName) {
        const plain = /filename\s*=\s*("?)([^";\n]+)\1/i.exec(cd);
        if (plain) fileName = plain[2].trim().replace(/^"|"$/g, '');
      }
    }
    return { blob, fileName };
  },
};
