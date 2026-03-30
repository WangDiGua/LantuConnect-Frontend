import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tagService } from '../../api/services/tag.service';
import { filterTagsForResourceType } from '../../utils/marketTags';
import type { TagItem } from '../../types/dto/tag';
import { Copy, Eye, EyeOff, Heart, Loader2, MessageSquare, Play, Puzzle, RefreshCw, Search, Send } from 'lucide-react';
import type { Theme, FontSize, ThemeColor } from '../../types';
import type { InvokeRequest, InvokeResponse, ResourceCatalogItemVO } from '../../types/dto/catalog';
import { resourceCatalogService } from '../../api/services/resource-catalog.service';
import { invokeService } from '../../api/services/invoke.service';
import { sdkService } from '../../api/services/sdk.service';
import { userActivityService } from '../../api/services/user-activity.service';
import { mapInvokeFlowError } from '../../utils/invokeError';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { BentoCard } from '../../components/common/BentoCard';
import { GlassPanel } from '../../components/common/GlassPanel';
import { Modal } from '../../components/common/Modal';
import { ResourceReviewsSection } from '../../components/business/ResourceReviewsSection';
import { GrantApplicationModal } from '../../components/business/GrantApplicationModal';
import { LantuSelect } from '../../components/common/LantuSelect';
import {
  bentoCard,
  btnPrimary,
  btnSecondary,
  canvasBodyBg,
  mainScrollCompositorClass,
  statusLabel,
  textMuted,
  textPrimary,
  textSecondary,
} from '../../utils/uiClasses';
import { useLayoutChrome } from '../../context/LayoutChromeContext';
import { PageError } from '../../components/common/PageError';
import { PageTitleTagline } from '../../components/common/PageTitleTagline';
import { ApiException } from '../../types/api';

