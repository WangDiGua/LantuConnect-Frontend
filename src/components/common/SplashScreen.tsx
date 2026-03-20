import React from 'react';

export const SplashScreen: React.FC = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
    {/* Brand mark */}
    <div className="relative mb-6">
      <svg width="56" height="56" viewBox="0 0 48 48" fill="none" className="animate-pulse">
        <rect width="48" height="48" rx="14" fill="url(#splash-bg)" />
        <path
          d="M16 18a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6Z"
          fill="white"
          fillOpacity="0.9"
        />
        <path
          d="M20 24a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6v-6Z"
          fill="white"
          fillOpacity="0.7"
        />
        <path
          d="M22 18c0-1 .5-2 1.5-2.5M26 24c0-1 .5-2 1.5-2.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <defs>
          <linearGradient id="splash-bg" x1="0" y1="0" x2="48" y2="48">
            <stop stopColor="#4F46E5" />
            <stop offset="0.5" stopColor="#6366F1" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    {/* Brand text */}
    <h1 className="text-xl font-bold tracking-tight mb-1.5">
      <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 bg-clip-text text-transparent">
        LantuConnect
      </span>
    </h1>
    <p className="text-xs text-slate-400 mb-8">企业级 AI 智能体平台</p>

    {/* Loading indicator */}
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-indigo-500/70"
          style={{
            animation: `splashBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>

    <style>{`
      @keyframes splashBounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  </div>
);
