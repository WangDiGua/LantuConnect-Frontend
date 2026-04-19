import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileJson, Loader2, Play, RotateCcw } from 'lucide-react';

import { capabilityService } from '../../../api/services/capability.service';
import { invokeService } from '../../../api/services/invoke.service';
import { GatewayApiKeyInput } from '../../common/GatewayApiKeyInput';
import { AutoHeightTextarea } from '../../common/AutoHeightTextarea';
import { MarketDetailSectionCard } from '../ResourceMarketDetailShell';
import { usePersistedGatewayApiKey } from '../../../hooks/usePersistedGatewayApiKey';
import type { Theme } from '../../../types';
import type { Agent } from '../../../types/dto/agent';
import { nativeInputClass } from '../../../utils/formFieldClasses';
import { mapInvokeFlowError } from '../../../utils/invokeError';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../../utils/uiClasses';
import { buildAgentTestingProfile } from './resourceTestingProfiles';

type Props = {
  theme: Theme;
  agent: Agent;
  invokeDisabled?: boolean;
  invokeDisabledReason?: string;
  showMessage?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
};

function stringifyJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function parseJsonObject(
  text: string,
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: '请输入 JSON 对象。' };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, message: 'JSON 格式不正确。' };
  }
}

export const AgentQuickTestPanel: React.FC<Props> = ({
  theme,
  agent,
  invokeDisabled = false,
  invokeDisabledReason,
  showMessage,
}) => {
  const isDark = theme === 'dark';
  const [gatewayApiKeyDraft, setGatewayApiKeyDraft] = usePersistedGatewayApiKey();
  const adapterId =
    typeof agent.specJson?.x_adapter_id === 'string' && agent.specJson.x_adapter_id.trim()
      ? agent.specJson.x_adapter_id
      : undefined;
  const adapterLabel =
    typeof agent.specJson?.x_provider_label === 'string' && agent.specJson.x_provider_label.trim()
      ? agent.specJson.x_provider_label
      : undefined;
  const registrationProtocol =
    typeof agent.specJson?.x_protocol_family === 'string' && agent.specJson.x_protocol_family.trim()
      ? agent.specJson.x_protocol_family
      : typeof agent.specJson?.registrationProtocol === 'string'
        ? agent.specJson.registrationProtocol
        : undefined;
  const modelAlias =
    typeof agent.specJson?.x_model_alias === 'string' && agent.specJson.x_model_alias.trim()
      ? agent.specJson.x_model_alias
      : typeof agent.specJson?.modelAlias === 'string' && agent.specJson.modelAlias.trim()
        ? agent.specJson.modelAlias
        : agent.agentName;
  const baseProfile = useMemo(
    () =>
      buildAgentTestingProfile({
        registrationProtocol,
        modelAlias,
        adapterId,
        adapterLabel,
      }),
    [adapterId, adapterLabel, modelAlias, registrationProtocol],
  );
  const defaultPayloadText = useMemo(() => stringifyJson(baseProfile.defaultPayload), [baseProfile.defaultPayload]);
  const nativePayloadText = useMemo(() => stringifyJson(baseProfile.nativePayload), [baseProfile.nativePayload]);

  const [payloadText, setPayloadText] = useState(defaultPayloadText);
  const [payloadTouched, setPayloadTouched] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState(30);
  const [traceId, setTraceId] = useState(() => `agent-${Date.now()}`);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [resultText, setResultText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    setPayloadText(defaultPayloadText);
    setPayloadTouched(false);
    setTimeoutSec(30);
    setTraceId(`agent-${Date.now()}`);
    setAdvancedOpen(false);
    setRunning(false);
    setResultText('');
    setErrorText('');
    setStatusCode(null);
    setLatencyMs(null);
  }, [agent.id, defaultPayloadText]);

  const restorePayload = useCallback(() => {
    setPayloadText(defaultPayloadText);
    setPayloadTouched(false);
    showMessage?.('已恢复当前协议的最小测试输入。', 'info');
  }, [defaultPayloadText, showMessage]);

  const handleRun = useCallback(async () => {
    if (invokeDisabled) {
      setErrorText(invokeDisabledReason ?? '当前 Agent 暂不可调用。');
      return;
    }
    const apiKey = gatewayApiKeyDraft.trim();
    if (!apiKey) {
      setErrorText('请先填写有效的 X-Api-Key，且该密钥需要具备 resolve 与 invoke scope。');
      return;
    }

    const parsedPayload = parseJsonObject(payloadText);
    if (parsedPayload.ok === false) {
      setErrorText(parsedPayload.message);
      return;
    }

    setRunning(true);
    setResultText('');
    setErrorText('');
    setStatusCode(null);
    setLatencyMs(null);

    const startedAt = Date.now();
    let stage: 'resolve' | 'invoke' = 'resolve';
    let finalPayload = parsedPayload.data;

    try {
      const resolved = await capabilityService.resolveCapability(
        Number(agent.id),
        { include: 'closure,bindings' },
        { headers: { 'X-Api-Key': apiKey } },
      );

      if (!payloadTouched && resolved.suggestedPayload && Object.keys(resolved.suggestedPayload).length > 0) {
        const suggested = buildAgentTestingProfile({
          registrationProtocol: baseProfile.protocol,
          modelAlias,
          adapterId,
          adapterLabel,
          suggestedPayload: resolved.suggestedPayload,
        });
        finalPayload = suggested.defaultPayload;
        setPayloadText(stringifyJson(suggested.defaultPayload));
      }

      stage = 'invoke';
      const invokeRes = await invokeService.invoke(
        {
          resourceType: 'agent',
          resourceId: String(agent.id),
          version: resolved.capability.version || undefined,
          timeoutSec: Math.max(1, Math.min(120, Number(timeoutSec) || 30)),
          payload: finalPayload,
        },
        apiKey,
        traceId.trim() || `agent-${Date.now()}`,
      );
      setStatusCode(Number(invokeRes.statusCode) || null);
      setLatencyMs(Number(invokeRes.latencyMs) || Date.now() - startedAt);
      setResultText(invokeRes.body || JSON.stringify(invokeRes, null, 2));
      showMessage?.('智能体一键试用完成。', 'success');
    } catch (reason) {
      setErrorText(mapInvokeFlowError(reason, stage));
    } finally {
      setRunning(false);
    }
  }, [
    agent.id,
    adapterId,
    adapterLabel,
    baseProfile.protocol,
    gatewayApiKeyDraft,
    modelAlias,
    payloadText,
    payloadTouched,
    registrationProtocol,
    showMessage,
    timeoutSec,
    traceId,
    invokeDisabled,
    invokeDisabledReason,
  ]);

  return (
    <div className="space-y-5">
      <MarketDetailSectionCard
        theme={theme}
        title="一键试用"
        description={`前端会按当前 Agent 的 ${baseProfile.protocolLabel} 注册方式自动准备最小测试输入；你只需要补上 Key，点一次就能试。`}
      >
        {invokeDisabled ? (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
              isDark ? 'border-rose-500/35 bg-rose-500/10 text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <p className="font-semibold">当前 Agent 测试已禁用</p>
            <p className={`mt-1 text-xs ${isDark ? 'text-rose-100/85' : 'text-rose-900/85'}`}>
              {invokeDisabledReason ?? '当前 Agent 暂不可调用。'}
            </p>
          </div>
        ) : null}
        <fieldset disabled={running || invokeDisabled} className={`space-y-4 ${invokeDisabled ? 'opacity-70' : ''}`}>
          <GatewayApiKeyInput
            theme={theme}
            id={`agent-quick-key-${agent.id}`}
            value={gatewayApiKeyDraft}
            onChange={setGatewayApiKeyDraft}
            errorText={errorText.includes('X-Api-Key') ? errorText : undefined}
          />

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className={`block text-xs font-semibold ${textSecondary(theme)}`}>最小测试输入</label>
              <span className={`text-xs ${textMuted(theme)}`}>当前协议：{baseProfile.protocolLabel}</span>
            </div>
            <AutoHeightTextarea
              minRows={7}
              maxRows={20}
              value={payloadText}
              onChange={(event) => {
                setPayloadText(event.target.value);
                setPayloadTouched(true);
              }}
              className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={() => void handleRun()} disabled={running}>
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              一键试用
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={restorePayload} disabled={running}>
              <RotateCcw size={14} />
              恢复默认
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => setAdvancedOpen((prev) => !prev)} disabled={running}>
              {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              高级调试
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <div className={`flex items-center gap-3 text-xs ${textMuted(theme)}`}>
                <span>状态码：{statusCode ?? '—'}</span>
                <span>耗时：{latencyMs != null ? `${latencyMs}ms` : '—'}</span>
              </div>
              {errorText ? (
                <p className={`mt-3 whitespace-pre-wrap break-all text-sm ${isDark ? 'text-rose-200' : 'text-rose-700'}`}>{errorText}</p>
              ) : (
                <p className={`mt-3 text-sm leading-relaxed ${textSecondary(theme)}`}>
                  平台会先做资源解析，再按当前 Agent 的网关入口完成真正调用。你不需要自己决定是走什么协议。
                </p>
              )}
            </div>
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                isDark ? 'border-white/10 bg-black/20 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>执行结果</p>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all text-xs">{resultText || '试用结果会显示在这里。'}</pre>
            </div>
          </div>
        </fieldset>
      </MarketDetailSectionCard>

      {advancedOpen && !invokeDisabled ? (
        <MarketDetailSectionCard
          theme={theme}
          title="当前协议高级调试"
          description="这里只保留与当前 Agent 协议有关的高级参数和原生请求体预览，不再暴露与其它资源混用的测试入口。"
        >
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <div>
                <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>TraceId</label>
                <input
                  type="text"
                  value={traceId}
                  onChange={(event) => setTraceId(event.target.value)}
                  className={`${nativeInputClass(theme)} font-mono text-xs`}
                />
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>超时（秒）</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={timeoutSec}
                  onChange={(event) => setTimeoutSec(Number(event.target.value) || 30)}
                  className={nativeInputClass(theme)}
                />
              </div>
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  isDark ? 'border-white/10 bg-white/[0.03] text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>调试提示</p>
                <p className="mt-2 text-sm leading-relaxed">
                  主流程始终优先走统一网关，这里只开放 Trace、超时和协议原生请求体预览，避免你在市场页里先被一堆测试模式绊住。
                </p>
              </div>
            </div>
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                isDark ? 'border-white/10 bg-black/20 text-slate-100' : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileJson size={14} />
                <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>协议原生请求体预览</p>
              </div>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap break-all text-xs">{nativePayloadText}</pre>
            </div>
          </div>
        </MarketDetailSectionCard>
      ) : null}
    </div>
  );
};
