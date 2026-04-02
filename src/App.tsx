import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './router/guards/AuthGuard';
import { GuestGuard } from './router/guards/GuestGuard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MessageProvider, useMessage } from './components/common/Message';
import { bindAuthCallbacks, bindHttpUiCallbacks } from './lib/http';
import { useAuthStore } from './stores/authStore';
import { authService } from './api/services/auth.service';
import { normalizeRole } from './context/UserRoleContext';
import { tokenStorage } from './lib/security';
import { env } from './config/env';
import { readAppearanceState, resolveEffectiveTheme } from './utils/appearanceState';
import type { Theme } from './types';
import { ApiException } from './types/api';
import { PageSkeleton } from './components/common/PageSkeleton';

const MainLayout = lazy(() => import('./layouts/MainLayout').then(m => ({ default: m.MainLayout })));
const LoginPage = lazy(() => import('./views/login/LoginPage').then(m => ({ default: m.LoginPage })));
const DeveloperOnboardingPage = lazy(() => import('./views/onboarding/DeveloperOnboardingPage').then(m => ({ default: m.DeveloperOnboardingPage })));
const NotFoundPage = lazy(() => import('./views/common/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const SessionExpiredPage = lazy(() => import('./views/common/SessionExpiredPage').then(m => ({ default: m.SessionExpiredPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiException && [401, 403, 409].includes(error.status ?? 0)) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function AuthBinder() {
  const { token, refreshToken, user, loginName, setTokens, setUser, logout } = useAuthStore();
  const fetchingRef = useRef(false);

  useEffect(() => {
    bindAuthCallbacks({
      getToken: () => tokenStorage.get(env.VITE_TOKEN_KEY) || token,
      getRefreshToken: () => tokenStorage.get(env.VITE_REFRESH_TOKEN_KEY) || refreshToken,
      getUserId: () => user?.id ?? null,
      getLoginName: () => loginName ?? null,
      onLogout: () => {
        logout();
        window.location.hash = '#/401';
      },
      onRefreshSuccess: (newToken, newRefresh) => {
        setTokens(newToken, newRefresh);
      },
    });
  }, [token, refreshToken, user, loginName, setTokens, logout]);

  useEffect(() => {
    if (!token || fetchingRef.current) return;
    fetchingRef.current = true;
    authService.getCurrentUser()
      .then((u) => {
        const normalized = { ...u, role: normalizeRole(u.role) };
        setUser(normalized);
      })
      .catch(() => {
        logout();
        window.location.hash = '#/401';
      })
      .finally(() => {
        fetchingRef.current = false;
      });
  }, [token, setUser, logout]);

  return null;
}

function HttpErrorBinder() {
  const { showMessage } = useMessage();
  useEffect(() => {
    bindHttpUiCallbacks({
      onServerError: (msg) => showMessage(msg, 'error', 5000),
    });
    return () => bindHttpUiCallbacks({ onServerError: undefined });
  }, [showMessage]);
  return null;
}

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() =>
    resolveEffectiveTheme(readAppearanceState().themePreference),
  );

  useEffect(() => {
    const handler = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener('lantu-theme-change', handler);
    return () => window.removeEventListener('lantu-theme-change', handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <MessageProvider theme={theme}>
          {/** Hash 路由的匹配只看 `#` 后路径；勿把 Vite `base`（静态资源前缀）设成 basename，否则与 hash 内 pathname 不一致会白屏 */}
          <HashRouter>
            <AuthBinder />
            <HttpErrorBinder />
            <Suspense fallback={<div className="fixed inset-0 overflow-auto bg-slate-50 dark:bg-slate-950"><PageSkeleton type="dashboard" /></div>}>
              <Routes>
                <Route path="/401" element={<SessionExpiredPage />} />
                <Route
                  path="/login"
                  element={
                    <GuestGuard>
                      <LoginPage />
                    </GuestGuard>
                  }
                />
                <Route
                  path="/404"
                  element={
                    <AuthGuard>
                      <NotFoundPage />
                    </AuthGuard>
                  }
                />
                <Route
                  path="/onboarding/developer"
                  element={
                    <AuthGuard>
                      <DeveloperOnboardingPage />
                    </AuthGuard>
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
    </QueryClientProvider>
  );
};

export default App;
