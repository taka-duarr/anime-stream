import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

const ProfileScreen = ({ navigation }: any) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isAuthenticated, username, logout } = useAuth();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated && username) {
        try {
          const response = await api.getProfile();
          if (response.user?.profile_picture) {
            const pictureUrl = api.getProfilePictureUrl(
              response.user.profile_picture,
            );
            setProfilePicture(pictureUrl);
          }
        } catch (error) {
          console.error("[PROFILE SCREEN] Failed to fetch profile:", error);
        }
      }
    };

    fetchProfile();
  }, [isAuthenticated, username]);

  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open URL:", err),
    );
  };

  // ============================================
  // HANDLE LOGOUT
  // ============================================

  const handleLogout = async () => {
    try {
      await logout();
      // Navigate to Login screen and clear back stack
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("[PROFILE SCREEN] Logout failed:", error);
    }
  };

  // ============================================
  // HANDLE LOGIN
  // ============================================

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  // ============================================
  // HANDLE PROFILE PICTURE UPLOAD
  // ============================================

  const handleUploadProfilePicture = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Login Diperlukan",
        "Anda harus login untuk mengubah foto profil",
      );
      return;
    }

    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Izin Diperlukan",
          "Aplikasi memerlukan izin untuk mengakses galeri foto Anda",
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      // Upload image
      setUploadingPicture(true);
      const imageUri = result.assets[0].uri;

      console.log("[PROFILE] Uploading image:", imageUri);
      const response = await api.uploadProfilePicture(imageUri);

      // Update profile picture URL
      const pictureUrl = api.getProfilePictureUrl(response.profile_picture);
      setProfilePicture(pictureUrl);

      Alert.alert("Sukses", "Foto profil berhasil diubah");
    } catch (error: any) {
      console.error("[PROFILE] Failed to upload profile picture:", error);

      if (error.response?.status === 401) {
        Alert.alert(
          "Error",
          "Sesi Anda telah berakhir. Silakan login kembali.",
        );
      } else {
        Alert.alert(
          "Error",
          "Gagal mengubah foto profil. Coba lagi.\n" +
            (error.response?.data?.error || error.message || ""),
        );
      }
    } finally {
      setUploadingPicture(false);
    }
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightComponent,
  }: any) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.accent + "20" },
        ]}
      >
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.settingSubtitle, { color: colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightComponent ||
        (showArrow && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        ))}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
      {title}
    </Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.sidebar}
      />

      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Profile & Settings
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PROFILE CARD */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: colors.accent }]}
            onPress={handleUploadProfilePicture}
            disabled={!isAuthenticated || uploadingPicture}
            activeOpacity={0.8}
          >
            {uploadingPicture ? (
              <ActivityIndicator size="large" color="#FFF" />
            ) : profilePicture ? (
              <Image
                source={{ uri: profilePicture }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" size={40} color="#FFF" />
            )}
            {isAuthenticated && !uploadingPicture && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {isAuthenticated ? username : "Anime Lover"}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
            {isAuthenticated ? "Pengguna Terdaftar" : "Guest User"}
          </Text>
          {isAuthenticated && (
            <Text style={[styles.profileHint, { color: colors.textMuted }]}>
              Tap foto untuk mengubah
            </Text>
          )}
        </View>

        {/* ACCOUNT SECTION */}
        {isAuthenticated ? (
          <>
            <SectionHeader title="ACCOUNT" />
            <SettingItem
              icon="log-out"
              title="Logout"
              subtitle="Keluar dari akun Anda"
              onPress={handleLogout}
            />
          </>
        ) : (
          <>
            <SectionHeader title="ACCOUNT" />
            <SettingItem
              icon="log-in"
              title="Login"
              subtitle="Masuk untuk menyimpan bookmark"
              onPress={handleLogin}
            />
          </>
        )}

        {/* APPEARANCE */}
        <SectionHeader title="APPEARANCE" />
        <SettingItem
          icon="moon"
          title="Dark Mode"
          subtitle={isDark ? "Aktif" : "Nonaktif"}
          onPress={null}
          showArrow={false}
          rightComponent={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFF"
            />
          }
        />

        {/* APP INFO */}
        <SectionHeader title="ABOUT" />
        <SettingItem
          icon="information-circle"
          title="Tentang Aplikasi"
          subtitle="Versi 1.0.0"
          onPress={() => {}}
        />
        <SettingItem
          icon="code-slash"
          title="API Source"
          subtitle="Anime Streaming API"
          onPress={() => {
            const apiUrl = process.env.EXPO_PUBLIC_ANIME_API_BASE_URL;
            if (apiUrl) {
              openURL(apiUrl);
            }
          }}
        />
        <SettingItem
          icon="logo-github"
          title="GitHub Repository"
          subtitle="View source code"
          onPress={() => {
            // GitHub URL can be configured via env if needed
            console.log("GitHub repository");
          }}
        />

        {/* SUPPORT */}
        <SectionHeader title="SUPPORT" />
        <SettingItem
          icon="bug"
          title="Laporkan Bug"
          subtitle="Bantu kami memperbaiki aplikasi"
          onPress={() => {}}
        />
        <SettingItem
          icon="star"
          title="Beri Rating"
          subtitle="Dukung pengembangan aplikasi"
          onPress={() => {}}
        />

        {/* LEGAL */}
        <SectionHeader title="LEGAL" />
        <SettingItem
          icon="document-text"
          title="Kebijakan Privasi"
          onPress={() => {}}
        />
        <SettingItem
          icon="shield-checkmark"
          title="Syarat & Ketentuan"
          onPress={() => {}}
        />

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Made with ❤️ for Anime Fans
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            © 2024 MyAnime App
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  profileHint: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
  },
  footer: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 16,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
});

export default ProfileScreen;
