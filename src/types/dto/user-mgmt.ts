export interface UserRecord {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
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
