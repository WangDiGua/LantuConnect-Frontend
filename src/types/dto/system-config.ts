export interface RateLimitRule {
  id: string;
  name: string;
  target: 'user' | 'role' | 'ip' | 'api_key' | 'global' | 'path';
  targetValue?: string;
  windowMs: number;
  maxRequests: number;
  maxTokens?: number;
  burstLimit?: number;
  action: 'reject' | 'queue' | 'throttle';
  enabled: boolean;
  priority: number;
  /** all 或 agent/skill/mcp/app/dataset：仅对该类资源的网关调用生效 */
  resourceScope?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRateLimitDTO {
  name: string;
  target: RateLimitRule['target'];
  targetValue?: string;
  windowMs: number;
  maxRequests: number;
  maxTokens?: number;
  burstLimit?: number;
  action: RateLimitRule['action'];
  priority?: number;
  resourceScope?: string | null;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ip: string;
  userAgent: string;
  result: 'success' | 'failure';
  createdAt: string;
  time: string;
  operator: string;
  target: string;
}

export interface SystemParam {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  category: string;
  editable: boolean;
  updatedAt: string;
}

export interface SecuritySetting {
  key: string;
  value: string | boolean | number;
  label: string;
  description: string;
  /** 与 t_security_setting.type 一致：toggle/select/input/number… */
  type: 'toggle' | 'input' | 'select' | 'boolean' | 'number' | 'string';
  /** select 的可选值（后端 options 列 JSON 数组） */
  options?: string[];
  category: string;
}
