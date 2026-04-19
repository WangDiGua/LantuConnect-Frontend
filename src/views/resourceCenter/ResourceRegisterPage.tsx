import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, Loader2, Save, Send, FileText, Copy } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type { AgentKeyMetaVO, ResourceCenterItemVO, ResourceUpsertRequest } from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { tagService } from '../../api/services/tag.service';
import { useAuthStore } from '../../stores/authStore';
import { LantuSelect } from '../../components/common/LantuSelect';
import { PresetOrCustomNumberField } from '../../components/common/PresetOrCustomNumberField';
import {
  DATASET_FILE_SIZE_BYTES,
  DATASET_RECORD_COUNT,
  RESOURCE_MAX_CONCURRENCY,
} from '../../utils/numericFormPresets';
import { filterTagsForResourceType } from '../../utils/marketTags';
import { buildPath } from '../../constants/consoleRoutes';
import {
  bentoCard,
  btnPrimary,
  btnSecondary,
  fieldErrorText,
  inputBaseError,
  labelBase,
  textMuted,
  textPrimary,
} from '../../utils/uiClasses';
import { workingDraftAuditTierLabelZh } from '../../utils/backendEnumLabels';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { parseMcpConfigPaste } from '../../utils/mcpConfigImport';
import { parseAgentConfigPaste } from '../../utils/agentConfigImport';
import { lantuCheckboxPrimaryClass } from '../../utils/formFieldClasses';
import { ReviewMarkdownEditor } from '../../components/common/ReviewMarkdownEditor';
import {
  AGENT_DELIVERY_MODE_API,
  AGENT_DELIVERY_MODE_PAGE,
  resolveAgentDeliveryMode,
  shouldOpenAgentRegisterAsPageMode,
  type AgentDeliveryMode,
} from './agentDeliveryMode';
import {
  AGENT_PROVIDER_PRESET_OPTIONS,
  buildAgentAdapterSpecMeta,
  coerceMcpRegisterMode,
  createStructuredParamField,
  defaultEndpointForAgentProviderPreset,
  extractAgentProviderPresetFromSpec,
  getAgentProviderPresetMeta,
  protocolForAgentProviderPreset,
  resolveAgentProviderPreset,
  schemaToStructuredParamFields,
  stripAgentAdapterSpecMeta,
  structuredParamFieldsToSchema,
  type AgentProviderPreset,
  type StructuredParamField,
  type SupportedMcpRegisterMode,
} from './resourceRegisterProfiles';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  resourceType: ResourceType;
  resourceId?: number;
  onBack: () => void;
}

const TYPE_LABEL: Record<ResourceType, string> = {
  agent: '智能体',
  skill: '技能',
  mcp: 'MCP',
  app: '应用',
  dataset: '数据集',
};

const DEFAULT_MCP_AUTH_CONFIG_JSON = '{}';
type McpRegisterMode = SupportedMcpRegisterMode;
const DEFAULT_AGENT_SPEC_JSON = '{\n  "url": "http://localhost:8000/agent/invoke",\n  "timeout": 30\n}';
const DEFAULT_SKILL_SPEC_JSON = '{}';
const DEFAULT_SKILL_PARAMS_SCHEMA_JSON = '{\n  "type": "object",\n  "properties": {\n    "city": { "type": "string" }\n  },\n  "required": ["city"]\n}';

const TYPE_GUIDE_ONE_LINE: Record<ResourceType, string> = {
  agent: '先填写供应商预设、上游地址与模型别名，再按需展开高级配置。',
  skill: '先写上下文正文，再通过结构化参数编辑器补全可选输入。',
  mcp: '登记远程可调用的 MCP 地址与鉴权方式即可。',
  app: '填写可访问 URL 与打开方式即可保存。',
  dataset: '填写数据类型、格式和基础元数据即可保存。',
};

const DATASET_DATA_TYPE_OPTIONS = [
  { value: 'structured', label: '结构化' },
  { value: 'document', label: '文档' },
  { value: 'image', label: '图像' },
  { value: 'audio', label: '音频' },
  { value: 'video', label: '视频' },
  { value: 'mixed', label: '混合' },
];
const DATASET_FORMAT_OPTIONS = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'parquet', label: 'Parquet' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'xlsx', label: 'XLSX' },
];

const AGENT_DELIVERY_OPTIONS: Array<{
  value: AgentDeliveryMode;
  title: string;
  description: string;
}> = [
  {
    value: AGENT_DELIVERY_MODE_API,
    title: 'API 型 Agent',
    description: '注册上游模型协议、endpoint 与 model alias，走 resolve / invoke。',
  },
  {
    value: AGENT_DELIVERY_MODE_PAGE,
    title: '页面型 Agent',
    description: '注册页面地址与打开方式，走 resolve / redirect。',
  },
];

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidWsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'ws:' || url.protocol === 'wss:';
  } catch {
    return false;
  }
}

function inferMcpTransport(endpoint: string, authConfig?: Record<string, unknown>): 'http' | 'websocket' {
  const transport = typeof authConfig?.transport === 'string' ? authConfig.transport.toLowerCase() : '';
  if (transport === 'websocket') return 'websocket';
  const ep = endpoint.trim().toLowerCase();
  if (ep.startsWith('ws://') || ep.startsWith('wss://')) return 'websocket';
  return 'http';
}

function modeToTransport(mode: McpRegisterMode): 'http' | 'websocket' {
  if (mode === 'websocket') return 'websocket';
  return 'http';
}

function registerModeFromTransport(tr: 'http' | 'websocket', prevMode: McpRegisterMode): McpRegisterMode {
  if (tr === 'websocket') return 'websocket';
  return prevMode === 'http_sse' ? 'http_sse' : 'http_json';
}

function parseJsonObject(value: string, fieldLabel: string): { ok: boolean; data?: Record<string, unknown>; message: string } {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: `${fieldLabel} 必须是 JSON 对象` };
    }
    return { ok: true, data: parsed as Record<string, unknown>, message: '' };
  } catch {
    return { ok: false, message: `${fieldLabel} 不是合法 JSON` };
  }
}

