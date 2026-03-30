import React, { useId, useSyncExternalStore } from 'react';
import type { Theme } from '../../types';
import {
  getColorSchemeServerSnapshot,
  getColorSchemeSnapshot,
  subscribeColorScheme,
} from '../../utils/systemColorScheme';

export const APP_BRAND_NAME = '智能体协同平台';

const SERIF_STACK = 'Georgia, "Times New Roman", Times, serif';

/** 方案十七：交叠视界 — Mask 镂空双圆交叠 */
function EclipseMark({
  className,
  fillColor,
  maskId,
}: {
  className?: string;
  fillColor: string;
  maskId: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <mask id={maskId}>
          <rect width="32" height="32" fill="white" />
          <path
            d="M16 8.66 C18.5 11 18.5 21 16 23.34 C13.5 21 13.5 11 16 8.66 Z"
            fill="black"
          />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <circle cx="12" cy="16" r="10" fill={fillColor} />
        <circle cx="20" cy="16" r="10" fill={fillColor} fillOpacity="0.3" />
      </g>
    </svg>
  );
}

function sanitizeSvgId(raw: string): string {
  return `eclipse-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export interface LogoProps {
  /**
   * 默认 false：与 `theme` 一致（与父级应用亮暗对齐）。
   * 仅在明确需要时再跟随系统 `prefers-color-scheme`。
   */
  followSystemColorScheme?: boolean;
  theme?: Theme;
  compact?: boolean;
  /** @deprecated 保留兼容，忽略 */
  fontSize?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  followSystemColorScheme = false,
  theme = 'light',
  compact = false,
  className = '',
}) => {
  const reactId = useId();
  const maskId = sanitizeSvgId(reactId);
  const systemDark = useSyncExternalStore(
    subscribeColorScheme,
    getColorSchemeSnapshot,
    getColorSchemeServerSnapshot,
  );
  const isDark = followSystemColorScheme ? systemDark : theme === 'dark';

  const fillColor = isDark ? '#FFFFFF' : '#111827';
  const titleCls = isDark ? 'text-white' : 'text-gray-900';
  const subtitleCls = isDark ? 'text-gray-400' : 'text-gray-500';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`.trim()} title={APP_BRAND_NAME}>
        <div className="w-8 h-8 flex-shrink-0">
          <EclipseMark className="w-full h-full" fillColor={fillColor} maskId={`${maskId}-c`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`.trim()} title={APP_BRAND_NAME}>
      <div className="w-10 h-10 flex-shrink-0">
        <EclipseMark className="w-full h-full" fillColor={fillColor} maskId={`${maskId}-f`} />
      </div>
      <div className="flex flex-col justify-center">
        <h1
          className={`text-[24px] font-semibold tracking-tight leading-none ${titleCls}`}
          style={{ fontFamily: SERIF_STACK }}
        >
          Nexus
        </h1>
        <p className={`text-[12px] font-normal mt-1 ${subtitleCls}`}>{APP_BRAND_NAME}</p>
      </div>
    </div>
  );
};
