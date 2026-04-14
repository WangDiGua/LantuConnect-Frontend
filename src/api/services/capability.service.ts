import type { AxiosRequestConfig } from 'axios';
import { http } from '../../lib/http';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import type {
  CapabilityCreateRequest,
  CapabilityDetailVO,
  CapabilityImportRequest,
  CapabilityImportSuggestionVO,
  CapabilityInvokeRequest,
  CapabilityInvokeResultVO,
  CapabilityPage,
  CapabilityResolveRequest,
  CapabilityResolveResultVO,
  CapabilitySummaryVO,
  CapabilityToolItemVO,
  CapabilityToolSessionRequest,
  CapabilityToolSessionVO,
  CapabilityType,
} from '../../types/dto/capability';
import type { ResourceCatalogQueryRequest, ToolDispatchRouteVO } from '../../types/dto/catalog';

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optNum(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function normalizeDetail(raw: unknown): CapabilityDetailVO {
  const row = asRecord(raw) ?? {};
  return {
    capabilityId: num(row.capabilityId ?? row.capability_id ?? row.id),
    capabilityType: String(row.capabilityType ?? row.capability_type ?? 'agent') as CapabilityType,
    displayName: String(row.displayName ?? row.display_name ?? ''),
    resourceCode: String(row.resourceCode ?? row.resource_code ?? ''),
    status: row.status == null ? undefined : String(row.status),
    version: row.version == null ? undefined : String(row.version),
    runtimeMode: row.runtimeMode == null ? undefined : String(row.runtimeMode),
    invokeMode: row.invokeMode == null ? undefined : String(row.invokeMode),
    invokeType: row.invokeType == null ? undefined : String(row.invokeType),
    endpoint: row.endpoint == null ? undefined : String(row.endpoint),
    serviceDetailMd: row.serviceDetailMd == null ? undefined : String(row.serviceDetailMd),
    callable: row.callable == null ? undefined : Boolean(row.callable),
    inputSchema: asRecord(row.inputSchema ?? row.input_schema),
    defaults: asRecord(row.defaults),
    authRefs: asRecord(row.authRefs ?? row.auth_refs),
    capabilities: asRecord(row.capabilities),
    bindingClosure: Array.isArray(row.bindingClosure)
      ? row.bindingClosure.map((item) => {
          const x = asRecord(item) ?? {};
          return {
            resourceId: String(x.resourceId ?? x.resource_id ?? ''),
            resourceType: String(x.resourceType ?? x.resource_type ?? ''),
            resourceCode: x.resourceCode == null ? undefined : String(x.resourceCode),
            displayName: x.displayName == null ? undefined : String(x.displayName),
            status: x.status == null ? undefined : String(x.status),
          };
        })
      : undefined,
  };
}

function normalizeSummary(raw: unknown): CapabilitySummaryVO {
  const row = asRecord(raw) ?? {};
  return {
    capabilityId: num(row.capabilityId ?? row.capability_id ?? row.id),
    capabilityType: String(row.capabilityType ?? row.capability_type ?? 'agent') as CapabilityType,
    displayName: String(row.displayName ?? row.display_name ?? ''),
    resourceCode: String(row.resourceCode ?? row.resource_code ?? ''),
    description: row.description == null ? undefined : String(row.description),
    status: row.status == null ? undefined : String(row.status),
    runtimeMode: row.runtimeMode == null ? undefined : String(row.runtimeMode),
    invokeMode: row.invokeMode == null ? undefined : String(row.invokeMode),
    callCount: num(row.callCount ?? row.call_count),
    viewCount: num(row.viewCount ?? row.view_count),
    ratingAvg: optNum(row.ratingAvg ?? row.rating_avg),
    reviewCount: optNum(row.reviewCount ?? row.review_count),
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)) : undefined,
  };
}

function normalizeImportSuggestion(raw: unknown): CapabilityImportSuggestionVO {
  const row = asRecord(raw) ?? {};
  return {
    detectedType: String(row.detectedType ?? row.detected_type ?? 'agent') as CapabilityType,
    confidence: String(row.confidence ?? 'medium'),
    reason: String(row.reason ?? ''),
    displayName: String(row.displayName ?? row.display_name ?? ''),
    resourceCode: String(row.resourceCode ?? row.resource_code ?? ''),
    description: row.description == null ? undefined : String(row.description),
    runtimeMode: row.runtimeMode == null ? undefined : String(row.runtimeMode),
    inputSchema: asRecord(row.inputSchema ?? row.input_schema),
    defaults: asRecord(row.defaults),
    authRefs: asRecord(row.authRefs ?? row.auth_refs),
    bindings: Array.isArray(row.bindings) ? row.bindings.map((id) => num(id)).filter((id) => id > 0) : undefined,
    capabilities: asRecord(row.capabilities),
    requiresConfirmation: row.requiresConfirmation == null ? undefined : Boolean(row.requiresConfirmation),
    warnings: Array.isArray(row.warnings) ? row.warnings.map((warning) => String(warning)) : undefined,
  };
}

