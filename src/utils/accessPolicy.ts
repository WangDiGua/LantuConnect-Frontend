/** 与后端 {@code t_resource.access_policy} 取值兼容的归一化（仅用于 DTO 映射，不在产品界面展示） */
export type ResourceAccessPolicyWire = 'grant_required' | 'open_org' | 'open_platform';

const KNOWN: ResourceAccessPolicyWire[] = ['grant_required', 'open_org', 'open_platform'];

export function normalizeAccessPolicy(raw: unknown): ResourceAccessPolicyWire | undefined {
  const s = String(raw ?? '').trim().toLowerCase();
  return KNOWN.includes(s as ResourceAccessPolicyWire) ? (s as ResourceAccessPolicyWire) : undefined;
}
