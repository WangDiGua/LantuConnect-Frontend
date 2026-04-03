export type PlatformRoleCode =
  | 'platform_admin'
  | 'dept_admin'
  | 'developer'
  | 'consumer'
  | 'user'
  | 'unassigned';

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  nickname?: string;
  role: PlatformRoleCode;
  status: 'active' | 'disabled' | 'locked';
  department?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  language?: string;
  twoFactorEnabled?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
  captchaId: string;
  captchaCode: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserInfo;
  expiresIn: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  captcha?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TokenPair {
  token: string;
  refreshToken: string;
}

export interface CaptchaResult {
  captchaId: string;
  captchaImage: string;
}
