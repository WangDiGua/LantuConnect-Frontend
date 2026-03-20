import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Theme, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';

export type ActionFeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ActionFeedbackProps {
  /** 反馈类型 */
  type: ActionFeedbackType;
  /** 主题 */
  theme: Theme;
  /** 主题色 */
  themeColor?: ThemeColor;
  /** 是否显示 */
  visible: boolean;
  /** 消息内容 */
  message?: string;
  /** 持续时间（毫秒），0表示不自动关闭 */
  duration?: number;
  /** 关闭回调 */
  onClose?: () => void;
  /** 位置 */
  position?: 'top' | 'bottom' | 'center';
  /** 自定义类名 */
  className?: string;
}

/**
 * 操作反馈动画组件
 * 用于显示操作成功/失败的动画反馈
 */
export const ActionFeedback: React.FC<ActionFeedbackProps> = ({
  type,
  theme,
  themeColor = 'blue',
  visible,
  message,
  duration = 2000,
  onClose,
  position = 'center',
  className = '',
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];

  React.useEffect(() => {
    if (visible && duration > 0 && type !== 'loading') {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, type, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={24} className="text-emerald-500" />;
      case 'error':
        return <XCircle size={24} className="text-red-500" />;
      case 'warning':
        return <AlertCircle size={24} className="text-amber-500" />;
      case 'info':
        return <Info size={24} className={tc.text} />;
      case 'loading':
        return <Loader2 size={24} className={`${tc.text} animate-spin`} />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return isDark ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200';
      case 'error':
        return isDark ? 'bg-red-500/20 border-red-500/30' : 'bg-red-50 border-red-200';
      case 'warning':
        return isDark ? 'bg-amber-500/20 border-amber-500/30' : 'bg-amber-50 border-amber-200';
      case 'info':
        return isDark ? 'bg-blue-500/20 border-blue-500/30' : 'bg-blue-50 border-blue-200';
      case 'loading':
        return isDark ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200';
    }
  };

  const positionClasses = {
    top: 'top-4',
    bottom: 'bottom-4',
    center: 'top-1/2 -translate-y-1/2',
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? -20 : position === 'bottom' ? 20 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: position === 'top' ? -20 : position === 'bottom' ? 20 : 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={`fixed left-1/2 -translate-x-1/2 z-[150] ${positionClasses[position]} ${className}`}
        >
          <motion.div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${getBgColor()}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            >
              {getIcon()}
            </motion.div>
            {message && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className={`text-sm font-medium ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {message}
              </motion.p>
            )}
            {onClose && type !== 'loading' && (
              <button
                type="button"
                onClick={onClose}
                className={`ml-2 p-1 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
                }`}
              >
                <XCircle size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
