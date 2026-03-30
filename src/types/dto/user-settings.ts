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
  /** 后端软删除 / 撤销后为 revoked；列表接口可能仍带回，但业务上不可用 */
  status: 'active' | 'expired' | 'revoked';
  expiresAt?: string;
  lastUsedAt?: string;
  lastUsed?: string;
  callCount: number;
  createdAt: string;
}

export interface CreateUserApiKeyPayload {
  name: string;
  scopes?: string[];
  expiresAt?: string;
}

/** 创建接口成功时，后端可能返回 secretPlain 与/或 plainKey，二者均为完整可调用密钥（仅响应一次）。 */
export type CreatedUserApiKey = UserApiKey & { plainKey: string; secretPlain?: string };

export interface UserStats {
  totalAgents: number;
  totalWorkflows: number;
  totalApiCalls: number;
  tokenUsage: number;
  storageUsedMb: number;
  activeSessions: number;
  period?: string;
  apiCalls?: number;
  tokensUsed?: number;
  agentsCreated?: number;
  datasetsCreated?: number;
}
