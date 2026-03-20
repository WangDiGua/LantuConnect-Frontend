import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: 'admin' | 'user';
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, requiredRole }) => {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
