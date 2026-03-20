export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  category?: string;
  variables?: PromptVariable[];
  tags?: string[];
  usageCount?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  description?: string;
  required: boolean;
  defaultValue?: string;
  options?: string[];
}

export interface TermEntry {
  id: string;
  term: string;
  definition: string;
  category?: string;
  synonyms?: string[];
  createdAt?: string;
}

export interface SecretEntry {
  id: string;
  name?: string;
  key?: string;
  masked?: string;
  maskedValue?: string;
  scope?: 'project' | 'global';
  type?: 'api_key' | 'token' | 'password' | 'certificate';
  description?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface MemoryEntry {
  id: string;
  key?: string;
  value?: string;
  userId?: string;
  content?: string;
  scope?: 'global' | 'agent' | 'user' | 'session';
  agentId?: string;
  ttl?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentAsset {
  id: string;
  name?: string;
  fileName?: string;
  type?: string;
  size?: number;
  url?: string;
  status: 'ready' | 'processing' | 'error' | 'pending' | 'done' | 'failed';
  metadata?: Record<string, string>;
  createdBy?: string;
  createdAt?: string;
}
