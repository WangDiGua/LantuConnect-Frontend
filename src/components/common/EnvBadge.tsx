import React, { useState } from 'react';
import { env, isDev, isProd, isMock } from '../../config/env';

const ENV_LABELS: Record<string, { label: string; color: string }> = {
  development: { label: 'DEV', color: 'bg-amber-500' },
  staging: { label: 'STG', color: 'bg-blue-500' },
  production: { label: 'PROD', color: 'bg-emerald-500' },
};

export const EnvBadge: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  if (isProd) return null;

  const { label, color } = ENV_LABELS[env.VITE_APP_ENV] ?? ENV_LABELS.development;

  return (
    <div className="fixed bottom-3 right-3 z-[9998] select-none">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`${color} text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg hover:opacity-90 transition-all cursor-pointer`}
      >
        {label}
        {isMock && <span className="ml-1 opacity-80">MOCK</span>}
      </button>

      {expanded && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-3 text-xs text-slate-600 space-y-1.5">
          <div className="font-semibold text-slate-800 mb-2">环境信息</div>
          <div className="flex justify-between">
            <span className="text-slate-500">环境</span>
            <span className="font-medium">{env.VITE_APP_ENV}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Mock 模式</span>
            <span className={`font-medium ${isMock ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isMock ? '开启' : '关闭'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">API 地址</span>
            <span className="font-mono font-medium truncate max-w-[120px]" title={env.VITE_API_BASE_URL}>
              {env.VITE_API_BASE_URL}
            </span>
          </div>
          {isDev && (
            <div className="flex justify-between">
              <span className="text-slate-500">Mock 延迟</span>
              <span className="font-medium">{env.VITE_MOCK_DELAY_MS}ms</span>
            </div>
          )}
          <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
            此标记仅在非生产环境显示
          </div>
        </div>
      )}
    </div>
  );
};
