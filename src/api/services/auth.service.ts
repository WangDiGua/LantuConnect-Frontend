import { http } from '../../lib/http';
import type { LoginRequest, LoginResponse, RegisterRequest, UserInfo } from '../../types/dto/auth';

export const authService = {
  login: (data: LoginRequest) => http.post<LoginResponse>('/auth/login', data),
  register: (data: RegisterRequest) => http.post<void>('/auth/register', data),
  logout: () => http.post<void>('/auth/logout'),
  getCurrentUser: () => http.get<UserInfo>('/auth/me'),
  refreshToken: (refreshToken: string) =>
    http.post<{ token: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
};
