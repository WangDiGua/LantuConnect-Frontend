export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  trigger: 'manual' | 'schedule' | 'webhook' | 'event';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  steps?: string[];
  version: string;
  runCount: number;
  lastRunAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'llm' | 'code' | 'condition' | 'http' | 'tool' | 'human';
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'failed' | 'cancelled' | 'timeout';
  trigger: Workflow['trigger'];
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  log?: string;
  durationMs: number;
  tokenUsage: number;
  startedAt: string;
  completedAt?: string;
}

export interface WorkflowSchedule {
  id: string;
  workflowId: string;
  workflowName: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  input: Record<string, unknown>;
  lastRunAt?: string;
  nextRunAt: string;
  createdAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  steps?: string[];
  usageCount: number;
  createdAt: string;
}

export interface CreateWorkflowPayload {
  name: string;
  description?: string;
  trigger?: Workflow['trigger'];
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  steps?: string[];
  templateId?: string;
}
