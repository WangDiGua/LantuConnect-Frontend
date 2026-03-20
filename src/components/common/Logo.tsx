import React from 'react';
import { ThemeColor, FontSize, Theme } from '../../types';

interface LogoProps {
  themeColor?: ThemeColor;
  fontSize?: FontSize;
  compact?: boolean;
  theme?: Theme;
}

/**
 * LantuConnect 横版字标 (Wordmark)
 * 适用于导航栏、官网头部等场景
 */
export const LantuConnectWordmark: React.FC<{ className?: string; theme?: Theme }> = ({ 
  className = 'w-full max-w-md',
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  const lantuColor = isDark ? '#F1F5F9' : '#0F172A';
  const connectColor = isDark ? '#60A5FA' : '#2563EB';
  const sparkColor = isDark ? '#7DD3FC' : '#38BDF8';
  
  return (
    <svg viewBox="0 0 380 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* 利用遮罩在字体上"剪"出闪电/连接形状 */}
        <mask id="zap-mask">
          <rect width="100%" height="100%" fill="white" />
          {/* 负空间：一枚闪电箭头 */}
          <path d="M 160 25 L 140 60 L 152 60 L 145 85 L 175 45 L 160 45 Z" fill="black" />
        </mask>
      </defs>
      
      <g mask="url(#zap-mask)">
        {/* 极致粗体，紧凑排版 */}
        <text 
          x="10" 
          y="70" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontSize="56" 
          fontWeight="900" 
          fill={lantuColor}
          letterSpacing="-2.5"
        >
          Lantu
        </text>
        {/* Connect 字母紧紧贴靠 */}
        <text 
          x="162" 
          y="70" 
          fontFamily="system-ui, -apple-system, sans-serif" 
          fontSize="56" 
          fontWeight="900" 
          fill={connectColor}
          letterSpacing="-2.5"
        >
          Connect
        </text>
      </g>
      
      {/* 负形内部点缀亮色电火花核心 */}
      <path 
        d="M 160 25 L 140 60 L 152 60 L 145 85 L 175 45 L 160 45 Z" 
        fill={sparkColor}
        transform="scale(0.3) translate(350, 110)" 
      />
    </svg>
  );
};

/**
 * 紧凑版Logo（用于侧边栏等小空间）
 */
const CompactLogo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    className="shrink-0"
  >
    <rect width="48" height="48" rx="13" fill="url(#logo-bg)" />
    {/* 闪电图标 */}
    <path
      d="M 24 12 L 18 28 L 22 28 L 20 36 L 28 20 L 24 20 Z"
      fill="white"
      fillOpacity="0.92"
    />
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
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const lantuColor = isDark ? '#F1F5F9' : '#0F172A';
  const connectColor = isDark ? '#60A5FA' : '#2563EB';
  
  // 根据fontSize和compact调整文字大小
  const textSizeClass = compact 
    ? 'text-lg' 
    : fontSize === 'small' 
      ? 'text-xl' 
      : fontSize === 'large' 
        ? 'text-3xl' 
        : 'text-2xl';

  if (compact) {
    return (
      <span
        className={`inline-flex items-center select-none font-bold tracking-tight ${textSizeClass}`}
        title="LantuConnect"
      >
        <span style={{ color: lantuColor }}>Lantu</span>
        <span style={{ color: connectColor }} className="ml-0.5">Connect</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 select-none font-bold tracking-tight ${textSizeClass}`}
      title="LantuConnect"
    >
      <span style={{ color: lantuColor }}>Lantu</span>
      <span style={{ color: connectColor }}>Connect</span>
    </span>
  );
};
