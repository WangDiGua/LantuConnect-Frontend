/**
 * @deprecated Provider legacy types — old /v1/providers/** API has been removed.
 * New code should use resource-center or system-config APIs.
 */

export type ProviderType = 'internal' | 'partner' | 'cloud';
export type AuthType = 'api_key' | 'oauth2' | 'basic' | 'none';
export type ProviderStatus = 'active' | 'inactive';

export interface Provider {
  id: number;
  providerCode: string;
  providerName: string;
  providerType: ProviderType;
  description: string | null;
  authType: AuthType;
  authConfig: Record<string, unknown> | null;
  baseUrl: string | null;
  status: ProviderStatus;
  agentCount: number;
  skillCount: number;
  createTime: string;
  updateTime: string;
}

export interface ProviderCreatePayload {
  providerCode: string;
  providerName: string;
  providerType: ProviderType;
  description?: string;
  authType: AuthType;
  authConfig?: Record<string, unknown>;
  baseUrl?: string;
}

export interface ProviderUpdatePayload extends Partial<ProviderCreatePayload> {
  status?: ProviderStatus;
}

export interface ProviderListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  name?: string;
  providerType?: ProviderType;
  type?: ProviderType;
  status?: ProviderStatus;
}
