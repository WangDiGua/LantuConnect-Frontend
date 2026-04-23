export interface UserWorkspace {
  id: string;
  name: string;
  description?: string;
  defaultModel?: string;
  maxConcurrentRuns?: number;
  language: string;
  timezone: string;
  notifications: NotificationPrefs;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPrefs {
  email: boolean;
  browser: boolean;
  agentErrors: boolean;
  billingAlerts: boolean;
  systemUpdates: boolean;
  weeklyReport: boolean;
}

export interface UserApiKey {
  id: string;
  name: string;
  prefix: string;
  maskedKey: string;
  scopes: string[];
  /** 后端撤销后为 revoked；业务上不可继续使用。 */
  status: 'active' | 'expired' | 'revoked';
  expiresAt?: string;
  lastUsedAt?: string;
  lastUsed?: string;
  callCount: number;
  createdAt: string;
  /** 非空时网关按集成套餐白名单裁剪可访问资源。 */
  integrationPackageId?: string | null;
}

export interface UserApiKeyDetail extends UserApiKey {
  secretPlain?: string;
  secretAvailable: boolean;
}

/** GET /user-settings/integration-packages 下拉项。 */
export interface UserIntegrationPackageOption {
  id: string;
  name: string;
  description?: string;
  /** active | disabled */
  status?: string;
  itemCount: number;
}

export interface CreateUserApiKeyPayload {
  name: string;
  scopes?: string[];
  expiresAt?: string;
  integrationPackageId?: string | null;
}

export interface ApiKeyRevokePayload {
  password?: string;
}

/** POST /user-settings/api-keys/{id}/invoke-eligibility */
export interface InvokeEligibilityRequest {
  resourceType: string;
  resourceIds: string[];
}

export interface InvokeEligibilityResponse {
  byResourceId: Record<string, boolean>;
}

/** 创建接口成功时，后端可能返回 secretPlain 或 plainKey，二者均为完整可调用密钥且仅返回一次。 */
export type CreatedUserApiKey = UserApiKey & { plainKey: string; secretPlain?: string };

export interface UserStats {
  totalAgents: number;
  totalWorkflows: number;
  totalApiCalls: number;
  storageUsedMb: number;
  activeSessions: number;
  period?: string;
  apiCalls?: number;
  agentsCreated?: number;
  datasetsCreated?: number;
}
