import { http } from '../../lib/http';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type { PaginatedData } from '../../types/api';
import type { CaptchaResult, LoginRequest, LoginResponse, RegisterRequest, UserInfo } from '../../types/dto/auth';
import type { SessionItem } from '../../types/dto/explore';

export const authService = {
  getCaptcha: () => http.get<CaptchaResult>('/captcha/generate'),
  verifyCaptcha: (captchaId: string, code: string) =>
    http.post<boolean>('/captcha/verify', undefined, { params: { captchaId, code } }),
  login: (data: LoginRequest) => http.post<LoginResponse>('/auth/login', data),
  register: (data: RegisterRequest) => http.post<LoginResponse>('/auth/register', data),
  /**
   * Server-side logout (blacklist / session). Pass `accessToken` so the header is set even if
   * local storage is cleared in the same event loop turn (Axios runs request hooks as microtasks).
   */
  logout: (accessToken?: string | null) =>
    http.post<void>(
      '/auth/logout',
      undefined,
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : {},
    ),
  getCurrentUser: () => http.get<UserInfo>('/auth/me'),
  refreshToken: (refreshToken: string) =>
    http.post<{ token: string; refreshToken: string }>('/auth/refresh', { refreshToken }),

  changePassword: (oldPassword: string, newPassword: string) =>
    http.post<void>('/auth/change-password', { oldPassword, newPassword }),

  sendSmsCode: (phone: string, purpose: string = 'bind_phone') =>
    http.post<void>('/auth/send-sms', { phone, purpose }),

  bindPhone: (phone: string, code: string) =>
    http.post<void>('/auth/bind-phone', { phone, code }),

  updateProfile: (data: { avatar?: string; language?: string; twoStep?: boolean }) =>
    http.put<void>('/auth/profile', data),

  getLoginHistory: async (params?: { page?: number; pageSize?: number }) => {
    const raw = await http.get<unknown>('/auth/login-history', { params });
    return normalizePaginated<{
      id: number;
      ip: string;
      location: string;
      device: string;
      os: string;
      browser: string;
      loginMethod: string;
      result: string;
      createTime: string;
    }>(raw);
  },

  /**
   * 若后端返回分页结构（total 大于本页 list 长度），按服务端分页透传；
   * 若返回整表数组或单层列表，则在客户端按 page / pageSize 切片。
   */
  listSessions: async (params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedData<SessionItem>> => {
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 10));
    const raw = await http.get<unknown>('/auth/sessions', { params });
    if (Array.isArray(raw)) {
      const start = (page - 1) * pageSize;
      return {
        list: raw.slice(start, start + pageSize) as SessionItem[],
        total: raw.length,
        page,
        pageSize,
      };
    }
    const normalized = normalizePaginated<SessionItem>(raw);
    if (typeof raw !== 'object' || raw == null) {
      return { list: [], total: 0, page: 1, pageSize };
    }
    const o = raw as Record<string, unknown>;
    const declared = o.total ?? o.totalCount;
    const isServerPage =
      declared != null && Number(declared) > normalized.list.length;
    if (isServerPage) {
      return {
        list: normalized.list,
        total: Number(declared),
        page: normalized.page,
        pageSize: normalized.pageSize,
      };
    }
    const all =
      normalized.list.length > 0 ? normalized.list : extractArray<SessionItem>(raw);
    const start = (page - 1) * pageSize;
    return {
      list: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize,
    };
  },

  revokeSession: (sessionId: string) =>
    http.delete<void>(`/auth/sessions/${sessionId}`),
};
