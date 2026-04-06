import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import {
  Copy,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Loader2,
  MessageSquare,
  Play,
  Puzzle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type {
  CatalogResourceDetailVO,
  InvokeRequest,
  InvokeResponse,
  ResourceCatalogItemVO,
  ResourceResolveVO,
} from '../../types/dto/catalog';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { AccessPolicyBadge } from '../../components/business/AccessPolicyBadge';
import { invokeService } from '../../api/services/invoke.service';
import { sdkService } from '../../api/services/sdk.service';
import { userActivityService } from '../../api/services/user-activity.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { MAX_STORED_API_KEY_LENGTH, readBoundedLocalStorage } from '../../lib/safeStorage';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import { resolvePersonDisplay } from '../../utils/personDisplay';
import { lantuCheckboxPrimaryClass, nativeInputClass } from '../../utils/formFieldClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { AutoHeightTextarea } from '../../components/common/AutoHeightTextarea';
import { MarketplaceListingCard, MarketplaceStatItem } from '../../components/market';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { ResourceMarketDetailShell } from '../../components/market';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  btnPrimary,
  btnSecondary,
  canvasBodyBg,
  consoleContentTopPad,
  iconMuted,
  mainScrollPadBottom,
  mainScrollPadX,
  statusBadgeClass,
  statusDot,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageSkeleton } from '../../components/common/PageSkeleton';
import { MarkdownView } from '../../components/common/MarkdownView';
import { ApiException } from '../../types/api';
import { env } from '../../config/env';
import { buildPath } from '../../constants/consoleRoutes';
import { MARKET_HERO_TITLE_CLASSES } from '../../constants/theme';
import { invokeGatewayStatusLabelZh } from '../../utils/backendEnumLabels';

const API_PATH_PREFIX = env.VITE_API_BASE_URL.replace(/\/$/, '');

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  /** 路径 `/user/mcp-center/:id` 时由 MainLayout 传入，全页详情 */
  detailResourceId?: string | null;
}

function tryParseJsonObject(input: string): { ok: true; payload?: Record<string, unknown>; message?: string } | { ok: false; message: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true };
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: '调用参数必须是 JSON 对象' };
    }
    return { ok: true, payload: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, message: '调用参数 JSON 解析失败' };
  }
}

function newTraceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const MCP_JSONRPC_METHODS = [
  'initialize',
  'notifications/initialized',
  'tools/list',
  'tools/call',
] as const;

const MCP_METHOD_LABELS: Record<(typeof MCP_JSONRPC_METHODS)[number], string> = {
  initialize: '初始化握手',
  'notifications/initialized': '通知已就绪',
  'tools/list': '获取工具列表',
  'tools/call': '调用工具',
};

const MCP_METHOD_PARAM_EXAMPLES: Record<string, Record<string, unknown>> = {
  initialize: {},
  'notifications/initialized': {},
  'tools/list': {},
  'tools/call': {
    name: 'your_tool_name',
    arguments: {
      input: 'example',
    },
  },
};

const MCP_PARAM_PRESETS: McpParamPreset[] = [
  { id: 'initialize-basic', label: '初始化（空参数）', method: 'initialize', params: {} },
  { id: 'notification-ready', label: '通知已就绪（空参数）', method: 'notifications/initialized', params: {} },
  { id: 'tools-list-basic', label: '获取工具列表（空参数）', method: 'tools/list', params: {} },
  {
    id: 'tools-call-generic',
    label: '调用工具（通用占位）',
    method: 'tools/call',
    params: { name: 'your_tool_name', arguments: { input: 'example' } },
  },
  {
    id: 'tools-call-pagination',
    label: '调用工具（分页示例）',
    method: 'tools/call',
    params: { name: 'your_tool_name', arguments: { page: 1, pageSize: 20 } },
  },
  {
    id: 'tools-call-by-id',
    label: '调用工具（按ID查询）',
    method: 'tools/call',
    params: { name: 'your_tool_name', arguments: { id: 'replace-with-id' } },
  },
];

function getMethodParamExample(method: string): Record<string, unknown> {
  return MCP_METHOD_PARAM_EXAMPLES[method] ?? {};
}

function getDefaultPresetIdByMethod(method: string): string {
  return MCP_PARAM_PRESETS.find((preset) => preset.method === method)?.id ?? 'custom';
}

const DEFAULT_MCP_PAYLOAD_TEXT = '{\n  "method": "initialize",\n  "params": {}\n}';

type McpPayloadMode = 'simple' | 'advanced';
type InvokeGatewayMode = 'invoke' | 'sdk';
type McpDetailTab = 'service' | 'invoke' | 'reviews';
type McpParamPreset = {
  id: string;
  label: string;
  method: string;
  params: Record<string, unknown>;
};

function isWebSocketMcpResolved(resolved: ResourceResolveVO): boolean {
  const ep = resolved.endpoint?.trim().toLowerCase() ?? '';
  if (ep.startsWith('ws://') || ep.startsWith('wss://')) return true;
  const t = resolved.spec?.transport;
  return typeof t === 'string' && t.toLowerCase() === 'websocket';
}

function tryFormatJsonText(raw: string): { asJson: boolean; text: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { asJson: false, text: '' };
  try {
    return { asJson: true, text: JSON.stringify(JSON.parse(trimmed), null, 2) };
  } catch {
    return { asJson: false, text: raw };
  }
}

/** 从响应体解析 JSON-RPC error（支持整段 JSON 或 NDJSON 末行）。 */
function parseJsonRpcErrorFromBody(raw: string): { code: number; message: string; data?: unknown } | null {
  const tryOne = (trimmed: string): { code: number; message: string; data?: unknown } | null => {
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      const o = parsed as Record<string, unknown>;
      if (!('jsonrpc' in o)) return null;
      if (o.error == null || typeof o.error !== 'object' || Array.isArray(o.error)) return null;
      const err = o.error as Record<string, unknown>;
      const code = typeof err.code === 'number' ? err.code : -1;
      const message = typeof err.message === 'string' ? err.message : 'Unknown error';
      return { code, message, data: err.data };
    } catch {
      return null;
    }
  };

  const trimmed = raw.trim();
  if (!trimmed) return null;
  const whole = tryOne(trimmed);
  if (whole) return whole;
  const lines = raw.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const e = tryOne(lines[i]!.trim());
    if (e) return e;
  }
  return null;
}


