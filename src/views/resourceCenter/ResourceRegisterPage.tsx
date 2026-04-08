import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, Download, FileCheck, Link2, Loader2, Save, Send, Upload } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type { ResourceUpsertRequest } from '../../types/dto/resource-center';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { tagService } from '../../api/services/tag.service';
import { useAuthStore } from '../../stores/authStore';
import { LantuSelect } from '../../components/common/LantuSelect';
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
import { skillPackValidationLabelZh, workingDraftAuditTierLabelZh } from '../../utils/backendEnumLabels';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { parseMcpConfigPaste } from '../../utils/mcpConfigImport';
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

/** 上传/导入完成后通过 react-router state 传到带 id 的编辑页，避免 remount 瞬间表单尚未拉到制品字段时没有视觉上的一条「已上传」。 */
type SkillPackPreviewState = { fileName: string; size: number } | { importUrl: string };

type SkillPackEcho = { kind: 'file'; name: string; size: number } | { kind: 'url'; href: string };

function formatSkillPackBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function skillArtifactDisplayLabel(uri: string): string {
  const t = uri.trim();
  if (!t) return '';
  try {
    if (t.startsWith('http://') || t.startsWith('https://')) {
      const u = new URL(t);
      const seg = u.pathname.split('/').filter(Boolean).pop();
      return (seg || t).trim();
    }
  } catch {
    /* ignore */
  }
  const parts = t.replace(/\\/g, '/').split('/');
  return (parts.pop() || t).trim();
}

