import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  useWindowDimensions,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { WebFooter } from "../components/WebFooter";
import { FadeIn, Glass, Lift, Rating, Shimmer, glassWebStyle } from "../components/ui";

const hoverBg = (base: any, hover: any) => ({ hovered, pressed }: any) => [base, (hovered || pressed) && hover];

const MyListScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 768;

  const [myList, setMyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [animeToDelete, setAnimeToDelete] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    loadMyList();
    // Refresh list when screen comes into focus
    const unsubscribe = navigation.addListener("focus", () => {
      loadMyList();
    });
    return unsubscribe;
  }, [navigation, isAuthenticated]);

  // ============================================
  // LOAD BOOKMARKS FROM API
  // ============================================
  const loadMyList = async () => {
    try {
      setLoading(true);
      setError("");

      if (!isAuthenticated) {
        setMyList([]);
        setLoading(false);
        return;
      }

      const bookmarks = await api.getBookmarks();
      const transformedList = bookmarks.map((bookmark) => ({
        animeId: bookmark.anime_id,
        title: bookmark.title,
        poster: bookmark.poster,
      }));
      setMyList(transformedList);
    } catch (error: any) {
      console.error("[MY LIST SCREEN] Failed to load bookmarks:", error);
      if (error.response?.status === 401) {
        setError("Sesi Anda telah berakhir. Silakan login kembali.");
      } else if (error.code === "ECONNABORTED" || error.message?.includes("Network Error")) {
        setError("Koneksi gagal. Periksa internet Anda.");
      } else {
        setError("Gagal memuat bookmark. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // REMOVE BOOKMARK
  // ============================================
  const removeFromList = async (animeId: string) => {
    try {
      await api.deleteBookmark(animeId);
      setMyList((prev) => prev.filter((item) => item.animeId !== animeId));
    } catch (error: any) {
      console.error("[MY LIST SCREEN] Failed to remove bookmark:", error);
      if (error.response?.status === 401) {
        setError("Sesi Anda telah berakhir. Silakan login kembali.");
      } else {
        setError("Gagal menghapus bookmark. Coba lagi.");
      }
    }
  };

  // Layout
  const pad = isDesktop ? 24 : 12;
  const contentMax = 1480;
  const cols = width >= 1280 ? 7 : width >= 1040 ? 6 : width >= 768 ? 5 : width >= 520 ? 3 : 2;
  const gap = isDesktop ? 18 : 12;
  const cardWidth = (Math.min(width, contentMax) - pad * 2 - gap * (cols - 1)) / cols;

  // A centered glass card for the guest / error / empty states
  const stateCard = (
    icon: any,
    title: string,
    text: string,
    actionLabel: string,
    actionIcon: any,
    onAction: () => void,
  ) => (
    <FadeIn style={{ alignSelf: "center", width: "100%", maxWidth: 440, marginTop: 28 }}>
      <Glass radius={28} style={{ padding: 32, alignItems: "center" }}>
        <View style={[styles.stateIcon, { backgroundColor: colors.searchBg, borderColor: colors.glassBorder }]}>
          <Ionicons name={icon} size={30} color={colors.text} />
        </View>
        <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800", marginTop: 18, textAlign: "center" }}>
          {title}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 }}>
          {text}
        </Text>
        <Lift onPress={onAction} hoverScale={1.04} lift={2} style={{ marginTop: 22 }}>
          <View style={[styles.primaryBtn, { backgroundColor: colors.buttonPrimaryBg }]}>
            <Ionicons name={actionIcon} size={17} color={colors.buttonPrimaryText} />
            <Text style={{ color: colors.buttonPrimaryText, fontSize: 14, fontWeight: "700" }}>{actionLabel}</Text>
          </View>
        </Lift>
      </Glass>
    </FadeIn>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={[styles.grid, { gap, marginTop: 24 }]}>
          {Array.from({ length: cols * 2 }).map((_, i) => (
            <Shimmer key={i} style={{ width: cardWidth, height: cardWidth / 0.7, borderRadius: 18 }} />
          ))}
        </View>
      );
    }

    if (!isAuthenticated) {
      return stateCard(
        "bookmark",
        "Login Diperlukan",
        "Silakan login untuk menyimpan anime favorit Anda dan sinkronisasi daftar tontonan di semua perangkat Anda.",
        "Masuk Ke Akun",
        "log-in",
        () => navigation.navigate("Login"),
      );
    }

    if (error) {
      return stateCard("alert-circle-outline", "Terjadi Kesalahan", error, "Coba Lagi", "refresh-outline", loadMyList);
    }

    if (myList.length === 0) {
      return stateCard(
        "bookmark-outline",
        "Belum Ada Anime",
        "Tambahkan anime favorit Anda ke My List",
        "Jelajahi Anime",
        "compass-outline",
        () => navigation.navigate("Main", { screen: "HomeTab" }),
      );
    }

    return (
      <View style={[styles.grid, { gap, marginTop: 24 }]}>
        {myList.map((item, i) => (
          <FadeIn key={item.animeId ?? i} delay={Math.min(i, 20) * 40}>
            <View style={{ width: cardWidth }}>
              <Lift
                onPress={() => navigation.navigate("Episode", { bookId: item.animeId, title: item.title })}
                accessibilityLabel={item.title}
              >
                <View style={[styles.poster, { borderColor: colors.glassBorder, backgroundColor: colors.card }]}>
                  <Image
                    source={{ uri: item.poster || "https://via.placeholder.com/180x240" }}
                    style={StyleSheet.absoluteFill as any}
                    contentFit="cover"
                    transition={300}
                  />
                  <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.75)"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
                  {item.score ? (
                    <View style={{ position: "absolute", left: 10, bottom: 9 }}>
                      <Rating score={item.score} size={11} color="#FFF" />
                    </View>
                  ) : null}
                </View>
              </Lift>

              {/* Remove from list */}
              <Pressable
                onPress={() => setAnimeToDelete({ id: item.animeId, title: item.title })}
                accessibilityLabel={`Hapus ${item.title} dari list`}
                style={hoverBg([styles.removeBtn, glassWebStyle(12)], { backgroundColor: "rgba(236,43,85,0.9)" })}
              >
                <Ionicons name="trash-outline" size={15} color="#FFF" />
              </Pressable>

              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
                {item.type || "TV"} • {item.totalEpisodes || "?"} Eps
              </Text>
            </View>
          </FadeIn>
        ))}
      </View>
    );
  };

  const fan = myList.slice(0, 4);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: isDesktop ? 84 : insets.top + 8 }}
      >
        <View style={{ width: "100%", maxWidth: contentMax, alignSelf: "center", paddingHorizontal: pad, flexGrow: 1, paddingBottom: 48 }}>
          {/* HEADER STAGE */}
          <FadeIn duration={750} distance={22}>
            <Glass radius={28} style={[styles.header, { minHeight: isDesktop ? 190 : 150 }]}>
              <LinearGradient
                colors={[isDark ? "rgba(236,43,85,0.20)" : "rgba(225,29,72,0.12)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={{ flex: 1, justifyContent: "flex-end", padding: isDesktop ? 32 : 20 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "700", letterSpacing: 1.2 }}>
                  KOLEKSI
                </Text>
                <Text style={[styles.headerTitle, { color: colors.text, fontSize: isDesktop ? 46 : 32 }]}>My List</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
                  {isAuthenticated && myList.length > 0
                    ? `${myList.length} anime tersimpan`
                    : "Anime yang kamu simpan muncul di sini"}
                </Text>
              </View>

              {/* Fanned posters of the newest saves */}
              {fan.length > 0 && width >= 560 && (
                <View style={styles.fanWrap} pointerEvents="none">
                  {fan.map((item, i) => (
                    <FadeIn
                      key={item.animeId}
                      delay={200 + i * 90}
                      distance={30}
                      style={[
                        styles.fanCard,
                        {
                          right: i * 62,
                          zIndex: 10 - i,
                          transform: [{ rotate: `${(i - 1.5) * -5}deg` }],
                          borderColor: colors.glassBorder,
                        },
                      ]}
                    >
                      <Image source={{ uri: item.poster }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    </FadeIn>
                  ))}
                </View>
              )}
            </Glass>
          </FadeIn>

          {renderContent()}
        </View>

        {Platform.OS === "web" && <WebFooter />}
      </ScrollView>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={animeToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAnimeToDelete(null)}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setAnimeToDelete(null)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 400 }}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder },
                glassWebStyle(30),
              ]}
            >
              <View style={[styles.stateIcon, { backgroundColor: "rgba(236,43,85,0.16)", borderColor: "rgba(236,43,85,0.35)" }]}>
                <Ionicons name="trash-outline" size={28} color="#EC2B55" />
              </View>
              <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800", marginTop: 16 }}>Hapus dari List?</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 }}>
                Apakah Anda yakin ingin menghapus "{animeToDelete?.title}" dari daftar bookmark Anda?
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 24, alignSelf: "stretch" }}>
                <Pressable
                  onPress={() => setAnimeToDelete(null)}
                  style={hoverBg(
                    [styles.modalBtn, { backgroundColor: colors.searchBg, borderWidth: 1, borderColor: colors.glassBorder }],
                    { backgroundColor: colors.glassHover },
                  )}
                >
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (animeToDelete) {
                      removeFromList(animeToDelete.id);
                      setAnimeToDelete(null);
                    }
                  }}
                  style={hoverBg([styles.modalBtn, { backgroundColor: "#EC2B55" }], { opacity: 0.88 })}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFF" />
                  <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700" }}>Ya, Hapus</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { overflow: "hidden" },
  headerTitle: { fontWeight: "800", letterSpacing: -1, marginTop: 2 },
  fanWrap: { position: "absolute", right: 44, top: 22, bottom: -30, width: 320 },
  fanCard: {
    position: "absolute",
    top: 0,
    width: 124,
    height: 176,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    ...Platform.select({ web: { boxShadow: "0 18px 40px rgba(0,0,0,0.45)" } as any }),
  } as any,
  grid: { flexDirection: "row", flexWrap: "wrap" },
  poster: { width: "100%", aspectRatio: 0.7, borderRadius: 18, overflow: "hidden", borderWidth: 1 },
  removeBtn: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,21,24,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  cardTitle: { fontSize: 13.5, fontWeight: "600", lineHeight: 18, marginTop: 9 },
  stateIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 23,
  },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 28, borderWidth: 1, padding: 28, alignItems: "center" },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

export default MyListScreen;
