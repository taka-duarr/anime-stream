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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

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
    navigation.replace("Register");
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

  // RENDER
  // ============================================

  if (isDesktop) {
    return (
      <View style={[styles.desktopWrapper, { backgroundColor: isDark ? "rgba(10, 11, 14, 0.78)" : "rgba(15, 23, 42, 0.65)" }]}>
        {/* Tap backdrop to go back */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => navigation.goBack()}
        />

        {/* 
          Inject global CSS rules to override default browser autofill behavior.
        */}
        <style dangerouslySetInnerHTML={{
          __html: `
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

        <View style={[styles.splitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Left Column: Branding & Art */}
          <View style={styles.splitLeft}>
            {/* Blurred background image inside left panel */}
            <Image
              source={{ uri: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=800&auto=format&fit=crop" }}
              style={styles.splitLeftBg as any}
              contentFit="cover"
            />
            <LinearGradient
              colors={["rgba(26, 34, 48, 0.6)", "rgba(13, 14, 21, 0.92)"]}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.splitLeftContent}>
              <Image
                source={isDark ? require("../../assets/logogelap.png") : require("../../assets/logo.png")}
                style={styles.splitLogo as any}
                contentFit="contain"
              />
              <Text style={styles.splitText}>
                Nonton Anime{"\n"}Sepuasnya,{"\n"}Tanpa iklan<Text style={{ color: colors.accent }}>.</Text>
              </Text>
            </View>
          </View>

          {/* Right Column: Login Form */}
          <View style={styles.splitRight}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.splitTitle, { color: colors.text }]}>Login</Text>
            <Text style={[styles.splitSubtitle, { color: colors.textSecondary }]}>
              Masuk untuk menikmati streaming anime favorit Anda tanpa batas.
            </Text>

            {/* Error Message */}
            {error ? (
              <View
                style={[
                  styles.errorContainer,
                  { backgroundColor: isDark ? "rgba(230,51,51,0.1)" : "rgba(230,51,51,0.05)" },
                ]}
              >
                <Ionicons name="alert-circle" size={16} color={colors.accent} style={styles.errorIcon} />
                <Text style={[styles.errorText, { color: colors.accent }]} numberOfLines={1}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
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
              <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
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

            {/* Options Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setKeepLoggedIn(!keepLoggedIn)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={keepLoggedIn ? "checkbox" : "square-outline"}
                  size={18}
                  color={keepLoggedIn ? colors.accent : colors.textSecondary}
                />
                <Text style={[styles.checkboxText, { color: colors.textSecondary }]}>
                  Keep me Logged In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[styles.forgotText, { color: colors.accent }]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Action Button */}
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
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: colors.textSecondary }]}>
                Don't have an account yet?{" "}
              </Text>
              <TouchableOpacity onPress={handleNavigateToRegister} disabled={loading}>
                <Text style={[styles.registerLink, { color: colors.accent }]}>Register Now</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mobileWrapper, { backgroundColor: isDark ? "rgba(10, 11, 14, 0.78)" : "rgba(15, 23, 42, 0.65)" }]}>
      {/* Tap backdrop to go back */}
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={() => navigation.goBack()}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={styles.mobileContentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 
          Inject global CSS rules to override default browser autofill behavior.
        */}
        {Platform.OS === "web" && (
          <style dangerouslySetInnerHTML={{
            __html: `
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
            <Text style={[styles.title, { color: colors.text }]}>Login</Text>
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
          </View>
        </View>
      </ScrollView>
    </View>
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
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
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
    borderWidth: 2,
    borderColor: '#ff0000ff',
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  desktopWrapper: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      web: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
  } as any,
  bgImageBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.25,
    ...Platform.select({
      web: {
        filter: "blur(20px) grayscale(40%)",
      },
    }),
  },
  bgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(12, 13, 17, 0.75)",
  },
  splitCard: {
    flexDirection: "row",
    width: 820,
    height: 520,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    zIndex: 10,
  },
  splitLeft: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  splitLeftBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    ...Platform.select({
      web: {
        filter: "blur(4px) desaturate(20%)",
      },
    }),
  },
  splitLeftContent: {
    flex: 1,
    padding: 40,
    justifyContent: "center",
    zIndex: 2,
  },
  splitLogo: {
    width: 80,
    height: 80,

  },
  splitText: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
  },
  splitRight: {
    width: 440,
    padding: 40,
    justifyContent: "center",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 24,
    right: 24,
    padding: 4,
  },
  splitTitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  splitSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 20,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkboxText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  forgotText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  mobileWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  mobileContentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: Platform.OS === "web" ? 80 : 40,
    paddingBottom: 40,
  },
});

export default LoginScreen;
