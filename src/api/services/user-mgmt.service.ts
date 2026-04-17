import { http } from '../../lib/http';
import { tryBatchPost } from '../../utils/batchApi';
import { runWithConcurrency } from '../../utils/runWithConcurrency';
import type { PaginatedData, PaginationParams } from '../../types/api';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  ApiKeyRecord,
  ApiKeyDetailRecord,
  CreateApiKeyPayload,
  CreateUserPayload,
  OrgNode,
  RoleRecord,
  UserPlatformRoleRef,
  UserRecord,
} from '../../types/dto/user-mgmt';

/** 后端 t_menu 树：menuId / menuName / menuParentId / ifXy / children */
function mapBackendOrgTreeNode(raw: unknown): OrgNode {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const id = String(o.menuId ?? o.id ?? '').trim();
  const name = String(o.menuName ?? o.name ?? '').trim() || '—';
  const p = o.menuParentId ?? o.parentId;
  const parentId =
    p === null || p === undefined || p === '' || Number(p) === 0 ? null : String(p);
  const level = Number(o.menuLevel ?? 1) || 1;
  const ifXy = Number(o.ifXy ?? 0);
  const type: OrgNode['type'] = level <= 1 ? 'company' : ifXy === 1 ? 'department' : 'group';
  const childrenRaw = Array.isArray(o.children) ? o.children : [];
  const hc = o.headCount ?? o.memberCount;
  const hasCount = hc !== undefined && hc !== null && hc !== '';
  const countNum = hasCount ? Number(hc) || 0 : undefined;

  return {
    id,
    name,
    parentId,
    type,
    ...(countNum !== undefined ? { headCount: countNum, memberCount: countNum } : {}),
    leader: o.leader ? String(o.leader) : undefined,
    children: childrenRaw.map(mapBackendOrgTreeNode),
  };
}

function normalizeOrgTreePayload(raw: unknown): OrgNode[] {
  if (Array.isArray(raw)) return raw.map(mapBackendOrgTreeNode);
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    const inner = r.data ?? r.list ?? r.records;
    if (Array.isArray(inner)) return inner.map(mapBackendOrgTreeNode);
    if ('menuId' in r || 'menuName' in r || 'id' in r) return [mapBackendOrgTreeNode(raw)];
  }
  return [];
}

function numPg(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeApiKeyStatus(raw: unknown): ApiKeyRecord['status'] {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'expired' || s === 'revoked' || s === 'active') return s;
  return 'active';
}

/** 解析接口返回的日期时间为可展示字符串；兼容 snake_case、数字时间戳、Jackson 数组形态 */
function coerceOptionalApiDateTime(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    return t || undefined;
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return new Date(v).toISOString();
  }
  if (Array.isArray(v) && v.length >= 3) {
    const y = Number(v[0]);
    const mo = Number(v[1] ?? 1);
    const d = Number(v[2] ?? 1);
    const h = Number(v[3] ?? 0);
    const mi = Number(v[4] ?? 0);
    const s = Number(v[5] ?? 0);
    if (!Number.isFinite(y)) return undefined;
    const dt = new Date(y, mo - 1, d, h, mi, s);
    if (Number.isNaN(dt.getTime())) return undefined;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return undefined;
}

