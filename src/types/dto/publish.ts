export interface PublishChannel {
  id: string;
  name: string;
  type: 'api' | 'embed' | 'share_link' | 'wechat' | 'dingtalk' | 'feishu' | 'slack';
  agentId: string;
  agentName: string;
  status: 'active' | 'disabled';
  config: Record<string, unknown>;
  callCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShareLink {
  id: string;
  agentId: string;
  agentName: string;
  token: string;
  url: string;
  name?: string;
  title?: string;
  password?: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
  visits?: number;
  status: 'active' | 'expired' | 'disabled';
  createdAt: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  status: 'active' | 'disabled';
  retryCount: number;
  lastTriggeredAt?: string;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmbedConfig {
  agentId: string;
  agentName?: string;
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  title: string;
  welcomeMessage: string;
  position: 'bottom-right' | 'bottom-left';
  width: number;
  height: number;
  scriptTag: string;
  code?: string;
}

export interface EventSubscription {
  id: string;
  event: string;
  description: string;
  enabled: boolean;
  webhookIds: string[];
  completed?: boolean;
  failed?: boolean;
  started?: boolean;
}

export interface CreateWebhookPayload {
  name?: string;
  url: string;
  secret?: string;
  events: string[];
}

export interface CreateSharePayload {
  agentId?: string;
  name?: string;
  title?: string;
  password?: string;
  expiresAt?: string;
  maxUses?: number;
}
