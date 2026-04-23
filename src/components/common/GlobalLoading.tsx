import React, { useId } from 'react';
import type { Theme } from '../../types';
import { BrandEclipseMark, sanitizeBrandSvgId } from './BrandEclipseMark';
import {
  buildGlobalLoadingPalette,
  GLOBAL_LOADING_SWEEP_RINGS,
} from './globalLoadingModel';

interface GlobalLoadingProps {
  theme?: Theme;
  label?: string;
  fullscreen?: boolean;
}

export const GlobalLoading: React.FC<GlobalLoadingProps> = ({
  theme = 'light',
  label = '页面加载中',
  fullscreen = false,
}) => {
  const rawId = useId();
  const maskId = `${sanitizeBrandSvgId(rawId)}-loader`;
  const palette = buildGlobalLoadingPalette(theme);
  const shellClassName = fullscreen
    ? 'fixed inset-0 z-[120] min-h-screen'
    : 'min-h-[46vh] rounded-[32px] border border-black/5 shadow-[var(--shadow-card)] dark:border-white/[0.06]';

  const sweepStyle = (duration: number, delay: number) => ({
    ['--nexus-loader-duration' as string]: `${duration}s`,
    ['--nexus-loader-delay' as string]: `${delay}s`,
  }) as React.CSSProperties;

  return (
    <div
      className={`relative isolate flex w-full items-center justify-center overflow-hidden ${shellClassName}`}
      style={{ backgroundColor: palette.surface }}
      aria-busy="true"
      aria-live="polite"
      role="status"
      aria-label={label || '加载中'}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            `radial-gradient(circle at 50% 48%, ${palette.spotlight} 0%, transparent 18%)`,
            `radial-gradient(circle at 50% 50%, ${palette.halo} 0%, transparent 42%)`,
            'linear-gradient(180deg, rgba(255,255,255,0.02), transparent 32%)',
          ].join(', '),
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: `linear-gradient(${palette.grid} 1px, transparent 1px), linear-gradient(90deg, ${palette.grid} 1px, transparent 1px)`,
          backgroundSize: '34px 34px',
          WebkitMaskImage: 'radial-gradient(circle at center, black 0%, black 12%, transparent 72%)',
          maskImage: 'radial-gradient(circle at center, black 0%, black 12%, transparent 72%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: palette.halo }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center gap-4 px-6">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
          >
            <circle cx="60" cy="60" r="18" fill="none" stroke={palette.line} strokeWidth="1" opacity="0.55" />
            {GLOBAL_LOADING_SWEEP_RINGS.map((ring, index) => (
              <g
                key={ring.id}
                transform={`rotate(${ring.rotate} 60 60)`}
                className="nexus-loader-shell"
              >
                <circle
                  cx="60"
                  cy="60"
                  r={ring.radius}
                  fill="none"
                  stroke={index === 0 ? palette.orbitAccent : palette.orbit}
                  strokeWidth={ring.strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={ring.dashArray}
                  opacity={ring.opacity}
                  className={`nexus-loader-orbit ${ring.reverse ? 'nexus-loader-orbit-reverse' : ''}`}
                  style={sweepStyle(ring.duration, ring.delay)}
                />
              </g>
            ))}
          </svg>

          <div className="relative flex h-16 w-16 items-center justify-center nexus-loader-mark">
            <BrandEclipseMark
              className="h-full w-full"
              fillColor={palette.core}
              maskId={maskId}
              leftOpacity={1}
              rightOpacity={0.34}
              leftClassName="nexus-loader-eclipse-left"
              rightClassName="nexus-loader-eclipse-right"
            />
            <span
              className="absolute inset-y-[18%] left-1/2 w-px -translate-x-1/2 rounded-full nexus-loader-spine"
              style={{
                background: `linear-gradient(180deg, transparent, ${palette.orbitAccent}, transparent)`,
                boxShadow: `0 0 14px ${palette.halo}`,
              }}
              aria-hidden
            />
            <span
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full nexus-loader-spark"
              style={{ backgroundColor: palette.orbitAccent }}
              aria-hidden
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div
            className="h-px w-16 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${palette.line}, transparent)` }}
            aria-hidden
          />
          {label ? (
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full nexus-loader-indicator"
                style={{ backgroundColor: palette.orbitAccent }}
                aria-hidden
              />
              <span
                className="text-xs font-medium tracking-[0.08em]"
                style={{ color: palette.label, fontFamily: 'var(--font-outfit)' }}
              >
                {label}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
