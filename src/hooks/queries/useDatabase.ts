import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databaseService } from '../../api/services/database.service';
import type { CreateDatabasePayload } from '../../types/dto/database';
import type { PaginationParams } from '../../types/api';

export const dbKeys = {
  all: ['databases'] as const,
  list: (p?: PaginationParams) => ['databases', 'list', p] as const,
  detail: (id: string) => ['databases', 'detail', id] as const,
  tables: (dbId: string) => ['databases', 'tables', dbId] as const,
};

export function useDatabases(params?: PaginationParams) {
  return useQuery({ queryKey: dbKeys.list(params), queryFn: () => databaseService.list(params) });
}

export function useDatabaseDetail(id: string) {
  return useQuery({ queryKey: dbKeys.detail(id), queryFn: () => databaseService.getById(id), enabled: !!id });
}

export function useCreateDatabase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: CreateDatabasePayload) => databaseService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: dbKeys.all }) });
}

export function useUpdateDatabase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<CreateDatabasePayload> }) => databaseService.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: dbKeys.all }) });
}

export function useDeleteDatabase() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => databaseService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: dbKeys.all }) });
}

export function useDatabaseTables(dbId: string) {
  return useQuery({ queryKey: dbKeys.tables(dbId), queryFn: () => databaseService.listTables(dbId), enabled: !!dbId });
}
