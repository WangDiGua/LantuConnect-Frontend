import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  assetService,
  type CreatePromptPayload,
  type CreateTermPayload,
  type CreateSecretPayload,
  type CreateMemoryPayload,
} from '../../api/services/asset.service';
import type { PaginationParams } from '../../types/api';

export const assetKeys = {
  prompts: (p?: PaginationParams) => ['asset', 'prompts', p] as const,
  terms: ['asset', 'terms'] as const,
  secrets: ['asset', 'secrets'] as const,
  memories: ['asset', 'memories'] as const,
  documents: ['asset', 'documents'] as const,
};

// --- Prompts ---
export function usePromptList(params?: PaginationParams) {
  return useQuery({ queryKey: assetKeys.prompts(params), queryFn: () => assetService.listPrompts(params) });
}
export function useCreatePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePromptPayload) => assetService.createPrompt(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset', 'prompts'] }); },
  });
}
export function useUpdatePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePromptPayload> }) => assetService.updatePrompt(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset', 'prompts'] }); },
  });
}
export function useDeletePrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.deletePrompt(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['asset', 'prompts'] }); },
  });
}

// --- Terms ---
export function useTermList() {
  return useQuery({ queryKey: assetKeys.terms, queryFn: () => assetService.listTerms() });
}
export function useCreateTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTermPayload) => assetService.createTerm(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.terms }); },
  });
}
export function useDeleteTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.deleteTerm(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.terms }); },
  });
}

// --- Secrets ---
export function useSecretList() {
  return useQuery({ queryKey: assetKeys.secrets, queryFn: () => assetService.listSecrets() });
}
export function useCreateSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSecretPayload) => assetService.createSecret(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.secrets }); },
  });
}
export function useDeleteSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.deleteSecret(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.secrets }); },
  });
}

// --- Memories ---
export function useMemoryList() {
  return useQuery({ queryKey: assetKeys.memories, queryFn: () => assetService.listMemories() });
}
export function useCreateMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMemoryPayload) => assetService.createMemory(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.memories }); },
  });
}
export function useDeleteMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetService.deleteMemory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.memories }); },
  });
}

// --- Documents ---
export function useDocumentList() {
  return useQuery({ queryKey: assetKeys.documents, queryFn: () => assetService.listDocuments() });
}
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => assetService.uploadDocument(formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: assetKeys.documents }); },
  });
}