function mapApiKeyRecord(raw: unknown): ApiKeyRecord {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const scopesRaw = o.scopes;
  const scopes = Array.isArray(scopesRaw)
    ? scopesRaw.map((x) => String(x))
    : typeof scopesRaw === 'string' && scopesRaw.trim()
      ? scopesRaw.split(/[\s,]+/).filter(Boolean)
      : [];
  const expiresAt =
    coerceOptionalApiDateTime(o.expiresAt) ??
    coerceOptionalApiDateTime(o.expires_at) ??
    coerceOptionalApiDateTime(o.expireAt);
  const lastUsedAt =
    coerceOptionalApiDateTime(o.lastUsedAt) ?? coerceOptionalApiDateTime(o.last_used_at);
  const createdAt =
    coerceOptionalApiDateTime(o.createdAt) ??
    coerceOptionalApiDateTime(o.createTime) ??
    coerceOptionalApiDateTime(o.created_at) ??
    coerceOptionalApiDateTime(o.create_time) ??
    strTrim(o.createdAt ?? o.createTime ?? '');
  return {
    id: String(o.id ?? o.apiKeyId ?? o.keyId ?? ''),
    name: String(o.name ?? o.keyName ?? '未命名'),
    prefix: String(o.prefix ?? o.keyPrefix ?? ''),
    maskedKey: String(o.maskedKey ?? o.masked ?? ''),
    scopes,
    status: normalizeApiKeyStatus(o.status),
    ...(expiresAt ? { expiresAt } : {}),
    ...(lastUsedAt ? { lastUsedAt } : {}),
    callCount: numPg(o.callCount ?? o.invokeCount),
    createdBy: String(o.createdBy ?? o.creator ?? ''),
    createdByName: o.createdByName ? String(o.createdByName) : undefined,
    createdAt,
  };
}

function mapApiKeyDetailRecord(raw: unknown): ApiKeyDetailRecord {
  const base = mapApiKeyRecord(raw);
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    ...base,
    secretPlain: o.secretPlain ? String(o.secretPlain) : undefined,
    secretAvailable: Boolean(o.secretAvailable ?? o.secretPlain),
  };
}

/** 兼容裸数组、list/records/data 分页或缺字段 */
function normalizeApiKeyListPayload(raw: unknown): PaginatedData<ApiKeyRecord> {
  const emptyPage = (pageSize: number): PaginatedData<ApiKeyRecord> => ({
    list: [],
    total: 0,
    page: 1,
    pageSize,
  });

  if (raw == null) return emptyPage(20);

  if (Array.isArray(raw)) {
    const list = raw.map(mapApiKeyRecord);
    return {
      list,
      total: list.length,
      page: 1,
      pageSize: list.length || 20,
    };
  }

  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const inner =
      (Array.isArray(o.list) ? o.list : null)
      ?? (Array.isArray(o.records) ? o.records : null)
      ?? (Array.isArray(o.data) ? o.data : null)
      ?? [];
    const list = inner.map(mapApiKeyRecord);
    const pageSize = numPg(o.pageSize ?? o.size, 20) || 20;
    return {
      list,
      total: numPg(o.total ?? o.totalCount, list.length),
      page: numPg(o.page ?? o.current, 1) || 1,
      pageSize,
    };
  }

  return emptyPage(20);
}

export interface UserListQuery extends PaginationParams {
  keyword?: string;
  status?: 'active' | 'disabled' | 'locked';
}

