import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ChatSummaryLayout from "./pages/ChatSummaryLayout";
import NotFound from "./pages/NotFound";
import ChatHistoryPage from "./pages/ChatHistoryPage";
import SettingsPage from "./pages/SettingsPage";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TestPage from "./pages/TestPage";
import ProtectedLayout from "./pages/ProtectedLayout";
import AppLayout from "./AppLayout";
import { Loader2 } from "lucide-react";
import { MainLayout } from "./components/MainLayout";
import StartConversationPage from "./pages/StartConversationPage";
import ComparePage from "./pages/ComparePage";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminWorkspaceManagement from "./pages/AdminWorkspaceManagement";
import InvitationPage from "./pages/InvitationPage";
import { useAuthProtection } from "./hooks/useAuthProtection";
import NotificationsPage from "./pages/NotificationsPage";
import TrashPage from "./pages/TrashPage";

const queryClient = new QueryClient();

const Root = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/" />;
};

const AppRoutes = () => {
  // Add authentication protection
  useAuthProtection();

  // Scroll position restoration (robust)
  const ScrollRestorer = () => {
    const location = useLocation();
    const navType = useNavigationType();

    React.useEffect(() => {
      const key = `scroll:${location.pathname}${location.search}`;
      const stored = sessionStorage.getItem(key);
      const y = stored != null ? Number(stored) : null;

      // Always try to restore if we have a stored value; otherwise go to top
      requestAnimationFrame(() => {
        if (y !== null && !Number.isNaN(y)) {
          window.scrollTo(0, y);
        } else {
          window.scrollTo(0, 0);
        }
      });

      // Save on unmount or before leaving the route
      return () => {
        const currentY = window.scrollY || document.documentElement.scrollTop || 0;
        sessionStorage.setItem(key, String(currentY));
      };
    }, [location.pathname, location.search, navType]);

    // Also save on page unload
    React.useEffect(() => {
      const handler = () => {
        const key = `scroll:${location.pathname}${location.search}`;
        const currentY = window.scrollY || document.documentElement.scrollTop || 0;
        sessionStorage.setItem(key, String(currentY));
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }, [location.pathname, location.search]);

    return null;
  };

  return (
    <>
    <ScrollRestorer />
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/auth-callback" element={<AuthCallbackPage />} />
        <Route path="/invitation/:invitationId" element={<InvitationPage />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<StartConversationPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/bin" element={<TrashPage />} />
          <Route path="/compare/:drhpId" element={<ComparePage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/workspaces" element={<AdminWorkspaceManagement />} />
          {/* Domain Config removed */}

          <Route element={<MainLayout />}>
            <Route path="/doc/:namespace" element={<ChatSummaryLayout />} />
            <Route path="/chat-history" element={<ChatHistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
