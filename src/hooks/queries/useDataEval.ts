import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dataEvalService,
  type CreateABTestPayload,
  type UpdateABTestPayload,
} from '../../api/services/data-eval.service';
import type { PaginationParams } from '../../types/api';
import type {
  CreateDatasetPayload,
  CreateEvalPayload,
  DataLabel,
  ExportDataPayload,
} from '../../types/dto/data-eval';

export const dataEvalKeys = {
  conversations: (p?: PaginationParams) => ['dataEval', 'conversations', p] as const,
  datasets: ['dataEval', 'datasets'] as const,
  evalRuns: ['dataEval', 'evalRuns'] as const,
  abTests: ['dataEval', 'abTests'] as const,
  labels: ['dataEval', 'labels'] as const,
};

// --- Conversations ---
export function useConversationList(params?: PaginationParams) {
  return useQuery({ queryKey: dataEvalKeys.conversations(params), queryFn: () => dataEvalService.listConversations(params) });
}
export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataEvalService.deleteConversation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dataEval', 'conversations'] }); },
  });
}

// --- Datasets ---
export function useDatasets() {
  return useQuery({ queryKey: dataEvalKeys.datasets, queryFn: () => dataEvalService.listDatasets() });
}
export function useCreateDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDatasetPayload) => dataEvalService.createDataset(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dataEvalKeys.datasets }); },
  });
}
export function useDeleteDataset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataEvalService.deleteDataset(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dataEvalKeys.datasets }); },
  });
}

// --- Eval Runs ---
export function useEvalRuns() {
  return useQuery({ queryKey: dataEvalKeys.evalRuns, queryFn: () => dataEvalService.listEvalRuns() });
}
export function useCreateEval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEvalPayload) => dataEvalService.createEvalRun(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dataEvalKeys.evalRuns }); },
  });
}

// --- A/B Tests ---
export function useABTests() {
  return useQuery({ queryKey: dataEvalKeys.abTests, queryFn: () => dataEvalService.listABTests() });
}
export function useCreateABTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateABTestPayload) => dataEvalService.createABTest(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dataEvalKeys.abTests }); },
  });
}
export function useUpdateABTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateABTestPayload }) => dataEvalService.updateABTest(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dataEvalKeys.abTests }); },
  });
}

// --- Labels ---
export function useLabels() {
  return useQuery({ queryKey: dataEvalKeys.labels, queryFn: () => dataEvalService.listLabels() });
}
export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<DataLabel, 'label' | 'value' | 'confidence'>> }) => dataEvalService.updateLabel(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dataEvalKeys.labels }); },
  });
}

// --- Export ---
export function useExportData() {
  return useMutation({
    mutationFn: (data: ExportDataPayload) => dataEvalService.exportData(data),
  });
}
