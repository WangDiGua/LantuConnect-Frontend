import React, { createContext, useContext } from 'react';

export interface LayoutChromeValue {
  /** 是否存在次级侧栏（Agent/监控/系统配置/用户管理/模型服务） */
  hasSecondarySidebar: boolean;
}

const defaultValue: LayoutChromeValue = {
  hasSecondarySidebar: false,
};

const LayoutChromeContext = createContext<LayoutChromeValue>(defaultValue);

export const LayoutChromeProvider: React.FC<{ value: LayoutChromeValue; children: React.ReactNode }> = ({
  value,
  children,
}) => <LayoutChromeContext.Provider value={value}>{children}</LayoutChromeContext.Provider>;

export function useLayoutChrome(): LayoutChromeValue {
  return useContext(LayoutChromeContext);
}
