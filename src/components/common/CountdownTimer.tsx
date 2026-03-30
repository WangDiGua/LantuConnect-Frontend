import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Theme, ThemeColor } from '../../types';
import { THEME_COLOR_CLASSES } from '../../constants/theme';

export interface CountdownTimerProps {
  /** 倒计时秒数 */
  seconds: number;
  /** 主题 */
  theme: Theme;
  /** 主题色 */
  themeColor?: ThemeColor;
  /** 倒计时结束回调 */
  onComplete: () => void;
  /** 取消回调 */
  onCancel?: () => void;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 是否显示 */
  visible: boolean;
}

/**
 * 倒计时确认组件
 * 用于危险操作前的倒计时确认
 */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  seconds,
  theme,
  themeColor = 'red',
  onComplete,
  onCancel,
  title = '确认执行此操作？',
  description = '此操作不可撤销，请谨慎操作',
  confirmText = '确认',
  cancelText = '取消',
  visible,
}) => {
  const isDark = theme === 'dark';
  const tc = THEME_COLOR_CLASSES[themeColor];
  const [remaining, setRemaining] = useState(seconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!visible) {
      setRemaining(seconds);
      setIsActive(false);
      return;
    }

    setIsActive(true);
    setRemaining(seconds);

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsActive(false);
          setTimeout(() => {
            onComplete();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, seconds, onComplete]);

  const handleCancel = useCallback(() => {
    setIsActive(false);
    setRemaining(seconds);
    onCancel?.();
  }, [onCancel, seconds]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* 对话框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative rounded-[24px] border p-6 max-w-md w-full shadow-2xl ${
              isDark ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-200/80'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 图标 */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${tc.bg} bg-opacity-10`}>
                <AlertTriangle size={24} className={tc.text} />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {title}
                </h3>
              </div>
            </div>

            {/* 描述 */}
            {description && (
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {description}
              </p>
            )}

            {/* 倒计时显示 */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <motion.div
                  key={remaining}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={`text-5xl font-bold ${tc.text}`}
                >
                  {remaining}
                </motion.div>
                <div
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  秒后自动执行
                </div>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mb-6">
              <div
                className={`w-full h-1 rounded-full overflow-hidden ${
                  isDark ? 'bg-white/10' : 'bg-slate-200'
                }`}
              >
                <motion.div
                  className={`h-full ${tc.bg}`}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: seconds, ease: 'linear' }}
                />
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  isDark
                    ? 'bg-white/10 text-slate-300 hover:bg-white/15'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onComplete}
                className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white ${tc.bg} shadow-lg ${tc.shadow} hover:opacity-90 transition-opacity`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
