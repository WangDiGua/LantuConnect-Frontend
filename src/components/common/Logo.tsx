import React, { useId, useSyncExternalStore } from 'react';
import type { Theme } from '../../types';
import {
  getColorSchemeServerSnapshot,
  getColorSchemeSnapshot,
  subscribeColorScheme,
} from '../../utils/systemColorScheme';
import { BrandEclipseMark, sanitizeBrandSvgId } from './BrandEclipseMark';

export const APP_BRAND_NAME = '鏅鸿兘浣撳崗鍚屽钩鍙?';

const SERIF_STACK = 'Georgia, "Times New Roman", Times, serif';

export interface LogoProps {
  followSystemColorScheme?: boolean;
  theme?: Theme;
  compact?: boolean;
  topBar?: boolean;
  fontSize?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  followSystemColorScheme = false,
  theme = 'light',
  compact = false,
  topBar = false,
  className = '',
}) => {
  const reactId = useId();
  const maskId = sanitizeBrandSvgId(reactId);
  const systemDark = useSyncExternalStore(
    subscribeColorScheme,
    getColorSchemeSnapshot,
    getColorSchemeServerSnapshot,
  );
  const isDark = followSystemColorScheme ? systemDark : theme === 'dark';

  const fillColor = isDark ? '#FFFFFF' : '#111827';
  const titleCls = isDark ? 'text-white' : 'text-gray-900';
  const subtitleCls = isDark ? 'text-gray-400' : 'text-gray-500';

  if (topBar) {
    return (
      <div
        className={`flex min-w-0 items-center gap-2.5 select-none ${className}`.trim()}
        title="Nexus"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
          <BrandEclipseMark className="h-full w-full" fillColor={fillColor} maskId={`${maskId}-tb`} />
        </div>
        <span
          className={`min-w-0 truncate text-xl font-semibold leading-none tracking-tight sm:text-2xl ${titleCls}`}
          style={{ fontFamily: SERIF_STACK }}
        >
          Nexus
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`.trim()} title={APP_BRAND_NAME}>
        <div className="h-8 w-8 flex-shrink-0">
          <BrandEclipseMark className="h-full w-full" fillColor={fillColor} maskId={`${maskId}-c`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`.trim()} title={APP_BRAND_NAME}>
      <div className="h-10 w-10 flex-shrink-0">
        <BrandEclipseMark className="h-full w-full" fillColor={fillColor} maskId={`${maskId}-f`} />
      </div>
      <div className="flex flex-col justify-center">
        <h1
          className={`text-[24px] font-semibold leading-none tracking-tight ${titleCls}`}
          style={{ fontFamily: SERIF_STACK }}
        >
          Nexus
        </h1>
        <p className={`mt-1 text-[12px] font-normal ${subtitleCls}`}>{APP_BRAND_NAME}</p>
      </div>
    </div>
  );
};
