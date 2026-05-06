import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "../services/api";

// ============================================
// TYPES & INTERFACES
// ============================================

export interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  requireAuth: (onSuccess: () => void, navigation: any) => void;
}

// ============================================
// CONTEXT CREATION
// ============================================

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  username: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  requireAuth: () => {},
});

// ============================================
// AUTH PROVIDER COMPONENT
// ============================================

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ============================================
  // CHECK AUTHENTICATION ON APP START
  // ============================================

  const checkAuth = async () => {
    try {
      console.log("[AUTH CONTEXT] Checking stored authentication...");

      // Retrieve stored token and username from AsyncStorage
      const storedToken = await AsyncStorage.getItem("@auth_token");
      const storedUsername = await AsyncStorage.getItem("@username");

      if (storedToken && storedUsername) {
        console.log(
          "[AUTH CONTEXT] Found stored credentials, restoring session",
        );

        // Restore authentication state
        setToken(storedToken);
        setUsername(storedUsername);
        setIsAuthenticated(true);

        // Configure API service with token
        api.setAuthToken(storedToken);

        console.log("[AUTH CONTEXT] Authentication restored successfully");
      } else {
        console.log("[AUTH CONTEXT] No stored credentials found");
      }
    } catch (error) {
      console.error(
        "[AUTH CONTEXT ERROR] Failed to check authentication:",
        error,
      );
      // On error, default to unauthenticated state
      setIsAuthenticated(false);
      setUsername(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Run checkAuth on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  // ============================================
  // LOGIN FUNCTION
  // ============================================

  const login = async (username: string, password: string) => {
    try {
      console.log("[AUTH CONTEXT] Attempting login for:", username);

      // Call API login function
      const response = await api.login(username, password);

      if (!response.token || !response.user) {
        throw new Error("Invalid response from server");
      }

      // Store token and username in AsyncStorage
      await AsyncStorage.setItem("@auth_token", response.token);
      await AsyncStorage.setItem("@username", response.user.username);

      // Update context state
      setToken(response.token);
      setUsername(response.user.username);
      setIsAuthenticated(true);

      // Configure API service with token (already done by api.login, but ensure it's set)
      api.setAuthToken(response.token);

      console.log("[AUTH CONTEXT] Login successful");
    } catch (error: any) {
      console.error("[AUTH CONTEXT ERROR] Login failed:", error);

      // Throw error with descriptive message
      if (error.response?.status === 401) {
        throw new Error("Username atau password salah.");
      } else if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("Network Error")
      ) {
        throw new Error("Koneksi gagal. Periksa internet Anda.");
      } else {
        throw new Error(
          error.response?.data?.message || "Login gagal. Coba lagi.",
        );
      }
    }
  };

  // ============================================
  // REGISTER FUNCTION
  // ============================================

  const register = async (username: string, password: string) => {
    try {
      console.log("[AUTH CONTEXT] Attempting registration for:", username);

      // Call API register function
      const response = await api.register(username, password);

      console.log("[AUTH CONTEXT] Registration successful");

      // Note: We don't auto-login after registration
      // User needs to login manually after registration
    } catch (error: any) {
      console.error("[AUTH CONTEXT ERROR] Registration failed:", error);

      // Throw error with descriptive message
      if (error.response?.status === 409) {
        throw new Error("Username sudah digunakan. Pilih username lain.");
      } else if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("Network Error")
      ) {
        throw new Error("Koneksi gagal. Periksa internet Anda.");
      } else {
        throw new Error(
          error.response?.data?.message || "Registrasi gagal. Coba lagi.",
        );
      }
    }
  };

  // ============================================
  // LOGOUT FUNCTION
  // ============================================

  const logout = async () => {
    try {
      console.log("[AUTH CONTEXT] Logging out...");

      // Remove token and username from AsyncStorage
      await AsyncStorage.multiRemove(["@auth_token", "@username"]);

      // Clear API service token
      api.logout();

      // Reset context state
      setToken(null);
      setUsername(null);
      setIsAuthenticated(false);

      console.log("[AUTH CONTEXT] Logout successful");
    } catch (error) {
      console.error("[AUTH CONTEXT ERROR] Logout failed:", error);
      // Even if AsyncStorage fails, clear the state
      setToken(null);
      setUsername(null);
      setIsAuthenticated(false);
    }
  };

  // ============================================
  // REQUIRE AUTH HELPER
  // ============================================

  const requireAuth = (onSuccess: () => void, navigation: any) => {
    if (isAuthenticated) {
      // User is authenticated, execute callback
      onSuccess();
    } else {
      // User is not authenticated, navigate to login
      console.log(
        "[AUTH CONTEXT] Authentication required, navigating to login",
      );
      navigation.navigate("Login", {
        onLoginSuccess: onSuccess,
      });
    }
  };

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    isAuthenticated,
    username,
    token,
    loading,
    login,
    register,
    logout,
    checkAuth,
    requireAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================
// CUSTOM HOOK
// ============================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