function strTrim(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function optStr(v: unknown): string | undefined {
  const s = strTrim(v);
  return s || undefined;
}

function normalizeUserStatus(raw: unknown): UserRecord['status'] {
  const s = String(raw ?? 'active').toLowerCase();
  if (s === 'disabled' || s === 'inactive') return 'disabled';
  if (s === 'locked') return 'locked';
  return 'active';
}

/** 将后端 t_user / 用户管理 VO 对齐到前端 UserRecord（mail、userId、lastLoginTime 等） */
export function mapUserRecord(raw: unknown): UserRecord {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const major = optStr(o.major);
  const className = optStr(o.className ?? o.class_name);
  const deptParts = [major, className].filter(Boolean) as string[];
  const department = deptParts.length
    ? deptParts.join(' · ')
    : optStr(o.department ?? o.deptName ?? o.dept_name ?? o.orgName ?? o.org_name);
  const lastLoginRaw = o.lastLoginTime ?? o.lastLoginAt ?? (o as { lastLogintime?: unknown }).lastLogintime;
  const lastLoginAt = optStr(lastLoginRaw);
  const email = strTrim(o.mail ?? o.email);
  const phone = optStr(o.mobile ?? o.phone);
  const id = strTrim(o.userId ?? o.id) || '0';

  const schoolRaw = o.role;
  const schoolNum = typeof schoolRaw === 'number' ? schoolRaw : Number(schoolRaw);
  const schoolRole = Number.isFinite(schoolNum) ? schoolNum : undefined;

  const platformRolesRaw = o.platformRoles;
  const platformRoles: UserPlatformRoleRef[] = Array.isArray(platformRolesRaw)
    ? (platformRolesRaw as Record<string, unknown>[]).map((pr) => ({
        id: String(pr.id ?? ''),
        roleCode: String(pr.roleCode ?? ''),
        roleName: String(pr.roleName ?? ''),
      }))
    : [];

  const primaryPlatformRoleCode = platformRoles[0]?.roleCode ?? '';

  const realName = optStr(o.realName ?? o.real_name);
  const sexRaw = o.sex;
  const sexNum = typeof sexRaw === 'number' ? sexRaw : Number(sexRaw);
  const sex = Number.isFinite(sexNum) ? sexNum : undefined;

  const rec: UserRecord = {
    id,
    username: strTrim(o.username),
    ...(realName ? { realName } : {}),
    email: email || '',
    role: primaryPlatformRoleCode,
    ...(schoolRole !== undefined ? { schoolRole } : {}),
    ...(platformRoles.length > 0 ? { platformRoles } : {}),
    status: normalizeUserStatus(o.status),
    createdAt: strTrim(o.createTime ?? o.createdAt),
    updatedAt: strTrim(o.updateTime ?? o.updatedAt),
  };
  if (phone) rec.phone = phone;
  if (sex !== undefined && sex !== null && [0, 1, 2].includes(sex)) {
    rec.sex = sex;
  }
  const av = optStr(o.headImage ?? o.avatar);
  if (av) rec.avatar = av;
  if (department) rec.department = department;
  if (lastLoginAt) rec.lastLoginAt = lastLoginAt;
  return rec;
}

/** 将后端 {@link PlatformRole}（roleName / roleCode / createTime）对齐到 {@link RoleRecord} */
export function mapRoleRecord(raw: unknown): RoleRecord {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const name = strTrim(o.roleName ?? o.name);
  const code = strTrim(o.roleCode ?? o.code);
  const permsRaw = o.permissions;
  const permissions = Array.isArray(permsRaw) ? permsRaw.map((x) => String(x)) : [];
  return {
    id: String(o.id ?? ''),
    name: name || '—',
    code: code || '—',
    description: strTrim(o.description),
    permissions,
    userCount: numPg(o.userCount, 0),
    isSystem: o.isSystem === true,
    createdAt: strTrim(o.createTime ?? o.createdAt),
    updatedAt: strTrim(o.updateTime ?? o.updatedAt),
  };
}

export const userMgmtService = {
  listUsers: async (params?: UserListQuery) => {
    const raw = await http.get<unknown>('/user-mgmt/users', { params });
    return normalizePaginated<UserRecord>(raw, mapUserRecord);
  },

  createUser: async (data: CreateUserPayload) => {
    const row = await http.post<unknown>('/user-mgmt/users', data);
    return mapUserRecord(row);
  },

  updateUser: async (id: string, data: Partial<CreateUserPayload & { status?: UserRecord['status'] }>) => {
    const row = await http.put<unknown>(`/user-mgmt/users/${id}`, data);
    return mapUserRecord(row);
  },

  deleteUser: (id: string) => http.delete(`/user-mgmt/users/${id}`),

  /** 批量更新用户；优先 POST `/user-mgmt/users/batch` */
  batchPatchUsers: async (
    ids: string[],
    data: Partial<CreateUserPayload> & { status?: UserRecord['status'] },
  ): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/user-mgmt/users/batch',
      { ids, ...data },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.put<unknown>(`/user-mgmt/users/${id}`, data);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  getUserById: async (id: string) => {
    const row = await http.get<unknown>(`/user-mgmt/users/${id}`);
    return mapUserRecord(row);
  },

  getUserOrg: (userId: string) =>
    http.get<{ orgId: string; orgName: string }>(`/user-mgmt/users/${userId}/org`),

  bindUserOrg: (userId: string, data: { orgId: string }) =>
    http.put<void>(`/user-mgmt/users/${userId}/org`, data),

  unbindUserOrg: (userId: string) =>
    http.delete<void>(`/user-mgmt/users/${userId}/org`),

  getUserRoles: async (userId: string) => {
    const raw = await http.get<unknown>(`/user-mgmt/users/${userId}/roles`);
    return extractArray(raw).map(mapRoleRecord);
  },

  bindUserRoles: (userId: string, data: { roleIds: string[] }) =>
    http.post<void>(`/user-mgmt/users/${userId}/roles`, data),

  replaceUserRoles: (userId: string, data: { roleIds: string[] }) =>
    http.put<void>(`/user-mgmt/users/${userId}/roles`, data),

  removeUserRole: (userId: string, roleId: string) =>
    http.delete<void>(`/user-mgmt/users/${userId}/roles/${roleId}`),

  listRoles: async () => {
    const raw = await http.get<unknown>('/user-mgmt/roles');
    return extractArray(raw).map(mapRoleRecord);
  },

  createRole: async (data: Omit<RoleRecord, 'id' | 'userCount' | 'isSystem' | 'createdAt' | 'updatedAt'>) => {
    const raw = await http.post<unknown>('/user-mgmt/roles', data);
    return mapRoleRecord(raw);
  },

  updateRole: (id: string, data: Partial<Omit<RoleRecord, 'id' | 'createdAt' | 'updatedAt'>>) =>
    http.put<void>(`/user-mgmt/roles/${id}`, data),

  deleteRole: (id: string) => http.delete(`/user-mgmt/roles/${id}`),

  listApiKeys: async (params?: PaginationParams) => {
    const raw = await http.get<unknown>('/user-mgmt/api-keys', { params });
    return normalizeApiKeyListPayload(raw);
  },

  getApiKeyDetail: async (id: string) => {
    const raw = await http.get<unknown>(`/user-mgmt/api-keys/${encodeURIComponent(id)}`);
    return mapApiKeyDetailRecord(raw);
  },

  createApiKey: async (data: CreateApiKeyPayload) => {
    const raw = await http.post<ApiKeyRecord & { plainKey?: string; secretPlain?: string }>(
      '/user-mgmt/api-keys',
      data,
    );
    const plain = (raw as { secretPlain?: string; plainKey?: string }).secretPlain ?? raw.plainKey ?? '';
    return { ...raw, plainKey: plain };
  },

  revokeApiKey: (id: string) =>
    http.patch<void>(`/user-mgmt/api-keys/${id}/revoke`),

  batchRevokeApiKeys: async (ids: string[]): Promise<void> => {
    if (!ids.length) return;
    await tryBatchPost(
      '/user-mgmt/api-keys/batch-revoke',
      { ids },
      async () => {
        const r = await runWithConcurrency(ids, 4, async (id) => {
          await http.patch<void>(`/user-mgmt/api-keys/${id}/revoke`);
        });
        if (r.errors.length) throw r.errors[0]!.error;
      },
    );
  },

  getOrgTree: async () => {
    const raw = await http.get<unknown>('/user-mgmt/org-tree');
    return normalizeOrgTreePayload(raw);
  },

  getOrgById: async (id: string) => {
    const raw = await http.get<unknown>(`/user-mgmt/orgs/${id}`);
    return mapBackendOrgTreeNode(raw);
  },

  createOrg: (data: { name: string; parentId?: string; type?: string }) =>
    http.post<OrgNode>('/user-mgmt/orgs', data),

  updateOrg: (id: string, data: { name?: string; parentId?: string; type?: string }) =>
    http.put<OrgNode>(`/user-mgmt/orgs/${id}`, data),

  deleteOrg: (id: string) =>
    http.delete<void>(`/user-mgmt/orgs/${id}`),
};
