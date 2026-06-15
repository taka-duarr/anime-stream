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
  Modal,
  useWindowDimensions,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { WebFooter } from "../components/WebFooter";
import * as api from "../services/api";

const ProfileScreen = ({ navigation }: any) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isAuthenticated, username, logout, profilePicture, setProfilePicture } = useAuth();
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Custom Display Name and Email States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [customDisplayName, setCustomDisplayName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  
  // Edit form states
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Load profile details on mount/username change
  useEffect(() => {
    const loadCustomProfile = async () => {
      try {
        const storedName = await AsyncStorage.getItem("@custom_display_name");
        const storedEmail = await AsyncStorage.getItem("@custom_email");
        if (storedName) {
          setCustomDisplayName(storedName);
        } else if (username) {
          setCustomDisplayName(username);
        } else {
          setCustomDisplayName("");
        }

        if (storedEmail) {
          setCustomEmail(storedEmail);
        } else if (username) {
          setCustomEmail(`${username.toLowerCase()}@gmail.com`);
        } else {
          setCustomEmail("");
        }
      } catch (error) {
        console.error("[PROFILE] Failed to load custom profile:", error);
      }
    };

    loadCustomProfile();
  }, [username]);

  // Sync inputs when edit modal opens
  useEffect(() => {
    if (isEditModalVisible) {
      setEditDisplayName(customDisplayName || username || "");
      setEditEmail(customEmail || (username ? `${username.toLowerCase()}@gmail.com` : ""));
    }
  }, [isEditModalVisible]);

  const handleSaveProfile = async () => {
    try {
      await AsyncStorage.setItem("@custom_display_name", editDisplayName);
      await AsyncStorage.setItem("@custom_email", editEmail);
      setCustomDisplayName(editDisplayName);
      setCustomEmail(editEmail);
      setIsEditModalVisible(false);
      Alert.alert("Sukses", "Profil berhasil disimpan");
    } catch (error) {
      console.error("[PROFILE] Gagal menyimpan profil:", error);
      Alert.alert("Error", "Gagal menyimpan profil");
    }
  };


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
      await AsyncStorage.multiRemove(["@custom_display_name", "@custom_email"]);
      setCustomDisplayName("");
      setCustomEmail("");
      // Navigate to Login screen and clear back stack
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("[PROFILE SCREEN] Logout failed:", error);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar dari akun Anda?",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Ya, Keluar",
          style: "destructive",
          onPress: handleLogout,
        },
      ],
      { cancelable: true }
    );
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
    isLast = false,
  }: any) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        {
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.border,
        }
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={colors.accent} />
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
            size={18}
            color={colors.textMuted}
          />
        ))}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
      {title}
    </Text>
  );

  const renderHeader = (isInsideScroll: boolean = false) => (
    <View style={[styles.header, { borderBottomColor: colors.border }, (isDesktop && !isInsideScroll) && { paddingTop: 72 }]}>

    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.bg },
      ]}
    >
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.sidebar}
      />

      {!isDesktop && renderHeader(false)}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: isDesktop ? 72 : 0 }, isDesktop && { maxWidth: 680, width: "100%", alignSelf: "center", paddingHorizontal: 16 }]}
      >
        {isDesktop && renderHeader(true)}
        {/* PROFILE CARD */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: colors.accent }]}
            onPress={() => isAuthenticated && setIsEditModalVisible(true)}
            disabled={!isAuthenticated || uploadingPicture}
            activeOpacity={0.8}
          >
            {uploadingPicture ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : profilePicture ? (
              <Image
                source={{ uri: profilePicture }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" size={28} color="#FFF" />
            )}
            {isAuthenticated && !uploadingPicture && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={10} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.profileDetails}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {isAuthenticated ? (customDisplayName || username) : "Anime Lover"}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {isAuthenticated ? (customEmail || `${username?.toLowerCase() || "user"}@gmail.com`) : "guest@nganime.com"}
            </Text>
            {isAuthenticated ? (
              <TouchableOpacity onPress={() => setIsEditModalVisible(true)} activeOpacity={0.7}>
                <Text style={[styles.editProfileLink, { color: colors.accent }]}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
                <Text style={[styles.editProfileLink, { color: colors.accent }]}>
                  Login Now
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>



        {/* APPEARANCE */}
        <SectionHeader title="APPEARANCE" />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingItem
            icon="moon"
            title="Dark Mode"
            subtitle={isDark ? "Aktif" : "Nonaktif"}
            onPress={null}
            showArrow={false}
            isLast={true}
            rightComponent={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFF"
                // @ts-expect-error - Web-only prop for react-native-web
                activeThumbColor="#FFF"
              />
            }
          />
        </View>

        {/* APP INFO */}
        <SectionHeader title="ABOUT" />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingItem
            icon="information-circle"
            title="Tentang Aplikasi"
            subtitle="Versi 1.0.0"
            onPress={() => setShowAboutModal(true)}
          />
          <SettingItem
            icon="code-slash"
            title="API Source"
            subtitle="Anime Streaming API"
            onPress={() => openURL("https://www.sankavollerei.com/anime")}
          />
          <SettingItem
            icon="logo-github"
            title="GitHub Repository"
            subtitle="View source code"
            onPress={() => openURL("https://github.com/taka-duarr/anime-stream")}
            isLast={true}
          />
        </View>

        {/* SUPPORT */}
        <SectionHeader title="SUPPORT" />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingItem
            icon="bug"
            title="Laporkan Bug"
            subtitle="Bantu kami memperbaiki aplikasi"
            onPress={() =>
              openURL(
                "https://wa.me/6281357398265?text=Halo,%20saya%20ingin%20melaporkan%20bug%20di%20aplikasi%20anime%20streaming",
              )
            }
          />
          <SettingItem
            icon="star"
            title="Beri Rating"
            subtitle="Dukung pengembangan aplikasi"
            onPress={() => { }}
            isLast={true}
          />
        </View>

        {/* LEGAL */}
        <SectionHeader title="LEGAL" />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingItem
            icon="document-text"
            title="Kebijakan Privasi"
            onPress={() => { }}
          />
          <SettingItem
            icon="shield-checkmark"
            title="Syarat & Ketentuan"
            onPress={() => { }}
            isLast={true}
          />
        </View>

        {/* ACCOUNT SECTION */}
        <SectionHeader title="ACCOUNT" />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isAuthenticated ? (
            <SettingItem
              icon="log-out"
              title="Logout"
              subtitle="Keluar dari akun Anda"
              onPress={handleLogoutPress}
              isLast={true}
            />
          ) : (
            <SettingItem
              icon="log-in"
              title="Login"
              subtitle="Masuk untuk menyimpan bookmark"
              onPress={handleLogin}
              isLast={true}
            />
          )}
        </View>

        {/* FOOTER */}
        {isDesktop && (
          Platform.OS === "web" ? (
            <WebFooter />
          ) : (
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                © 2026 Nganime App v.1.2.0
              </Text>
            </View>
          )
        )}
      </ScrollView>

      {/* ABOUT APP MODAL */}
      <Modal
        visible={showAboutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAboutModal(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconContainer,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <Ionicons
                  name="information-circle"
                  size={32}
                  color={colors.accent}
                />
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAboutModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Tentang Aplikasi
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.textSecondary }]}
              >
                Anime Streaming App
              </Text>

              <View style={styles.modalDivider} />

              {/* Version Info */}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Versi Aplikasi
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  1.0.0
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Platform
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {Platform.OS === "ios"
                    ? "iOS"
                    : Platform.OS === "android"
                      ? "Android"
                      : "Web"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                  Build
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  Production
                </Text>
              </View>

              <View style={styles.modalDivider} />

              {/* Description */}
              <Text
                style={[
                  styles.modalDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Aplikasi streaming anime gratis dengan koleksi lengkap anime
                ongoing dan completed. Nikmati pengalaman menonton anime favorit
                Anda dengan kualitas terbaik.
              </Text>

              {/* Features */}
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.accent}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Streaming anime gratis
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.accent}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Koleksi anime lengkap
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.accent}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Bookmark anime favorit
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={colors.accent}
                  />
                  <Text
                    style={[
                      styles.featureText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Dark mode support
                  </Text>
                </View>
              </View>

              <View style={styles.modalDivider} />

              {/* Footer */}
              {isDesktop && (
                <Text style={[styles.modalFooter, { color: colors.textMuted }]}>
                  © 2026 Nganime v.1.2.0
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>



      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsEditModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              {/* Profile Image Preview & Edit */}
              <View style={{ alignItems: "center", marginBottom: 20 }}>
                <TouchableOpacity
                  style={[styles.avatar, { backgroundColor: colors.accent, width: 80, height: 80, borderRadius: 40, marginRight: 0 }]}
                  onPress={handleUploadProfilePicture}
                  disabled={uploadingPicture}
                  activeOpacity={0.8}
                >
                  {uploadingPicture ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : profilePicture ? (
                    <Image
                      source={{ uri: profilePicture }}
                      style={{ width: "100%", height: "100%", borderRadius: 40 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Ionicons name="person" size={36} color="#FFF" />
                  )}
                  {!uploadingPicture && (
                    <View style={[styles.avatarEditBadge, { width: 26, height: 26, borderRadius: 13 }]}>
                      <Ionicons name="camera" size={14} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
                  Tap foto untuk mengubah gambar
                </Text>
              </View>

              {/* Display Name Input */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Nama</Text>
              <TextInput
                style={[
                  styles.inputField,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? "#2A2A2A" : colors.bgSecondary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Masukkan nama Anda"
                placeholderTextColor={colors.textMuted}
                value={editDisplayName}
                onChangeText={setEditDisplayName}
              />

              {/* Email Input */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Email</Text>
              <TextInput
                style={[
                  styles.inputField,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? "#2A2A2A" : colors.bgSecondary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Masukkan email Anda"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={editEmail}
                onChangeText={setEditEmail}
              />
            </View>

            {/* Modal Footer Buttons */}
            <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtnCancel, { borderColor: colors.border }]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={[styles.modalBtnCancelText, { color: colors.textSecondary }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnSave, { backgroundColor: colors.accent }]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.modalBtnSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    marginRight: 16,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileDetails: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 6,
  },
  editProfileLink: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
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
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  modalFooter: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputField: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalBtnSave: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnSaveText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ProfileScreen;
