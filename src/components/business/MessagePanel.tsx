import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Bell,
  CheckCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Mail,
  AlertCircle,
  Info,
  ExternalLink,
  CheckCircle,
  Clock,
  Circle,
  XCircle,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';
import { Theme } from '../../types';
import { notificationService } from '../../api/services/notification.service';
import type { Notification } from '../../types/dto/notification';
import { formatDateTime } from '../../utils/formatDateTime';
import {
  formatNotificationTimeValue,
  humanizeNotificationType,
  notificationListPreviewBody,
  parseNotificationStepsJson,
  parseStructuredNotificationBody,
  type NotificationFlowStep,
} from '../../utils/notificationDetailFormat';
import { normalizePaginated } from '../../utils/normalizeApiPayload';
import { LantuDateTimePicker } from '../common/LantuDateTimePicker';
import { LantuSelect } from '../common/LantuSelect';
import { mainScrollCompositorClass } from '../../utils/uiClasses';
import { buildPath } from '../../constants/consoleRoutes';
import { parseResourceType, resourceTypeLabel } from '../../constants/resourceTypes';
import type { ResourceType } from '../../types/dto/catalog';
import { isNotificationMessage, subscribeRealtimePush } from '../../lib/realtimePush';

export interface MessageItem {
  id: string;
  type: 'system' | 'notice' | 'alert';
  rawType: string;
  category: string;
  severity: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  sourceType?: string | null;
  sourceId?: string | null;
  aggregateKey?: string | null;
  flowStatus?: string | null;
  currentStep?: number | null;
  totalSteps?: number | null;
  steps: NotificationFlowStep[];
  actionLabel?: string | null;
  actionUrl?: string | null;
  lastEventTimeRaw?: string | null;
  /** 原始 createTime，用于详情内统一格式化（覆盖 body 内嵌的原始时间串） */
  createTimeRaw?: string | null;
}

const typeConfig = {
  system: { icon: Info, label: '系统', light: 'bg-slate-100 text-slate-700', dark: 'bg-white/10 text-slate-300' },
  notice: { icon: Bell, label: '通知', light: 'bg-blue-100 text-blue-700', dark: 'bg-blue-500/20 text-blue-300' },
  alert: { icon: AlertCircle, label: '告警', light: 'bg-amber-100 text-amber-700', dark: 'bg-amber-500/20 text-amber-300' },
};

const categoryLabel: Record<string, string> = {
  workflow: '流程',
  notice: '通知',
  alert: '告警',
  system: '系统',
  security: '安全',
};

type MessageKind = keyof typeof typeConfig;

function normalizeMessageType(raw: unknown): MessageKind {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'notice') return 'notice';
  if (value === 'alert') return 'alert';
  if (value === 'system') return 'system';
  if (value.startsWith('onboarding_')) return 'notice';
  if (value.startsWith('system_')) return 'system';
  if (
    value.includes('password') ||
    value.includes('revoked') ||
    value.includes('security') ||
    value.includes('risk') ||
    value.includes('failed')
  ) return 'alert';
  return 'system';
}

const USER_RESOURCE_DETAIL_PAGE: Record<ResourceType, string> = {
  agent: 'agents-center',
  skill: 'skills-center',
  mcp: 'mcp-center',
  app: 'apps-center',
  dataset: 'dataset-center',
};

function mapNotification(n: Notification): MessageItem {
  const category = String(n.category ?? normalizeMessageType(n.type));
  return {
    id: String(n.id),
    type: normalizeMessageType(n.type),
    rawType: String(n.type ?? 'system'),
    category,
    severity: String(n.severity ?? 'info'),
    title: n.title ?? '',
    body: n.body ?? '',
    time: formatDateTime(n.lastEventTime ?? n.createTime),
    read: Boolean(n.isRead),
    sourceType: n.sourceType,
    sourceId: n.sourceId,
    aggregateKey: n.aggregateKey,
    flowStatus: n.flowStatus,
    currentStep: n.currentStep ?? null,
    totalSteps: n.totalSteps ?? null,
    steps: parseNotificationStepsJson(n.stepsJson),
    actionLabel: n.actionLabel,
    actionUrl: n.actionUrl,
    lastEventTimeRaw: n.lastEventTime,
    createTimeRaw: n.createTime,
  };
}

