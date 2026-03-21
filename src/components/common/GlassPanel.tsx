import React from 'react';
import type { Theme } from '../../types';
import { glassPanel } from '../../utils/uiClasses';

interface Props {
  theme: Theme;
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const PAD_MAP = { sm: 'p-4', md: 'p-6', lg: 'p-8' };

export const GlassPanel: React.FC<Props> = ({ theme, children, className = '', padding = 'md' }) => (
  <div className={`${glassPanel(theme)} ${PAD_MAP[padding]} ${className}`}>
    {children}
  </div>
);
