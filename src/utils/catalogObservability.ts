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
  return obsString(item.observability, 'degradationHint', 'degradation_hint');
}

/**
 * 是否与网关侧 `ensureResourceHealthNotDown` + 熔断 open 一致：不可 invoke 时前端同步关闭入口。
 * `unknown`：未配置或未探测，仍允许进入工具测试（由网关最终拦截）。
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

export function mcpInvokeBlockedReason(item: Pick<ResourceCatalogItemVO, 'observability'>): string {
  const hint = catalogItemDegradationHint(item);
  if (hint) return hint;
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
