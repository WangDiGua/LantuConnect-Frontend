/**
 * 后端枚举 / 技术状态值 → 中文展示（与 Spring Actuator、Resilience4j、资源版本快照等常见取值对齐）。
 */
import type { Theme } from '../types';

const D = (t: Theme) => t === 'dark';

function norm(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

/** 资源探测 / 聚合健康（含 Actuator UP、DOWN 等） */
const HEALTH_LABEL: Record<string, string> = {
  '': '—',
  unknown: '未知',
  healthy: '健康',
  degraded: '降级',
  down: '故障',
  up: '健康',
  unhealthy: '不健康',
  out_of_service: '停止服务',
  offline: '离线',
  /** 与健康字段并存：探测可能仍为 UP，但网关/熔断/降级提示已不放行 invoke */
  gateway_blocked: '网关不放行',
};

export function resourceHealthLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  return HEALTH_LABEL[k] ?? (k ? `未知（${String(raw).trim()}）` : '—');
}

export function resourceHealthBadgeClass(theme: Theme, raw: string | null | undefined): string {
  const k = norm(raw);
  const ok = k === 'healthy' || k === 'up';
  const degraded = k === 'degraded';
  if (k === 'gateway_blocked') {
    return D(theme)
      ? 'bg-rose-500/15 text-rose-200 border border-rose-500/25'
      : 'bg-rose-50 text-rose-800 border border-rose-200/70';
  }
  if (ok) {
    return D(theme)
      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
      : 'bg-emerald-50 text-emerald-800 border border-emerald-200/70';
  }
  if (degraded) {
    return D(theme)
      ? 'bg-amber-500/15 text-amber-200 border border-amber-500/25'
      : 'bg-amber-50 text-amber-900 border border-amber-200/70';
  }
  if (!k || k === 'unknown') {
    return D(theme) ? 'bg-white/[0.06] text-slate-400 border border-white/10' : 'bg-slate-100 text-slate-600 border border-slate-200/80';
  }
  return D(theme)
    ? 'bg-rose-500/15 text-rose-200 border border-rose-500/25'
    : 'bg-rose-50 text-rose-800 border border-rose-200/70';
}

/** 熔断器状态（Resilience4j 等） */
const CIRCUIT_LABEL: Record<string, string> = {
  closed: '闭合（正常放行）',
  open: '断开（熔断中）',
  half_open: '半开（试探恢复）',
  disabled: '已禁用',
  forced_open: '强制断开',
  unknown: '未知',
};

export function circuitBreakerLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  return CIRCUIT_LABEL[k] ?? (k ? `未知（${String(raw).trim()}）` : '—');
}

export function circuitBreakerBadgeClass(theme: Theme, raw: string | null | undefined): string {
  const k = norm(raw);
  if (k === 'closed') {
    return D(theme)
      ? 'bg-emerald-500/12 text-emerald-300 border border-emerald-500/22'
      : 'bg-emerald-50 text-emerald-900 border border-emerald-200/70';
  }
  if (k === 'half_open') {
    return D(theme) ? 'bg-sky-500/12 text-sky-300 border border-sky-500/22' : 'bg-sky-50 text-sky-900 border border-sky-200/70';
  }
  if (!k) {
    return D(theme) ? 'bg-white/[0.06] text-slate-400 border border-white/10' : 'bg-slate-100 text-slate-600 border border-slate-200/80';
  }
  return D(theme)
    ? 'bg-orange-500/12 text-orange-200 border border-orange-500/25'
    : 'bg-orange-50 text-orange-900 border border-orange-200/70';
}

/** 资源版本快照状态（非资源主状态） */
const VERSION_SNAPSHOT_LABEL: Record<string, string> = {
  active: '生效中 · 可切换',
  deprecated: '已暂停的快照',
  archived: '已归档',
  superseded: '已被替代',
  revoked: '已撤销',
  inactive: '未激活',
};

export function resourceVersionSnapshotLabelZh(raw: string | null | undefined): string {
  const k = norm(raw === undefined || raw === null || raw === '' ? 'active' : raw);
  const fallback = raw == null || String(raw).trim() === '' ? '—' : String(raw).trim();
  return VERSION_SNAPSHOT_LABEL[k] ?? `状态：${fallback}`;
}

const GRANT_STATUS_LABEL: Record<string, string> = {
  active: '有效',
  revoked: '已撤销',
  expired: '已过期',
  pending: '待生效',
};

export function resourceGrantRecordStatusLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  return GRANT_STATUS_LABEL[k] ?? (k ? `未映射（${String(raw).trim()}）` : '—');
}

const GRANT_ACTION_LABEL: Record<string, string> = {
  catalog: '目录',
  resolve: '解析',
  invoke: '调用',
  '*': '全部权限',
};

export function resourceGrantActionsLabelZh(actions: string[] | null | undefined): string {
  if (!actions?.length) return '—';
  return actions.map((a) => GRANT_ACTION_LABEL[norm(a)] ?? String(a)).join('、');
}

const PROVIDER_TYPE_LABEL: Record<string, string> = {
  internal: '内部',
  partner: '合作方',
  cloud: '云端',
};

const PROVIDER_STATUS_LABEL: Record<string, string> = {
  active: '启用',
  inactive: '停用',
};

export function providerTypeLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  return PROVIDER_TYPE_LABEL[k] ?? (k ? String(raw).trim() : '—');
}

export function providerStatusLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  return PROVIDER_STATUS_LABEL[k] ?? (k ? String(raw).trim() : '—');
}

const SKILL_PACK_VALIDATION_LABEL: Record<string, string> = {
  none: '未校验',
  pending: '校验中',
  valid: '校验通过',
  invalid: '校验未通过',
};

export function skillPackValidationLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  return SKILL_PACK_VALIDATION_LABEL[k] ?? (k ? String(raw).trim() : '—');
}

const AUDIT_TIER_LABEL: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export function workingDraftAuditTierLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  return AUDIT_TIER_LABEL[k] ?? (k ? String(raw).trim() : '');
}

const SKILL_HUB_AUTH_LABEL: Record<string, string> = {
  authorized: '已授权',
  revoked: '已撤销',
  expired: '已过期',
  pending: '待授权',
};

export function authorizedSkillRowStatusLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  if (!k || k === 'authorized') return '已授权';
  return SKILL_HUB_AUTH_LABEL[k] ?? `状态：${String(raw).trim()}`;
}

/** 仪表盘健康聚合：状态分布行中文 */
export function healthDistributionSummaryZh(dist: { healthy?: number; degraded?: number; down?: number }): string {
  const h = dist.healthy ?? 0;
  const d = dist.degraded ?? 0;
  const x = dist.down ?? 0;
  return `健康 ${h} / 降级 ${d} / 故障 ${x}`;
}

/** 分布式追踪聚合状态（网关/otel 常见 ok / error） */
export function distributedTraceStatusLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  if (k === 'error' || k === 'failed') return '错误';
  if (k === 'success' || k === 'ok') return '成功';
  return raw?.trim() ? String(raw).trim() : '—';
}

/** 统一调用网关响应 status 字段（常见 success / error） */
export function invokeGatewayStatusLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  if (k === 'success' || k === 'ok') return '成功';
  if (k === 'error' || k === 'failed') return '失败';
  if (k === 'timeout') return '超时';
  return raw?.trim() ? String(raw).trim() : '—';
}
