import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toolService } from '../../api/services/tool.service';
import type { CreateMcpServerPayload } from '../../types/dto/tool';
import type { PaginationParams } from '../../types/api';

export const toolKeys = {
  all: ['tools'] as const,
  discover: (p?: PaginationParams) => ['tools', 'discover', p] as const,
  mine: ['tools', 'mine'] as const,
  reviews: (p?: PaginationParams) => ['tools', 'reviews', p] as const,
};

export function useToolDiscover(params?: PaginationParams) {
  return useQuery({ queryKey: toolKeys.discover(params), queryFn: () => toolService.discover(params) });
}

export function useMyTools() {
  return useQuery({ queryKey: toolKeys.mine, queryFn: () => toolService.listMine() });
}

export function useCreateMcpServer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: CreateMcpServerPayload) => toolService.createMcpServer(data), onSuccess: () => qc.invalidateQueries({ queryKey: toolKeys.mine }) });
}

export function useUpdateMcpServer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<CreateMcpServerPayload> }) => toolService.updateMcpServer(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: toolKeys.mine }) });
}

export function useDeleteMcpServer() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => toolService.deleteMcpServer(id), onSuccess: () => qc.invalidateQueries({ queryKey: toolKeys.mine }) });
}