function resolveNotificationPrimaryAction(item: MessageItem): { label: string; path: string } | null {
  const configuredPath = item.actionUrl?.trim();
  if (configuredPath) return { label: item.actionLabel?.trim() || '查看详情', path: configuredPath };
  const sid = item.sourceId?.trim();
  const source = item.sourceType?.trim().toLowerCase();
  if (source === 'developer_application') {
    return { label: item.actionLabel?.trim() || '查看入驻申请', path: buildPath('admin', 'developer-applications') };
  }
  if (source === 'api_key') {
    return { label: item.actionLabel?.trim() || '查看 API Key', path: buildPath('user', 'my-api-keys') };
  }
  if (source === 'system-config') {
    return { label: item.actionLabel?.trim() || '查看审计日志', path: buildPath('admin', 'audit-log') };
  }
  if (!sid) return null;
  if (source === 'resource') {
    return { label: item.actionLabel?.trim() || '处理审核', path: buildPath('admin', 'resource-audit') };
  }
  const rt = parseResourceType(item.sourceType);
  if (rt) {
    const page = USER_RESOURCE_DETAIL_PAGE[rt];
    return { label: item.actionLabel?.trim() || `查看${resourceTypeLabel(rt)}`, path: buildPath('user', page, sid) };
  }
  return null;
}

