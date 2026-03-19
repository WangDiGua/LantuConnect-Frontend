/** 用户管理模块演示数据（对接后端后替换为 API） */

export interface MgmtUser {
  id: string;
  username: string;
  email: string;
  roleId: string;
  roleName: string;
  status: 'active' | 'disabled';
  lastLogin: string;
}

export interface MgmtRole {
  id: string;
  name: string;
  code: string;
  description: string;
  userCount: number;
  permissions: string[];
}

export interface MgmtApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  status: 'active' | 'revoked';
  lastUsed?: string;
}

export interface MgmtToken {
  id: string;
  subject: string;
  scope: string;
  issuedAt: string;
  expiresAt: string;
  status: 'valid' | 'revoked' | 'expired';
}

export const MOCK_USERS: MgmtUser[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@school.edu.cn',
    roleId: 'r1',
    roleName: '超级管理员',
    status: 'active',
    lastLogin: '2026-03-19 09:12',
  },
  {
    id: '2',
    username: 'zhangsan',
    email: 'zhangsan@school.edu.cn',
    roleId: 'r2',
    roleName: '教务员',
    status: 'active',
    lastLogin: '2026-03-18 16:40',
  },
  {
    id: '3',
    username: 'lisi',
    email: 'lisi@school.edu.cn',
    roleId: 'r3',
    roleName: '只读用户',
    status: 'disabled',
    lastLogin: '2026-03-01 11:05',
  },
];

export const MOCK_ROLES: MgmtRole[] = [
  {
    id: 'r1',
    name: '超级管理员',
    code: 'super_admin',
    description: '全站配置与用户、密钥、审计',
    userCount: 2,
    permissions: ['user:*', 'role:*', 'apikey:*', 'token:*', 'audit:read'],
  },
  {
    id: 'r2',
    name: '教务员',
    code: 'edu_staff',
    description: '教务相关 Agent 与数据只写范围',
    userCount: 12,
    permissions: ['agent:edu', 'kb:read', 'kb:write:edu'],
  },
  {
    id: 'r3',
    name: '只读用户',
    code: 'viewer',
    description: '仅可查看已授权资源',
    userCount: 48,
    permissions: ['agent:read', 'kb:read'],
  },
];

export const MOCK_API_KEYS: MgmtApiKey[] = [
  {
    id: 'k1',
    name: '教务中台-生产',
    prefix: 'sk_live_7a3f',
    createdAt: '2026-02-10 10:00',
    status: 'active',
    lastUsed: '2026-03-19 08:55',
  },
  {
    id: 'k2',
    name: '测试环境',
    prefix: 'sk_test_9b2c',
    createdAt: '2026-01-05 14:20',
    status: 'active',
    lastUsed: '2026-03-17 22:10',
  },
];

export const MOCK_TOKENS: MgmtToken[] = [
  {
    id: 't1',
    subject: 'zhangsan@school.edu.cn',
    scope: 'openid profile agent:read',
    issuedAt: '2026-03-19 08:00',
    expiresAt: '2026-03-20 08:00',
    status: 'valid',
  },
  {
    id: 't2',
    subject: 'mobile-app / device-uuid-12',
    scope: 'api.readonly',
    issuedAt: '2026-03-18 12:00',
    expiresAt: '2026-04-18 12:00',
    status: 'valid',
  },
  {
    id: 't3',
    subject: 'lisi@school.edu.cn',
    scope: 'openid',
    issuedAt: '2026-02-01 09:00',
    expiresAt: '2026-02-02 09:00',
    status: 'expired',
  },
];

export const PERMISSION_PRESETS = [
  { id: 'user', label: '用户与组织' },
  { id: 'role', label: '角色权限' },
  { id: 'agent', label: 'Agent 与知识库' },
  { id: 'api', label: 'API / 密钥' },
  { id: 'audit', label: '审计与监控' },
];
