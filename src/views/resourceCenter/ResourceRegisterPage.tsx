import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, Download, FileCheck, Link2, Loader2, Save, Send, Upload } from 'lucide-react';
import type { Theme, FontSize } from '../../types';
import type { ResourceType } from '../../types/dto/catalog';
import type { ResourceAccessPolicy, ResourceUpsertRequest } from '../../types/dto/resource-center';
import { accessPolicyHelpLines, normalizeAccessPolicy } from '../../utils/accessPolicy';
import { resourceCenterService } from '../../api/services/resource-center.service';
import { tagService } from '../../api/services/tag.service';
import { useAuthStore } from '../../stores/authStore';
import { LantuSelect } from '../../components/common/LantuSelect';
import { filterTagsForResourceType } from '../../utils/marketTags';
import { buildPath } from '../../constants/consoleRoutes';
import { bentoCard, btnPrimary, btnSecondary, textMuted, textPrimary } from '../../utils/uiClasses';
import { MgmtPageShell } from '../userMgmt/MgmtPageShell';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  showMessage: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  resourceType: ResourceType;
  resourceId?: number;
  onBack: () => void;
}

/** 与后端「托管存档 vs skillRoot 子树语义」两条产品支线对应（同一 skill 资源类型）。 */
type SkillRegisterTrack = 'hosted' | 'mountable';

