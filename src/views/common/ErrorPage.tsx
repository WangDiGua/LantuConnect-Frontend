import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, RefreshCw, ShieldX, ServerCrash, Ban, Lock, WifiOff } from 'lucide-react';

interface Props {
  code?: number;
  title?: string;
  message?: string;
}

const ERROR_CONFIG: Record<number, { icon: React.ElementType; title: string; message: string }> = {
  400: { icon: Ban, title: '请求无效', message: '服务器无法处理您的请求，请检查参数后重试。' },
  403: { icon: Lock, title: '无访问权限', message: '您没有权限访问此页面，请联系管理员。' },
  404: { icon: ShieldX, title: '页面未找到', message: '您访问的页面不存在或已被移除。' },
  500: { icon: ServerCrash, title: '服务器错误', message: '服务器内部异常，我们正在紧急修复，请稍后重试。' },
  503: { icon: WifiOff, title: '服务不可用', message: '服务正在维护或暂时不可用，请稍后再试。' },
};

export const ErrorPage: React.FC<Props> = ({ code = 500, title, message }) => {
  const navigate = useNavigate();
  const cfg = ERROR_CONFIG[code] || ERROR_CONFIG[500];
  const Icon = cfg.icon;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#000000] text-white' : 'bg-[#F2F2F7] text-slate-900'}`}>
      <div className="text-center px-6 max-w-lg">
        <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm border border-slate-200/60'}`}>
          <Icon size={36} className={code >= 500 ? 'text-red-500' : code === 403 ? 'text-amber-500' : 'text-slate-400'} />
        </div>

        <p className={`text-7xl font-black mb-3 tracking-tight ${isDark ? 'text-white/10' : 'text-slate-200'}`}>
          {code}
        </p>

        <h1 className="text-xl font-bold mb-2">{title || cfg.title}</h1>

        <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {message || cfg.message}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
              isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-white'
            }`}
          >
            <RefreshCw size={15} />
            刷新页面
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Home size={15} />
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
};