interface Props {
  theme: Theme;
  fontSize: FontSize;
  themeColor?: ThemeColor;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
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
type McpDetailTab = 'invoke' | 'reviews';
type McpParamPreset = {
  id: string;
  label: string;
  method: string;
  params: Record<string, unknown>;
};

function tryFormatJsonText(raw: string): { asJson: boolean; text: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { asJson: false, text: '' };
  try {
    return { asJson: true, text: JSON.stringify(JSON.parse(trimmed), null, 2) };
  } catch {
    return { asJson: false, text: raw };
  }
}


export const McpMarket: React.FC<Props> = ({ theme, showMessage }) => {
  const { chromePageTitle } = useLayoutChrome();
  const isDark = theme === 'dark';
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [catalogTags, setCatalogTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [rows, setRows] = useState<ResourceCatalogItemVO[]>([]);
  const [detail, setDetail] = useState<ResourceCatalogItemVO | null>(null);
  const [mcpPayloadMode, setMcpPayloadMode] = useState<McpPayloadMode>('simple');
  const [mcpMethod, setMcpMethod] = useState<string>(MCP_JSONRPC_METHODS[0]);
  const [mcpParamsJson, setMcpParamsJson] = useState(() => JSON.stringify(getMethodParamExample(MCP_JSONRPC_METHODS[0]), null, 2));
  const [mcpPresetId, setMcpPresetId] = useState<string>(() => getDefaultPresetIdByMethod(MCP_JSONRPC_METHODS[0]));
  const [invokePayload, setInvokePayload] = useState(DEFAULT_MCP_PAYLOAD_TEXT);
  const [invokeGatewayMode, setInvokeGatewayMode] = useState<InvokeGatewayMode>('invoke');
  const [invokeApiKey, setInvokeApiKey] = useState<string>(() => localStorage.getItem('lantu_api_key') ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [invokeTraceId, setInvokeTraceId] = useState(() => newTraceId());
  const [invokeVersion, setInvokeVersion] = useState('');
  const [invokeTimeoutSec, setInvokeTimeoutSec] = useState(60);
  const [invokeResponse, setInvokeResponse] = useState<InvokeResponse | null>(null);
  const [invokeResultMessage, setInvokeResultMessage] = useState<string | null>(null);
  const [invokeResultError, setInvokeResultError] = useState<string | null>(null);
  const [invokeRequestTraceId, setInvokeRequestTraceId] = useState<string>('');
  const [invoking, setInvoking] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [detailTab, setDetailTab] = useState<McpDetailTab>('reviews');
  const [searchParams, setSearchParams] = useSearchParams();
  const processedResourceId = useRef<string | null>(null);

  useEffect(() => {
    tagService.list()
      .then((list) => setCatalogTags(filterTagsForResourceType(list, 'mcp')))
      .catch(() => setCatalogTags([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
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

  useEffect(() => {
    const rid = searchParams.get('resourceId');
    if (!rid) {
      processedResourceId.current = null;
      return;
    }
    if (loading || rows.length === 0) return;
    if (processedResourceId.current === rid) return;
    processedResourceId.current = rid;
    const next = new URLSearchParams(searchParams);
    next.delete('resourceId');
    setSearchParams(next, { replace: true });
    const hit = rows.find((r) => String(r.resourceId) === String(rid));
    if (hit) {
      setDetail(hit);
    } else {
      showMessage?.('未在已上架列表中找到该资源，请确认资源已发布且 ID 正确', 'warning');
    }
  }, [loading, rows, searchParams, setSearchParams, showMessage]);

  useEffect(() => {
    if (!detail) return;
    setMcpPayloadMode('simple');
    setMcpMethod(MCP_JSONRPC_METHODS[0]);
    setMcpParamsJson(JSON.stringify(getMethodParamExample(MCP_JSONRPC_METHODS[0]), null, 2));
    setMcpPresetId(getDefaultPresetIdByMethod(MCP_JSONRPC_METHODS[0]));
    setInvokePayload(DEFAULT_MCP_PAYLOAD_TEXT);
    setInvokeGatewayMode('invoke');
    setInvokeTraceId(newTraceId());
    setInvokeVersion('');
    setInvokeTimeoutSec(60);
    setInvokeResponse(null);
    setInvokeResultMessage(null);
    setInvokeResultError(null);
    setInvokeRequestTraceId('');
    setDetailTab('reviews');
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
    if (key) localStorage.setItem('lantu_api_key', key);
    else localStorage.removeItem('lantu_api_key');
  }, [invokeApiKey]);

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((item) => {
      const blob = `${item.displayName} ${item.resourceCode} ${item.description ?? ''} ${(item.tags ?? []).join(' ')}`.toLowerCase();
      return blob.includes(term);
    });
  }, [keyword, rows]);

  const invokeBodyView = useMemo(
    () => (invokeResponse ? tryFormatJsonText(invokeResponse.body ?? '') : null),
    [invokeResponse],
  );

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
    if (!Number.isFinite(invokeTimeoutSec) || invokeTimeoutSec < 1 || invokeTimeoutSec > 120) {
      return '超时秒数必须为 1~120 之间的数字';
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
  }, [detail?.resourceId, invokeApiKey, invokeTimeoutSec]);

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
    setInvokeRequestTraceId(invokeTraceId);
    try {
      let resolved;
      try {
        resolved = await resourceCatalogService.resolve({
          resourceType: 'mcp',
          resourceId: detail.resourceId,
          version: invokeVersion.trim() || undefined,
        });
      } catch (e) {
        setInvokeResultError(`${mapInvokeFlowError(e, 'resolve')}\n可保留当前参数后重试解析`);
        return;
      }
      if (resolved.invokeType === 'redirect' && resolved.endpoint) {
        window.open(resolved.endpoint, '_blank', 'noopener,noreferrer');
        setInvokeResultMessage(`该 MCP 资源为跳转类型，已打开地址：${resolved.endpoint}`);
        return;
      }
      if (resolved.invokeType === 'metadata') {
        setInvokeResultMessage(`该 MCP 资源返回元数据：${JSON.stringify(resolved.spec ?? {}, null, 2)}`);
        return;
      }
      const requestPayload: InvokeRequest = {
        resourceType: 'mcp',
        resourceId: detail.resourceId,
        version: invokeVersion.trim() || undefined,
        timeoutSec: invokeTimeoutSec,
        payload: built.payload,
      };
      try {
        const res = invokeGatewayMode === 'sdk'
          ? await sdkService.invoke(invokeApiKey.trim(), requestPayload, invokeTraceId)
          : await invokeService.invoke(requestPayload, invokeApiKey.trim(), invokeTraceId);
        setInvokeResponse(res);
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
    invokeVersion,
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

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass} ${canvasBodyBg(theme)}`}>
      <div className="px-3 py-4 sm:px-4 lg:px-5">
        <div className={`${bentoCard(theme)} overflow-hidden p-4 sm:p-6 lg:p-8`}>
          <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
                <Puzzle size={22} className="text-neutral-800" />
              </div>
              <PageTitleTagline
                subtitleOnly
                theme={theme}
                title={chromePageTitle || 'MCP 市场'}
                tagline="浏览、获取授权指引并调用 MCP 资源"
              />
            </div>
            <GlassPanel theme={theme} padding="sm" className="!p-0 w-full sm:w-72">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="mcp-market-search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="搜索 MCP 名称或编码…"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className={`w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none ${textPrimary(theme)}`}
                />
              </div>
            </GlassPanel>
          </div>

          <div className={`mb-5 flex flex-wrap items-center gap-2`}>
            <span className={`text-xs font-medium ${textMuted(theme)}`}>标签：</span>
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                tagFilter === null
                  ? 'bg-neutral-900 text-white shadow-sm shadow-neutral-900/15'
                  : isDark
                    ? 'text-slate-400 hover:bg-white/5'
                    : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              全部
            </button>
            {catalogTags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTagFilter((p) => (p === t.name ? null : t.name))}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  tagFilter === t.name
                    ? 'bg-neutral-900 text-white shadow-sm shadow-neutral-900/15'
                    : isDark
                      ? 'text-slate-400 hover:bg-white/5'
                      : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-slate-400" />
            </div>
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
                  className="flex h-full flex-col !rounded-[20px]"
                  onClick={() => setDetail(item)}
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white bg-neutral-900 ${isDark ? 'opacity-95' : ''}`}>
                      <Puzzle size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`truncate font-semibold ${textPrimary(theme)}`}>{item.displayName}</h3>
                      <p className={`truncate text-xs font-mono ${textMuted(theme)}`}>{item.resourceCode || item.resourceId}</p>
                    </div>
                  </div>
                  <p className={`mb-3 line-clamp-2 text-sm ${textSecondary(theme)}`}>{item.description || '暂无描述'}</p>
                  {(item.tags ?? []).length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {(item.tags ?? []).slice(0, 5).map((tg) => (
                        <span key={tg} className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{tg}</span>
                      ))}
                    </div>
                  )}
                  <div className={`mt-auto flex items-center justify-between border-t pt-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/40'}`}>
                    <span className={`text-xs ${textMuted(theme)}`}>状态：{statusLabel(item.status as any)}</span>
                    <button type="button" className={`${btnPrimary} !px-3 !py-1.5 !text-xs`} onClick={(e) => { e.stopPropagation(); setDetail(item); }}>
                      查看与使用
                    </button>
                  </div>
                </BentoCard>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!detail}
        onClose={() => { setDetail(null); setGrantModalOpen(false); }}
        title={detail ? `MCP 详情 - ${detail.displayName}` : ''}
        theme={theme}
        size="xl"
        contentClassName="flex-1 overflow-y-auto px-6 py-4 lg:px-8 lg:py-5"
        footer={(
          <>
            <button type="button" className={btnSecondary(theme)} onClick={() => setDetail(null)}>关闭</button>
            <button type="button" className={`${btnSecondary(theme)} disabled:opacity-50`} disabled={favoriteLoading || isFavorited} onClick={() => void handleFavorite()}>
              {favoriteLoading ? <><Loader2 size={14} className="animate-spin" /> 收藏中…</> : <><Heart size={14} className={isFavorited ? 'fill-current' : ''} /> {isFavorited ? '已收藏' : '收藏'}</>}
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={handleApply}>
              <Send size={14} />
              获取授权指引
            </button>
            <button type="button" className={`${btnPrimary} disabled:opacity-50`} disabled={invoking} onClick={() => void handleInvoke()}>
              {invoking ? <><Loader2 size={14} className="animate-spin" /> 调用中…</> : <><Play size={14} /> 调用</>}
            </button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-5">
            <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
              <p className={`text-xs ${textMuted(theme)}`}>资源编码：{detail.resourceCode || detail.resourceId}</p>
              <p className={`mt-1 text-xs ${textMuted(theme)}`}>调用目标：mcp / {detail.resourceId}</p>
              <p className={`mt-2 text-sm leading-relaxed ${textSecondary(theme)}`}>{detail.description || '暂无描述'}</p>
            </div>
            <div
              className={`rounded-xl border p-3 text-xs leading-relaxed ${
                isDark ? 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100/90' : 'border-amber-200 bg-amber-50 text-amber-950/85'
              }`}
            >
              <p className="font-semibold">统一网关 MCP 试用说明</p>
              <p className={`mt-1.5 ${isDark ? 'text-amber-100/75' : 'text-amber-950/70'}`}>
                多轮流程（如 initialize → tools/list → tools/call）请<strong className="font-semibold">连续多次点击「调用」</strong>，并保持同一 API Key；
                <code className="mx-0.5 rounded px-1 py-0.5 font-mono text-[11px] opacity-90">Mcp-Session-Id</code>
                由网关按密钥与 endpoint 自动维护，前端无需手动传递。工具真实名称须以
                <code className="mx-0.5 rounded px-1 py-0.5 font-mono text-[11px] opacity-90">tools/list</code>
                返回为准。
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div
                className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-100'}`}
                role="tablist"
                aria-label="MCP 详情标签页"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'reviews'}
                  onClick={() => setDetailTab('reviews')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    detailTab === 'reviews'
                      ? isDark ? 'bg-white/12 text-white' : 'bg-white text-slate-900 shadow-sm'
                      : textMuted(theme)
                  }`}
                >
                  评分评论
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailTab === 'invoke'}
                  onClick={() => setDetailTab('invoke')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    detailTab === 'invoke'
                      ? isDark ? 'bg-white/12 text-white' : 'bg-white text-slate-900 shadow-sm'
                      : textMuted(theme)
                  }`}
                >
                  调用调试
                </button>
              </div>
              <span className={`text-[11px] ${textMuted(theme)}`}>
                {detailTab === 'invoke' ? '当前：调用参数与结果' : '当前：资源评论区'}
              </span>
            </div>
            {detailTab === 'invoke' && (
              <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>调用通道</label>
                <LantuSelect
                  theme={theme}
                  value={invokeGatewayMode}
                  onChange={(next) => setInvokeGatewayMode(next as InvokeGatewayMode)}
                  options={[
                    { value: 'invoke', label: '/api/invoke（推荐）' },
                    { value: 'sdk', label: '/api/sdk/v1/invoke（SDK）' },
                  ]}
                  triggerClassName="!text-xs"
                />
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
                <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>版本（可选）</label>
                <input
                  type="text"
                  value={invokeVersion}
                  onChange={(e) => setInvokeVersion(e.target.value)}
                  placeholder="v1"
                  className={`${nativeInputClass(theme)} font-mono text-xs`}
                />
                <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>不填则走后端默认版本</p>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>超时（秒）</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={invokeTimeoutSec}
                  onChange={(e) => setInvokeTimeoutSec(Number(e.target.value) || 60)}
                  className={`${nativeInputClass(theme)} font-mono text-xs`}
                />
                <p className={`mt-1 text-[11px] ${textMuted(theme)}`}>建议范围 1~120 秒</p>
              </div>
            </div>
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
                    <textarea
                      rows={5}
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
                  <textarea
                    rows={8}
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
                  <div className="flex items-center gap-2">
                    <h5 className={`text-sm font-semibold ${textSecondary(theme)}`}>调用结果</h5>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        invokeResponse.status === 'success'
                          ? isDark ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                          : isDark ? 'bg-rose-500/20 text-rose-200' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {invokeResponse.status}
                    </span>
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
                    <p className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{invokeResponse.resourceType}/{invokeResponse.resourceId}</p>
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
                    isDark ? 'border-white/10 bg-[#0f172a]' : 'border-slate-200 bg-white'
                  }`}>
                    {invokeBodyView?.text || ''}
                  </pre>
                </div>
              </div>
            )}
              </>
            )}
            {detailTab === 'reviews' && (
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
            )}
          </div>
        )}
      </Modal>
      <GrantApplicationModal
        open={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        theme={theme}
        resourceType="mcp"
        resourceId={detail?.resourceId ?? ''}
        resourceName={detail?.displayName}
        showMessage={showMessage}
      />
    </div>
  );
};
