import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

interface LoginScreenProps {
  navigation: any;
  route?: {
    params?: {
      returnTo?: string;
      onLoginSuccess?: () => void;
    };
  };
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ============================================
  // FORM VALIDATION
  // ============================================

  const validateForm = (): boolean => {
    if (!username.trim() || !password.trim()) {
      setError("Username dan password harus diisi.");
      return false;
    }
    return true;
  };

  // ============================================
  // HANDLE LOGIN
  // ============================================

  const handleLogin = async () => {
    // Clear previous error
    setError("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Call login function from AuthContext
      await login(username, password);

      // Login successful
      console.log("[LOGIN SCREEN] Login successful");

      // Execute onLoginSuccess callback if provided
      if (route?.params?.onLoginSuccess) {
        route.params.onLoginSuccess();
      }

      // Navigate to Main tab navigator and clear back stack
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
    } catch (error: any) {
      console.error("[LOGIN SCREEN] Login failed:", error);
      setError(error.message || "Login gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HANDLE NAVIGATION TO REGISTER
  // ============================================

  const handleNavigateToRegister = () => {
    navigation.navigate("Register");
  };

  // ============================================
  // HANDLE CONTINUE AS GUEST
  // ============================================

  const handleContinueAsGuest = () => {
    console.log("[LOGIN SCREEN] Continuing as guest");

    // Navigate to Main tab navigator and clear back stack
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="log-in" size={48} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]}>Login</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Masuk untuk menyimpan anime favorit Anda
        </Text>
      </View>

      {/* Form Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Error Message */}
        {error ? (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: colors.bgSecondary },
            ]}
          >
            <Ionicons name="alert-circle" size={20} color={colors.accent} />
            <Text style={[styles.errorText, { color: colors.accent }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Username Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Username
          </Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Masukkan username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setError(""); // Clear error on input change
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Password
          </Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.bgSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Masukkan password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(""); // Clear error on input change
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              disabled={loading}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            { backgroundColor: colors.accent },
            loading && styles.loginButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="log-in-outline"
                size={20}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.loginButtonText}>Login</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: colors.textSecondary }]}>
            Belum punya akun?{" "}
          </Text>
          <TouchableOpacity
            onPress={handleNavigateToRegister}
            disabled={loading}
          >
            <Text style={[styles.registerLink, { color: colors.accent }]}>
              Daftar di sini
            </Text>
          </TouchableOpacity>
        </View>

        {/* Guest Button */}
        <TouchableOpacity
          style={[
            styles.guestButton,
            {
              backgroundColor: colors.bgSecondary,
              borderColor: colors.border,
            },
          ]}
          onPress={handleContinueAsGuest}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person-outline"
            size={20}
            color={colors.textSecondary}
            style={styles.buttonIcon}
          />
          <Text
            style={[styles.guestButtonText, { color: colors.textSecondary }]}
          >
            Masuk sebagai Guest
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingTop: Platform.OS === "web" ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  guestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    borderWidth: 1,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default LoginScreen;
