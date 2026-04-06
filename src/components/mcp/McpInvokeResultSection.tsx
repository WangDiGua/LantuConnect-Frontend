import React, { useMemo, useState } from 'react';
import { Copy, ChevronDown, ChevronRight } from 'lucide-react';
import type { Theme } from '../../types';
import type { InvokeResponse } from '../../types/dto/catalog';
import {
  extractMcpContentSummary,
  parseJsonRpcErrorFromBody,
  tryFormatJsonText,
} from '../../utils/mcpInvoke';
import { btnSecondary, textMuted, textPrimary, textSecondary } from '../../utils/uiClasses';
import { invokeGatewayStatusLabelZh } from '../../utils/backendEnumLabels';

export type McpInvokeResultSectionProps = {
  theme: Theme;
  invokeResponse: InvokeResponse | null;
  invokeResultMessage: string | null;
  invokeResultError: string | null;
  invokeRequestTraceId: string;
  invokeTraceId: string;
  /** 快速试用时的工具名，用于摘要 */
  quickToolName?: string;
  onCopy: (text: string, okMsg: string) => void;
};

export const McpInvokeResultSection: React.FC<McpInvokeResultSectionProps> = ({
  theme,
  invokeResponse,
  invokeResultMessage,
  invokeResultError,
  invokeRequestTraceId,
  invokeTraceId,
  quickToolName,
  onCopy,
}) => {
  const isDark = theme === 'dark';
  const [rawOpen, setRawOpen] = useState(false);

  const invokeBodyView = useMemo(
    () => (invokeResponse ? tryFormatJsonText(invokeResponse.body ?? '') : null),
    [invokeResponse],
  );

  const invokeJsonRpcError = useMemo(
    () => (invokeResponse?.body != null ? parseJsonRpcErrorFromBody(invokeResponse.body) : null),
    [invokeResponse],
  );

  const invokeGatewaySuccess = invokeResponse?.status === 'success';

  const contentSummary = useMemo(() => {
    if (!invokeResponse?.body) return null;
    return extractMcpContentSummary(invokeResponse.body);
  }, [invokeResponse?.body]);

  const summaryLine = useMemo(() => {
    if (!invokeResponse) return null;
    if (invokeJsonRpcError) {
      return `调用失败（协议层）：${invokeJsonRpcError.message}`;
    }
    if (invokeGatewaySuccess) {
      const tool = quickToolName ? `「${quickToolName}」` : '';
      return contentSummary
        ? `成功 ${tool ? `${tool} ` : ''}· 提取到 MCP 文本内容（见下方摘要）`
        : `成功 ${tool ? `${tool} ` : ''}· HTTP ${invokeResponse.statusCode} · ${invokeResponse.latencyMs} ms`;
    }
    return `网关状态：${invokeGatewayStatusLabelZh(invokeResponse.status)} · HTTP ${invokeResponse.statusCode}`;
  }, [
    invokeResponse,
    invokeJsonRpcError,
    invokeGatewaySuccess,
    contentSummary,
    quickToolName,
  ]);

  return (
    <div className="space-y-4">
      {invokeResultMessage ? (
        <div
          className={`rounded-2xl border px-3.5 py-3 text-xs ${
            isDark ? 'border-blue-500/20 bg-blue-500/[0.08] text-blue-100' : 'border-blue-200 bg-blue-50 text-blue-900'
          }`}
        >
          {invokeResultMessage}
        </div>
      ) : null}
      {invokeResultError ? (
        <div
          className={`rounded-2xl border px-3.5 py-3 text-xs whitespace-pre-wrap ${
            isDark ? 'border-rose-500/25 bg-rose-500/[0.08] text-rose-100' : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {invokeResultError}
        </div>
      ) : null}
      {invokeResponse ? (
        <div
          className={`rounded-2xl border p-4 space-y-4 ${
            isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          {summaryLine ? (
            <div
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${
                invokeJsonRpcError
                  ? isDark
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : 'border-amber-200 bg-amber-50 text-amber-950'
                  : invokeGatewaySuccess
                    ? isDark
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : isDark
                      ? 'border-white/10 bg-white/[0.04] text-slate-100'
                      : 'border-slate-200 bg-white text-slate-800'
              }`}
            >
              {summaryLine}
            </div>
          ) : null}
          {contentSummary && !invokeJsonRpcError ? (
            <div>
              <p className={`mb-1.5 text-xs font-semibold ${textSecondary(theme)}`}>结果摘要（MCP content 文本）</p>
              <pre
                className={`max-h-[32vh] overflow-auto rounded-xl border p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                  isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'
                }`}
              >
                {contentSummary}
              </pre>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h5 className={`text-sm font-semibold ${textSecondary(theme)}`}>调用结果</h5>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  invokeJsonRpcError
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-100'
                      : 'bg-amber-100 text-amber-900'
                    : invokeGatewaySuccess
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-emerald-100 text-emerald-700'
                      : isDark
                        ? 'bg-rose-500/20 text-rose-200'
                        : 'bg-rose-100 text-rose-700'
                }`}
              >
                {invokeJsonRpcError ? 'JSON-RPC 错误' : invokeGatewayStatusLabelZh(invokeResponse.status)}
              </span>
              {invokeJsonRpcError ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                    isDark ? 'bg-white/10 text-white/70' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  网关 {invokeGatewayStatusLabelZh(invokeResponse.status)} · HTTP {invokeResponse.statusCode}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`${btnSecondary(theme)} !px-2.5 !py-1 !text-xs`}
                onClick={() => void onCopy(JSON.stringify(invokeResponse, null, 2), '已复制完整响应')}
              >
                <Copy size={12} />
                复制响应
              </button>
              <button
                type="button"
                className={`${btnSecondary(theme)} !px-2.5 !py-1 !text-xs`}
                onClick={() => void onCopy(invokeBodyView?.text ?? '', '已复制响应体')}
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
              <p className={`text-xs ${textMuted(theme)}`}>状态码</p>
              <p className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{invokeResponse.statusCode}</p>
            </div>
            <div className={`rounded-xl border p-2.5 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
              <p className={`text-xs ${textMuted(theme)}`}>耗时</p>
              <p className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>{invokeResponse.latencyMs} ms</p>
            </div>
            <div className={`rounded-xl border p-2.5 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white'}`}>
              <p className={`text-xs ${textMuted(theme)}`}>资源</p>
              <p className={`mt-1 text-sm font-semibold ${textPrimary(theme)}`}>
                {invokeResponse.resourceType}
                {'/'}
                {invokeResponse.resourceId}
              </p>
            </div>
          </div>
          <div className={`grid gap-1.5 rounded-xl border p-3 text-xs ${isDark ? 'border-white/10 bg-black/10' : 'border-slate-200 bg-white'}`}>
            <p className={textSecondary(theme)}>
              requestId：<span className={`${textPrimary(theme)} font-mono break-all`}>{invokeResponse.requestId}</span>
            </p>
            <p className={textSecondary(theme)}>
              traceId（响应）：<span className={`${textPrimary(theme)} font-mono break-all`}>{invokeResponse.traceId}</span>
            </p>
            <p className={textSecondary(theme)}>
              traceId（请求）：<span className={`${textPrimary(theme)} font-mono break-all`}>{invokeRequestTraceId || invokeTraceId}</span>
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setRawOpen((v) => !v)}
              className={`mb-2 flex min-h-10 items-center gap-1.5 text-xs font-semibold ${textSecondary(theme)} focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 rounded-lg`}
              aria-expanded={rawOpen}
            >
              {rawOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              原始响应体（{invokeBodyView?.asJson ? 'JSON' : '文本'}）
            </button>
            {rawOpen ? (
              <pre
                className={`max-h-[44vh] overflow-auto rounded-xl border p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                  isDark ? 'border-white/10 bg-lantu-card' : 'border-slate-200 bg-white'
                }`}
              >
                {invokeBodyView?.text || ''}
              </pre>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

McpInvokeResultSection.displayName = 'McpInvokeResultSection';
