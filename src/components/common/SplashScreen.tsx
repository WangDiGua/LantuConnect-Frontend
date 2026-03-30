import React from 'react';

import { APP_BRAND_NAME } from './Logo';

export const SplashScreen: React.FC = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
    {/* Brand mark — 交叠视界 */}
    <div className="relative mb-6 w-14 h-14 animate-pulse">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        aria-hidden
      >
        <defs>
          <mask id="splash-eclipse-mask">
            <rect width="32" height="32" fill="white" />
            <path
              d="M16 8.66 C18.5 11 18.5 21 16 23.34 C13.5 21 13.5 11 16 8.66 Z"
              fill="black"
            />
          </mask>
        </defs>
        <g mask="url(#splash-eclipse-mask)">
          <circle cx="12" cy="16" r="10" fill="#111827" />
          <circle cx="20" cy="16" r="10" fill="#111827" fillOpacity="0.3" />
        </g>
      </svg>
    </div>

    <h1
      className="mb-1.5 text-2xl font-semibold tracking-tight text-gray-900"
      style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
    >
      Nexus
    </h1>
    <p className="mb-8 text-xs text-slate-400">{APP_BRAND_NAME}</p>

    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-slate-400/70"
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