export const McpMarket: React.FC<Props> = ({ theme, fontSize, themeColor: _themeColor, showMessage, detailResourceId }) => {
  const navigate = useNavigate();
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [rows, setRows] = useState<ResourceCatalogItemVO[]>([]);
  const [detail, setDetail] = useState<CatalogResourceDetailVO | null>(null);
  const [mcpPayloadMode, setMcpPayloadMode] = useState<McpPayloadMode>('simple');
  const [mcpMethod, setMcpMethod] = useState<string>(MCP_JSONRPC_METHODS[0]);
  const [mcpParamsJson, setMcpParamsJson] = useState(() => JSON.stringify(getMethodParamExample(MCP_JSONRPC_METHODS[0]), null, 2));
  const [mcpPresetId, setMcpPresetId] = useState<string>(() => getDefaultPresetIdByMethod(MCP_JSONRPC_METHODS[0]));
  const [invokePayload, setInvokePayload] = useState(DEFAULT_MCP_PAYLOAD_TEXT);
  const [invokeGatewayMode, setInvokeGatewayMode] = useState<InvokeGatewayMode>('invoke');
  const [invokeUseStream, setInvokeUseStream] = useState(false);
  const [invokeApiKey, setInvokeApiKey] = useState<string>(
    () => readBoundedLocalStorage('lantu_api_key', MAX_STORED_API_KEY_LENGTH) ?? '',
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [invokeTraceId, setInvokeTraceId] = useState(() => newTraceId());
  const [invokeTimeoutSec, setInvokeTimeoutSec] = useState(60);
  const [invokeResponse, setInvokeResponse] = useState<InvokeResponse | null>(null);
  const [invokeResultMessage, setInvokeResultMessage] = useState<string | null>(null);
  const [invokeResultError, setInvokeResultError] = useState<string | null>(null);
  const [invokeRequestTraceId, setInvokeRequestTraceId] = useState<string>('');
  const [invokeStreamOutput, setInvokeStreamOutput] = useState('');
  const [invoking, setInvoking] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [detailTab, setDetailTab] = useState<McpDetailTab>('service');
  const [detailPageLoading, setDetailPageLoading] = useState(false);
  const [detailPageError, setDetailPageError] = useState<Error | null>(null);
  /** 未按标签筛选时的列表快照，用于侧栏标签数量（筛选后仍显示「上次全量列表」分布） */
  const [tagStatsRows, setTagStatsRows] = useState<ResourceCatalogItemVO[]>([]);

  useEffect(() => {
    tagService.list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'mcp')))
      .catch(() => setCatalogTags([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      /** 与布局改版前一致：GET /catalog/resources + resourceType=mcp + status=published（服务端筛选，不再二次过滤以免状态枚举与后端不一致导致空列表） */
      const data = await resourceCatalogService.list({
        resourceType: 'mcp',
        status: 'published',
        page: 1,
        pageSize: 100,
        tags: tagFilter ? [tagFilter] : undefined,
      });
      setRows(data.list);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载 MCP 市场失败');
      setLoadError(error);
      showMessage?.(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage, tagFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const ridKey = (detailResourceId ?? '').trim();

  const loadMcpDetailByPath = useCallback(async () => {
    if (!ridKey) return;
    setDetailPageLoading(true);
    setDetailPageError(null);
    try {
      const row = await resourceCatalogService.getByTypeAndId('mcp', ridKey);
      setDetail(row);
    } catch (e) {
      setDetail(null);
      setDetailPageError(e instanceof Error ? e : new Error('加载失败'));
    } finally {
      setDetailPageLoading(false);
    }
  }, [ridKey]);

  useEffect(() => {
    if (!ridKey) {
      setDetail(null);
      setDetailPageError(null);
      setDetailPageLoading(false);
      return;
    }
    void loadMcpDetailByPath();
  }, [ridKey, loadMcpDetailByPath]);

  useEffect(() => {
    if (!loading && !loadError && tagFilter == null) {
      setTagStatsRows(rows);
    }
  }, [loading, loadError, tagFilter, rows]);

  useEffect(() => {
    if (!detail) return;
    setMcpPayloadMode('simple');
    setMcpMethod(MCP_JSONRPC_METHODS[0]);
    setMcpParamsJson(JSON.stringify(getMethodParamExample(MCP_JSONRPC_METHODS[0]), null, 2));
    setMcpPresetId(getDefaultPresetIdByMethod(MCP_JSONRPC_METHODS[0]));
    setInvokePayload(DEFAULT_MCP_PAYLOAD_TEXT);
    setInvokeGatewayMode('invoke');
    setInvokeUseStream(false);
    setInvokeStreamOutput('');
    setInvokeTraceId(newTraceId());
    setInvokeTimeoutSec(60);
    setInvokeResponse(null);
    setInvokeResultMessage(null);
    setInvokeResultError(null);
    setInvokeRequestTraceId('');
    setDetailTab('service');
  }, [detail]);

  useEffect(() => {
    if (!detail) {
      setIsFavorited(false);
      return;
    }
    let cancelled = false;
    setIsFavorited(false);
    userActivityService.getFavorites()
      .then((list) => {
        if (cancelled) return;
        const hit = list.some((item) => item.targetType === 'mcp' && String(item.targetId) === String(detail.resourceId));
        setIsFavorited(hit);
      })
      .catch(() => {
        if (!cancelled) setIsFavorited(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  useEffect(() => {
    const key = invokeApiKey.trim();
    try {
      if (key) {
        if (key.length > MAX_STORED_API_KEY_LENGTH) return;
        localStorage.setItem('lantu_api_key', key);
      } else localStorage.removeItem('lantu_api_key');
    } catch {
      /* quota */
    }
  }, [invokeApiKey]);

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((item) => {
      const blob = `${item.displayName} ${item.resourceCode} ${item.description ?? ''} ${(item.tags ?? []).join(' ')}`.toLowerCase();
      return blob.includes(term);
    });
  }, [keyword, rows]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of tagStatsRows) {
      for (const tg of r.tags ?? []) {
        map.set(tg, (map.get(tg) ?? 0) + 1);
      }
    }
    return map;
  }, [tagStatsRows]);

  /** 与目录详情一致：发布者在资源中心「设为当前」的默认解析版本；为空则调用链路与「不指定版本」相同。 */
  const invokeCatalogVersion = useMemo(() => (detail?.version ?? '').trim(), [detail?.version]);

  const listCountLabel = tagStatsRows.length;

  const CategoryNav = ({ className }: { className?: string }) => (
    <nav aria-label="MCP 标签分类" className={className}>
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            aria-current={tagFilter === null ? 'true' : undefined}
            onClick={() => setTagFilter(null)}
            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
              tagFilter === null
                ? isDark
                  ? 'bg-violet-500/20 text-white'
                  : 'bg-violet-100 text-violet-950'
                : `${textSecondary(theme)} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`
            }`}
          >
            <span>全部</span>
            <span className={`tabular-nums text-xs font-medium ${textMuted(theme)}`}>{listCountLabel}</span>
          </button>
        </li>
        {catalogTags.map((t) => {
          const n = tagCounts.get(t.name) ?? 0;
          const active = tagFilter === t.name;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))}
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                  active
                    ? isDark
                      ? 'bg-violet-500/20 text-white'
                      : 'bg-violet-100 text-violet-950'
                    : `${textSecondary(theme)} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100'}`
                }`}
              >
                <span className="min-w-0 truncate">{t.name}</span>
                <span className={`shrink-0 tabular-nums text-xs font-medium ${textMuted(theme)}`}>{n}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const invokeBodyView = useMemo(
    () => (invokeResponse ? tryFormatJsonText(invokeResponse.body ?? '') : null),
    [invokeResponse],
  );

  const invokeJsonRpcError = useMemo(
    () => (invokeResponse?.body != null ? parseJsonRpcErrorFromBody(invokeResponse.body) : null),
    [invokeResponse],
  );
  const invokeGatewaySuccess = invokeResponse?.status === 'success';

  const copyText = useCallback(async (text: string, successText: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showMessage?.(successText, 'success');
    } catch {
      showMessage?.('复制失败，请稍后重试', 'warning');
    }
  }, [showMessage]);

  const methodPresetOptions = useMemo(
    () => [
      { value: 'custom', label: '自定义（手动编辑）' },
      ...MCP_PARAM_PRESETS.filter((preset) => preset.method === mcpMethod).map((preset) => ({
        value: preset.id,
        label: preset.label,
      })),
    ],
    [mcpMethod],
  );

  const mcpMethodOptions = useMemo(
    () => MCP_JSONRPC_METHODS.map((method) => ({
      value: method,
      label: `${MCP_METHOD_LABELS[method]}（${method}）`,
    })),
    [],
  );

  const buildMcpInvokePayload = useCallback((): { ok: true; payload: Record<string, unknown> } | { ok: false; message: string } => {
    if (mcpPayloadMode === 'advanced') {
      const parsed = tryParseJsonObject(invokePayload);
      if (!parsed.ok) return { ok: false, message: parsed.message };
      const raw = parsed.payload;
      if (!raw || Object.keys(raw).length === 0) {
        return { ok: true, payload: { method: 'initialize', params: {} } };
      }
      return { ok: true, payload: raw };
    }
    const trimmed = mcpParamsJson.trim() || '{}';
    try {
      const params = JSON.parse(trimmed);
      if (params === null || typeof params !== 'object' || Array.isArray(params)) {
        return { ok: false, message: 'params 须为 JSON 对象' };
      }
      return { ok: true, payload: { method: mcpMethod, params } };
    } catch {
      return { ok: false, message: 'params JSON 解析失败' };
    }
  }, [invokePayload, mcpMethod, mcpParamsJson, mcpPayloadMode]);

  const validateInvokeRequest = useCallback((payload: Record<string, unknown>): string | null => {
    if (!invokeApiKey.trim()) return 'API Key 为空，请先填写可用的 X-Api-Key';
    if (!detail?.resourceId) return '资源ID为空，请重新选择资源后重试';
    const maxSec = invokeUseStream ? 600 : 120;
    if (!Number.isFinite(invokeTimeoutSec) || invokeTimeoutSec < 1 || invokeTimeoutSec > maxSec) {
      return invokeUseStream
        ? `超时秒数必须为 1~${maxSec}（流式与网关上限一致）`
        : '超时秒数必须为 1~120 之间的数字';
    }
    const method = payload.method;
    if (typeof method !== 'string' || !method.trim()) return 'payload.method 不能为空';
    const params = payload.params;
    if (params !== undefined && (typeof params !== 'object' || params === null || Array.isArray(params))) {
      return 'payload.params 必须为 JSON 对象';
    }
    if (method === 'tools/call') {
      const obj = (params ?? {}) as Record<string, unknown>;
      if (typeof obj.name !== 'string' || !obj.name.trim()) return 'tools/call 时 params.name 不能为空';
      if (typeof obj.arguments !== 'object' || obj.arguments === null || Array.isArray(obj.arguments)) {
        return 'tools/call 时 params.arguments 必须是 JSON 对象';
      }
    }
    return null;
  }, [detail?.resourceId, invokeApiKey, invokeTimeoutSec, invokeUseStream]);

  const handleInvoke = useCallback(async () => {
    if (!detail) return;
    const built = buildMcpInvokePayload();
    if (built.ok === false) {
      showMessage?.(built.message, 'warning');
      return;
    }
    const invalidReason = validateInvokeRequest(built.payload);
    if (invalidReason) {
      showMessage?.(invalidReason, 'warning');
      return;
    }
    setInvoking(true);
    setInvokeResponse(null);
    setInvokeResultMessage(null);
    setInvokeResultError(null);
    setInvokeStreamOutput('');
    setInvokeRequestTraceId(invokeTraceId);
    try {
      let resolved;
      try {
        resolved = await resourceCatalogService.resolve({
          resourceType: 'mcp',
          resourceId: detail.resourceId,
          version: invokeCatalogVersion || undefined,
        }, { headers: { 'X-Api-Key': invokeApiKey.trim() } });
      } catch (e) {
        setInvokeResultError(`${mapInvokeFlowError(e, 'resolve')}\n可保留当前参数后重试解析`);
        return;
      }
      if (resolved.invokeType === 'redirect' && resolved.endpoint) {
        if (!safeOpenHttpUrl(resolved.endpoint)) {
          setInvokeResultError('无法打开该地址（仅支持 http/https）');
          return;
        }
        setInvokeResultMessage(`该 MCP 资源为跳转类型，已打开地址：${resolved.endpoint}`);
        return;
      }
      if (resolved.invokeType === 'metadata') {
        setInvokeResultMessage(`该 MCP 资源返回元数据：${JSON.stringify(resolved.spec ?? {}, null, 2)}`);
        return;
      }
      if (invokeUseStream && isWebSocketMcpResolved(resolved)) {
        showMessage?.('WebSocket MCP 仅支持普通 invoke，请关闭「流式调用」后重试', 'warning');
        return;
      }
      const requestPayload: InvokeRequest = {
        resourceType: 'mcp',
        resourceId: detail.resourceId,
        version: invokeCatalogVersion || undefined,
        timeoutSec: invokeTimeoutSec,
        payload: built.payload,
      };
      try {
        if (invokeUseStream) {
          let acc = '';
          setInvokeStreamOutput('');
          const streamBudgetMs = Math.min(600, Math.max(1, invokeTimeoutSec)) * 1000 + 30_000;
          const ac = new AbortController();
          const to = window.setTimeout(() => ac.abort(), streamBudgetMs);
          try {
            const onChunk = (d: string) => {
              acc += d;
              setInvokeStreamOutput(acc);
            };
            if (invokeGatewayMode === 'sdk') {
              await sdkService.invokeStream(invokeApiKey.trim(), requestPayload, invokeTraceId, onChunk, ac.signal);
            } else {
              await invokeService.invokeStream(requestPayload, invokeApiKey.trim(), invokeTraceId, onChunk, ac.signal);
            }
            setInvokeResponse({
              requestId: '',
              traceId: invokeTraceId,
              resourceType: 'mcp',
              resourceId: String(detail.resourceId),
              statusCode: 200,
              status: 'success',
              latencyMs: 0,
              body: acc,
            });
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
              setInvokeResultError(`流式调用超时或已中断（>${Math.round(streamBudgetMs / 1000)}s）\nTraceId：${invokeTraceId}`);
            } else {
              throw e;
            }
          } finally {
            window.clearTimeout(to);
          }
        } else {
          const res = invokeGatewayMode === 'sdk'
            ? await sdkService.invoke(invokeApiKey.trim(), requestPayload, invokeTraceId)
            : await invokeService.invoke(requestPayload, invokeApiKey.trim(), invokeTraceId);
          setInvokeResponse(res);
        }
      } catch (e) {
        const mapped = mapInvokeFlowError(e, 'invoke');
        if (e instanceof ApiException) {
          const main = e.status === 401
            ? 'API Key 无效或已失效，请检查密钥状态'
            : e.status === 403
              ? '当前 Key 无该资源调用权限，请申请授权'
              : e.status === 400
                ? '请求参数格式错误，请检查 method/params/resourceId'
                : e.status >= 500
                  ? '资源服务暂时不可用，请稍后重试'
                  : mapped;
          setInvokeResultError(`${main}\n\n详情：${e.message}\nTraceId：${invokeTraceId}`);
        } else {
          setInvokeResultError(`${mapped}\n可保留当前参数后重试调用`);
        }
      }
    } catch (err) {
      setInvokeResultError(`调用失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setInvoking(false);
    }
  }, [
    detail,
    buildMcpInvokePayload,
    invokeApiKey,
    invokeGatewayMode,
    invokeTimeoutSec,
    invokeTraceId,
    invokeUseStream,
    invokeCatalogVersion,
    showMessage,
    validateInvokeRequest,
  ]);

  const handleApply = useCallback(() => {
    if (!detail) return;
    setGrantModalOpen(true);
  }, [detail]);

  const handleFavorite = useCallback(async () => {
    if (!detail || favoriteLoading || isFavorited) return;
    setFavoriteLoading(true);
    try {
      await userActivityService.addFavorite('mcp', Number(detail.resourceId));
      setIsFavorited(true);
      showMessage?.('已加入我的收藏', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : '收藏失败';
      if (message.includes('FAVORITE_EXISTS') || message.includes('已收藏')) {
        setIsFavorited(true);
        showMessage?.('该资源已在收藏夹中', 'info');
      } else {
        showMessage?.(message, 'error');
      }
    } finally {
      setFavoriteLoading(false);
    }
  }, [detail, favoriteLoading, isFavorited, showMessage]);

  const handleMcpMethodChange = useCallback((nextMethod: string) => {
    setMcpMethod(nextMethod);
    if (mcpPayloadMode === 'simple') {
      const defaultPreset = MCP_PARAM_PRESETS.find((preset) => preset.method === nextMethod);
      setMcpParamsJson(JSON.stringify(defaultPreset?.params ?? getMethodParamExample(nextMethod), null, 2));
      setMcpPresetId(defaultPreset?.id ?? 'custom');
    }
  }, [mcpPayloadMode]);

  const handlePresetChange = useCallback((nextPresetId: string) => {
    setMcpPresetId(nextPresetId);
    if (nextPresetId === 'custom') return;
    const preset = MCP_PARAM_PRESETS.find((item) => item.id === nextPresetId);
    if (!preset) return;
    if (preset.method !== mcpMethod) setMcpMethod(preset.method);
    setMcpParamsJson(JSON.stringify(preset.params, null, 2));
  }, [mcpMethod]);

  const extractParamsFromPayload = (obj: Record<string, unknown>): Record<string, unknown> => {
    const p = obj.params;
    if (p !== undefined && typeof p === 'object' && p !== null && !Array.isArray(p)) {
      return { ...(p as Record<string, unknown>) };
    }
    const next = { ...obj };
    delete next.method;
    return next;
  };

  const switchPayloadMode = (next: McpPayloadMode) => {
    if (next === mcpPayloadMode) return;
    if (next === 'advanced') {
      let params: Record<string, unknown>;
      try {
        const p = JSON.parse(mcpParamsJson.trim() || '{}');
        params = typeof p === 'object' && p !== null && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
      } catch {
        params = {};
      }
      setInvokePayload(JSON.stringify({ method: mcpMethod, params }, null, 2));
      setMcpPayloadMode('advanced');
      return;
    }
    const parsed = tryParseJsonObject(invokePayload);
    if (!parsed.ok) {
      showMessage?.(parsed.message, 'warning');
      return;
    }
    if (!parsed.payload || Object.keys(parsed.payload).length === 0) {
      setMcpPayloadMode('simple');
      return;
    }
    const m = parsed.payload.method;
    if (typeof m === 'string' && !(MCP_JSONRPC_METHODS as readonly string[]).includes(m)) {
      showMessage?.('当前 method 不在快捷列表中，请改用高级模式编辑完整 JSON', 'warning');
      return;
    }
    if (typeof m === 'string') setMcpMethod(m);
    const params = extractParamsFromPayload(parsed.payload);
    setMcpParamsJson(JSON.stringify(params, null, 2));
    setMcpPresetId(getDefaultPresetIdByMethod(typeof m === 'string' ? m : MCP_JSONRPC_METHODS[0]));
    setMcpPayloadMode('simple');
  };

  if (ridKey) {
    if (detailPageLoading) {
      return (
        <div className={`w-full min-h-0 ${canvasBodyBg(theme)}`}>
          <PageSkeleton type="detail" />
        </div>
      );
    }
    if (detailPageError || !detail) {
      return (
        <div className={`w-full px-4 py-8 ${canvasBodyBg(theme)}`}>
          <PageError error={detailPageError ?? new Error('未找到 MCP 资源')} onRetry={() => void loadMcpDetailByPath()} retryLabel="重试" />
          <button type="button" className={`mt-4 ${btnSecondary(theme)}`} onClick={() => navigate(buildPath('user', 'mcp-center'))}>
            返回 MCP 市场
          </button>
        </div>
      );
    }
    return (
      <>
        <ResourceMarketDetailShell
          theme={theme}
          onBack={() => navigate(buildPath('user', 'mcp-center'))}
          backLabel="返回 MCP 市场"
          titleBlock={(
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${isDark ? 'bg-gradient-to-br from-violet-500 to-indigo-500' : 'bg-gradient-to-br from-violet-600 to-indigo-600'}`}>
                <Puzzle className="h-7 w-7" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${textPrimary(theme)}`}>{detail.displayName}</h1>
                <div className={`flex flex-wrap items-center gap-2 text-xs ${textMuted(theme)}`}>
                  <span className="font-mono">@{detail.resourceCode || detail.resourceId}</span>
                  <span className={statusBadgeClass(detail.status ?? 'unknown', theme)}>
                    <span className={statusDot(detail.status ?? 'unknown')} />
                    {statusLabel(detail.status)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    <Star size={12} className="text-amber-500" aria-hidden />
                    {detail.ratingAvg != null ? detail.ratingAvg.toFixed(1) : '—'}
                  </span>
                  <span>{Number(detail.reviewCount ?? 0)} 条评论</span>
                </div>
              </div>
            </div>
          )}
          headerActions={(
            <>
              <button type="button" className={`${btnSecondary(theme)} min-h-11 disabled:opacity-50`} disabled={favoriteLoading || isFavorited} onClick={() => void handleFavorite()}>
                {favoriteLoading ? <><Loader2 size={14} className="animate-spin" /> 收藏中…</> : <><Heart size={14} className={isFavorited ? 'fill-current' : ''} /> {isFavorited ? '已收藏' : '收藏'}</>}
              </button>
              <button type="button" className={`${btnSecondary(theme)} inline-flex min-h-11 items-center gap-2`} onClick={handleApply}>
                <Send size={14} />
                获取授权指引
              </button>
              <button type="button" className={`${btnPrimary} inline-flex min-h-11 items-center gap-2 disabled:opacity-50`} disabled={invoking} onClick={() => void handleInvoke()}>
                {invoking ? <><Loader2 size={14} className="animate-spin" /> {invokeUseStream ? '流式调用中…' : '调用中…'}</> : <><Play size={14} /> {invokeUseStream ? '流式调用' : '调用'}</>}
              </button>
            </>
          )}
          tabs={[
            { id: 'service', label: '服务详情' },
            { id: 'invoke', label: '工具测试' },
            { id: 'reviews', label: '评分评论', badge: Number(detail.reviewCount ?? 0) },
          ]}
          activeTabId={detailTab}
          onTabChange={(id) => setDetailTab(id as McpDetailTab)}
          mainColumn={(
            <div className="space-y-5">
              <p className={`text-[11px] ${textMuted(theme)}`}>
                {detailTab === 'service'
                  ? '当前：服务详情（Markdown）'
                  : detailTab === 'invoke'
                    ? '当前：调用参数与结果'
                    : '当前：资源评论区'}
              </p>
              {detailTab === 'service' ? (
                <div
                  className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'}`}
                >
                  {detail.serviceDetailMd?.trim() ? (
                    <MarkdownView value={detail.serviceDetailMd} className="text-sm" />
                  ) : (
                    <p className={`text-sm leading-relaxed ${textMuted(theme)}`}>
                      尚未填写服务详情。发布者可在「资源注册 / 编辑 MCP」中的「服务详情」补充 Markdown 说明（接口能力、鉴权、配额与示例等）。
                    </p>
                  )}
                </div>
              ) : detailTab === 'invoke' ? (
                <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>调用通道</label>
                  <LantuSelect
                    theme={theme}
                    value={invokeGatewayMode}
                    onChange={(next) => setInvokeGatewayMode(next as InvokeGatewayMode)}
                    options={[
                      {
                        value: 'invoke',
                        label: invokeUseStream ? `${API_PATH_PREFIX}/invoke-stream（流式）` : `${API_PATH_PREFIX}/invoke（推荐）`,
                      },
                      {
                        value: 'sdk',
                        label: invokeUseStream ? `${API_PATH_PREFIX}/sdk/v1/invoke-stream（流式）` : `${API_PATH_PREFIX}/sdk/v1/invoke（SDK）`,
                      },
                    ]}
                    triggerClassName="!text-xs"
                  />
                  <label className={`mt-2 flex cursor-pointer items-start gap-2 text-[11px] ${textMuted(theme)}`}>
                    <input
                      type="checkbox"
                      className={`mt-0.5 ${lantuCheckboxPrimaryClass}`}
                      checked={invokeUseStream}
                      onChange={(e) => setInvokeUseStream(e.target.checked)}
                    />
                    <span>
                      流式调用（invoke-stream，fetch 长连接；权限同 invoke）。WebSocket MCP 请保持关闭并使用普通调用。
                    </span>
                  </label>
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>X-Api-Key（必填）</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      name="x-api-key"
                      autoComplete="new-password"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={invokeApiKey}
                      onChange={(e) => setInvokeApiKey(e.target.value.replace(/\s+/g, ''))}
                      placeholder="sk_xxx..."
                      className={`${nativeInputClass(theme)} pr-10 font-mono text-xs`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 ${
                        isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                      title={showApiKey ? '隐藏密钥' : '显示密钥'}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>
                    请填写创建 API Key 时返回的完整 <code className="font-mono">sk_...</code> 明文（非 id、prefix、掩码）。
                  </p>
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>X-Trace-Id（可选，贯穿本轮调试）</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={invokeTraceId}
                      className={`${nativeInputClass(theme)} min-w-0 flex-1 font-mono text-xs`}
                    />
                    <button
                      type="button"
                      className={`${btnSecondary(theme)} shrink-0 !px-2.5`}
                      title="重新生成 TraceId"
                      onClick={() => setInvokeTraceId(newTraceId())}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>与网关 SSE 解析及 JSON-RPC id 对齐时可固定使用本值</p>
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>解析版本</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={invokeCatalogVersion || '（目录未返回版本，将走网关默认）'}
                      title={invokeCatalogVersion || undefined}
                      className={`${nativeInputClass(theme)} min-w-0 flex-1 cursor-default font-mono text-xs ${!invokeCatalogVersion ? (isDark ? 'text-slate-500' : 'text-slate-500') : ''}`}
                      aria-label="当前资源默认解析版本（与发布者启用版本一致）"
                    />
                    <button
                      type="button"
                      className={`${btnSecondary(theme)} shrink-0 !px-2.5`}
                      title="重新加载资源详情，同步发布者最新默认版本"
                      disabled={detailPageLoading}
                      onClick={() => void loadMcpDetailByPath()}
                    >
                      <RefreshCw size={14} className={detailPageLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>
                    自动使用本页目录详情中的默认版本（发布者「设为当前」）；若为空则与不指定版本行为一致。
                  </p>
                </div>
                <div>
                  <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>超时（秒）</label>
                  <input
                    type="number"
                    min={1}
                    max={invokeUseStream ? 600 : 120}
                    value={invokeTimeoutSec}
                    onChange={(e) => setInvokeTimeoutSec(Number(e.target.value) || 60)}
                    className={`${nativeInputClass(theme)} font-mono text-xs`}
                  />
                  <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>
                    {invokeUseStream ? '流式时最长 600 秒（与网关一致）' : '建议范围 1~120 秒'}
                  </p>
                </div>
            </div>
            {invokeUseStream && (invoking || invokeStreamOutput) && (
                <div>
                  <p className={`mb-1 text-xs font-semibold ${textSecondary(theme)}`}>流式输出（实时）</p>
                  <pre className={`max-h-[28vh] overflow-auto rounded-xl border p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                    isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'
                  }`}>
                    {invokeStreamOutput || (invoking ? '等待首包…' : '')}
                  </pre>
                </div>
            )}
            <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${textSecondary(theme)}`}>调用参数（JSON-RPC）</span>
                  <div
                    className={`inline-flex rounded-lg p-0.5 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
                    role="group"
                    aria-label="参数编辑模式"
                  >
                    <button
                      type="button"
                      onClick={() => switchPayloadMode('simple')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        mcpPayloadMode === 'simple'
                          ? isDark
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'bg-white text-slate-900 shadow-sm'
                          : textMuted(theme)
                      }`}
                    >
                      快捷
                    </button>
                    <button
                      type="button"
                      onClick={() => switchPayloadMode('advanced')}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        mcpPayloadMode === 'advanced'
                          ? isDark
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'bg-white text-slate-900 shadow-sm'
                          : textMuted(theme)
                      }`}
                    >
                      高级
                    </button>
                  </div>
                </div>
                {mcpPayloadMode === 'simple' ? (
                  <div className="space-y-2">
                    <div>
                      <label className={`mb-1.5 block text-[11px] font-medium ${textMuted(theme)}`}>JSON-RPC method</label>
                      <LantuSelect
                        theme={theme}
                        value={mcpMethod}
                        onChange={handleMcpMethodChange}
                        options={mcpMethodOptions}
                        triggerClassName="!text-xs"
                      />
                      <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>展示为中文提示，实际发送仍使用后端要求的 method 值</p>
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[11px] font-medium ${textMuted(theme)}`}>参数示例模板</label>
                      <LantuSelect
                        theme={theme}
                        value={mcpPresetId}
                        onChange={handlePresetChange}
                        options={methodPresetOptions}
                        triggerClassName="!text-xs"
                      />
                      <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>模板中的 `your_tool_name` / `arguments` 为占位，请按当前 MCP 实际工具名修改</p>
                    </div>
                    <div>
                      <label className={`mb-1.5 block text-[11px] font-medium ${textMuted(theme)}`}>params（JSON 对象）</label>
                      <AutoHeightTextarea
                        minRows={5}
                        maxRows={22}
                        value={mcpParamsJson}
                        onChange={(e) => setMcpParamsJson(e.target.value)}
                        className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
                        placeholder='例如 tools/call：{ "name": "...", "arguments": {} }'
                      />
                      <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>
                        字段说明：<code className="font-mono">name</code> = 工具名；<code className="font-mono">arguments</code> = 传给该工具的参数对象
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className={`mb-1.5 text-[11px] ${textMuted(theme)}`}>
                      完整 payload，须含 <code className="font-mono">method</code>；可与 <code className="font-mono">params</code> 并列，或按网关约定省略 params 由其余字段充当 params。
                    </p>
                    <AutoHeightTextarea
                      minRows={8}
                      maxRows={28}
                      value={invokePayload}
                      onChange={(e) => setInvokePayload(e.target.value)}
                      className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
                    />
                  </div>
                )}
            </div>
            {invokeResultMessage && (
                <div className={`rounded-2xl border px-3.5 py-3 text-xs ${
                  isDark ? 'border-blue-500/20 bg-blue-500/[0.08] text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-900'
                }`}>
                  {invokeResultMessage}
                </div>
            )}
            {invokeResultError && (
                <div className={`rounded-2xl border px-3.5 py-3 text-xs whitespace-pre-wrap ${
                  isDark ? 'border-rose-500/25 bg-rose-500/[0.08] text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-900'
                }`}>
                  {invokeResultError}
                </div>
            )}
            {invokeResponse && (
                <div className={`rounded-2xl border p-4 space-y-4 ${
                  isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className={`text-sm font-semibold ${textSecondary(theme)}`}>调用结果</h5>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          invokeJsonRpcError
                            ? isDark ? 'bg-amber-500/20 text-amber-100' : 'bg-amber-100 text-amber-900'
                            : invokeGatewaySuccess
                              ? isDark ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                              : isDark ? 'bg-rose-500/20 text-rose-200' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {invokeJsonRpcError ? 'JSON-RPC 错误' : invokeGatewayStatusLabelZh(invokeResponse.status)}
                      </span>
                      {invokeJsonRpcError && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                            isDark ? 'bg-white/10 text-white/70' : 'bg-slate-200/80 text-slate-700'
                          }`}
                        >
                          网关 {invokeGatewayStatusLabelZh(invokeResponse.status)} · HTTP {invokeResponse.statusCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`${btnSecondary(theme)} !px-2.5 !py-1 !text-xs`}
                        onClick={() => void copyText(JSON.stringify(invokeResponse, null, 2), '已复制完整响应')}
                      >
                        <Copy size={12} />
                        复制响应
                      </button>
                      <button
                        type="button"
                        className={`${btnSecondary(theme)} !px-2.5 !py-1 !text-xs`}
                        onClick={() => void copyText(invokeBodyView?.text ?? '', '已复制响应体')}
                      >
                        <Copy size={12} />
                        复制 body
                      </button>
                    </div>
                  </div>
                  {invokeJsonRpcError ? (
                    <div
                      className={`rounded-xl border px-3 py-2.5 text-xs ${
                        isDark ? 'border-amber-500/25 bg-amber-500/[0.08] text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-950'
                      }`}
                    >
                      <p className="font-semibold">
                        错误码 {invokeJsonRpcError.code} · {invokeJsonRpcError.message}
                      </p>
                      {invokeJsonRpcError.data !== undefined && invokeJsonRpcError.data !== '' && (
                        <p className={`mt-1 whitespace-pre-wrap break-all ${textMuted(theme)}`}>
                          {typeof invokeJsonRpcError.data === 'string'
                            ? invokeJsonRpcError.data
                            : JSON.stringify(invokeJsonRpcError.data, null, 2)}
                        </p>
                      )}
                      {invokeGatewaySuccess && (
                        <p className={`mt-2 ${textMuted(theme)}`}>
                          本次 HTTP 请求成功（如状态码所示），但响应体为 JSON-RPC 协议层错误，以本说明为准。
                        </p>
                      )}
                    </div>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className={`rounded-xl border p-2.5 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
                      <p className={`text-[11px] ${textMuted(theme)}`}>状态码</p>
                      <p className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{invokeResponse.statusCode}</p>
                    </div>
                    <div className={`rounded-xl border p-2.5 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
                      <p className={`text-[11px] ${textMuted(theme)}`}>耗时</p>
                      <p className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{invokeResponse.latencyMs} ms</p>
                    </div>
                    <div className={`rounded-xl border p-2.5 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
                      <p className={`text-[11px] ${textMuted(theme)}`}>资源</p>
                      <p className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>
                        {invokeResponse.resourceType}
                        {'/'}
                        {invokeResponse.resourceId}
                      </p>
                    </div>
                  </div>
                  <div className={`grid gap-1.5 rounded-xl border p-3 text-xs ${isDark ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white'}`}>
                    <p className={textSecondary(theme)}>requestId：<span className={`${textPrimary(theme)} font-mono break-all`}>{invokeResponse.requestId}</span></p>
                    <p className={textSecondary(theme)}>traceId（响应）：<span className={`${textPrimary(theme)} font-mono break-all`}>{invokeResponse.traceId}</span></p>
                    <p className={textSecondary(theme)}>traceId（请求）：<span className={`${textPrimary(theme)} font-mono break-all`}>{invokeRequestTraceId || invokeTraceId}</span></p>
                  </div>
                  <div>
                    <p className={`mb-2 text-xs font-semibold ${textSecondary(theme)}`}>
                      body（{invokeBodyView?.asJson ? 'JSON' : '文本'}）
                    </p>
                    <pre className={`max-h-[44vh] overflow-auto rounded-xl border p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'
                    }`}>
                      {invokeBodyView?.text || ''}
                    </pre>
                  </div>
                </div>
            )}
                </div>
              ) : detailTab === 'reviews' ? (
                <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'}`}>
                  <h4 className={`mb-3 flex items-center gap-2 text-sm font-semibold ${textPrimary(theme)}`}>
                    <MessageSquare size={16} className="text-neutral-800" />
                    评分与评论
                  </h4>
                  <ResourceReviewsSection
                    targetType="mcp"
                    targetId={detail.resourceId}
                    theme={theme}
                    appearance="airy"
                    showMessage={showMessage}
                  />
                </div>
              ) : null}
            </div>
          )}
          sidebarColumn={(
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
                <p className={`text-xs ${textMuted(theme)}`}>资源编码：{detail.resourceCode || detail.resourceId}</p>
                <div className="mt-2">
                  <AccessPolicyBadge theme={theme} value={detail.accessPolicy} showHint={true} />
                </div>
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>
                  调用目标：mcp{' / '}
                  <span className="font-mono">{detail.resourceId}</span>
                </p>
                <p className={`mt-2 text-sm leading-relaxed ${textSecondary(theme)}`}>{detail.description || '暂无描述'}</p>
              </div>
              <div className={`rounded-xl border p-3 text-xs leading-relaxed ${isDark ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950/85'}`}>
                <p className="font-semibold">统一网关 MCP 试用说明</p>
                <p className={`mt-1.5 ${isDark ? 'text-amber-100/75' : 'text-amber-950/70'}`}>
                  多轮流程（如 initialize → tools/list → tools/call）请<strong className="font-semibold">连续多次点击顶栏「调用」</strong>，并保持同一 API Key；
                  <code className="mx-0.5 rounded px-1 py-0.5 font-mono text-[11px] opacity-90">Mcp-Session-Id</code>
                  由网关按密钥与 endpoint 自动维护，前端无需手动传递。工具真实名称须以
                  <code className="mx-0.5 rounded px-1 py-0.5 font-mono text-[11px] opacity-90">tools/list</code>
                  返回为准。
                </p>
              </div>
            </div>
          )}
        />
        <GrantApplicationModal
          open={grantModalOpen}
          onClose={() => setGrantModalOpen(false)}
          theme={theme}
          resourceType="mcp"
          resourceId={detail.resourceId}
          resourceName={detail.displayName}
          showMessage={showMessage}
        />
      </>
    );
  }

  const searchPlaceholder =
    listCountLabel > 0
      ? `搜索 MCP 服务（本页已加载 ${rows.length} 条）…`
      : '搜索 MCP 名称或编码…';

  return (
    <div className={`w-full ${canvasBodyBg(theme)}`}>
      <div className={`${mainScrollPadX} ${mainScrollPadBottom} space-y-5 ${consoleContentTopPad}`}>
        <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md shadow-violet-500/20 sm:h-12 sm:w-12 ${
                isDark
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-500'
                  : 'bg-gradient-to-br from-violet-600 to-indigo-600'
              }`}
              aria-hidden
            >
              <Puzzle className="h-6 w-6 sm:h-6 sm:w-6" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${textMuted(theme)}`}>MCP plaza</p>
              <h1 className={`mt-0.5 font-bold tracking-tight ${MARKET_HERO_TITLE_CLASSES[fontSize]}`}>
                <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-indigo-400 dark:to-cyan-400">
                  {chromePageTitle || 'MCP 广场'}
                </span>
              </h1>
              <p className={`mt-1 max-w-2xl text-xs leading-snug sm:text-sm ${textSecondary(theme)}`}>
                浏览已发布 MCP 服务；统一网关 resolve、invoke 与 invoke-stream（须有效 Key 与授权 scope）。
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'api-docs'))}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                isDark ? 'border-white/[0.12] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]' : 'border-slate-200/80 bg-white text-slate-800 shadow-sm hover:bg-slate-50'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
              接入与部署
            </button>
            <button
              type="button"
              onClick={() => navigate(buildPath('user', 'mcp-register'))}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:text-sm"
            >
              发布 MCP
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className={`rounded-2xl border p-4 ${
              isDark ? 'border-violet-500/20 bg-gradient-to-br from-violet-600/15 to-slate-900/30' : 'border-violet-200/70 bg-gradient-to-br from-violet-50 to-white'
            }`}
          >
            <div className="mb-2 inline-flex rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-200">
              <Zap className="mr-1 h-3.5 w-3.5" aria-hidden />
              接入
            </div>
            <p className={`text-sm font-semibold ${textPrimary(theme)}`}>统一网关 resolve</p>
            <p className={`mt-1 text-xs leading-relaxed ${textSecondary(theme)}`}>
              解析接入端点、传输方式与元数据，与目录 accessPolicy / Grant 规则一致。
            </p>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              isDark ? 'border-cyan-500/20 bg-gradient-to-br from-cyan-600/12 to-slate-900/30' : 'border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 to-white'
            }`}
          >
            <div className="mb-2 inline-flex rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800 dark:text-cyan-200">
              调试
            </div>
            <p className={`text-sm font-semibold ${textPrimary(theme)}`}>JSON-RPC 模板</p>
            <p className={`mt-1 text-xs leading-relaxed ${textSecondary(theme)}`}>
              initialize、tools/list、tools/call 快捷组装，支持流式与普通 invoke。
            </p>
          </div>
          <div
            className={`rounded-2xl border p-4 ${
              isDark ? 'border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-600/12 to-slate-900/30' : 'border-fuchsia-200/70 bg-gradient-to-br from-fuchsia-50/90 to-white'
            }`}
          >
            <div className="mb-2 inline-flex rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-[11px] font-bold text-fuchsia-800 dark:text-fuchsia-200">
              治理
            </div>
            <p className={`text-sm font-semibold ${textPrimary(theme)}`}>收藏与评价</p>
            <p className={`mt-1 text-xs leading-relaxed ${textSecondary(theme)}`}>
              目录评分、评论与授权申请与资源目录打通。
            </p>
          </div>
        </div>

        <div
          className={`flex gap-2.5 rounded-2xl border px-3.5 py-2.5 text-sm leading-snug ${
            isDark ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100/90' : 'border-amber-200/80 bg-amber-50/80 text-amber-950'
          }`}
        >
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
          <p>
            <strong className="font-semibold">{chromePageTitle || 'MCP 广场'}</strong>
            ：侧栏标签数量基于最近一次「全部」列表快照（单页最多 100 条）；筛选标签后列表为接口筛选结果。
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <CategoryNav className="hidden w-full shrink-0 lg:block lg:w-52 xl:w-56" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="lg:hidden">
              <p className={`mb-2 text-xs font-semibold ${textMuted(theme)}`}>分类</p>
              <div
                className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="MCP 标签"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tagFilter === null}
                  onClick={() => setTagFilter(null)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                    tagFilter === null
                      ? isDark
                        ? 'bg-violet-500/25 text-white'
                        : 'bg-violet-600 text-white'
                      : isDark
                        ? 'bg-white/[0.06] text-slate-300'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  全部
                  <span className="ml-1 tabular-nums opacity-80">({listCountLabel})</span>
                </button>
                {catalogTags.map((t) => {
                  const n = tagCounts.get(t.name) ?? 0;
                  const active = tagFilter === t.name;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))}
                      className={`max-w-[10rem] shrink-0 truncate rounded-full px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${
                        active
                          ? isDark
                            ? 'bg-violet-500/25 text-white'
                            : 'bg-violet-600 text-white'
                          : isDark
                            ? 'bg-white/[0.06] text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.name}
                      <span className="ml-1 tabular-nums opacity-80">({n})</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className={`shrink-0 text-sm font-semibold ${textPrimary(theme)}`}>
                MCP 服务
                {tagFilter != null && (
                  <span className={`ml-2 text-xs font-normal ${textMuted(theme)}`}>· {tagFilter}</span>
                )}
              </span>
              <div className="relative min-w-0 flex-1">
                <Search
                  className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${iconMuted(theme)}`}
                  aria-hidden
                />
                <input
                  type="search"
                  name="mcp-market-search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={searchPlaceholder}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  aria-label="搜索 MCP 服务"
                  className={`min-h-12 w-full rounded-2xl border py-3 pl-12 pr-4 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
                    isDark
                      ? 'border-white/[0.1] bg-white/[0.05] text-white placeholder:text-slate-500'
                      : 'border-slate-200/90 bg-white text-slate-900 shadow-sm placeholder:text-slate-400'
                  }`}
                />
              </div>
            </div>

            {loading ? (
              <PageSkeleton type="cards" />
            ) : loadError ? (
              <PageError error={loadError} onRetry={() => void load()} retryLabel="重试加载 MCP 市场" />
            ) : filtered.length === 0 ? (
              <div className={`py-16 text-center text-sm ${textMuted(theme)}`}>暂无可用 MCP 资源</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => (
                  <BentoCard
                    key={item.resourceId}
                    theme={theme}
                    hover
                    glow="indigo"
                    padding="md"
                    className="flex h-full flex-col"
                    onClick={() => navigate(buildPath('user', 'mcp-center', item.resourceId))}
                  >
                    <MarketplaceListingCard
                      theme={theme}
                      title={item.displayName}
                      statusChip={{
                        label: statusLabel(item.status),
                        tone: item.status === 'published' ? 'published' : 'neutral',
                      }}
                      trailing={(
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white ${isDark ? 'opacity-95' : ''}`}
                        >
                          <Puzzle size={17} aria-hidden />
                        </div>
                      )}
                      metaRow={(
                        <>
                          {(item.tags ?? []).slice(0, 5).map((tg) => (
                            <span
                              key={tg}
                              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {tg}
                            </span>
                          ))}
                          <AccessPolicyBadge className="contents" theme={theme} value={item.accessPolicy} whenMissing="hide" />
                        </>
                      )}
                      description={item.description || '暂无描述'}
                      footerLeft={(
                        <span
                          className="block truncate font-mono text-[11px]"
                          title={item.resourceCode || item.resourceId}
                        >
                          @{item.resourceCode || item.resourceId}
                        </span>
                      )}
                      footerStats={(
                        <>
                          <MarketplaceStatItem icon={Star} title="目录评分">
                            {item.ratingAvg != null ? item.ratingAvg.toFixed(1) : '—'}
                          </MarketplaceStatItem>
                          <MarketplaceStatItem icon={MessageSquare} title="评论数">
                            {Number(item.reviewCount ?? 0)}
                          </MarketplaceStatItem>
                        </>
                      )}
                      primaryAction={(
                        <button
                          type="button"
                          className={`${btnPrimary} !px-3 !py-1.5 !text-xs`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(buildPath('user', 'mcp-center', item.resourceId));
                          }}
                        >
                          查看与使用
                        </button>
                      )}
                    />
                  </BentoCard>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
