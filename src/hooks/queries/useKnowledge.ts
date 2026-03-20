import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '../../api/services/knowledge.service';
import type { CreateKBPayload } from '../../types/dto/knowledge';
import type { PaginationParams } from '../../types/api';

export const kbKeys = {
  all: ['knowledgeBases'] as const,
  list: (p?: PaginationParams) => ['knowledgeBases', 'list', p] as const,
  detail: (id: string) => ['knowledgeBases', 'detail', id] as const,
  docs: (kbId: string) => ['knowledgeBases', 'docs', kbId] as const,
};

export function useKnowledgeBases(params?: PaginationParams) {
  return useQuery({ queryKey: kbKeys.list(params), queryFn: () => knowledgeService.list(params) });
}

export function useKnowledgeBase(id: string) {
  return useQuery({ queryKey: kbKeys.detail(id), queryFn: () => knowledgeService.getById(id), enabled: !!id });
}

export function useCreateKB() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data: CreateKBPayload) => knowledgeService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: kbKeys.all }) });
}

export function useUpdateKB() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<CreateKBPayload> }) => knowledgeService.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: kbKeys.all }) });
}

export function useDeleteKB() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => knowledgeService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: kbKeys.all }) });
}

export function useKBDocuments(kbId: string) {
  return useQuery({ queryKey: kbKeys.docs(kbId), queryFn: () => knowledgeService.listDocuments(kbId), enabled: !!kbId });
}

export function useUploadKBDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kbId, formData }: { kbId: string; formData: FormData }) => knowledgeService.uploadDocument(kbId, formData),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: kbKeys.docs(vars.kbId) }),
  });
}

export function useHitTest() {
  return useMutation({
    mutationFn: ({ kbId, query, topK }: { kbId: string; query: string; topK?: number }) => knowledgeService.hitTest(kbId, query, topK),
  });
}
