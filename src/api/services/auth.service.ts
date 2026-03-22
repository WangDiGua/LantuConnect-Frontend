import { http } from '../../lib/http';
import type { PaginatedData } from '../../types/api';
import type { LoginRequest, LoginResponse, RegisterRequest, UserInfo } from '../../types/dto/auth';

export const authService = {
  login: (data: LoginRequest) => http.post<LoginResponse>('/auth/login', data),
  register: (data: RegisterRequest) => http.post<LoginResponse>('/auth/register', data),
  logout: () => http.post<void>('/auth/logout'),
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

  getLoginHistory: (params?: { page?: number; pageSize?: number }) =>
    http.get<PaginatedData<{ id: number; ip: string; location: string; device: string; os: string; browser: string; loginMethod: string; result: string; createTime: string }>>('/auth/login-history', { params }),
};
