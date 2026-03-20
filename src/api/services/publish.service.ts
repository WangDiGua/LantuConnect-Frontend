import { http } from '../../lib/http';
import type {
  CreateSharePayload,
  CreateWebhookPayload,
  EmbedConfig,
  EventSubscription,
  ShareLink,
  WebhookConfig,
} from '../../types/dto/publish';

export const publishService = {
  getApiKey: (agentId?: string) =>
    http.get<{ key: string }>(agentId ? `/publish/${agentId}/api-key` : '/publish/api-key'),

  regenerateApiKey: (agentId?: string) =>
    http.post<{ key: string }>(agentId ? `/publish/${agentId}/api-key/regenerate` : '/publish/api-key/regenerate'),

  getEmbed: (agentId: string) =>
    http.get<EmbedConfig>(`/publish/${agentId}/embed`),

  listWebhooks: () => http.get<WebhookConfig[]>('/publish/webhooks'),

  createWebhook: (data: CreateWebhookPayload) =>
    http.post<WebhookConfig>('/publish/webhooks', data),

  deleteWebhook: (id: string) =>
    http.delete(`/publish/webhooks/${id}`),

  listShares: () => http.get<ShareLink[]>('/publish/shares'),

  createShare: (data: CreateSharePayload) =>
    http.post<ShareLink>('/publish/shares', data),

  deleteShare: (id: string) =>
    http.delete(`/publish/shares/${id}`),

  listEvents: () =>
    http.get<EventSubscription[]>('/publish/events'),

  updateEvents: (data: EventSubscription[]) =>
    http.put<EventSubscription[]>('/publish/events', data),
};
