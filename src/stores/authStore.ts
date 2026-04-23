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
  remember: boolean;

  setTokens: (token: string, refreshToken: string) => void;
  setUser: (user: UserInfo) => void;
  login: (token: string, refreshToken: string, user: UserInfo, loginName?: string, remember?: boolean) => void;
  setRememberPersistence: (remember: boolean) => void;
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
      remember: tokenStorage.isPersistent(env.VITE_REFRESH_TOKEN_KEY),

      setTokens: (token, refreshToken) => {
        const persistTokens = tokenStorage.isPersistent(env.VITE_REFRESH_TOKEN_KEY);
        tokenStorage.set(env.VITE_TOKEN_KEY, token, { persist: persistTokens });
        tokenStorage.set(env.VITE_REFRESH_TOKEN_KEY, refreshToken, { persist: persistTokens });
        set({ token, refreshToken, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      login: (token, refreshToken, user, loginName, remember = true) => {
        tokenStorage.set(env.VITE_TOKEN_KEY, token, { persist: remember });
        tokenStorage.set(env.VITE_REFRESH_TOKEN_KEY, refreshToken, { persist: remember });
        set({ token, refreshToken, user, loginName: loginName ?? null, isAuthenticated: true, remember });
      },

      setRememberPersistence: (remember) => {
        const { token, refreshToken } = get();
        if (token) tokenStorage.set(env.VITE_TOKEN_KEY, token, { persist: remember });
        if (refreshToken) tokenStorage.set(env.VITE_REFRESH_TOKEN_KEY, refreshToken, { persist: remember });
        set({ remember });
      },

      logout: () => {
        tokenStorage.remove(env.VITE_TOKEN_KEY);
        tokenStorage.remove(env.VITE_REFRESH_TOKEN_KEY);
        set({ token: null, refreshToken: null, user: null, loginName: null, isAuthenticated: false, remember: false });
      },

      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },
    }),
    {
      name: 'lantu-auth',
      partialize: (state) => (
        state.remember
          ? { user: state.user, loginName: state.loginName, remember: state.remember }
          : { remember: false }
      ),
    },
  ),
);
