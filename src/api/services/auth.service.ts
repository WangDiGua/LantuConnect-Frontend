import { http } from '../../lib/http';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type { PaginatedData } from '../../types/api';
import type {
  AccountInsights,
  CaptchaResult,
  LegalNotices,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserInfo,
} from '../../types/dto/auth';
import { LOGIN_LEGAL_NOTICES_FALLBACK } from '../../constants/loginLegalNotices';
import type { SessionItem } from '../../types/dto/explore';

export const authService = {
  /** 登录页隐私 / 条款（匿名；失败时返回本地占位） */
  getLegalNotices: async (): Promise<LegalNotices> => {
    try {
      const d = await http.get<LegalNotices>('/auth/legal-notices');
      if (
        d &&
        typeof d.privacyBody === 'string' &&
        d.privacyBody.trim() &&
        typeof d.termsBody === 'string' &&
        d.termsBody.trim()
      ) {
        return {
          privacyTitle: d.privacyTitle?.trim() || LOGIN_LEGAL_NOTICES_FALLBACK.privacyTitle,
          termsTitle: d.termsTitle?.trim() || LOGIN_LEGAL_NOTICES_FALLBACK.termsTitle,
          privacyBody: d.privacyBody,
          termsBody: d.termsBody,
        };
      }
    } catch {
      /* 离线或旧后端 */
    }
    return LOGIN_LEGAL_NOTICES_FALLBACK;
  },

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

  updateProfile: (data: { avatar?: string; language?: string }) =>
    http.put<void>('/auth/profile', data),

  /** 安全态势、本月/累计成功登录、近 7 日分布（需登录） */
  getAccountInsights: () => http.get<AccountInsights>('/auth/account-insights'),

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
