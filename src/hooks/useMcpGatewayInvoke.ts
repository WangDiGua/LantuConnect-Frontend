import { useCallback } from 'react';
import { resourceCatalogService } from '../api/services/resource-catalog.service';
import { invokeService } from '../api/services/invoke.service';
import { sdkService } from '../api/services/sdk.service';
import { mapInvokeFlowError } from '../utils/invokeError';
import { safeOpenHttpUrl } from '../lib/windowNavigate';
import type { CatalogResourceDetailVO, InvokeRequest, InvokeResponse, ResourceResolveVO } from '../types/dto/catalog';
import { ApiException } from '../types/api';

export type InvokeGatewayMode = 'invoke' | 'sdk';

export function isWebSocketMcpResolved(resolved: ResourceResolveVO): boolean {
  const ep = resolved.endpoint?.trim().toLowerCase() ?? '';
  if (ep.startsWith('ws://') || ep.startsWith('wss://')) return true;
  const t = resolved.spec?.transport;
  return typeof t === 'string' && t.toLowerCase() === 'websocket';
}

export type RunInvokeRedirect = { kind: 'redirect'; endpoint: string };
export type RunInvokeMetadata = { kind: 'metadata'; spec: Record<string, unknown> };
export type RunInvokeSuccess = { kind: 'success'; response: InvokeResponse };

export type RunInvokeResult = RunInvokeSuccess | RunInvokeRedirect | RunInvokeMetadata | { kind: 'error'; message: string };

export type UseMcpGatewayInvokeParams = {
  detail: CatalogResourceDetailVO | null;
  invokeCatalogVersion: string;
  invokeApiKey: string;
  invokeTraceId: string;
  invokeTimeoutSec: number;
  invokeUseStream: boolean;
  invokeGatewayMode: InvokeGatewayMode;
  /** 流式时每次收到增量后回传当前累计全文（用于 UI） */
  onStreamAccumulated?: (fullText: string) => void;
};

/**
 * 单次 MCP 网关调用（resolve → invoke / invoke-stream），不含 React state。
 */
export function useMcpGatewayInvoke({
  detail,
  invokeCatalogVersion,
  invokeApiKey,
  invokeTraceId,
  invokeTimeoutSec,
  invokeUseStream,
  invokeGatewayMode,
  onStreamAccumulated,
}: UseMcpGatewayInvokeParams) {
  const runInvoke = useCallback(
    async (payload: Record<string, unknown>): Promise<RunInvokeResult> => {
      if (!detail?.resourceId) return { kind: 'error', message: '资源ID为空' };
      const apiKey = invokeApiKey.trim();
      if (!apiKey) return { kind: 'error', message: 'API Key 为空' };

      let resolved: ResourceResolveVO;
      try {
        resolved = await resourceCatalogService.resolve(
          {
            resourceType: 'mcp',
            resourceId: detail.resourceId,
            version: invokeCatalogVersion || undefined,
          },
          { headers: { 'X-Api-Key': apiKey } },
        );
      } catch (e) {
        return { kind: 'error', message: `${mapInvokeFlowError(e, 'resolve')}\n可保留当前参数后重试解析` };
      }

      if (resolved.invokeType === 'redirect' && resolved.endpoint) {
        return { kind: 'redirect', endpoint: resolved.endpoint };
      }
      if (resolved.invokeType === 'metadata') {
        return { kind: 'metadata', spec: (resolved.spec ?? {}) as Record<string, unknown> };
      }
      if (invokeUseStream && isWebSocketMcpResolved(resolved)) {
        return { kind: 'error', message: 'WebSocket MCP 仅支持普通 invoke，请关闭「流式调用」后重试' };
      }

      const requestPayload: InvokeRequest = {
        resourceType: 'mcp',
        resourceId: detail.resourceId,
        version: invokeCatalogVersion || undefined,
        timeoutSec: invokeTimeoutSec,
        payload,
      };

      try {
        if (invokeUseStream) {
          let acc = '';
          const streamBudgetMs = Math.min(600, Math.max(1, invokeTimeoutSec)) * 1000 + 30_000;
          const ac = new AbortController();
          const to = window.setTimeout(() => ac.abort(), streamBudgetMs);
          try {
            const onChunk = (d: string) => {
              acc += d;
              onStreamAccumulated?.(acc);
            };
            if (invokeGatewayMode === 'sdk') {
              await sdkService.invokeStream(apiKey, requestPayload, invokeTraceId, onChunk, ac.signal);
            } else {
              await invokeService.invokeStream(requestPayload, apiKey, invokeTraceId, onChunk, ac.signal);
            }
            return {
              kind: 'success',
              response: {
                requestId: '',
                traceId: invokeTraceId,
                resourceType: 'mcp',
                resourceId: String(detail.resourceId),
                statusCode: 200,
                status: 'success',
                latencyMs: 0,
                body: acc,
              },
            };
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
              return {
                kind: 'error',
                message: `流式调用超时或已中断（>${Math.round(streamBudgetMs / 1000)}s）\nTraceId：${invokeTraceId}`,
              };
            }
            throw e;
          } finally {
            window.clearTimeout(to);
          }
        }
        const res =
          invokeGatewayMode === 'sdk'
            ? await sdkService.invoke(apiKey, requestPayload, invokeTraceId)
            : await invokeService.invoke(requestPayload, apiKey, invokeTraceId);
        return { kind: 'success', response: res };
      } catch (e) {
        const mapped = mapInvokeFlowError(e, 'invoke');
        if (e instanceof ApiException) {
          const main =
            e.status === 401
              ? 'API Key 无效或已失效，请检查密钥状态'
              : e.status === 403
                ? '当前 Key 不满足该资源调用条件，请检查 scope、资源是否已发布或更换 Key'
                : e.status === 400
                  ? '请求参数格式错误，请检查 method/params/resourceId'
                  : e.status >= 500
                    ? '资源服务暂时不可用，请稍后重试'
                    : mapped;
          return { kind: 'error', message: `${main}\n\n详情：${e.message}\nTraceId：${invokeTraceId}` };
        }
        return { kind: 'error', message: `${mapped}\n可保留当前参数后重试调用` };
      }
    },
    [
      detail,
      invokeApiKey,
      invokeCatalogVersion,
      invokeGatewayMode,
      invokeTimeoutSec,
      invokeTraceId,
      invokeUseStream,
      onStreamAccumulated,
    ],
  );

  return { runInvoke };
}
