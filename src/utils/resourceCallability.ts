import type { Theme } from '../types';

function norm(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

const LABELS: Record<string, string> = {
  callable: '可调用',
  not_published: '未发布',
  disabled: '已禁用',
  circuit_open: '熔断中',
  circuit_half_open: '半开探测',
  health_down: '健康失败',
  health_degraded: '降级',
  dependency_blocked: '依赖阻塞',
  not_configured: '未配置',
  unknown: '未知',
};

export function resourceCallabilityLabelZh(raw: string | null | undefined): string {
  const k = norm(raw);
  return LABELS[k] ?? (k ? String(raw).trim() : '—');
}

export function resourceCallabilityBadgeClass(theme: Theme, raw: string | null | undefined): string {
  const k = norm(raw);
  const dark = theme === 'dark';
  if (k === 'callable') {
    return dark
      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
      : 'bg-emerald-50 text-emerald-800 border border-emerald-200/70';
  }
  if (k === 'circuit_half_open') {
    return dark
      ? 'bg-amber-500/15 text-amber-200 border border-amber-500/25'
      : 'bg-amber-50 text-amber-900 border border-amber-200/70';
  }
  if (k === 'not_published' || k === 'not_configured') {
    return dark
      ? 'bg-slate-500/15 text-slate-300 border border-slate-500/25'
      : 'bg-slate-50 text-slate-700 border border-slate-200/70';
  }
  if (!k || k === 'unknown') {
    return dark
      ? 'bg-white/[0.06] text-slate-400 border border-white/10'
      : 'bg-slate-100 text-slate-600 border border-slate-200/80';
  }
  return dark
    ? 'bg-rose-500/15 text-rose-200 border border-rose-500/25'
    : 'bg-rose-50 text-rose-800 border border-rose-200/70';
}
