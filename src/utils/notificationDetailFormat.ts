import { formatDateTime } from './formatDateTime';

/** 与后端 {@code SystemNotificationFacade#buildBody} / 审核通知拼装格式对齐 */
export interface ParsedNotificationBody {
  headers: { key: string; value: string }[];
  /** 「详情:」后的正文（可含多行键值） */
  detailContent: string | null;
  suggestion: string | null;
}

/**
 * 解析站内通知 body（事件/结果/时间/详情/建议）；无法识别时返回 null 由调用方按纯文本展示。
 */
export function parseStructuredNotificationBody(body: string): ParsedNotificationBody | null {
  const normalized = body.replace(/\r\n/g, '\n');
  if (!normalized.trimStart().startsWith('事件:')) return null;

  const suggestionMatch = /\n建议:\s*([\s\S]*)$/.exec(normalized);
  const suggestion = suggestionMatch ? suggestionMatch[1].trim() : null;
  const main = suggestionMatch ? normalized.slice(0, suggestionMatch.index).trimEnd() : normalized.trimEnd();

  const detailRe = /\n详情:\s*\n?/;
  const dm = detailRe.exec(main);
  let headerText: string;
  let detailContent: string | null = null;
  if (dm) {
    headerText = main.slice(0, dm.index).trim();
    detailContent = main.slice(dm.index + dm[0].length).trim() || null;
  } else {
    headerText = main.trim();
  }

  const headers: { key: string; value: string }[] = [];
  for (const line of headerText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    headers.push({ key, value });
  }

  return { headers, detailContent, suggestion };
}

/** 将 Java LocalDateTime / 纳秒 ISO 等粗解析为全站统一时间串 */
export function formatNotificationTimeValue(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return '—';
  let s = String(raw).trim();
  s = s.replace(/(\.\d{3})\d+(?=([zZ]|[+-]\d|:|\s|$))/, '$1');
  s = s.replace(/(\.\d{3})\d+$/i, '$1');
  const withT = /^\d{4}-\d{2}-\d{2}\s+\d/.test(s) ? s.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T') : s;
  return formatDateTime(withT);
}

const TYPE_LABEL_ZH: Record<string, string> = {
  audit_approved: '审核通过',
  audit_rejected: '审核驳回',
  audit_pending: '待审核',
  alert: '告警触发',
  onboarding_submitted: '入驻待审',
  onboarding_approved: '入驻通过',
  onboarding_rejected: '入驻驳回',
  password_changed: '密码变更',
  phone_bound: '手机绑定',
  session_killed: '会话下线',
  api_key_created: 'API Key 创建',
  api_key_revoked: 'API Key 撤销',
  alert_triggered: '告警',
  platform_resource_force_deprecated: '平台下架',
};

export function humanizeNotificationType(raw: string | null | undefined): string {
  if (raw == null || !String(raw).trim()) return '';
  const k = String(raw).trim().toLowerCase();
  return TYPE_LABEL_ZH[k] ?? raw;
}
