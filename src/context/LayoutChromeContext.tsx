import React, { createContext, useContext } from 'react';

export interface LayoutChromeValue {
  /** 是否存在次级侧栏（当前一级菜单下存在可导航子项） */
  hasSecondarySidebar: boolean;
  /** 与 MainLayout 顶栏 h2 一致的当前页标题，供正文 sr-only h1 对齐 */
  chromePageTitle: string;
}

const defaultValue: LayoutChromeValue = {
  hasSecondarySidebar: false,
  chromePageTitle: '',
};

const LayoutChromeContext = createContext<LayoutChromeValue>(defaultValue);

export const LayoutChromeProvider: React.FC<{ value: LayoutChromeValue; children: React.ReactNode }> = ({
  value,
  children,
}) => <LayoutChromeContext.Provider value={value}>{children}</LayoutChromeContext.Provider>;

export function useLayoutChrome(): LayoutChromeValue {
  return useContext(LayoutChromeContext);
}
