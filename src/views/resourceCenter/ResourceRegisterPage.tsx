import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

const DEFAULT_MCP_AUTH_CONFIG_JSON = '{\n  "method": "tools/call"\n}';
type McpRegisterMode = 'http_json' | 'http_sse' | 'websocket' | 'stdio_sidecar';
const DEFAULT_AGENT_SPEC_JSON = '{\n  "url": "http://localhost:8000/agent/invoke",\n  "timeout": 30\n}';
const DEFAULT_SKILL_SPEC_JSON = '{}';
const DEFAULT_SKILL_PARAMS_SCHEMA_JSON = '{\n  "type": "object",\n  "properties": {\n    "city": { "type": "string" }\n  },\n  "required": ["city"]\n}';

const TYPE_GUIDE_ONE_LINE: Record<ResourceType, string> = {
  agent: '填写基础信息与运行地址后即可保存。',
  skill: '填写规范 Markdown（context）与可选参数 Schema；可绑定已发布的 MCP。技能仅通过目录/resolve 消费，不可 invoke。',
  mcp: '填写接入地址与鉴权即可。',
  app: '填写可访问 URL 与打开方式。',
  dataset: '填写类型与格式等元数据。',
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
const AGENT_TYPE_OPTIONS = [
  { value: 'http_api', label: 'HTTP API' },
  { value: 'mcp', label: 'MCP' },
  { value: 'builtin', label: '内置' },
];
const AGENT_MODE_OPTIONS = [
  { value: 'SUBAGENT', label: 'SUBAGENT' },
  { value: 'ALL', label: 'ALL' },
  { value: 'TOOL', label: 'TOOL' },
];
const AGENT_REG_PROTOCOL_OPTIONS = [
  { value: 'openai_compatible', label: 'OpenAI Compatible' },
  { value: 'bailian_compatible', label: '百炼 Compatible' },
  { value: 'anthropic_messages', label: 'Anthropic Messages' },
  { value: 'gemini_generatecontent', label: 'Gemini generateContent' },
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

function inferMcpTransport(endpoint: string, authConfig?: Record<string, unknown>): 'http' | 'websocket' | 'stdio' {
  const transport = typeof authConfig?.transport === 'string' ? authConfig.transport.toLowerCase() : '';
  if (transport === 'stdio') return 'stdio';
  if (transport === 'websocket') return 'websocket';
  const ep = endpoint.trim().toLowerCase();
  if (ep.startsWith('ws://') || ep.startsWith('wss://')) return 'websocket';
  return 'http';
}

function modeToTransport(mode: McpRegisterMode): 'http' | 'websocket' | 'stdio' {
  if (mode === 'websocket') return 'websocket';
  if (mode === 'stdio_sidecar') return 'stdio';
  return 'http';
}

function registerModeFromTransport(tr: 'http' | 'websocket' | 'stdio', prevMode: McpRegisterMode): McpRegisterMode {
  if (tr === 'websocket') return 'websocket';
  if (tr === 'stdio') return 'stdio_sidecar';
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

/** 创建：仅有值时带回；更新：与加载快照一致则省略（后端 null=不修改），否则带回列表（含 [] 表示清空） */
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

type ResourceRegisterFieldKey =
  | 'resourceCode'
  | 'displayName'
  | 'endpoint'
  | 'protocol'
  | 'authConfigJson'
  | 'agentType'
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
  | 'skillType'
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
  'agentType',
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
  'skillType',
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
    agentType: string;
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
    skillType: string;
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
    e.resourceCode = '资源编码须为 3–64 位，仅支持字母、数字、下划线和短横线';
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
          e.endpoint = '选择 WebSocket 传输时，服务地址须为 ws:// 或 wss:// URL';
        }
      } else if (activeTransport === 'stdio') {
        if (!isValidUrl(form.endpoint.trim())) {
          e.endpoint = 'stdio 边车须将本机 HTTP 转发地址填入服务地址，且须为 http:// 或 https:// URL';
        }
      } else if (!isValidUrl(form.endpoint.trim())) {
        e.endpoint = '选择 HTTP / SSE 时，服务地址须为 http:// 或 https:// URL';
      }
    }
    if (form.protocol.trim() && form.protocol.trim().toLowerCase() !== 'mcp') {
      e.protocol = 'MCP 资源 protocol 建议固定为 mcp';
    }
    const authParsed = parseJsonObject(form.authConfigJson, '鉴权 JSON 配置');
    if (form.authConfigJson.trim() && !authParsed.ok) {
      e.authConfigJson = authParsed.message;
    }
    if (form.authType === 'oauth2_client') {
      if (!authParsed.ok || !authParsed.data) {
        e.authConfigJson = e.authConfigJson ?? 'OAuth2 须填写合法的鉴权 JSON';
      } else {
        const d = authParsed.data;
        const tokenUrl = String(d.tokenUrl ?? d.token_url ?? '').trim();
        const clientId = String(d.clientId ?? d.client_id ?? '').trim();
        const secret = String(d.clientSecret ?? d.client_secret ?? '').trim();
        const secretRef = String(d.clientSecretRef ?? '').trim();
        if (!tokenUrl) e.authConfigJson = e.authConfigJson ?? 'OAuth2 须在 JSON 中填写 tokenUrl';
        if (!clientId) e.authConfigJson = e.authConfigJson ?? 'OAuth2 须在 JSON 中填写 clientId';
        if (!secret && !secretRef) e.authConfigJson = e.authConfigJson ?? 'OAuth2 须填写 clientSecret 或 clientSecretRef';
      }
    }
    if (form.authType === 'basic') {
      if (!authParsed.ok || !authParsed.data) {
        e.authConfigJson = e.authConfigJson ?? 'Basic 须填写合法的鉴权 JSON';
      } else {
        const d = authParsed.data;
        const u = String(d.username ?? '').trim();
        const password = String(d.password ?? '').trim();
        const passwordRef = String(d.passwordSecretRef ?? '').trim();
        if (!u) e.authConfigJson = e.authConfigJson ?? 'Basic 须在 JSON 中填写 username';
        if (!password && !passwordRef) e.authConfigJson = e.authConfigJson ?? 'Basic 须填写 password 或 passwordSecretRef';
      }
    }
  }

  if (resourceType === 'agent') {
    if (!form.agentType.trim()) {
      e.agentType = '请填写智能体类型';
    }
    if (!form.registrationProtocol.trim()) {
      e.registrationProtocol = '请选择注册协议';
    }
    if (!form.upstreamEndpoint.trim()) {
      e.upstreamEndpoint = '请填写上游 endpoint';
    } else if (!isValidUrl(form.upstreamEndpoint.trim())) {
      e.upstreamEndpoint = '上游 endpoint 必须是 http:// 或 https:// URL';
    }
    if (!form.modelAlias.trim()) {
      e.modelAlias = '请填写对外 modelAlias';
    }
    if (form.specJson.trim()) {
      const specParsed = parseJsonObject(form.specJson, '规格 JSON');
      if (!specParsed.ok) {
        e.specJson = specParsed.message;
      }
    }
    const mcpRel = parseRelatedIds(form.relatedMcpResourceIds);
    if (mcpRel.invalidTokens.length > 0) {
      e.relatedMcpResourceIds = `绑定的 MCP ID 仅支持正整数（逗号分隔），非法值：${mcpRel.invalidTokens.join(', ')}`;
    }
    if (!Number.isFinite(Number(form.maxConcurrency)) || Number(form.maxConcurrency) < 1 || Number(form.maxConcurrency) > 1000) {
      e.maxConcurrency = '最大并发须在 1~1000 之间';
    }
    if (form.agentMaxSteps.trim()) {
      const n = Number(form.agentMaxSteps.trim());
      if (!Number.isInteger(n) || n < 1) {
        e.agentMaxSteps = '最大步数须为正整数或留空';
      }
    }
    if (form.agentTemperature.trim()) {
      const t = Number(form.agentTemperature.trim());
      if (!Number.isFinite(t)) {
        e.agentTemperature = '采样温度须为有效数字或留空';
      }
    }
  }

  if (resourceType === 'skill') {
    if (!form.contextPrompt.trim()) {
      e.contextPrompt = '请填写规范 Markdown（context）';
    }
    const st = form.skillType.trim().toLowerCase();
    if (st && st !== 'context_v1') {
      e.skillType = '技能类型须为 context_v1';
    }
    const skillMcpRel = parseRelatedIds(form.relatedMcpResourceIds);
    if (skillMcpRel.invalidTokens.length > 0) {
      e.relatedMcpResourceIds = `绑定的 MCP ID 仅支持正整数（逗号分隔），非法值：${skillMcpRel.invalidTokens.join(', ')}`;
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
      e.appUrl = '应用地址须为有效的 http/https URL';
    }
    if (!form.embedType.trim()) {
      e.embedType = '请选择嵌入方式';
    } else {
      const appEt = form.embedType.trim().toLowerCase();
      if (!['iframe', 'redirect', 'micro_frontend'].includes(appEt)) {
        e.embedType = '嵌入方式须为 iframe、redirect 或 micro_frontend（与后端一致）';
      }
    }
    if (form.appIcon.trim() && !isValidUrl(form.appIcon.trim())) {
      e.appIcon = '图标 URL 须为有效的 http/https URL';
    }
    const related = parseRelatedIds(form.relatedResourceIds);
    if (related.invalidTokens.length > 0) {
      e.relatedResourceIds = `关联资源 ID 仅支持正整数（逗号分隔），非法值：${related.invalidTokens.join(', ')}`;
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
    e.endpoint = '请填写服务地址后再探测';
  } else {
    const activeTransport = modeToTransport(form.mcpRegisterMode);
    if (activeTransport === 'websocket') {
      if (!isValidWsUrl(form.endpoint.trim())) {
        e.endpoint = 'WebSocket 探测需要 ws:// 或 wss:// URL';
      }
    } else if (activeTransport === 'stdio') {
      if (!isValidUrl(form.endpoint.trim())) {
        e.endpoint = 'stdio 边车须为 http:// 或 https:// URL';
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
      e.authConfigJson = e.authConfigJson ?? 'OAuth2 须填写合法的鉴权 JSON';
    } else {
      const d = authParsed.data;
      const tokenUrl = String(d.tokenUrl ?? d.token_url ?? '').trim();
      const clientId = String(d.clientId ?? d.client_id ?? '').trim();
      const secret = String(d.clientSecret ?? d.client_secret ?? '').trim();
      const secretRef = String(d.clientSecretRef ?? '').trim();
      if (!tokenUrl) e.authConfigJson = e.authConfigJson ?? 'OAuth2 须在 JSON 中填写 tokenUrl';
      if (!clientId) e.authConfigJson = e.authConfigJson ?? 'OAuth2 须在 JSON 中填写 clientId';
      if (!secret && !secretRef) e.authConfigJson = e.authConfigJson ?? 'OAuth2 须填写 clientSecret 或 clientSecretRef';
    }
  }
  if (form.authType === 'basic') {
    if (!authParsed.ok || !authParsed.data) {
      e.authConfigJson = e.authConfigJson ?? 'Basic 须填写合法的鉴权 JSON';
    } else {
      const d = authParsed.data;
      const u = String(d.username ?? '').trim();
      const password = String(d.password ?? '').trim();
      const passwordRef = String(d.passwordSecretRef ?? '').trim();
      if (!u) e.authConfigJson = e.authConfigJson ?? 'Basic 须在 JSON 中填写 username';
      if (!password && !passwordRef) e.authConfigJson = e.authConfigJson ?? 'Basic 须填写 password 或 passwordSecretRef';
    }
  }
  return e;
}

/** 保持用户在表单中的顺序，并去掉重复 token（仅合法正整数） */
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
  if (code) return `${name}（${code} · #${item.id}）`;
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
          <Loader2 className="animate-spin" size={14} /> 加载我的资源…
        </div>
      ) : null}
      <div className={orderedPickerPanelClass(isDark, errorStyle)}>
        <p className={`mb-2 px-1 text-xs font-medium ${textMuted(theme)}`}>已选顺序（先 → 后）</p>
        {selectedIds.length === 0 ? (
          <p className={`px-2 py-1 text-xs ${textMuted(theme)}`}>未选择</p>
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
        <p className={`mb-2 px-1 text-xs font-medium ${textMuted(theme)}`}>候选（勾选加入队尾）</p>
        {poolAvailable.length === 0 ? (
          <p className={`px-2 py-1 text-xs ${textMuted(theme)}`}>
            {poolItems.length === 0 && !loading && !loadError ? '当前没有可绑定的资源' : '暂无更多候选'}
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
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [tagOptions, setTagOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: '不选' }]);
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [mcpProbeExtra, setMcpProbeExtra] = useState<Partial<Record<'endpoint' | 'authConfigJson', string>>>({});
  const [agentAdvancedOpen, setAgentAdvancedOpen] = useState(false);
  const [form, setForm] = useState({
    resourceCode: '',
    displayName: '',
    description: '',
    sourceType: 'internal',
    providerId: '',
    catalogTagId: '',
    endpoint: '',
    mcpRegisterMode: 'http_json' as McpRegisterMode,
    mcpTransport: 'http' as 'http' | 'websocket' | 'stdio',
    protocol: 'mcp',
    authType: 'none',
    authConfigJson: DEFAULT_MCP_AUTH_CONFIG_JSON,
    appUrl: '',
    embedType: 'iframe',
    appIcon: '',
    appScreenshotsText: '',
    dataType: 'structured',
    format: 'json',
    recordCount: 0,
    fileSize: 0,
    tags: '',
    skillType: 'context_v1',
    mode: resourceType === 'agent' ? 'SUBAGENT' : 'TOOL',
    agentType: 'http_api',
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
  /** 已发布资源双轨编辑：用于提示线上版本 vs 草稿 */
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
    }
  }, [resourceId]);

  useEffect(() => {
    if (!resourceId) return;
    let cancelled = false;
    setLoading(true);
    resourceCenterService.getById(resourceId)
      .then((item) => {
        if (cancelled) return;
        if (item.sourceType && item.sourceType !== 'internal') setAdvancedOpen(true);
        if (
          resourceType === 'agent' &&
          (item.hidden === true || item.maxSteps != null || item.temperature != null)
        ) {
          setAgentAdvancedOpen(true);
        }
        bindingSnapshotRef.current = {
          relatedMcpResourceIds:
            resourceType === 'agent' || resourceType === 'skill'
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
          providerId: item.providerId ?? '',
          catalogTagId: item.tagIds?.length ? String(item.tagIds[0]) : '',
          endpoint: item.endpoint || '',
          mcpRegisterMode:
            resourceType === 'mcp'
              ? (() => {
                  const tr = inferMcpTransport(
                    item.endpoint || '',
                    item.authConfig && typeof item.authConfig === 'object' && !Array.isArray(item.authConfig)
                      ? (item.authConfig as Record<string, unknown>)
                      : undefined,
                  );
                  if (tr === 'websocket') return 'websocket';
                  if (tr === 'stdio') return 'stdio_sidecar';
                  return 'http_json';
                })()
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
          ...(resourceType === 'mcp'
            ? {
                authType: item.authType || 'none',
                authConfigJson:
                  item.authConfig && typeof item.authConfig === 'object'
                    ? JSON.stringify(item.authConfig, null, 2)
                    : DEFAULT_MCP_AUTH_CONFIG_JSON,
              }
            : {}),
          ...(resourceType === 'app'
            ? {
                appUrl: item.appUrl || '',
                embedType: item.embedType || 'iframe',
                appIcon: item.icon || '',
                appScreenshotsText:
                  Array.isArray(item.screenshots) && item.screenshots.length > 0 ? item.screenshots.join('\n') : '',
              }
            : {}),
          ...(resourceType === 'dataset'
            ? {
                dataType: item.dataType || 'structured',
                format: item.format || 'json',
                recordCount: Number(item.recordCount ?? 0) || 0,
                fileSize: Number(item.fileSize ?? 0) || 0,
                tags: Array.isArray(item.tags) ? item.tags.join(',') : '',
              }
            : {}),
          ...(resourceType === 'app'
            ? {
                relatedResourceIds: Array.isArray(item.relatedResourceIds) ? item.relatedResourceIds.join(', ') : '',
              }
            : {}),
          ...(resourceType === 'agent'
            ? {
                agentType: item.agentType || prev.agentType,
                mode: item.mode || prev.mode,
                registrationProtocol: item.registrationProtocol || prev.registrationProtocol,
                upstreamEndpoint: item.upstreamEndpoint || prev.upstreamEndpoint,
                upstreamAgentId: item.upstreamAgentId || '',
                credentialRef: item.credentialRef || '',
                transformProfile: item.transformProfile || '',
                modelAlias: item.modelAlias || prev.modelAlias || item.resourceCode || prev.resourceCode,
                agentEnabled: item.enabled ?? true,
                specJson:
                  item.spec && typeof item.spec === 'object'
                    ? JSON.stringify(item.spec, null, 2)
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
          ...(resourceType === 'skill'
            ? {
                skillType: item.skillType || 'context_v1',
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
      })
      .catch(() => {
        showMessage('加载资源详情失败，已进入空白表单', 'warning');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId, resourceType, showMessage]);

  const registerGuideLine = useMemo(
    () =>
      resourceType === 'skill'
        ? 'Context 技能：填写规范 Markdown 与参数 Schema；可选绑定已发布 MCP。对外仅通过目录/resolve 获取正文，不可 invoke。'
        : TYPE_GUIDE_ONE_LINE[resourceType],
    [resourceType],
  );

  const openAiBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/regis/openai/v1';
    return `${window.location.origin}/regis/openai/v1`;
  }, []);

  const fieldErrors = useMemo((): Partial<Record<ResourceRegisterFieldKey, string>> =>
    computeResourceRegisterFieldErrors(resourceType, form),
    [
      form.agentType,
      form.registrationProtocol,
      form.upstreamEndpoint,
      form.modelAlias,
      form.credentialRef,
      form.agentMaxSteps,
      form.agentTemperature,
      form.appIcon,
      form.appUrl,
      form.authConfigJson,
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
      form.skillType,
      form.specJson,
      form.relatedMcpResourceIds,
      form.contextPrompt,
      resourceType,
    ],
  );

  useEffect(() => {
    setMcpProbeExtra({});
  }, [form.endpoint, form.authConfigJson, form.authType, form.mcpRegisterMode]);

  useEffect(() => {
    if (resourceType !== 'agent' || !resourceId) {
      setAgentKeys([]);
      setLatestAgentSecret('');
      return;
    }
    void refreshAgentKeys();
  }, [resourceType, resourceId]);

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
        authConfigJson: r.authConfig ? JSON.stringify(r.authConfig, null, 2) : p.authConfigJson,
      }));
      showMessage(r.hint ? `${r.hint} 已尽量填入表单，请核对。` : '已从配置填充，请核对后保存。', r.hint ? 'warning' : 'success');
      return;
    }
    showMessage(r.hint ?? '未能解析', 'warning');
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
    showMessage(
      r.hint ? `${r.hint} 已尽量填入 Agent 字段，请核对后保存。` : '已从配置填充 Agent 字段，请核对后保存。',
      r.hint ? 'warning' : 'success',
    );
  };

  const copyText = async (text: string, successMessage: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      showMessage(successMessage, 'success');
    } catch {
      showMessage('复制失败，请手动复制', 'warning');
    }
  };

  const refreshAgentKeys = async () => {
    if (resourceType !== 'agent' || !resourceId) return;
    setAgentKeyLoading(true);
    try {
      const rows = await resourceCenterService.listAgentKeys(resourceId);
      setAgentKeys(rows);
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '加载 Agent Key 信息失败', 'error');
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
      showMessage('已轮换 nx-sk（明文仅展示本次）', 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '轮换失败', 'error');
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
      showMessage('已吊销 Agent 现有 Key', 'success');
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '吊销失败', 'error');
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
      const acTrim = form.authConfigJson.trim();
      let authConfig: Record<string, unknown> = {};
      if (acTrim) {
        const parsed = parseJsonObject(form.authConfigJson, '鉴权 JSON 配置');
        if (!parsed.ok || !parsed.data) {
          setMcpProbeExtra({ authConfigJson: parsed.message });
          return;
        }
        authConfig = { ...parsed.data };
      }
      const res = await resourceCenterService.probeMcpConnectivity({
        endpoint: form.endpoint.trim(),
        authType: form.authType || 'none',
        authConfig,
        transport: modeToTransport(form.mcpRegisterMode),
      });
      showMessage(res.message, res.ok ? 'success' : 'warning');
      if (res.bodyPreview) {
        console.info('[MCP 探测响应片段]', res.bodyPreview);
      }
    } catch (e) {
      showMessage(e instanceof Error ? e.message : '探测失败', 'error');
    } finally {
      setMcpProbeLoading(false);
    }
  };

  const buildPayload = (): ResourceUpsertRequest => {
    const providerIdRaw = resourceId ? (form.providerId.trim() || user?.id) : user?.id;
    const providerIdNum = Number(providerIdRaw);
    const tagIdPick = Number(form.catalogTagId.trim());
    const baseFields = {
      resourceCode: form.resourceCode.trim(),
      displayName: form.displayName.trim(),
      description: form.description.trim() || undefined,
      sourceType: form.sourceType,
      accessPolicy: 'open_platform' as const,
      ...(Number.isFinite(providerIdNum) && providerIdNum > 0 ? { providerId: providerIdNum } : {}),
      ...(form.catalogTagId.trim() && Number.isFinite(tagIdPick) && tagIdPick > 0 ? { tagIds: [tagIdPick] } : {}),
    };
    if (resourceType === 'mcp') {
      const acTrim = form.authConfigJson.trim();
      let authConfig: Record<string, unknown> = {};
      if (acTrim) {
        const parsed = parseJsonObject(form.authConfigJson, '鉴权 JSON 配置');
        if (!parsed.ok) throw new Error(parsed.message);
        authConfig = parsed.data || {};
      }
      authConfig = { ...authConfig, transport: modeToTransport(form.mcpRegisterMode) };
      return {
        ...baseFields,
        resourceType: 'mcp',
        endpoint: form.endpoint.trim(),
        protocol: 'mcp',
        authType: form.authType || 'none',
        authConfig,
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
        skillType: form.skillType.trim().toLowerCase() === 'context_v1' ? form.skillType.trim() : 'context_v1',
        contextPrompt: form.contextPrompt.trim(),
        spec: Object.keys(specObj).length > 0 ? specObj : {},
        parametersSchema: parsedSchema.data || {},
        isPublic: true,
        ...(skillMcpBind !== undefined ? { relatedMcpResourceIds: skillMcpBind } : {}),
      };
    }
    if (resourceType === 'agent') {
      const parsedSpec = parseJsonObject(form.specJson, '规格配置（spec JSON）');
      if (!parsedSpec.ok) throw new Error(parsedSpec.message);
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
        agentType: form.agentType.trim(),
        mode: form.mode,
        spec: parsedSpec.data || {},
        registrationProtocol: form.registrationProtocol as
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
    if (resourceType === 'app') {
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
      showMessage('请先登录后再注册资源', 'error');
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
        showMessage(lastItem.statusHint || (lastItem.status === 'published' ? '已处理提交（详见提示）' : '保存并提审成功'), 'success');
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
            ? '草稿已保存：线上默认解析版本尚未合并，请稍后「保存并提审」。'
            : '保存成功',
          'success',
        );
      }
      onBack();
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '保存失败', 'error');
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
              <span className="font-medium">双轨编辑：</span>线上默认解析版本为{' '}
              <span className="font-mono">{loadedResourceMeta.currentVersion ?? '—'}</span>。本页保存的是<strong>登记草稿</strong>
              ，不会立即改变网关对外的解析配置；完成后请使用「保存并提审」，审核通过后合并上线。
            </p>
            {loadedResourceMeta.pendingPublishedUpdate ? (
              <p className={`mt-1.5 ${isDark ? 'text-amber-100' : 'text-amber-900'}`}>
                当前有一条已发布变更正在审核；可先到资源列表撤回后再继续改草稿。
              </p>
            ) : null}
            {loadedResourceMeta.workingDraftAuditTier ? (
              <p className={`mt-1 text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                后端估算风险分级：{workingDraftAuditTierLabelZh(loadedResourceMeta.workingDraftAuditTier) || loadedResourceMeta.workingDraftAuditTier}
                （低风险且具备部门/平台管理员权限时可能免审直合）
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
                title="3–64 位，字母数字下划线或短横线"
                placeholder="唯一标识，如 weather-tool"
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
                placeholder="列表与详情中展示的名称"
              />
            </Field>
            <Field label="描述（选填）" full theme={theme}>
              <AutoHeightTextarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                minRows={3}
                maxRows={12}
                className={`${inputClass(isDark)} resize-none`}
                placeholder="用途与场景简述（选填）"
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
                    ? '支持 Markdown：能力说明、认证方式、配额与示例等；将在 MCP 市场详情页「服务详情」展示'
                    : resourceType === 'skill'
                      ? '支持 Markdown：技能能力、依赖、使用示例等；将在技能市场「技能介绍」Tab 展示'
                      : resourceType === 'dataset'
                        ? '支持 Markdown：数据来源、字段说明、使用限制等；将在数据集市场「数据集介绍」Tab 展示'
                        : resourceType === 'agent'
                          ? '支持 Markdown：适用场景、能力边界、调用说明等；将在智能体市场「智能体介绍」Tab 展示'
                          : '支持 Markdown：功能说明、嵌入方式、权限与示例等；将在应用集「应用介绍」Tab 展示'
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
                <div
                  className={`md:col-span-2 rounded-xl border px-3 py-3 text-xs leading-relaxed ${
                    isDark ? 'border-amber-500/30 bg-amber-500/5 text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950'
                  }`}
                >
                  <p className="font-medium">注册中心只做「登记目录」</p>
                  <p className={`mt-1 ${isDark ? 'text-amber-100/80' : 'text-amber-900/85'}`}>
                    MCP 进程须由您自行部署运维；本平台不代跑服务。请提供可从网络访问的 <strong>http(s)</strong> 或{' '}
                    <strong>ws(s)</strong> 地址。若仅有本机 command/stdio，需先在您侧用边车或隧道暴露为 URL 后再登记。
                  </p>
                  <p className={`mt-1.5 ${isDark ? 'text-amber-100/70' : 'text-amber-900/75'}`}>
                    「MCP over HTTP（JSON）」与「HTTP + SSE」在登记表单里都对应远程 HTTP；网关会按上游实际响应处理，请按服务商文档填写地址即可。
                  </p>
                </div>
                <Field label="粘贴配置导入" full theme={theme}>
                  <p className={`mb-2 text-xs ${textMuted(theme)}`}>
                    支持含 <span className="font-mono">mcpServers</span> 的 JSON（如 Claude/Cursor 导出），或单个含{' '}
                    <span className="font-mono">url</span> 的条目。仅解析远程 URL 类；stdio 会提示须自备边车。
                  </p>
                  <AutoHeightTextarea
                    value={mcpImportPaste}
                    onChange={(e) => setMcpImportPaste(e.target.value)}
                    minRows={4}
                    maxRows={22}
                    className={`${inputClass(isDark)} font-mono text-xs resize-none`}
                    placeholder={'支持直接粘贴 URL 或 JSON，例如：https://example.com/mcp 或 { "mcpServers": { "demo": { "url": "https://example.com/mcp" } } }'}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={handleMcpConfigImport}>
                      解析并填入表单
                    </button>
                  </div>
                </Field>
                <Field label="注册方式" theme={theme}>
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
                      { value: 'http_json', label: 'MCP over HTTP（JSON）' },
                      { value: 'http_sse', label: 'MCP over HTTP + SSE' },
                      { value: 'websocket', label: 'MCP over WebSocket' },
                      { value: 'stdio_sidecar', label: 'stdio 边车（HTTP 转发）' },
                    ]}
                  />
                </Field>
                <Field label="传输方式" theme={theme}>
                  <ThemedSelect
                    isDark={isDark}
                    value={modeToTransport(form.mcpRegisterMode)}
                    onChange={(value) => {
                      const v = value as 'http' | 'websocket' | 'stdio';
                      setForm((p) => ({
                        ...p,
                        mcpTransport: v,
                        mcpRegisterMode: registerModeFromTransport(v, p.mcpRegisterMode),
                      }));
                    }}
                    options={[
                      { value: 'http', label: 'HTTP / SSE' },
                      { value: 'websocket', label: 'WebSocket' },
                      { value: 'stdio', label: 'stdio 边车' },
                    ]}
                  />
                </Field>
                <Field label="服务地址 *" full theme={theme} error={mcpEndpointMerged} fieldId={rrFieldId('endpoint')}>
                  <input
                    id={rrFieldId('endpoint')}
                    value={form.endpoint}
                    onChange={(e) => setForm((p) => ({ ...p, endpoint: e.target.value }))}
                    className={inputClass(isDark, !!mcpEndpointMerged)}
                    aria-invalid={!!mcpEndpointMerged}
                    aria-describedby={mcpEndpointMerged ? `${rrFieldId('endpoint')}-err` : undefined}
                    placeholder={
                      modeToTransport(form.mcpRegisterMode) === 'websocket'
                        ? 'ws://localhost:5001/mcp'
                        : modeToTransport(form.mcpRegisterMode) === 'stdio'
                          ? 'https://127.0.0.1:9847/mcp 或内网边车地址'
                          : 'http://localhost:5000/mcp'
                    }
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
                      { value: 'none', label: '无鉴权' },
                      { value: 'api_key', label: 'API Key' },
                      { value: 'bearer', label: 'Bearer Token' },
                      { value: 'basic', label: 'HTTP Basic' },
                      { value: 'oauth2_client', label: 'OAuth2 Client Credentials' },
                    ]}
                  />
                </Field>
                <Field label="鉴权 JSON 配置" full theme={theme} error={mcpAuthJsonMerged} fieldId={rrFieldId('authConfigJson')}>
                  <p className={`mb-2 text-xs ${textMuted(theme)}`}>详见到接入指南；可点击下方模板快速填入。</p>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnSecondary(theme)}
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          authConfigJson:
                            modeToTransport(p.mcpRegisterMode) === 'websocket'
                              ? '{\n  "transport": "websocket",\n  "method": "tools/call"\n}'
                              : modeToTransport(p.mcpRegisterMode) === 'stdio'
                                ? '{\n  "method": "tools/call"\n}'
                                : '{\n  "method": "tools/call"\n}'
                        }))
                      }
                    >
                      一键填入推荐示例
                    </button>
                    <button
                      type="button"
                      className={btnSecondary(theme)}
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          authType: 'oauth2_client',
                          authConfigJson: `{\n  "method": "tools/call",\n  "tokenUrl": "https://id.example.com/oauth/token",\n  "clientId": "your-client-id",\n  "clientSecret": "your-secret",\n  "scope": "mcp.read"\n}`,
                        }))
                      }
                    >
                      OAuth2 模板
                    </button>
                    <button
                      type="button"
                      className={btnSecondary(theme)}
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          authType: 'basic',
                          authConfigJson: `{\n  "method": "tools/call",\n  "username": "user",\n  "password": "pass"\n}`,
                        }))
                      }
                    >
                      Basic 模板
                    </button>
                    <button
                      type="button"
                      className={btnSecondary(theme)}
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          authType: 'api_key',
                          authConfigJson: `{\n  "method": "tools/call",\n  "headerName": "X-Api-Key",\n  "apiKey": "sk_xxx"\n}`,
                        }))
                      }
                    >
                      Api Key 模板
                    </button>
                  </div>
                  <AutoHeightTextarea
                    id={rrFieldId('authConfigJson')}
                    value={form.authConfigJson}
                    onChange={(e) => setForm((p) => ({ ...p, authConfigJson: e.target.value }))}
                    minRows={5}
                    maxRows={30}
                    className={`${inputClass(isDark, !!mcpAuthJsonMerged)} font-mono text-xs resize-none`}
                    aria-invalid={!!mcpAuthJsonMerged}
                    aria-describedby={mcpAuthJsonMerged ? `${rrFieldId('authConfigJson')}-err` : undefined}
                    placeholder={DEFAULT_MCP_AUTH_CONFIG_JSON}
                  />
                </Field>
                <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={mcpProbeLoading}
                    onClick={() => void handleMcpConnectivityProbe()}
                  >
                    {mcpProbeLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} /> 探测中…
                      </span>
                    ) : (
                      '探测连通性'
                    )}
                  </button>
                  <span className={`text-xs ${textMuted(theme)}`}>
                    由平台代发一次 JSON-RPC initialize，不创建资源、不托管您的 MCP。
                  </span>
                </div>
              </>
            )}

            {resourceType === 'agent' && (
              <>
                <Field label="粘贴配置导入" full theme={theme}>
                  <p className={`mb-2 text-xs ${textMuted(theme)}`}>
                    支持直接粘贴 URL 或 JSON（OpenAI / 百炼 / Anthropic / Gemini），系统会自动识别并回填 Agent 字段。
                  </p>
                  <AutoHeightTextarea
                    value={agentImportPaste}
                    onChange={(e) => setAgentImportPaste(e.target.value)}
                    minRows={4}
                    maxRows={22}
                    className={`${inputClass(isDark)} font-mono text-xs resize-none`}
                    placeholder={
                      '支持 URL 或 JSON，例如：https://api.openai.com/v1/chat/completions 或 { "provider": "bailian", "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", "appId": "app-xxx", "apiKeyRef": "vault:agent/chef" }'
                    }
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={handleAgentConfigImport}>
                      解析并填充 Agent
                    </button>
                  </div>
                </Field>
                <Field label="智能体类型" theme={theme} error={fieldErrors.agentType}>
                  <ThemedSelect
                    isDark={isDark}
                    value={form.agentType}
                    onChange={(value) => setForm((p) => ({ ...p, agentType: value }))}
                    options={AGENT_TYPE_OPTIONS}
                  />
                </Field>
                <Field label="运行模式" theme={theme}>
                  <ThemedSelect
                    isDark={isDark}
                    value={form.mode}
                    onChange={(value) => setForm((p) => ({ ...p, mode: value }))}
                    options={AGENT_MODE_OPTIONS}
                  />
                </Field>
                <Field label="注册协议 *" theme={theme} error={fieldErrors.registrationProtocol}>
                  <ThemedSelect
                    isDark={isDark}
                    value={form.registrationProtocol}
                    onChange={(value) => setForm((p) => ({ ...p, registrationProtocol: value }))}
                    options={AGENT_REG_PROTOCOL_OPTIONS}
                  />
                </Field>
                <Field label="上游 Endpoint *" theme={theme} error={fieldErrors.upstreamEndpoint} fieldId={rrFieldId('upstreamEndpoint')}>
                  <input
                    id={rrFieldId('upstreamEndpoint')}
                    value={form.upstreamEndpoint}
                    onChange={(e) => setForm((p) => ({ ...p, upstreamEndpoint: e.target.value }))}
                    className={inputClass(isDark, !!fieldErrors.upstreamEndpoint)}
                    aria-invalid={!!fieldErrors.upstreamEndpoint}
                    aria-describedby={fieldErrors.upstreamEndpoint ? `${rrFieldId('upstreamEndpoint')}-err` : undefined}
                    placeholder="https://api.example.com/v1/chat/completions"
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
                    placeholder="chef_agent_01"
                  />
                </Field>
                <Field label="上游 Agent/App ID（选填）" theme={theme}>
                  <input
                    value={form.upstreamAgentId}
                    onChange={(e) => setForm((p) => ({ ...p, upstreamAgentId: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder="app-xxxx"
                  />
                </Field>
                <Field label="凭据引用（选填）" theme={theme} error={fieldErrors.credentialRef} fieldId={rrFieldId('credentialRef')}>
                  <input
                    id={rrFieldId('credentialRef')}
                    value={form.credentialRef}
                    onChange={(e) => setForm((p) => ({ ...p, credentialRef: e.target.value }))}
                    className={inputClass(isDark, !!fieldErrors.credentialRef)}
                    aria-invalid={!!fieldErrors.credentialRef}
                    aria-describedby={fieldErrors.credentialRef ? `${rrFieldId('credentialRef')}-err` : undefined}
                    placeholder="env:OPENAI_API_KEY / vault:agent/chef"
                  />
                </Field>
                <Field label="转换档案（选填）" theme={theme}>
                  <input
                    value={form.transformProfile}
                    onChange={(e) => setForm((p) => ({ ...p, transformProfile: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder="default"
                  />
                </Field>
                <Field label="启用状态" theme={theme}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.agentEnabled}
                      onChange={(e) => setForm((p) => ({ ...p, agentEnabled: e.target.checked }))}
                      className={lantuCheckboxPrimaryClass}
                    />
                    <span className={textMuted(theme)}>发布后可被 /openai/v1 发现与调用</span>
                  </label>
                </Field>
                {resourceId ? (
                  <div
                    className={`md:col-span-2 rounded-xl border px-3 py-3 text-xs ${
                      isDark ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100/90' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">对外接入信息（OpenAI 兼容）</p>
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
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div className={`rounded-lg border px-2 py-2 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-emerald-200/60 bg-white/80'}`}>
                        <div className={`mb-1 ${textMuted(theme)}`}>Base URL</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 break-all">{openAiBaseUrl}</code>
                          <button type="button" className={btnSecondary(theme)} onClick={() => void copyText(openAiBaseUrl, 'Base URL 已复制')}>
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                      <div className={`rounded-lg border px-2 py-2 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-emerald-200/60 bg-white/80'}`}>
                        <div className={`mb-1 ${textMuted(theme)}`}>Model Alias</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 break-all">{form.modelAlias || '（请先填写）'}</code>
                          <button
                            type="button"
                            className={btnSecondary(theme)}
                            onClick={() => void copyText(form.modelAlias || '', 'Model Alias 已复制')}
                            disabled={!form.modelAlias}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {latestAgentSecret ? (
                      <div className={`mt-2 rounded-lg border px-2 py-2 ${isDark ? 'border-amber-400/30 bg-amber-500/10' : 'border-amber-300 bg-amber-100/70'}`}>
                        <div className="mb-1 font-medium">新 nx-sk（仅本次展示）</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 break-all">{latestAgentSecret}</code>
                          <button type="button" className={btnSecondary(theme)} onClick={() => void copyText(latestAgentSecret, 'nx-sk 已复制')}>
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-2">
                      <div className={`mb-1 ${textMuted(theme)}`}>当前 Key 列表</div>
                      {agentKeys.length === 0 ? (
                        <p className={textMuted(theme)}>暂无可用 Key，点击「轮换 nx-sk」即可生成。</p>
                      ) : (
                        <div className="space-y-1">
                          {agentKeys.map((k) => (
                            <div key={k.id} className={`rounded-lg border px-2 py-1 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-emerald-200/60 bg-white/80'}`}>
                              <span className="font-mono">{k.maskedKey || `#${k.id}`}</span>
                              <span className={`ml-2 ${textMuted(theme)}`}>状态：{k.status || 'unknown'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
                <Field label="附加 Spec JSON（选填）" full theme={theme} error={fieldErrors.specJson} fieldId={rrFieldId('specJson')}>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={() => setForm((p) => ({ ...p, specJson: '{}' }))}>
                      置为 {}
                    </button>
                  </div>
                  <AutoHeightTextarea
                    id={rrFieldId('specJson')}
                    value={form.specJson}
                    onChange={(e) => setForm((p) => ({ ...p, specJson: e.target.value }))}
                    minRows={4}
                    maxRows={28}
                    className={`${inputClass(isDark, !!fieldErrors.specJson)} font-mono text-xs resize-none`}
                    aria-invalid={!!fieldErrors.specJson}
                    aria-describedby={fieldErrors.specJson ? `${rrFieldId('specJson')}-err` : undefined}
                    placeholder='{"timeout":30}'
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
                <Field label="系统提示词（选填）" full theme={theme}>
                  <AutoHeightTextarea
                    value={form.systemPrompt}
                    onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
                    minRows={3}
                    maxRows={20}
                    className={`${inputClass(isDark)} resize-none`}
                    placeholder="角色与回答约束（选填）"
                  />
                </Field>
                <Field
                  label="绑定的 MCP（选填）"
                  theme={theme}
                  error={fieldErrors.relatedMcpResourceIds}
                  fieldId={rrFieldId('relatedMcpResourceIds')}
                >
                  <p className={`mb-1 text-xs ${textMuted(theme)}`}>
                    agent_depends_mcp：仅可选择您名下「已发布 / 测试中」的 MCP 资源。更新时若集合与加载时一致（顺序无关）则不提交该字段。调用方仅 invoke 本 Agent 时，网关可将绑定 MCP 的工具聚合写入上游请求体{' '}
                    <span className="font-mono">_lantu.bindingExpansion</span>（须 Key 对各 MCP 具备 invoke）。
                  </p>
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
                    aria-describedby={
                      fieldErrors.relatedMcpResourceIds ? `${rrFieldId('relatedMcpResourceIds')}-err` : undefined
                    }
                    orphanHint="不在当前可选列表；可移除或保留"
                  />
                </Field>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium ${
                      isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                    onClick={() => setAgentAdvancedOpen((o) => !o)}
                  >
                    <span>高级：目录外隐藏、最大步数与采样温度（与后端一致）</span>
                    <ChevronDown size={16} className={agentAdvancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  {agentAdvancedOpen ? (
                    <div className="mt-2 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                      <Field label="目录外隐藏" theme={theme}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.agentHidden}
                            onChange={(e) => setForm((p) => ({ ...p, agentHidden: e.target.checked }))}
                            className={lantuCheckboxPrimaryClass}
                          />
                          <span className={textMuted(theme)}>与后端 hidden 一致</span>
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
                          placeholder="正整数，留空表示不限制"
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
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {resourceType === 'skill' && (
              <>
                <div className="md:col-span-2 space-y-3 rounded-xl border p-4 text-sm border-violet-500/25 bg-violet-500/[0.04]">
                  <p className={`text-xs leading-relaxed ${textMuted(theme)}`}>
                    技能为 <span className={textPrimary(theme)}>Context</span> 规范文档：通过目录与 resolve 拉取正文与绑定 MCP；不可通过{' '}
                    <span className="font-mono">POST /invoke</span> 执行。类型固定为{' '}
                    <code className="rounded bg-black/5 px-1 dark:bg-white/10">context_v1</code>。需要远程工具时请注册 MCP 并在下方可选绑定。
                  </p>
                    <Field label="规范 Markdown（context）*" full theme={theme} error={fieldErrors.contextPrompt} fieldId={rrFieldId('contextPrompt')}>
                      <AutoHeightTextarea
                        id={rrFieldId('contextPrompt')}
                        value={form.contextPrompt}
                        onChange={(e) => setForm((p) => ({ ...p, contextPrompt: e.target.value }))}
                        minRows={4}
                        maxRows={24}
                        className={`${inputClass(isDark, !!fieldErrors.contextPrompt)} resize-none`}
                        aria-invalid={!!fieldErrors.contextPrompt}
                        aria-describedby={
                          fieldErrors.contextPrompt ? `${rrFieldId('contextPrompt')}-err` : undefined
                        }
                        placeholder="角色、输出约束、调用约定等（Markdown）"
                      />
                    </Field>
                    <Field label="规格 JSON（选填）" full theme={theme} error={fieldErrors.specJson} fieldId={rrFieldId('specJson')}>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <button type="button" className={btnSecondary(theme)} onClick={() => setForm((p) => ({ ...p, specJson: DEFAULT_SKILL_SPEC_JSON }))}>
                          置为 {'{}'}
                        </button>
                      </div>
                      <AutoHeightTextarea
                        id={rrFieldId('specJson')}
                        value={form.specJson}
                        onChange={(e) => setForm((p) => ({ ...p, specJson: e.target.value }))}
                        minRows={3}
                        maxRows={28}
                        className={`${inputClass(isDark, !!fieldErrors.specJson)} font-mono text-xs resize-none`}
                        aria-invalid={!!fieldErrors.specJson}
                        aria-describedby={fieldErrors.specJson ? `${rrFieldId('specJson')}-err` : undefined}
                      />
                    </Field>
                    <Field label="参数 Schema JSON *" full theme={theme} error={fieldErrors.paramsSchemaJson} fieldId={rrFieldId('paramsSchemaJson')}>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={btnSecondary(theme)}
                          onClick={() => setForm((p) => ({ ...p, paramsSchemaJson: DEFAULT_SKILL_PARAMS_SCHEMA_JSON }))}
                        >
                          示例模板
                        </button>
                      </div>
                      <AutoHeightTextarea
                        id={rrFieldId('paramsSchemaJson')}
                        value={form.paramsSchemaJson}
                        onChange={(e) => setForm((p) => ({ ...p, paramsSchemaJson: e.target.value }))}
                        minRows={4}
                        maxRows={30}
                        className={`${inputClass(isDark, !!fieldErrors.paramsSchemaJson)} font-mono text-xs resize-none`}
                        aria-invalid={!!fieldErrors.paramsSchemaJson}
                        aria-describedby={fieldErrors.paramsSchemaJson ? `${rrFieldId('paramsSchemaJson')}-err` : undefined}
                      />
                    </Field>
                  </div>
                <Field
                  label="绑定的 MCP（选填）"
                  theme={theme}
                  error={fieldErrors.relatedMcpResourceIds}
                  fieldId={rrFieldId('relatedMcpResourceIds')}
                >
                  <p className={`mb-1 text-xs ${textMuted(theme)}`}>
                    skill_depends_mcp：仅可选择您名下「已发布 / 测试中」的 MCP。更新草稿时若集合与加载时一致（顺序无关）则不提交该字段。resolve 时会在返回的规范中列出绑定 MCP。
                  </p>
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
                    aria-describedby={
                      fieldErrors.relatedMcpResourceIds ? `${rrFieldId('relatedMcpResourceIds')}-err` : undefined
                    }
                    orphanHint="不在当前可选列表；可移除或保留"
                  />
                </Field>
              </>
            )}

            {resourceType === 'app' && (
              <>
                <Field label="应用地址 *" theme={theme} error={fieldErrors.appUrl} fieldId={rrFieldId('appUrl')}>
                  <input
                    id={rrFieldId('appUrl')}
                    value={form.appUrl}
                    onChange={(e) => setForm((p) => ({ ...p, appUrl: e.target.value }))}
                    className={inputClass(isDark, !!fieldErrors.appUrl)}
                    aria-invalid={!!fieldErrors.appUrl}
                    aria-describedby={fieldErrors.appUrl ? `${rrFieldId('appUrl')}-err` : undefined}
                    placeholder="https://…"
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
                    placeholder="https://…"
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
                    placeholder="如 12, 34"
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
                <Field label="体积（与后端一致的数值，见接入指南）" theme={theme} error={fieldErrors.fileSize} fieldId={rrFieldId('fileSize')}>
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
                      ariaLabel="数据集体积字节"
                    />
                  </div>
                </Field>
                <Field label="标签（选填，逗号分隔）" full theme={theme}>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder="如 教务, 公开数据"
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
