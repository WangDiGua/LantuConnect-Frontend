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
