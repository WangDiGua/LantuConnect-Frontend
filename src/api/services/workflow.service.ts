import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  CreateWorkflowPayload,
  Workflow,
  WorkflowRun,
  WorkflowSchedule,
  WorkflowTemplate,
} from '../../types/dto/workflow';

export const workflowService = {
  list: (params?: PaginationParams) =>
    http.get<PaginatedData<Workflow>>('/workflows', { params }),

  getById: (id: string) => http.get<Workflow>(`/workflows/${id}`),

  create: (data: CreateWorkflowPayload) =>
    http.post<Workflow>('/workflows', data),

  update: (id: string, data: Partial<CreateWorkflowPayload>) =>
    http.put<Workflow>(`/workflows/${id}`, data),

  delete: (id: string) => http.delete(`/workflows/${id}`),

  execute: (id: string, input?: Record<string, unknown>) =>
    http.post<WorkflowRun>(`/workflows/${id}/execute`, { input }),

  listRuns: (workflowId?: string, params?: PaginationParams) =>
    http.get<PaginatedData<WorkflowRun>>(
      workflowId ? `/workflows/${workflowId}/runs` : '/workflows/runs',
      { params },
    ),

  listSchedules: (workflowId?: string) =>
    http.get<WorkflowSchedule[]>(
      workflowId ? `/workflows/${workflowId}/schedules` : '/workflows/schedules',
    ),

  createSchedule: (workflowId: string, data: { cron: string; timezone?: string; enabled?: boolean; input?: Record<string, unknown> }) =>
    http.post<WorkflowSchedule>(`/workflows/${workflowId}/schedules`, data),

  updateSchedule: (scheduleId: string, data: Partial<Pick<WorkflowSchedule, 'cron' | 'timezone' | 'enabled' | 'input'>>) =>
    http.put<WorkflowSchedule>(`/workflows/schedules/${scheduleId}`, data),

  deleteSchedule: (workflowId: string, scheduleId: string) =>
    http.delete(`/workflows/${workflowId}/schedules/${scheduleId}`),

  listTemplates: () =>
    http.get<WorkflowTemplate[]>('/workflows/templates'),
};
