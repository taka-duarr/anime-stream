import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
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
  const { colors, isDark } = useTheme();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(username, password);
      console.log("[LOGIN SCREEN] Login successful");

      if (route?.params?.onLoginSuccess) {
        route.params.onLoginSuccess();
      }

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
      {/* 
        Inject global CSS rules to override default browser autofill behavior.
        This resolves the ugly white/light-blue rectangular background on autofilled inputs in web browsers.
      */}
      {Platform.OS === "web" && (
        <style dangerouslySetInnerHTML={{__html: `
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 1000px ${colors.bgSecondary} inset !important;
            -webkit-text-fill-color: ${colors.text} !important;
            caret-color: ${colors.text};
            transition: background-color 5000s ease-in-out 0s;
          }
        `}} />
      )}

      <View style={styles.cardWrapper}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Selamat Datang</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Silakan masuk untuk menyelaraskan koleksi anime Anda
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Error Message */}
          {error ? (
            <View
              style={[
                styles.errorContainer,
                { backgroundColor: isDark ? "rgba(230,51,51,0.1)" : "rgba(230,51,51,0.05)" },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.accent} style={styles.errorIcon} />
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
                  borderColor: isUsernameFocused ? colors.accent : colors.border,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={isUsernameFocused ? colors.accent : colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Masukkan username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError("");
                }}
                onFocus={() => setIsUsernameFocused(true)}
                onBlur={() => setIsUsernameFocused(false)}
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
                  borderColor: isPasswordFocused ? colors.accent : colors.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={isPasswordFocused ? colors.accent : colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Masukkan password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
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
                  size={18}
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
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Masuk Ke Akun</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>
              Belum memiliki akun?{" "}
            </Text>
            <TouchableOpacity
              onPress={handleNavigateToRegister}
              disabled={loading}
            >
              <Text style={[styles.registerLink, { color: colors.accent }]}>
                Daftar sekarang
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>ATAU</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Guest Button */}
          <TouchableOpacity
            style={[
              styles.guestButton,
              {
                backgroundColor: "transparent",
                borderColor: colors.border,
              },
            ]}
            onPress={handleContinueAsGuest}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.guestButtonText, { color: colors.textSecondary }]}
            >
              Masuk sebagai Guest
            </Text>
          </TouchableOpacity>
        </View>
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
    padding: 24,
    paddingTop: Platform.OS === "web" ? 80 : 40,
    paddingBottom: 40,
  },
  cardWrapper: {
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 18,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    height: 46,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    fontSize: 13,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: "700",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.6,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "700",
    marginHorizontal: 16,
    letterSpacing: 1,
  },
  guestButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default LoginScreen;
