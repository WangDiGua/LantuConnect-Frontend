import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelServiceApi } from '../../api/services/model-service.service';
import type { CreateFineTunePayload, SendPlaygroundPayload } from '../../types/dto/model-service';

export const modelKeys = {
  endpoints: ['model', 'endpoints'] as const,
  playground: (modelId?: string) => ['model', 'playground', modelId] as const,
  fineTune: ['model', 'fineTune'] as const,
};

export function useModelList() {
  return useQuery({ queryKey: modelKeys.endpoints, queryFn: () => modelServiceApi.listEndpoints() });
}

export function usePlayground(modelId?: string) {
  return useQuery({
    queryKey: modelKeys.playground(modelId),
    queryFn: () => modelServiceApi.getPlayground(modelId!),
    enabled: !!modelId,
  });
}

export function useSendPlayground() {
  return useMutation({
    mutationFn: (data: SendPlaygroundPayload) => modelServiceApi.sendPlaygroundMessage(data),
  });
}

export function useFineTuneList() {
  return useQuery({ queryKey: modelKeys.fineTune, queryFn: () => modelServiceApi.listFineTuneJobs() });
}

export function useCreateFineTune() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFineTunePayload) => modelServiceApi.createFineTuneJob(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: modelKeys.fineTune }); },
  });
}
