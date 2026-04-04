import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, RefreshCw, ShieldX, ServerCrash, Ban, Lock, WifiOff, LogIn } from 'lucide-react';
import { GlassPanel } from '../../components/common/GlassPanel';
import { btnPrimary, btnSecondary } from '../../utils/uiClasses';
import type { Theme } from '../../types';

interface Props {
  code?: number;
  title?: string;
  message?: string;
  /** Primary CTA (defaults to 返回首页 → /) */
  primaryAction?: { label: string; to: string };
}

const ERROR_CONFIG: Record<number, { icon: React.ElementType; title: string; message: string }> = {
  400: { icon: Ban, title: '请求无效', message: '服务器无法处理您的请求，请检查参数后重试。' },
  401: { icon: LogIn, title: '需要登录', message: '登录状态已失效或无权访问，请重新登录后继续。' },
  403: { icon: Lock, title: '无访问权限', message: '您没有权限访问此页面，请联系管理员。' },
  404: { icon: ShieldX, title: '页面未找到', message: '您访问的页面不存在或已被移除。' },
  500: { icon: ServerCrash, title: '服务器错误', message: '服务器内部异常，我们正在紧急修复，请稍后重试。' },
  503: { icon: WifiOff, title: '服务不可用', message: '服务正在维护或暂时不可用，请稍后再试。' },
};

export const ErrorPage: React.FC<Props> = ({ code = 500, title, message, primaryAction }) => {
  const navigate = useNavigate();
  const cfg = ERROR_CONFIG[code] || ERROR_CONFIG[500];
  const Icon = cfg.icon;
  const primary = primaryAction ?? { label: '返回首页', to: '/' };
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const theme: Theme = isDark ? 'dark' : 'light';

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 bg-gradient-to-br ${
      isDark
        ? 'from-lantu-canvas via-lantu-subtle to-neutral-950/30'
        : 'from-slate-100 via-[#e8eef5] to-neutral-50'
    }`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <GlassPanel theme={theme} padding="lg" className="text-center max-w-lg">
          <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${
            isDark ? 'bg-white/[0.06]' : 'bg-white shadow-sm border border-slate-200/40'
          }`}>
            <Icon
              size={36}
              className={
                code >= 500 ? 'text-rose-500' : code === 403 || code === 401 ? 'text-amber-500' : 'text-slate-400'
              }
            />
          </div>

          <p className={`text-8xl font-black tracking-tighter mb-4 bg-gradient-to-b bg-clip-text text-transparent ${
            isDark
              ? 'from-white/20 to-white/[0.04]'
              : 'from-slate-300 to-slate-100'
          }`}>
            {code}
          </p>

          <h1 className={`text-xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {title || cfg.title}
          </h1>

          <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {message || cfg.message}
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className={btnSecondary(theme)}
            >
              <RefreshCw size={15} />
              刷新页面
            </button>
            <button
              type="button"
              onClick={() => navigate(primary.to)}
              className={btnPrimary}
            >
              {primary.to === '/login' ? <LogIn size={15} /> : <Home size={15} />}
              {primary.label}
            </button>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
};
