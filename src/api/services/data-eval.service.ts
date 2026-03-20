import { http } from '../../lib/http';
import type { PaginatedData, PaginationParams } from '../../types/api';
import type {
  ABTest,
  Conversation,
  CreateDatasetPayload,
  CreateEvalPayload,
  DataLabel,
  Dataset,
  EvalRun,
  ExportDataPayload,
  ExportDataResponse,
} from '../../types/dto/data-eval';

export interface CreateABTestPayload {
  name: string;
  trafficA?: number;
  variantA?: string;
  variantB?: string;
  description?: string;
  variants?: ABTest['variants'];
  trafficSplit?: number[];
  sampleSize?: number;
}

export interface UpdateABTestPayload {
  name?: string;
  description?: string;
  status?: ABTest['status'];
  trafficSplit?: number[];
  trafficA?: number;
  sampleSize?: number;
  winner?: string;
}

export const dataEvalService = {
  listConversations: (params?: PaginationParams) =>
    http.get<PaginatedData<Conversation>>('/data-eval/conversations', { params }),

  deleteConversation: (id: string) =>
    http.delete(`/data-eval/conversations/${id}`),

  listDatasets: () => http.get<Dataset[]>('/data-eval/datasets'),

  createDataset: (data: CreateDatasetPayload) =>
    http.post<Dataset>('/data-eval/datasets', data),

  deleteDataset: (id: string) =>
    http.delete(`/data-eval/datasets/${id}`),

  listEvalRuns: () => http.get<EvalRun[]>('/data-eval/eval-runs'),

  createEvalRun: (data: CreateEvalPayload) =>
    http.post<EvalRun>('/data-eval/eval-runs', data),

  listABTests: () => http.get<ABTest[]>('/data-eval/ab-tests'),

  createABTest: (data: CreateABTestPayload) =>
    http.post<ABTest>('/data-eval/ab-tests', data),

  updateABTest: (id: string, data: UpdateABTestPayload) =>
    http.patch<ABTest>(`/data-eval/ab-tests/${id}`, data),

  listLabels: () => http.get<DataLabel[]>('/data-eval/labels'),

  updateLabel: (id: string, data: Partial<Pick<DataLabel, 'label' | 'value' | 'confidence'>>) =>
    http.patch<DataLabel>(`/data-eval/labels/${id}`, data),

  exportData: (data: ExportDataPayload) =>
    http.post<ExportDataResponse>('/data-eval/export', data),
};
