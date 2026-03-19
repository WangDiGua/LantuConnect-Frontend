import React from 'react';

export type Theme = 'light' | 'dark';
export type ThemeColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink';
export type FontSize = 'small' | 'medium' | 'large';
export type FontFamily = 'sans' | 'space' | 'serif' | 'mono' | 'outfit' | 'garamond' | 'anton';
export type AnimationStyle = 'fade' | 'slide' | 'zoom' | 'skew' | 'flip' | 'rotate';

export interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  theme: Theme;
  themeColor: ThemeColor;
}

export interface SidebarGroupProps {
  title: string;
  children: React.ReactNode;
  theme: Theme;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  tags: string[];
  isNew?: boolean;
  isHot?: boolean;
  mcp?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  category: string;
  capabilities: string[];
}
