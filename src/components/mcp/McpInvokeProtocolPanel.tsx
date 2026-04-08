import React from 'react';
import { Loader2, Play, RefreshCw } from 'lucide-react';
import type { Theme } from '../../types';
import type { McpPayloadMode } from '../../utils/mcpInvoke';
import { lantuCheckboxPrimaryClass, nativeInputClass } from '../../utils/formFieldClasses';
import { btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { AutoHeightTextarea } from '../common/AutoHeightTextarea';
import { LantuSelect } from '../common/LantuSelect';
import type { InvokeGatewayMode } from '../../hooks/useMcpGatewayInvoke';

export type McpInvokeProtocolPanelProps = {
  theme: Theme;
  API_PATH_PREFIX: string;
  invokeGatewayMode: InvokeGatewayMode;
  setInvokeGatewayMode: (m: InvokeGatewayMode) => void;
  invokeUseStream: boolean;
  setInvokeUseStream: (v: boolean) => void;
  invokeApiKey: string;
  setInvokeApiKey: (v: string) => void;
  showApiKey: boolean;
  setShowApiKey: (v: boolean | ((p: boolean) => boolean)) => void;
  invokeTraceId: string;
  setInvokeTraceId: (v: string) => void;
  onRegenerateTraceId: () => void;
  invokeCatalogVersion: string;
  detailPageLoading: boolean;
  onReloadDetail: () => void;
  mcpPayloadMode: McpPayloadMode;
  onSwitchPayloadMode: (next: McpPayloadMode) => void;
  mcpMethod: string;
  onMcpMethodChange: (method: string) => void;
  mcpMethodOptions: Array<{ value: string; label: string }>;
  mcpPresetId: string;
  onPresetChange: (id: string) => void;
  methodPresetOptions: Array<{ value: string; label: string }>;
  mcpParamsJson: string;
  setMcpParamsJson: (v: string) => void;
  invokePayload: string;
  setInvokePayload: (v: string) => void;
  onProtocolInvoke: () => void;
  invoking: boolean;
  streamHintWhenQuick?: boolean;
  invokeDisabled?: boolean;
};

export const McpInvokeProtocolPanel: React.FC<McpInvokeProtocolPanelProps> = ({
  theme,
  API_PATH_PREFIX,
  invokeGatewayMode,
  setInvokeGatewayMode,
  invokeUseStream,
  setInvokeUseStream,
  invokeApiKey,
  setInvokeApiKey,
  showApiKey,
  setShowApiKey,
  invokeTraceId,
  setInvokeTraceId: _setInvokeTraceId,
  onRegenerateTraceId,
  invokeCatalogVersion,
  detailPageLoading,
  onReloadDetail,
  mcpPayloadMode,
  onSwitchPayloadMode,
  mcpMethod,
  onMcpMethodChange,
  mcpMethodOptions,
  mcpPresetId,
  onPresetChange,
  methodPresetOptions,
  mcpParamsJson,
  setMcpParamsJson,
  invokePayload,
  setInvokePayload,
  onProtocolInvoke,
  invoking,
  streamHintWhenQuick,
  invokeDisabled = false,
}) => {
  const isDark = theme === 'dark';

  return (
    <details
      className={`group rounded-2xl border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/40'}`}
    >
      <summary
        className={`list-none px-4 py-3 text-sm font-semibold outline-none transition-colors marker:content-none focus-visible:ring-2 focus-visible:ring-violet-500/45 ${textPrimary(theme)} flex items-center justify-between gap-2 ${invokeDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <span>协议与网关调试（JSON-RPC / 通道 / 流式）</span>
        <span className={`text-xs font-normal ${textMuted(theme)}`}>默认折叠 · 与「快速试用」共用 API Key 与 Trace</span>
      </summary>
      <div className="space-y-5 border-t px-4 pb-4 pt-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226,232,240,1)' }}>
        {streamHintWhenQuick ? (
          <p className={`rounded-lg border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2 text-xs ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
            已开启流式调用时无法使用「快速试用」的自动连接（需逐条读取 SSE）。请先关闭流式，或在此面板内手动发送 JSON-RPC。
          </p>
        ) : null}
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
                  label: invokeUseStream ? `${API_PATH_PREFIX}/sdk/v1/invoke-stream · 流式` : `${API_PATH_PREFIX}/sdk/v1/invoke · SDK`,
                },
              ]}
              triggerClassName="!text-xs"
              disabled={invokeDisabled}
            />
            <label className={`mt-2 flex cursor-pointer items-start gap-2 text-xs ${textMuted(theme)}`}>
              <input
                type="checkbox"
                className={`mt-0.5 ${lantuCheckboxPrimaryClass}`}
                checked={invokeUseStream}
                disabled={invokeDisabled}
                onChange={(e) => setInvokeUseStream(e.target.checked)}
              />
              <span>
                流式调用（invoke-stream，fetch 长连接；权限同 invoke）。WebSocket MCP 请保持关闭并使用普通调用。
              </span>
            </label>
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
                disabled={invokeDisabled}
                onClick={onRegenerateTraceId}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <p className={`mt-1 text-xs ${textMuted(theme)}`}>与网关 SSE 解析及 JSON-RPC id 对齐时可固定使用本值</p>
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
                disabled={invokeDisabled || detailPageLoading}
                onClick={onReloadDetail}
              >
                <RefreshCw size={14} className={detailPageLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <p className={`mt-1 text-xs ${textMuted(theme)}`}>
              自动使用本页目录详情中的默认版本（发布者「设为当前」）；若为空则与不指定版本行为一致。
            </p>
          </div>
        </div>
        <p className={`text-xs ${textMuted(theme)}`}>超时与 API Key 在上方「鉴权与超时」中配置，与此处请求共用。</p>

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
                disabled={invokeDisabled}
                onClick={() => onSwitchPayloadMode('simple')}
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
                disabled={invokeDisabled}
                onClick={() => onSwitchPayloadMode('advanced')}
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
                <label className={`mb-1.5 block text-xs font-medium ${textMuted(theme)}`}>JSON-RPC method</label>
                <LantuSelect
                  theme={theme}
                  value={mcpMethod}
                  onChange={onMcpMethodChange}
                  options={mcpMethodOptions}
                  triggerClassName="!text-xs"
                  disabled={invokeDisabled}
                />
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>展示为中文提示，实际发送仍使用后端要求的 method 值</p>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${textMuted(theme)}`}>参数示例模板</label>
                <LantuSelect
                  theme={theme}
                  value={mcpPresetId}
                  onChange={onPresetChange}
                  options={methodPresetOptions}
                  triggerClassName="!text-xs"
                  disabled={invokeDisabled}
                />
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>
                  模板中的 `your_tool_name` / `arguments` 为占位，请按当前 MCP 实际工具名修改
                </p>
              </div>
              <div>
                <label className={`mb-1.5 block text-xs font-medium ${textMuted(theme)}`}>params（JSON 对象）</label>
                <AutoHeightTextarea
                  minRows={5}
                  maxRows={22}
                  value={mcpParamsJson}
                  onChange={(e) => setMcpParamsJson(e.target.value)}
                  readOnly={invokeDisabled}
                  className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
                  placeholder='例如 tools/call：{ "name": "...", "arguments": {} }'
                />
                <p className={`mt-1 text-xs ${textMuted(theme)}`}>
                  字段说明：<code className="font-mono">name</code> = 工具名；<code className="font-mono">arguments</code> = 传给该工具的参数对象
                </p>
              </div>
            </div>
          ) : (
            <div>
              <p className={`mb-1.5 text-xs ${textMuted(theme)}`}>
                完整 payload，须含 <code className="font-mono">method</code>；可与 <code className="font-mono">params</code>{' '}
                并列，或按网关约定省略 params 由其余字段充当 params。
              </p>
              <AutoHeightTextarea
                minRows={8}
                maxRows={28}
                value={invokePayload}
                onChange={(e) => setInvokePayload(e.target.value)}
                readOnly={invokeDisabled}
                className={`${nativeInputClass(theme)} resize-none font-mono text-xs`}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${btnSecondary(theme)} inline-flex min-h-11 items-center gap-2 disabled:opacity-50`}
            disabled={invokeDisabled || invoking}
            onClick={() => void onProtocolInvoke()}
          >
            {invoking ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {invokeUseStream ? '流式请求中…' : '请求中…'}
              </>
            ) : (
              <>
                <Play size={14} />
                发送协议请求
              </>
            )}
          </button>
          <p className={`text-xs ${textMuted(theme)}`}>与顶部「快速试用」独立；用于手动调试或流式场景</p>
        </div>
      </div>
    </details>
  );
};

McpInvokeProtocolPanel.displayName = 'McpInvokeProtocolPanel';
