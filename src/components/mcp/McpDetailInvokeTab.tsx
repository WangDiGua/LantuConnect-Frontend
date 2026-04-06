import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, RefreshCw, Search } from 'lucide-react';
import type { Theme } from '../../types';
import type { CatalogResourceDetailVO, InvokeResponse } from '../../types/dto/catalog';
import { env } from '../../config/env';
import { MAX_STORED_API_KEY_LENGTH, readBoundedLocalStorage } from '../../lib/safeStorage';
import { safeOpenHttpUrl } from '../../lib/windowNavigate';
import { lantuCheckboxPrimaryClass, nativeInputClass } from '../../utils/formFieldClasses';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import {
  MCP_JSONRPC_METHODS,
  McpPayloadMode,
  buildMcpInvokePayload,
  extractParamsFromMcpPayload,
  newMcpTraceId,
  MCP_DEFAULT_INITIALIZE_PARAMS,
  parseJsonRpcErrorFromBody,
  parseToolsListFromInvokeBody,
  tryParseJsonObject,
  validateMcpInvokePayload,
  type McpToolListItem,
} from '../../utils/mcpInvoke';
import { useMcpGatewayInvoke, type RunInvokeResult } from '../../hooks/useMcpGatewayInvoke';
import { AutoHeightTextarea } from '../common/AutoHeightTextarea';
import { LantuSelect } from '../common/LantuSelect';
import { McpInvokeProtocolPanel } from './McpInvokeProtocolPanel';
import { McpInvokeResultSection } from './McpInvokeResultSection';
import { McpToolArgsForm } from './McpToolArgsForm';
import {
  DEFAULT_MCP_PAYLOAD_TEXT,
  MCP_METHOD_LABELS,
  MCP_PARAM_PRESETS,
  getDefaultPresetIdByMethod,
  getMethodParamExample,
} from './mcpInvokePresets';

const API_PATH_PREFIX = env.VITE_API_BASE_URL.replace(/\/$/, '');

export type McpDetailInvokeTabProps = {
  theme: Theme;
  detail: CatalogResourceDetailVO;
  invokeCatalogVersion: string;
  loadMcpDetailByPath: () => Promise<void>;
  detailPageLoading: boolean;
  showMessage?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  /** 与健康/熔断一致：为 true 时禁用一切网关调用 UI */
  invokeDisabled?: boolean;
  invokeDisabledReason?: string;
};