function truncateSkillArtifactPath(s: string, max: number): string {
  if (s.length <= max) return s;
  const k = max - 3;
  const a = Math.ceil(k / 2);
  const b = Math.floor(k / 2);
  return `${s.slice(0, a)}…${s.slice(s.length - b)}`;
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
  skill: '请先上传技能包（zip/tar.gz/单 Markdown 等）；清单与 SKILL.md 由平台校验。远程可调用工具请注册 MCP。',
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
  | 'specJson'
  | 'maxConcurrency'
  | 'relatedResourceIds'
  | 'relatedMcpResourceIds'
  | 'relatedPreSkillResourceIds'
  | 'agentMaxSteps'
  | 'agentTemperature'
  | 'skillRootPath'
  | 'skillType'
  | 'paramsSchemaJson'
  | 'manifestJson'
  | 'artifactUri'
  | 'hostedSystemPrompt'
  | 'hostedOutputSchemaJson'
  | 'hostedTemperature'
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
  'specJson',
  'maxConcurrency',
  'relatedResourceIds',
  'relatedMcpResourceIds',
  'relatedPreSkillResourceIds',
  'agentMaxSteps',
  'agentTemperature',
  'skillRootPath',
  'skillType',
  'paramsSchemaJson',
  'manifestJson',
  'artifactUri',
  'hostedSystemPrompt',
  'hostedOutputSchemaJson',
  'hostedTemperature',
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
    specJson: string;
    maxConcurrency: number;
    relatedResourceIds: string;
    relatedMcpResourceIds: string;
    relatedPreSkillResourceIds: string;
    skillExecutionMode: 'pack' | 'hosted';
    hostedSystemPrompt: string;
    hostedUserTemplate: string;
    hostedDefaultModel: string;
    hostedOutputSchemaJson: string;
    hostedTemperature: string;
    agentMaxSteps: string;
    agentTemperature: string;
    skillRootPath: string;
    skillType: string;
    paramsSchemaJson: string;
    manifestJson: string;
    artifactUri: string;
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
    const preSkillRel = parseRelatedIds(form.relatedPreSkillResourceIds);
    if (preSkillRel.invalidTokens.length > 0) {
      e.relatedPreSkillResourceIds = `前置 Skill ID 仅支持正整数（逗号分隔），非法值：${preSkillRel.invalidTokens.join(', ')}`;
    }
  }

  if (resourceType === 'agent') {
    if (!form.agentType.trim()) {
      e.agentType = '请填写智能体类型';
    }
    const specParsed = parseJsonObject(form.specJson, '规格 JSON');
    if (!specParsed.ok) {
      e.specJson = specParsed.message;
    } else {
      const specUrl = typeof specParsed.data?.url === 'string' ? specParsed.data.url.trim() : '';
      if (!specUrl) {
        e.specJson = e.specJson ?? '智能体规格 JSON 中必须包含 url';
      } else if (!isValidUrl(specUrl)) {
        e.specJson = e.specJson ?? '智能体规格配置中的 url 须为有效的 http/https URL';
      }
    }
    const related = parseRelatedIds(form.relatedResourceIds);
    if (related.invalidTokens.length > 0) {
      e.relatedResourceIds = `关联 Skill 等资源 ID 仅支持正整数（逗号分隔），非法值：${related.invalidTokens.join(', ')}`;
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
    if (form.skillExecutionMode === 'hosted') {
      if (!form.hostedSystemPrompt.trim()) {
        e.hostedSystemPrompt = '托管技能须填写系统提示词';
      }
      const st = form.skillType.trim().toLowerCase();
      if (st && st !== 'hosted_v1') {
        e.skillType = '托管技能请将「包格式」设为 hosted_v1';
      }
      const outParsed = parseJsonObject(form.hostedOutputSchemaJson, '输出 Schema JSON');
      if (form.hostedOutputSchemaJson.trim() && !outParsed.ok) {
        e.hostedOutputSchemaJson = outParsed.message;
      }
      if (form.hostedTemperature.trim()) {
        const ht = Number(form.hostedTemperature.trim());
        if (!Number.isFinite(ht) || ht < 0 || ht > 2) {
          e.hostedTemperature = '温度须在 0～2 之间或留空';
        }
      }
      const schemaParsed = parseJsonObject(form.paramsSchemaJson, '参数结构 JSON');
      if (!schemaParsed.ok) {
        e.paramsSchemaJson = schemaParsed.message;
      }
    } else {
      if (!form.skillType.trim()) {
        e.skillType = '请选择技能包格式';
      } else {
        const st = form.skillType.trim().toLowerCase();
        if (!['anthropic_v1', 'folder_v1'].includes(st)) {
          e.skillType = '技能包格式须为 anthropic_v1 或 folder_v1；可远程调用的 HTTP 工具请注册为 MCP 资源';
        }
      }
      const specParsed = parseJsonObject(form.specJson, '附加元数据 JSON（可为空对象）');
      if (!specParsed.ok) {
        e.specJson = specParsed.message;
      }
      const schemaParsed = parseJsonObject(form.paramsSchemaJson, '参数结构 JSON');
      if (!schemaParsed.ok) {
        e.paramsSchemaJson = schemaParsed.message;
      }
      const manifestParsed = parseJsonObject(form.manifestJson, '清单 JSON');
      if (!manifestParsed.ok) {
        e.manifestJson = manifestParsed.message;
      }
      const uri = form.artifactUri.trim();
      if (uri && !isValidUrl(uri) && !uri.startsWith('/uploads/')) {
        e.artifactUri = '制品地址须为 http(s) URL 或由上传生成的 /uploads/... 路径';
      }
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
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [tagOptions, setTagOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: '不选' }]);
  const [loading, setLoading] = useState(false);
  /** 技能包本地上传较慢，单独提示动画（与保存/URL 导入共用 loading 时仍显示进度文案） */
  const [skillPackUploading, setSkillPackUploading] = useState(false);
  const [skillPackChunkHint, setSkillPackChunkHint] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [skillTechOpen, setSkillTechOpen] = useState(false);
  const [skillPackUrl, setSkillPackUrl] = useState('');
  const [skillPackUrlError, setSkillPackUrlError] = useState('');
  const [skillSubmitArtifactError, setSkillSubmitArtifactError] = useState<string | null>(null);
  const [mcpProbeExtra, setMcpProbeExtra] = useState<Partial<Record<'endpoint' | 'authConfigJson', string>>>({});
  const [skillPackEcho, setSkillPackEcho] = useState<SkillPackEcho | null>(null);
  const skillPackPreviewRef = useRef<SkillPackPreviewState | null>(null);
  const [skillArtifactDownloading, setSkillArtifactDownloading] = useState(false);
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
    appIsPublic: false,
    dataType: 'structured',
    format: 'json',
    recordCount: 0,
    fileSize: 0,
    tags: '',
    datasetIsPublic: false,
    skillType: 'anthropic_v1',
    mode: resourceType === 'agent' ? 'SUBAGENT' : 'TOOL',
    agentType: 'http_api',
    maxConcurrency: 10,
    systemPrompt: '',
    agentIsPublic: false,
    agentHidden: false,
    agentMaxSteps: '',
    agentTemperature: '',
    specJson: resourceType === 'agent' ? DEFAULT_AGENT_SPEC_JSON : resourceType === 'skill' ? DEFAULT_SKILL_SPEC_JSON : '{}',
    paramsSchemaJson: DEFAULT_SKILL_PARAMS_SCHEMA_JSON,
    relatedResourceIds: '',
    artifactUri: '',
    entryDoc: 'SKILL.md',
    manifestJson: '{}',
    skillIsPublic: false,
    packValidationStatus: 'none',
    packValidationMessage: '',
    artifactSha256: '',
    skillRootPath: '',
    serviceDetailMd: '',
    relatedMcpResourceIds: '',
    relatedPreSkillResourceIds: '',
    skillExecutionMode: 'pack' as 'pack' | 'hosted',
    hostedSystemPrompt: '',
    hostedUserTemplate: '',
    hostedDefaultModel: '',
    hostedOutputSchemaJson: '',
    hostedTemperature: '',
  });
  const bindingSnapshotRef = useRef({ relatedMcpResourceIds: '', relatedPreSkillResourceIds: '' });
  const [mcpImportPaste, setMcpImportPaste] = useState('');
  const [mcpProbeLoading, setMcpProbeLoading] = useState(false);
  /** 已发布资源双轨编辑：用于提示线上版本 vs 草稿 */
  const [loadedResourceMeta, setLoadedResourceMeta] = useState<{
    status: string;
    currentVersion?: string;
    hasWorkingDraft?: boolean;
    pendingPublishedUpdate?: boolean;
    workingDraftAuditTier?: string;
  } | null>(null);

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
    if (!resourceId) {
      setLoadedResourceMeta(null);
      bindingSnapshotRef.current = { relatedMcpResourceIds: '', relatedPreSkillResourceIds: '' };
    }
  }, [resourceId]);

  useEffect(() => {
    if (resourceType !== 'skill' || resourceId) return;
    const raw = searchParams.get('skillPackUrl');
    if (!raw?.trim()) return;
    const url = raw.trim();
    setSkillPackUrl(url);
    setSkillTechOpen(true);
    if (!isValidUrl(url)) {
      showMessage('来自在线市场的技能包链接无效，请使用 HTTPS 直链', 'error');
      return;
    }
    /** 与 React Strict Mode 双次 effect 兼容：仅用「当前挂载」标记，避免第一次被 tear down 后 loading 永远 true */
    let active = true;
    setLoading(true);
    skillPackPreviewRef.current = { importUrl: url };
    const skillRootQ = searchParams.get('skillRoot')?.trim() || undefined;
    void resourceCenterService
      .importSkillPackageFromUrl(url, undefined, skillRootQ)
      .then((vo) => {
        if (!active) return;
        applySkillPackVoToForm(vo, 'url');
        setSkillPackUrl('');
        if (!vo.id) {
          navigate({ pathname: location.pathname, search: '' }, { replace: true });
        }
      })
      .catch((err) => {
        if (active) {
          skillPackPreviewRef.current = null;
          showMessage(err instanceof Error ? err.message : '从 URL 导入失败', 'error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 市场深链一次性导入；闭包内使用当期 applySkillPackVoToForm / navigate
  }, [resourceType, resourceId, searchParams]);

  useLayoutEffect(() => {
    if (resourceType !== 'skill') return;
    const raw = location.state as { skillPackPreview?: SkillPackPreviewState } | null | undefined;
    const p = raw?.skillPackPreview;
    if (!p) return;
    if ('fileName' in p) {
      setSkillPackEcho({ kind: 'file', name: p.fileName, size: p.size });
    } else {
      setSkillPackEcho({ kind: 'url', href: p.importUrl });
    }
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
  }, [resourceType, location.state, location.pathname, location.search, navigate]);

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
          (item.isPublic === true ||
            item.hidden === true ||
            item.maxSteps != null ||
            item.temperature != null)
        ) {
          setAgentAdvancedOpen(true);
        }
        const isHostedSkill = resourceType === 'skill' && String(item.executionMode ?? '').toLowerCase() === 'hosted';
        if (
          resourceType === 'skill' &&
          (isHostedSkill ||
            (item.spec != null && typeof item.spec === 'object' && Object.keys(item.spec).length > 0) ||
            (item.parametersSchema != null &&
              typeof item.parametersSchema === 'object' &&
              Object.keys(item.parametersSchema).length > 0))
        ) {
          setSkillTechOpen(true);
        }
        bindingSnapshotRef.current = {
          relatedMcpResourceIds:
            resourceType === 'agent'
              ? Array.isArray(item.relatedMcpResourceIds)
                ? item.relatedMcpResourceIds.join(', ')
                : ''
              : '',
          relatedPreSkillResourceIds:
            resourceType === 'mcp'
              ? Array.isArray(item.relatedPreSkillResourceIds)
                ? item.relatedPreSkillResourceIds.join(', ')
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
                appIsPublic: item.isPublic === true,
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
          ...(resourceType === 'agent' || resourceType === 'app'
            ? {
                relatedResourceIds: Array.isArray(item.relatedResourceIds) ? item.relatedResourceIds.join(', ') : '',
              }
            : {}),
          ...(resourceType === 'agent'
            ? {
                agentType: item.agentType || prev.agentType,
                mode: item.mode || prev.mode,
                specJson:
                  item.spec && typeof item.spec === 'object'
                    ? JSON.stringify(item.spec, null, 2)
                    : prev.specJson,
                systemPrompt: item.systemPrompt ?? '',
                maxConcurrency: item.maxConcurrency ?? prev.maxConcurrency,
                agentIsPublic: item.isPublic === true,
                agentHidden: item.hidden === true,
                agentMaxSteps: item.maxSteps != null ? String(item.maxSteps) : '',
                agentTemperature: item.temperature != null ? String(item.temperature) : '',
                relatedMcpResourceIds: Array.isArray(item.relatedMcpResourceIds)
                  ? item.relatedMcpResourceIds.join(', ')
                  : '',
              }
            : {}),
          ...(resourceType === 'mcp'
            ? {
                relatedPreSkillResourceIds: Array.isArray(item.relatedPreSkillResourceIds)
                  ? item.relatedPreSkillResourceIds.join(', ')
                  : '',
              }
            : {}),
          ...(resourceType === 'skill'
            ? {
                skillExecutionMode: isHostedSkill ? 'hosted' : 'pack',
                skillType: item.skillType || (isHostedSkill ? 'hosted_v1' : 'anthropic_v1'),
                artifactUri: item.artifactUri || '',
                entryDoc: item.entryDoc || 'SKILL.md',
                manifestJson: item.manifest ? JSON.stringify(item.manifest, null, 2) : '{}',
                skillIsPublic: item.isPublic === true,
                packValidationStatus: item.packValidationStatus || 'none',
                packValidationMessage: item.packValidationMessage || '',
                artifactSha256: item.artifactSha256 || '',
                skillRootPath: item.skillRootPath || '',
                hostedSystemPrompt: item.hostedSystemPrompt ?? '',
                hostedUserTemplate: item.hostedUserTemplate ?? '',
                hostedDefaultModel: item.hostedDefaultModel ?? '',
                hostedOutputSchemaJson:
                  item.hostedOutputSchema != null && typeof item.hostedOutputSchema === 'object'
                    ? JSON.stringify(item.hostedOutputSchema, null, 2)
                    : '',
                hostedTemperature:
                  item.hostedTemperature != null && Number.isFinite(Number(item.hostedTemperature))
                    ? String(item.hostedTemperature)
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
          ...(resourceType === 'dataset' ? { datasetIsPublic: item.isPublic === true } : {}),
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
        ? '技能包：上传 zip 或 URL 导入后做安全与清单校验；制品与文档为中心，远程可调用工具请单独注册 MCP。可选填写包内子目录作为校验与 resolve 的 skillRootPath。'
        : TYPE_GUIDE_ONE_LINE[resourceType],
    [resourceType],
  );

  const skillHasArtifact = useMemo(
    () => resourceType === 'skill' && form.skillExecutionMode === 'pack' && Boolean(form.artifactUri?.trim()),
    [resourceType, form.skillExecutionMode, form.artifactUri],
  );

  const skillEchoVisible = useMemo(
    () =>
      resourceType === 'skill' &&
      form.skillExecutionMode === 'pack' &&
      skillPackEcho != null &&
      !form.artifactUri?.trim(),
    [resourceType, form.skillExecutionMode, skillPackEcho, form.artifactUri],
  );

  const fieldErrors = useMemo((): Partial<Record<ResourceRegisterFieldKey, string>> =>
    computeResourceRegisterFieldErrors(resourceType, form),
    [
      form.agentType,
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
      form.skillRootPath,
      form.skillType,
      form.specJson,
      form.manifestJson,
      form.artifactUri,
      form.relatedMcpResourceIds,
      form.relatedPreSkillResourceIds,
      form.skillExecutionMode,
      form.hostedSystemPrompt,
      form.hostedUserTemplate,
      form.hostedDefaultModel,
      form.hostedOutputSchemaJson,
      form.hostedTemperature,
      resourceType,
    ],
  );

  useEffect(() => {
    setMcpProbeExtra({});
  }, [form.endpoint, form.authConfigJson, form.authType, form.mcpRegisterMode]);

  useEffect(() => {
    if (skillPackUrl) setSkillPackUrlError('');
  }, [skillPackUrl]);

  useEffect(() => {
    if (form.artifactUri.trim()) setSkillSubmitArtifactError(null);
  }, [form.artifactUri]);

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
      const preSkillIds = mergeRelationIdsForUpsert(
        Boolean(resourceId),
        form.relatedPreSkillResourceIds,
        bindingSnapshotRef.current.relatedPreSkillResourceIds,
      );
      return {
        ...baseFields,
        resourceType: 'mcp',
        endpoint: form.endpoint.trim(),
        protocol: 'mcp',
        authType: form.authType || 'none',
        authConfig,
        serviceDetailMd: form.serviceDetailMd.trim(),
        ...(preSkillIds !== undefined ? { relatedPreSkillResourceIds: preSkillIds } : {}),
      };
    }
    if (resourceType === 'skill') {
      if (form.skillExecutionMode === 'hosted') {
        const parsedSpec = parseJsonObject(form.specJson, '附加元数据（spec JSON）');
        const parsedSchema = parseJsonObject(form.paramsSchemaJson, '参数结构（parametersSchema JSON）');
        if (!parsedSpec.ok || !parsedSchema.ok) {
          throw new Error(!parsedSpec.ok ? parsedSpec.message : parsedSchema.message);
        }
        const outParsed = parseJsonObject(form.hostedOutputSchemaJson, '输出 Schema JSON');
        if (form.hostedOutputSchemaJson.trim() && !outParsed.ok) {
          throw new Error(outParsed.message);
        }
        const tempTrim = form.hostedTemperature.trim();
        const tempParsed = tempTrim ? Number(tempTrim) : NaN;
        const specObj = parsedSpec.data || {};
        const outObj = outParsed.data || {};
        return {
          ...baseFields,
          resourceType: 'skill',
          executionMode: 'hosted',
          serviceDetailMd: form.serviceDetailMd.trim(),
          skillType: form.skillType.trim().toLowerCase() === 'hosted_v1' ? form.skillType.trim() : 'hosted_v1',
          hostedSystemPrompt: form.hostedSystemPrompt.trim(),
          hostedUserTemplate: form.hostedUserTemplate.trim() || undefined,
          hostedDefaultModel: form.hostedDefaultModel.trim() || undefined,
          ...(Object.keys(outObj).length > 0 ? { hostedOutputSchema: outObj } : {}),
          ...(Number.isFinite(tempParsed) ? { hostedTemperature: tempParsed } : {}),
          skillRootPath: form.skillRootPath.trim() || undefined,
          spec: Object.keys(specObj).length > 0 ? specObj : {},
          parametersSchema: parsedSchema.data || {},
          isPublic: form.skillIsPublic,
        };
      }
      const parsedSpec = parseJsonObject(form.specJson, '附加元数据（spec JSON）');
      const parsedSchema = parseJsonObject(form.paramsSchemaJson, '参数结构（parametersSchema JSON）');
      const parsedManifest = parseJsonObject(form.manifestJson, '清单 JSON');
      if (!parsedSpec.ok || !parsedSchema.ok || !parsedManifest.ok) {
        throw new Error(!parsedSpec.ok ? parsedSpec.message : !parsedSchema.ok ? parsedSchema.message : parsedManifest.message);
      }
      const specObj = parsedSpec.data || {};
      const manifestObj = parsedManifest.data || {};
      return {
        ...baseFields,
        resourceType: 'skill',
        executionMode: 'pack',
        serviceDetailMd: form.serviceDetailMd.trim(),
        skillType: form.skillType.trim(),
        artifactUri: form.artifactUri.trim() || undefined,
        artifactSha256: form.artifactSha256.trim() || undefined,
        manifest: Object.keys(manifestObj).length > 0 ? manifestObj : undefined,
        entryDoc: form.entryDoc.trim() || undefined,
        skillRootPath: form.skillRootPath.trim(),
        spec: Object.keys(specObj).length > 0 ? specObj : {},
        parametersSchema: parsedSchema.data || {},
        isPublic: form.skillIsPublic,
      };
    }
    if (resourceType === 'agent') {
      const parsedSpec = parseJsonObject(form.specJson, '规格配置（spec JSON）');
      if (!parsedSpec.ok) throw new Error(parsedSpec.message);
      const agentRelated = parseRelatedIds(form.relatedResourceIds).ids;
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
        maxConcurrency: Number(form.maxConcurrency) || 10,
        systemPrompt: form.systemPrompt.trim() ? form.systemPrompt.trim() : undefined,
        isPublic: form.agentIsPublic,
        hidden: form.agentHidden,
        ...(Number.isFinite(maxStepsParsed) && maxStepsParsed > 0 ? { maxSteps: maxStepsParsed } : {}),
        ...(Number.isFinite(tempParsed) ? { temperature: tempParsed } : {}),
        relatedResourceIds: agentRelated.length > 0 ? agentRelated : undefined,
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
        isPublic: form.appIsPublic,
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
      isPublic: form.datasetIsPublic,
    };
  };

  const applySkillPackVoToForm = (
    vo: Awaited<ReturnType<typeof resourceCenterService.uploadSkillPackage>>,
    via: 'upload' | 'url',
  ) => {
    const preview = skillPackPreviewRef.current;
    skillPackPreviewRef.current = null;

    setForm((prev) => ({
      ...prev,
      resourceCode: vo.resourceCode || prev.resourceCode,
      displayName: vo.displayName || prev.displayName,
      description: vo.description ?? prev.description,
      skillExecutionMode: 'pack',
      skillType: vo.skillType || prev.skillType,
      artifactUri: vo.artifactUri || '',
      artifactSha256: vo.artifactSha256 || '',
      entryDoc: vo.entryDoc || prev.entryDoc,
      manifestJson: vo.manifest ? JSON.stringify(vo.manifest, null, 2) : prev.manifestJson,
      packValidationStatus: String(vo.packValidationStatus || 'none'),
      packValidationMessage: vo.packValidationMessage || '',
      skillRootPath: vo.skillRootPath || '',
      skillIsPublic: vo.isPublic === true,
      sourceType: vo.sourceType || prev.sourceType,
    }));
    if (!resourceId && vo.id) {
      const nextSearch = new URLSearchParams(searchParams);
      nextSearch.delete('skillTrack');
      const base = location.pathname.replace(/\/+$/, '');
      const q = nextSearch.toString();
      navigate(
        { pathname: `${base}/${vo.id}`, search: q ? `?${q}` : '' },
        { replace: true, state: preview ? { skillPackPreview: preview } : undefined },
      );
    } else if (preview) {
      if ('fileName' in preview) {
        setSkillPackEcho({ kind: 'file', name: preview.fileName, size: preview.size });
      } else {
        setSkillPackEcho({ kind: 'url', href: preview.importUrl });
      }
    }
    const ok = String(vo.packValidationStatus).toLowerCase() === 'valid';
    const verb = via === 'url' ? '从链接导入' : '上传';
    showMessage(
      ok ? `技能包已${verb}并通过校验` : `已${verb}：${vo.packValidationMessage || '校验未通过，请检查包内 SKILL.md 等'}`,
      ok ? 'success' : 'warning',
    );
  };

  const handleSkillZipUpload: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const skillPackMaxBytes = 100 * 1024 * 1024;
    if (file.size > skillPackMaxBytes) {
      showMessage(`技能包超过 ${skillPackMaxBytes / 1024 / 1024}MB 上限，请压缩或拆分后再传`, 'error');
      return;
    }
    if (file.size === 0) {
      showMessage('文件为空', 'error');
      return;
    }
    skillPackPreviewRef.current = { fileName: file.name, size: file.size };
    setSkillPackUploading(true);
    setSkillPackChunkHint(null);
    setLoading(true);
    try {
      const vo = await resourceCenterService.uploadSkillPackageResumable(
        file,
        resourceId,
        form.skillRootPath.trim() || undefined,
        (p) => {
          if (p.phase === 'chunk' && p.totalChunks != null) {
            const n = (p.chunkIndex ?? 0) + 1;
            setSkillPackChunkHint(`分片上传 ${n}/${p.totalChunks}（中断后同文件可续传）`);
          } else if (p.phase === 'complete') {
            setSkillPackChunkHint('合并并校验中…');
          } else {
            setSkillPackChunkHint(null);
          }
        },
      );
      applySkillPackVoToForm(vo, 'upload');
    } catch (err) {
      skillPackPreviewRef.current = null;
      showMessage(err instanceof Error ? err.message : '上传失败', 'error');
    } finally {
      setSkillPackUploading(false);
      setSkillPackChunkHint(null);
      setLoading(false);
    }
  };

  const handleSkillUrlImport = async () => {
    const u = skillPackUrl.trim();
    if (!u) {
      setSkillPackUrlError('请输入可直链下载的技能包地址（HTTPS，zip/tar.gz 等）');
      return;
    }
    setSkillPackUrlError('');
    skillPackPreviewRef.current = { importUrl: u };
    setLoading(true);
    try {
      const vo = await resourceCenterService.importSkillPackageFromUrl(
        u,
        resourceId,
        form.skillRootPath.trim() || undefined,
      );
      applySkillPackVoToForm(vo, 'url');
      setSkillPackUrl('');
    } catch (err) {
      skillPackPreviewRef.current = null;
      showMessage(err instanceof Error ? err.message : '从 URL 导入失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const save = async (submitAfterSave: boolean) => {
    if (!resourceId && !user?.id) {
      showMessage('请先登录后再注册资源', 'error');
      return;
    }
    setSkillSubmitArtifactError(null);
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
    if (submitAfterSave && resourceType === 'skill' && form.skillExecutionMode === 'pack') {
      if (!form.artifactUri.trim()) {
        setSkillSubmitArtifactError('提交审核前须已上传技能包（具备 artifactUri）。');
        requestAnimationFrame(() => document.getElementById(rrFieldId('artifactUri'))?.focus());
        return;
      }
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
      titleIcon={FileCheck}
      breadcrumbSegments={['统一资源中心', registerPageTitle]}
      description={registerGuideLine}
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <button
            type="button"
            className={`inline-flex items-center gap-1 text-sm font-medium ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'}`}
            onClick={() => navigate(buildPath('user', 'api-docs'))}
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
                          : '支持 Markdown：功能说明、嵌入方式、权限与示例等；将在应用广场「应用介绍」Tab 展示'
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
                    placeholder='例如：{ "mcpServers": { "demo": { "url": "https://example.com/mcp" } } }'
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
                <Field
                  label="前置 Skill ID（选填）"
                  full
                  theme={theme}
                  error={fieldErrors.relatedPreSkillResourceIds}
                  fieldId={rrFieldId('relatedPreSkillResourceIds')}
                >
                  <p className={`mb-1 text-xs ${textMuted(theme)}`}>
                    invoke(MCP) 之前按顺序执行的托管技能资源 ID（逗号分隔）；留空表示不设前置链。更新草稿时若不改此栏则不提交修改（与后端「null=不变更」一致）。
                  </p>
                  <input
                    id={rrFieldId('relatedPreSkillResourceIds')}
                    value={form.relatedPreSkillResourceIds}
                    onChange={(e) => setForm((p) => ({ ...p, relatedPreSkillResourceIds: e.target.value }))}
                    className={inputClass(isDark, !!fieldErrors.relatedPreSkillResourceIds)}
                    aria-invalid={!!fieldErrors.relatedPreSkillResourceIds}
                    aria-describedby={
                      fieldErrors.relatedPreSkillResourceIds ? `${rrFieldId('relatedPreSkillResourceIds')}-err` : undefined
                    }
                    placeholder="如 12, 34"
                    title="逗号分隔的正整数"
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
                <Field label="规格（JSON，须含 url）" full theme={theme} error={fieldErrors.specJson} fieldId={rrFieldId('specJson')}>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={() => setForm((p) => ({ ...p, specJson: DEFAULT_AGENT_SPEC_JSON }))}>
                      填入示例
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
                    placeholder='{"url":"https://…","timeout":30}'
                  />
                </Field>
                <Field label="最大并发" theme={theme} error={fieldErrors.maxConcurrency} fieldId={rrFieldId('maxConcurrency')}>
                  <input
                    id={rrFieldId('maxConcurrency')}
                    type="number"
                    value={form.maxConcurrency}
                    onChange={(e) => setForm((p) => ({ ...p, maxConcurrency: Number(e.target.value) || 1 }))}
                    className={inputClass(isDark, !!fieldErrors.maxConcurrency)}
                    aria-invalid={!!fieldErrors.maxConcurrency}
                    aria-describedby={fieldErrors.maxConcurrency ? `${rrFieldId('maxConcurrency')}-err` : undefined}
                    placeholder="1–1000"
                  />
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
                <Field label="关联资源 ID（选填）" theme={theme} error={fieldErrors.relatedResourceIds} fieldId={rrFieldId('relatedResourceIds')}>
                  <input
                    id={rrFieldId('relatedResourceIds')}
                    value={form.relatedResourceIds}
                    onChange={(e) => setForm((p) => ({ ...p, relatedResourceIds: e.target.value }))}
                    className={inputClass(isDark, !!fieldErrors.relatedResourceIds)}
                    aria-invalid={!!fieldErrors.relatedResourceIds}
                    aria-describedby={fieldErrors.relatedResourceIds ? `${rrFieldId('relatedResourceIds')}-err` : undefined}
                    placeholder="如 12, 34"
                    title="逗号分隔的正整数"
                  />
                </Field>
                <Field
                  label="绑定的 MCP ID（选填）"
                  theme={theme}
                  error={fieldErrors.relatedMcpResourceIds}
                  fieldId={rrFieldId('relatedMcpResourceIds')}
                >
                  <p className={`mb-1 text-xs ${textMuted(theme)}`}>
                    agent_depends_mcp：逗号分隔的正整数。更新时若内容与加载时一致则不提交该字段。
                  </p>
                  <input
                    id={rrFieldId('relatedMcpResourceIds')}
                    value={form.relatedMcpResourceIds}
                    onChange={(e) => setForm((p) => ({ ...p, relatedMcpResourceIds: e.target.value }))}
                    className={inputClass(isDark, !!fieldErrors.relatedMcpResourceIds)}
                    aria-invalid={!!fieldErrors.relatedMcpResourceIds}
                    aria-describedby={
                      fieldErrors.relatedMcpResourceIds ? `${rrFieldId('relatedMcpResourceIds')}-err` : undefined
                    }
                    placeholder="如 12, 34"
                    title="逗号分隔的正整数"
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
                    <span>高级：公开范围、目录可见性、最大步数与采样温度（与后端一致）</span>
                    <ChevronDown size={16} className={agentAdvancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  {agentAdvancedOpen ? (
                    <div className="mt-2 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                      <Field label="对外公开" theme={theme}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.agentIsPublic}
                            onChange={(e) => setForm((p) => ({ ...p, agentIsPublic: e.target.checked }))}
                            className={lantuCheckboxPrimaryClass}
                          />
                          <span className={textMuted(theme)}>在目录中可按公开策略展示</span>
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
                <Field label="运行方式" full theme={theme}>
                  <ThemedSelect
                    isDark={isDark}
                    value={form.skillExecutionMode}
                    onChange={(value) => {
                      const mode = value as 'pack' | 'hosted';
                      setForm((p) => ({
                        ...p,
                        skillExecutionMode: mode,
                        skillType:
                          mode === 'hosted'
                            ? 'hosted_v1'
                            : p.skillType === 'hosted_v1'
                              ? 'anthropic_v1'
                              : p.skillType,
                      }));
                    }}
                    options={[
                      { value: 'pack', label: '技能包（平台托管 zip 制品）' },
                      { value: 'hosted', label: '托管技能（平台内 LLM，无 zip）' },
                    ]}
                  />
                  <p className={`mt-1 text-xs ${textMuted(theme)}`}>
                    托管技能用于 MCP 前置链 JSON 归一化等场景；须配置系统提示词与参数 Schema，不需要上传技能包。
                  </p>
                </Field>
                {form.skillExecutionMode === 'hosted' ? (
                  <div className="md:col-span-2 space-y-3 rounded-xl border p-4 text-sm border-violet-500/25 bg-violet-500/[0.04]">
                    <Field label="系统提示词 *" full theme={theme} error={fieldErrors.hostedSystemPrompt} fieldId={rrFieldId('hostedSystemPrompt')}>
                      <AutoHeightTextarea
                        id={rrFieldId('hostedSystemPrompt')}
                        value={form.hostedSystemPrompt}
                        onChange={(e) => setForm((p) => ({ ...p, hostedSystemPrompt: e.target.value }))}
                        minRows={4}
                        maxRows={24}
                        className={`${inputClass(isDark, !!fieldErrors.hostedSystemPrompt)} resize-none`}
                        aria-invalid={!!fieldErrors.hostedSystemPrompt}
                        aria-describedby={
                          fieldErrors.hostedSystemPrompt ? `${rrFieldId('hostedSystemPrompt')}-err` : undefined
                        }
                        placeholder="角色、输出约束与工具前处理说明等"
                      />
                    </Field>
                    <Field label="用户消息模板（选填）" full theme={theme}>
                      <AutoHeightTextarea
                        value={form.hostedUserTemplate}
                        onChange={(e) => setForm((p) => ({ ...p, hostedUserTemplate: e.target.value }))}
                        minRows={2}
                        maxRows={16}
                        className={`${inputClass(isDark)} resize-none`}
                        placeholder="可使用 {{input}} 占位输入 JSON"
                      />
                    </Field>
                    <Field label="默认模型（选填）" theme={theme}>
                      <input
                        value={form.hostedDefaultModel}
                        onChange={(e) => setForm((p) => ({ ...p, hostedDefaultModel: e.target.value }))}
                        className={inputClass(isDark)}
                        placeholder="留空则走网关默认路由"
                      />
                    </Field>
                    <Field
                      label="输出 Schema JSON（选填）"
                      full
                      theme={theme}
                      error={fieldErrors.hostedOutputSchemaJson}
                      fieldId={rrFieldId('hostedOutputSchemaJson')}
                    >
                      <AutoHeightTextarea
                        id={rrFieldId('hostedOutputSchemaJson')}
                        value={form.hostedOutputSchemaJson}
                        onChange={(e) => setForm((p) => ({ ...p, hostedOutputSchemaJson: e.target.value }))}
                        minRows={3}
                        maxRows={20}
                        className={`${inputClass(isDark, !!fieldErrors.hostedOutputSchemaJson)} font-mono text-xs resize-none`}
                        aria-invalid={!!fieldErrors.hostedOutputSchemaJson}
                        aria-describedby={
                          fieldErrors.hostedOutputSchemaJson
                            ? `${rrFieldId('hostedOutputSchemaJson')}-err`
                            : undefined
                        }
                        placeholder="JSON Schema 对象，约束模型输出"
                      />
                    </Field>
                    <Field label="温度（选填）" theme={theme} error={fieldErrors.hostedTemperature} fieldId={rrFieldId('hostedTemperature')}>
                      <input
                        id={rrFieldId('hostedTemperature')}
                        value={form.hostedTemperature}
                        onChange={(e) => setForm((p) => ({ ...p, hostedTemperature: e.target.value }))}
                        className={inputClass(isDark, !!fieldErrors.hostedTemperature)}
                        inputMode="decimal"
                        placeholder="0～2，留空则默认"
                        aria-invalid={!!fieldErrors.hostedTemperature}
                        aria-describedby={
                          fieldErrors.hostedTemperature ? `${rrFieldId('hostedTemperature')}-err` : undefined
                        }
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
                ) : null}
                <div
                  className={`md:col-span-2 rounded-xl border px-4 py-3 text-sm ${
                    form.skillExecutionMode !== 'pack'
                      ? 'hidden'
                      : skillHasArtifact
                      ? isDark
                        ? 'border-solid border-emerald-500/35 bg-emerald-500/[0.08]'
                        : 'border-solid border-emerald-300 bg-emerald-50/80'
                      : `border-dashed ${isDark ? 'border-white/15' : 'border-slate-300'}`
                  }`}
                >
                  <div className={`mb-2 flex flex-wrap items-center justify-between gap-2 ${textPrimary(theme)}`}>
                    <span className="font-medium">
                      技能包（zip / tar.gz 等）· 平台托管制品与清单；徽章为 Anthropic/目录约定下的包内语义自检结果
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        String(form.packValidationStatus).toLowerCase() === 'valid'
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : 'bg-emerald-100 text-emerald-800'
                          : String(form.packValidationStatus).toLowerCase() === 'invalid'
                            ? isDark
                              ? 'bg-rose-500/20 text-rose-200'
                              : 'bg-rose-100 text-rose-800'
                            : isDark
                              ? 'bg-white/10 text-slate-300'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {skillPackValidationLabelZh(form.packValidationStatus || 'none')}
                    </span>
                  </div>
                  {resourceId && loading && !skillHasArtifact && !skillEchoVisible ? (
                    <div className={`mb-3 flex items-center gap-2 text-xs ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                      <Loader2 size={14} className="shrink-0 animate-spin" />
                      <span>正在从服务端加载已保存的技能包与制品信息…</span>
                    </div>
                  ) : null}
                  {(skillHasArtifact || skillEchoVisible) && (
                    <div
                      className={`mb-3 rounded-lg border-l-4 px-3 py-2.5 ${
                        String(form.packValidationStatus).toLowerCase() === 'invalid'
                          ? isDark
                            ? 'border-rose-400 bg-rose-500/10'
                            : 'border-rose-500 bg-rose-50'
                          : String(form.packValidationStatus).toLowerCase() === 'valid'
                            ? isDark
                              ? 'border-emerald-400 bg-emerald-500/10'
                              : 'border-emerald-500 bg-emerald-50'
                            : isDark
                              ? 'border-sky-400 bg-sky-500/10'
                              : 'border-sky-500 bg-sky-50'
                      }`}
                    >
                      <div className="flex gap-2">
                        <FileCheck
                          size={18}
                          className={`mt-0.5 shrink-0 ${
                            String(form.packValidationStatus).toLowerCase() === 'invalid'
                              ? isDark
                                ? 'text-rose-300'
                                : 'text-rose-700'
                              : isDark
                                ? 'text-emerald-300'
                                : 'text-emerald-700'
                          }`}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className={`text-sm font-semibold ${textPrimary(theme)}`}>
                            {skillHasArtifact
                              ? '制品已保存，可继续填写基础信息并保存草稿'
                              : '已收到上传 / 导入请求，正在写入资源…'}
                          </p>
                          {skillEchoVisible && skillPackEcho?.kind === 'file' ? (
                            <p className={`text-xs ${textMuted(theme)}`}>
                              本地上传：
                              <span className={`font-medium ${textPrimary(theme)}`}>{skillPackEcho.name}</span>
                              <span className="mx-1.5 opacity-60">·</span>
                              {formatSkillPackBytes(skillPackEcho.size)}
                            </p>
                          ) : null}
                          {skillEchoVisible && skillPackEcho?.kind === 'url' ? (
                            <p className={`break-all text-xs ${textMuted(theme)}`}>
                              链接导入：
                              <span className="font-mono">{truncateSkillArtifactPath(skillPackEcho.href, 80)}</span>
                            </p>
                          ) : null}
                          {skillHasArtifact ? (
                            <>
                              <p className={`break-all font-mono text-xs leading-snug ${textMuted(theme)}`}>
                                <span className="opacity-90">制品路径 </span>
                                {truncateSkillArtifactPath(form.artifactUri.trim(), 72)}
                              </p>
                              {form.artifactSha256.trim() ? (
                                <p className={`font-mono text-xs ${textMuted(theme)}`}>
                                  SHA-256 {form.artifactSha256.trim().slice(0, 20)}…
                                </p>
                              ) : null}
                              <p className={`text-xs ${textMuted(theme)}`}>
                                展示名：<span className={textPrimary(theme)}>{skillArtifactDisplayLabel(form.artifactUri)}</span>
                              </p>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                  {form.packValidationMessage ? (
                    <p className={`mb-2 text-xs ${textMuted(theme)}`}>{form.packValidationMessage}</p>
                  ) : null}
                  {skillPackChunkHint ? (
                    <p className={`mb-2 text-xs ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>{skillPackChunkHint}</p>
                  ) : null}
                  {skillSubmitArtifactError ? (
                    <p className={`mb-2 ${fieldErrorText()}`} role="alert">
                      {skillSubmitArtifactError}
                    </p>
                  ) : null}
                  <div className={`mb-3 ${textMuted(theme)}`}>
                    <label htmlFor={rrFieldId('skillRootPath')} className="mb-1 block text-xs font-medium text-current">
                      技能根目录（可选，zip 内相对路径）
                    </label>
                    <input
                      id={rrFieldId('skillRootPath')}
                      type="text"
                      value={form.skillRootPath}
                      onChange={(e) => setForm((p) => ({ ...p, skillRootPath: e.target.value }))}
                      disabled={loading}
                      placeholder="留空＝整包校验；多技能并列时填写子目录，如 my-package/sub-skill"
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${
                        isDark ? 'border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                      } ${fieldErrors.skillRootPath ? inputBaseError() : ''}`}
                      aria-invalid={!!fieldErrors.skillRootPath}
                      aria-describedby={
                        fieldErrors.skillRootPath ? `${rrFieldId('skillRootPath')}-err` : undefined
                      }
                    />
                    {fieldErrors.skillRootPath ? (
                      <p id={`${rrFieldId('skillRootPath')}-err`} className={`mt-1 ${fieldErrorText()}`} role="alert">
                        {fieldErrors.skillRootPath}
                      </p>
                    ) : null}
                    <p className={`mt-1 text-xs leading-relaxed ${textMuted(theme)}`}>
                      与上传/URL 导入时传入的 skillRoot 一致；resolve 与校验范围仅针对该子树。一般在填好后再上传或导入。
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 ${btnSecondary(theme)} ${
                        skillPackUploading ? 'pointer-events-none opacity-80' : ''
                      }`}
                    >
                      {skillPackUploading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Upload size={15} />
                      )}
                      <span>
                        {skillPackUploading
                          ? '上传并校验中…'
                          : resourceId
                            ? '上传 / 更换包'
                            : '上传技能包创建草稿'}
                      </span>
                      <input
                        type="file"
                        accept=".zip,.tar,.tar.gz,.tgz,.md,.gz,application/zip,application/gzip,application/x-gzip,text/markdown,application/octet-stream"
                        className="hidden"
                        onChange={(e) => void handleSkillZipUpload(e)}
                        disabled={loading}
                      />
                    </label>
                    <div className={`mt-2 flex w-full min-w-[240px] flex-1 flex-col gap-2 sm:mt-0 sm:flex-row sm:items-center`}>
                      <input
                        id="rr-skillPackUrl"
                        type="url"
                        value={skillPackUrl}
                        onChange={(e) => setSkillPackUrl(e.target.value)}
                        disabled={loading}
                        className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${
                          isDark ? 'border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                        } ${skillPackUrlError ? inputBaseError() : ''}`}
                        aria-invalid={!!skillPackUrlError}
                        aria-describedby={skillPackUrlError ? 'rr-skillPackUrl-err' : undefined}
                        placeholder="或粘贴直链（HTTPS）：zip / tar.gz / tar / .md 等，服务端拉取并归一化"
                      />
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleSkillUrlImport()}
                        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${btnSecondary(theme)}`}
                      >
                        <Download size={15} />
                        <Link2 size={14} className="opacity-80" />
                        从 URL 导入
                      </button>
                    </div>
                    {skillPackUrlError ? (
                      <p id="rr-skillPackUrl-err" className={`mt-1 ${fieldErrorText()}`} role="alert">
                        {skillPackUrlError}
                      </p>
                    ) : null}
                    {resourceId && skillHasArtifact && (
                      <button
                        type="button"
                        disabled={loading || skillArtifactDownloading}
                        onClick={() => {
                          setSkillArtifactDownloading(true);
                          void resourceCenterService
                            .downloadSkillArtifact(resourceId, form.displayName)
                            .then(() => showMessage('已开始下载', 'success'))
                            .catch((e) => showMessage(e instanceof Error ? e.message : '下载失败', 'error'))
                            .finally(() => setSkillArtifactDownloading(false));
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${btnSecondary(theme)}`}
                      >
                        <Download size={15} />
                        {skillArtifactDownloading ? '下载中…' : '下载制品（skill-artifact）'}
                      </button>
                    )}
                  </div>
                </div>
                {form.skillExecutionMode === 'pack' ? (
                  <Field label="包格式" theme={theme} error={fieldErrors.skillType}>
                    <ThemedSelect
                      isDark={isDark}
                      value={form.skillType}
                      onChange={(value) => setForm((p) => ({ ...p, skillType: value }))}
                      options={[
                        { value: 'anthropic_v1', label: 'anthropic_v1' },
                        { value: 'folder_v1', label: 'folder_v1' },
                      ]}
                    />
                  </Field>
                ) : null}
                <Field label="对外公开" theme={theme}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.skillIsPublic}
                      onChange={(e) => setForm((p) => ({ ...p, skillIsPublic: e.target.checked }))}
                      className={lantuCheckboxPrimaryClass}
                    />
                    <span className={textMuted(theme)}>在目录中可按公开策略展示</span>
                  </label>
                </Field>

                {form.skillExecutionMode === 'pack' ? (
                <div className="md:col-span-2">
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium ${
                      isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                    onClick={() => setSkillTechOpen((o) => !o)}
                  >
                    <span>高级 / 技术字段（制品、manifest、JSON…）</span>
                    <ChevronDown size={16} className={skillTechOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  {skillTechOpen ? (
                    <div className="mt-2 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                      <Field label="制品地址" theme={theme} error={fieldErrors.artifactUri} fieldId={rrFieldId('artifactUri')}>
                        <input
                          id={rrFieldId('artifactUri')}
                          value={form.artifactUri}
                          onChange={(e) => setForm((p) => ({ ...p, artifactUri: e.target.value }))}
                          className={inputClass(isDark, !!fieldErrors.artifactUri)}
                          aria-invalid={!!fieldErrors.artifactUri}
                          aria-describedby={fieldErrors.artifactUri ? `${rrFieldId('artifactUri')}-err` : undefined}
                          placeholder="上传后自动填充，或手填 URL"
                        />
                      </Field>
                      <Field label="SHA-256（只读）" theme={theme}>
                        <input value={form.artifactSha256} readOnly className={`${inputClass(isDark)} opacity-80`} placeholder="—" />
                      </Field>
                      <Field label="入口文档" theme={theme}>
                        <input
                          value={form.entryDoc}
                          onChange={(e) => setForm((p) => ({ ...p, entryDoc: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="SKILL.md"
                        />
                      </Field>
                      <Field label="清单 JSON" full theme={theme} error={fieldErrors.manifestJson} fieldId={rrFieldId('manifestJson')}>
                        <AutoHeightTextarea
                          id={rrFieldId('manifestJson')}
                          value={form.manifestJson}
                          onChange={(e) => setForm((p) => ({ ...p, manifestJson: e.target.value }))}
                          minRows={4}
                          maxRows={30}
                          className={`${inputClass(isDark, !!fieldErrors.manifestJson)} font-mono text-xs resize-none`}
                          aria-invalid={!!fieldErrors.manifestJson}
                          aria-describedby={fieldErrors.manifestJson ? `${rrFieldId('manifestJson')}-err` : undefined}
                        />
                      </Field>
                      <Field label="规格 JSON" full theme={theme} error={fieldErrors.specJson} fieldId={rrFieldId('specJson')}>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <button type="button" className={btnSecondary(theme)} onClick={() => setForm((p) => ({ ...p, specJson: DEFAULT_SKILL_SPEC_JSON }))}>
                            置为 {}
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
                      <Field label="参数 Schema JSON" full theme={theme} error={fieldErrors.paramsSchemaJson} fieldId={rrFieldId('paramsSchemaJson')}>
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
                  ) : null}
                </div>
                ) : null}
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
                <Field label="对外公开" theme={theme}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.appIsPublic}
                      onChange={(e) => setForm((p) => ({ ...p, appIsPublic: e.target.checked }))}
                      className={lantuCheckboxPrimaryClass}
                    />
                    <span className={textMuted(theme)}>公开可见</span>
                  </label>
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
                  <input
                    id={rrFieldId('recordCount')}
                    type="number"
                    value={form.recordCount}
                    onChange={(e) => setForm((p) => ({ ...p, recordCount: Number(e.target.value) || 0 }))}
                    className={inputClass(isDark, !!fieldErrors.recordCount)}
                    aria-invalid={!!fieldErrors.recordCount}
                    aria-describedby={fieldErrors.recordCount ? `${rrFieldId('recordCount')}-err` : undefined}
                    placeholder="0"
                  />
                </Field>
                <Field label="体积（与后端一致的数值，见接入指南）" theme={theme} error={fieldErrors.fileSize} fieldId={rrFieldId('fileSize')}>
                  <input
                    id={rrFieldId('fileSize')}
                    type="number"
                    value={form.fileSize}
                    onChange={(e) => setForm((p) => ({ ...p, fileSize: Number(e.target.value) || 0 }))}
                    className={inputClass(isDark, !!fieldErrors.fileSize)}
                    aria-invalid={!!fieldErrors.fileSize}
                    aria-describedby={fieldErrors.fileSize ? `${rrFieldId('fileSize')}-err` : undefined}
                    placeholder="0"
                  />
                </Field>
                <Field label="标签（选填，逗号分隔）" full theme={theme}>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder="如 教务, 公开数据"
                  />
                </Field>
                <Field label="对外公开" theme={theme}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.datasetIsPublic}
                      onChange={(e) => setForm((p) => ({ ...p, datasetIsPublic: e.target.checked }))}
                      className={lantuCheckboxPrimaryClass}
                    />
                    <span className={textMuted(theme)}>与后端数据集扩展 is_public 一致</span>
                  </label>
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
