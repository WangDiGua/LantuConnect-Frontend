import { http } from '../../lib/http';
import { DEFAULT_USER_API_KEY_SCOPES } from '../../utils/apiKeyScopes';
import { extractArray } from '../../utils/normalizeApiPayload';
import type {
  ApiKeyRevokePayload,
  CreateUserApiKeyPayload,
  InvokeEligibilityRequest,
  InvokeEligibilityResponse,
  UserApiKey,
  UserApiKeyDetail,
  UserIntegrationPackageOption,
  UserStats,
  UserWorkspace,
} from '../../types/dto/user-settings';
import type { IntegrationPackageUpsertPayload, IntegrationPackageVO } from '../../types/dto/integration-package';

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
  const pkgRaw = o.integrationPackageId;
  const integrationPackageId =
    pkgRaw === null || pkgRaw === undefined || pkgRaw === ''
      ? undefined
      : String(pkgRaw).trim() || undefined;
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
    integrationPackageId,
  };
}

function mapUserApiKeyDetail(raw: unknown): UserApiKeyDetail {
  const base = mapUserApiKeyRecord(raw);
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    ...base,
    secretPlain: o.secretPlain ? String(o.secretPlain) : undefined,
    secretAvailable: Boolean(o.secretAvailable ?? o.secretPlain),
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
    const pkg = data.integrationPackageId?.trim();
    const raw = await http.post<UserApiKey & { plainKey?: string; secretPlain?: string }>(
      '/user-settings/api-keys',
      {
        name: data.name,
        scopes,
        ...(data.expiresAt ? { expiresAt: data.expiresAt } : {}),
        ...(pkg ? { integrationPackageId: pkg } : {}),
      },
    );
    const plain = (raw as { secretPlain?: string; plainKey?: string }).secretPlain ?? raw.plainKey ?? '';
    const base = mapUserApiKeyRecord(raw);
    return { ...base, plainKey: plain };
  },

  getApiKeyDetail: async (id: string) => {
    const raw = await http.get<unknown>(`/user-settings/api-keys/${encodeURIComponent(id)}`);
    return mapUserApiKeyDetail(raw);
  },

  deleteApiKey: (id: string) =>
    http.delete(`/user-settings/api-keys/${id}`),

  /** 与网关 invoke 可调用预判一致；无需完整 secret，服务端按 Key id + 登录态校验 */
  postInvokeEligibility: (apiKeyId: string, body: InvokeEligibilityRequest) =>
    http.post<InvokeEligibilityResponse>(
      `/user-settings/api-keys/${encodeURIComponent(apiKeyId)}/invoke-eligibility`,
      body,
    ),

  revokeApiKey: (id: string, body: ApiKeyRevokePayload) =>
    http.post<void>(`/user-settings/api-keys/${encodeURIComponent(id)}/revoke`, body),

  getStats: () => http.get<UserStats>('/user-settings/stats'),

  listIntegrationPackages: async (): Promise<UserIntegrationPackageOption[]> => {
    const raw = await http.get<unknown>('/user-settings/integration-packages');
    return extractArray<unknown>(raw).map((x) => {
      const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {};
      return {
        id: String(o.id ?? '').trim(),
        name: String(o.name ?? o.id ?? ''),
        description: o.description != null ? String(o.description) : undefined,
        status: o.status != null ? String(o.status) : undefined,
        itemCount: numPg(o.itemCount),
      };
    });
  },

  getIntegrationPackage: (id: string) =>
    http.get<IntegrationPackageVO>(`/user-settings/integration-packages/${encodeURIComponent(id)}`),

  createIntegrationPackage: (body: IntegrationPackageUpsertPayload) =>
    http.post<IntegrationPackageVO>('/user-settings/integration-packages', body),

  updateIntegrationPackage: (id: string, body: IntegrationPackageUpsertPayload) =>
    http.put<IntegrationPackageVO>(`/user-settings/integration-packages/${encodeURIComponent(id)}`, body),

  deleteIntegrationPackage: (id: string) =>
    http.delete<void>(`/user-settings/integration-packages/${encodeURIComponent(id)}`),

  patchApiKeyIntegrationPackage: (id: string, body: { integrationPackageId?: string | null }) =>
    http.patch<void>(`/user-settings/api-keys/${encodeURIComponent(id)}/integration-package`, body),
};
