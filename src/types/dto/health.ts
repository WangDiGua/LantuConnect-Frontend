export interface HealthConfigItem {
  id: number;
  agentName: string;
  displayName: string;
  agentType: string;
  checkType: 'http' | 'tcp' | 'ping';
  checkUrl: string;
  intervalSec: number;
  healthyThreshold: number;
  timeoutSec: number;
  healthStatus: 'healthy' | 'degraded' | 'down';
  lastCheckTime: string;
}

export interface CircuitBreakerItem {
  id: number;
  agentName: string;
  /** 统一资源类型：agent/skill/mcp/app/dataset */
  resourceType?: string;
  displayName: string;
  currentState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureThreshold: number;
  openDurationSec: number;
  halfOpenMaxCalls: number;
  fallbackAgentName: string | null;
  fallbackMessage: string;
  lastOpenedAt: string | null;
  successCount: number;
  failureCount: number;
}
