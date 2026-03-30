import React, { useState, useCallback, useMemo, createContext, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { Theme } from '../../types';

export type MessageType = 'success' | 'error' | 'info' | 'warning';

interface MessageItem {
  id: string;
  type: MessageType;
  content: string;
  duration?: number;
}

interface MessageContextType {
  showMessage: (content: string, type?: MessageType, duration?: number) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
};

interface MessageProviderProps {
  children: React.ReactNode;
  theme: Theme;
}

export const MessageProvider: React.FC<MessageProviderProps> = ({ children, theme }) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const lastShownAtRef = useRef<Map<string, number>>(new Map());

  const showMessage = useCallback((content: string, type: MessageType = 'info', duration = 3000) => {
    const now = Date.now();
    const dedupeKey = `${type}:${content}`;
    const lastShownAt = lastShownAtRef.current.get(dedupeKey) ?? 0;
    if (now - lastShownAt < 1200) return;
    lastShownAtRef.current.set(dedupeKey, now);

    const id = Math.random().toString(36).substring(2, 9);
    setMessages((prev) => [...prev, { id, type, content, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
      }, duration);
    }
  }, []);

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const getIcon = (type: MessageType) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} className="text-emerald-500" />;
      case 'error': return <AlertCircle size={18} className="text-rose-500" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      default: return <Info size={18} className="text-blue-500" />;
    }
  };

  const contextValue = useMemo(() => ({ showMessage }), [showMessage]);

  return (
    <MessageContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl min-w-[240px] max-w-md ${
                theme === 'light'
                  ? 'bg-white border-slate-200 text-slate-700'
                  : 'bg-[#1C1C1E] border-white/10 text-slate-200'
              }`}
            >
              <div className="flex-shrink-0">
                {getIcon(msg.type)}
              </div>
              <div className="flex-1 text-[13px] font-medium leading-tight">
                {msg.content}
              </div>
              <button
                type="button"
                onClick={() => removeMessage(msg.id)}
                className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                  theme === 'light' ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-white/5 text-slate-500'
                }`}
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </MessageContext.Provider>
  );
};