function parseRelatedIds(value: string): { ids: number[]; invalidTokens: string[] } {
  const tokens = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const invalidTokens: string[] = [];
  const ids = tokens
    .map((token) => {
      if (!/^\d+$/.test(token)) {
        invalidTokens.push(token);
        return 0;
      }
      return Number(token);
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  return { ids, invalidTokens };
}

function relationIdsFingerprint(raw: string): string {
  const { ids } = parseRelatedIds(raw);
  return [...ids].sort((a, b) => a - b).join(',');
}

/** 创建时仅在有值时回传；更新时若与加载快照一致则省略（后端 null 表示不修改），否则带回完整列表，空数组表示清空。 */
function mergeRelationIdsForUpsert(isUpdate: boolean, formValue: string, snapshot: string): number[] | undefined {
  const ids = parseRelatedIds(formValue).ids;
  if (!isUpdate) {
    return ids.length > 0 ? ids : undefined;
  }
  if (relationIdsFingerprint(formValue) === relationIdsFingerprint(snapshot)) {
    return undefined;
  }
  return ids;
}

function buildMcpAuthConfigFromForm(form: {
  authType: string;
  mcpAdvancedJson: string;
  mcpApiKeyHeader: string;
  mcpApiKeyValue: string;
  mcpBearerToken: string;
  mcpBasicUsername: string;
  mcpBasicPassword: string;
  mcpOauthTokenUrl: string;
  mcpOauthClientId: string;
  mcpOauthClientSecret: string;
  mcpOauthScope: string;
  mcpRegisterMode: McpRegisterMode;
}): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const parsed = parseJsonObject(form.mcpAdvancedJson, '楂樼骇閴存潈 JSON');
  if (!parsed.ok) return { ok: false, message: parsed.message };
  const config: Record<string, unknown> = {
    ...(parsed.data || {}),
    method: 'tools/call',
    transport: modeToTransport(form.mcpRegisterMode),
  };

  if (form.authType === 'api_key') {
    config.headerName = form.mcpApiKeyHeader.trim() || 'X-Api-Key';
    config.apiKey = form.mcpApiKeyValue.trim();
  } else if (form.authType === 'bearer') {
    config.token = form.mcpBearerToken.trim();
  } else if (form.authType === 'basic') {
    config.username = form.mcpBasicUsername.trim();
    config.password = form.mcpBasicPassword.trim();
  } else if (form.authType === 'oauth2_client') {
    config.tokenUrl = form.mcpOauthTokenUrl.trim();
    config.clientId = form.mcpOauthClientId.trim();
    config.clientSecret = form.mcpOauthClientSecret.trim();
    if (form.mcpOauthScope.trim()) config.scope = form.mcpOauthScope.trim();
  }

  return { ok: true, data: config };
}

function deriveMcpAuthForm(authType: string, authConfig?: Record<string, unknown>): Partial<{
  mcpApiKeyHeader: string;
  mcpApiKeyValue: string;
  mcpBearerToken: string;
  mcpBasicUsername: string;
  mcpBasicPassword: string;
  mcpOauthTokenUrl: string;
  mcpOauthClientId: string;
  mcpOauthClientSecret: string;
  mcpOauthScope: string;
  mcpAdvancedJson: string;
}> {
  const config = authConfig ?? {};
  return {
    mcpApiKeyHeader: String(config.headerName ?? 'X-Api-Key'),
    mcpApiKeyValue: String(config.apiKey ?? ''),
    mcpBearerToken: String(config.token ?? ''),
    mcpBasicUsername: String(config.username ?? ''),
    mcpBasicPassword: String(config.password ?? ''),
    mcpOauthTokenUrl: String(config.tokenUrl ?? ''),
    mcpOauthClientId: String(config.clientId ?? ''),
    mcpOauthClientSecret: String(config.clientSecret ?? ''),
    mcpOauthScope: String(config.scope ?? ''),
    mcpAdvancedJson:
      Object.keys(config).length > 0
        ? JSON.stringify(
            Object.fromEntries(
              Object.entries(config).filter(([key]) =>
                ![
                  'headerName',
                  'apiKey',
                  'token',
                  'username',
                  'password',
                  'tokenUrl',
                  'clientId',
                  'clientSecret',
                  'scope',
                ].includes(key),
              ),
            ),
            null,
            2,
          )
        : DEFAULT_MCP_AUTH_CONFIG_JSON,
  };
}

type ResourceRegisterFieldKey =
  | 'resourceCode'
  | 'displayName'
  | 'endpoint'
  | 'protocol'
  | 'authConfigJson'
  | 'registrationProtocol'
  | 'upstreamEndpoint'
  | 'modelAlias'
  | 'credentialRef'
  | 'specJson'
  | 'maxConcurrency'
  | 'relatedResourceIds'
  | 'relatedMcpResourceIds'
  | 'agentMaxSteps'
  | 'agentTemperature'
  | 'paramsSchemaJson'
  | 'contextPrompt'
  | 'appUrl'
  | 'embedType'
  | 'appIcon'
  | 'dataType'
  | 'format'
  | 'recordCount'
  | 'fileSize';

function rrFieldId(key: ResourceRegisterFieldKey): string {
  return `rr-${key}`;
}

const RR_FIELD_FOCUS_ORDER: ResourceRegisterFieldKey[] = [
  'resourceCode',
  'displayName',
  'endpoint',
  'protocol',
  'authConfigJson',
  'registrationProtocol',
  'upstreamEndpoint',
  'modelAlias',
  'credentialRef',
  'specJson',
  'maxConcurrency',
  'relatedResourceIds',
  'relatedMcpResourceIds',
  'agentMaxSteps',
  'agentTemperature',
  'paramsSchemaJson',
  'contextPrompt',
  'appUrl',
  'embedType',
  'appIcon',
  'dataType',
  'format',
  'recordCount',
  'fileSize',
];

function computeResourceRegisterFieldErrors(
  resourceType: ResourceType,
  form: {
    resourceCode: string;
    displayName: string;
    endpoint: string;
    mcpRegisterMode: McpRegisterMode;
    protocol: string;
    authType: string;
    authConfigJson: string;
    mcpAdvancedJson: string;
    mcpApiKeyHeader: string;
    mcpApiKeyValue: string;
    mcpBearerToken: string;
    mcpBasicUsername: string;
    mcpBasicPassword: string;
    mcpOauthTokenUrl: string;
    mcpOauthClientId: string;
    mcpOauthClientSecret: string;
    mcpOauthScope: string;
    registrationProtocol: string;
    upstreamEndpoint: string;
    modelAlias: string;
    credentialRef: string;
    upstreamAgentId: string;
    transformProfile: string;
    agentEnabled: boolean;
    specJson: string;
    maxConcurrency: number;
    relatedResourceIds: string;
    relatedMcpResourceIds: string;
    contextPrompt: string;
    agentMaxSteps: string;
    agentTemperature: string;
    paramsSchemaJson: string;
    appUrl: string;
    embedType: string;
    appIcon: string;
    dataType: string;
    format: string;
    recordCount: number;
    fileSize: number;
  },
): Partial<Record<ResourceRegisterFieldKey, string>> {
  const e: Partial<Record<ResourceRegisterFieldKey, string>> = {};

  if (!form.resourceCode.trim()) {
    e.resourceCode = '请填写资源编码';
  } else if (!/^[a-zA-Z0-9_-]{3,64}$/.test(form.resourceCode.trim())) {
    e.resourceCode = '资源编码需为 3-64 位，仅支持字母、数字、下划线和短横线';
  }
  if (!form.displayName.trim()) {
    e.displayName = '请填写显示名称';
  }

  if (resourceType === 'mcp') {
    if (!form.endpoint.trim()) {
      e.endpoint = '请填写服务地址';
    } else {
      const activeTransport = modeToTransport(form.mcpRegisterMode);
      if (activeTransport === 'websocket') {
        if (!isValidWsUrl(form.endpoint.trim())) {
          e.endpoint = '选择 WebSocket 传输时，服务地址必须是 ws:// 或 wss:// URL';
        }
      } else if (!isValidUrl(form.endpoint.trim())) {
        e.endpoint = '选择 HTTP / SSE 时，服务地址必须是 http:// 或 https:// URL';
      }
    }
    if (form.protocol.trim() && form.protocol.trim().toLowerCase() !== 'mcp') {
      e.protocol = 'MCP 资源的 protocol 固定为 mcp';
    }
    const authParsed = parseJsonObject(form.authConfigJson, '鉴权 JSON 配置');
    if (form.authConfigJson.trim() && !authParsed.ok) {
      e.authConfigJson = authParsed.message;
    }
    if (form.authType === 'oauth2_client') {
      if (!authParsed.ok || !authParsed.data) {
        e.authConfigJson = e.authConfigJson ?? 'OAuth2 需要填写合法的鉴权 JSON';
      } else {
        const d = authParsed.data;
        const tokenUrl = String(d.tokenUrl ?? d.token_url ?? '').trim();
        const clientId = String(d.clientId ?? d.client_id ?? '').trim();
        const secret = String(d.clientSecret ?? d.client_secret ?? '').trim();
        const secretRef = String(d.clientSecretRef ?? '').trim();
        if (!tokenUrl) e.authConfigJson = e.authConfigJson ?? 'OAuth2 需要在 JSON 中填写 tokenUrl';
        if (!clientId) e.authConfigJson = e.authConfigJson ?? 'OAuth2 需要在 JSON 中填写 clientId';
        if (!secret && !secretRef) e.authConfigJson = e.authConfigJson ?? 'OAuth2 需要填写 clientSecret 或 clientSecretRef';
      }
    }
    if (form.authType === 'basic') {
      if (!authParsed.ok || !authParsed.data) {
        e.authConfigJson = e.authConfigJson ?? 'Basic 需要填写合法的鉴权 JSON';
      } else {
        const d = authParsed.data;
        const u = String(d.username ?? '').trim();
        const password = String(d.password ?? '').trim();
        const passwordRef = String(d.passwordSecretRef ?? '').trim();
        if (!u) e.authConfigJson = e.authConfigJson ?? 'Basic 需要在 JSON 中填写 username';
        if (!password && !passwordRef) e.authConfigJson = e.authConfigJson ?? 'Basic 需要填写 password 或 passwordSecretRef';
      }
    }
  }

  if (resourceType === 'agent') {
    if (!form.registrationProtocol.trim()) {
      e.registrationProtocol = '请选择注册协议';
    }
    if (!form.upstreamEndpoint.trim()) {
      e.upstreamEndpoint = '请填写上游 endpoint';
    } else if (!isValidUrl(form.upstreamEndpoint.trim())) {
      e.upstreamEndpoint = '上游 endpoint 必须是 http:// 或 https:// URL';
    }
    if (!form.modelAlias.trim()) {
      e.modelAlias = '请填写对外 model alias';
    }
    if (form.specJson.trim()) {
      const specParsed = parseJsonObject(form.specJson, '规格 JSON');
      if (!specParsed.ok) {
        e.specJson = specParsed.message;
      }
    }
    if (!Number.isFinite(Number(form.maxConcurrency)) || Number(form.maxConcurrency) < 1 || Number(form.maxConcurrency) > 1000) {
      e.maxConcurrency = '最大并发需在 1 到 1000 之间';
    }
    if (form.agentMaxSteps.trim()) {
      const n = Number(form.agentMaxSteps.trim());
      if (!Number.isInteger(n) || n < 1) {
        e.agentMaxSteps = '最大步数需为正整数或留空';
      }
    }
    if (form.agentTemperature.trim()) {
      const t = Number(form.agentTemperature.trim());
      if (!Number.isFinite(t)) {
        e.agentTemperature = '采样温度需为有效数字或留空';
      }
    }
  }

  if (resourceType === 'skill') {
    if (!form.contextPrompt.trim()) {
      e.contextPrompt = '请填写规范 Markdown / Context 正文';
    }
    const specParsed = parseJsonObject(form.specJson, '附加元数据 JSON（可为空对象）');
    if (!specParsed.ok) {
      e.specJson = specParsed.message;
    }
    const schemaParsed = parseJsonObject(form.paramsSchemaJson, '参数结构 JSON');
    if (!schemaParsed.ok) {
      e.paramsSchemaJson = schemaParsed.message;
    }
  }

  if (resourceType === 'app') {
    if (!form.appUrl.trim()) {
      e.appUrl = '请填写应用地址';
    } else if (!isValidUrl(form.appUrl.trim())) {
      e.appUrl = '应用地址必须是有效的 http/https URL';
    }
    if (!form.embedType.trim()) {
      e.embedType = '请选择嵌入方式';
    } else {
      const appEt = form.embedType.trim().toLowerCase();
      if (!['iframe', 'redirect', 'micro_frontend'].includes(appEt)) {
        e.embedType = '嵌入方式必须是 iframe、redirect 或 micro_frontend';
      }
    }
    if (form.appIcon.trim() && !isValidUrl(form.appIcon.trim())) {
      e.appIcon = '图标 URL 必须是有效的 http/https URL';
    }
    const related = parseRelatedIds(form.relatedResourceIds);
    if (related.invalidTokens.length > 0) {
      e.relatedResourceIds = `关联资源 ID 仅支持正整数并用逗号分隔，非法值：${related.invalidTokens.join(', ')}`;
    }
  }

  if (resourceType === 'dataset') {
    if (!form.dataType.trim()) {
      e.dataType = '请填写数据类型';
    }
    if (!form.format.trim()) {
      e.format = '请填写数据格式';
    }
    if (Number(form.recordCount) < 0) {
      e.recordCount = '记录数不能小于 0';
    }
    if (Number(form.fileSize) < 0) {
      e.fileSize = '文件大小不能小于 0';
    }
  }

  return e;
}

function collectMcpProbeFieldIssues(form: {
  endpoint: string;
  mcpRegisterMode: McpRegisterMode;
  authType: string;
  authConfigJson: string;
}): Partial<Record<'endpoint' | 'authConfigJson', string>> {
  const e: Partial<Record<'endpoint' | 'authConfigJson', string>> = {};
  if (!form.endpoint.trim()) {
    e.endpoint = '请先填写服务地址再探测';
  } else {
    const activeTransport = modeToTransport(form.mcpRegisterMode);
    if (activeTransport === 'websocket') {
      if (!isValidWsUrl(form.endpoint.trim())) {
        e.endpoint = 'WebSocket 探测需要 ws:// 或 wss:// URL';
      }
    } else if (!isValidUrl(form.endpoint.trim())) {
      e.endpoint = 'HTTP 探测需要 http(s) URL';
    }
  }
  const authParsed = parseJsonObject(form.authConfigJson, '鉴权 JSON 配置');
  if (form.authConfigJson.trim() && !authParsed.ok) {
    e.authConfigJson = authParsed.message;
  }
  if (form.authType === 'oauth2_client') {
    if (!authParsed.ok || !authParsed.data) {
      e.authConfigJson = e.authConfigJson ?? 'OAuth2 需要填写合法的鉴权 JSON';
    } else {
      const d = authParsed.data;
      const tokenUrl = String(d.tokenUrl ?? d.token_url ?? '').trim();
      const clientId = String(d.clientId ?? d.client_id ?? '').trim();
      const secret = String(d.clientSecret ?? d.client_secret ?? '').trim();
      const secretRef = String(d.clientSecretRef ?? '').trim();
      if (!tokenUrl) e.authConfigJson = e.authConfigJson ?? 'OAuth2 需要在 JSON 中填写 tokenUrl';
      if (!clientId) e.authConfigJson = e.authConfigJson ?? 'OAuth2 需要在 JSON 中填写 clientId';
      if (!secret && !secretRef) e.authConfigJson = e.authConfigJson ?? 'OAuth2 需要填写 clientSecret 或 clientSecretRef';
    }
  }
  if (form.authType === 'basic') {
    if (!authParsed.ok || !authParsed.data) {
      e.authConfigJson = e.authConfigJson ?? 'Basic 需要填写合法的鉴权 JSON';
    } else {
      const d = authParsed.data;
      const u = String(d.username ?? '').trim();
      const password = String(d.password ?? '').trim();
      const passwordRef = String(d.passwordSecretRef ?? '').trim();
      if (!u) e.authConfigJson = e.authConfigJson ?? 'Basic 需要在 JSON 中填写 username';
      if (!password && !passwordRef) e.authConfigJson = e.authConfigJson ?? 'Basic 需要填写 password 或 passwordSecretRef';
    }
  }
  return e;
}

/** 保持用户在表单中的顺序，并去掉重复 token（仅合法正整数）。 */
function parseOrderedRelatedIds(value: string): number[] {
  const tokens = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<number>();
  const out: number[] = [];
  for (const token of tokens) {
    if (!/^\d+$/.test(token)) continue;
    const n = Number(token);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function formatBindingOptionLabel(item: ResourceCenterItemVO): string {
  const code = item.resourceCode?.trim();
  const name = item.displayName?.trim() || `资源 #${item.id}`;
  if (code) return `${name}（${code} / #${item.id}）`;
  return `${name}（#${item.id}）`;
}

function orderedPickerPanelClass(isDark: boolean, invalid?: boolean): string {
  const base = `rounded-xl border max-h-56 overflow-y-auto px-2 py-2 ${
    isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
  }`;
  return invalid ? `${base} ${inputBaseError()}` : base;
}

const OrderedRelatedResourcePicker: React.FC<{
  theme: Theme;
  isDark: boolean;
  fieldId: string;
  value: string;
  onChangeValue: (next: string) => void;
  poolItems: ResourceCenterItemVO[];
  loading: boolean;
  loadError: boolean;
  errorStyle: boolean;
  ariaDescribedby?: string;
  orphanHint: string;
}> = ({
  theme,
  isDark,
  fieldId,
  value,
  onChangeValue,
  poolItems,
  loading,
  loadError,
  errorStyle,
  ariaDescribedby,
  orphanHint,
}) => {
  const selectedIds = useMemo(() => parseOrderedRelatedIds(value), [value]);
  const poolById = useMemo(() => new Map(poolItems.map((x) => [x.id, x])), [poolItems]);
  const poolAvailable = useMemo(
    () => poolItems.filter((x) => !selectedIds.includes(x.id)),
    [poolItems, selectedIds],
  );

  const commitIds = (next: number[]) => {
    onChangeValue(next.length ? next.map(String).join(', ') : '');
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= selectedIds.length) return;
    const copy = [...selectedIds];
    const t = copy[idx]!;
    copy[idx] = copy[j]!;
    copy[j] = t;
    commitIds(copy);
  };

  const removeAt = (idx: number) => commitIds(selectedIds.filter((_, i) => i !== idx));

  const addId = (id: number) => {
    if (selectedIds.includes(id)) return;
    commitIds([...selectedIds, id]);
  };

  return (
    <div id={fieldId} className="space-y-2" aria-describedby={ariaDescribedby}>
      {loadError ? <p className={`text-xs ${fieldErrorText()}`}>加载可选资源失败，请稍后重试。</p> : null}
      {loading ? (
        <div className={`flex items-center gap-2 text-xs ${textMuted(theme)}`}>
          <Loader2 className="animate-spin" size={14} /> 正在加载我的资源…
        </div>
      ) : null}
      <div className={orderedPickerPanelClass(isDark, errorStyle)}>
        <p className={`mb-2 px-1 text-xs font-medium ${textMuted(theme)}`}>已选顺序（前 → 后）</p>
        {selectedIds.length === 0 ? (
          <p className={`px-2 py-1 text-xs ${textMuted(theme)}`}>尚未选择</p>
        ) : (
          <ul className="space-y-1">
            {selectedIds.map((id, idx) => {
              const row = poolById.get(id);
              const label = row ? formatBindingOptionLabel(row) : `#${id}（${orphanHint}）`;
              return (
                <li
                  key={id}
                  className={`flex flex-wrap items-center gap-1 rounded-lg px-2 py-1 text-xs ${
                    isDark ? 'bg-white/[0.06]' : 'bg-white'
                  }`}
                >
                  <span className="min-w-0 flex-1 break-all">{label}</span>
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    disabled={idx === 0}
                    onClick={() => move(idx, -1)}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    className={btnSecondary(theme)}
                    disabled={idx === selectedIds.length - 1}
                    onClick={() => move(idx, 1)}
                  >
                    下移
                  </button>
                  <button type="button" className={btnSecondary(theme)} onClick={() => removeAt(idx)}>
                    移除
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className={orderedPickerPanelClass(isDark, false)}>
        <p className={`mb-2 px-1 text-xs font-medium ${textMuted(theme)}`}>候选资源（勾选后加入尾部）</p>
        {poolAvailable.length === 0 ? (
          <p className={`px-2 py-1 text-xs ${textMuted(theme)}`}>
            {poolItems.length === 0 && !loading && !loadError ? '当前没有可绑定的资源' : '暂无更多候选资源'}
          </p>
        ) : (
          <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
            {poolAvailable.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-2 px-2 py-1 text-xs">
                  <input
                    type="checkbox"
                    className={lantuCheckboxPrimaryClass}
                    onChange={() => addId(item.id)}
                  />
                  <span className="break-all">{formatBindingOptionLabel(item)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const SectionCard: React.FC<{
  theme: Theme;
  isDark: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  full?: boolean;
}> = ({ theme, isDark, title, description, children, full = true }) => (
  <div
    className={`${full ? 'md:col-span-2' : ''} rounded-2xl border p-4 ${
      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
    }`}
  >
    <div className="mb-3">
      <h3 className={`text-sm font-semibold ${textPrimary(theme)}`}>{title}</h3>
      {description ? <p className={`mt-1 text-xs leading-relaxed ${textMuted(theme)}`}>{description}</p> : null}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const NoticeCard: React.FC<{
  isDark: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ isDark, title, children }) => (
  <div
    className={`md:col-span-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
      isDark ? 'border-sky-500/30 bg-sky-500/10 text-sky-100' : 'border-sky-200 bg-sky-50 text-sky-950'
    }`}
  >
    <p className="font-medium">{title}</p>
    <div className={`mt-1.5 space-y-1 ${isDark ? 'text-sky-100/85' : 'text-sky-900/85'}`}>{children}</div>
  </div>
);

export const ResourceRegisterPage: React.FC<Props> = ({
  theme,
  fontSize,
  showMessage,
  resourceType,
  resourceId,
  onBack,
}) => {
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [tagOptions, setTagOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: '不选' }]);
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mcpAdvancedOpen, setMcpAdvancedOpen] = useState(false);
  const [skillAdvancedOpen, setSkillAdvancedOpen] = useState(false);
  const [mcpProbeExtra, setMcpProbeExtra] = useState<Partial<Record<'endpoint' | 'authConfigJson', string>>>({});
  const [agentAdvancedOpen, setAgentAdvancedOpen] = useState(false);
  const [agentProviderPreset, setAgentProviderPreset] = useState<AgentProviderPreset>('openai');
  const [agentDeliveryMode, setAgentDeliveryMode] = useState<AgentDeliveryMode>(AGENT_DELIVERY_MODE_API);
  const [skillParamFields, setSkillParamFields] = useState<StructuredParamField[]>(
    schemaToStructuredParamFields(JSON.parse(DEFAULT_SKILL_PARAMS_SCHEMA_JSON)),
  );
  const [form, setForm] = useState({
    resourceCode: '',
    displayName: '',
    description: '',
    sourceType: 'internal',
    catalogTagId: '',
    endpoint: '',
    mcpRegisterMode: 'http_json' as McpRegisterMode,
    mcpTransport: 'http' as 'http' | 'websocket',
    protocol: 'mcp',
    authType: 'none',
    authConfigJson: DEFAULT_MCP_AUTH_CONFIG_JSON,
    mcpAdvancedJson: DEFAULT_MCP_AUTH_CONFIG_JSON,
    mcpApiKeyHeader: 'X-Api-Key',
    mcpApiKeyValue: '',
    mcpBearerToken: '',
    mcpBasicUsername: '',
    mcpBasicPassword: '',
    mcpOauthTokenUrl: '',
    mcpOauthClientId: '',
    mcpOauthClientSecret: '',
    mcpOauthScope: '',
    appUrl: '',
    embedType: 'iframe',
    appIcon: '',
    appScreenshotsText: '',
    dataType: 'structured',
    format: 'json',
    recordCount: 0,
    fileSize: 0,
    tags: '',
    registrationProtocol: 'openai_compatible',
    upstreamEndpoint: '',
    upstreamAgentId: '',
    credentialRef: '',
    transformProfile: '',
    modelAlias: '',
    agentEnabled: true,
    maxConcurrency: 10,
    systemPrompt: '',
    agentHidden: false,
    agentMaxSteps: '',
    agentTemperature: '',
    specJson: resourceType === 'skill' ? DEFAULT_SKILL_SPEC_JSON : '{}',
    paramsSchemaJson: DEFAULT_SKILL_PARAMS_SCHEMA_JSON,
    relatedResourceIds: '',
    serviceDetailMd: '',
    relatedMcpResourceIds: '',
    contextPrompt: '',
  });
  const bindingSnapshotRef = useRef({ relatedMcpResourceIds: '' });
  const [mcpImportPaste, setMcpImportPaste] = useState('');
  const [agentImportPaste, setAgentImportPaste] = useState('');
  const [mcpProbeLoading, setMcpProbeLoading] = useState(false);
  const [agentKeyLoading, setAgentKeyLoading] = useState(false);
  const [agentKeys, setAgentKeys] = useState<AgentKeyMetaVO[]>([]);
  const [latestAgentSecret, setLatestAgentSecret] = useState('');
  /** 已发布资源双轨编辑：用于提示线上版本与当前草稿的关系。 */
  const [loadedResourceMeta, setLoadedResourceMeta] = useState<{
    status: string;
    currentVersion?: string;
    hasWorkingDraft?: boolean;
    pendingPublishedUpdate?: boolean;
    workingDraftAuditTier?: string;
  } | null>(null);
  const [relationPicklistLoading, setRelationPicklistLoading] = useState(false);
  const [relationPicklistError, setRelationPicklistError] = useState(false);
  const [mcpBindPickPool, setMcpBindPickPool] = useState<ResourceCenterItemVO[]>([]);
  const effectiveResourceType: ResourceType =
    resourceType === 'agent' && agentDeliveryMode === AGENT_DELIVERY_MODE_PAGE ? 'app' : resourceType;

  useEffect(() => {
    let cancelled = false;
    tagService
      .list()
      .then((list) => {
        if (cancelled) return;
        const filtered = filterTagsForResourceType(Array.isArray(list) ? list : [], resourceType);
        setTagOptions([{ value: '', label: '不选' }, ...filtered.map((t) => ({ value: String(t.id), label: t.name }))]);
      })
      .catch(() => {
        if (!cancelled) setTagOptions([{ value: '', label: '不选' }]);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceType]);

  useEffect(() => {
    if (resourceType !== 'agent' && resourceType !== 'skill') {
      setMcpBindPickPool([]);
      setRelationPicklistError(false);
      setRelationPicklistLoading(false);
      return;
    }
    let cancelled = false;
    setRelationPicklistLoading(true);
    setRelationPicklistError(false);
    resourceCenterService
      .listMinePublishedOrTesting('mcp', resourceId ?? undefined)
      .then((items) => {
        if (cancelled) return;
        const sorted = [...items].sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-CN'));
        setMcpBindPickPool(sorted);
      })
      .catch(() => {
        if (!cancelled) setRelationPicklistError(true);
      })
      .finally(() => {
        if (!cancelled) setRelationPicklistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceType, resourceId]);

  useEffect(() => {
    if (!resourceId) {
      setLoadedResourceMeta(null);
      bindingSnapshotRef.current = { relatedMcpResourceIds: '' };
      setAgentProviderPreset('openai');
      if (resourceType === 'agent') {
        setAgentDeliveryMode(AGENT_DELIVERY_MODE_API);
      }
      setSkillParamFields(schemaToStructuredParamFields(JSON.parse(DEFAULT_SKILL_PARAMS_SCHEMA_JSON)));
    }
  }, [resourceId]);

  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;
    setLoading(true);
    resourceCenterService.getById(resourceId)
      .then((item) => {
        if (cancelled) return;
        const editingPageAgent =
          resourceType === 'agent' && shouldOpenAgentRegisterAsPageMode(item);
        const loadedEffectiveType: ResourceType = editingPageAgent ? 'app' : resourceType;
        if (resourceType === 'agent') {
          setAgentDeliveryMode(resolveAgentDeliveryMode(item));
        }
        if (item.sourceType && item.sourceType !== 'internal') setAdvancedOpen(true);
        if (
          loadedEffectiveType === 'agent' &&
          (item.hidden === true || item.maxSteps != null || item.temperature != null)
        ) {
          setAgentAdvancedOpen(true);
        }
        bindingSnapshotRef.current = {
          relatedMcpResourceIds:
            loadedEffectiveType === 'agent' || loadedEffectiveType === 'skill'
              ? Array.isArray(item.relatedMcpResourceIds)
                ? item.relatedMcpResourceIds.join(', ')
                : ''
              : '',
        };
        setForm((prev) => ({
          ...prev,
          resourceCode: item.resourceCode || '',
          displayName: item.displayName || '',
          description: item.description || '',
          serviceDetailMd: item.serviceDetailMd ?? '',
          sourceType: item.sourceType || 'internal',
          catalogTagId: item.tagIds?.length ? String(item.tagIds[0]) : '',
          endpoint: item.endpoint || '',
          mcpRegisterMode:
            resourceType === 'mcp'
              ? coerceMcpRegisterMode({
                  endpoint: item.endpoint || '',
                  transportHint:
                    item.authConfig && typeof item.authConfig === 'object' && !Array.isArray(item.authConfig)
                      ? String((item.authConfig as Record<string, unknown>).transport ?? '')
                      : '',
                })
              : prev.mcpRegisterMode,
          mcpTransport:
            resourceType === 'mcp'
              ? inferMcpTransport(
                  item.endpoint || '',
                  item.authConfig && typeof item.authConfig === 'object' && !Array.isArray(item.authConfig)
                    ? (item.authConfig as Record<string, unknown>)
                    : undefined,
                )
              : prev.mcpTransport,
          protocol: item.protocol || 'mcp',
          ...(loadedEffectiveType === 'mcp'
            ? {
                authType: item.authType || 'none',
                ...deriveMcpAuthForm(
                  item.authType || 'none',
                  item.authConfig && typeof item.authConfig === 'object'
                    ? (item.authConfig as Record<string, unknown>)
                    : undefined,
                ),
              }
            : {}),
          ...(loadedEffectiveType === 'app'
            ? {
                appUrl: item.appUrl || '',
                embedType: item.embedType || 'iframe',
                appIcon: item.icon || '',
                appScreenshotsText:
                  Array.isArray(item.screenshots) && item.screenshots.length > 0 ? item.screenshots.join('\n') : '',
              }
            : {}),
          ...(loadedEffectiveType === 'dataset'
            ? {
                dataType: item.dataType || 'structured',
                format: item.format || 'json',
                recordCount: Number(item.recordCount ?? 0) || 0,
                fileSize: Number(item.fileSize ?? 0) || 0,
                tags: Array.isArray(item.tags) ? item.tags.join(',') : '',
              }
            : {}),
          ...(loadedEffectiveType === 'app'
            ? {
                relatedResourceIds: Array.isArray(item.relatedResourceIds) ? item.relatedResourceIds.join(', ') : '',
              }
            : {}),
          ...(loadedEffectiveType === 'agent'
            ? {
                registrationProtocol: item.registrationProtocol || prev.registrationProtocol,
                upstreamEndpoint: item.upstreamEndpoint || prev.upstreamEndpoint,
                upstreamAgentId: item.upstreamAgentId || '',
                credentialRef: item.credentialRef || '',
                transformProfile: item.transformProfile || '',
                modelAlias: item.modelAlias || prev.modelAlias || item.resourceCode || prev.resourceCode,
                agentEnabled: item.enabled ?? true,
                specJson:
                  item.spec && typeof item.spec === 'object'
                    ? JSON.stringify(stripAgentAdapterSpecMeta(item.spec), null, 2)
                    : prev.specJson,
                systemPrompt: item.systemPrompt ?? '',
                maxConcurrency: item.maxConcurrency ?? prev.maxConcurrency,
                agentHidden: item.hidden === true,
                agentMaxSteps: item.maxSteps != null ? String(item.maxSteps) : '',
                agentTemperature: item.temperature != null ? String(item.temperature) : '',
                relatedMcpResourceIds: Array.isArray(item.relatedMcpResourceIds)
                  ? item.relatedMcpResourceIds.join(', ')
                  : '',
              }
            : {}),
          ...(loadedEffectiveType === 'skill'
            ? {
                contextPrompt: item.contextPrompt ?? '',
                relatedMcpResourceIds: Array.isArray(item.relatedMcpResourceIds)
                  ? item.relatedMcpResourceIds.join(', ')
                  : '',
                specJson:
                  item.spec && typeof item.spec === 'object'
                    ? JSON.stringify(item.spec, null, 2)
                    : prev.specJson,
                paramsSchemaJson:
                  item.parametersSchema && typeof item.parametersSchema === 'object'
                    ? JSON.stringify(item.parametersSchema, null, 2)
                    : prev.paramsSchemaJson,
              }
            : {}),
        }));
        setLoadedResourceMeta({
          status: item.status,
          currentVersion: item.currentVersion,
          hasWorkingDraft: item.hasWorkingDraft,
          pendingPublishedUpdate: item.pendingPublishedUpdate,
          workingDraftAuditTier: item.workingDraftAuditTier,
        });
        if (loadedEffectiveType === 'agent') {
          const presetFromSpec =
            item.spec && typeof item.spec === 'object' ? extractAgentProviderPresetFromSpec(item.spec) : undefined;
          setAgentProviderPreset(
            presetFromSpec
              ?? resolveAgentProviderPreset({
                registrationProtocol: item.registrationProtocol,
                upstreamEndpoint: item.upstreamEndpoint,
                upstreamAgentId: item.upstreamAgentId,
              }),
          );
        }
        if (loadedEffectiveType === 'skill') {
          setSkillParamFields(
            schemaToStructuredParamFields(item.parametersSchema ?? JSON.parse(DEFAULT_SKILL_PARAMS_SCHEMA_JSON)),
          );
        }
      })
      .catch(() => {
        showMessage('加载资源详情失败，已退回空白表单。', 'warning');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId, resourceType, showMessage]);

  const registerGuideLine = useMemo(() => {
    if (resourceType === 'agent' && agentDeliveryMode === AGENT_DELIVERY_MODE_API) {
      return 'Agent 注册优先走供应商预设和最少必填项，复杂运行细节统一收进高级配置。';
    }
    if (resourceType === 'agent' && agentDeliveryMode === AGENT_DELIVERY_MODE_PAGE) {
      return '页面型 Agent 走页面地址与打开方式登记，适合门户打开、iframe 嵌入或微前端接入。';
    }
    if (resourceType === 'skill') {
      return 'Skill 固定为 Context 能力注册：先写正文和结构化参数，绑定 MCP 放到注册成功后。';
    }
    if (resourceType === 'mcp') {
      return 'MCP 只支持平台可远程调用的 HTTP / SSE / WebSocket 接入，不再提供 stdio 注册。';
    }
    return TYPE_GUIDE_ONE_LINE[resourceType];
  }, [agentDeliveryMode, resourceType]);
  const openAiBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/regis/openai/v1';
    return `${window.location.origin}/regis/openai/v1`;
  }, []);
  const agentPresetMeta = getAgentProviderPresetMeta(agentProviderPreset);

  const addSkillParam = () => {
    setSkillParamFields((prev) => [...prev, createStructuredParamField()]);
  };

  const updateSkillParam = (id: string, patch: Partial<StructuredParamField>) => {
    setSkillParamFields((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeSkillParam = (id: string) => {
    setSkillParamFields((prev) => prev.filter((item) => item.id !== id));
  };

  const fieldErrors = useMemo((): Partial<Record<ResourceRegisterFieldKey, string>> => {
    const next = computeResourceRegisterFieldErrors(effectiveResourceType, form);
    if (effectiveResourceType === 'mcp') {
      const built = buildMcpAuthConfigFromForm(form);
      if (built.ok === false) {
        next.authConfigJson = built.message;
      }
    }
    return next;
  }, [
      form.registrationProtocol,
      form.upstreamEndpoint,
      form.modelAlias,
      form.credentialRef,
      form.agentMaxSteps,
      form.agentTemperature,
      form.appIcon,
      form.appUrl,
      form.authConfigJson,
      form.mcpAdvancedJson,
      form.mcpApiKeyHeader,
      form.mcpApiKeyValue,
      form.mcpBearerToken,
      form.mcpBasicUsername,
      form.mcpBasicPassword,
      form.mcpOauthTokenUrl,
      form.mcpOauthClientId,
      form.mcpOauthClientSecret,
      form.mcpOauthScope,
      form.authType,
      form.dataType,
      form.displayName,
      form.embedType,
      form.endpoint,
      form.fileSize,
      form.format,
      form.maxConcurrency,
      form.mcpRegisterMode,
      form.paramsSchemaJson,
      form.protocol,
      form.recordCount,
      form.relatedResourceIds,
      form.resourceCode,
      form.specJson,
      form.relatedMcpResourceIds,
      form.contextPrompt,
      effectiveResourceType,
    ]);

  useEffect(() => {
    const nextSchemaJson = JSON.stringify(structuredParamFieldsToSchema(skillParamFields), null, 2);
    setForm((prev) => (prev.paramsSchemaJson === nextSchemaJson ? prev : { ...prev, paramsSchemaJson: nextSchemaJson }));
  }, [skillParamFields]);

  useEffect(() => {
    if (resourceType !== 'agent' || agentDeliveryMode !== AGENT_DELIVERY_MODE_API) return;
    const nextProtocol = protocolForAgentProviderPreset(agentProviderPreset);
    setForm((prev) => (prev.registrationProtocol === nextProtocol ? prev : { ...prev, registrationProtocol: nextProtocol }));
  }, [agentDeliveryMode, agentProviderPreset, resourceType]);

  useEffect(() => {
    if (resourceType !== 'agent' || agentDeliveryMode !== AGENT_DELIVERY_MODE_API) return;
    if (!form.upstreamEndpoint.trim()) return;
    const resolved = resolveAgentProviderPreset({
      providerPreset: agentProviderPreset,
      registrationProtocol: form.registrationProtocol,
      upstreamEndpoint: form.upstreamEndpoint,
      upstreamAgentId: form.upstreamAgentId,
    });
    if (resolved !== agentProviderPreset) {
      setAgentProviderPreset(resolved);
    }
  }, [agentDeliveryMode, agentProviderPreset, form.registrationProtocol, form.upstreamAgentId, form.upstreamEndpoint, resourceType]);

  useEffect(() => {
    const built = buildMcpAuthConfigFromForm(form);
    if (!built.ok) return;
    const nextJson = JSON.stringify(built.data, null, 2);
    setForm((prev) => (prev.authConfigJson === nextJson ? prev : { ...prev, authConfigJson: nextJson }));
  }, [
    form.authType,
    form.mcpAdvancedJson,
    form.mcpApiKeyHeader,
    form.mcpApiKeyValue,
    form.mcpBearerToken,
    form.mcpBasicUsername,
    form.mcpBasicPassword,
    form.mcpOauthTokenUrl,
    form.mcpOauthClientId,
    form.mcpOauthClientSecret,
    form.mcpOauthScope,
    form.mcpRegisterMode,
  ]);

  useEffect(() => {
    setMcpProbeExtra({});
  }, [form.endpoint, form.authConfigJson, form.authType, form.mcpRegisterMode]);

  useEffect(() => {
    if (resourceType !== 'agent' || agentDeliveryMode !== AGENT_DELIVERY_MODE_API || !resourceId) {
      setAgentKeys([]);
      setLatestAgentSecret('');
      return;
    }
    void refreshAgentKeys();
  }, [agentDeliveryMode, resourceType, resourceId]);

  const mcpEndpointMerged = fieldErrors.endpoint ?? mcpProbeExtra.endpoint;
  const mcpAuthJsonMerged = fieldErrors.authConfigJson ?? mcpProbeExtra.authConfigJson;
  const handleMcpConfigImport = () => {
    const r = parseMcpConfigPaste(mcpImportPaste);
    if (r.hint && !r.endpoint) {
      showMessage(r.hint, 'warning');
      return;
    }
    if (r.endpoint) {
      const mode = r.mcpRegisterMode ?? 'http_json';
      setForm((p) => ({
        ...p,
        endpoint: r.endpoint ?? p.endpoint,
        mcpRegisterMode: mode,
        mcpTransport: modeToTransport(mode),
        authType: r.authType ?? p.authType,
        ...(r.authConfig ? deriveMcpAuthForm(r.authType ?? p.authType, r.authConfig) : {}),
      }));
      showMessage(
        r.hint ? `${r.hint} 已尽量回填表单，请核对后再保存。` : '已从配置中回填 MCP 表单，请核对后保存。',
        r.hint ? 'warning' : 'success',
      );
      return;
    }
    showMessage(r.hint ?? '未能解析导入内容。', 'warning');
  };

  const handleAgentConfigImport = () => {
    const r = parseAgentConfigPaste(agentImportPaste);
    if (r.hint && !r.upstreamEndpoint && !r.modelAlias && !r.upstreamAgentId) {
      showMessage(r.hint, 'warning');
      return;
    }
    setForm((p) => ({
      ...p,
      registrationProtocol: r.registrationProtocol ?? p.registrationProtocol,
      upstreamEndpoint: r.upstreamEndpoint ?? p.upstreamEndpoint,
      upstreamAgentId: r.upstreamAgentId ?? p.upstreamAgentId,
      credentialRef: r.credentialRef ?? p.credentialRef,
      transformProfile: r.transformProfile ?? p.transformProfile,
      modelAlias: r.modelAlias ?? p.modelAlias,
      agentEnabled: typeof r.enabled === 'boolean' ? r.enabled : p.agentEnabled,
    }));
    if (r.providerPreset) {
      setAgentProviderPreset(r.providerPreset);
    }
    showMessage(
      r.hint ? `${r.hint} 已尽量回填 Agent 字段，请核对后保存。` : '已从配置中回填 Agent 字段，请核对后保存。',
      r.hint ? 'warning' : 'success',
    );
  };

  const copyText = async (text: string, successMessage: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      showMessage(successMessage, 'success');
    } catch {
      showMessage('复制失败，请手动复制。', 'warning');
    }
  };

  const refreshAgentKeys = async () => {
    if (resourceType !== 'agent' || !resourceId) return;
    setAgentKeyLoading(true);
    try {
      const rows = await resourceCenterService.listAgentKeys(resourceId);
      setAgentKeys(rows);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载 Agent Key 信息失败。', 'error');
    } finally {
      setAgentKeyLoading(false);
    }
  };

  const rotateAgentKey = async () => {
    if (resourceType !== 'agent' || !resourceId) return;
    setAgentKeyLoading(true);
    try {
      const rotated = await resourceCenterService.rotateAgentKey(resourceId);
      setLatestAgentSecret(rotated.secretPlain ?? '');
      await refreshAgentKeys();
      showMessage('已轮换 nx-sk Key，明文只在本次展示。', 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '轮换失败。', 'error');
    } finally {
      setAgentKeyLoading(false);
    }
  };

  const revokeAgentKey = async () => {
    if (resourceType !== 'agent' || !resourceId) return;
    setAgentKeyLoading(true);
    try {
      await resourceCenterService.revokeAgentKey(resourceId);
      setLatestAgentSecret('');
      await refreshAgentKeys();
      showMessage('已吊销 Agent 当前 Key。', 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '吊销失败。', 'error');
    } finally {
      setAgentKeyLoading(false);
    }
  };

  const handleMcpConnectivityProbe = async () => {
    const probeIssues = collectMcpProbeFieldIssues(form);
    if (Object.keys(probeIssues).length > 0) {
      setMcpProbeExtra(probeIssues);
      requestAnimationFrame(() => {
        const first = probeIssues.endpoint ? 'endpoint' : probeIssues.authConfigJson ? 'authConfigJson' : null;
        if (first) document.getElementById(rrFieldId(first))?.focus();
      });
      return;
    }
    setMcpProbeExtra({});
    setMcpProbeLoading(true);
    try {
      const builtAuth = buildMcpAuthConfigFromForm(form);
      if (builtAuth.ok === false) {
        setMcpProbeExtra({ authConfigJson: builtAuth.message });
        return;
      }
      const res = await resourceCenterService.probeMcpConnectivity({
        endpoint: form.endpoint.trim(),
        authType: form.authType || 'none',
        authConfig: builtAuth.data,
        transport: modeToTransport(form.mcpRegisterMode),
      });
      showMessage(res.message, res.ok ? 'success' : 'warning');
      if (res.bodyPreview) {
        console.info('[MCP probe preview]', res.bodyPreview);
      }
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '探测失败', 'error');
    } finally {
      setMcpProbeLoading(false);
    }
  };
  const buildPayload = (): ResourceUpsertRequest => {
    const tagIdPick = Number(form.catalogTagId.trim());
    const baseFields = {
      resourceCode: form.resourceCode.trim(),
      displayName: form.displayName.trim(),
      description: form.description.trim() || undefined,
      sourceType: form.sourceType,
      accessPolicy: 'open_platform' as const,
      ...(form.catalogTagId.trim() && Number.isFinite(tagIdPick) && tagIdPick > 0 ? { tagIds: [tagIdPick] } : {}),
    };
    if (resourceType === 'mcp') {
      const builtAuth = buildMcpAuthConfigFromForm(form);
      if (builtAuth.ok === false) throw new Error(builtAuth.message);
      return {
        ...baseFields,
        resourceType: 'mcp',
        endpoint: form.endpoint.trim(),
        protocol: 'mcp',
        authType: form.authType || 'none',
        authConfig: builtAuth.data,
        serviceDetailMd: form.serviceDetailMd.trim(),
      };
    }
    if (resourceType === 'skill') {
      const parsedSpec = parseJsonObject(form.specJson, '附加元数据（spec JSON）');
      const parsedSchema = parseJsonObject(form.paramsSchemaJson, '参数结构（parametersSchema JSON）');
      if (!parsedSpec.ok || !parsedSchema.ok) {
        throw new Error(!parsedSpec.ok ? parsedSpec.message : parsedSchema.message);
      }
      const specObj = parsedSpec.data || {};
      const skillMcpBind = mergeRelationIdsForUpsert(
        Boolean(resourceId),
        form.relatedMcpResourceIds,
        bindingSnapshotRef.current.relatedMcpResourceIds,
      );
      return {
        ...baseFields,
        resourceType: 'skill',
        executionMode: 'context',
        serviceDetailMd: form.serviceDetailMd.trim(),
        skillType: 'context_v1',
        contextPrompt: form.contextPrompt.trim(),
        spec: Object.keys(specObj).length > 0 ? specObj : {},
        parametersSchema: parsedSchema.data || {},
        isPublic: true,
        ...(skillMcpBind !== undefined ? { relatedMcpResourceIds: skillMcpBind } : {}),
      };
    }
    if (resourceType === 'agent' && agentDeliveryMode === AGENT_DELIVERY_MODE_API) {
      const parsedSpec = parseJsonObject(form.specJson, '规格配置（spec JSON）');
      if (!parsedSpec.ok) throw new Error(parsedSpec.message);
      const userSpec = stripAgentAdapterSpecMeta(parsedSpec.data || {});
      const msTrim = form.agentMaxSteps.trim();
      const maxStepsParsed = msTrim ? Number(msTrim) : NaN;
      const tempTrim = form.agentTemperature.trim();
      const tempParsed = tempTrim ? Number(tempTrim) : NaN;
      const mcpBind = mergeRelationIdsForUpsert(
        Boolean(resourceId),
        form.relatedMcpResourceIds,
        bindingSnapshotRef.current.relatedMcpResourceIds,
      );
      return {
        ...baseFields,
        resourceType: 'agent',
        serviceDetailMd: form.serviceDetailMd.trim(),
        agentType: 'http_api',
        mode: 'SUBAGENT',
        spec: {
          ...userSpec,
          ...buildAgentAdapterSpecMeta(agentProviderPreset, {
            modelAlias: form.modelAlias,
          }),
        },
        registrationProtocol: protocolForAgentProviderPreset(agentProviderPreset) as
          | 'openai_compatible'
          | 'bailian_compatible'
          | 'anthropic_messages'
          | 'gemini_generatecontent',
        upstreamEndpoint: form.upstreamEndpoint.trim(),
        upstreamAgentId: form.upstreamAgentId.trim() || undefined,
        credentialRef: form.credentialRef.trim() || undefined,
        transformProfile: form.transformProfile.trim() || undefined,
        modelAlias: form.modelAlias.trim(),
        enabled: form.agentEnabled,
        maxConcurrency: Number(form.maxConcurrency) || 10,
        systemPrompt: form.systemPrompt.trim() ? form.systemPrompt.trim() : undefined,
        isPublic: true,
        hidden: form.agentHidden,
        ...(Number.isFinite(maxStepsParsed) && maxStepsParsed > 0 ? { maxSteps: maxStepsParsed } : {}),
        ...(Number.isFinite(tempParsed) ? { temperature: tempParsed } : {}),
        ...(mcpBind !== undefined ? { relatedMcpResourceIds: mcpBind } : {}),
      };
    }
    if (effectiveResourceType === 'app') {
      const appRelated = parseRelatedIds(form.relatedResourceIds).ids;
      const shotLines = form.appScreenshotsText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        ...baseFields,
        resourceType: 'app',
        serviceDetailMd: form.serviceDetailMd.trim(),
        appUrl: form.appUrl.trim(),
        embedType: form.embedType.trim().toLowerCase(),
        icon: form.appIcon.trim() || undefined,
        screenshots: shotLines.length > 0 ? shotLines : undefined,
        isPublic: true,
        relatedResourceIds: appRelated.length > 0 ? appRelated : undefined,
        ...(resourceType === 'agent'
          ? {
              agentExposure: 'unified_agent',
              agentDeliveryMode: 'page',
            }
          : {}),
      };
    }
    return {
      ...baseFields,
      resourceType: 'dataset',
      serviceDetailMd: form.serviceDetailMd.trim(),
      dataType: form.dataType.trim(),
      format: form.format.trim(),
      recordCount: Number(form.recordCount) || 0,
      fileSize: Number(form.fileSize) || 0,
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      isPublic: true,
    };
  };
  const save = async (submitAfterSave: boolean) => {
    if (!resourceId && !user?.id) {
      showMessage('请先登录后再注册资源。', 'error');
      return;
    }
    const errs = fieldErrors;
    if (Object.keys(errs).length > 0) {
      requestAnimationFrame(() => {
        for (const k of RR_FIELD_FOCUS_ORDER) {
          if (errs[k]) {
            document.getElementById(rrFieldId(k))?.focus();
            break;
          }
        }
      });
      return;
    }
    setLoading(true);
    try {
      const payload = buildPayload();
      let lastItem = resourceId
        ? await resourceCenterService.update(resourceId, payload)
        : await resourceCenterService.create(payload);
      const id = lastItem.id;
      if (submitAfterSave && id) {
        lastItem = await resourceCenterService.submit(id);
        setLoadedResourceMeta({
          status: lastItem.status,
          currentVersion: lastItem.currentVersion,
          hasWorkingDraft: lastItem.hasWorkingDraft,
          pendingPublishedUpdate: lastItem.pendingPublishedUpdate,
          workingDraftAuditTier: lastItem.workingDraftAuditTier,
        });
        showMessage(lastItem.statusHint || (lastItem.status === 'published' ? '提交已处理，请留意状态提示。' : '保存并提审成功。'), 'success');
      } else {
        setLoadedResourceMeta({
          status: lastItem.status,
          currentVersion: lastItem.currentVersion,
          hasWorkingDraft: lastItem.hasWorkingDraft,
          pendingPublishedUpdate: lastItem.pendingPublishedUpdate,
          workingDraftAuditTier: lastItem.workingDraftAuditTier,
        });
        showMessage(
          resourceId && lastItem.status === 'published'
            ? '草稿已保存：线上默认解析版本尚未合并，请稍后再执行“保存并提审”。'
            : '保存成功。',
          'success',
        );
      }
      if (!resourceId && !submitAfterSave && lastItem.id && (resourceType === 'agent' || resourceType === 'skill')) {
        navigate(buildPath('user', resourceType === 'agent' ? 'agent-register' : 'skill-register', lastItem.id));
        return;
      }
      onBack();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '保存失败。', 'error');
    } finally {
      setLoading(false);
    }
  };

  const registerPageTitle = `${resourceId ? '编辑' : '注册'}${TYPE_LABEL[resourceType]}`;

  return (
    <MgmtPageShell
      theme={theme}
      fontSize={fontSize}
      titleIcon={FileText}
      breadcrumbSegments={['统一资源中心', registerPageTitle]}
      description={registerGuideLine}
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <button
            type="button"
            className={`inline-flex items-center gap-1 text-sm font-medium ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'}`}
            onClick={() => navigate(buildPath('user', 'developer-docs'))}
            aria-label="打开接入指南"
          >
            <BookOpen size={14} aria-hidden />
            接入指南
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnSecondary(theme)} onClick={onBack} aria-label="返回资源列表">
              <ArrowLeft size={15} aria-hidden />
              返回
            </button>
            <button type="button" className={btnGhostStyle(theme)} onClick={() => void save(false)} disabled={loading} aria-label="保存草稿">
              <Save size={15} aria-hidden />
              保存
            </button>
            <button type="button" className={btnPrimary} onClick={() => void save(true)} disabled={loading} aria-label="保存并提交审核">
              <Send size={15} aria-hidden />
              保存并提审
            </button>
          </div>
        </div>
      }
      contentScroll="document"
    >
      <div className="px-4 sm:px-6 pb-8">
        {resourceId && loadedResourceMeta?.status === 'published' ? (
          <div
            className={`mb-4 rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${
              isDark ? 'border-sky-500/35 bg-sky-500/10 text-sky-100' : 'border-sky-200 bg-sky-50 text-sky-950'
            }`}
          >
            <p>
              <span className="font-medium">双轨编辑：</span>
              线上默认解析版本为 <span className="font-mono">{loadedResourceMeta.currentVersion ?? '—'}</span>。
              本页保存的是 <strong>登记草稿</strong>，不会立刻改变网关对外解析配置；完成后请使用“保存并提审”，审核通过后再合并上线。
            </p>
            {loadedResourceMeta.pendingPublishedUpdate ? (
              <p className={`mt-1.5 ${isDark ? 'text-amber-100' : 'text-amber-900'}`}>
                当前有一条已发布变更正在审核；可先到资源列表撤回后再继续修改草稿。
              </p>
            ) : null}
            {loadedResourceMeta.workingDraftAuditTier ? (
              <p className={`mt-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                后端估算风险等级：
                {workingDraftAuditTierLabelZh(loadedResourceMeta.workingDraftAuditTier) || loadedResourceMeta.workingDraftAuditTier}
                （低风险且具备部门 / 平台管理员权限时，可能免审直合。）
              </p>
            ) : null}
          </div>
        ) : null}
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <Field label="资源编码 *" theme={theme} error={fieldErrors.resourceCode} fieldId={rrFieldId('resourceCode')}>
              <input
                id={rrFieldId('resourceCode')}
                value={form.resourceCode}
                onChange={(e) => setForm((p) => ({ ...p, resourceCode: e.target.value }))}
                className={inputClass(isDark, !!fieldErrors.resourceCode)}
                aria-invalid={!!fieldErrors.resourceCode}
                aria-describedby={fieldErrors.resourceCode ? `${rrFieldId('resourceCode')}-err` : undefined}
                title="3-64 位，允许字母、数字、下划线和短横线"
                placeholder="唯一标识，例如 weather-tool"
              />
            </Field>
            <Field label="显示名称 *" theme={theme} error={fieldErrors.displayName} fieldId={rrFieldId('displayName')}>
              <input
                id={rrFieldId('displayName')}
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                className={inputClass(isDark, !!fieldErrors.displayName)}
                aria-invalid={!!fieldErrors.displayName}
                aria-describedby={fieldErrors.displayName ? `${rrFieldId('displayName')}-err` : undefined}
                placeholder="列表与详情页中展示的名称"
              />
            </Field>
            <Field label="描述（选填）" full theme={theme}>
              <AutoHeightTextarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                minRows={3}
                maxRows={12}
                className={`${inputClass(isDark)} resize-none`}
                placeholder="简要描述用途与适用场景"
              />
            </Field>
            <Field
              label={
                resourceType === 'mcp'
                  ? '服务详情（选填）'
                  : resourceType === 'skill'
                    ? '技能介绍（选填）'
                    : resourceType === 'dataset'
                      ? '数据集介绍（选填）'
                      : resourceType === 'agent'
                        ? '智能体介绍（选填）'
                        : '应用介绍（选填）'
              }
              full
              theme={theme}
            >
              <ReviewMarkdownEditor
                theme={theme}
                value={form.serviceDetailMd}
                onChange={(v) => setForm((p) => ({ ...p, serviceDetailMd: v }))}
                variant="default"
                editorMode="auto"
                stripPreviewDeviceBar
                placeholder={
                  resourceType === 'mcp'
                    ? '支持 Markdown：填写能力说明、认证方式、调用限制和示例，将展示在 MCP 市场详情的“服务详情”中。'
                    : resourceType === 'skill'
                      ? '支持 Markdown：填写技能能力、依赖和使用示例，将展示在技能市场的“技能详情”中。'
                      : resourceType === 'dataset'
                        ? '支持 Markdown：填写数据来源、字段说明和使用限制，将展示在数据集市场的“数据集介绍”中。'
                        : resourceType === 'agent'
                          ? '支持 Markdown：填写适用场景、能力边界和调用说明，将展示在智能体市场的“服务详情”中。'
                          : '支持 Markdown：填写功能说明、嵌入方式、权限和示例，将展示在应用集的“应用介绍”中。'
                }
              />
            </Field>
            <Field label="目录标签（选填）" theme={theme}>
              <LantuSelect
                theme={theme}
                value={form.catalogTagId}
                onChange={(v) => setForm((p) => ({ ...p, catalogTagId: v }))}
                options={tagOptions}
                placeholder="不选"
              />
            </Field>
            <div className="md:col-span-2">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium ${
                  isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
                onClick={() => setAdvancedOpen((o) => !o)}
              >
                <span>高级选项</span>
                <ChevronDown size={16} className={advancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {advancedOpen ? (
                <div className="mt-2 rounded-xl border border-dashed px-3 py-3 md:grid md:grid-cols-2 md:gap-3">
                  <Field label="来源类型" theme={theme}>
                    <ThemedSelect
                      isDark={isDark}
                      value={form.sourceType}
                      onChange={(value) => setForm((p) => ({ ...p, sourceType: value }))}
                      options={[
                        { value: 'internal', label: '内部' },
                        { value: 'cloud', label: '云端' },
                        { value: 'partner', label: '合作方' },
                        { value: 'department', label: '部门' },
                      ]}
                    />
                  </Field>
                </div>
              ) : null}
            </div>

            {resourceType === 'mcp' && (
              <>
                <NoticeCard isDark={isDark} title="只保留真正可远程调用的 MCP 接入">
                  <p>平台不会托管本地 stdio 进程。请提供 HTTP JSON-RPC、HTTP SSE 或 WebSocket 地址。</p>
                  <p>如果当前只有 command/stdio，请先在你侧暴露成远程 URL，再回到这里登记。</p>
                </NoticeCard>

                <SectionCard
                  theme={theme}
                  isDark={isDark}
                  title="快速导入"
                  description="支持直接粘贴 URL、mcpServers JSON 或单个 server 配置。导入器会自动识别 transport 与鉴权方式。"
                >
                  <AutoHeightTextarea
                    value={mcpImportPaste}
                    onChange={(e) => setMcpImportPaste(e.target.value)}
                    minRows={4}
                    maxRows={18}
                    className={`${inputClass(isDark)} font-mono text-xs resize-none`}
                    placeholder={'支持粘贴 URL 或 JSON，例如：https://example.com/mcp 或 { "mcpServers": { "demo": { "url": "https://example.com/mcp" } } }'}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={handleMcpConfigImport}>
                      解析并回填
                    </button>
                  </div>
                </SectionCard>

                <SectionCard
                  theme={theme}
                  isDark={isDark}
                  title="手动配置"
                  description="首屏只保留远程地址、transport 与鉴权方式。原始 authConfig JSON 放进高级配置。"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="远程地址 *" full theme={theme} error={mcpEndpointMerged} fieldId={rrFieldId('endpoint')}>
                      <input
                        id={rrFieldId('endpoint')}
                        value={form.endpoint}
                        onChange={(e) => setForm((p) => ({ ...p, endpoint: e.target.value }))}
                        className={inputClass(isDark, !!mcpEndpointMerged)}
                        aria-invalid={!!mcpEndpointMerged}
                        aria-describedby={mcpEndpointMerged ? `${rrFieldId('endpoint')}-err` : undefined}
                        placeholder={form.mcpRegisterMode === 'websocket' ? 'wss://example.com/mcp' : 'https://example.com/mcp'}
                      />
                    </Field>
                    <Field label="Transport *" theme={theme}>
                      <ThemedSelect
                        isDark={isDark}
                        value={form.mcpRegisterMode}
                        onChange={(value) => {
                          const nextMode = value as McpRegisterMode;
                          setForm((p) => ({
                            ...p,
                            mcpRegisterMode: nextMode,
                            mcpTransport: modeToTransport(nextMode),
                          }));
                        }}
                        options={[
                          { value: 'http_json', label: 'HTTP JSON-RPC' },
                          { value: 'http_sse', label: 'HTTP SSE' },
                          { value: 'websocket', label: 'WebSocket' },
                        ]}
                      />
                    </Field>
                    <Field label="协议" theme={theme} error={fieldErrors.protocol} fieldId={rrFieldId('protocol')}>
                      <input
                        id={rrFieldId('protocol')}
                        value="mcp"
                        readOnly
                        className={inputClass(isDark, !!fieldErrors.protocol)}
                        aria-invalid={!!fieldErrors.protocol}
                        aria-describedby={fieldErrors.protocol ? `${rrFieldId('protocol')}-err` : undefined}
                      />
                    </Field>
                    <Field label="鉴权方式" theme={theme}>
                      <ThemedSelect
                        isDark={isDark}
                        value={form.authType}
                        onChange={(value) => setForm((p) => ({ ...p, authType: value }))}
                        options={[
                          { value: 'none', label: '无需鉴权' },
                          { value: 'api_key', label: 'API Key' },
                          { value: 'bearer', label: 'Bearer Token' },
                          { value: 'basic', label: 'HTTP Basic' },
                          { value: 'oauth2_client', label: 'OAuth2 Client Credentials' },
                        ]}
                      />
                    </Field>
                  </div>

                  {form.authType === 'api_key' ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label="Header 名称" theme={theme}>
                        <input
                          value={form.mcpApiKeyHeader}
                          onChange={(e) => setForm((p) => ({ ...p, mcpApiKeyHeader: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="X-Api-Key"
                        />
                      </Field>
                      <Field label="API Key" theme={theme}>
                        <input
                          value={form.mcpApiKeyValue}
                          onChange={(e) => setForm((p) => ({ ...p, mcpApiKeyValue: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="sk-..."
                        />
                      </Field>
                    </div>
                  ) : null}

                  {form.authType === 'bearer' ? (
                    <Field label="Bearer Token" full theme={theme}>
                      <input
                        value={form.mcpBearerToken}
                        onChange={(e) => setForm((p) => ({ ...p, mcpBearerToken: e.target.value }))}
                        className={inputClass(isDark)}
                        placeholder="eyJ..."
                      />
                    </Field>
                  ) : null}

                  {form.authType === 'basic' ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label="用户名" theme={theme}>
                        <input
                          value={form.mcpBasicUsername}
                          onChange={(e) => setForm((p) => ({ ...p, mcpBasicUsername: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="user"
                        />
                      </Field>
                      <Field label="密码" theme={theme}>
                        <input
                          type="password"
                          value={form.mcpBasicPassword}
                          onChange={(e) => setForm((p) => ({ ...p, mcpBasicPassword: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="password"
                        />
                      </Field>
                    </div>
                  ) : null}

                  {form.authType === 'oauth2_client' ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label="Token URL" full theme={theme}>
                        <input
                          value={form.mcpOauthTokenUrl}
                          onChange={(e) => setForm((p) => ({ ...p, mcpOauthTokenUrl: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="https://id.example.com/oauth/token"
                        />
                      </Field>
                      <Field label="Client ID" theme={theme}>
                        <input
                          value={form.mcpOauthClientId}
                          onChange={(e) => setForm((p) => ({ ...p, mcpOauthClientId: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="client-id"
                        />
                      </Field>
                      <Field label="Client Secret" theme={theme}>
                        <input
                          type="password"
                          value={form.mcpOauthClientSecret}
                          onChange={(e) => setForm((p) => ({ ...p, mcpOauthClientSecret: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="client-secret"
                        />
                      </Field>
                      <Field label="Scope（选填）" theme={theme}>
                        <input
                          value={form.mcpOauthScope}
                          onChange={(e) => setForm((p) => ({ ...p, mcpOauthScope: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="mcp.read"
                        />
                      </Field>
                    </div>
                  ) : null}

                  {form.authType === 'none' ? (
                    <p className={`text-xs ${textMuted(theme)}`}>当前资源无需鉴权，平台将直接使用远程地址做握手与调用。</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={mcpProbeLoading}
                      onClick={() => void handleMcpConnectivityProbe()}
                    >
                      {mcpProbeLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={16} /> 连通性检测中
                        </span>
                      ) : (
                        '探测连通性'
                      )}
                    </button>
                    <span className={`text-xs ${textMuted(theme)}`}>平台会代发一次 initialize / tools/list，不会托管你的 MCP 服务。</span>
                  </div>
                </SectionCard>

                <SectionCard
                  theme={theme}
                  isDark={isDark}
                  title="高级配置"
                  description="仅当你需要补充额外 headers 或协议细节时再展开。"
                >
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium ${
                      isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                    onClick={() => setMcpAdvancedOpen((open) => !open)}
                  >
                    <span>查看原始 authConfig JSON</span>
                    <ChevronDown size={16} className={mcpAdvancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  {mcpAdvancedOpen ? (
                    <Field label="原始 authConfig JSON" full theme={theme} error={mcpAuthJsonMerged} fieldId={rrFieldId('authConfigJson')}>
                      <AutoHeightTextarea
                        id={rrFieldId('authConfigJson')}
                        value={form.mcpAdvancedJson}
                        onChange={(e) => setForm((p) => ({ ...p, mcpAdvancedJson: e.target.value }))}
                        minRows={6}
                        maxRows={24}
                        className={`${inputClass(isDark, !!mcpAuthJsonMerged)} font-mono text-xs resize-none`}
                        aria-invalid={!!mcpAuthJsonMerged}
                        aria-describedby={mcpAuthJsonMerged ? `${rrFieldId('authConfigJson')}-err` : undefined}
                        placeholder={DEFAULT_MCP_AUTH_CONFIG_JSON}
                      />
                    </Field>
                  ) : null}
                </SectionCard>
              </>
            )}
            {resourceType === 'agent' && (
              <SectionCard
                theme={theme}
                isDark={isDark}
                title="交付形态"
                description="API 型 Agent 走后台调用；页面型 Agent 走页面打开与嵌入。"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {AGENT_DELIVERY_OPTIONS.map((option) => {
                    const active = agentDeliveryMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAgentDeliveryMode(option.value)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          active
                            ? isDark
                              ? 'border-sky-400/60 bg-sky-400/10 text-sky-50'
                              : 'border-sky-300 bg-sky-50 text-sky-950'
                            : isDark
                              ? 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-sm font-semibold">{option.title}</div>
                        <div className={`mt-1 text-xs leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                          {option.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            )}
            {resourceType === 'agent' && agentDeliveryMode === AGENT_DELIVERY_MODE_API && (
              <>
                <NoticeCard isDark={isDark} title="先注册成功，再补充绑定增强">
                  <p>Agent 首屏只保留供应商预设、上游地址、对外 model alias 和凭证引用。</p>
                  <p>运行模式、并发、Spec、采样温度等内部旋钮统一移到高级配置。</p>
                </NoticeCard>

                <SectionCard
                  theme={theme}
                  isDark={isDark}
                  title="快速导入"
                  description="支持粘贴 URL、JSON 或配置片段。系统会自动识别协议族与供应商预设，并回填最少字段。"
                >
                  <AutoHeightTextarea
                    value={agentImportPaste}
                    onChange={(e) => setAgentImportPaste(e.target.value)}
                    minRows={4}
                    maxRows={18}
                    className={`${inputClass(isDark)} font-mono text-xs resize-none`}
                    placeholder={'支持 URL 或 JSON，例如：https://api.openai.com/v1/chat/completions 或 { "provider": "deepseek", "baseUrl": "https://api.deepseek.com/v1/chat/completions" }'}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={handleAgentConfigImport}>
                      解析并回填
                    </button>
                  </div>
                </SectionCard>

                <SectionCard
                  theme={theme}
                  isDark={isDark}
                  title="手动配置"
                  description="底层按协议族收口，前端按供应商预设展开。首屏不再暴露 agentType / mode 等内部字段。"
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="上游接入适配器 *" theme={theme}>
                      <ThemedSelect
                        isDark={isDark}
                        value={agentProviderPreset}
                        onChange={(value) => {
                          const nextPreset = value as AgentProviderPreset;
                          const prevDefault = defaultEndpointForAgentProviderPreset(agentProviderPreset);
                          const nextDefault = defaultEndpointForAgentProviderPreset(nextPreset);
                          setAgentProviderPreset(nextPreset);
                          setForm((p) => ({
                            ...p,
                            registrationProtocol: protocolForAgentProviderPreset(nextPreset),
                            upstreamEndpoint: !p.upstreamEndpoint.trim() || p.upstreamEndpoint === prevDefault ? nextDefault : p.upstreamEndpoint,
                          }));
                        }}
                        options={AGENT_PROVIDER_PRESET_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
                      />
                    </Field>
                    <Field label="协议族" theme={theme}>
                      <input value={form.registrationProtocol} readOnly className={inputClass(isDark)} />
                    </Field>
                    <Field
                      label={agentPresetMeta.endpointLabel ?? '上游地址 *'}
                      theme={theme}
                      error={fieldErrors.upstreamEndpoint}
                      fieldId={rrFieldId('upstreamEndpoint')}
                    >
                      <input
                        id={rrFieldId('upstreamEndpoint')}
                        value={form.upstreamEndpoint}
                        onChange={(e) => setForm((p) => ({ ...p, upstreamEndpoint: e.target.value }))}
                        className={inputClass(isDark, !!fieldErrors.upstreamEndpoint)}
                        aria-invalid={!!fieldErrors.upstreamEndpoint}
                        aria-describedby={fieldErrors.upstreamEndpoint ? `${rrFieldId('upstreamEndpoint')}-err` : undefined}
                        placeholder={
                          agentPresetMeta.endpointPlaceholder
                          || defaultEndpointForAgentProviderPreset(agentProviderPreset)
                          || 'https://api.example.com/v1/chat/completions'
                        }
                      />
                    </Field>
                    <Field label="对外 Model Alias *" theme={theme} error={fieldErrors.modelAlias} fieldId={rrFieldId('modelAlias')}>
                      <input
                        id={rrFieldId('modelAlias')}
                        value={form.modelAlias}
                        onChange={(e) => setForm((p) => ({ ...p, modelAlias: e.target.value }))}
                        className={inputClass(isDark, !!fieldErrors.modelAlias)}
                        aria-invalid={!!fieldErrors.modelAlias}
                        aria-describedby={fieldErrors.modelAlias ? `${rrFieldId('modelAlias')}-err` : undefined}
                        placeholder={agentPresetMeta.modelAliasPlaceholder ?? 'chef_agent_01'}
                      />
                    </Field>
                    <Field label="凭证引用（选填）" full theme={theme} error={fieldErrors.credentialRef} fieldId={rrFieldId('credentialRef')}>
                      <input
                        id={rrFieldId('credentialRef')}
                        value={form.credentialRef}
                        onChange={(e) => setForm((p) => ({ ...p, credentialRef: e.target.value }))}
                        className={inputClass(isDark, !!fieldErrors.credentialRef)}
                        aria-invalid={!!fieldErrors.credentialRef}
                        aria-describedby={fieldErrors.credentialRef ? `${rrFieldId('credentialRef')}-err` : undefined}
                        placeholder={agentPresetMeta.credentialHint ?? 'env:OPENAI_API_KEY / vault:agent/chef'}
                      />
                    </Field>
                  </div>
                  <p className={`text-xs ${textMuted(theme)}`}>
                    当前适配器：{agentPresetMeta.label}。{agentPresetMeta.hint}
                  </p>
                </SectionCard>

                {resourceId ? (
                  <SectionCard
                    theme={theme}
                    isDark={isDark}
                    title="对外接入与凭证"
                    description="注册成功后，这里会成为后续绑定与调试的锚点。"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className={`rounded-xl border px-3 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}>
                        <div className={`mb-1 text-xs ${textMuted(theme)}`}>统一网关 Base URL</div>
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 break-all text-xs">{openAiBaseUrl}</code>
                          <button type="button" className={btnSecondary(theme)} onClick={() => void copyText(openAiBaseUrl, 'Base URL 已复制')}>
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                      <div className={`rounded-xl border px-3 py-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}>
                        <div className={`mb-1 text-xs ${textMuted(theme)}`}>Model Alias</div>
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 break-all text-xs">{form.modelAlias || '请先填写'}</code>
                          <button type="button" className={btnSecondary(theme)} onClick={() => void copyText(form.modelAlias || '', 'Model Alias 已复制')} disabled={!form.modelAlias}>
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={btnSecondary(theme)} disabled={agentKeyLoading} onClick={() => void refreshAgentKeys()}>
                        {agentKeyLoading ? '刷新中...' : '刷新 Key'}
                      </button>
                      <button type="button" className={btnSecondary(theme)} disabled={agentKeyLoading} onClick={() => void rotateAgentKey()}>
                        轮换 nx-sk
                      </button>
                      <button type="button" className={btnSecondary(theme)} disabled={agentKeyLoading} onClick={() => void revokeAgentKey()}>
                        吊销 Key
                      </button>
                    </div>
                    {latestAgentSecret ? (
                      <div className={`rounded-xl border px-3 py-3 ${isDark ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'}`}>
                        <div className={`mb-1 text-xs ${textMuted(theme)}`}>本次新生成的明文 Key</div>
                        <div className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 break-all text-xs">{latestAgentSecret}</code>
                          <button type="button" className={btnSecondary(theme)} onClick={() => void copyText(latestAgentSecret, 'nx-sk 已复制')}>
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <div className={`mb-1 text-xs ${textMuted(theme)}`}>当前 Key 列表</div>
                      {agentKeys.length === 0 ? (
                        <p className={`text-xs ${textMuted(theme)}`}>当前还没有可用 Key，点“轮换 nx-sk”即可生成。</p>
                      ) : (
                        <div className="space-y-1">
                          {agentKeys.map((keyRow) => (
                            <div key={keyRow.id} className={`rounded-xl border px-3 py-2 text-xs ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}>
                              <span className="font-mono">{keyRow.maskedKey || `#${keyRow.id}`}</span>
                              <span className={`ml-2 ${textMuted(theme)}`}>状态：{keyRow.status || 'unknown'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                ) : null}

                {resourceId ? (
                  <SectionCard
                    theme={theme}
                    isDark={isDark}
                    title="后置增强：绑定 MCP"
                    description="资源先注册成功，再补充绑定关系。这里只展示你名下已发布/测试中的 MCP。"
                  >
                    <OrderedRelatedResourcePicker
                      theme={theme}
                      isDark={isDark}
                      fieldId={rrFieldId('relatedMcpResourceIds')}
                      value={form.relatedMcpResourceIds}
                      onChangeValue={(next) => setForm((p) => ({ ...p, relatedMcpResourceIds: next }))}
                      poolItems={mcpBindPickPool}
                      loading={relationPicklistLoading}
                      loadError={relationPicklistError}
                      errorStyle={!!fieldErrors.relatedMcpResourceIds}
                      aria-describedby={fieldErrors.relatedMcpResourceIds ? `${rrFieldId('relatedMcpResourceIds')}-err` : undefined}
                      orphanHint="不在当前可选列表；可移除或保留"
                    />
                  </SectionCard>
                ) : (
                  <NoticeCard isDark={isDark} title="MCP 绑定在注册成功后开启">
                    <p>先保存 Agent。成功后页面会停留在编辑态，你可以继续补充绑定关系。</p>
                  </NoticeCard>
                )}

                <SectionCard
                  theme={theme}
                  isDark={isDark}
                  title="高级配置"
                  description="仅当你需要调运行参数或协议细节时再展开。普通用户首屏不需要理解这些字段。"
                >
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium ${
                      isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                    onClick={() => setAgentAdvancedOpen((open) => !open)}
                  >
                    <span>查看运行参数与协议细节</span>
                    <ChevronDown size={16} className={agentAdvancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  {agentAdvancedOpen ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label={agentPresetMeta.upstreamIdLabel ?? '上游 Agent / App ID（选填）'} theme={theme}>
                        <input
                          value={form.upstreamAgentId}
                          onChange={(e) => setForm((p) => ({ ...p, upstreamAgentId: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder={agentPresetMeta.upstreamIdPlaceholder ?? 'app-xxxx'}
                        />
                      </Field>
                      <Field label="Transform Profile（选填）" theme={theme}>
                        <input
                          value={form.transformProfile}
                          onChange={(e) => setForm((p) => ({ ...p, transformProfile: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder={agentPresetMeta.transformProfilePlaceholder ?? 'default'}
                        />
                      </Field>
                      <Field label="最大并发" theme={theme} error={fieldErrors.maxConcurrency} fieldId={rrFieldId('maxConcurrency')}>
                        <div id={rrFieldId('maxConcurrency')}>
                          <PresetOrCustomNumberField
                            theme={theme}
                            value={form.maxConcurrency}
                            onChange={(n) => setForm((p) => ({ ...p, maxConcurrency: n }))}
                            presets={RESOURCE_MAX_CONCURRENCY.presets}
                            customMin={RESOURCE_MAX_CONCURRENCY.customMin}
                            customMax={RESOURCE_MAX_CONCURRENCY.customMax}
                            customSeed={RESOURCE_MAX_CONCURRENCY.customSeed}
                            inputClassName={inputClass(isDark, !!fieldErrors.maxConcurrency)}
                            ariaLabel="Agent 最大并发"
                          />
                        </div>
                      </Field>
                      <Field label="调用开关" theme={theme}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.agentEnabled}
                            onChange={(e) => setForm((p) => ({ ...p, agentEnabled: e.target.checked }))}
                            className={lantuCheckboxPrimaryClass}
                          />
                          <span className={textMuted(theme)}>控制统一网关是否允许继续发现与调用</span>
                        </label>
                      </Field>
                      <Field label="目录外隐藏" theme={theme}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.agentHidden}
                            onChange={(e) => setForm((p) => ({ ...p, agentHidden: e.target.checked }))}
                            className={lantuCheckboxPrimaryClass}
                          />
                          <span className={textMuted(theme)}>仅影响市场可见性，不影响资源本身的注册状态</span>
                        </label>
                      </Field>
                      <Field label="最大步数（选填）" theme={theme} error={fieldErrors.agentMaxSteps} fieldId={rrFieldId('agentMaxSteps')}>
                        <input
                          id={rrFieldId('agentMaxSteps')}
                          value={form.agentMaxSteps}
                          onChange={(e) => setForm((p) => ({ ...p, agentMaxSteps: e.target.value }))}
                          className={inputClass(isDark, !!fieldErrors.agentMaxSteps)}
                          aria-invalid={!!fieldErrors.agentMaxSteps}
                          aria-describedby={fieldErrors.agentMaxSteps ? `${rrFieldId('agentMaxSteps')}-err` : undefined}
                          placeholder="正整数"
                          inputMode="numeric"
                        />
                      </Field>
                      <Field label="采样温度（选填）" theme={theme} error={fieldErrors.agentTemperature} fieldId={rrFieldId('agentTemperature')}>
                        <input
                          id={rrFieldId('agentTemperature')}
                          value={form.agentTemperature}
                          onChange={(e) => setForm((p) => ({ ...p, agentTemperature: e.target.value }))}
                          className={inputClass(isDark, !!fieldErrors.agentTemperature)}
                          aria-invalid={!!fieldErrors.agentTemperature}
                          aria-describedby={fieldErrors.agentTemperature ? `${rrFieldId('agentTemperature')}-err` : undefined}
                          placeholder="如 0.7"
                          inputMode="decimal"
                        />
                      </Field>
                      <Field label="系统提示词（选填）" full theme={theme}>
                        <AutoHeightTextarea
                          value={form.systemPrompt}
                          onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
                          minRows={3}
                          maxRows={12}
                          className={`${inputClass(isDark)} resize-none`}
                          placeholder="角色说明、回答约束等"
                        />
                      </Field>
                      <Field label="Spec JSON" full theme={theme} error={fieldErrors.specJson} fieldId={rrFieldId('specJson')}>
                        <AutoHeightTextarea
                          id={rrFieldId('specJson')}
                          value={form.specJson}
                          onChange={(e) => setForm((p) => ({ ...p, specJson: e.target.value }))}
                          minRows={4}
                          maxRows={24}
                          className={`${inputClass(isDark, !!fieldErrors.specJson)} font-mono text-xs resize-none`}
                          aria-invalid={!!fieldErrors.specJson}
                          aria-describedby={fieldErrors.specJson ? `${rrFieldId('specJson')}-err` : undefined}
                          placeholder={DEFAULT_AGENT_SPEC_JSON}
                        />
                      </Field>
                    </div>
                  ) : null}
                </SectionCard>
              </>
            )}
            {resourceType === 'skill' && (
              <>
                <NoticeCard isDark={isDark} title="Skill 固定为 Context 能力">
                  <p>Skill 对外通过目录 resolve 消费，不走普通 invoke 注册心智。</p>
                  <p>首屏只保留正文和结构化参数编辑器；绑定 MCP 是注册成功后的增强步骤。</p>
                </NoticeCard>

                <SectionCard
                  theme={theme}
                  isDark={isDark}
                  title="上下文正文"
                  description="这里填写 Context Skill 的规范 Markdown、角色说明和调用约束。"
                >
                  <Field label="规范 Markdown / 上下文正文 *" full theme={theme} error={fieldErrors.contextPrompt} fieldId={rrFieldId('contextPrompt')}>
                    <AutoHeightTextarea
                      id={rrFieldId('contextPrompt')}
                      value={form.contextPrompt}
                      onChange={(e) => setForm((p) => ({ ...p, contextPrompt: e.target.value }))}
                      minRows={8}
                      maxRows={28}
                      className={`${inputClass(isDark, !!fieldErrors.contextPrompt)} resize-none`}
                      aria-invalid={!!fieldErrors.contextPrompt}
                      aria-describedby={fieldErrors.contextPrompt ? `${rrFieldId('contextPrompt')}-err` : undefined}
                      placeholder={'# 角色\n你是一名...\n\n# 输出约束\n...'}
                    />
                  </Field>
                </SectionCard>

                <SectionCard
                  theme={theme}
                  isDark={isDark}
                  title="结构化参数编辑器"
                  description="用字段列表生成 parametersSchema。普通注册流程不再要求你直接手写 JSON。"
                >
                  {skillParamFields.length === 0 ? (
                    <div className={`rounded-xl border border-dashed px-4 py-4 text-sm ${isDark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                      当前还没有参数字段。你可以直接注册一个“纯正文” Skill，也可以先添加字段描述输入要求。
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    {skillParamFields.map((field, index) => (
                      <div key={field.id} className={`rounded-xl border p-3 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className={`text-sm font-medium ${textPrimary(theme)}`}>参数 {index + 1}</div>
                          <button type="button" className={btnSecondary(theme)} onClick={() => removeSkillParam(field.id)}>
                            删除字段
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <Field label="参数 key *" theme={theme}>
                            <input
                              value={field.key}
                              onChange={(e) => updateSkillParam(field.id, { key: e.target.value })}
                              className={inputClass(isDark)}
                              placeholder="city"
                            />
                          </Field>
                          <Field label="显示名称" theme={theme}>
                            <input
                              value={field.label}
                              onChange={(e) => updateSkillParam(field.id, { label: e.target.value })}
                              className={inputClass(isDark)}
                              placeholder="城市"
                            />
                          </Field>
                          <Field label="类型" theme={theme}>
                            <ThemedSelect
                              isDark={isDark}
                              value={field.type}
                              onChange={(value) => updateSkillParam(field.id, { type: value as StructuredParamField['type'] })}
                              options={[
                                { value: 'string', label: '字符串' },
                                { value: 'integer', label: '整数' },
                                { value: 'number', label: '数字' },
                                { value: 'boolean', label: '布尔值' },
                              ]}
                            />
                          </Field>
                          <Field label="默认值" theme={theme}>
                            {field.type === 'boolean' ? (
                              <ThemedSelect
                                isDark={isDark}
                                value={String(Boolean(field.defaultValue))}
                                onChange={(value) => updateSkillParam(field.id, { defaultValue: value === 'true' })}
                                options={[
                                  { value: 'false', label: 'false' },
                                  { value: 'true', label: 'true' },
                                ]}
                              />
                            ) : (
                              <input
                                value={String(field.defaultValue ?? '')}
                                onChange={(e) =>
                                  updateSkillParam(field.id, {
                                    defaultValue:
                                      field.type === 'integer' || field.type === 'number'
                                        ? e.target.value === ''
                                          ? ''
                                          : Number(e.target.value)
                                        : e.target.value,
                                  })
                                }
                                className={inputClass(isDark)}
                                placeholder={field.type === 'integer' || field.type === 'number' ? '10' : '默认值'}
                              />
                            )}
                          </Field>
                          <Field label="说明" full theme={theme}>
                            <input
                              value={field.description ?? ''}
                              onChange={(e) => updateSkillParam(field.id, { description: e.target.value })}
                              className={inputClass(isDark)}
                              placeholder="告诉使用者这个参数是做什么的"
                            />
                          </Field>
                        </div>
                        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateSkillParam(field.id, { required: e.target.checked })}
                            className={lantuCheckboxPrimaryClass}
                          />
                          <span className={textMuted(theme)}>必填参数</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={addSkillParam}>
                      新增参数字段
                    </button>
                  </div>
                </SectionCard>

                {resourceId ? (
                  <SectionCard
                    theme={theme}
                    isDark={isDark}
                    title="后置增强：绑定 MCP"
                    description="Skill 注册成功后，再补充绑定的 MCP 工具来源。"
                  >
                    <OrderedRelatedResourcePicker
                      theme={theme}
                      isDark={isDark}
                      fieldId={rrFieldId('relatedMcpResourceIds')}
                      value={form.relatedMcpResourceIds}
                      onChangeValue={(next) => setForm((p) => ({ ...p, relatedMcpResourceIds: next }))}
                      poolItems={mcpBindPickPool}
                      loading={relationPicklistLoading}
                      loadError={relationPicklistError}
                      errorStyle={!!fieldErrors.relatedMcpResourceIds}
                      aria-describedby={fieldErrors.relatedMcpResourceIds ? `${rrFieldId('relatedMcpResourceIds')}-err` : undefined}
                      orphanHint="不在当前可选列表；可移除或保留"
                    />
                  </SectionCard>
                ) : (
                  <NoticeCard isDark={isDark} title="MCP 绑定在注册成功后开启">
                    <p>先保存 Skill。进入编辑态后，再把相关 MCP 工具绑定进来。</p>
                  </NoticeCard>
                )}

                <SectionCard
                  theme={theme}
                  isDark={isDark}
                  title="高级配置"
                  description="给专家用户保留原始 JSON 入口；普通用户不用先理解这层。"
                >
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium ${
                      isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                    onClick={() => setSkillAdvancedOpen((open) => !open)}
                  >
                    <span>查看 Spec / Parameters Schema JSON</span>
                    <ChevronDown size={16} className={skillAdvancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  {skillAdvancedOpen ? (
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="Spec JSON" full theme={theme} error={fieldErrors.specJson} fieldId={rrFieldId('specJson')}>
                        <AutoHeightTextarea
                          id={rrFieldId('specJson')}
                          value={form.specJson}
                          onChange={(e) => setForm((p) => ({ ...p, specJson: e.target.value }))}
                          minRows={4}
                          maxRows={18}
                          className={`${inputClass(isDark, !!fieldErrors.specJson)} font-mono text-xs resize-none`}
                          aria-invalid={!!fieldErrors.specJson}
                          aria-describedby={fieldErrors.specJson ? `${rrFieldId('specJson')}-err` : undefined}
                          placeholder={DEFAULT_SKILL_SPEC_JSON}
                        />
                      </Field>
                      <Field label="Parameters Schema JSON" full theme={theme} error={fieldErrors.paramsSchemaJson} fieldId={rrFieldId('paramsSchemaJson')}>
                        <AutoHeightTextarea
                          id={rrFieldId('paramsSchemaJson')}
                          value={form.paramsSchemaJson}
                          onChange={(e) => setForm((p) => ({ ...p, paramsSchemaJson: e.target.value }))}
                          minRows={6}
                          maxRows={24}
                          className={`${inputClass(isDark, !!fieldErrors.paramsSchemaJson)} font-mono text-xs resize-none`}
                          aria-invalid={!!fieldErrors.paramsSchemaJson}
                          aria-describedby={fieldErrors.paramsSchemaJson ? `${rrFieldId('paramsSchemaJson')}-err` : undefined}
                        />
                      </Field>
                    </div>
                  ) : null}
                </SectionCard>
              </>
            )}
            {effectiveResourceType === 'app' && (
              <>
                {resourceType === 'agent' ? (
                  <NoticeCard isDark={isDark} title="页面型 Agent 面向门户交付">
                    <p>这类 Agent 的核心是页面地址、打开方式和展示素材，不需要模型协议、上游推理地址或 Agent Key。</p>
                    <p>如果它依赖别的资源，可以在关联资源中补充依赖，方便后续治理和展示。</p>
                  </NoticeCard>
                ) : null}
                <Field label="应用地址 *" theme={theme} error={fieldErrors.appUrl} fieldId={rrFieldId('appUrl')}>
                  <input
                    id={rrFieldId('appUrl')}
                    value={form.appUrl}
                    onChange={(e) => setForm((p) => ({ ...p, appUrl: e.target.value }))}
                    className={inputClass(isDark, !!fieldErrors.appUrl)}
                    aria-invalid={!!fieldErrors.appUrl}
                    aria-describedby={fieldErrors.appUrl ? `${rrFieldId('appUrl')}-err` : undefined}
                    placeholder="https://example.com/app"
                  />
                </Field>
                <Field label="打开方式" theme={theme} error={fieldErrors.embedType}>
                  <ThemedSelect
                    isDark={isDark}
                    value={form.embedType}
                    onChange={(value) => setForm((p) => ({ ...p, embedType: value }))}
                    options={[
                      { value: 'iframe', label: 'iframe 内嵌' },
                      { value: 'redirect', label: 'redirect 跳转' },
                      { value: 'micro_frontend', label: '微前端' },
                    ]}
                  />
                </Field>
                <Field label="图标 URL（选填）" theme={theme} error={fieldErrors.appIcon} fieldId={rrFieldId('appIcon')}>
                  <input
                    id={rrFieldId('appIcon')}
                    value={form.appIcon}
                    onChange={(e) => setForm((p) => ({ ...p, appIcon: e.target.value }))}
                    className={inputClass(isDark, !!fieldErrors.appIcon)}
                    aria-invalid={!!fieldErrors.appIcon}
                    aria-describedby={fieldErrors.appIcon ? `${rrFieldId('appIcon')}-err` : undefined}
                    placeholder="https://example.com/icon.png"
                  />
                </Field>
                <Field label="截图 URL（选填，每行一条）" full theme={theme}>
                  <AutoHeightTextarea
                    value={form.appScreenshotsText}
                    onChange={(e) => setForm((p) => ({ ...p, appScreenshotsText: e.target.value }))}
                    minRows={4}
                    maxRows={18}
                    className={`${inputClass(isDark)} font-mono text-xs resize-none`}
                  />
                </Field>
                <Field label="关联资源 ID（选填）" theme={theme} error={fieldErrors.relatedResourceIds} fieldId={rrFieldId('relatedResourceIds')}>
                  <input
                    id={rrFieldId('relatedResourceIds')}
                    value={form.relatedResourceIds}
                    onChange={(e) => setForm((p) => ({ ...p, relatedResourceIds: e.target.value }))}
                    className={inputClass(isDark, !!fieldErrors.relatedResourceIds)}
                    aria-invalid={!!fieldErrors.relatedResourceIds}
                    aria-describedby={fieldErrors.relatedResourceIds ? `${rrFieldId('relatedResourceIds')}-err` : undefined}
                    placeholder="例如 12, 34"
                  />
                </Field>
              </>
            )}

            {resourceType === 'dataset' && (
              <>
                <Field label="数据类型 *" theme={theme} error={fieldErrors.dataType}>
                  <ThemedSelect
                    isDark={isDark}
                    value={form.dataType}
                    onChange={(value) => setForm((p) => ({ ...p, dataType: value }))}
                    options={DATASET_DATA_TYPE_OPTIONS}
                  />
                </Field>
                <Field label="数据格式 *" theme={theme} error={fieldErrors.format}>
                  <ThemedSelect
                    isDark={isDark}
                    value={form.format}
                    onChange={(value) => setForm((p) => ({ ...p, format: value }))}
                    options={DATASET_FORMAT_OPTIONS}
                  />
                </Field>
                <Field label="记录数（约）" theme={theme} error={fieldErrors.recordCount} fieldId={rrFieldId('recordCount')}>
                  <div id={rrFieldId('recordCount')}>
                    <PresetOrCustomNumberField
                      theme={theme}
                      value={form.recordCount}
                      onChange={(n) => setForm((p) => ({ ...p, recordCount: n }))}
                      presets={DATASET_RECORD_COUNT.presets}
                      customMin={DATASET_RECORD_COUNT.customMin}
                      customMax={DATASET_RECORD_COUNT.customMax}
                      customSeed={DATASET_RECORD_COUNT.customSeed}
                      inputClassName={inputClass(isDark, !!fieldErrors.recordCount)}
                      ariaLabel="数据集记录数约值"
                    />
                  </div>
                </Field>
                <Field label="体积（字节）" theme={theme} error={fieldErrors.fileSize} fieldId={rrFieldId('fileSize')}>
                  <div id={rrFieldId('fileSize')}>
                    <PresetOrCustomNumberField
                      theme={theme}
                      value={form.fileSize}
                      onChange={(n) => setForm((p) => ({ ...p, fileSize: n }))}
                      presets={DATASET_FILE_SIZE_BYTES.presets}
                      customMin={DATASET_FILE_SIZE_BYTES.customMin}
                      customMax={DATASET_FILE_SIZE_BYTES.customMax}
                      customSeed={DATASET_FILE_SIZE_BYTES.customSeed}
                      inputClassName={inputClass(isDark, !!fieldErrors.fileSize)}
                      ariaLabel="数据集体积字节数"
                    />
                  </div>
                </Field>
                <Field label="标签（选填，逗号分隔）" full theme={theme}>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder="例如 教务, 公开数据"
                  />
                </Field>
              </>
            )}
          </div>
        </div>
      </div>
    </MgmtPageShell>
  );
};

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  full?: boolean;
  theme: Theme;
  error?: string;
  fieldId?: string;
}> = ({ label, children, full, theme, error, fieldId }) => {
  const errId = fieldId ? `${fieldId}-err` : undefined;
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label htmlFor={fieldId} className={`mb-1 block ${labelBase(theme)}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={errId} className={`mt-1 ${fieldErrorText()}`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

interface SelectOption {
  value: string;
  label: string;
}

const ThemedSelect: React.FC<{
  isDark: boolean;
  value: string;
  onChange: (nextValue: string) => void;
  options: SelectOption[];
  disabled?: boolean;
}> = ({ isDark, value, onChange, options, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`${inputClass(isDark)} flex items-center justify-between text-left ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown size={16} className={`${isDark ? 'text-slate-400' : 'text-slate-500'} transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border py-1 shadow-lg ${
            isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'
          }`}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`w-full px-3 py-2 text-left text-sm ${
                  active
                    ? isDark
                      ? 'bg-white/10 text-slate-100'
                      : 'bg-slate-100 text-slate-900'
                    : isDark
                      ? 'text-slate-300 hover:bg-white/5'
                      : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

function inputClass(isDark: boolean, invalid?: boolean): string {
  const base = `w-full rounded-xl border px-3 py-2 text-sm outline-none ${
    isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
  }`;
  return invalid ? `${base} ${inputBaseError()}` : base;
}

function btnGhostStyle(theme: Theme): string {
  return `${btnSecondary(theme)} gap-1`;
}
