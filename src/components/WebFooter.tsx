import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  useWindowDimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export const WebFooter = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  
  if (Platform.OS !== "web") return null;
  
  const isDesktop = width >= 768;
  if (!isDesktop) return null;

  return (
    <View style={[styles.webFooterContainer, { backgroundColor: isDark ? "#121212" : colors.bgSecondary, borderTopColor: colors.border }]}>
      <View style={[styles.webFooterContent, isDesktop && { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }]}>
        {/* Logo & Brand Info */}
        <View style={[styles.footerBrandCol, isDesktop ? { width: "35%" } : { marginBottom: 24 }]}>
          <View style={styles.footerLogoRow}>
            <Image
              source={isDark ? require("../../assets/logogelap.png") : require("../../assets/logo.png")}
              style={styles.footerLogoImg as any}
              contentFit="contain"
            />
            <Image
              source={require("../../assets/nganime.png")}
              style={styles.footerLogoTextImg as any}
              contentFit="contain"
            />
          </View>
          <Text style={[styles.footerDescription, { color: colors.textSecondary }]}>
            Nganime adalah platform streaming anime sub Indo terupdate. Nikmati ratusan judul anime Ongoing dan Completed terlengkap secara gratis dengan pemutar responsif dan stabil.
          </Text>
          {/* Social Icons */}
          <View style={styles.footerSocialsRow}>
            <TouchableOpacity onPress={() => Linking.openURL("https://github.com/taka-duarr/anime-stream")} style={[styles.socialIconCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="logo-github" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL("https://wa.me/6281357398265")} style={[styles.socialIconCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialIconCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="paper-plane" size={18} color="#0088cc" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Links Column */}
        <View style={[styles.footerLinkCol, isDesktop ? { width: "20%" } : { marginBottom: 20 }]}>
          <Text style={[styles.footerColTitle, { color: colors.text }]}>Menu Utama</Text>
          <TouchableOpacity onPress={() => navigation.navigate("HomeTab")} style={styles.footerLinkBtn}>
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Beranda</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("AnimeList", { type: "ongoing" })} style={styles.footerLinkBtn}>
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Anime Ongoing</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("AnimeList", { type: "completed" })} style={styles.footerLinkBtn}>
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Anime Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("GenreList")} style={styles.footerLinkBtn}>
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Genre List</Text>
          </TouchableOpacity>
        </View>

        {/* Features / Support Column */}
        <View style={[styles.footerLinkCol, isDesktop ? { width: "25%" } : { marginBottom: 20 }]}>
          <Text style={[styles.footerColTitle, { color: colors.text }]}>Dukungan & Legalitas</Text>
          <TouchableOpacity onPress={() => Linking.openURL("https://wa.me/6281357398265")} style={styles.footerLinkBtn}>
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Laporkan Bug</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerLinkBtn}>
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Kebijakan Privasi</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerLinkBtn}>
            <Text style={[styles.footerLinkText, { color: colors.textSecondary }]}>Syarat & Ketentuan</Text>
          </TouchableOpacity>
          <View style={styles.taglineBadge}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.taglineBadgeText, { color: colors.accent }]}>Safe & Secure</Text>
          </View>
        </View>
      </View>

      <View style={[styles.footerBottomRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.copyrightText, { color: colors.textMuted }]}>
          © {new Date().getFullYear()} Nganime App. Built with React Native Web & Expo 
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  webFooterContainer: {
    paddingTop: 48,
    borderTopWidth: 1,
    width: "100%",
    marginTop: 48,
    marginBottom: 0,
  },
  webFooterContent: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    flexWrap: "wrap",
    gap: 32,
  },
  footerBrandCol: {
    gap: 16,
  },
  footerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerLogoImg: {
    width: 48,
    height: 48,
  },
  footerLogoTextImg: {
    width: 120,
    height: 38,
  },
  footerDescription: {
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 450,
  },
  footerSocialsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  socialIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  footerLinkCol: {
    gap: 12,
  },
  footerColTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  footerLinkBtn: {
    paddingVertical: 2,
  },
  footerLinkText: {
    fontSize: 14,
  },
  taglineBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(230, 51, 51, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  taglineBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  footerBottomRow: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    marginTop: 40,
    alignItems: "center",
  },
  copyrightText: {
    fontSize: 13,
    textAlign: "center",
  },
});
