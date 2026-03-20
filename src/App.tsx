import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthGuard } from './router/guards/AuthGuard';
import { GuestGuard } from './router/guards/GuestGuard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SplashScreen } from './components/common/SplashScreen';
import { EnvBadge } from './components/common/EnvBadge';
import { bindAuthCallbacks } from './lib/http';
import { useAuthStore } from './stores/authStore';
import { tokenStorage } from './lib/security';
import { env } from './config/env';

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
        window.location.href = '/login';
      },
      onRefreshSuccess: (newToken, newRefresh) => {
        setTokens(newToken, newRefresh);
      },
    });
  }, [token, refreshToken, setTokens, logout]);

  return null;
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthBinder />
          <Suspense fallback={<SplashScreen />}>
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
        </BrowserRouter>
      </ErrorBoundary>
      <EnvBadge />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default App;
