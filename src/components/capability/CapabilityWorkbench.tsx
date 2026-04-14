import React, { useMemo, useState } from 'react';
import { Bot, Loader2, Sparkles, Wand2, Wrench } from 'lucide-react';
import { capabilityService } from '../../api/services/capability.service';
import { usePersistedGatewayApiKey } from '../../hooks/usePersistedGatewayApiKey';
import type { Theme } from '../../types';
import type { CapabilityType } from '../../types/dto/capability';
import { nativeInputClass } from '../../utils/formFieldClasses';
import { AutoHeightTextarea } from '../common/AutoHeightTextarea';
import { btnPrimary, btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';

type Props = {
  theme: Theme;
  capabilityId: number;
  capabilityType: CapabilityType;
  capabilityName?: string;
  showMessage?: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  defaultPayload?: Record<string, unknown>;
};

function safeJson(value: string): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, message: '请求体必须是 JSON 对象' };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, message: '请求体不是合法 JSON' };
  }
}

export const CapabilityWorkbench: React.FC<Props> = ({
  theme,
  capabilityId,
  capabilityType,
  capabilityName,
  showMessage,
  defaultPayload,
}) => {
  const isDark = theme === 'dark';
  const [apiKey, setApiKey] = usePersistedGatewayApiKey();
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(defaultPayload ?? { input: 'hello' }, null, 2),
  );
  const [toolArgsText, setToolArgsText] = useState('{\n  "input": "hello"\n}');
  const [selectedTool, setSelectedTool] = useState('');
  const [resolveOutput, setResolveOutput] = useState('');
  const [invokeOutput, setInvokeOutput] = useState('');
  const [toolOutput, setToolOutput] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tools, setTools] = useState<Array<{ name: string; description?: string }>>([]);
  const [loadingAction, setLoadingAction] = useState<'resolve' | 'invoke' | 'tools' | 'tool-call' | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toolSummary = useMemo(
    () =>
      tools.map((tool) => (
        <option key={tool.name} value={tool.name}>
          {tool.description ? `${tool.name} - ${tool.description}` : tool.name}
        </option>
      )),
    [tools],
  );

  const curlSnippet = useMemo(() => {
    const trimmedKey = apiKey.trim() || 'YOUR_API_KEY';
    return [
      'curl -X POST \\',
      `  "${window.location.origin}/api/v2/capabilities/${capabilityId}/invoke" \\`,
      '  -H "Content-Type: application/json" \\',
      `  -H "X-Api-Key: ${trimmedKey}" \\`,
      `  -d '${payloadText.replace(/'/g, "\\'")}'`,
    ].join('\n');
  }, [apiKey, capabilityId, payloadText]);

  const runResolve = async (hydratePayload = false) => {
    setLoadingAction('resolve');
    setResolveOutput('');
    try {
      const res = await capabilityService.resolveCapability(
        capabilityId,
        { include: 'closure,bindings' },
        apiKey.trim() ? { headers: { 'X-Api-Key': apiKey.trim() } } : undefined,
      );
      setResolveOutput(JSON.stringify(res, null, 2));
      if (hydratePayload && res.suggestedPayload) {
        setPayloadText(JSON.stringify(res.suggestedPayload, null, 2));
        showMessage?.('已生成最小测试输入', 'success');
      } else {
        showMessage?.('能力解析完成', 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '能力解析失败';
      setResolveOutput(message);
      showMessage?.(message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const runInvoke = async () => {
    const parsed = safeJson(payloadText);
    if (parsed.ok === false) {
      showMessage?.(parsed.message, 'warning');
      return;
    }
    setLoadingAction('invoke');
    setInvokeOutput('');
    try {
      const res = await capabilityService.invokeCapability(
        capabilityId,
        { payload: parsed.data, timeoutSec: 45 },
        apiKey.trim() ? { headers: { 'X-Api-Key': apiKey.trim() } } : undefined,
      );
      setInvokeOutput(res.response?.body ? res.response.body : JSON.stringify(res, null, 2));
      showMessage?.('一键试用完成', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '能力调用失败';
      setInvokeOutput(message);
      showMessage?.(message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const runListTools = async () => {
    setLoadingAction('tools');
    setToolOutput('');
    try {
      const res = await capabilityService.toolSession(
        capabilityId,
        { action: 'list_tools' },
        apiKey.trim() ? { headers: { 'X-Api-Key': apiKey.trim() } } : undefined,
      );
      const nextTools = (res.tools ?? []).map((tool) => ({ name: tool.name, description: tool.description }));
      setTools(nextTools);
      setWarnings(res.warnings ?? []);
      if (nextTools[0]?.name) {
        setSelectedTool((prev) => prev || nextTools[0]!.name);
      }
      setToolOutput(JSON.stringify(res, null, 2));
      showMessage?.(nextTools.length ? '工具列表已加载' : '当前能力没有可用工具', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '工具列表加载失败';
      setToolOutput(message);
      showMessage?.(message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const runCallTool = async () => {
    if (!selectedTool.trim()) {
      showMessage?.('请先选择工具', 'warning');
      return;
    }
    const parsed = safeJson(toolArgsText);
    if (parsed.ok === false) {
      showMessage?.(parsed.message, 'warning');
      return;
    }
    setLoadingAction('tool-call');
    try {
      const res = await capabilityService.toolSession(
        capabilityId,
        {
          action: 'call_tool',
          toolName: selectedTool.trim(),
          arguments: parsed.data,
          timeoutSec: 60,
        },
        apiKey.trim() ? { headers: { 'X-Api-Key': apiKey.trim() } } : undefined,
      );
      setToolOutput(
        res.toolCallResponse?.body
          ? res.toolCallResponse.body
          : JSON.stringify(res, null, 2),
      );
      setWarnings(res.warnings ?? []);
      showMessage?.('工具调用完成', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '工具调用失败';
      setToolOutput(message);
      showMessage?.(message, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      className={`rounded-[24px] border p-5 ${
        isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs uppercase tracking-[0.22em] ${textMuted(theme)}`}>Capability V2</p>
          <h3 className={`mt-1 text-sm font-bold ${textPrimary(theme)}`}>
            {capabilityName ? `${capabilityName} · 一键试用` : '统一试用台'}
          </h3>
          <p className={`mt-1 text-xs leading-relaxed ${textSecondary(theme)}`}>
            默认隐藏协议细节，先解析能力，再生成最小输入，一键试用；需要时再展开高级调试。
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isDark ? 'bg-sky-500/15 text-sky-200' : 'bg-sky-100 text-sky-900'
          }`}
        >
          <Bot size={12} />
          {capabilityType.toUpperCase()}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <div>
            <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>X-Api-Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className={nativeInputClass(theme)}
              placeholder="sk_..."
            />
          </div>
          <div>
            <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>最小测试输入</label>
            <AutoHeightTextarea
              minRows={6}
              maxRows={20}
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary(theme)} onClick={() => void runResolve(true)} disabled={loadingAction != null}>
              {loadingAction === 'resolve' ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              生成最小输入
            </button>
            <button type="button" className={btnPrimary} onClick={() => void runInvoke()} disabled={loadingAction != null}>
              {loadingAction === 'invoke' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              一键试用
            </button>
            <button type="button" className={btnSecondary(theme)} onClick={() => void runListTools()} disabled={loadingAction != null}>
              {loadingAction === 'tools' ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
              列出工具
            </button>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white'
          }`}
        >
          <p className={`text-xs font-semibold uppercase tracking-wide ${textMuted(theme)}`}>集成输出</p>
          <pre className={`mt-2 whitespace-pre-wrap break-all text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {invokeOutput || resolveOutput || toolOutput || '这里会展示解析结果、试用结果或工具调用结果。'}
          </pre>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-xs font-semibold ${textSecondary(theme)}`}>工具链</p>
          <button
            type="button"
            className={`${btnSecondary(theme)} !min-h-0 !px-3 !py-1.5 text-xs`}
            onClick={() => setAdvancedOpen((prev) => !prev)}
          >
            {advancedOpen ? '收起高级区' : '展开高级区'}
          </button>
        </div>
        {warnings.length ? (
          <div className={`mt-2 rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-amber-500/10 text-amber-100' : 'bg-amber-50 text-amber-900'}`}>
            {warnings.join('\n')}
          </div>
        ) : null}
        <div className="mt-3 grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>可用工具</label>
            <select
              value={selectedTool}
              onChange={(event) => setSelectedTool(event.target.value)}
              className={nativeInputClass(theme)}
            >
              <option value="">{tools.length ? '请选择工具' : '先点“列出工具”'}</option>
              {toolSummary}
            </select>
          </div>
          <div>
            <label className={`mb-1.5 block text-xs font-semibold ${textSecondary(theme)}`}>工具参数</label>
            <AutoHeightTextarea
              minRows={4}
              maxRows={14}
              value={toolArgsText}
              onChange={(event) => setToolArgsText(event.target.value)}
              className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={() => void runCallTool()} disabled={loadingAction != null}>
            {loadingAction === 'tool-call' ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
            运行工具
          </button>
        </div>
        {advancedOpen ? (
          <div className={`mt-4 rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'}`}>
            <p className={`text-xs font-semibold ${textSecondary(theme)}`}>cURL 示例</p>
            <pre className={`mt-2 whitespace-pre-wrap break-all text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{curlSnippet}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
};
