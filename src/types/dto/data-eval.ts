export interface ConversationMessage {
  role: string;
  content: string;
  at: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  userId: string;
  title: string;
  messageCount?: number;
  tokenCount?: number;
  rating?: number;
  feedback?: string;
  tags?: string[];
  startedAt?: string;
  lastMessageAt?: string;
  lastMessage?: string;
  updatedAt?: string;
  messages?: ConversationMessage[];
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  type?: 'qa' | 'conversation' | 'classification' | 'custom';
  format?: 'jsonl' | 'csv' | 'parquet';
  rowCount?: number;
  rows?: number;
  sizeMb?: number;
  status?: 'ready' | 'processing' | 'error';
  schema?: Record<string, string>;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvalRun {
  id: string;
  name: string;
  datasetId?: string;
  datasetName?: string;
  agentId?: string;
  agentName?: string;
  modelA?: string;
  modelB?: string;
  scoreA?: number;
  scoreB?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  metrics?: Record<string, number>;
  sampleCount?: number;
  completedCount?: number;
  avgScore?: number;
  startedAt?: string;
  completedAt?: string;
  createdBy?: string;
}

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'completed' | 'paused' | 'ended';
  variants?: ABVariant[];
  trafficSplit?: number[];
  trafficA?: number;
  variantA?: string;
  variantB?: string;
  winner?: string;
  sampleSize?: number;
  currentSamples?: number;
  startedAt?: string;
  completedAt?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface ABVariant {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  metrics: Record<string, number>;
  sampleCount: number;
}

export interface DataLabel {
  id: string;
  conversationId?: string;
  text?: string;
  label?: string;
  value?: string;
  confidence?: number;
  labeledBy?: string;
  createdAt?: string;
}

export interface CreateDatasetPayload {
  name: string;
  description?: string;
  type?: Dataset['type'];
  format?: Dataset['format'];
}

export interface CreateEvalPayload {
  name: string;
  datasetId: string;
  agentId?: string;
  modelA?: string;
  modelB?: string;
}

export interface ExportDataPayload {
  format: 'json' | 'csv' | 'xlsx' | 'jsonl';
  dateFrom?: string;
  dateTo?: string;
  type?: 'conversations' | 'datasets' | 'eval-runs';
}

export interface ExportDataResponse {
  downloadUrl: string;
}
