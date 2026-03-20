import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../../api/services/project.service';
import type { PaginationParams } from '../../types/api';
import type { CreateProjectPayload } from '../../types/dto/project';

export const projectKeys = {
  list: (p?: PaginationParams) => ['project', p] as const,
};

export function useProjectList(params?: PaginationParams) {
  return useQuery({ queryKey: projectKeys.list(params), queryFn: () => projectService.list(params) });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectPayload) => projectService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project'] }); },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProjectPayload> }) => projectService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project'] }); },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project'] }); },
  });
}