function skillTrackFromSearch(sp: URLSearchParams): SkillRegisterTrack {
  return sp.get('skillTrack') === 'mountable' ? 'mountable' : 'hosted';
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
  skill: '技能请先上传包（zip/tar.gz/单 Markdown 等）；远程 HTTP 工具请走 MCP。',
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
const SKILL_MODE_OPTIONS = [
  { value: 'TOOL', label: 'TOOL' },
  { value: 'CHAT', label: 'CHAT' },
  { value: 'SUBAGENT', label: 'SUBAGENT' },
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
  const [skillRegisterTrack, setSkillRegisterTrack] = useState<SkillRegisterTrack>(() =>
    resourceType === 'skill' ? skillTrackFromSearch(searchParams) : 'hosted',
  );
  const [skillPackUrl, setSkillPackUrl] = useState('');
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
    categoryId: '',
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
    parentResourceId: '',
    displayTemplate: '',
    relatedResourceIds: '',
    artifactUri: '',
    entryDoc: 'SKILL.md',
    manifestJson: '{}',
    skillIsPublic: false,
    packValidationStatus: 'none',
    packValidationMessage: '',
    artifactSha256: '',
    skillRootPath: '',
    accessPolicy: 'grant_required' as ResourceAccessPolicy,
  });

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

  useEffect(() => {
    if (resourceType !== 'skill' || resourceId) return;
    setSkillRegisterTrack(skillTrackFromSearch(searchParams));
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
        if (
          resourceType === 'skill' &&
          ((item.parentResourceId != null && Number(item.parentResourceId) > 0) ||
            (item.displayTemplate != null && String(item.displayTemplate).trim() !== '') ||
            (item.spec != null && typeof item.spec === 'object' && Object.keys(item.spec).length > 0) ||
            (item.parametersSchema != null &&
              typeof item.parametersSchema === 'object' &&
              Object.keys(item.parametersSchema).length > 0))
        ) {
          setSkillTechOpen(true);
        }
        setForm((prev) => ({
          ...prev,
          resourceCode: item.resourceCode || '',
          displayName: item.displayName || '',
          description: item.description || '',
          sourceType: item.sourceType || 'internal',
          providerId: item.providerId ?? '',
          categoryId: item.categoryId ?? '',
          accessPolicy: normalizeAccessPolicy(item.accessPolicy) ?? 'grant_required',
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
              }
            : {}),
          ...(resourceType === 'skill'
            ? {
                skillType: item.skillType || 'anthropic_v1',
                artifactUri: item.artifactUri || '',
                entryDoc: item.entryDoc || 'SKILL.md',
                manifestJson: item.manifest ? JSON.stringify(item.manifest, null, 2) : '{}',
                skillIsPublic: item.isPublic === true,
                packValidationStatus: item.packValidationStatus || 'none',
                packValidationMessage: item.packValidationMessage || '',
                artifactSha256: item.artifactSha256 || '',
                skillRootPath: item.skillRootPath || '',
                mode: item.mode || prev.mode,
                maxConcurrency: item.maxConcurrency ?? prev.maxConcurrency,
                specJson:
                  item.spec && typeof item.spec === 'object'
                    ? JSON.stringify(item.spec, null, 2)
                    : prev.specJson,
                paramsSchemaJson:
                  item.parametersSchema && typeof item.parametersSchema === 'object'
                    ? JSON.stringify(item.parametersSchema, null, 2)
                    : prev.paramsSchemaJson,
                parentResourceId: item.parentResourceId != null ? String(item.parentResourceId) : '',
                displayTemplate: item.displayTemplate ?? '',
              }
            : {}),
          ...(resourceType === 'dataset' ? { datasetIsPublic: item.isPublic === true } : {}),
        }));
        if (resourceType === 'skill') {
          const root = String(item.skillRootPath || '').trim();
          if (root) setSkillRegisterTrack('mountable');
          else {
            const q = searchParams.get('skillTrack');
            setSkillRegisterTrack(q === 'mountable' ? 'mountable' : 'hosted');
          }
        }
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
  }, [resourceId, resourceType, searchParams, showMessage]);

  const setSkillTrackInUrl = (t: SkillRegisterTrack) => {
    setSkillRegisterTrack(t);
    const next = new URLSearchParams(searchParams);
    next.set('skillTrack', t);
    navigate({ pathname: location.pathname, search: next.toString() }, { replace: true });
  };

  const skillRegisterGuideLine = useMemo(
    () =>
      resourceType === 'skill'
        ? skillRegisterTrack === 'hosted'
          ? '托管分发：安全扫描后原样存档，可下载制品；技能根目录通常留空（整包）。'
          : '可挂载智能体：先填写 zip 内技能根子目录再上传；语义校验与 resolve 的 skillRootPath 仅针对该子树。'
        : TYPE_GUIDE_ONE_LINE[resourceType],
    [resourceType, skillRegisterTrack],
  );

  const skillHasArtifact = useMemo(
    () => resourceType === 'skill' && Boolean(form.artifactUri?.trim()),
    [resourceType, form.artifactUri],
  );

  const skillEchoVisible = useMemo(
    () => resourceType === 'skill' && skillPackEcho != null && !form.artifactUri?.trim(),
    [resourceType, skillPackEcho, form.artifactUri],
  );

  const validate = useMemo(() => {
    if (!resourceId && !user?.id) return '请先登录后再注册资源';
    if (!form.resourceCode.trim()) return '请填写资源编码（resourceCode）';
    if (!form.displayName.trim()) return '请填写显示名称（displayName）';
    if (!/^[a-zA-Z0-9_-]{3,64}$/.test(form.resourceCode.trim())) {
      return '资源编码（resourceCode）需满足 3-64 位，仅支持字母、数字、下划线和短横线';
    }
    if (resourceType === 'mcp') {
      if (!form.endpoint.trim()) return '请填写服务地址（endpoint）';
      const activeTransport = modeToTransport(form.mcpRegisterMode);
      if (activeTransport === 'websocket') {
        if (!isValidWsUrl(form.endpoint.trim())) {
          return '当 transport=websocket 时，endpoint 必须是 ws:// 或 wss:// URL';
        }
      } else if (activeTransport === 'stdio') {
        if (!isValidUrl(form.endpoint.trim())) {
          return 'stdio 边车须将本机 HTTP 转发地址填入 endpoint，且须为 http:// 或 https:// URL';
        }
      } else if (!isValidUrl(form.endpoint.trim())) {
        return '当 transport=http 时，endpoint 必须是 http:// 或 https:// URL';
      }
      if (form.protocol.trim() && form.protocol.trim().toLowerCase() !== 'mcp') {
        return 'MCP 资源 protocol 建议固定为 mcp';
      }
      const authParsed = parseJsonObject(form.authConfigJson, '鉴权配置（authConfig JSON）');
      if (form.authConfigJson.trim()) {
        if (!authParsed.ok) return authParsed.message;
      }
      if (form.authType === 'oauth2_client') {
        if (!authParsed.ok || !authParsed.data) return 'oauth2_client 须填写合法 authConfig JSON';
        const d = authParsed.data;
        const tokenUrl = String(d.tokenUrl ?? d.token_url ?? '').trim();
        const clientId = String(d.clientId ?? d.client_id ?? '').trim();
        const secret = String(d.clientSecret ?? d.client_secret ?? '').trim();
        const secretRef = String(d.clientSecretRef ?? '').trim();
        if (!tokenUrl) return 'oauth2_client 需要 auth_config.tokenUrl';
        if (!clientId) return 'oauth2_client 需要 auth_config.clientId';
        if (!secret && !secretRef) return 'oauth2_client 需要 clientSecret 或 clientSecretRef';
      }
      if (form.authType === 'basic') {
        if (!authParsed.ok || !authParsed.data) return 'basic 须填写合法 authConfig JSON';
        const d = authParsed.data;
        const user = String(d.username ?? '').trim();
        const password = String(d.password ?? '').trim();
        const passwordRef = String(d.passwordSecretRef ?? '').trim();
        if (!user) return 'basic 需要 auth_config.username';
        if (!password && !passwordRef) return 'basic 需要 password 或 passwordSecretRef';
      }
    }
    if (resourceType === 'agent') {
      if (!form.agentType.trim()) return '请填写智能体类型（agentType）';
      const specParsed = parseJsonObject(form.specJson, '规格配置（spec JSON）');
      if (!specParsed.ok) return specParsed.message;
      const specUrl = typeof specParsed.data?.url === 'string' ? specParsed.data.url.trim() : '';
      if (!specUrl) return '智能体规格配置（spec JSON）中必须包含 url';
      if (!isValidUrl(specUrl)) return '智能体规格配置中的 url 必须是有效的 http/https URL';
      const related = parseRelatedIds(form.relatedResourceIds);
      if (related.invalidTokens.length > 0) {
        return `关联资源 ID 仅支持正整数（逗号分隔），非法值：${related.invalidTokens.join(', ')}`;
      }
      if (!Number.isFinite(Number(form.maxConcurrency)) || Number(form.maxConcurrency) < 1 || Number(form.maxConcurrency) > 1000) {
        return '最大并发（maxConcurrency）必须在 1~1000 之间';
      }
      if (form.agentMaxSteps.trim()) {
        const n = Number(form.agentMaxSteps.trim());
        if (!Number.isInteger(n) || n < 1) return 'maxSteps 须为正整数或留空';
      }
      if (form.agentTemperature.trim()) {
        const t = Number(form.agentTemperature.trim());
        if (!Number.isFinite(t)) return 'temperature 须为有效数字或留空';
      }
    }
    if (resourceType === 'skill') {
      if (skillRegisterTrack === 'mountable' && !form.skillRootPath.trim()) {
        return '可挂载支线：请填写技能根目录（zip 内相对路径）';
      }
      if (!form.skillType.trim()) return '请选择技能包格式（skillType）';
      const st = form.skillType.trim().toLowerCase();
      if (!['anthropic_v1', 'folder_v1'].includes(st)) {
        return 'skillType 须为 anthropic_v1 或 folder_v1；可远程调用的 HTTP 工具请注册为 MCP 资源';
      }
      const specParsed = parseJsonObject(form.specJson, '附加元数据（spec JSON，可空对象）');
      if (!specParsed.ok) return specParsed.message;
      const schemaParsed = parseJsonObject(form.paramsSchemaJson, '参数结构（parametersSchema JSON）');
      if (!schemaParsed.ok) return schemaParsed.message;
      const manifestParsed = parseJsonObject(form.manifestJson, 'manifest JSON');
      if (!manifestParsed.ok) return manifestParsed.message;
      const uri = form.artifactUri.trim();
      if (uri && !isValidUrl(uri) && !uri.startsWith('/uploads/')) {
        return 'artifactUri 须为 http(s) URL 或由上传生成的 /uploads/... 路径';
      }
      if (form.parentResourceId.trim() && !/^\d+$/.test(form.parentResourceId.trim())) {
        return '父资源 ID（parentResourceId）须为正整数或留空';
      }
    }
    if (resourceType === 'app') {
      if (!form.appUrl.trim()) return '请填写应用地址（appUrl）';
      if (!isValidUrl(form.appUrl.trim())) return '应用地址（appUrl）必须是有效的 http/https URL';
      if (!form.embedType.trim()) return '请选择嵌入方式（embedType）';
      const appEt = form.embedType.trim().toLowerCase();
      if (!['iframe', 'redirect', 'micro_frontend'].includes(appEt)) {
        return 'embedType 必须是 iframe、redirect 或 micro_frontend（与后端一致）';
      }
      if (form.appIcon.trim() && !isValidUrl(form.appIcon.trim())) {
        return '图标 URL（icon）必须是有效的 http/https URL';
      }
      const related = parseRelatedIds(form.relatedResourceIds);
      if (related.invalidTokens.length > 0) {
        return `关联资源 ID 仅支持正整数（逗号分隔），非法值：${related.invalidTokens.join(', ')}`;
      }
    }
    if (resourceType === 'dataset') {
      if (!form.dataType.trim()) return '请填写数据类型（dataType）';
      if (!form.format.trim()) return '请填写数据格式（format）';
      if (Number(form.recordCount) < 0) return '记录数（recordCount）不能小于 0';
      if (Number(form.fileSize) < 0) return '文件大小（fileSize）不能小于 0';
    }
    return '';
  }, [
    form.agentType,
    form.agentMaxSteps,
    form.agentTemperature,
    form.parentResourceId,
    form.appIcon,
    form.appIsPublic,
    form.appScreenshotsText,
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
    skillRegisterTrack,
    form.mode,
    form.sourceType,
    form.categoryId,
    form.specJson,
    form.manifestJson,
    form.artifactUri,
    form.paramsSchemaJson,
    resourceId,
    resourceType,
    user?.id,
  ]);

  const buildPayload = (): ResourceUpsertRequest => {
    const providerIdRaw = resourceId ? (form.providerId.trim() || user?.id) : user?.id;
    const providerIdNum = Number(providerIdRaw);
    const categoryIdNum = Number(form.categoryId.trim());
    const ap = normalizeAccessPolicy(form.accessPolicy) ?? 'grant_required';
    const baseFields = {
      resourceCode: form.resourceCode.trim(),
      displayName: form.displayName.trim(),
      description: form.description.trim() || undefined,
      sourceType: form.sourceType,
      accessPolicy: ap,
      ...(Number.isFinite(providerIdNum) && providerIdNum > 0 ? { providerId: providerIdNum } : {}),
      ...(form.categoryId.trim() && Number.isFinite(categoryIdNum) && categoryIdNum > 0 ? { categoryId: categoryIdNum } : {}),
    };
    if (resourceType === 'mcp') {
      const acTrim = form.authConfigJson.trim();
      let authConfig: Record<string, unknown> = {};
      if (acTrim) {
        const parsed = parseJsonObject(form.authConfigJson, '鉴权配置（authConfig JSON）');
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
      };
    }
    if (resourceType === 'skill') {
      const parsedSpec = parseJsonObject(form.specJson, '附加元数据（spec JSON）');
      const parsedSchema = parseJsonObject(form.paramsSchemaJson, '参数结构（parametersSchema JSON）');
      const parsedManifest = parseJsonObject(form.manifestJson, 'manifest JSON');
      if (!parsedSpec.ok || !parsedSchema.ok || !parsedManifest.ok) {
        throw new Error(!parsedSpec.ok ? parsedSpec.message : !parsedSchema.ok ? parsedSchema.message : parsedManifest.message);
      }
      const specObj = parsedSpec.data || {};
      const manifestObj = parsedManifest.data || {};
      const prTrim = form.parentResourceId.trim();
      const parentResourceIdNum = prTrim ? Number(prTrim) : NaN;
      return {
        ...baseFields,
        resourceType: 'skill',
        skillType: form.skillType.trim(),
        mode: form.mode,
        artifactUri: form.artifactUri.trim() || undefined,
        artifactSha256: form.artifactSha256.trim() || undefined,
        manifest: Object.keys(manifestObj).length > 0 ? manifestObj : undefined,
        entryDoc: form.entryDoc.trim() || undefined,
        skillRootPath: form.skillRootPath.trim(),
        spec: Object.keys(specObj).length > 0 ? specObj : {},
        parametersSchema: parsedSchema.data || {},
        ...(Number.isFinite(parentResourceIdNum) && parentResourceIdNum > 0 ? { parentResourceId: parentResourceIdNum } : {}),
        ...(form.displayTemplate.trim() ? { displayTemplate: form.displayTemplate.trim() } : {}),
        isPublic: form.skillIsPublic,
        maxConcurrency: Number(form.maxConcurrency) || 10,
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
      return {
        ...baseFields,
        resourceType: 'agent',
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
      mode: vo.mode || prev.mode,
      maxConcurrency: vo.maxConcurrency ?? prev.maxConcurrency,
    }));
    if (!resourceId && vo.id) {
      const nextSearch = new URLSearchParams(searchParams);
      nextSearch.set('skillTrack', skillRegisterTrack);
      const base = location.pathname.replace(/\/+$/, '');
      navigate(
        { pathname: `${base}/${vo.id}`, search: nextSearch.toString() },
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
      showMessage('请输入可直链下载的技能包地址（HTTPS，zip/tar.gz 等）', 'error');
      return;
    }
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
    if (validate) {
      showMessage(validate, 'error');
      return;
    }
    if (submitAfterSave && resourceType === 'skill') {
      if (!form.artifactUri.trim()) {
        showMessage('提交审核前须已上传技能包（具备 artifactUri）。', 'error');
        return;
      }
    }
    setLoading(true);
    try {
      let id = resourceId;
      const payload = buildPayload();
      if (resourceId) {
        const updated = await resourceCenterService.update(resourceId, payload);
        id = updated.id;
      } else {
        const created = await resourceCenterService.create(payload);
        id = created.id;
      }
      if (submitAfterSave && id) {
        const submitted = await resourceCenterService.submit(id);
        showMessage(submitted.statusHint || '保存并提审成功（状态 pending_review）', 'success');
      } else {
        showMessage('保存成功', 'success');
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
      description={skillRegisterGuideLine}
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
        <div className={`${bentoCard(theme)} overflow-hidden`}>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <div
                className={`rounded-xl border px-3 py-2 text-xs ${
                  validate
                    ? isDark
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                      : 'border-amber-300 bg-amber-50 text-amber-800'
                    : isDark
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                }`}
              >
                {validate || '校验通过'}
              </div>
            </div>
            <Field label="资源编码 *">
              <input
                value={form.resourceCode}
                onChange={(e) => setForm((p) => ({ ...p, resourceCode: e.target.value }))}
                className={inputClass(isDark)}
                title="3–64 位，字母数字下划线或短横线"
                placeholder="唯一标识，如 weather-tool"
              />
            </Field>
            <Field label="显示名称 *">
              <input
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                className={inputClass(isDark)}
                placeholder="列表与详情中展示的名称"
              />
            </Field>
            <Field label="描述（选填）" full>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className={inputClass(isDark)}
                placeholder="用途与场景简述（选填）"
              />
            </Field>
            <Field label="目录标签（选填）">
              <LantuSelect
                theme={theme}
                value={form.categoryId}
                onChange={(v) => setForm((p) => ({ ...p, categoryId: v }))}
                options={tagOptions}
                placeholder="不选"
              />
            </Field>
            <Field label="消费策略（API Key + Grant）" full>
              <LantuSelect
                theme={theme}
                value={form.accessPolicy}
                onChange={(v) =>
                  setForm((p) => ({ ...p, accessPolicy: (normalizeAccessPolicy(v) ?? 'grant_required') as ResourceAccessPolicy }))
                }
                options={[
                  { value: 'grant_required', label: '须 Grant（默认，严格）' },
                  { value: 'open_org', label: '同部门免 Grant' },
                  { value: 'open_platform', label: '租户内免 Grant（谨慎）' },
                ]}
                placeholder="grant_required"
              />
              <p className={`mt-1.5 text-[11px] leading-relaxed ${textMuted(theme)}`}>
                {accessPolicyHelpLines()[form.accessPolicy] ?? accessPolicyHelpLines().grant_required}
              </p>
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
                  <Field label="来源类型">
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
                <Field label="注册方式">
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
                <Field label="传输方式">
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
                      { value: 'http', label: 'HTTP / SSE（http）' },
                      { value: 'websocket', label: 'WebSocket（websocket）' },
                      { value: 'stdio', label: 'stdio 边车（stdio）' },
                    ]}
                  />
                </Field>
                <Field label="服务地址 *" full>
                  <input
                    value={form.endpoint}
                    onChange={(e) => setForm((p) => ({ ...p, endpoint: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder={
                      modeToTransport(form.mcpRegisterMode) === 'websocket'
                        ? 'ws://localhost:5001/mcp'
                        : modeToTransport(form.mcpRegisterMode) === 'stdio'
                          ? 'https://127.0.0.1:9847/mcp 或内网边车地址'
                          : 'http://localhost:5000/mcp'
                    }
                  />
                </Field>
                <Field label="协议">
                  <input value="mcp" readOnly className={inputClass(isDark)} />
                </Field>
                <Field label="鉴权方式">
                  <ThemedSelect
                    isDark={isDark}
                    value={form.authType}
                    onChange={(value) => setForm((p) => ({ ...p, authType: value }))}
                    options={[
                      { value: 'none', label: '无鉴权（none）' },
                      { value: 'api_key', label: 'API Key（api_key）' },
                      { value: 'bearer', label: 'Bearer Token（bearer）' },
                      { value: 'basic', label: 'HTTP Basic（basic）' },
                      { value: 'oauth2_client', label: 'OAuth2 Client Credentials（oauth2_client）' },
                    ]}
                  />
                </Field>
                <Field
                  label="鉴权配置（JSON）"
                  full
                >
                  <p className={`mb-2 text-[11px] ${textMuted(theme)}`}>详见到接入指南；可点击下方模板快速填入。</p>
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
                  <textarea
                    value={form.authConfigJson}
                    onChange={(e) => setForm((p) => ({ ...p, authConfigJson: e.target.value }))}
                    rows={5}
                    className={`${inputClass(isDark)} font-mono text-xs`}
                    placeholder={DEFAULT_MCP_AUTH_CONFIG_JSON}
                  />
                </Field>
              </>
            )}

            {resourceType === 'agent' && (
              <>
                <Field label="智能体类型">
                  <ThemedSelect
                    isDark={isDark}
                    value={form.agentType}
                    onChange={(value) => setForm((p) => ({ ...p, agentType: value }))}
                    options={AGENT_TYPE_OPTIONS}
                  />
                </Field>
                <Field label="运行模式">
                  <ThemedSelect
                    isDark={isDark}
                    value={form.mode}
                    onChange={(value) => setForm((p) => ({ ...p, mode: value }))}
                    options={AGENT_MODE_OPTIONS}
                  />
                </Field>
                <Field label="规格（JSON，须含 url）" full>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary(theme)} onClick={() => setForm((p) => ({ ...p, specJson: DEFAULT_AGENT_SPEC_JSON }))}>
                      填入示例
                    </button>
                  </div>
                  <textarea
                    value={form.specJson}
                    onChange={(e) => setForm((p) => ({ ...p, specJson: e.target.value }))}
                    rows={4}
                    className={`${inputClass(isDark)} font-mono text-xs`}
                    placeholder='{"url":"https://…","timeout":30}'
                  />
                </Field>
                <Field label="最大并发">
                  <input
                    type="number"
                    value={form.maxConcurrency}
                    onChange={(e) => setForm((p) => ({ ...p, maxConcurrency: Number(e.target.value) || 1 }))}
                    className={inputClass(isDark)}
                    placeholder="1–1000"
                  />
                </Field>
                <Field label="系统提示词（选填）" full>
                  <textarea
                    value={form.systemPrompt}
                    onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
                    rows={3}
                    className={inputClass(isDark)}
                    placeholder="角色与回答约束（选填）"
                  />
                </Field>
                <Field label="关联资源 ID（选填）">
                  <input
                    value={form.relatedResourceIds}
                    onChange={(e) => setForm((p) => ({ ...p, relatedResourceIds: e.target.value }))}
                    className={inputClass(isDark)}
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
                    <span>高级：公开 / 隐藏 / maxSteps / temperature（与后端入参一致）</span>
                    <ChevronDown size={16} className={agentAdvancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                  {agentAdvancedOpen ? (
                    <div className="mt-2 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                      <Field label="对外公开（isPublic）">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.agentIsPublic}
                            onChange={(e) => setForm((p) => ({ ...p, agentIsPublic: e.target.checked }))}
                            className="rounded border-slate-400"
                          />
                          <span className={textMuted(theme)}>在目录中可按公开策略展示</span>
                        </label>
                      </Field>
                      <Field label="目录外隐藏（hidden）">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.agentHidden}
                            onChange={(e) => setForm((p) => ({ ...p, agentHidden: e.target.checked }))}
                            className="rounded border-slate-400"
                          />
                          <span className={textMuted(theme)}>与后端 hidden 一致</span>
                        </label>
                      </Field>
                      <Field label="maxSteps（选填）">
                        <input
                          value={form.agentMaxSteps}
                          onChange={(e) => setForm((p) => ({ ...p, agentMaxSteps: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="正整数，留空表示不限制"
                          inputMode="numeric"
                        />
                      </Field>
                      <Field label="temperature（选填）">
                        <input
                          value={form.agentTemperature}
                          onChange={(e) => setForm((p) => ({ ...p, agentTemperature: e.target.value }))}
                          className={inputClass(isDark)}
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
                <div
                  className={`md:col-span-2 rounded-xl border px-4 py-3 ${
                    isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'
                  }`}
                >
                  <p className={`text-xs font-semibold ${textPrimary(theme)}`}>技能注册支线</p>
                  <p className={`mt-1 text-[11px] leading-relaxed ${textMuted(theme)}`}>
                    后端仍是同一「技能」资源类型；此处按使用场景拆分说明。托管侧重存档与审核，可挂载侧重智能体侧单技能语义（skillRoot 子树）。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSkillTrackInUrl('hosted')}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        skillRegisterTrack === 'hosted'
                          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                          : isDark
                            ? 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                      }`}
                    >
                      托管分发（制品存档）
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkillTrackInUrl('mountable')}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        skillRegisterTrack === 'mountable'
                          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                          : isDark
                            ? 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                      }`}
                    >
                      可挂载智能体（skillRoot）
                    </button>
                  </div>
                </div>
                <div
                  className={`md:col-span-2 rounded-xl border px-4 py-3 text-sm ${
                    skillHasArtifact
                      ? isDark
                        ? 'border-solid border-emerald-500/35 bg-emerald-500/[0.08]'
                        : 'border-solid border-emerald-300 bg-emerald-50/80'
                      : `border-dashed ${isDark ? 'border-white/15' : 'border-slate-300'}`
                  }`}
                >
                  <div className={`mb-2 flex flex-wrap items-center justify-between gap-2 ${textPrimary(theme)}`}>
                    <span className="font-medium">
                      {skillRegisterTrack === 'hosted'
                        ? '技能包（zip / tar.gz …）· 原样入库；状态徽章表示在「整包或所选子树」上的 Anthropic 语义自检结果'
                        : '技能包 · 请先填写下方技能根目录，再上传 / URL 导入；「valid」表示该子树满足单技能挂载语义'}
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
                      {form.packValidationStatus || 'none'}
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
                              <p className={`break-all font-mono text-[11px] leading-snug ${textMuted(theme)}`}>
                                <span className="opacity-90">制品路径 </span>
                                {truncateSkillArtifactPath(form.artifactUri.trim(), 72)}
                              </p>
                              {form.artifactSha256.trim() ? (
                                <p className={`font-mono text-[11px] ${textMuted(theme)}`}>
                                  SHA-256 {form.artifactSha256.trim().slice(0, 20)}…
                                </p>
                              ) : null}
                              <p className={`text-[11px] ${textMuted(theme)}`}>
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
                  <div className={`mb-3 ${textMuted(theme)}`}>
                    <label className="mb-1 block text-xs font-medium text-current">
                      {skillRegisterTrack === 'mountable' ? '技能根目录（zip 内相对路径）*' : '技能根目录（可选）'}
                    </label>
                    <input
                      type="text"
                      value={form.skillRootPath}
                      onChange={(e) => setForm((p) => ({ ...p, skillRootPath: e.target.value }))}
                      disabled={loading}
                      placeholder={
                        skillRegisterTrack === 'mountable'
                          ? '如 my-package/sub-skill — 须与包内目录一致'
                          : '一般留空（整包）；monorepo 多技能时可填子目录'
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-sm ${
                        isDark ? 'border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                    <p className={`mt-1 text-[11px] leading-relaxed ${textMuted(theme)}`}>
                      {skillRegisterTrack === 'mountable'
                        ? '本支线以该子树为技能根：SKILL.md 校验、resolve 的 skillRootPath、网关挂载范围均针对此路径。上传前请填好。'
                        : '留空时按整包做安全扫描与可选语义校验；仅当包内含多个并列技能、需指定其一作为制品语义边界时再填写。'}
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
                        type="url"
                        value={skillPackUrl}
                        onChange={(e) => setSkillPackUrl(e.target.value)}
                        disabled={loading}
                        className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm ${
                          isDark ? 'border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                        }`}
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
                <Field label="包格式">
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
                <Field label="运行模式">
                  <ThemedSelect
                    isDark={isDark}
                    value={form.mode}
                    onChange={(value) => setForm((p) => ({ ...p, mode: value }))}
                    options={SKILL_MODE_OPTIONS}
                  />
                </Field>
                <Field label="对外公开">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.skillIsPublic}
                      onChange={(e) => setForm((p) => ({ ...p, skillIsPublic: e.target.checked }))}
                      className="rounded border-slate-400"
                    />
                    <span className={textMuted(theme)}>在目录中可按公开策略展示</span>
                  </label>
                </Field>

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
                      <Field label="制品地址">
                        <input
                          value={form.artifactUri}
                          onChange={(e) => setForm((p) => ({ ...p, artifactUri: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="上传后自动填充，或手填 URL"
                        />
                      </Field>
                      <Field label="SHA-256（只读）">
                        <input value={form.artifactSha256} readOnly className={`${inputClass(isDark)} opacity-80`} placeholder="—" />
                      </Field>
                      <Field label="最大并发">
                        <input
                          type="number"
                          value={form.maxConcurrency}
                          onChange={(e) => setForm((p) => ({ ...p, maxConcurrency: Number(e.target.value) || 10 }))}
                          className={inputClass(isDark)}
                          placeholder="默认 10"
                        />
                      </Field>
                      <Field label="父资源 ID（parentResourceId）">
                        <input
                          value={form.parentResourceId}
                          onChange={(e) => setForm((p) => ({ ...p, parentResourceId: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="选填：挂载的 MCP 等资源 id"
                          inputMode="numeric"
                        />
                      </Field>
                      <Field label="展示模板（displayTemplate）">
                        <input
                          value={form.displayTemplate}
                          onChange={(e) => setForm((p) => ({ ...p, displayTemplate: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="选填：file / image / answer …"
                        />
                      </Field>
                      <Field label="入口文档">
                        <input
                          value={form.entryDoc}
                          onChange={(e) => setForm((p) => ({ ...p, entryDoc: e.target.value }))}
                          className={inputClass(isDark)}
                          placeholder="SKILL.md"
                        />
                      </Field>
                      <Field label="manifest JSON" full>
                        <textarea
                          value={form.manifestJson}
                          onChange={(e) => setForm((p) => ({ ...p, manifestJson: e.target.value }))}
                          rows={4}
                          className={`${inputClass(isDark)} font-mono text-xs`}
                        />
                      </Field>
                      <Field label="spec JSON" full>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <button type="button" className={btnSecondary(theme)} onClick={() => setForm((p) => ({ ...p, specJson: DEFAULT_SKILL_SPEC_JSON }))}>
                            置为 {}
                          </button>
                        </div>
                        <textarea value={form.specJson} onChange={(e) => setForm((p) => ({ ...p, specJson: e.target.value }))} rows={3} className={`${inputClass(isDark)} font-mono text-xs`} />
                      </Field>
                      <Field label="parametersSchema JSON" full>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={btnSecondary(theme)}
                            onClick={() => setForm((p) => ({ ...p, paramsSchemaJson: DEFAULT_SKILL_PARAMS_SCHEMA_JSON }))}
                          >
                            示例模板
                          </button>
                        </div>
                        <textarea value={form.paramsSchemaJson} onChange={(e) => setForm((p) => ({ ...p, paramsSchemaJson: e.target.value }))} rows={4} className={`${inputClass(isDark)} font-mono text-xs`} />
                      </Field>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {resourceType === 'app' && (
              <>
                <Field label="应用地址 *">
                  <input
                    value={form.appUrl}
                    onChange={(e) => setForm((p) => ({ ...p, appUrl: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="打开方式">
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
                <Field label="图标 URL（选填）">
                  <input
                    value={form.appIcon}
                    onChange={(e) => setForm((p) => ({ ...p, appIcon: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="截图 URL（选填，每行一条）" full>
                  <textarea
                    value={form.appScreenshotsText}
                    onChange={(e) => setForm((p) => ({ ...p, appScreenshotsText: e.target.value }))}
                    rows={4}
                    className={`${inputClass(isDark)} font-mono text-xs`}
                  />
                </Field>
                <Field label="对外公开">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.appIsPublic}
                      onChange={(e) => setForm((p) => ({ ...p, appIsPublic: e.target.checked }))}
                      className="rounded border-slate-400"
                    />
                    <span className={textMuted(theme)}>公开可见</span>
                  </label>
                </Field>
                <Field label="关联资源 ID（选填）">
                  <input
                    value={form.relatedResourceIds}
                    onChange={(e) => setForm((p) => ({ ...p, relatedResourceIds: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder="如 12, 34"
                  />
                </Field>
              </>
            )}

            {resourceType === 'dataset' && (
              <>
                <Field label="数据类型 *">
                  <ThemedSelect
                    isDark={isDark}
                    value={form.dataType}
                    onChange={(value) => setForm((p) => ({ ...p, dataType: value }))}
                    options={DATASET_DATA_TYPE_OPTIONS}
                  />
                </Field>
                <Field label="数据格式 *">
                  <ThemedSelect
                    isDark={isDark}
                    value={form.format}
                    onChange={(value) => setForm((p) => ({ ...p, format: value }))}
                    options={DATASET_FORMAT_OPTIONS}
                  />
                </Field>
                <Field label="记录数（约）">
                  <input
                    type="number"
                    value={form.recordCount}
                    onChange={(e) => setForm((p) => ({ ...p, recordCount: Number(e.target.value) || 0 }))}
                    className={inputClass(isDark)}
                    placeholder="0"
                  />
                </Field>
                <Field label="体积（与后端一致的数值，见接入指南）">
                  <input
                    type="number"
                    value={form.fileSize}
                    onChange={(e) => setForm((p) => ({ ...p, fileSize: Number(e.target.value) || 0 }))}
                    className={inputClass(isDark)}
                    placeholder="0"
                  />
                </Field>
                <Field label="标签（选填，逗号分隔）" full>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                    className={inputClass(isDark)}
                    placeholder="如 教务, 公开数据"
                  />
                </Field>
                <Field label="对外公开（isPublic）">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.datasetIsPublic}
                      onChange={(e) => setForm((p) => ({ ...p, datasetIsPublic: e.target.checked }))}
                      className="rounded border-slate-400"
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

const Field: React.FC<{ label: string; children: React.ReactNode; full?: boolean }> = ({ label, children, full }) => (
  <div className={full ? 'md:col-span-2' : ''}>
    <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
    {children}
  </div>
);

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

function inputClass(isDark: boolean): string {
  return `w-full rounded-xl border px-3 py-2 text-sm outline-none ${
    isDark ? 'border-white/10 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-white text-slate-700'
  }`;
}

function btnGhostStyle(theme: Theme): string {
  return `${btnSecondary(theme)} gap-1`;
}
