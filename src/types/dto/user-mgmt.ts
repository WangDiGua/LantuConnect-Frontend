/** 平台绑定角色（t_user_role_rel → t_platform_role） */
export interface UserPlatformRoleRef {
  id: string;
  roleCode: string;
  roleName: string;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  /** 编辑表单用：当前选中的平台角色 code（通常取首个绑定角色） */
  role: string;
  /** t_user.role：学校侧同步身份码，与平台 Casbin 角色无关 */
  schoolRole?: number;
  /** 平台角色绑定列表（列表页展示） */
  platformRoles?: UserPlatformRoleRef[];
  status: 'active' | 'disabled' | 'locked';
  department?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  maskedKey: string;
  scopes: string[];
  status: 'active' | 'expired' | 'revoked';
  expiresAt?: string;
  lastUsedAt?: string;
  callCount: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface TokenRecord {
  id: string;
  name: string;
  type: 'access' | 'service' | 'temporary';
  maskedToken: string;
  status: 'active' | 'expired' | 'revoked';
  scopes: string[];
  expiresAt: string;
  lastUsedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface OrgNode {
  id: string;
  name: string;
  parentId: string | null;
  type: 'company' | 'department' | 'team' | 'group';
  /** 后端未提供人数时可省略 */
  headCount?: number;
  memberCount?: number;
  leader?: string;
  children: OrgNode[];
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  department?: string;
}

export interface CreateApiKeyPayload {
  name: string;
  scopes: string[];
  expiresAt?: string;
}
