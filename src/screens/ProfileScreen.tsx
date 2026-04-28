import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const ProfileScreen = ({ navigation }: any) => {
  const { colors, isDark, toggleTheme } = useTheme();

  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open URL:", err),
    );
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
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Ionicons name="person" size={40} color="#FFF" />
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>
            Anime Lover
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
            Guest User
          </Text>
        </View>

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
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
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
