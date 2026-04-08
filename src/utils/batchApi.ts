import { http } from '../lib/http';
import { ApiException } from '../types/api';

/**
 * 批量写操作约定（与 `runWithConcurrency(..., 4, ...)` 等搭配使用）：
 *
 * - 前端优先调用约定路径（如 `PUT /providers/batch`、`POST /tags/batch-delete`、
 *   `POST /resource-center/resources/batch-withdraw`）；请求体常用 `{ ids: number[] }` 或与单条 PATCH 相同的字段外加 `ids`。
 * - 若网关/后端返回 **404 或 405**，`tryBatchPost/Put/Delete` 视为批量端点未上线，自动走 **fallback**（一般为逐条同源 API，**并发约 4**，避免压垮网关）。
 * - 后端落地批量接口时建议：**单次 ids 上限**、与单条接口 **一致权限**、**幂等**、**审计字段**；未实现时前端仍可依赖 fallback 完成功能。
 */

/** 网关返回 404/405 时视为批量端点未实现，走 fallback（通常为逐条请求）。 */
export function isBatchEndpointUnavailable(e: unknown): boolean {
  if (e instanceof ApiException) {
    return e.status === 404 || e.status === 405;
  }
  const ax = e as { response?: { status?: number } };
  const s = ax?.response?.status;
  return s === 404 || s === 405;
}

export async function tryBatchPost<TBody>(path: string, body: TBody, fallback: () => Promise<void>): Promise<void> {
  try {
    await http.post(path, body);
  } catch (e) {
    if (isBatchEndpointUnavailable(e)) {
      await fallback();
      return;
    }
    throw e;
  }
}

export async function tryBatchPut<TBody>(path: string, body: TBody, fallback: () => Promise<void>): Promise<void> {
  try {
    await http.put(path, body);
  } catch (e) {
    if (isBatchEndpointUnavailable(e)) {
      await fallback();
      return;
    }
    throw e;
  }
}

export async function tryBatchDelete<TBody>(path: string, body?: TBody, fallback?: () => Promise<void>): Promise<void> {
  try {
    if (body !== undefined) {
      await http.delete(path, { data: body });
    } else {
      await http.delete(path);
    }
  } catch (e) {
    if (fallback && isBatchEndpointUnavailable(e)) {
      await fallback();
      return;
    }
    throw e;
  }
}
