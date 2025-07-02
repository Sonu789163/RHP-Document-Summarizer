import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { authService } from "@/services/authService";

interface User {
  userId: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (accessToken: string, refreshToken: string) => void;
  logout: (message?: string) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const logout = useMemo(
    () => async (message?: string) => {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          await authService.logout(refreshToken);
        } catch (error) {
          console.error(
            "Logout failed on server, clearing client-side session.",
            error
          );
        }
      }
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      delete axios.defaults.headers.common["Authorization"];
      navigate("/login");
      if (message) {
        toast.error(message);
      } else {
        toast.success("Successfully logged out!");
      }
    },
    [navigate]
  );

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        try {
          const decoded = jwtDecode(accessToken) as User;
          setUser(decoded);
          axios.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${accessToken}`;
        } catch {
          // If access token is expired, silent refresh will handle it via interceptor
        }
      }
      setLoading(false);
    };
    initAuth();

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshToken = localStorage.getItem("refreshToken");
          if (refreshToken) {
            try {
              const { accessToken } = await authService.refreshToken(
                refreshToken
              );
              localStorage.setItem("accessToken", accessToken);
              axios.defaults.headers.common[
                "Authorization"
              ] = `Bearer ${accessToken}`;
              originalRequest.headers[
                "Authorization"
              ] = `Bearer ${accessToken}`;
              return axios(originalRequest);
            } catch (refreshError) {
              await logout("Session expired. Please log in again."); // Show session expired
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token available, logout
            await logout("Session expired. Please log in again.");
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on component unmount
    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [logout]);

  const login = (accessToken: string, refreshToken: string) => {
    try {
      const decoded = jwtDecode(accessToken) as User;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      setUser(decoded);
      navigate("/dashboard");
    } catch (error) {
      toast.error("Login failed. Invalid token received.");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
