import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  CreateDatabasePayload,
  DatabaseInstance,
  DatabaseTable,
} from '../../types/dto/database';

export const databaseService = {
  list: (params?: PaginationParams) =>
    http.get<PaginatedData<DatabaseInstance>>('/databases', { params }),

  getById: (id: string) => http.get<DatabaseInstance>(`/databases/${id}`),

  create: (data: CreateDatabasePayload) =>
    http.post<DatabaseInstance>('/databases', data),

  update: (id: string, data: Partial<CreateDatabasePayload>) =>
    http.put<DatabaseInstance>(`/databases/${id}`, data),

  delete: (id: string) => http.delete(`/databases/${id}`),

  listTables: (dbId: string) =>
    http.get<DatabaseTable[]>(`/databases/${dbId}/tables`),
};
