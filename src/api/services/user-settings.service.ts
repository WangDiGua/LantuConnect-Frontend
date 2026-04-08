import { http } from '../../lib/http';
import { DEFAULT_USER_API_KEY_SCOPES } from '../../utils/apiKeyScopes';
import { extractArray } from '../../utils/normalizeApiPayload';
import type {
  ApiKeyRevokePayload,
  CreateUserApiKeyPayload,
  InvokeEligibilityRequest,
  InvokeEligibilityResponse,
  UserApiKey,
  UserApiKeyResourceGrant,
  UserStats,
  UserWorkspace,
} from '../../types/dto/user-settings';

function numPg(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeUserApiKeyStatus(raw: unknown): UserApiKey['status'] {
  const s = String(raw ?? '').toLowerCase();
  if (s === 'expired' || s === 'revoked' || s === 'active') return s;
  return 'active';
}

/** 与 /user-mgmt 列表一致：后端可能返回 apiKeyId、keyName、masked 等别名 */
function mapUserApiKeyRecord(raw: unknown): UserApiKey {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const scopesRaw = o.scopes;
  const scopes = Array.isArray(scopesRaw)
    ? scopesRaw.map((x) => String(x))
    : typeof scopesRaw === 'string' && scopesRaw.trim()
      ? scopesRaw.split(/[\s,]+/).filter(Boolean)
      : [];
  return {
    id: String(o.id ?? o.apiKeyId ?? o.keyId ?? '').trim(),
    name: String(o.name ?? o.keyName ?? '未命名'),
    prefix: String(o.prefix ?? o.keyPrefix ?? ''),
    maskedKey: String(o.maskedKey ?? o.masked ?? ''),
    scopes,
    status: normalizeUserApiKeyStatus(o.status),
    expiresAt: o.expiresAt ? String(o.expiresAt) : undefined,
    lastUsedAt: o.lastUsedAt ? String(o.lastUsedAt) : undefined,
    lastUsed: o.lastUsed ? String(o.lastUsed) : undefined,
    callCount: numPg(o.callCount ?? o.invokeCount),
    createdAt: String(o.createdAt ?? o.createTime ?? ''),
  };
}

function mapResourceGrantRow(raw: unknown): UserApiKeyResourceGrant {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const actionsRaw = o.actions;
  const actions = Array.isArray(actionsRaw) ? actionsRaw.map((x) => String(x)) : [];
  return {
    id: numPg(o.id, 0),
    resourceType: String(o.resourceType ?? ''),
    resourceId: numPg(o.resourceId, 0),
    granteeType: String(o.granteeType ?? ''),
    granteeId: String(o.granteeId ?? ''),
    actions,
    status: String(o.status ?? ''),
    grantedByUserId: o.grantedByUserId != null ? numPg(o.grantedByUserId, 0) : undefined,
    grantedByName: o.grantedByName == null ? undefined : String(o.grantedByName),
    expiresAt: o.expiresAt == null ? undefined : String(o.expiresAt),
    createTime: o.createTime == null ? undefined : String(o.createTime),
    updateTime: o.updateTime == null ? undefined : String(o.updateTime),
  };
}

export const userSettingsService = {
  getWorkspace: () =>
    http.get<UserWorkspace>('/user-settings/workspace'),

  updateWorkspace: (data: Partial<Omit<UserWorkspace, 'id' | 'createdAt' | 'updatedAt'>>) =>
    http.put<UserWorkspace>('/user-settings/workspace', data),

  listApiKeys: async () => {
    const raw = await http.get<unknown>('/user-settings/api-keys');
    return extractArray<unknown>(raw)
      .map(mapUserApiKeyRecord)
      /** DELETE 多为软撤销：接口仍可能返回 status=revoked 行，列表仅展示仍可用密钥 */
      .filter((k) => k.status !== 'revoked');
  },

  createApiKey: async (data: CreateUserApiKeyPayload) => {
    const scopes =
      Array.isArray(data.scopes) && data.scopes.length > 0 ? data.scopes : [...DEFAULT_USER_API_KEY_SCOPES];
    const raw = await http.post<UserApiKey & { plainKey?: string; secretPlain?: string }>(
      '/user-settings/api-keys',
      { ...data, scopes },
    );
    const plain = (raw as { secretPlain?: string; plainKey?: string }).secretPlain ?? raw.plainKey ?? '';
    const base = mapUserApiKeyRecord(raw);
    return { ...base, plainKey: plain };
  },

  deleteApiKey: (id: string) =>
    http.delete(`/user-settings/api-keys/${id}`),

  listResourceGrantsForApiKey: async (apiKeyId: string, resourceType?: string) => {
    const raw = await http.get<unknown>(`/user-settings/api-keys/${encodeURIComponent(apiKeyId)}/resource-grants`, {
      params: resourceType?.trim() ? { resourceType: resourceType.trim() } : undefined,
    });
    return extractArray<unknown>(raw).map(mapResourceGrantRow);
  },

  /** 与网关 invoke Grant/策略一致；无需完整 secret，服务端按 Key id + 登录态校验 */
  postInvokeEligibility: (apiKeyId: string, body: InvokeEligibilityRequest) =>
    http.post<InvokeEligibilityResponse>(
      `/user-settings/api-keys/${encodeURIComponent(apiKeyId)}/invoke-eligibility`,
      body,
    ),

  revokeApiKey: (id: string, body: ApiKeyRevokePayload) =>
    http.post<void>(`/user-settings/api-keys/${encodeURIComponent(id)}/revoke`, body),

  /** 验证登录密码后轮换明文；返回新 secretPlain（旧值立即失效） */
  rotateApiKey: async (id: string, body: ApiKeyRevokePayload) => {
    const raw = await http.post<UserApiKey & { plainKey?: string; secretPlain?: string }>(
      `/user-settings/api-keys/${encodeURIComponent(id)}/rotate`,
      body,
    );
    const plain =
      (raw as { secretPlain?: string; plainKey?: string }).secretPlain ?? (raw as { plainKey?: string }).plainKey ?? '';
    const base = mapUserApiKeyRecord(raw);
    return { ...base, plainKey: plain };
  },

  getStats: () => http.get<UserStats>('/user-settings/stats'),
};
