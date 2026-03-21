import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService } from '../../api/services/agent.service';
import type {
  AgentCreatePayload,
  AgentUpdatePayload,
  AgentListQuery,
} from '../../types/dto/agent';

export const agentKeys = {
  all: ['agents'] as const,
  list: (q?: AgentListQuery) => ['agents', 'list', q] as const,
  detail: (id: number) => ['agents', 'detail', id] as const,
};

export function useAgents(query?: AgentListQuery) {
  return useQuery({
    queryKey: agentKeys.list(query),
    queryFn: () => agentService.list(query),
  });
}

export function useAgent(id: number) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: () => agentService.getById(id),
    enabled: id > 0,
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
    mutationFn: ({ id, data }: { id: number; data: AgentUpdatePayload }) =>
      agentService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => agentService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}
