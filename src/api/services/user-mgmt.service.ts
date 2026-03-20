import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  ApiKeyRecord,
  CreateApiKeyPayload,
  CreateUserPayload,
  OrgNode,
  RoleRecord,
  TokenRecord,
  UserRecord,
} from '../../types/dto/user-mgmt';

export const userMgmtService = {
  listUsers: (params?: PaginationParams) =>
    http.get<PaginatedData<UserRecord>>('/user-mgmt/users', { params }),

  createUser: (data: CreateUserPayload) =>
    http.post<UserRecord>('/user-mgmt/users', data),

  updateUser: (id: string, data: Partial<CreateUserPayload>) =>
    http.put<UserRecord>(`/user-mgmt/users/${id}`, data),

  deleteUser: (id: string) => http.delete(`/user-mgmt/users/${id}`),

  listRoles: () => http.get<RoleRecord[]>('/user-mgmt/roles'),

  createRole: (data: Omit<RoleRecord, 'id' | 'userCount' | 'isSystem' | 'createdAt' | 'updatedAt'>) =>
    http.post<RoleRecord>('/user-mgmt/roles', data),

  updateRole: (id: string, data: Partial<Omit<RoleRecord, 'id' | 'createdAt' | 'updatedAt'>>) =>
    http.put<RoleRecord>(`/user-mgmt/roles/${id}`, data),

  deleteRole: (id: string) => http.delete(`/user-mgmt/roles/${id}`),

  listApiKeys: (params?: PaginationParams) =>
    http.get<PaginatedData<ApiKeyRecord>>('/user-mgmt/api-keys', { params }),

  createApiKey: (data: CreateApiKeyPayload) =>
    http.post<ApiKeyRecord & { plainKey: string }>('/user-mgmt/api-keys', data),

  revokeApiKey: (id: string) =>
    http.patch<void>(`/user-mgmt/api-keys/${id}/revoke`),

  listTokens: (params?: PaginationParams) =>
    http.get<PaginatedData<TokenRecord>>('/user-mgmt/tokens', { params }),

  createToken: (data: { name: string; type: TokenRecord['type']; scopes: string[]; expiresAt?: string }) =>
    http.post<TokenRecord & { plainToken: string }>('/user-mgmt/tokens', data),

  revokeToken: (id: string) =>
    http.patch<void>(`/user-mgmt/tokens/${id}/revoke`),

  getOrgTree: () => http.get<OrgNode[]>('/user-mgmt/org-tree'),
};
