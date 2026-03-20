import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type { CreateProjectPayload, Project } from '../../types/dto/project';

export const projectService = {
  list: (params?: PaginationParams) =>
    http.get<PaginatedData<Project>>('/projects', { params }),

  getById: (id: string) => http.get<Project>(`/projects/${id}`),

  create: (data: CreateProjectPayload) =>
    http.post<Project>('/projects', data),

  update: (id: string, data: Partial<CreateProjectPayload>) =>
    http.put<Project>(`/projects/${id}`, data),

  delete: (id: string) => http.delete(`/projects/${id}`),
};
