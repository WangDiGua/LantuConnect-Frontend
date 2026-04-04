import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { MarketThemeProps } from '../../hooks/market/types';
import { PageTitleTagline } from '../common/PageTitleTagline';

interface MarketHeaderProps extends MarketThemeProps {
  icon: LucideIcon;
  title: string;
  tagline: string;
  iconColor?: string;
  chromePageTitle?: string;
  suffix?: React.ReactNode;
  actions?: React.ReactNode;
}

export const MarketHeader: React.FC<MarketHeaderProps> = ({
  theme,
  icon: Icon,
  title,
  tagline,
  iconColor,
  chromePageTitle,
  suffix,
  actions,
}) => {
  const isDark = theme === 'dark';
  const resolvedIconColor = iconColor ?? (isDark ? 'text-slate-300' : 'text-neutral-800');

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`shrink-0 rounded-xl p-2 ${isDark ? 'bg-neutral-900/10' : 'bg-neutral-100'}`}>
          <Icon size={22} className={resolvedIconColor} />
        </div>
        <PageTitleTagline
          subtitleOnly
          theme={theme}
          title={chromePageTitle || title}
          tagline={tagline}
          suffix={suffix}
        />
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
};
