/** 与后端平台角色一致：user=终端用户，reviewer=全平台审核员，platform_admin=平台超管 */
export type PlatformRoleCode =
  | 'platform_admin'
  | 'reviewer'
  | 'developer'
  | 'user'
  | 'unassigned';

export interface UserInfo {
  id: string;
  username: string;
  /** 真实姓名（与 t_user.real_name 对齐；缺失时前端回退 nickname / username） */
  realName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  nickname?: string;
  role: PlatformRoleCode;
  /** 与后端 Casbin 角色表合并后的权限点；缺失时前端按 platformRole 静态映射 */
  permissions?: string[];
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
