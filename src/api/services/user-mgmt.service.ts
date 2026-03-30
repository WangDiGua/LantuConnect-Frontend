import { http } from '../../lib/http';
import { ApiException } from '../../types/api';
import type { PaginatedData, PaginationParams } from '../../types/api';
import { extractArray, normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  ApiKeyRecord,
  CreateApiKeyPayload,
  CreateUserPayload,
  OrgNode,
  RoleRecord,
  TokenRecord,
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

function normalizeTokenStatus(raw: unknown): TokenRecord['status'] {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'expired' || s === 'revoked' || s === 'active') return s;
  return 'active';
}

function mapTokenRecord(raw: unknown): TokenRecord {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const typeRaw = String(o.type ?? 'access').toLowerCase();
  const type: TokenRecord['type'] =
    typeRaw === 'service' || typeRaw === 'temporary' ? typeRaw : 'access';
  const scopesRaw = o.scopes;
  const scopes = Array.isArray(scopesRaw)
    ? scopesRaw.map((x) => String(x))
    : typeof scopesRaw === 'string' && scopesRaw.trim()
      ? scopesRaw.split(/[\s,]+/).filter(Boolean)
      : [];
  return {
    id: String(o.id ?? ''),
    name: String(o.name ?? '未命名'),
    type,
    maskedToken: String(o.maskedToken ?? o.masked ?? ''),
    status: normalizeTokenStatus(o.status),
    scopes,
    expiresAt: String(o.expiresAt ?? ''),
    lastUsedAt: o.lastUsedAt ? String(o.lastUsedAt) : undefined,
    createdBy: String(o.createdBy ?? ''),
    createdAt: String(o.createdAt ?? ''),
  };
}

function mapApiKeyRecord(raw: unknown): ApiKeyRecord {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const scopesRaw = o.scopes;
  const scopes = Array.isArray(scopesRaw)
    ? scopesRaw.map((x) => String(x))
    : typeof scopesRaw === 'string' && scopesRaw.trim()
      ? scopesRaw.split(/[\s,]+/).filter(Boolean)
      : [];
  return {
    id: String(o.id ?? o.apiKeyId ?? o.keyId ?? ''),
    name: String(o.name ?? o.keyName ?? '未命名'),
    prefix: String(o.prefix ?? o.keyPrefix ?? ''),
    maskedKey: String(o.maskedKey ?? o.masked ?? ''),
    scopes,
    status: normalizeApiKeyStatus(o.status),
    expiresAt: o.expiresAt ? String(o.expiresAt) : undefined,
    lastUsedAt: o.lastUsedAt ? String(o.lastUsedAt) : undefined,
    callCount: numPg(o.callCount ?? o.invokeCount),
    createdBy: String(o.createdBy ?? o.creator ?? ''),
    createdByName: o.createdByName ? String(o.createdByName) : undefined,
    createdAt: String(o.createdAt ?? o.createTime ?? ''),
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

export const userMgmtService = {
  listUsers: async (params?: UserListQuery) => {
    const raw = await http.get<unknown>('/user-mgmt/users', { params });
    return normalizePaginated<UserRecord>(raw);
  },

  createUser: (data: CreateUserPayload) =>
    http.post<UserRecord>('/user-mgmt/users', data),

  updateUser: (id: string, data: Partial<CreateUserPayload>) =>
    http.put<UserRecord>(`/user-mgmt/users/${id}`, data),

  deleteUser: (id: string) => http.delete(`/user-mgmt/users/${id}`),

  getUserById: (id: string) =>
    http.get<UserRecord>(`/user-mgmt/users/${id}`),

  getUserOrg: (userId: string) =>
    http.get<{ orgId: string; orgName: string }>(`/user-mgmt/users/${userId}/org`),

  bindUserOrg: (userId: string, data: { orgId: string }) =>
    http.put<void>(`/user-mgmt/users/${userId}/org`, data),

  unbindUserOrg: (userId: string) =>
    http.delete<void>(`/user-mgmt/users/${userId}/org`),

  getUserRoles: async (userId: string) => {
    const raw = await http.get<unknown>(`/user-mgmt/users/${userId}/roles`);
    return extractArray<RoleRecord>(raw);
  },

  bindUserRoles: (userId: string, data: { roleIds: string[] }) =>
    http.post<void>(`/user-mgmt/users/${userId}/roles`, data),

  replaceUserRoles: (userId: string, data: { roleIds: string[] }) =>
    http.put<void>(`/user-mgmt/users/${userId}/roles`, data),

  removeUserRole: (userId: string, roleId: string) =>
    http.delete<void>(`/user-mgmt/users/${userId}/roles/${roleId}`),

  listRoles: async () => {
    const raw = await http.get<unknown>('/user-mgmt/roles');
    return extractArray<RoleRecord>(raw);
  },

  createRole: (data: Omit<RoleRecord, 'id' | 'userCount' | 'isSystem' | 'createdAt' | 'updatedAt'>) =>
    http.post<RoleRecord>('/user-mgmt/roles', data),

  updateRole: (id: string, data: Partial<Omit<RoleRecord, 'id' | 'createdAt' | 'updatedAt'>>) =>
    http.put<RoleRecord>(`/user-mgmt/roles/${id}`, data),

  deleteRole: (id: string) => http.delete(`/user-mgmt/roles/${id}`),

  listApiKeys: async (params?: PaginationParams) => {
    const raw = await http.get<unknown>('/user-mgmt/api-keys', { params });
    return normalizeApiKeyListPayload(raw);
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

  listTokens: async (params?: PaginationParams & { keyword?: string; status?: string }) => {
    const raw = await http.get<unknown>('/user-mgmt/tokens', { params });
    return normalizePaginated<TokenRecord>(raw, mapTokenRecord);
  },

  createToken: (_data: { name: string; type: TokenRecord['type']; scopes: string[]; expiresAt?: string }) =>
    Promise.reject(
      new ApiException({
        code: 1004,
        status: 410,
        message: '接口已下线，请迁移到统一网关接口',
      }),
    ) as Promise<TokenRecord & { plainToken: string }>,

  revokeToken: (id: string) => http.patch<void>(`/user-mgmt/tokens/${id}/revoke`),

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
