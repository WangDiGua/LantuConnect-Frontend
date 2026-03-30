import { create } from 'zustand';

interface AppState {
  globalLoading: boolean;
  sidebarCollapsed: boolean;

  setGlobalLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  globalLoading: false,
  sidebarCollapsed: false,

  setGlobalLoading: (loading) => set({ globalLoading: loading }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
