import type { PaginatedData } from '../api';
import type { InvokeResponse, ResourceBindingSummaryVO, ToolDispatchRouteVO } from './catalog';

export type CapabilityType = 'agent' | 'skill' | 'mcp';

export interface CapabilityImportRequest {
  source: string;
  preferredType?: CapabilityType;
  displayName?: string;
  description?: string;
}

export interface CapabilityImportSuggestionVO {
  detectedType: CapabilityType;
  confidence: 'low' | 'medium' | 'high' | string;
  reason: string;
  displayName: string;
  resourceCode: string;
  description?: string;
  runtimeMode?: string;
  inputSchema?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  authRefs?: Record<string, unknown>;
  bindings?: number[];
  capabilities?: Record<string, unknown>;
  requiresConfirmation?: boolean;
  warnings?: string[];
}

export interface CapabilityCreateRequest {
  source: string;
  detectedType: CapabilityType;
  displayName: string;
  resourceCode?: string;
  description?: string;
  sourceType?: string;
  runtimeMode?: string;
  inputSchema?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  authRefs?: Record<string, unknown>;
  bindings?: number[];
  capabilities?: Record<string, unknown>;
  submitForAudit?: boolean;
}

export interface CapabilitySummaryVO {
  capabilityId: number;
  capabilityType: CapabilityType;
  displayName: string;
  resourceCode: string;
  description?: string;
  status?: string;
  runtimeMode?: string;
  invokeMode?: string;
  callCount?: number;
  viewCount?: number;
  ratingAvg?: number | null;
  reviewCount?: number | null;
  tags?: string[];
}

export type CapabilityPage = PaginatedData<CapabilitySummaryVO>;

export interface CapabilityDetailVO {
  capabilityId: number;
  capabilityType: CapabilityType;
  displayName: string;
  resourceCode: string;
  status?: string;
  version?: string;
  runtimeMode?: string;
  invokeMode?: string;
  invokeType?: string;
  endpoint?: string | null;
  serviceDetailMd?: string | null;
  callable?: boolean;
  inputSchema?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  authRefs?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
  bindingClosure?: ResourceBindingSummaryVO[];
}

export interface CapabilityResolveRequest {
  version?: string;
  include?: string;
}

export interface CapabilityResolveResultVO {
  capability: CapabilityDetailVO;
  resolved: Record<string, unknown>;
  suggestedPayload?: Record<string, unknown>;
}

export interface CapabilityInvokeRequest {
  version?: string;
  timeoutSec?: number;
  payload?: Record<string, unknown>;
}

export interface CapabilityInvokeResultVO {
  capability: CapabilityDetailVO;
  response: InvokeResponse;
}

export interface CapabilityToolItemVO {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface CapabilityToolSessionRequest {
  action?: 'connect' | 'list_tools' | 'call_tool';
  version?: string;
  timeoutSec?: number;
  toolName?: string;
  arguments?: Record<string, unknown>;
}

export interface CapabilityToolSessionVO {
  capabilityId: number;
  capabilityType: CapabilityType;
  action?: string;
  tools?: CapabilityToolItemVO[];
  routes?: ToolDispatchRouteVO[];
  warnings?: string[];
  toolCallResponse?: InvokeResponse | null;
}
