import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export interface User {
  microsoftId: string;
  name: string;
  email: string;
  createdAt: string;
  lastLogin: string;
}

export interface AuthResponse {
  user: User;
}

export interface HistoryResponse {
  documents: any[];
  summaries: any[];
  chats: any[];
}

export const authService = {
  // Get Microsoft OAuth URL
  async getMicrosoftAuthUrl(): Promise<string> {
    const response = await axios.get(`${API_URL}/auth/microsoft`);
    return response.data.authUrl;
  },

  // Get current user
  async getCurrentUser(token: string): Promise<AuthResponse> {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Get user history
  async getUserHistory(token: string): Promise<HistoryResponse> {
    const response = await axios.get(`${API_URL}/auth/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Logout
  async logout(refreshToken: string): Promise<void> {
    const token = localStorage.getItem("accessToken");
    await axios.post(
      `${API_URL}/auth/logout`,
      { refreshToken },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  // --- Email & Password ---
  async login(email, password) {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });
    return response.data;
  },

  async register({ email, password }: { email: string; password: string }) {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
    });
    return response.data;
  },

  async refreshToken(token) {
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      token,
    });
    return response.data;
  },

  // Forgot Password - Send reset email
  async forgotPassword(email: string): Promise<{ message: string }> {
    console.log("authService.forgotPassword called with email:", email);
    console.log("API URL:", `${API_URL}/auth/forgot-password`);
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email,
      });
      console.log("forgotPassword API response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error in authService.forgotPassword:", error);
      throw error;
    }
  },

  // Reset Password with token
  async resetPassword(
    email: string,
    token: string,
    password: string
  ): Promise<{ message: string }> {
    const response = await axios.post(`${API_URL}/auth/reset-password`, {
      email,
      token,
      password,
    });
    return response.data;
  },
};
