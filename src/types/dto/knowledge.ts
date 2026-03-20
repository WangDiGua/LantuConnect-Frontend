export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  type: 'qa' | 'document' | 'table' | 'custom';
  embeddingModel: string;
  documentCount: number;
  totalChunks: number;
  totalTokens: number;
  status: 'ready' | 'indexing' | 'error';
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KBDocument {
  id: string;
  kbId: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'html' | 'url';
  size: number;
  chunkCount: number;
  tokenCount: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage?: string;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface HitTestResult {
  documentId: string;
  documentName: string;
  chunkId: string;
  content: string;
  score: number;
  metadata: Record<string, string>;
}

export interface CreateKBPayload {
  name: string;
  description?: string;
  type: KnowledgeBase['type'];
  embeddingModel: string;
  tags?: string[];
}
