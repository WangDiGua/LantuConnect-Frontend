import type { ResourceCatalogItemVO } from '../types/dto/catalog';

function norm(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

function obsString(o: Record<string, unknown> | undefined, camel: string, snake: string): string | undefined {
  if (!o) return undefined;
  const v = o[camel] ?? o[snake];
  if (v == null || v === '') return undefined;
  const s = String(v).trim();
  return s || undefined;
}

/** 目录/详情 `observability.healthStatus` */
export function catalogItemHealthStatus(item: Pick<ResourceCatalogItemVO, 'observability'>): string | undefined {
  return obsString(item.observability, 'healthStatus', 'health_status');
}

export function catalogItemCircuitState(item: Pick<ResourceCatalogItemVO, 'observability'>): string | undefined {
  return obsString(item.observability, 'circuitState', 'circuit_state');
}

export function catalogItemDegradationHint(item: Pick<ResourceCatalogItemVO, 'observability'>): string | undefined {
  if (!item.observability) return undefined;
  const o = item.observability;
  const raw = o.degradationHint ?? o.degradation_hint;
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s || undefined;
  }
  if (typeof raw === 'object' && raw !== null) {
    const rec = raw as Record<string, unknown>;
    const u = rec.userFacingHint ?? rec.user_facing_hint;
    if (u != null && String(u).trim() !== '') return String(u).trim();
    try {
      const j = JSON.stringify(raw);
      return j === '{}' ? undefined : j;
    } catch {
      return undefined;
    }
  }
  const s = String(raw).trim();
  return s || undefined;
}

/**
 * 是否与网关侧 `ensureResourceHealthNotDown` + 熔断 open 一致：不可 invoke 时前端同步关闭入口。
 * `unknown`：未配置或未探测，仍允许进入工具测试（由网关最终拦截）。
 *
 * 注意：勿用 `degradationHint` 参与判定。后端可能按账号/租户/配额填入提示（与「资源全局故障」不等价），
 * 若据此禁用列表，会导致换账号后同一 MCP「忽而不可用、忽而可用」，与广场「运行状态」预期不符。
 */
export function isCatalogMcpCallable(item: Pick<ResourceCatalogItemVO, 'observability'>): boolean {
  const h = norm(catalogItemHealthStatus(item));
  const c = norm(catalogItemCircuitState(item));
  if (c === 'open' || c === 'forced_open') return false;
  if (
    h === 'down'
    || h === 'unhealthy'
    || h === 'offline'
    || h === 'out_of_service'
    || h === 'disabled'
  ) {
    return false;
  }
  return true;
}

/**
 * 列表/详情「运行 *」徽章用 key：一旦不可 invoke，统一展示网关拦截态，避免与健康探测字段不一致。
 */
export function catalogRunBadgeHealthKeyForDisplay(item: Pick<ResourceCatalogItemVO, 'observability'>): string {
  if (!isCatalogMcpCallable(item)) return 'gateway_blocked';
  return catalogItemHealthStatus(item) ?? 'unknown';
}

/** 与网关拦截无关时的补充说明（如权限/配额），仅供文案展示，不参与 isCatalogMcpCallable */
export function catalogInvokeSupplementHint(item: Pick<ResourceCatalogItemVO, 'observability'>): string | undefined {
  return catalogItemDegradationHint(item);
}

export function mcpInvokeBlockedReason(item: Pick<ResourceCatalogItemVO, 'observability'>): string {
  const c = norm(catalogItemCircuitState(item));
  if (c === 'open' || c === 'forced_open') {
    return '熔断已断开，网关暂不放行调用。可稍后在健康恢复后重试。';
  }
  const h = norm(catalogItemHealthStatus(item));
  if (h === 'down') return '健康探测为故障（DOWN），网关已禁止调用。';
  if (h === 'disabled') return '健康检查未启用或已关闭，网关暂不可调用。';
  if (h === 'unhealthy' || h === 'offline' || h === 'out_of_service') {
    return '运行状态异常，网关已禁止或即将禁止调用。';
  }
  return '当前不可调用。';
}
