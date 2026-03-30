import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Bell,
  CheckCheck,
  ChevronRight,
  X,
  Mail,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Theme } from '../../types';
import { notificationService } from '../../api/services/notification.service';
import type { Notification } from '../../types/dto/notification';
import { formatDateTime } from '../../utils/formatDateTime';
import { LantuDateTimePicker } from '../common/LantuDateTimePicker';
import { LantuSelect } from '../common/LantuSelect';
import { mainScrollCompositorClass } from '../../utils/uiClasses';

export interface MessageItem {
  id: string;
  type: 'system' | 'notice' | 'alert';
  rawType: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const typeConfig = {
  system: { icon: Info, label: '系统', light: 'bg-slate-100 text-slate-700', dark: 'bg-white/10 text-slate-300' },
  notice: { icon: Bell, label: '通知', light: 'bg-blue-100 text-blue-700', dark: 'bg-blue-500/20 text-blue-300' },
  alert: { icon: AlertCircle, label: '告警', light: 'bg-amber-100 text-amber-700', dark: 'bg-amber-500/20 text-amber-300' },
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

function mapNotification(n: Notification): MessageItem {
  return {
    id: String(n.id),
    type: normalizeMessageType(n.type),
    rawType: String(n.type ?? 'system'),
    title: n.title ?? '',
    body: n.body ?? '',
    time: formatDateTime(n.createTime),
    read: Boolean(n.isRead),
  };
}

export const INITIAL_MESSAGE_UNREAD_COUNT = 0;

type TabId = 'all' | 'unread';

interface MessagePanelProps {
  theme: Theme;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
  /** 默认 bottom：在触发按钮上方展开；top：在下方展开（用于顶栏） */
  anchor?: 'top' | 'bottom';
  /** 顶栏模式下传入触发区域 ref，弹层用 fixed + Portal 避免被父级 overflow 裁切 */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const MessagePanel: React.FC<MessagePanelProps> = ({
  theme,
  onClose,
  onUnreadChange,
  anchor = 'bottom',
  anchorRef,
}) => {
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<TabId>('all');
  const [items, setItems] = useState<MessageItem[]>([]);
  const [detailMessage, setDetailMessage] = useState<MessageItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fixedPlacement, setFixedPlacement] = useState({ top: 0, right: 0 });
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [filters, setFilters] = useState<{
    type: string;
    isRead: 'all' | 'read' | 'unread';
    startTime: string;
    endTime: string;
  }>({
    type: 'all',
    isRead: 'all',
    startTime: '',
    endTime: '',
  });

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

  const unreadCount = items.filter((m) => !m.read).length;
  const filtered = tab === 'unread' ? items.filter((m) => !m.read) : items;

  const fetchNotifications = useCallback(async (queryFilters?: typeof filters) => {
    const current = queryFilters ?? filters;
    const params: {
      page: number;
      pageSize: number;
      type?: string;
      isRead?: boolean;
      startTime?: string;
      endTime?: string;
    } = { page: 1, pageSize: 50 };
    if (current.type !== 'all') params.type = current.type;
    if (current.isRead === 'read') params.isRead = true;
    else if (current.isRead === 'unread') params.isRead = false;
    if (current.startTime) params.startTime = `${current.startTime} 00:00:00`;
    if (current.endTime) params.endTime = `${current.endTime} 23:59:59`;
    try {
      const page = await notificationService.list(params);
      setItems((page.list ?? []).map(mapNotification));
    } catch {
      /* 静默失败，保持空列表 */
    }
  }, [filters]);

  useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  const markAllRead = async () => {
    try { await notificationService.markAllRead(); } catch { /* ignore */ }
    setItems((prev) => prev.map((m) => ({ ...m, read: true })));
  };

  const markRead = async (id: string) => {
    try { await notificationService.markRead(Number(id)); } catch { /* ignore */ }
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
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
    void fetchNotifications(filters);
  };

  const resetFilters = () => {
    const reset = { type: 'all', isRead: 'all' as const, startTime: '', endTime: '' };
    setFilters(reset);
    setActiveDatePicker(null);
    void fetchNotifications(reset);
  };

  const surface = isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200';
  const dropdownClassName = `z-[60] overflow-hidden rounded-[24px] border shadow-xl ${
    usePortal
      ? `fixed w-[min(calc(100vw-1.5rem),380px)] ${surface}`
      : anchor === 'top'
        ? `absolute left-auto right-0 top-full mt-2 w-[min(calc(100vw-1.5rem),380px)] ${surface}`
        : `absolute bottom-full left-4 right-4 mb-2 ${surface}`
  }`;

  const panelInner = (
    <>
        <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
            <span className={`font-bold text-[15px] truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>消息中心</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-600 text-white min-w-[1.25rem] text-center">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
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

        <div className={`flex border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`flex-1 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              tab === 'all'
                ? isDark
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setTab('unread')}
            className={`flex-1 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              tab === 'unread'
                ? isDark
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-blue-600 border-b-2 border-blue-600'
                : isDark
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            未读
            {unreadCount > 0 && (
              <span className="ml-1.5 text-[11px] opacity-80">({unreadCount})</span>
            )}
          </button>
        </div>

        <div className={`px-3 py-2 border-b ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/70'}`}>
          <div className="grid grid-cols-2 gap-2">
            <LantuSelect
              theme={theme}
              value={filters.type}
              onChange={(next) => setFilters((prev) => ({ ...prev, type: next }))}
              options={[
                { value: 'all', label: '类型：全部' },
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

        <div className={`max-h-[min(70vh,360px)] overflow-y-auto custom-scrollbar ${mainScrollCompositorClass}`}>
          {filtered.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-12 px-4 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              <Mail size={32} className="opacity-50 mb-3" />
              <p className="text-[13px]">暂无{tab === 'unread' ? '未读' : ''}消息</p>
            </div>
          ) : (
            <ul className={isDark ? 'divide-y divide-dashed divide-white/10' : 'divide-y divide-dashed divide-slate-200'}>
              {filtered.map((m) => {
                const cfg = typeConfig[m.type] ?? typeConfig.system;
                const Icon = cfg.icon;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={(e) => openDetail(m, e)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                        !m.read ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50/80') : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? cfg.dark : cfg.light}`}
                      >
                        <Icon size={16} className="shrink-0" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-[13px] truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {m.title}
                          </span>
                          {!m.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" aria-hidden />
                          )}
                        </div>
                        <p className={`text-[12px] mt-0.5 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {m.body}
                        </p>
                        <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{m.time}</p>
                      </div>
                      <ChevronRight size={16} className="mt-0.5 shrink-0 self-start text-slate-400" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setDetailMessage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-[24px] border shadow-xl max-w-md w-full overflow-hidden ${
                isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              {(() => {
                const cfg = typeConfig[detailMessage.type] ?? typeConfig.system;
                const Icon = cfg.icon;
                return (
                  <>
                    <div className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? cfg.dark : cfg.light}`}>
                          <Icon size={20} />
                        </span>
                        <div className="min-w-0">
                          <h3 className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {detailMessage.title}
                          </h3>
                          <p className={`text-[12px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            {cfg.label} · {detailMessage.time} · {detailMessage.rawType}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetailMessage(null)}
                        className={`p-2 rounded-xl shrink-0 ${isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
                        aria-label="关闭"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className={`px-5 py-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {detailLoading ? (
                        <p className={`text-[13px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>正在加载详情…</p>
                      ) : (
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{detailMessage.body}</p>
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