/** 详情块：多行「键: 值」时拆成栅格，否则整段正文 */
function DetailBlockContent({ value, isDark }: { value: string; isDark: boolean }) {
  const lines = value.split('\n').map((l) => l.trim()).filter(Boolean);
  const kvLines = lines.filter((l) => {
    const i = l.indexOf(':');
    return i > 0 && i < l.length - 1;
  });
  const isAllKv = lines.length > 0 && kvLines.length === lines.length;

  if (isAllKv) {
    return (
      <div className="space-y-3">
        {lines.map((line, idx) => {
          const i = line.indexOf(':');
          const k = line.slice(0, i).trim();
          const v = line.slice(i + 1).trim();
          return (
            <div key={`${idx}-${k}`} className="grid grid-cols-1 min-[400px]:grid-cols-[5.5rem_1fr] gap-x-3 gap-y-0.5">
              <span
                className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              >
                {k}
              </span>
              <span className={`text-sm leading-relaxed break-words ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {k === '资源' ? formatResourceRefDisplay(v) : v}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <p
      className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
        isDark ? 'text-slate-200' : 'text-slate-800'
      }`}
    >
      {value}
    </p>
  );
}

/** 将 type/id 与 body 内的 「mcp/57」 统一成更可读展示 */
function formatResourceRefDisplay(raw: string): string {
  const s = raw.trim();
  const m = /^([a-z]+)\s*\/\s*(\d+)$/i.exec(s);
  if (m) return `${resourceTypeLabel(m[1])} · ID ${m[2]}`;
  return s;
}

function flowStatusText(status: string | null | undefined): string {
  const s = String(status ?? '').toLowerCase();
  if (s === 'success') return '已完成';
  if (s === 'failed') return '已中止';
  if (s === 'warning') return '需关注';
  return '进行中';
}

function flowStatusClass(status: string | null | undefined, isDark: boolean): string {
  const s = String(status ?? '').toLowerCase();
  if (s === 'success') return isDark ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'failed') return isDark ? 'bg-rose-500/15 text-rose-200 border-rose-400/20' : 'bg-rose-50 text-rose-700 border-rose-200';
  if (s === 'warning') return isDark ? 'bg-amber-500/15 text-amber-200 border-amber-400/20' : 'bg-amber-50 text-amber-700 border-amber-200';
  return isDark ? 'bg-blue-500/15 text-blue-200 border-blue-400/20' : 'bg-blue-50 text-blue-700 border-blue-200';
}

function stepIcon(step: NotificationFlowStep, isDark: boolean) {
  const s = String(step.status ?? '').toLowerCase();
  const cls = isDark ? 'text-slate-200' : 'text-slate-700';
  if (s === 'done' || s === 'success') return <CheckCircle size={15} className="text-emerald-500" />;
  if (s === 'failed' || s === 'error') return <XCircle size={15} className="text-rose-500" />;
  if (s === 'warning') return <AlertCircle size={15} className="text-amber-500" />;
  if (s === 'running') return <Activity size={15} className="text-blue-500" />;
  return <Circle size={15} className={cls} />;
}

function FlowProgress({ item, isDark, compact = false }: { item: MessageItem; isDark: boolean; compact?: boolean }) {
  const total = Math.max(0, Number(item.totalSteps ?? item.steps.length ?? 0));
  const current = Math.max(0, Math.min(total || 0, Number(item.currentStep ?? item.steps.length ?? 0)));
  const pct = total > 0 ? Math.max(8, Math.min(100, Math.round((current / total) * 100))) : 0;
  const latest = item.steps[item.steps.length - 1];
  const status = String(item.flowStatus ?? '').toLowerCase();
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';
  const progressGradient = isFailed
    ? 'from-rose-500 via-orange-400 to-amber-300'
    : isSuccess
      ? 'from-emerald-500 via-cyan-400 to-sky-400'
      : 'from-blue-500 via-cyan-400 to-emerald-400';

  if (compact) {
    return (
      <div className="mt-2.5 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${flowStatusClass(item.flowStatus, isDark)}`}>
            {isSuccess ? <CheckCircle size={12} /> : isFailed ? <XCircle size={12} /> : <Clock size={12} />}
            {flowStatusText(item.flowStatus)}
          </span>
          {total > 0 ? (
            <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] ${isDark ? 'bg-white/[0.06] text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
              {current}/{total} 步
            </span>
          ) : null}
        </div>
        {total > 0 ? (
          <div className={`relative h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`} aria-hidden>
            <div className={`h-full rounded-full bg-gradient-to-r ${progressGradient} shadow-[0_0_18px_rgba(34,211,238,0.28)]`} style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        {latest ? (
          <div className={`rounded-2xl px-3 py-2 ${isDark ? 'bg-white/[0.05] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full ${isDark ? 'bg-slate-950/40' : 'bg-white shadow-sm'}`}>
                {stepIcon(latest, isDark)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-bold">{latest.title}</span>
                {latest.summary ? (
                  <span className={`mt-0.5 block line-clamp-2 text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {latest.summary}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${flowStatusClass(item.flowStatus, isDark)}`}>
          {isSuccess ? <CheckCircle size={13} /> : isFailed ? <XCircle size={13} /> : <Clock size={13} />}
          {flowStatusText(item.flowStatus)}
        </span>
        {total > 0 ? (
          <span className={`rounded-full px-2.5 py-1 font-mono text-[11px] tabular-nums ${isDark ? 'bg-white/[0.06] text-slate-300' : 'bg-white/80 text-slate-500'}`}>
            {current}/{total} 步
          </span>
        ) : null}
      </div>
      {total > 0 ? (
        <div className={`h-2.5 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-white/80'}`} aria-hidden>
          <div className={`h-full rounded-full bg-gradient-to-r ${progressGradient}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {latest && (
        <div className={`rounded-2xl border px-3.5 py-3 ${isDark ? 'border-white/10 bg-slate-950/25 text-slate-200' : 'border-white/80 bg-white/80 text-slate-800'}`}>
          <div className="flex items-start gap-3 text-sm">
            <span className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ${isDark ? 'bg-white/[0.06]' : 'bg-slate-50'}`}>
              {stepIcon(latest, isDark)}
            </span>
            <span className="min-w-0">
              <span className="font-bold">{latest.title}</span>
              {latest.summary ? <span className={isDark ? 'text-slate-400' : 'text-slate-600'}> · {latest.summary}</span> : null}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowTimeline({ steps, isDark }: { steps: NotificationFlowStep[]; isDark: boolean }) {
  if (steps.length === 0) return null;
  return (
    <ol className="space-y-3">
      {steps.map((step, idx) => (
        <li key={`${step.key}-${idx}`} className="relative flex gap-3">
          {idx < steps.length - 1 && (
            <span
              className={`absolute left-[7px] top-6 h-[calc(100%+0.5rem)] w-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}
              aria-hidden
            />
          )}
          <span className="relative z-10 mt-0.5 shrink-0">{stepIcon(step, isDark)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{step.title}</span>
              {step.time ? (
                <time className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`} dateTime={step.time}>
                  {formatNotificationTimeValue(step.time)}
                </time>
              ) : null}
            </div>
            {step.summary ? (
              <p className={`mt-0.5 text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{step.summary}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export const INITIAL_MESSAGE_UNREAD_COUNT = 0;

type TabId = 'all' | 'workflow' | 'unread';

interface MessagePanelProps {
  theme: Theme;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
  /** 默认 bottom：在触发按钮上方展开；top：在下方展开（用于顶栏） */
  anchor?: 'top' | 'bottom';
  /** 顶栏模式下传入触发区域 ref，弹层用 fixed + Portal 避免被父级 overflow 裁切 */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const PAGE_SIZE = 10;

export const MessagePanel: React.FC<MessagePanelProps> = ({
  theme,
  onClose,
  onUnreadChange,
  anchor = 'bottom',
  anchorRef,
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<TabId>('all');
  const [items, setItems] = useState<MessageItem[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);
  const [detailMessage, setDetailMessage] = useState<MessageItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fixedPlacement, setFixedPlacement] = useState({ top: 0, right: 0 });
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);
  type FilterState = {
    category: string;
    isRead: 'all' | 'read' | 'unread';
    startTime: string;
    endTime: string;
  };
  const defaultFilters: FilterState = {
    category: 'all',
    isRead: 'all',
    startTime: '',
    endTime: '',
  };
  /** 筛选区草稿（点「筛选」后写入 applied） */
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  /** 已生效的查询条件（与后端分页请求一致） */
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);

  const usePortal = anchor === 'top' && anchorRef != null;

  useLayoutEffect(() => {
    if (!usePortal || !anchorRef) return;
    const reposition = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setFixedPlacement({ top: r.bottom + 8, right: Math.max(12, window.innerWidth - r.right) });
    };
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [usePortal, anchorRef]);

  const appliedFilterKey = `${appliedFilters.category}|${appliedFilters.isRead}|${appliedFilters.startTime}|${appliedFilters.endTime}`;

  const refreshServerUnread = useCallback(async () => {
    try {
      const data = await notificationService.getUnreadCount();
      let n = 0;
      if (typeof data === 'number') n = data;
      else if (data && typeof data === 'object' && 'count' in data) n = Number((data as { count: number }).count);
      n = Number.isFinite(n) && n > 0 ? Math.min(9999, Math.floor(n)) : 0;
      setServerUnreadCount(n);
      onUnreadChange?.(n);
    } catch {
      /* keep previous */
    }
  }, [onUnreadChange]);

  useEffect(() => {
    void refreshServerUnread();
  }, [refreshServerUnread]);

  useEffect(() => subscribeRealtimePush((msg) => {
    if (!isNotificationMessage(msg)) return;
    setReloadToken((n) => n + 1);
    const raw = msg.unreadCount;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      const next = raw > 0 ? Math.min(9999, Math.floor(raw)) : 0;
      setServerUnreadCount(next);
      onUnreadChange?.(next);
      return;
    }
    void refreshServerUnread();
  }), [onUnreadChange, refreshServerUnread]);

  useEffect(() => {
    setListPage(1);
  }, [tab, appliedFilterKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      const params: {
        page: number;
        pageSize: number;
        type?: string;
        category?: string;
        isRead?: boolean;
        startTime?: string;
        endTime?: string;
      } = { page: listPage, pageSize: PAGE_SIZE };
      const af = appliedFilters;
      if (tab === 'workflow') params.category = 'workflow';
      else if (af.category !== 'all') params.category = af.category;
      if (tab === 'unread') {
        params.isRead = false;
      } else {
        if (af.isRead === 'read') params.isRead = true;
        else if (af.isRead === 'unread') params.isRead = false;
      }
      if (af.startTime) params.startTime = `${af.startTime} 00:00:00`;
      if (af.endTime) params.endTime = `${af.endTime} 23:59:59`;
      try {
        const raw = await notificationService.list(params);
        if (cancelled) return;
        const pageData = normalizePaginated<Notification>(raw);
        setItems(pageData.list.map(mapNotification));
        setListTotal(pageData.total);
      } catch {
        if (!cancelled) {
          setItems([]);
          setListTotal(0);
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, listPage, appliedFilterKey, reloadToken]);

  useLayoutEffect(() => {
    listScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [listPage, tab, appliedFilterKey, reloadToken]);

  const totalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));

  useEffect(() => {
    if (!detailMessage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailMessage(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detailMessage]);

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
    } catch {
      return;
    }
    setListPage(1);
    setReloadToken((n) => n + 1);
    await refreshServerUnread();
  };

  const markRead = async (id: string) => {
    try {
      await notificationService.markRead(Number(id));
    } catch {
      return;
    }
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    await refreshServerUnread();
  };

  const openDetail = (m: MessageItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void markRead(m.id);
    setDetailMessage(m);
    setDetailLoading(true);
    void notificationService.getById(Number(m.id))
      .then((detail) => {
        setDetailMessage((prev) => {
          if (!prev || prev.id !== m.id) return prev;
          return mapNotification(detail);
        });
      })
      .catch(() => {
        /* fallback to list item content */
      })
      .finally(() => {
        setDetailLoading(false);
      });
  };

  const applyFilters = () => {
    setActiveDatePicker(null);
    setAppliedFilters({ ...filters });
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    const reset: FilterState = { category: 'all', isRead: 'all', startTime: '', endTime: '' };
    setFilters(reset);
    setAppliedFilters(reset);
    setActiveDatePicker(null);
    setListPage(1);
    setFiltersOpen(false);
  };

  const activeFilterCount = [
    appliedFilters.category !== 'all',
    appliedFilters.isRead !== 'all',
    Boolean(appliedFilters.startTime),
    Boolean(appliedFilters.endTime),
  ].filter(Boolean).length;

  const surface = isDark ? 'bg-lantu-card border-white/10' : 'bg-white border-slate-200';
  const dropdownClassName = `z-[60] overflow-hidden rounded-[24px] border shadow-xl flex flex-col min-h-0 max-h-[min(78vh,500px)] ${
    usePortal
      ? `fixed w-[min(calc(100vw-1.5rem),380px)] ${surface}`
      : anchor === 'top'
        ? `absolute left-auto right-0 top-full mt-2 w-[min(calc(100vw-1.5rem),380px)] ${surface}`
        : `absolute bottom-full left-4 right-4 mb-2 ${surface}`
  }`;

  const panelInner = (
    <>
        <div className={`shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            <span className={`font-bold text-[15px] truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>消息中心</span>
            {serverUnreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white min-w-[1.25rem] text-center">
                {serverUnreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {serverUnreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className={`p-2 rounded-xl text-[12px] font-medium transition-colors ${
                  isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <CheckCheck size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={`shrink-0 flex items-center gap-2 border-b px-3 py-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className={`flex min-w-0 flex-1 rounded-2xl p-1 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-100/80'}`}>
            {([
              ['all', '全部'],
              ['workflow', '流程'],
              ['unread', serverUnreadCount > 0 ? `未读 ${serverUnreadCount}` : '未读'],
            ] as const).map(([key, label]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`min-h-8 flex-1 rounded-xl px-2 text-xs font-bold transition-colors ${
                    active
                      ? isDark
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'bg-white text-slate-950 shadow-sm'
                      : isDark
                        ? 'text-slate-500 hover:text-slate-300'
                        : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-2xl transition-colors ${
              filtersOpen || activeFilterCount > 0
                ? isDark
                  ? 'bg-cyan-400/15 text-cyan-200'
                  : 'bg-blue-50 text-blue-700'
                : isDark
                  ? 'text-slate-400 hover:bg-white/10'
                  : 'text-slate-500 hover:bg-slate-100'
            }`}
            aria-label="筛选消息"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={17} />
            {activeFilterCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-blue-600 text-[10px] font-black text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {filtersOpen ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`shrink-0 overflow-visible border-b ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'}`}
            >
              <div className="px-3 py-2">
                <div className="grid grid-cols-2 gap-2">
                  <LantuSelect
                    theme={theme}
                    value={filters.category}
                    onChange={(next) => setFilters((prev) => ({ ...prev, category: next }))}
                    options={[
                      { value: 'all', label: '分类：全部' },
                      { value: 'workflow', label: '流程' },
                      { value: 'security', label: '安全' },
                      { value: 'system', label: '系统' },
                      { value: 'notice', label: '通知' },
                      { value: 'alert', label: '告警' },
                    ]}
                    triggerClassName="!min-h-[2rem] !px-2.5 !py-1.5 !text-xs"
                  />
                  <LantuSelect
                    theme={theme}
                    value={filters.isRead}
                    onChange={(next) => setFilters((prev) => ({ ...prev, isRead: next as 'all' | 'read' | 'unread' }))}
                    options={[
                      { value: 'all', label: '状态：全部' },
                      { value: 'unread', label: '未读' },
                      { value: 'read', label: '已读' },
                    ]}
                    triggerClassName="!min-h-[2rem] !px-2.5 !py-1.5 !text-xs"
                  />
                  <LantuDateTimePicker
                    theme={theme}
                    mode="date"
                    value={filters.startTime}
                    onChange={(next) => setFilters((prev) => ({ ...prev, startTime: next }))}
                    placeholder="开始日期"
                    compact
                    ariaLabel="开始日期"
                    open={activeDatePicker === 'start'}
                    onOpen={() => setActiveDatePicker('start')}
                    onClose={() => setActiveDatePicker((prev) => (prev === 'start' ? null : prev))}
                  />
                  <LantuDateTimePicker
                    theme={theme}
                    mode="date"
                    value={filters.endTime}
                    onChange={(next) => setFilters((prev) => ({ ...prev, endTime: next }))}
                    placeholder="结束日期"
                    compact
                    ariaLabel="结束日期"
                    open={activeDatePicker === 'end'}
                    onOpen={() => setActiveDatePicker('end')}
                    onClose={() => setActiveDatePicker((prev) => (prev === 'end' ? null : prev))}
                  />
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className={`h-7 rounded-lg px-2.5 text-xs transition-colors ${
                      isDark ? 'text-slate-300 bg-white/5 hover:bg-white/10' : 'text-slate-600 bg-white hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    重置
                  </button>
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="h-7 rounded-lg px-2.5 text-xs text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    筛选
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="flex flex-col min-h-0 flex-1">
          <div
            ref={listScrollRef}
            className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${mainScrollCompositorClass}`}
            aria-busy={listLoading}
          >
          {!listLoading && items.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-12 px-4 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              <Mail size={32} className="opacity-50 mb-3" />
              <p className="text-sm">暂无{tab === 'unread' ? '未读' : tab === 'workflow' ? '流程' : ''}消息</p>
            </div>
          ) : listLoading && items.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-12 px-4 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              加载中…
            </div>
          ) : (
            <ul className={isDark ? 'divide-y divide-dashed divide-white/10' : 'divide-y divide-dashed divide-slate-200'}>
              {items.map((m) => {
                const cfg = typeConfig[m.type] ?? typeConfig.system;
                const Icon = cfg.icon;
                const isFlow = m.category === 'workflow' || m.steps.length > 0 || m.aggregateKey;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={(e) => openDetail(m, e)}
                      className={`w-full text-left px-3 py-2.5 transition-colors ${
                        isFlow
                          ? !m.read
                            ? isDark
                              ? 'bg-cyan-500/10'
                              : 'bg-cyan-50/90'
                            : isDark
                              ? 'hover:bg-white/[0.04]'
                              : 'hover:bg-slate-50'
                          : !m.read
                            ? isDark
                              ? 'bg-blue-500/10'
                              : 'bg-blue-50/80'
                            : isDark
                              ? 'hover:bg-white/[0.04]'
                              : 'hover:bg-slate-50'
                      }`}
                    >
                      {isFlow ? (
                        <div
                          className={`group/flow relative overflow-hidden rounded-[22px] border p-3 transition-all ${
                            isDark
                              ? 'border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] hover:border-cyan-300/25'
                              : 'border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.13),transparent_42%),linear-gradient(180deg,#ffffff,#f8fafc)] shadow-sm hover:border-cyan-200 hover:shadow-md'
                          }`}
                        >
                          <div className={`absolute inset-y-0 left-0 w-1 ${isDark ? 'bg-cyan-300/70' : 'bg-cyan-500'}`} aria-hidden />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-2xl ${isDark ? 'bg-cyan-300/12 text-cyan-200 ring-1 ring-cyan-300/15' : 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100'}`}>
                                  <Activity size={17} />
                                </span>
                                <div className="min-w-0">
                                  <p className={`truncate text-sm font-black leading-tight tracking-[-0.01em] ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                    {m.title}
                                  </p>
                                  <p className={`mt-1 flex items-center gap-1.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <span>{categoryLabel[m.category] ?? '流程'}</span>
                                    <span className="size-1 rounded-full bg-current opacity-35" aria-hidden />
                                    <span className="font-mono">{humanizeNotificationType(m.rawType) || m.rawType}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {!m.read && <span className="size-2.5 rounded-full bg-cyan-500 shadow-[0_0_0_4px_rgba(6,182,212,0.12)]" aria-label="未读" />}
                              <ChevronRight size={17} className={`transition-transform group-hover/flow:translate-x-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                            </div>
                          </div>
                          <FlowProgress item={m} isDark={isDark} compact />
                          <div className={`mt-2.5 flex items-center justify-between gap-2 border-t pt-2.5 text-[11px] ${isDark ? 'border-white/10 text-slate-500' : 'border-slate-200/70 text-slate-400'}`}>
                            <span>最后更新</span>
                            <time dateTime={m.lastEventTimeRaw ?? m.createTimeRaw ?? undefined}>{m.time}</time>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <span
                            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? cfg.dark : cfg.light}`}
                          >
                            <Icon size={16} className="shrink-0" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {m.title}
                              </span>
                              {!m.read && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" aria-hidden />
                              )}
                              {m.category && m.category !== m.type ? (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                  {categoryLabel[m.category] ?? m.category}
                                </span>
                              ) : null}
                            </div>
                            <p className={`text-[12px] mt-0.5 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {notificationListPreviewBody(m.body)}
                            </p>
                            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{m.time}</p>
                          </div>
                          <ChevronRight size={16} className="mt-0.5 shrink-0 self-start text-slate-400" />
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          </div>

          {items.length > 0 && totalPages > 1 ? (
            <nav
              className={`shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-t ${
                isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/80'
              }`}
              aria-label="消息列表分页"
            >
              <p className={`text-[11px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                第 <span className="font-semibold">{listPage}</span> / {totalPages} 页 · 共 {listTotal} 条
                {listLoading ? <span className="ml-1.5 opacity-80">· 加载中</span> : null}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={listPage <= 1 || listLoading}
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                    isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-200/80'
                  }`}
                  aria-label="上一页"
                >
                  <ChevronLeft size={18} aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={listPage >= totalPages || listLoading}
                  onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                  className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                    isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-200/80'
                  }`}
                  aria-label="下一页"
                >
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>
            </nav>
          ) : items.length > 0 && listTotal > 0 ? (
            <div
              className={`shrink-0 px-3 py-2 text-center text-[11px] tabular-nums border-t ${
                isDark ? 'border-white/10 text-slate-500' : 'border-slate-200 text-slate-500'
              }`}
            >
              共 {listTotal} 条
            </div>
          ) : null}
        </div>
    </>
  );

  const detailOverlay = (
      <AnimatePresence>
        {detailMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setDetailMessage(null)}
            role="presentation"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="message-detail-title"
              className={`rounded-2xl border shadow-2xl max-w-lg w-full max-h-[min(90vh,640px)] flex flex-col overflow-hidden ${
                isDark ? 'bg-lantu-card border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              {(() => {
                const cfg = typeConfig[detailMessage.type] ?? typeConfig.system;
                const Icon = cfg.icon;
                const typeZh = humanizeNotificationType(detailMessage.rawType);
                const metaType = typeZh || detailMessage.rawType;
                const parsed = detailMessage.body ? parseStructuredNotificationBody(detailMessage.body) : null;
                const primaryAction = resolveNotificationPrimaryAction(detailMessage);
                const titleTrim = detailMessage.title.trim();

                const headerRows =
                  parsed?.headers.filter((row) => {
                    if (row.key === '结果' && row.value.trim() === titleTrim) return false;
                    return true;
                  }) ?? [];

                return (
                  <>
                    <div className={`flex items-start justify-between gap-3 px-5 py-4 border-b shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${isDark ? cfg.dark : cfg.light}`}
                          aria-hidden
                        >
                          <Icon size={22} />
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <h3
                            id="message-detail-title"
                            className={`font-bold text-[17px] leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}
                          >
                            {detailMessage.title}
                          </h3>
                          <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{cfg.label}</span>
                            <span className="mx-1.5 opacity-40" aria-hidden>
                              ·
                            </span>
                            <time dateTime={detailMessage.createTimeRaw ?? undefined}>{detailMessage.time}</time>
                            <span className="mx-1.5 opacity-40" aria-hidden>
                              ·
                            </span>
                            <span className="font-mono text-[11px] opacity-90">{metaType}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetailMessage(null)}
                        className={`p-2.5 rounded-xl shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
                        aria-label="关闭详情"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className={`px-5 py-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 ${mainScrollCompositorClass}`}>
                      {detailLoading ? (
                        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>正在加载详情…</p>
                      ) : parsed ? (
                        <div className="space-y-4">
                          {(detailMessage.category === 'workflow' || detailMessage.steps.length > 0) ? (
                            <div className={`relative overflow-hidden rounded-[24px] border p-4 ${isDark ? 'border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.13),transparent_44%),rgba(8,47,73,0.16)]' : 'border-cyan-200/80 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.13),transparent_44%),linear-gradient(180deg,#ecfeff,#ffffff)]'}`}>
                              <div className={`absolute inset-y-0 left-0 w-1 ${isDark ? 'bg-cyan-300/70' : 'bg-cyan-500'}`} aria-hidden />
                              <FlowProgress item={detailMessage} isDark={isDark} />
                              <div className={`mt-4 rounded-2xl border px-4 py-3.5 ${isDark ? 'border-white/10 bg-slate-950/25' : 'border-white/90 bg-white/85 shadow-sm'}`}>
                                <p className={`mb-3 text-xs font-semibold ${isDark ? 'text-cyan-200' : 'text-cyan-800'}`}>流程步骤</p>
                                <FlowTimeline steps={detailMessage.steps} isDark={isDark} />
                              </div>
                            </div>
                          ) : null}
                          <dl className="divide-y divide-dashed rounded-xl border overflow-hidden bg-slate-50/80 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/10">
                            {headerRows.map((row, hIdx) => {
                              const isTime = row.key === '时间';
                              const display =
                                isTime && detailMessage.createTimeRaw
                                  ? formatDateTime(detailMessage.createTimeRaw)
                                  : isTime
                                    ? formatNotificationTimeValue(row.value)
                                    : row.value;
                              return (
                                <div
                                  key={`${hIdx}-${row.key}`}
                                  className="grid grid-cols-1 sm:grid-cols-[4.5rem_1fr] gap-x-4 gap-y-1 px-4 py-3.5 bg-white/60 dark:bg-transparent"
                                >
                                  <dt
                                    className={`text-xs font-semibold pt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                                  >
                                    {row.key}
                                  </dt>
                                  <dd className={`text-sm leading-relaxed min-w-0 break-words ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {display}
                                  </dd>
                                </div>
                              );
                            })}
                          </dl>

                          {parsed.detailContent ? (
                            <div>
                              <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                详情
                              </p>
                              <div
                                className={`rounded-xl border px-4 py-3.5 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white'}`}
                              >
                                <DetailBlockContent value={parsed.detailContent} isDark={isDark} />
                              </div>
                            </div>
                          ) : null}

                          {(parsed.suggestion || primaryAction) && (
                            <div
                              className={`rounded-xl border px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 ${isDark ? 'border-blue-500/25 bg-blue-500/10' : 'border-blue-200 bg-blue-50/90'}`}
                            >
                              {parsed.suggestion ? (
                                <p className={`text-sm leading-relaxed flex-1 min-w-0 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  <span className={`font-semibold mr-1.5 ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>建议</span>
                                  {parsed.suggestion}
                                </p>
                              ) : (
                                <span className="flex-1" />
                              )}
                              {primaryAction ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigate(primaryAction.path);
                                    setDetailMessage(null);
                                  }}
                                  className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                                    isDark
                                      ? 'bg-white text-slate-900 hover:bg-slate-100 ring-offset-lantu-card'
                                      : 'bg-blue-600 text-white hover:bg-blue-700 ring-offset-white'
                                  }`}
                                >
                                  {primaryAction.label}
                                  <ExternalLink size={16} className="opacity-90" aria-hidden />
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p
                          className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
                        >
                          {detailMessage.body}
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  );

  const dropdown = (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={dropdownClassName}
      style={usePortal ? { top: fixedPlacement.top, right: fixedPlacement.right } : undefined}
      onMouseDown={usePortal ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
      data-message-panel={usePortal ? true : undefined}
    >
      {panelInner}
    </motion.div>
  );

  if (usePortal) {
    return createPortal(
      <>
        {dropdown}
        {detailOverlay}
      </>,
      document.body,
    );
  }

  return (
    <>
      {dropdown}
      {detailOverlay}
    </>
  );
};
