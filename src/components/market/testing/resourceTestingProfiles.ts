import type { CapabilityToolItemVO, CapabilityToolSessionVO } from '../../../types/dto/capability';
import type { ResourceBindingSummaryVO } from '../../../types/dto/catalog';

export type AgentRegistrationProtocol =
  | 'openai_compatible'
  | 'bailian_compatible'
  | 'anthropic_messages'
  | 'gemini_generatecontent'
  | 'unknown';

export type SimpleSchemaFieldType = 'string' | 'number' | 'integer' | 'boolean';

export interface ResourceTestingProfile {
  kind: 'agent' | 'skill' | 'mcp';
  primaryActionLabel: string;
}

export interface AgentTestingProfile extends ResourceTestingProfile {
  kind: 'agent';
  protocol: AgentRegistrationProtocol;
  protocolLabel: string;
  adapterId?: string;
  defaultPayload: Record<string, unknown>;
  nativePayload: Record<string, unknown>;
}

export interface SkillToolOption {
  name: string;
  description?: string;
  sourceResourceId?: string;
  sourceResourceCode?: string;
  sourceDisplayName?: string;
  sourceLabel?: string;
  defaultArguments: Record<string, unknown>;
}

export interface SimpleSchemaField {
  key: string;
  label: string;
  type: SimpleSchemaFieldType;
  required: boolean;
  defaultValue: string | number | boolean;
}

export interface SkillTestingProfile extends ResourceTestingProfile {
  kind: 'skill';
  formFields: SimpleSchemaField[];
  tools: SkillToolOption[];
}

export interface McpTestingProfile extends ResourceTestingProfile {
  kind: 'mcp';
  autoSelectSingleTool: boolean;
  toolCount: number;
}

export type ResourceTestingAdapter =
  | { kind: 'agent'; profile: AgentTestingProfile }
  | { kind: 'skill'; profile: SkillTestingProfile }
  | { kind: 'mcp'; profile: McpTestingProfile };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function normalizeAgentRegistrationProtocol(protocol: string | null | undefined): AgentRegistrationProtocol {
  const normalized = String(protocol ?? '').trim().toLowerCase();
  switch (normalized) {
    case 'openai_compatible':
    case 'bailian_compatible':
    case 'anthropic_messages':
    case 'gemini_generatecontent':
      return normalized;
    default:
      return 'unknown';
  }
}

