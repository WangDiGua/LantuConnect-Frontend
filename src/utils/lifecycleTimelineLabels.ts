import { coerceToDomainStatus, statusLabel } from './uiClasses';

/** 时间轴仅有 eventType、无 title 时的兜底（小写 snake_case） */
const EVENT_TYPE_LABEL_ZH: Record<string, string> = {
  created: '资源创建',
  create: '资源创建',
  submitted: '提交审核',
  submit: '提交审核',
  published: '资源已发布',
  publish: '发布',
  rejected: '已驳回',
  reject: '驳回',
  withdrawn: '撤回审核',
  deprecated: '已暂停对外',
};

/**
 * 将生命周期事件标题中的「后缀英文状态」转为中文展示（如 `审核结果: published` → `审核结果：已发布`）。
 * 资源编码等非状态字段保持原文。
 */
export function lifecycleTimelineEventTitleZh(title: string | null | undefined, eventType?: string | null): string {
  const raw = (title ?? '').trim();
  if (raw) {
    const m = raw.match(/^(.*?)\s*[:：]\s*(.+)$/);
    if (m) {
      const prefix = m[1].trim();
      const suffix = m[2].trim();
      const domain = coerceToDomainStatus(suffix);
      if (domain !== 'unknown') {
        return `${prefix}：${statusLabel(domain)}`;
      }
    }
    return raw;
  }
  const et = (eventType ?? '').trim().toLowerCase().replace(/-/g, '_');
  if (et && EVENT_TYPE_LABEL_ZH[et]) return EVENT_TYPE_LABEL_ZH[et];
  const fallback = (eventType ?? '').trim();
  return fallback || '—';
}
