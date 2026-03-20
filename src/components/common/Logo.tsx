import React from 'react';
import { ThemeColor, FontSize } from '../../types';

interface LogoProps {
  themeColor?: ThemeColor;
  fontSize?: FontSize;
  compact?: boolean;
}

const LOGO_TEXT_CLASSES: Record<FontSize, string> = {
  small: 'text-[15px]',
  medium: 'text-[17px]',
  large: 'text-[20px]',
};

const ICON_SIZES: Record<FontSize, number> = {
  small: 24,
  medium: 28,
  large: 32,
};

const LogoIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className="shrink-0"
  >
    <rect width="48" height="48" rx="13" fill="url(#logo-bg)" />
    {/* Two connected nodes representing "Connect" */}
    <circle cx="18" cy="19" r="5.5" fill="white" fillOpacity="0.92" />
    <circle cx="30" cy="29" r="5.5" fill="white" fillOpacity="0.75" />
    {/* Connection line */}
    <line
      x1="22.5"
      y1="22.5"
      x2="26"
      y2="25.5"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.8"
    />
    {/* Spark accents */}
    <circle cx="33" cy="16" r="2" fill="white" fillOpacity="0.35" />
    <circle cx="15" cy="33" r="1.5" fill="white" fillOpacity="0.25" />
    <defs>
      <linearGradient id="logo-bg" x1="0" y1="0" x2="48" y2="48">
        <stop stopColor="#4F46E5" />
        <stop offset="0.45" stopColor="#6366F1" />
        <stop offset="1" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
  </svg>
);

export const Logo: React.FC<LogoProps> = ({
  fontSize = 'medium',
  compact = false,
}) => {
  const textClass = compact ? 'text-sm' : LOGO_TEXT_CLASSES[fontSize];
  const iconSize = compact ? 22 : ICON_SIZES[fontSize];

  return (
    <span
      className="inline-flex items-center gap-2 select-none"
      title="LantuConnect"
    >
      <LogoIcon size={iconSize} />
      <span className={`font-bold tracking-tight truncate leading-tight ${textClass}`}>
        <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 bg-clip-text text-transparent">
          Lantu
        </span>
        <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
          Connect
        </span>
      </span>
    </span>
  );
};
