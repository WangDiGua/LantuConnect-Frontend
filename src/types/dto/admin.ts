export interface ResourceMetric {
  id: string;
  name: string;
  type: 'cpu' | 'memory' | 'disk' | 'gpu' | 'network';
  current: number;
  max: number;
  unit: string;
  trend: number[];
  status: 'normal' | 'warning' | 'critical';
  usagePct: number;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastChecked: string;
  message?: string;
  uptime: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalAgents: number;
  totalApiCalls: number;
  totalCalls: number;
  systemUptime: number;
  avgResponseTime: number;
  avgLatency: number;
  errorRate: number;
  storageUsedGb: number;
  dau: number;
  activeAgents: number;
}

export interface GatewayRoute {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | '*';
  upstream: string;
  rateLimit: number;
  rps: number;
  authRequired: boolean;
  cors: boolean;
  timeout: number;
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGatewayRoutePayload {
  path: string;
  method?: GatewayRoute['method'];
  upstream: string;
  rateLimit?: number;
  rps?: number;
  authRequired?: boolean;
  cors?: boolean;
  timeout?: number;
  description?: string;
}

export interface BackupRecord {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'running' | 'completed' | 'failed';
  sizeMb: number;
  duration: number;
  target: string;
  createdBy: string;
  startedAt: string;
  completedAt?: string;
  schedule: string;
  last: string;
  ok: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'maintenance' | 'feature';
  status: 'draft' | 'published' | 'expired';
  targetRoles: string[];
  publishedAt?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface OperationLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  module: string;
  target: string;
  targetId?: string;
  detail: string;
  ip: string;
  result: 'success' | 'failure';
  createdAt: string;
  operator: string;
  time: string;
}

export interface ErrorLog {
  id: string;
  level: 'error' | 'fatal' | 'warning';
  service: string;
  message: string;
  stack?: string;
  requestId?: string;
  userId?: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  operator: string;
  time: string;
  detail: string;
  target: string;
}

export interface OpsQueueItem {
  id: string;
  type: 'deployment' | 'migration' | 'maintenance' | 'review';
  title: string;
  description: string;
  content: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  risk: string;
  assignee?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SensitiveWord {
  id: string;
  word: string;
  category: string;
  level: 'block' | 'warn' | 'replace';
  replacement?: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateModelEndpointDTO {
  name: string;
  provider: string;
  modelId?: string;
  type?: 'chat' | 'completion' | 'embedding' | 'image' | 'audio' | 'video';
  endpoint: string;
  apiKey?: string;
  region?: string;
  maxTokens?: number;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  rateLimit?: number;
  latencyMs?: number;
  status?: string;
}
