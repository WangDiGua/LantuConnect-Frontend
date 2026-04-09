/** 与后端 {@code t_resource.access_policy} wire 值兼容的归一化（历史字段；invoke 不据此拦截） */
export type ResourceAccessPolicyWire = 'grant_required' | 'open_org' | 'open_platform';

const KNOWN: ResourceAccessPolicyWire[] = ['grant_required', 'open_org', 'open_platform'];

export function normalizeAccessPolicy(raw: unknown): ResourceAccessPolicyWire | undefined {
  const s = String(raw ?? '').trim().toLowerCase();
  return KNOWN.includes(s as ResourceAccessPolicyWire) ? (s as ResourceAccessPolicyWire) : undefined;
}
