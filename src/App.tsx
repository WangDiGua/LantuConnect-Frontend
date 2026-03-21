import React, { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthGuard } from './router/guards/AuthGuard';
import { GuestGuard } from './router/guards/GuestGuard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { EnvBadge } from './components/common/EnvBadge';
import { MessageProvider } from './components/common/Message';
import { bindAuthCallbacks } from './lib/http';
import { useAuthStore } from './stores/authStore';
import { tokenStorage } from './lib/security';
import { env } from './config/env';
import { readAppearanceState } from './utils/appearanceState';
import type { Theme } from './types';

const MainLayout = lazy(() => import('./layouts/MainLayout').then(m => ({ default: m.MainLayout })));
const LoginPage = lazy(() => import('./views/login/LoginPage').then(m => ({ default: m.LoginPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AuthBinder() {
  const { token, refreshToken, setTokens, logout } = useAuthStore();

  useEffect(() => {
    bindAuthCallbacks({
      getToken: () => tokenStorage.get(env.VITE_TOKEN_KEY) || token,
      getRefreshToken: () => tokenStorage.get(env.VITE_REFRESH_TOKEN_KEY) || refreshToken,
      onLogout: () => {
        logout();
        window.location.hash = '#/login';
      },
      onRefreshSuccess: (newToken, newRefresh) => {
        setTokens(newToken, newRefresh);
      },
    });
  }, [token, refreshToken, setTokens, logout]);

  return null;
}

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => readAppearanceState().theme);

  useEffect(() => {
    const handler = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener('lantu-theme-change', handler);
    return () => window.removeEventListener('lantu-theme-change', handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <MessageProvider theme={theme}>
          <HashRouter>
            <AuthBinder />
            <Suspense fallback={<div className="fixed inset-0" />}>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <GuestGuard>
                      <LoginPage />
                    </GuestGuard>
                  }
                />
                <Route
                  path="/*"
                  element={
                    <AuthGuard>
                      <MainLayout />
                    </AuthGuard>
                  }
                />
              </Routes>
            </Suspense>
          </HashRouter>
        </MessageProvider>
      </ErrorBoundary>
      <EnvBadge />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default App;
