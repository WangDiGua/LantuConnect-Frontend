import React from 'react';
import { ThemeColor, FontSize } from '../../types';

interface LogoProps {
  themeColor: ThemeColor;
  fontSize?: FontSize;
  /** 紧凑显示（如移动端顶栏） */
  compact?: boolean;
}

const LOGO_TEXT_CLASSES: Record<FontSize, string> = {
  small: 'text-lg',
  medium: 'text-xl',
  large: 'text-2xl',
};

export const Logo: React.FC<LogoProps> = ({
  fontSize = 'medium',
  compact = false,
}) => {
  const textClass = compact ? 'text-base' : LOGO_TEXT_CLASSES[fontSize];

  return (
    <span
      className={`font-bold tracking-tight truncate select-none ${textClass}`}
      title="LantuConnect"
    >
      <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
        Lantu
      </span>
      <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 bg-clip-text text-transparent">
        Connect
      </span>
    </span>
  );
};
