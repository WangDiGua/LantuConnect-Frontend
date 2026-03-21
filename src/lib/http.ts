import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { env } from '../config/env';
import { setupMockAdapter } from '../mock';
import { ApiException, ApiResponse } from '../types/api';
import { getCsrfToken } from './security';

let getToken: () => string | null = () => localStorage.getItem(env.VITE_TOKEN_KEY);
let getRefreshToken: () => string | null = () => localStorage.getItem(env.VITE_REFRESH_TOKEN_KEY);
let onLogout: () => void = () => {};
let onRefreshSuccess: (token: string, refresh: string) => void = () => {};

export function bindAuthCallbacks(cbs: {
  getToken: () => string | null;
  getRefreshToken: () => string | null;
  onLogout: () => void;
  onRefreshSuccess: (token: string, refresh: string) => void;
}) {
  getToken = cbs.getToken;
  getRefreshToken = cbs.getRefreshToken;
  onLogout = cbs.onLogout;
  onRefreshSuccess = cbs.onRefreshSuccess;
}

const instance: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

setupMockAdapter(instance);

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Request-Id'] = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  config.headers['X-Request-Time'] = new Date().toISOString();
  if (config.method !== 'get') {
    config.headers['X-CSRF-Token'] = getCsrfToken();
  }
  (config as any).__startTime = Date.now();
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
    if (import.meta.env.DEV) {
      const config = response.config;
      const duration = Date.now() - ((config as any).__startTime || Date.now());
      console.debug(`[API] ${config.method?.toUpperCase()} ${config.url} → ${response.status} (${duration}ms)`);
    }
    const body = response.data;
    if (body && typeof body.code === 'number' && body.code !== 0) {
      return Promise.reject(
        new ApiException({
          code: body.code,
          message: body.message || '请求失败',
          status: response.status,
        }),
      );
    }
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 429) {
      return Promise.reject(
        new ApiException({ code: 429, message: '请求过于频繁，请稍后重试', status: 429 }),
      );
    }

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

    if (error.response?.status === 403) {
      return Promise.reject(
        new ApiException({ code: 403, message: '权限不足，无法执行此操作', status: 403 }),
      );
    }

    if (error.response && error.response.status >= 500) {
      return Promise.reject(
        new ApiException({
          code: error.response.status,
          message: '服务器内部错误，请稍后重试',
          status: error.response.status,
        }),
      );
    }

    if (!error.response) {
      return Promise.reject(
        new ApiException({ code: 0, message: '网络异常，请检查您的网络连接', status: 0 }),
      );
    }

    const body = error.response.data;
    return Promise.reject(
      new ApiException({
        code: body?.code ?? error.response.status,
        message: body?.message ?? '请求失败',
        status: error.response.status,
        details: (body as any)?.details,
      }),
    );
  },
);

function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return res.data.data;
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

  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const res = await instance.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: { ...config?.headers, 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(res);
  },
};
