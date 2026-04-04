import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldAlert } from 'lucide-react';

/**
 * 401 会话失效 / 未授权页：与站点首页卡片风格一致的左右分栏 + 终端动效
 */
export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeLines, setActiveLines] = useState(0);

  useEffect(() => {
    const delays = [400, 1200, 2000, 2500];
    const ids = delays.map((delay, i) =>
      window.setTimeout(() => setActiveLines(i + 1), delay),
    );
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] dark:bg-lantu-canvas p-4 sm:p-8 font-sans">
      <div className="w-full max-w-5xl bg-white dark:bg-lantu-card rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)] border border-gray-100 dark:border-white/10 flex flex-col md:flex-row overflow-hidden transform transition-all duration-500 hover:shadow-[0_12px_60px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_12px_60px_rgba(0,0,0,0.45)]">
        <div className="md:w-1/2 bg-[#09090b] relative p-8 md:p-12 flex flex-col justify-center min-h-[320px] md:min-h-[500px] overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09090b] via-transparent to-[#09090b] opacity-80" />

          <div className="relative z-10 w-full max-w-md mx-auto bg-[#111111] rounded-xl border border-white/10 shadow-2xl overflow-hidden transform transition-all duration-700 animate-fade-in-up-unauth">
            <div className="h-10 bg-white/5 flex items-center px-4 border-b border-white/10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="mx-auto text-xs text-gray-500 font-mono">nexus-auth.sh</div>
            </div>

            <div className="p-5 font-mono text-sm leading-relaxed text-gray-400">
              <div className={`transition-opacity duration-300 ${activeLines >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-green-400">nexus@system</span>:
                <span className="text-blue-400">~</span>$ ./verify_token.sh
              </div>

              <div className={`mt-2 transition-opacity duration-300 ${activeLines >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-gray-500">&gt; Validating current session...</span>
              </div>

              <div className={`mt-2 transition-opacity duration-300 ${activeLines >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-red-400 font-semibold">[Error] 401 Unauthorized</span>
                <br />
                <span className="text-red-400/80">✖ Signature expired or invalid.</span>
              </div>

              <div
                className={`mt-2 transition-opacity duration-300 flex items-center gap-2 ${activeLines >= 4 ? 'opacity-100' : 'opacity-0'}`}
              >
                <span className="text-yellow-400">&gt; Action required: Re-login</span>
                <span className="w-2 h-4 bg-gray-400 animate-pulse inline-block" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
        </div>

        <div className="md:w-1/2 p-10 md:p-16 flex flex-col justify-center bg-white dark:bg-lantu-card relative">
          <div className="animate-fade-in-right-unauth">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20 text-sm font-medium mb-6">
              <ShieldAlert size={16} />
              <span>401 Unauthorized</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-slate-100 mb-4 tracking-tight">登录已失效</h1>

            <p className="text-base text-gray-500 dark:text-slate-400 leading-relaxed mb-10 max-w-md">
              抱歉，您当前的登录状态已过期，或者您没有权限访问该页面。
              <br />
              请重新登录 Nexus 平台以继续进行您的开发与发布工作。
            </p>

            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-neutral-900 font-medium hover:bg-gray-800 dark:hover:bg-neutral-200 transition-colors duration-200 w-fit"
              >
                重新登录
                <LogIn size={18} />
              </button>
            </div>

            <div className="mt-12 pt-6 border-t border-gray-100 dark:border-white/10">
              <p className="text-sm text-gray-400 dark:text-slate-500">如果反复出现此问题，请检查网络环境或联系平台管理员。</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUpUnauth {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInRightUnauth {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-up-unauth {
          animation: fadeInUpUnauth 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-right-unauth {
          animation: fadeInRightUnauth 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
