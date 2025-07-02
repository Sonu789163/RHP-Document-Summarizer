import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import UploadLayout from "./pages/UploadLayout";
import ChatSummaryLayout from "./pages/ChatSummaryLayout";
import NotFound from "./pages/NotFound";
import ChatHistoryPage from "./pages/ChatHistoryPage";
import SettingsPage from "./pages/SettingsPage";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ProtectedLayout from "./pages/ProtectedLayout";
import AppLayout from "./AppLayout";
import { Loader2 } from "lucide-react";
import { MainLayout } from "./components/MainLayout";
import StartConversationPage from "./pages/StartConversationPage";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/auth-callback" element={<AuthCallbackPage />} />

              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<StartConversationPage />} />
                <Route element={<MainLayout />}>
                  <Route path="/upload" element={<UploadLayout />} />
                  <Route path="/doc/:namespace" element={<ChatSummaryLayout />} />
                  <Route path="/chat-history" element={<ChatHistoryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
