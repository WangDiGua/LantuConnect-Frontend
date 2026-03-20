import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService } from '../../api/services/agent.service';
import type { AgentCreatePayload, DebugMessageRequest } from '../../types/dto/agent';
import type { PaginationParams } from '../../types/api';

export const agentKeys = {
  all: ['agents'] as const,
  list: (p?: PaginationParams) => ['agents', 'list', p] as const,
  detail: (id: string) => ['agents', 'detail', id] as const,
  versions: (agentId: string) => ['agents', 'versions', agentId] as const,
  market: (p?: PaginationParams) => ['agents', 'market', p] as const,
};

export function useAgents(params?: PaginationParams) {
  return useQuery({
    queryKey: agentKeys.list(params),
    queryFn: () => agentService.list(params),
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: () => agentService.getById(id),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AgentCreatePayload) => agentService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AgentCreatePayload> }) =>
      agentService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

export function useAgentVersions(agentId: string) {
  return useQuery({
    queryKey: agentKeys.versions(agentId),
    queryFn: () => agentService.listVersions(agentId),
    enabled: !!agentId,
  });
}

export function useSendDebugMessage() {
  return useMutation({
    mutationFn: (data: DebugMessageRequest) => agentService.sendDebugMessage(data),
  });
}

export function useAgentMarket(params?: PaginationParams) {
  return useQuery({
    queryKey: agentKeys.market(params),
    queryFn: () => agentService.listMarket(params),
  });
}
