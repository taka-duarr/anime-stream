import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
  DimensionValue,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { WebFooter } from "../components/WebFooter";

const CARD_MARGIN = 10;
const ViewWeb = View as any;

const MyListScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  let numColumns = 2;
  if (width >= 768) numColumns = 6;
  else if (width >= 600) numColumns = 3;

  const listPadding = 16;
  const availableWidth = width - listPadding * 2;
  const CARD_WIDTH = availableWidth / numColumns - CARD_MARGIN;

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

      // Check if user is authenticated
      if (!isAuthenticated) {
        setMyList([]);
        setLoading(false);
        return;
      }

      // Fetch bookmarks from API
      console.log("[MY LIST SCREEN] Fetching bookmarks from API");
      const bookmarks = await api.getBookmarks();

      // Transform bookmarks to match the expected format
      const transformedList = bookmarks.map((bookmark) => ({
        animeId: bookmark.anime_id,
        title: bookmark.title,
        poster: bookmark.poster,
      }));

      setMyList(transformedList);
      console.log(
        "[MY LIST SCREEN] Loaded",
        transformedList.length,
        "bookmarks",
      );
    } catch (error: any) {
      console.error("[MY LIST SCREEN] Failed to load bookmarks:", error);

      // Handle token expiration
      if (error.response?.status === 401) {
        setError("Sesi Anda telah berakhir. Silakan login kembali.");
        // Note: AuthContext will handle logout and navigation
      } else if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("Network Error")
      ) {
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
      console.log("[MY LIST SCREEN] Removing bookmark:", animeId);

      // Call API to delete bookmark
      await api.deleteBookmark(animeId);

      // Update local state
      const updated = myList.filter((item) => item.animeId !== animeId);
      setMyList(updated);

      console.log("[MY LIST SCREEN] Bookmark removed successfully");
    } catch (error: any) {
      console.error("[MY LIST SCREEN] Failed to remove bookmark:", error);

      // Update error state so UI reflects the failure
      if (error.response?.status === 401) {
        setError("Sesi Anda telah berakhir. Silakan login kembali.");
      } else {
        setError("Gagal menghapus bookmark. Coba lagi.");
      }
    }
  };

  // ============================================
  // HANDLE LOGIN NAVIGATION
  // ============================================

  const handleLogin = () => {
    navigation.navigate("Login");
  };

  const renderHeader = (isInsideScroll: boolean = false) => (
    <View style={[styles.header, { borderBottomColor: colors.border }, (isDesktop && !isInsideScroll) && { paddingTop: 72 }]}>
      <View style={styles.headerTop}>

      </View>
      {myList.length > 0 && (
        <Text
          style={[styles.headerSubtitle, { color: colors.textSecondary }]}
        >
          {myList.length} anime tersimpan
        </Text>
      )}
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text
            style={[
              styles.text,
              { color: colors.textSecondary, marginTop: 12 },
            ]}
          >
            Memuat bookmark...
          </Text>
        </View>
      );
    }

    if (!isAuthenticated) {
      return (
        <View style={styles.center}>
          <View style={[styles.guestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.guestIconCircle, { backgroundColor: isDark ? "rgba(255, 71, 87, 0.15)" : "rgba(255, 71, 87, 0.08)" }]}>
              <Ionicons
                name="bookmark"
                size={36}
                color={colors.accent}
              />
            </View>
            
            <Text style={[styles.guestTitle, { color: colors.text }]}>
              Login Diperlukan
            </Text>
            
            <Text style={[styles.guestText, { color: colors.textSecondary }]}>
              Silakan login untuk menyimpan anime favorit Anda dan sinkronisasi daftar tontonan di semua perangkat Anda.
            </Text>
            
            <TouchableOpacity
              style={[styles.guestLoginButton, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
              onPress={handleLogin}
            >
              <Ionicons
                name="log-in"
                size={20}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.guestLoginButtonText}>Masuk Ke Akun</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.accent}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            Terjadi Kesalahan
          </Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.exploreButton, { backgroundColor: colors.accent }]}
            onPress={loadMyList}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.exploreButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (myList.length === 0) {
      return (
        <View style={styles.center}>
          <Ionicons
            name="bookmark-outline"
            size={64}
            color={colors.textMuted}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            Belum Ada Anime
          </Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Tambahkan anime favorit Anda ke My List
          </Text>
          <TouchableOpacity
            style={[styles.exploreButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate("Main", { screen: "HomeTab" })}
          >
            <Text style={styles.exploreButtonText}>Jelajahi Anime</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.gridRow}>
        {myList.map((item, i) => (
          <ViewWeb
            key={item.animeId ?? i}
            className="web-card-hover"
            style={[
              styles.card,
              {
                width: CARD_WIDTH as DimensionValue,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                overflow: "hidden",
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() =>
                navigation.navigate("Episode", {
                  bookId: item.animeId,
                  title: item.title,
                })
              }
              style={{ flex: 1 }}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri: item.poster || "https://via.placeholder.com/180x240",
                  }}
                  style={styles.image}
                  contentFit="cover"
                />
                {item.score && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={10} color="#FBBF24" />
                    <Text style={styles.ratingText}>{item.score}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.cardTitle, { color: colors.text }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.cardSub, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.type || "TV"} • {item.totalEpisodes || "?"} Eps
              </Text>
            </TouchableOpacity>

            {/* Professional Bottom Hapus Button */}
            <TouchableOpacity
              style={[
                styles.bottomRemoveBtn,
                {
                  backgroundColor: isDark ? "#2A1A1A" : "#FFF5F5",
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => setAnimeToDelete({ id: item.animeId, title: item.title })}
            >
              <Ionicons name="trash-outline" size={14} color="#FF4757" style={{ marginRight: 6 }} />
              <Text style={styles.bottomRemoveText}>Hapus List</Text>
            </TouchableOpacity>
          </ViewWeb>
        ))}
      </View>
    );
  };

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
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: isDesktop ? 72 : 0,
          paddingBottom: isDesktop ? 0 : 40,
        }}
      >
        {isDesktop && renderHeader(true)}

        {renderContent()}

        {Platform.OS === "web" && <WebFooter />}
      </ScrollView>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={animeToDelete !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAnimeToDelete(null)}
      >
        <TouchableOpacity
          style={styles.confirmModalOverlay}
          activeOpacity={1}
          onPress={() => setAnimeToDelete(null)}
        >
          <TouchableOpacity
            style={[styles.confirmModalCard, { backgroundColor: colors.card }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <View
              style={[
                styles.confirmModalIconWrap,
                { backgroundColor: "#FF475720" },
              ]}
            >
              <Ionicons name="trash-outline" size={32} color="#FF4757" />
            </View>

            {/* Title */}
            <Text style={[styles.confirmModalTitle, { color: colors.text }]}>
              Hapus dari List?
            </Text>

            {/* Subtitle */}
            <Text
              style={[
                styles.confirmModalSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              Apakah Anda yakin ingin menghapus "{animeToDelete?.title}" dari daftar bookmark Anda?
            </Text>

            {/* Divider */}
            <View
              style={[styles.confirmModalDivider, { backgroundColor: colors.border }]}
            />

            {/* Delete Button */}
            <TouchableOpacity
              style={[styles.confirmModalBtn, { backgroundColor: "#FF4757" }]}
              activeOpacity={0.85}
              onPress={() => {
                if (animeToDelete) {
                  removeFromList(animeToDelete.id);
                  setAnimeToDelete(null);
                }
              }}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.confirmModalBtnText}>Ya, Hapus</Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                styles.confirmModalCancelBtn,
                {
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setAnimeToDelete(null)}
            >
              <Text
                style={[
                  styles.confirmModalCancelBtnText,
                  { color: colors.textSecondary },
                ]}
              >
                Batal
              </Text>
            </TouchableOpacity>
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
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  text: {
    fontSize: 14,
    textAlign: "center",
  },
  exploreButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  exploreButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16 - CARD_MARGIN / 2,
    paddingTop: 16,
    paddingBottom: 64,
  },
  card: {
    marginBottom: 20,
    marginHorizontal: CARD_MARGIN / 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 0.67,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#E2E8F0",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  ratingBadge: {
    position: "absolute",
    bottom: 7,
    left: 7,
    backgroundColor: "rgba(15,23,42,0.8)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginHorizontal: 8,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 11,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  bottomRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    width: "100%",
  },
  bottomRemoveText: {
    color: "#FF4757",
    fontSize: 12,
    fontWeight: "700",
  },
  // CONFIRM MODAL STYLES
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmModalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmModalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmModalDivider: {
    width: "100%",
    height: 1,
    marginBottom: 16,
  },
  confirmModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  confirmModalBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  confirmModalCancelBtn: {
    width: "100%",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmModalCancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  guestCard: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
    marginTop: 40,
    marginBottom: 40,
  },
  guestIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  guestText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  guestLoginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#FF4757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  guestLoginButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default MyListScreen;
