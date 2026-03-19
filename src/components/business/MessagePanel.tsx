import React, { useState, useEffect } from 'react';
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

export interface MessageItem {
  id: string;
  type: 'system' | 'notice' | 'alert';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const MOCK_MESSAGES: MessageItem[] = [
  { id: '1', type: 'system', title: '系统维护通知', body: '本周日 00:00–02:00 进行例行维护，期间部分接口可能短暂不可用。', time: '10 分钟前', read: false },
  { id: '2', type: 'notice', title: 'API 配额即将用尽', body: '当前项目本月调用量已达 90%，请关注用量或申请扩容。', time: '1 小时前', read: false },
  { id: '3', type: 'alert', title: '告警：接口延迟偏高', body: '监控中心检测到 /v1/chat 接口 P99 延迟超过阈值，请查看调用日志。', time: '2 小时前', read: true },
  { id: '4', type: 'system', title: '知识库导入完成', body: '「教务政策知识库」批量导入已完成，共 120 条文档。', time: '昨天 15:30', read: true },
  { id: '5', type: 'notice', title: '新版本功能说明', body: '监控中心支持告警确认与订阅，详见文档与教程。', time: '昨天 09:00', read: true },
];

export const INITIAL_MESSAGE_UNREAD_COUNT = MOCK_MESSAGES.filter((m) => !m.read).length;

type TabId = 'all' | 'unread';

interface MessagePanelProps {
  theme: Theme;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

const typeConfig = {
  system: { icon: Info, label: '系统', light: 'bg-slate-100 text-slate-700', dark: 'bg-white/10 text-slate-300' },
  notice: { icon: Bell, label: '通知', light: 'bg-blue-100 text-blue-700', dark: 'bg-blue-500/20 text-blue-300' },
  alert: { icon: AlertCircle, label: '告警', light: 'bg-amber-100 text-amber-700', dark: 'bg-amber-500/20 text-amber-300' },
};

export const MessagePanel: React.FC<MessagePanelProps> = ({ theme, onClose, onUnreadChange }) => {
  const isDark = theme === 'dark';
  const [tab, setTab] = useState<TabId>('all');
  const [items, setItems] = useState<MessageItem[]>(() => [...MOCK_MESSAGES]);
  const [detailMessage, setDetailMessage] = useState<MessageItem | null>(null);

  const unreadCount = items.filter((m) => !m.read).length;
  const filtered = tab === 'unread' ? items.filter((m) => !m.read) : items;

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  const markAllRead = () => {
    setItems((prev) => prev.map((m) => ({ ...m, read: true })));
  };

  const markRead = (id: string) => {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  const openDetail = (m: MessageItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markRead(m.id);
    setDetailMessage(m);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={`absolute bottom-full left-4 right-4 mb-2 rounded-2xl border shadow-xl z-[60] overflow-hidden ${
          isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
        }`}
      >
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

        <div className="max-h-[min(70vh,360px)] overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-12 px-4 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              <Mail size={32} className="opacity-50 mb-3" />
              <p className="text-[13px]">暂无{tab === 'unread' ? '未读' : ''}消息</p>
            </div>
          ) : (
            <ul className={isDark ? 'divide-y divide-dashed divide-white/10' : 'divide-y divide-dashed divide-slate-200'}>
              {filtered.map((m) => {
                const cfg = typeConfig[m.type];
                const Icon = cfg.icon;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={(e) => openDetail(m, e)}
                      className={`w-full text-left px-4 py-3 flex gap-3 transition-colors ${
                        !m.read ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50/80') : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? cfg.dark : cfg.light}`}
                      >
                        <Icon size={16} />
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
                      <ChevronRight size={16} className="shrink-0 text-slate-400" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {detailMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setDetailMessage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-2xl border shadow-xl max-w-md w-full overflow-hidden ${
                isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              {(() => {
                const cfg = typeConfig[detailMessage.type];
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
                            {cfg.label} · {detailMessage.time}
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
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{detailMessage.body}</p>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
