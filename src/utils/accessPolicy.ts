import type { Theme } from '../types';

export type ResourceAccessPolicyWire = 'grant_required' | 'open_org' | 'open_platform';

const KNOWN: ResourceAccessPolicyWire[] = ['grant_required', 'open_org', 'open_platform'];

export function normalizeAccessPolicy(raw: unknown): ResourceAccessPolicyWire | undefined {
  const s = String(raw ?? '').trim().toLowerCase();
  return KNOWN.includes(s as ResourceAccessPolicyWire) ? (s as ResourceAccessPolicyWire) : undefined;
}

/** 短标签（卡片、表格） */
export function accessPolicyShortLabel(p: ResourceAccessPolicyWire | undefined): string {
  switch (p) {
    case 'open_org':
      return '同部门免授权';
    case 'open_platform':
      return '租户内免授权';
    case 'grant_required':
    default:
      return '需授权';
  }
}

/** 资源注册等表单下拉的选项文案（较完整） */
export function accessPolicyFormSelectOptions(): { value: ResourceAccessPolicyWire; label: string }[] {
  return [
    { value: 'grant_required', label: '需授权（默认，严格）' },
    { value: 'open_org', label: '同部门免授权' },
    { value: 'open_platform', label: '租户内免授权（谨慎）' },
  ];
}

/** 注册表单 / 详情说明 */
export function accessPolicyHelpLines(): Record<ResourceAccessPolicyWire, string> {
  return {
    grant_required: '默认：调用方需具备有效的资源级授权（及 API Key 权限范围）；适合严格管控场景。',
    open_org:
      '同部门便利：API Key 为用户归属密钥，且密钥所属用户与资源 owner 部门一致时，可免资源级授权（仍会校验 Key 与 scope）。',
    open_platform:
      '租户内开放：租户内已认证 API Key 在 scope 满足时可免资源级授权；请评估数据与外泄风险。',
  };
}

export function accessPolicyBadgeClass(policy: ResourceAccessPolicyWire | undefined, theme: Theme): string {
  const isDark = theme === 'dark';
  switch (policy) {
    case 'open_platform':
      return isDark ? 'bg-amber-500/20 text-amber-200 border border-amber-400/25' : 'bg-amber-50 text-amber-900 border border-amber-200/80';
    case 'open_org':
      return isDark ? 'bg-sky-500/15 text-sky-200 border border-sky-400/20' : 'bg-sky-50 text-sky-900 border border-sky-200/80';
    case 'grant_required':
    default:
      return isDark ? 'bg-white/[0.08] text-slate-300 border border-white/[0.08]' : 'bg-slate-100 text-slate-700 border border-slate-200/90';
  }
}
