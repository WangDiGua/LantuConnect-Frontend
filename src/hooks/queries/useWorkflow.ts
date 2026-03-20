import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowService } from '../../api/services/workflow.service';
import type { PaginationParams } from '../../types/api';
import type { CreateWorkflowPayload, WorkflowSchedule } from '../../types/dto/workflow';

export const workflowKeys = {
  list: (p?: PaginationParams) => ['workflow', p] as const,
  runs: (p?: PaginationParams) => ['workflow', 'runs', p] as const,
  schedules: (workflowId?: string) => ['workflow', 'schedules', workflowId] as const,
  templates: ['workflow', 'templates'] as const,
};

export function useWorkflowList(params?: PaginationParams) {
  return useQuery({ queryKey: workflowKeys.list(params), queryFn: () => workflowService.list(params) });
}

export function useWorkflowRuns(params?: PaginationParams) {
  return useQuery({
    queryKey: workflowKeys.runs(params),
    queryFn: () => workflowService.listRuns(undefined, params),
  });
}

export function useWorkflowSchedules(workflowId?: string) {
  return useQuery({
    queryKey: workflowKeys.schedules(workflowId),
    queryFn: () => workflowService.listSchedules(workflowId),
  });
}

export function useWorkflowTemplates() {
  return useQuery({ queryKey: workflowKeys.templates, queryFn: () => workflowService.listTemplates() });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowPayload) => workflowService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow'] }); },
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateWorkflowPayload> }) => workflowService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow'] }); },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow'] }); },
  });
}

export function useExecuteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: string | { id: string; input?: Record<string, unknown> }) => {
      const id = typeof args === 'string' ? args : args.id;
      const input = typeof args === 'string' ? undefined : args.input;
      return workflowService.execute(id, input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow'] }); },
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workflowId, ...data }: { workflowId: string; cron: string; timezone?: string; enabled?: boolean; input?: Record<string, unknown> }) =>
      workflowService.createSchedule(workflowId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow'] }); },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<WorkflowSchedule, 'cron' | 'timezone' | 'enabled' | 'input'>> }) =>
      workflowService.updateSchedule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workflow'] }); },
  });
}
