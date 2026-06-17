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

interface RegisterScreenProps {
  navigation: any;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

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

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return false;
    }

    return true;
  };

  // ============================================
  // HANDLE REGISTER
  // ============================================

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register(username, password);
      console.log("[REGISTER SCREEN] Registration successful");
      setSuccess("Registrasi berhasil! Mengalihkan ke login...");

      setTimeout(() => {
        navigation.replace("Login");
      }, 1500);
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
    navigation.replace("Login");
  };

  // ============================================
  // HANDLE CONTINUE AS GUEST
  // ============================================

  const handleContinueAsGuest = () => {
    console.log("[REGISTER SCREEN] Continuing as guest");
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
          style={StyleSheet.absoluteFill}
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
              style={StyleSheet.absoluteFill}
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

          {/* Right Column: Register Form */}
          <View style={styles.splitRight}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.splitTitle, { color: colors.text }]}>Register</Text>
            <Text style={[styles.splitSubtitle, { color: colors.textSecondary }]}>
              Daftarkan akun baru Anda untuk menyimpan anime favorit anda.
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
                <Text style={[styles.errorText, { color: colors.accent }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Success Message */}
            {success ? (
              <View
                style={[
                  styles.successContainer,
                  { backgroundColor: isDark ? "rgba(76,175,80,0.1)" : "rgba(76,175,80,0.05)" },
                ]}
              >
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.errorIcon} />
                <Text style={[styles.successText, { color: "#4CAF50" }]} numberOfLines={1}>
                  {success}
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
                  placeholder="Pilih username unik"
                  placeholderTextColor={colors.textMuted}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setError("");
                    setSuccess("");
                  }}
                  onFocus={() => {
                    setIsUsernameFocused(true);
                    setError("");
                    setSuccess("");
                  }}
                  onBlur={() => setIsUsernameFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !success}
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
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                    setSuccess("");
                  }}
                  onFocus={() => {
                    setIsPasswordFocused(true);
                    setError("");
                    setSuccess("");
                  }}
                  onBlur={() => setIsPasswordFocused(false)}
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
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Konfirmasi Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.bgSecondary,
                    borderColor: isConfirmPasswordFocused ? colors.accent : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={isConfirmPasswordFocused ? colors.accent : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ulangi password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError("");
                    setSuccess("");
                  }}
                  onFocus={() => {
                    setIsConfirmPasswordFocused(true);
                    setError("");
                    setSuccess("");
                  }}
                  onBlur={() => setIsConfirmPasswordFocused(false)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !success}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                  disabled={loading || !!success}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                { backgroundColor: colors.accent, marginTop: 24 },
                (loading || success) && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading || !!success}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Register</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={handleNavigateToLogin} disabled={loading}>
                <Text style={[styles.loginLink, { color: colors.accent }]}>Login Here</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mobileWrapper, { backgroundColor: colors.bg }]}>
      {/* Close Button for Mobile */}
      <TouchableOpacity
        style={styles.mobileCloseBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </TouchableOpacity>

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
            <Text style={[styles.title, { color: colors.text }]}>Register</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Daftarkan akun baru Anda untuk menyimpan anime favorit anda.
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Error Message */}
            {error ? (
              <View
                style={[
                  styles.messageContainer,
                  { backgroundColor: isDark ? "rgba(230,51,51,0.1)" : "rgba(230,51,51,0.05)" },
                ]}
              >
                <Ionicons name="alert-circle" size={16} color={colors.accent} style={styles.messageIcon} />
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
                  { backgroundColor: isDark ? "rgba(76,175,80,0.1)" : "rgba(76,175,80,0.05)" },
                ]}
              >
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.messageIcon} />
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
                  placeholder="Pilih username unik"
                  placeholderTextColor={colors.textMuted}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setError("");
                    setSuccess("");
                  }}
                  onFocus={() => {
                    setIsUsernameFocused(true);
                    setError("");
                    setSuccess("");
                  }}
                  onBlur={() => setIsUsernameFocused(false)}
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
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                    setSuccess("");
                  }}
                  onFocus={() => {
                    setIsPasswordFocused(true);
                    setError("");
                    setSuccess("");
                  }}
                  onBlur={() => setIsPasswordFocused(false)}
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
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Kata sandi minimal berisi 6 karakter
              </Text>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Konfirmasi Password
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.bgSecondary,
                    borderColor: isConfirmPasswordFocused ? colors.accent : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={isConfirmPasswordFocused ? colors.accent : colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ulangi password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setError("");
                    setSuccess("");
                  }}
                  onFocus={() => {
                    setIsConfirmPasswordFocused(true);
                    setError("");
                    setSuccess("");
                  }}
                  onBlur={() => setIsConfirmPasswordFocused(false)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !success}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                  disabled={loading || !!success}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
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
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Daftar Sekarang</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>
                Sudah memiliki akun?{" "}
              </Text>
              <TouchableOpacity onPress={handleNavigateToLogin} disabled={loading}>
                <Text style={[styles.loginLink, { color: colors.accent }]}>
                  Masuk di sini
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
              disabled={loading || !!success}
              activeOpacity={0.85}
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
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 18,
  },
  messageIcon: {
    marginRight: 8,
  },
  messageText: {
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
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
  registerButton: {
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
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginText: {
    fontSize: 13,
  },
  loginLink: {
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
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 18,
  },
  successText: {
    fontSize: 13,
    flex: 1,
    fontWeight: "500",
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
  mobileCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
  },
});

export default RegisterScreen;
