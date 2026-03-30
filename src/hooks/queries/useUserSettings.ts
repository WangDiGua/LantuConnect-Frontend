import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userSettingsService } from '../../api/services/user-settings.service';
import type { CreateUserApiKeyPayload, UserWorkspace } from '../../types/dto/user-settings';

export const userSettingsKeys = {
  workspace: ['userSettings', 'workspace'] as const,
  apiKeys: ['userSettings', 'apiKeys'] as const,
  stats: ['userSettings', 'stats'] as const,
};

export function useUserWorkspace() {
  return useQuery({ queryKey: userSettingsKeys.workspace, queryFn: () => userSettingsService.getWorkspace() });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Omit<UserWorkspace, 'id' | 'createdAt' | 'updatedAt'>>) => userSettingsService.updateWorkspace(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: userSettingsKeys.workspace }); },
  });
}

export function useUserApiKeys() {
  return useQuery({ queryKey: userSettingsKeys.apiKeys, queryFn: () => userSettingsService.listApiKeys() });
}

export function useCreateUserApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserApiKeyPayload) => userSettingsService.createApiKey(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: userSettingsKeys.apiKeys }); },
  });
}

export function useDeleteUserApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userSettingsService.deleteApiKey(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: userSettingsKeys.apiKeys }); },
  });
}

export function useUserStats() {
  return useQuery({ queryKey: userSettingsKeys.stats, queryFn: () => userSettingsService.getStats() });
}
