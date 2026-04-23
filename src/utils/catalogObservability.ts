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

function obsBool(o: Record<string, unknown> | undefined, camel: string, snake: string): boolean | undefined {
  if (!o) return undefined;
  const v = o[camel] ?? o[snake];
  if (v == null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1') return true;
  if (v === 0 || v === '0') return false;
  return undefined;
}

export function catalogItemHealthStatus(item: Pick<ResourceCatalogItemVO, 'observability'>): string | undefined {
  return obsString(item.observability, 'healthStatus', 'health_status');
}

export function catalogItemCircuitState(item: Pick<ResourceCatalogItemVO, 'observability'>): string | undefined {
  return obsString(item.observability, 'circuitState', 'circuit_state');
}

export function catalogItemCallabilityState(item: Pick<ResourceCatalogItemVO, 'observability'>): string | undefined {
  return obsString(item.observability, 'callabilityState', 'callability_state');
}

export function catalogItemCallabilityReason(item: Pick<ResourceCatalogItemVO, 'observability'>): string | undefined {
  return obsString(item.observability, 'callabilityReason', 'callability_reason');
}

export function catalogItemCallable(item: Pick<ResourceCatalogItemVO, 'observability'>): boolean | undefined {
  return obsBool(item.observability, 'callable', 'callable');
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
    const userFacing = rec.userFacingHint ?? rec.user_facing_hint;
    if (userFacing != null && String(userFacing).trim() !== '') {
      return String(userFacing).trim();
    }
    try {
      const serialized = JSON.stringify(raw);
      return serialized === '{}' ? undefined : serialized;
    } catch {
      return undefined;
    }
  }
  const s = String(raw).trim();
  return s || undefined;
}

export function isCatalogInvokeCallable(item: Pick<ResourceCatalogItemVO, 'observability'>): boolean {
  const callability = norm(catalogItemCallabilityState(item));
  if (callability === 'callable') return true;
  if (callability && callability !== 'unknown') return false;

  const healthStatus = norm(catalogItemHealthStatus(item));
  const circuitState = norm(catalogItemCircuitState(item));
  if (circuitState === 'open' || circuitState === 'forced_open') return false;
  if (healthStatus === 'down' || healthStatus === 'disabled') return false;
  return true;
}

export function isCatalogMcpCallable(item: Pick<ResourceCatalogItemVO, 'observability'>): boolean {
  return isCatalogInvokeCallable(item);
}

export function catalogRunBadgeHealthKeyForDisplay(item: Pick<ResourceCatalogItemVO, 'observability'>): string {
  return catalogItemHealthStatus(item) ?? 'unknown';
}

export function catalogInvokeSupplementHint(item: Pick<ResourceCatalogItemVO, 'observability'>): string | undefined {
  return catalogItemDegradationHint(item);
}

export function catalogInvokeBlockedReason(item: Pick<ResourceCatalogItemVO, 'observability'>): string {
  const callability = norm(catalogItemCallabilityState(item));
  const reason = catalogItemCallabilityReason(item);
  if (callability && callability !== 'callable' && callability !== 'unknown') {
    return reason ?? `\u5f53\u524d\u8d44\u6e90\u4e0d\u53ef\u8c03\u7528\uff1a${callability}`;
  }

  const circuitState = norm(catalogItemCircuitState(item));
  if (circuitState === 'open' || circuitState === 'forced_open') {
    return '\u7194\u65ad\u5df2\u6253\u5f00\uff0c\u7f51\u5173\u6682\u4e0d\u653e\u884c\u8c03\u7528\u3002\u63a2\u6d3b\u6062\u590d\u540e\u4f1a\u81ea\u52a8\u95ed\u5408\uff0c\u4e5f\u53ef\u4ee5\u7a0d\u540e\u518d\u8bd5\u3002';
  }

  const healthStatus = norm(catalogItemHealthStatus(item));
  if (healthStatus === 'down') return '\u5065\u5eb7\u63a2\u6d4b\u7ed3\u679c\u4e3a\u6545\u969c\uff0c\u7f51\u5173\u5df2\u7981\u6b62\u8c03\u7528\u3002';
  if (healthStatus === 'disabled') return '\u5065\u5eb7\u68c0\u67e5\u672a\u542f\u7528\u6216\u5df2\u5173\u95ed\uff0c\u7f51\u5173\u6682\u4e0d\u53ef\u8c03\u7528\u3002';
  return '\u5f53\u524d\u4e0d\u53ef\u8c03\u7528\u3002';
}

export function mcpInvokeBlockedReason(item: Pick<ResourceCatalogItemVO, 'observability'>): string {
  return catalogInvokeBlockedReason(item);
}
