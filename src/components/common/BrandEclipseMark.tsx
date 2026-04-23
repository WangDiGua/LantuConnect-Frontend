import React from 'react';

export function sanitizeBrandSvgId(raw: string): string {
  return `eclipse-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export interface BrandEclipseMarkProps {
  className?: string;
  fillColor: string;
  maskId: string;
  leftOpacity?: number;
  rightOpacity?: number;
  leftClassName?: string;
  rightClassName?: string;
  groupClassName?: string;
}

export const BrandEclipseMark: React.FC<BrandEclipseMarkProps> = ({
  className,
  fillColor,
  maskId,
  leftOpacity = 1,
  rightOpacity = 0.3,
  leftClassName,
  rightClassName,
  groupClassName,
}) => (
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
    <g mask={`url(#${maskId})`} className={groupClassName}>
      <circle
        cx="12"
        cy="16"
        r="10"
        fill={fillColor}
        opacity={leftOpacity}
        className={leftClassName}
      />
      <circle
        cx="20"
        cy="16"
        r="10"
        fill={fillColor}
        opacity={rightOpacity}
        className={rightClassName}
      />
    </g>
  </svg>
);
