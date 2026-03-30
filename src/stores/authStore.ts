import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { env } from '../config/env';
import { tokenStorage } from '../lib/security';
import type { UserInfo } from '../types/dto/auth';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  loginName: string | null;
  isAuthenticated: boolean;

  setTokens: (token: string, refreshToken: string) => void;
  setUser: (user: UserInfo) => void;
  login: (token: string, refreshToken: string, user: UserInfo, loginName?: string) => void;
  logout: () => void;
  updateUser: (partial: Partial<UserInfo>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: tokenStorage.get(env.VITE_TOKEN_KEY),
      refreshToken: tokenStorage.get(env.VITE_REFRESH_TOKEN_KEY),
      user: null,
      loginName: null,
      isAuthenticated: !!tokenStorage.get(env.VITE_TOKEN_KEY),

      setTokens: (token, refreshToken) => {
        tokenStorage.set(env.VITE_TOKEN_KEY, token);
        tokenStorage.set(env.VITE_REFRESH_TOKEN_KEY, refreshToken);
        set({ token, refreshToken, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      login: (token, refreshToken, user, loginName) => {
        tokenStorage.set(env.VITE_TOKEN_KEY, token);
        tokenStorage.set(env.VITE_REFRESH_TOKEN_KEY, refreshToken);
        set({ token, refreshToken, user, loginName: loginName ?? null, isAuthenticated: true });
      },

      logout: () => {
        tokenStorage.remove(env.VITE_TOKEN_KEY);
        tokenStorage.remove(env.VITE_REFRESH_TOKEN_KEY);
        set({ token: null, refreshToken: null, user: null, loginName: null, isAuthenticated: false });
      },

      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },
    }),
    {
      name: 'lantu-auth',
      partialize: (state) => ({ user: state.user, loginName: state.loginName }),
    },
  ),
);