function normalizeToolRoutes(raw: unknown): ToolDispatchRouteVO[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = asRecord(item) ?? {};
    return {
      unifiedFunctionName: String(row.unifiedFunctionName ?? row.unified_function_name ?? ''),
      resourceType: String(row.resourceType ?? row.resource_type ?? ''),
      resourceId: String(row.resourceId ?? row.resource_id ?? ''),
      upstreamToolName:
        row.upstreamToolName != null
          ? String(row.upstreamToolName)
          : row.upstream_tool_name != null
            ? String(row.upstream_tool_name)
            : undefined,
    };
  });
}

function normalizeToolItems(raw: unknown): CapabilityToolItemVO[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = asRecord(item) ?? {};
    return {
      name: String(row.name ?? ''),
      description: row.description == null ? undefined : String(row.description),
      parameters: asRecord(row.parameters),
    };
  });
}

function normalizeInvokeResult(raw: unknown): CapabilityInvokeResultVO {
  const row = asRecord(raw) ?? {};
  const response = asRecord(row.response) ?? {};
  return {
    capability: normalizeDetail(row.capability),
    response: {
      requestId: String(response.requestId ?? response.request_id ?? ''),
      traceId: String(response.traceId ?? response.trace_id ?? ''),
      resourceType: String(response.resourceType ?? response.resource_type ?? 'agent') as CapabilityType,
      resourceId: String(response.resourceId ?? response.resource_id ?? ''),
      statusCode: num(response.statusCode ?? response.status_code),
      status: String(response.status ?? ''),
      latencyMs: num(response.latencyMs ?? response.latency_ms),
      body: String(response.body ?? ''),
    },
  };
}

function normalizeResolveResult(raw: unknown): CapabilityResolveResultVO {
  const row = asRecord(raw) ?? {};
  return {
    capability: normalizeDetail(row.capability),
    resolved: asRecord(row.resolved) ?? {},
    suggestedPayload: asRecord(row.suggestedPayload ?? row.suggested_payload),
  };
}

function normalizeToolSession(raw: unknown): CapabilityToolSessionVO {
  const row = asRecord(raw) ?? {};
  const toolCallResponse = row.toolCallResponse ? normalizeInvokeResult({ capability: {}, response: row.toolCallResponse }).response : undefined;
  return {
    capabilityId: num(row.capabilityId ?? row.capability_id),
    capabilityType: String(row.capabilityType ?? row.capability_type ?? 'agent') as CapabilityType,
    action: row.action == null ? undefined : String(row.action),
    tools: normalizeToolItems(row.tools),
    routes: normalizeToolRoutes(row.routes),
    warnings: Array.isArray(row.warnings) ? row.warnings.map((warning) => String(warning)) : [],
    toolCallResponse,
  };
}

export const capabilityService = {
  importCapability: async (payload: CapabilityImportRequest): Promise<CapabilityImportSuggestionVO> => {
    const raw = await http.post<unknown>('/v2/capabilities/import', payload);
    return normalizeImportSuggestion(raw);
  },

  createCapability: async (payload: CapabilityCreateRequest): Promise<CapabilityDetailVO> => {
    const raw = await http.post<unknown>('/v2/capabilities', payload);
    return normalizeDetail(raw);
  },

  listCapabilities: async (params?: ResourceCatalogQueryRequest): Promise<CapabilityPage> => {
    const raw = await http.get<unknown>('/v2/capabilities', { params });
    return normalizePaginated<CapabilitySummaryVO>(raw, normalizeSummary);
  },

  getCapability: async (capabilityId: number, include?: string): Promise<CapabilityDetailVO> => {
    const raw = await http.get<unknown>(`/v2/capabilities/${capabilityId}`, {
      params: include ? { include } : undefined,
    });
    return normalizeDetail(raw);
  },

  resolveCapability: async (
    capabilityId: number,
    payload?: CapabilityResolveRequest,
    config?: AxiosRequestConfig,
  ): Promise<CapabilityResolveResultVO> => {
    const raw = await http.post<unknown>(`/v2/capabilities/${capabilityId}/resolve`, payload ?? {}, config);
    return normalizeResolveResult(raw);
  },

  invokeCapability: async (
    capabilityId: number,
    payload?: CapabilityInvokeRequest,
    config?: AxiosRequestConfig,
  ): Promise<CapabilityInvokeResultVO> => {
    const raw = await http.post<unknown>(`/v2/capabilities/${capabilityId}/invoke`, payload ?? {}, config);
    return normalizeInvokeResult(raw);
  },

  toolSession: async (
    capabilityId: number,
    payload?: CapabilityToolSessionRequest,
    config?: AxiosRequestConfig,
  ): Promise<CapabilityToolSessionVO> => {
    const raw = await http.post<unknown>(`/v2/capabilities/${capabilityId}/tool-session`, payload ?? {}, config);
    return normalizeToolSession(raw);
  },
};
