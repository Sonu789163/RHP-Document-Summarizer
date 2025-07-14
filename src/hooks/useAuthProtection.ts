import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const useAuthProtection = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect if still loading
    if (loading) return;

    // Check if user is trying to access protected routes without authentication
    const protectedRoutes = ['/dashboard', '/doc', '/chat-history', '/settings'];
    const isProtectedRoute = protectedRoutes.some(route => 
      location.pathname.startsWith(route)
    );

    if (isProtectedRoute && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, loading, location.pathname, navigate]);
}; 