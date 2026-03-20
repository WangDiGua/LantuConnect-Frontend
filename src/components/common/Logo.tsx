import React from 'react';
import { ThemeColor, FontSize, Theme } from '../../types';

interface LogoProps {
  themeColor?: ThemeColor;
  fontSize?: FontSize;
  compact?: boolean;
  theme?: Theme;
}

export const Logo: React.FC<LogoProps> = ({
  fontSize = 'medium',
  compact = false,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const lantuColor = isDark ? '#F1F5F9' : '#0F172A';
  const connectColor = isDark ? '#60A5FA' : '#2563EB';

  const textSizeClass = compact
    ? 'text-base'
    : fontSize === 'small'
      ? 'text-lg'
      : fontSize === 'large'
        ? 'text-2xl'
        : 'text-xl';

  return (
    <span
      className={`inline-flex items-center select-none font-extrabold tracking-tight ${textSizeClass}`}
      title="LantuConnect"
    >
      <span style={{ color: lantuColor }}>Lantu</span>
      <span style={{ color: connectColor }}>Connect</span>
    </span>
  );
};
