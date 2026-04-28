import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { getAnimeDetail } from "../services/api";
import { Episode } from "../types/episode";
import { AnimeDetail } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");
const STORAGE_KEY = "@my_anime_list";

export default function EpisodeScreen({ route, navigation }: any) {
  const { bookId, title } = route.params ?? {};
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (!bookId) return;
    fetchData();
    checkBookmarkStatus();
  }, [bookId]);

  const checkBookmarkStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const list = JSON.parse(stored);
        const exists = list.some((item: any) => item.animeId === bookId);
        setIsBookmarked(exists);
      }
    } catch (error) {
      console.error("Failed to check bookmark:", error);
    }
  };

  const toggleBookmark = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let list = stored ? JSON.parse(stored) : [];

      if (isBookmarked) {
        // Remove from list
        list = list.filter((item: any) => item.animeId !== bookId);
      } else {
        // Add to list
        const bookmarkData = {
          animeId: detail?.animeId || bookId,
          title: detail?.title || title,
          poster: detail?.poster,
          score: detail?.score,
          type: detail?.type,
          totalEpisodes: detail?.totalEpisodes,
          addedAt: new Date().toISOString(),
        };
        list.unshift(bookmarkData);
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const animeDetail = await getAnimeDetail(bookId);

      // Map anime detail to episodes format
      const mappedEpisodes: Episode[] = animeDetail.episodeList.map(
        (ep: any, index: number) => ({
          chapterId: ep.episodeId,
          chapterIndex: index,
          chapterName: ep.title,
          isCharge: 0,
          cdnList: [
            {
              cdnDomain: "",
              isDefault: 1,
              videoPathList: [
                {
                  quality: 720,
                  videoPath: "",
                  isDefault: 1,
                  isVipEquity: 0,
                },
              ],
            },
          ],
          chapterImg: animeDetail.poster,
          duration: animeDetail.duration,
          releaseTime: ep.date,
        }),
      );

      setEpisodes(mappedEpisodes);
      setDetail(animeDetail);
    } catch (e: any) {
      console.error("Gagal memuat detail anime:", e);

      // Set user-friendly error message
      if (e.response?.status === 500) {
        setError(
          "Server sedang bermasalah. Silakan coba lagi nanti atau pilih anime lain.",
        );
      } else if (e.code === "ECONNABORTED" || e.message?.includes("timeout")) {
        setError("Koneksi timeout. Periksa koneksi internet Anda.");
      } else if (e.message?.includes("Network Error")) {
        setError("Tidak ada koneksi internet. Periksa koneksi Anda.");
      } else {
        setError("Gagal memuat detail anime. Silakan coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.bg,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>
          Memuat Detail...
        </Text>
      </View>
    );
  }

  // Error state UI
  if (error) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.bg,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={64} color={colors.accent} />
        <Text
          style={{
            marginTop: 16,
            fontSize: 18,
            fontWeight: "600",
            color: colors.text,
            textAlign: "center",
          }}
        >
          Oops! Terjadi Kesalahan
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {error}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 24, gap: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.accent,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={fetchData}
          >
            <Text style={{ color: "#FFF", fontWeight: "600" }}>Coba Lagi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: colors.card,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              Kembali
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderHeader = () => (
    <>
      {/* HERO IMAGE & HEADER */}
      <View style={styles.heroContainer}>
        <ImageBackground
          source={{
            uri: detail?.poster || "https://via.placeholder.com/400x600",
          }}
          style={styles.heroImage}
          resizeMode="cover"
        >
          {/* Top Toolbar */}
          <View style={[styles.toolbar, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.toolbarRight}>
              <TouchableOpacity style={[styles.iconButton, { marginLeft: 10 }]}>
                <Ionicons name="share-social-outline" size={22} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { marginLeft: 10 }]}
                onPress={toggleBookmark}
              >
                <Ionicons
                  name={isBookmarked ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={isBookmarked ? "#FF4757" : "#FFF"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Gradient memudar ke Background Utama */}
          <LinearGradient
            colors={[
              "transparent",
              isDark ? "rgba(18,18,18,0.8)" : "rgba(240,240,240,0.8)",
              colors.bg,
            ]}
            style={styles.heroGradient}
          />
        </ImageBackground>
      </View>

      {/* DETAIL CONTENT */}
      <View style={[styles.contentContainer, { backgroundColor: colors.bg }]}>
        {/* TITLE */}
        <Text style={[styles.titleText, { color: colors.text }]}>
          {detail?.title || title}
        </Text>

        {/* STATS: Score, Type, Status, Episodes */}
        <View style={styles.statsRow}>
          <Ionicons name="star" size={16} color={colors.accent} />
          <Text style={[styles.scoreText, { color: colors.accent }]}>
            {detail?.score || "N/A"}
          </Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {detail?.type || "TV"}
          </Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {detail?.status || "Ongoing"}
          </Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {episodes.length} Episodes
          </Text>
        </View>

        {/* TAGS */}
        <View style={styles.tagsRow}>
          {detail?.genreList?.slice(0, 5).map((genre, i) => (
            <View
              key={i}
              style={[
                styles.tagBadge,
                {
                  backgroundColor: isDark ? "rgba(230,51,51,0.15)" : "#FFE5E8",
                },
              ]}
            >
              <Text style={[styles.tagText, { color: colors.accent }]}>
                {genre.title}
              </Text>
            </View>
          ))}
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.watchButton, { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
            onPress={() => {
              if (episodes.length > 0) {
                navigation.navigate("Video", {
                  episode: episodes[0],
                  episodes,
                  animeId: bookId,
                });
              }
            }}
          >
            <Ionicons
              name="play-circle"
              size={24}
              color="#FFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.watchButtonText}>Watch Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.card }]}
            onPress={toggleBookmark}
          >
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={24}
              color={isBookmarked ? colors.accent : colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* SYNOPSIS */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Synopsis
        </Text>
        <Text
          style={[styles.synopsisText, { color: colors.textSecondary }]}
          numberOfLines={5}
        >
          {detail?.synopsis?.paragraphs?.join("\n\n") ||
            "No synopsis available."}
        </Text>

        {/* EPISODES LIST HEADER */}
        <View style={styles.episodeHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Episodes
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor="transparent"
        translucent
      />

      {/* 
        FlatList adalah satu-satunya wadah Gulir yang aktif.
        Rancangan ListHeaderComponent mengatur agar elemen Top Bar dan Judul
        bergulir sempurna menyatu bersamanya. Memory Caching / Lazy Load pun tak akan bocor 
      */}
      <FlatList
        data={episodes}
        keyExtractor={(item) => item.chapterId}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => (
          <View style={styles.listPaddingWrapper}>
            <TouchableOpacity
              style={[
                styles.episodeCardVertical,
                { backgroundColor: colors.card },
              ]}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("Video", {
                  episode: item,
                  episodes,
                  animeId: bookId,
                })
              }
            >
              <View style={styles.episodeImageWrapperVert}>
                <Image
                  source={{ uri: item.chapterImg || detail?.poster }}
                  style={styles.episodeImageVertical}
                />
                <View style={styles.episodeDurationBadge}>
                  <Text style={styles.episodeDurationText}>
                    {item.duration || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.episodeInfoVert}>
                <Text
                  style={[styles.episodeCardTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  Episode {index + 1}
                </Text>
                <Text
                  style={[
                    styles.episodeCardSubtitle,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {item.chapterName}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  heroContainer: {
    width: width,
    height: height * 0.55,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  toolbarRight: {
    flexDirection: "row",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroGradient: {
    height: 120,
    width: "100%",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    marginTop: -20, // Menarik konten naik sedikit menyatu dengan gradient
  },
  titleText: {
    fontFamily: "calibri",
    fontSize: 26,
    fontWeight: "800",
    color: "#001F3F", // Warna biru sangat gelap hampir hitam
    marginBottom: 8,
    lineHeight: 32,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF4757",
    marginLeft: 4,
  },
  dotSeparator: {
    fontSize: 14,
    color: "#999",
    marginHorizontal: 8,
  },
  statText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 8,
  },
  tagBadge: {
    backgroundColor: "#FFE5E8", // Pink sangat pudar
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: "#FF4757",
    fontSize: 12,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  watchButton: {
    flex: 1, // Mengambil ruang tersisa penuh
    backgroundColor: "#FF4757",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#FF4757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  watchButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    width: 50,
    height: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#001F3F",
    marginBottom: 8,
  },
  synopsisText: {
    fontSize: 14,
    color: "#4B5563", // Abu-abu tulisan
    lineHeight: 22,
    marginBottom: 24,
  },
  episodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  episodeCardVertical: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 12,
  },
  episodeImageWrapperVert: {
    width: 120,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 14,
  },
  episodeImageVertical: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  episodeInfoVert: {
    flex: 1,
    justifyContent: "center",
  },
  episodeDurationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  episodeDurationText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  episodeCardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#001F3F",
    marginBottom: 4,
  },
  episodeCardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  listPaddingWrapper: {
    paddingHorizontal: 16,
  },
});
