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

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================
  // FORM VALIDATION
  // ============================================

  const validateForm = (): boolean => {
    if (!username.trim()) {
      setError("Username harus diisi.");
      return false;
    }

    if (!password.trim()) {
      setError("Password harus diisi.");
      return false;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return false;
    }

    return true;
  };

  // ============================================
  // HANDLE REGISTER
  // ============================================

  const handleRegister = async () => {
    // Clear previous messages
    setError("");
    setSuccess("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Call register function from AuthContext
      await register(username, password);

      // Registration successful
      console.log("[REGISTER SCREEN] Registration successful");
      setSuccess("Registrasi berhasil! Silakan login.");

      // Navigate to LoginScreen after 2 seconds
      setTimeout(() => {
        navigation.navigate("Login");
      }, 2000);
    } catch (error: any) {
      console.error("[REGISTER SCREEN] Registration failed:", error);
      setError(error.message || "Registrasi gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HANDLE NAVIGATION TO LOGIN
  // ============================================

  const handleNavigateToLogin = () => {
    navigation.navigate("Login");
  };

  // ============================================
  // HANDLE CONTINUE AS GUEST
  // ============================================

  const handleContinueAsGuest = () => {
    console.log("[REGISTER SCREEN] Continuing as guest");

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
        <Ionicons name="person-add" size={48} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]}>Daftar</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Buat akun untuk menyimpan anime favorit Anda
        </Text>
      </View>

      {/* Form Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Error Message */}
        {error ? (
          <View
            style={[
              styles.messageContainer,
              styles.errorContainer,
              { backgroundColor: colors.bgSecondary },
            ]}
          >
            <Ionicons name="alert-circle" size={20} color={colors.accent} />
            <Text style={[styles.messageText, { color: colors.accent }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Success Message */}
        {success ? (
          <View
            style={[
              styles.messageContainer,
              styles.successContainer,
              { backgroundColor: colors.bgSecondary },
            ]}
          >
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={[styles.messageText, { color: "#4CAF50" }]}>
              {success}
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
              placeholder="Pilih username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setError(""); // Clear error on input change
                setSuccess(""); // Clear success on input change
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !success}
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
              placeholder="Minimal 6 karakter"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError(""); // Clear error on input change
                setSuccess(""); // Clear success on input change
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !success}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              disabled={loading || !!success}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Password harus minimal 6 karakter
          </Text>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[
            styles.registerButton,
            { backgroundColor: colors.accent },
            (loading || success) && styles.registerButtonDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading || !!success}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name="person-add-outline"
                size={20}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.registerButtonText}>Daftar</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: colors.textSecondary }]}>
            Sudah punya akun?{" "}
          </Text>
          <TouchableOpacity onPress={handleNavigateToLogin} disabled={loading}>
            <Text style={[styles.loginLink, { color: colors.accent }]}>
              Login di sini
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
          disabled={loading || !!success}
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
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorContainer: {},
  successContainer: {},
  messageText: {
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
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
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

export default RegisterScreen;