export function buildAgentNativePayload(
  registrationProtocol: AgentRegistrationProtocol,
  modelAlias: string | null | undefined,
  adapterId?: string | null,
): Record<string, unknown> {
  const normalizedAdapterId = String(adapterId ?? '').trim().toLowerCase();
  const trimmedModel = String(modelAlias ?? '').trim();
  const prompt = 'hello';
  if (['bailian_app', 'appbuilder', 'dify', 'openai_agents', 'tencent_yuanqi'].includes(normalizedAdapterId)) {
    return {
      input: prompt,
      session_id: 'test-session',
    };
  }
  switch (registrationProtocol) {
    case 'bailian_compatible':
      return {
        customized_model_id: trimmedModel,
        input: [
          {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
        stream: false,
      };
    case 'anthropic_messages':
      return {
        model: trimmedModel,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      };
    case 'gemini_generatecontent':
      return {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      };
    case 'openai_compatible':
      return {
        model: trimmedModel,
        input: [
          {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
        stream: false,
      };
    default:
      return { input: prompt };
  }
}

function protocolLabel(
  protocol: AgentRegistrationProtocol,
  adapterId?: string | null,
  adapterLabel?: string | null,
): string {
  const normalizedAdapterId = String(adapterId ?? '').trim().toLowerCase();
  const normalizedAdapterLabel = String(adapterLabel ?? '').trim();
  if (normalizedAdapterLabel) return `${normalizedAdapterLabel} Adapter`;
  if (normalizedAdapterId === 'bailian_app') return '百炼智能体 Adapter';
  if (normalizedAdapterId === 'appbuilder') return '百度 AppBuilder Adapter';
  if (normalizedAdapterId === 'dify') return 'Dify Adapter';
  if (normalizedAdapterId === 'openai_agents') return 'OpenAI Agent Runtime Adapter';
  if (normalizedAdapterId === 'tencent_yuanqi') return '腾讯元器 Adapter';
  switch (protocol) {
    case 'openai_compatible':
      return 'OpenAI Compatible';
    case 'bailian_compatible':
      return '百炼 Compatible';
    case 'anthropic_messages':
      return 'Anthropic Messages';
    case 'gemini_generatecontent':
      return 'Gemini generateContent';
    default:
      return 'Unified Gateway';
  }
}

export function buildAgentTestingProfile(input: {
  registrationProtocol?: string | null;
  modelAlias?: string | null;
  adapterId?: string | null;
  adapterLabel?: string | null;
  suggestedPayload?: Record<string, unknown> | null;
}): AgentTestingProfile {
  const protocol = normalizeAgentRegistrationProtocol(input.registrationProtocol);
  const nativePayload = buildAgentNativePayload(protocol, input.modelAlias, input.adapterId);
  const suggestedPayload = asRecord(input.suggestedPayload);
  return {
    kind: 'agent',
    primaryActionLabel: '一键试用',
    protocol,
    protocolLabel: protocolLabel(protocol, input.adapterId, input.adapterLabel),
    adapterId: String(input.adapterId ?? '').trim() || undefined,
    defaultPayload: suggestedPayload && Object.keys(suggestedPayload).length > 0 ? suggestedPayload : nativePayload,
    nativePayload,
  };
}

function defaultValueForSimpleType(type: SimpleSchemaFieldType): string | number | boolean {
  switch (type) {
    case 'boolean':
      return false;
    case 'number':
    case 'integer':
      return 0;
    default:
      return '';
  }
}

function normalizeSimpleType(type: unknown): SimpleSchemaFieldType | null {
  const normalized = String(type ?? '').trim().toLowerCase();
  switch (normalized) {
    case 'string':
    case 'number':
    case 'integer':
    case 'boolean':
      return normalized;
    default:
      return null;
  }
}

export function buildSimpleSchemaFields(schema: Record<string, unknown> | null | undefined): SimpleSchemaField[] {
  const root = asRecord(schema);
  if (!root || String(root.type ?? '').toLowerCase() !== 'object') {
    return [];
  }
  const properties = asRecord(root.properties);
  if (!properties) {
    return [];
  }
  const required = Array.isArray(root.required) ? new Set(root.required.map((item) => String(item))) : new Set<string>();
  const fields: SimpleSchemaField[] = [];
  for (const [key, value] of Object.entries(properties)) {
    const property = asRecord(value);
    const type = normalizeSimpleType(property?.type);
    if (!property || !type) {
      continue;
    }
    fields.push({
      key,
      label: String(property.title ?? key),
      type,
      required: required.has(key),
      defaultValue: defaultValueForSimpleType(type),
    });
  }
  return fields;
}

export function buildSchemaInputDraft(fields: SimpleSchemaField[]): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((draft, field) => {
    draft[field.key] = field.defaultValue;
    return draft;
  }, {});
}

function buildSchemaExample(schema: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const fields = buildSimpleSchemaFields(schema);
  if (fields.length > 0) {
    return buildSchemaInputDraft(fields);
  }
  const root = asRecord(schema);
  const properties = asRecord(root?.properties);
  if (!properties) {
    return {};
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    const property = asRecord(value);
    const type = normalizeSimpleType(property?.type);
    if (type) {
      result[key] = defaultValueForSimpleType(type);
      continue;
    }
    const propertyType = String(property?.type ?? '').trim().toLowerCase();
    if (propertyType === 'array') {
      result[key] = [];
      continue;
    }
    if (propertyType === 'object') {
      result[key] = {};
    }
  }
  return result;
}

export function buildSkillToolCatalog(
  bindingClosure: ResourceBindingSummaryVO[] | null | undefined,
  toolSession: CapabilityToolSessionVO | null | undefined,
): SkillToolOption[] {
  const sourceById = new Map<string, ResourceBindingSummaryVO>();
  for (const item of bindingClosure ?? []) {
    if (String(item.resourceType ?? '').toLowerCase() !== 'mcp') {
      continue;
    }
    sourceById.set(String(item.resourceId), item);
  }

  const routeByToolName = new Map<string, CapabilityToolSessionVO['routes'][number]>();
  for (const route of toolSession?.routes ?? []) {
    if (!route?.unifiedFunctionName) {
      continue;
    }
    routeByToolName.set(route.unifiedFunctionName, route);
  }

  return (toolSession?.tools ?? []).map((tool: CapabilityToolItemVO) => {
    const route = routeByToolName.get(tool.name);
    const source = route?.resourceId ? sourceById.get(String(route.resourceId)) : undefined;
    return {
      name: tool.name,
      description: tool.description,
      sourceResourceId: route?.resourceId,
      sourceResourceCode: source?.resourceCode,
      sourceDisplayName: source?.displayName,
      sourceLabel: source?.displayName || source?.resourceCode || route?.resourceId,
      defaultArguments: buildSchemaExample(asRecord(tool.parameters)),
    };
  });
}

export function buildSkillTestingProfile(input: {
  parametersSchema?: Record<string, unknown> | null;
  bindingClosure?: ResourceBindingSummaryVO[] | null;
  toolSession?: CapabilityToolSessionVO | null;
}): SkillTestingProfile {
  return {
    kind: 'skill',
    primaryActionLabel: '上下文预览',
    formFields: buildSimpleSchemaFields(input.parametersSchema),
    tools: buildSkillToolCatalog(input.bindingClosure, input.toolSession),
  };
}

export function buildMcpTestingProfile(toolCount: number): McpTestingProfile {
  return {
    kind: 'mcp',
    primaryActionLabel: toolCount > 0 ? '运行工具' : '连接并获取工具',
    autoSelectSingleTool: toolCount === 1,
    toolCount,
  };
}