export const McpDetailInvokeTab: React.FC<McpDetailInvokeTabProps> = ({
  theme,
  detail,
  invokeCatalogVersion,
  loadMcpDetailByPath,
  detailPageLoading,
  showMessage,
  invokeDisabled = false,
  invokeDisabledReason,
}) => {
  const isDark = theme === 'dark';
  const connectAnchorRef = useRef<HTMLButtonElement>(null);

  const [mcpPayloadMode, setMcpPayloadMode] = useState<McpPayloadMode>('simple');
  const [mcpMethod, setMcpMethod] = useState<string>(MCP_JSONRPC_METHODS[0]);
  const [mcpParamsJson, setMcpParamsJson] = useState(() => JSON.stringify(getMethodParamExample(MCP_JSONRPC_METHODS[0]), null, 2));
  const [mcpPresetId, setMcpPresetId] = useState<string>(() => getDefaultPresetIdByMethod(MCP_JSONRPC_METHODS[0]));
  const [invokePayload, setInvokePayload] = useState(DEFAULT_MCP_PAYLOAD_TEXT);
  const [invokeGatewayMode, setInvokeGatewayMode] = useState<'invoke' | 'sdk'>('invoke');
  const [invokeUseStream, setInvokeUseStream] = useState(false);
  const [invokeApiKey, setInvokeApiKey] = useState<string>(
    () => readBoundedLocalStorage('lantu_api_key', MAX_STORED_API_KEY_LENGTH) ?? '',
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [invokeTraceId, setInvokeTraceId] = useState(() => newMcpTraceId());
  const [invokeTimeoutSec, setInvokeTimeoutSec] = useState(60);
  const [invokeResponse, setInvokeResponse] = useState<InvokeResponse | null>(null);
  const [invokeResultMessage, setInvokeResultMessage] = useState<string | null>(null);
  const [invokeResultError, setInvokeResultError] = useState<string | null>(null);
  const [invokeRequestTraceId, setInvokeRequestTraceId] = useState<string>('');
  const [invokeStreamOutput, setInvokeStreamOutput] = useState('');
  const [invoking, setInvoking] = useState(false);

  const [skipInitializedNotification, setSkipInitializedNotification] = useState(false);
  const [sessionPhase, setSessionPhase] = useState<'idle' | 'connecting' | 'ready' | 'error'>('idle');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [failedConnectStep, setFailedConnectStep] = useState<string | null>(null);
  const [listedTools, setListedTools] = useState<McpToolListItem[]>([]);
  const [toolListMessage, setToolListMessage] = useState<string | null>(null);
  const [toolFilter, setToolFilter] = useState('');
  const [selectedToolName, setSelectedToolName] = useState('');
  const [toolArgumentsJson, setToolArgumentsJson] = useState('{}');
  const [argsJsonError, setArgsJsonError] = useState<string | null>(null);
  const [lastQuickToolName, setLastQuickToolName] = useState<string | undefined>(undefined);

  const detailResourceKey = detail.resourceId;

  const resetInvokeState = useCallback(() => {
    setMcpPayloadMode('simple');
    setMcpMethod(MCP_JSONRPC_METHODS[0]);
    setMcpParamsJson(JSON.stringify(getMethodParamExample(MCP_JSONRPC_METHODS[0]), null, 2));
    setMcpPresetId(getDefaultPresetIdByMethod(MCP_JSONRPC_METHODS[0]));
    setInvokePayload(DEFAULT_MCP_PAYLOAD_TEXT);
    setInvokeGatewayMode('invoke');
    setInvokeUseStream(false);
    setInvokeStreamOutput('');
    setInvokeTraceId(newMcpTraceId());
    setInvokeTimeoutSec(60);
    setInvokeResponse(null);
    setInvokeResultMessage(null);
    setInvokeResultError(null);
    setInvokeRequestTraceId('');
    setSkipInitializedNotification(false);
    setSessionPhase('idle');
    setConnectError(null);
    setFailedConnectStep(null);
    setListedTools([]);
    setToolListMessage(null);
    setToolFilter('');
    setSelectedToolName('');
    setToolArgumentsJson('{}');
    setArgsJsonError(null);
    setLastQuickToolName(undefined);
  }, []);

  useEffect(() => {
    resetInvokeState();
  }, [detailResourceKey, resetInvokeState]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      connectAnchorRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

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

  const { runInvoke } = useMcpGatewayInvoke({
    detail,
    invokeCatalogVersion,
    invokeApiKey,
    invokeTraceId,
    invokeTimeoutSec,
    invokeUseStream,
    invokeGatewayMode,
    onStreamAccumulated: setInvokeStreamOutput,
  });

  const applyInvokeOutcome = useCallback((out: RunInvokeResult, traceForRequest: string) => {
    setInvokeRequestTraceId(traceForRequest);
    if (out.kind === 'redirect') {
      if (!safeOpenHttpUrl(out.endpoint)) {
        setInvokeResultError('无法打开该地址（仅支持 http/https）');
        return false;
      }
      setInvokeResultMessage(`该 MCP 资源为跳转类型，已打开地址：${out.endpoint}`);
      return true;
    }
    if (out.kind === 'metadata') {
      setInvokeResultMessage(`该 MCP 资源返回元数据：${JSON.stringify(out.spec ?? {}, null, 2)}`);
      return true;
    }
    if (out.kind === 'error') {
      setInvokeResultError(out.message);
      return false;
    }
    setInvokeResponse(out.response);
    return true;
  }, []);

  const copyText = useCallback(
    async (text: string, successText: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showMessage?.(successText, 'success');
      } catch {
        showMessage?.('复制失败，请稍后重试', 'warning');
      }
    },
    [showMessage],
  );

  const mcpMethodOptions = useMemo(
    () =>
      MCP_JSONRPC_METHODS.map((method) => ({
        value: method,
        label: `${MCP_METHOD_LABELS[method]}（${method}）`,
      })),
    [],
  );

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

  const handleMcpMethodChange = useCallback(
    (nextMethod: string) => {
      setMcpMethod(nextMethod);
      if (mcpPayloadMode === 'simple') {
        const defaultPreset = MCP_PARAM_PRESETS.find((preset) => preset.method === nextMethod);
        setMcpParamsJson(JSON.stringify(defaultPreset?.params ?? getMethodParamExample(nextMethod), null, 2));
        setMcpPresetId(defaultPreset?.id ?? 'custom');
      }
    },
    [mcpPayloadMode],
  );

  const handlePresetChange = useCallback(
    (nextPresetId: string) => {
      setMcpPresetId(nextPresetId);
      if (nextPresetId === 'custom') return;
      const preset = MCP_PARAM_PRESETS.find((item) => item.id === nextPresetId);
      if (!preset) return;
      if (preset.method !== mcpMethod) setMcpMethod(preset.method);
      setMcpParamsJson(JSON.stringify(preset.params, null, 2));
    },
    [mcpMethod],
  );

  const switchPayloadMode = useCallback(
    (next: McpPayloadMode) => {
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
      const params = extractParamsFromMcpPayload(parsed.payload);
      setMcpParamsJson(JSON.stringify(params, null, 2));
      setMcpPresetId(getDefaultPresetIdByMethod(typeof m === 'string' ? m : MCP_JSONRPC_METHODS[0]));
      setMcpPayloadMode('simple');
    },
    [invokePayload, mcpMethod, mcpParamsJson, mcpPayloadMode, showMessage],
  );

  const handleProtocolInvoke = useCallback(async () => {
    if (invokeDisabled) return;
    const built = buildMcpInvokePayload(mcpPayloadMode, invokePayload, mcpMethod, mcpParamsJson);
    if (built.ok === false) {
      showMessage?.(built.message, 'warning');
      return;
    }
    const invalidReason = validateMcpInvokePayload(built.payload, {
      hasApiKey: !!invokeApiKey.trim(),
      hasResourceId: !!detail?.resourceId,
      invokeTimeoutSec,
      invokeUseStream,
    });
    if (invalidReason) {
      showMessage?.(invalidReason, 'warning');
      return;
    }
    setInvoking(true);
    setInvokeResponse(null);
    setInvokeResultMessage(null);
    setInvokeResultError(null);
    if (!invokeUseStream) setInvokeStreamOutput('');
    const trace = invokeTraceId;
    setInvokeRequestTraceId(trace);
    try {
      const out = await runInvoke(built.payload);
      applyInvokeOutcome(out, trace);
    } catch (err) {
      setInvokeResultError(`调用失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setInvoking(false);
    }
  }, [
    applyInvokeOutcome,
    detail?.resourceId,
    invokeApiKey,
    invokePayload,
    invokeTimeoutSec,
    invokeTraceId,
    invokeUseStream,
    mcpMethod,
    mcpParamsJson,
    mcpPayloadMode,
    runInvoke,
    showMessage,
    invokeDisabled,
  ]);

  const connectSteps = useMemo(() => {
    const steps: Array<{ method: string; params: Record<string, unknown>; label: string }> = [
      { method: 'initialize', params: { ...MCP_DEFAULT_INITIALIZE_PARAMS }, label: 'initialize' },
    ];
    if (!skipInitializedNotification) {
      steps.push({ method: 'notifications/initialized', params: {}, label: 'notifications/initialized' });
    }
    steps.push({ method: 'tools/list', params: {}, label: 'tools/list' });
    return steps;
  }, [skipInitializedNotification]);

  const handleConnectAndLoadTools = useCallback(async () => {
    if (invokeDisabled) return;
    if (invokeUseStream) {
      showMessage?.('请先关闭「流式调用」后再使用自动连接', 'warning');
      return;
    }
    const invalidReason = validateMcpInvokePayload({ method: 'initialize', params: { ...MCP_DEFAULT_INITIALIZE_PARAMS } }, {
      hasApiKey: !!invokeApiKey.trim(),
      hasResourceId: !!detail?.resourceId,
      invokeTimeoutSec,
      invokeUseStream,
    });
    if (invalidReason) {
      showMessage?.(invalidReason, 'warning');
      return;
    }
    setSessionPhase('connecting');
    setConnectError(null);
    setFailedConnectStep(null);
    setToolListMessage(null);
    setListedTools([]);
    setInvoking(true);
    setInvokeResponse(null);
    setInvokeResultMessage(null);
    setInvokeResultError(null);
    const trace = invokeTraceId;
    setInvokeRequestTraceId(trace);

    try {
      for (const step of connectSteps) {
        const out = await runInvoke({ method: step.method, params: step.params });
        if (out.kind === 'redirect') {
          if (!safeOpenHttpUrl(out.endpoint)) {
            setConnectError('无法打开该地址（仅支持 http/https）');
            setSessionPhase('error');
            setFailedConnectStep(step.label);
            return;
          }
          setInvokeResultMessage(`该 MCP 为跳转类型，已打开：${out.endpoint}`);
          setSessionPhase('error');
          setFailedConnectStep(step.label);
          return;
        }
        if (out.kind === 'metadata') {
          setConnectError('当前资源为元数据类型，无法在此走 JSON-RPC 自动连接');
          setSessionPhase('error');
          setFailedConnectStep(step.label);
          return;
        }
        if (out.kind === 'error') {
          setConnectError(out.message);
          setSessionPhase('error');
          setFailedConnectStep(step.label);
          return;
        }
        const body = out.response.body ?? '';
        const jErr = parseJsonRpcErrorFromBody(body);
        if (jErr) {
          setConnectError(`步骤 ${step.label}：JSON-RPC ${jErr.code} · ${jErr.message}`);
          setSessionPhase('error');
          setFailedConnectStep(step.label);
          return;
        }
        if (step.method === 'tools/list') {
          const parsed = parseToolsListFromInvokeBody(body);
          if (parsed.ok === false) {
            setConnectError(parsed.message);
            setSessionPhase('error');
            setFailedConnectStep('tools/list');
            return;
          }
          setListedTools(parsed.tools);
          setToolListMessage(parsed.tools.length === 0 ? '服务端返回的工具列表为空' : null);
          if (parsed.tools.length > 0) {
            const first = parsed.tools[0]?.name?.trim() ?? '';
            setSelectedToolName(first);
            setToolArgumentsJson('{}');
            setArgsJsonError(null);
          } else {
            setSelectedToolName('');
            setToolArgumentsJson('{}');
          }
          setInvokeResponse(out.response);
        }
      }
      setSessionPhase('ready');
      showMessage?.('已连接并加载工具列表', 'success');
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : '连接失败');
      setSessionPhase('error');
    } finally {
      setInvoking(false);
    }
  }, [
    connectSteps,
    detail?.resourceId,
    invokeApiKey,
    invokeTimeoutSec,
    invokeTraceId,
    invokeUseStream,
    runInvoke,
    showMessage,
    invokeDisabled,
  ]);

  const parsedArgumentsObject = useMemo((): Record<string, unknown> => {
    try {
      const p = JSON.parse(toolArgumentsJson.trim() || '{}');
      if (p === null || typeof p !== 'object' || Array.isArray(p)) return {};
      return p as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [toolArgumentsJson]);

  const selectedToolMeta = useMemo(
    () => listedTools.find((t) => t.name === selectedToolName),
    [listedTools, selectedToolName],
  );

  useEffect(() => {
    try {
      JSON.parse(toolArgumentsJson.trim() || '{}');
      setArgsJsonError(null);
    } catch {
      setArgsJsonError('参数 JSON 格式无效，表单同步已暂停');
    }
  }, [toolArgumentsJson]);

  const handleQuickCallTool = useCallback(async () => {
    if (invokeDisabled) return;
    if (!selectedToolName.trim()) {
      showMessage?.('请先选择工具', 'warning');
      return;
    }
    let args: Record<string, unknown>;
    try {
      const p = JSON.parse(toolArgumentsJson.trim() || '{}');
      if (p === null || typeof p !== 'object' || Array.isArray(p)) {
        showMessage?.('arguments 须为 JSON 对象', 'warning');
        return;
      }
      args = p as Record<string, unknown>;
    } catch {
      showMessage?.('arguments JSON 解析失败', 'warning');
      return;
    }
    const payload = { method: 'tools/call', params: { name: selectedToolName.trim(), arguments: args } };
    const invalidReason = validateMcpInvokePayload(payload, {
      hasApiKey: !!invokeApiKey.trim(),
      hasResourceId: !!detail?.resourceId,
      invokeTimeoutSec,
      invokeUseStream,
    });
    if (invalidReason) {
      showMessage?.(invalidReason, 'warning');
      return;
    }
    setInvoking(true);
    setInvokeResponse(null);
    setInvokeResultMessage(null);
    setInvokeResultError(null);
    if (!invokeUseStream) setInvokeStreamOutput('');
    const trace = invokeTraceId;
    setInvokeRequestTraceId(trace);
    setLastQuickToolName(selectedToolName.trim());
    try {
      const out = await runInvoke(payload);
      applyInvokeOutcome(out, trace);
    } catch (err) {
      setInvokeResultError(`调用失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setInvoking(false);
    }
  }, [
    applyInvokeOutcome,
    detail?.resourceId,
    invokeApiKey,
    invokeTimeoutSec,
    invokeTraceId,
    invokeUseStream,
    runInvoke,
    selectedToolName,
    showMessage,
    toolArgumentsJson,
    invokeDisabled,
  ]);

  const filteredTools = useMemo(() => {
    const q = toolFilter.trim().toLowerCase();
    if (!q) return listedTools;
    return listedTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q),
    );
  }, [listedTools, toolFilter]);

  const toolSelectOptions = useMemo(
    () =>
      filteredTools.map((t) => ({
        value: t.name,
        label: t.description ? `${t.name} — ${t.description.slice(0, 48)}${t.description.length > 48 ? '…' : ''}` : t.name,
      })),
    [filteredTools],
  );

  const stepIndicator = useMemo(() => {
    const labels = connectSteps.map((s) => s.label);
    return (
      <ol className={`mt-2 flex flex-wrap gap-2 text-xs ${textMuted(theme)}`} aria-label="连接步骤">
        {labels.map((l, i) => (
          <li
            key={l}
            className={`rounded-full px-2 py-0.5 font-mono ${
              sessionPhase === 'connecting' && i === labels.length - 1 && invoking
                ? isDark
                  ? 'bg-violet-500/25 text-violet-100'
                  : 'bg-violet-100 text-violet-900'
                : sessionPhase === 'ready'
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-100'
                    : 'bg-emerald-100 text-emerald-800'
                  : failedConnectStep === l
                    ? isDark
                      ? 'bg-rose-500/20 text-rose-100'
                      : 'bg-rose-100 text-rose-900'
                    : isDark
                      ? 'bg-white/5 text-slate-400'
                      : 'bg-slate-100 text-slate-600'
            }`}
          >
            {i + 1}. {l}
          </li>
        ))}
      </ol>
    );
  }, [connectSteps, failedConnectStep, invoking, isDark, sessionPhase, theme]);

  return (
    <div className="space-y-5">
      <p className={`text-xs ${textMuted(theme)}`} id="mcp-invoke-intro">
        当前：快速试用（自动握手 + 工具列表）与协议调试。建议使用同一 TraceId 贯穿调试。
      </p>

      {invokeDisabled ? (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
            isDark ? 'border-white/15 bg-white/[0.04] text-slate-200' : 'border-slate-200 bg-slate-100/80 text-slate-800'
          }`}
        >
          {invokeDisabledReason || '当前资源不可通过网关调用。'}
        </div>
      ) : null}

      <div
        inert={invokeDisabled}
        className={`space-y-5 ${invokeDisabled ? 'select-none opacity-45' : ''}`}
      >
      <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'}`}>
        <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>鉴权与超时</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>X-Api-Key（必填）</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                name="x-api-key"
                autoComplete="new-password"
                autoCapitalize="off"
                spellCheck={false}
                value={invokeApiKey}
                onChange={(e) => {
                  setInvokeApiKey(e.target.value.replace(/\s+/g, ''));
                  setSessionPhase('idle');
                  setListedTools([]);
                  setSelectedToolName('');
                }}
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
            <p className={`mt-1 text-xs ${textMuted(theme)}`}>
              请填写创建 API Key 时返回的完整 <code className="font-mono">sk_...</code> 明文（非 id、prefix、掩码）。
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
            <p className={`mt-1 text-xs ${textMuted(theme)}`}>
              {invokeUseStream ? '流式时最长 600 秒' : '建议 1~120 秒'}
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${isDark ? 'border-violet-500/20 bg-violet-500/[0.06]' : 'border-violet-200/80 bg-violet-50/50'}`}>
        <h3 className={`text-sm font-bold ${textPrimary(theme)}`}>快速试用</h3>
        <p className={`mt-1 text-xs leading-relaxed ${textSecondary(theme)}`}>
          一键完成 initialize →（可选）notifications/initialized → tools/list，然后选择工具并填写参数调用。须关闭流式。
        </p>

        <label className={`mt-3 flex cursor-pointer items-start gap-2 text-xs ${textMuted(theme)}`}>
          <input
            type="checkbox"
            className={`mt-0.5 ${lantuCheckboxPrimaryClass}`}
            checked={skipInitializedNotification}
            disabled={invoking}
            onChange={(e) => setSkipInitializedNotification(e.target.checked)}
          />
          <span>跳过「通知已就绪」（notifications/initialized），若握手后列表失败可尝试勾选</span>
        </label>

        {stepIndicator}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            ref={connectAnchorRef}
            type="button"
            className={`${btnPrimary} inline-flex min-h-11 items-center gap-2 disabled:opacity-50`}
            disabled={invoking || invokeUseStream}
            aria-busy={sessionPhase === 'connecting'}
            onClick={() => void handleConnectAndLoadTools()}
          >
            {sessionPhase === 'connecting' ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                连接中…
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                连接并加载工具
              </>
            )}
          </button>
          <button
            type="button"
            className={`${btnSecondary(theme)} min-h-11`}
            disabled={invoking}
            onClick={() => {
              setSessionPhase('idle');
              setConnectError(null);
              setFailedConnectStep(null);
              setListedTools([]);
              setToolListMessage(null);
              setSelectedToolName('');
              setToolArgumentsJson('{}');
            }}
          >
            清除会话状态
          </button>
          {invokeUseStream ? (
            <span className={`text-xs ${textMuted(theme)}`}>流式已开启：请使用下方「协议与网关调试」。</span>
          ) : null}
        </div>

        {connectError ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-xs whitespace-pre-wrap ${
              isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <p className="font-semibold">连接失败{failedConnectStep ? `（${failedConnectStep}）` : ''}</p>
            <p className="mt-1">{connectError}</p>
          </div>
        ) : null}

        {sessionPhase === 'ready' || listedTools.length > 0 ? (
          <div
            className={`mt-4 space-y-3 border-t pt-4 ${isDark ? 'border-white/10' : 'border-slate-200/90'}`}
          >
            {toolListMessage ? (
              <p className={`text-xs font-medium ${textMuted(theme)}`}>{toolListMessage}</p>
            ) : null}
            <div>
              <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>筛选工具</label>
              <div className="relative">
                <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${textMuted(theme)}`} aria-hidden />
                <input
                  type="search"
                  value={toolFilter}
                  onChange={(e) => setToolFilter(e.target.value)}
                  placeholder="按名称或描述过滤…"
                  className={`${nativeInputClass(theme)} pl-9 text-xs`}
                  aria-label="筛选工具列表"
                />
              </div>
            </div>
            <div>
              <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>选择工具</label>
              <LantuSelect
                theme={theme}
                value={selectedToolName}
                onChange={(v) => {
                  setSelectedToolName(v);
                  setToolArgumentsJson('{}');
                }}
                options={toolSelectOptions.length ? toolSelectOptions : [{ value: '', label: listedTools.length ? '请从列表选择' : '请先连接' }]}
                placeholder="请选择工具…"
                triggerClassName="!text-xs"
                disabled={!listedTools.length}
              />
            </div>

            {selectedToolMeta?.inputSchema && !argsJsonError ? (
              <McpToolArgsForm
                theme={theme}
                inputSchema={selectedToolMeta.inputSchema}
                value={parsedArgumentsObject}
                disabled={invoking}
                onChange={(next) => setToolArgumentsJson(JSON.stringify(next, null, 2))}
              />
            ) : null}

            <div>
              <label className={`mb-1.5 block text-xs font-medium ${textMuted(theme)}`}>arguments（JSON 对象）</label>
              <AutoHeightTextarea
                minRows={4}
                maxRows={18}
                value={toolArgumentsJson}
                onChange={(e) => setToolArgumentsJson(e.target.value)}
                className={`${nativeInputClass(theme)} resize-none font-mono text-xs${argsJsonError ? ' ring-2 ring-rose-500/40' : ''}`}
                placeholder="{}"
              />
              {argsJsonError ? <p className="mt-1 text-xs text-rose-500">{argsJsonError}</p> : null}
            </div>

            <button
              type="button"
              className={`${btnPrimary} inline-flex min-h-11 items-center gap-2 disabled:opacity-50`}
              disabled={invoking || !selectedToolName.trim()}
              onClick={() => void handleQuickCallTool()}
            >
              {invoking ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  调用中…
                </>
              ) : (
                <>调用当前工具</>
              )}
            </button>
          </div>
        ) : null}
      </div>

      {invokeUseStream && (invoking || invokeStreamOutput) ? (
        <div>
          <p className={`mb-1 text-xs font-semibold ${textSecondary(theme)}`}>流式输出（实时）</p>
          <pre
            className={`max-h-[28vh] overflow-auto rounded-xl border p-3 text-xs leading-relaxed whitespace-pre-wrap ${
              isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'
            }`}
          >
            {invokeStreamOutput || (invoking ? '等待首包…' : '')}
          </pre>
        </div>
      ) : null}

      <McpInvokeResultSection
        theme={theme}
        invokeResponse={invokeResponse}
        invokeResultMessage={invokeResultMessage}
        invokeResultError={invokeResultError}
        invokeRequestTraceId={invokeRequestTraceId}
        invokeTraceId={invokeTraceId}
        quickToolName={lastQuickToolName}
        onCopy={(t, m) => void copyText(t, m)}
      />

      <McpInvokeProtocolPanel
        theme={theme}
        API_PATH_PREFIX={API_PATH_PREFIX}
        invokeGatewayMode={invokeGatewayMode}
        setInvokeGatewayMode={setInvokeGatewayMode}
        invokeUseStream={invokeUseStream}
        setInvokeUseStream={setInvokeUseStream}
        invokeApiKey={invokeApiKey}
        setInvokeApiKey={setInvokeApiKey}
        showApiKey={showApiKey}
        setShowApiKey={setShowApiKey}
        invokeTraceId={invokeTraceId}
        setInvokeTraceId={setInvokeTraceId}
        onRegenerateTraceId={() => setInvokeTraceId(newMcpTraceId())}
        invokeCatalogVersion={invokeCatalogVersion}
        detailPageLoading={detailPageLoading}
        onReloadDetail={() => void loadMcpDetailByPath()}
        mcpPayloadMode={mcpPayloadMode}
        onSwitchPayloadMode={switchPayloadMode}
        mcpMethod={mcpMethod}
        onMcpMethodChange={handleMcpMethodChange}
        mcpMethodOptions={mcpMethodOptions}
        mcpPresetId={mcpPresetId}
        onPresetChange={handlePresetChange}
        methodPresetOptions={methodPresetOptions}
        mcpParamsJson={mcpParamsJson}
        setMcpParamsJson={setMcpParamsJson}
        invokePayload={invokePayload}
        setInvokePayload={setInvokePayload}
        onProtocolInvoke={() => void handleProtocolInvoke()}
        invoking={invoking}
        streamHintWhenQuick={invokeUseStream}
      />
      </div>
    </div>
  );
};

McpDetailInvokeTab.displayName = 'McpDetailInvokeTab';
