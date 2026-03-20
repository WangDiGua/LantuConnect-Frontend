import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
