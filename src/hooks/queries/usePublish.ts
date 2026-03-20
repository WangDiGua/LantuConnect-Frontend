import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publishService } from '../../api/services/publish.service';
import type {
  CreateSharePayload,
  CreateWebhookPayload,
  EventSubscription,
} from '../../types/dto/publish';

export const publishKeys = {
  apiKey: (agentId?: string) => ['publish', 'apiKey', agentId] as const,
  embed: (agentId?: string) => ['publish', 'embed', agentId] as const,
  webhooks: ['publish', 'webhooks'] as const,
  shares: ['publish', 'shares'] as const,
  events: ['publish', 'events'] as const,
};

export function useApiKey(agentId?: string) {
  return useQuery({
    queryKey: publishKeys.apiKey(agentId),
    queryFn: () => publishService.getApiKey(agentId),
  });
}

export function useRegenerateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agentId?: string) => publishService.regenerateApiKey(agentId),
    onSuccess: (_data, agentId) => { qc.invalidateQueries({ queryKey: publishKeys.apiKey(agentId) }); },
  });
}

export function useEmbed(agentId?: string) {
  return useQuery({
    queryKey: publishKeys.embed(agentId),
    queryFn: () => publishService.getEmbed(agentId!),
    enabled: !!agentId,
  });
}

// --- Webhooks ---
export function useWebhookList() {
  return useQuery({ queryKey: publishKeys.webhooks, queryFn: () => publishService.listWebhooks() });
}
export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWebhookPayload) => publishService.createWebhook(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: publishKeys.webhooks }); },
  });
}
export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishService.deleteWebhook(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: publishKeys.webhooks }); },
  });
}

// --- Shares ---
export function useShareList() {
  return useQuery({ queryKey: publishKeys.shares, queryFn: () => publishService.listShares() });
}
export function useCreateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSharePayload) => publishService.createShare(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: publishKeys.shares }); },
  });
}
export function useDeleteShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishService.deleteShare(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: publishKeys.shares }); },
  });
}

// --- Events ---
export function useEventSubscriptions() {
  return useQuery({ queryKey: publishKeys.events, queryFn: () => publishService.listEvents() });
}
export function useUpdateEvents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EventSubscription[]) => publishService.updateEvents(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: publishKeys.events }); },
  });
}
