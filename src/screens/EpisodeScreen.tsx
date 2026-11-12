import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  Dimensions,
  Platform,
  useWindowDimensions,
  Alert,
  Pressable,
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
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import EpisodeList from "../components/EpisodeList";
import CommentSection from "../components/CommentSection";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FadeIn, Glass, Lift, Rating, Shimmer, StatusPill, glassWebStyle, webAnim } from "../components/ui";

const isWeb = Platform.OS === "web";

const parseDurationToSeconds = (durationStr?: string): number => {
  if (!durationStr) return 24 * 60;
  const clean = durationStr.toLowerCase().trim();
  const minMatch = clean.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;
  const timeMatch = clean.match(/(\d+):(\d+)/);
  if (timeMatch) return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
  const num = parseInt(clean, 10);
  if (!isNaN(num)) return num * 60;
  return 24 * 60;
};

const getCleanEpisodeTitle = (episodeName: string, animeTitle?: string) => {
  if (!episodeName) return "";

  const episodePattern = /(Episode\s+\d+|Ep\s+\d+|OVA\s+\d+|Special\s+\d+|Movie\s+\d+|SP\s+\d+)/i;
  const match = episodeName.match(episodePattern);

  if (match) {
    return match[0];
  }

  let cleanName = episodeName;
  if (animeTitle) {
    const escapedTitle = animeTitle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedTitle, 'gi');
    cleanName = cleanName.replace(regex, '').trim();
  }

  cleanName = cleanName.replace(/Subtitle Indonesia/gi, '')
                        .replace(/Sub Indo/gi, '')
                        .trim();

  cleanName = cleanName.replace(/^[:\-\s\s]+/, '').trim();

  return cleanName || episodeName;
};

const { width, height } = Dimensions.get("window");

export default function EpisodeScreen({ route, navigation }: any) {
  const { bookId, title } = route.params ?? {};
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState<string[]>([]);
  const [isPlayingWeb, setIsPlayingWeb] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  const { width, height: windowHeight } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  // Desktop Streaming States
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [activeServer, setActiveServer] = useState<any>(null);
  const [streamingUrl, setStreamingUrl] = useState<string>("");
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [episodeDetail, setEpisodeDetail] = useState<any>(null);
  const [relatedSeries, setRelatedSeries] = useState<any[]>([]);
  const [suggestedSeries, setSuggestedSeries] = useState<any[]>([]);
  const [watchProgress, setWatchProgress] = useState<Record<string, { watchedSeconds: number; totalSeconds: number }>>({});
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);

  const activeQuality = useMemo(() => {
    if (!activeServer || !episodeDetail?.serverqualities) return "";
    for (const q of episodeDetail.serverqualities) {
      if (q.serverList?.some((s: any) => s.serverId === activeServer.serverId)) {
        return (q.title || "").trim();
      }
    }
    return "";
  }, [activeServer, episodeDetail]);

  const activeServerLabel = useMemo(() => {
    if (loadingVideo) return "Menghubungkan...";
    if (!activeServer || activeServer.title === "Default" || activeServer.serverId === "") {
      return "Default";
    }
    const cleanTitle = (activeServer.title || "").trim();
    return activeQuality ? `${cleanTitle} (${activeQuality})` : cleanTitle;
  }, [activeServer, activeQuality, loadingVideo]);

  const allServerOptions = useMemo(() => {
    if (!episodeDetail?.serverqualities) return [];
    return episodeDetail.serverqualities.flatMap((q: any) => {
      const cleanQuality = (q.title || "").trim();
      return (q.serverList || []).map((s: any) => {
        const cleanServer = (s.title || "").trim();
        return {
          ...s,
          title: cleanServer,
          qualityTitle: cleanQuality,
          label: `${cleanServer} (${cleanQuality})`,
        };
      });
    });
  }, [episodeDetail]);

  // Load streaming URL for desktop player
  const loadStreamingUrl = async (episodeId: string, server?: any) => {
    try {
      setLoadingVideo(true);
      console.log("[EPISODE SCREEN] Loading streaming url for:", episodeId);
      const epDetail = await api.getEpisodeDetail(episodeId);
      setEpisodeDetail(epDetail);

      // We no longer trigger watch history on page load/mount
      // History is strictly logged upon explicit clicks on play or dropdown changes.

      if (server) {
        setActiveServer(server);
        const serverData = await api.getServerStreamingUrl(server.serverId);
        const url = serverData.streamingUrl || serverData.url;
        setStreamingUrl(url || "");
      } else {
        let defaultUrl = epDetail.defaultStreamingUrl;
        const isProblematic = defaultUrl && (
          defaultUrl.includes("/ondesu/v5/") ||
          defaultUrl.includes("/ondesu3/v5/") ||
          defaultUrl.includes("/updesu/v5/") ||
          defaultUrl.includes("/otakuplay/v2/")
        );

        if (!isProblematic && defaultUrl) {
          setStreamingUrl(defaultUrl);
          setActiveServer({ title: "Default", serverId: "" });
        } else if (epDetail.serverqualities && epDetail.serverqualities.length > 0) {
          const firstQuality = epDetail.serverqualities[0];
          if (firstQuality.serverList && firstQuality.serverList.length > 0) {
            const firstServer = firstQuality.serverList[0];
            setActiveServer(firstServer);
            const serverData = await api.getServerStreamingUrl(firstServer.serverId);
            const url = serverData.streamingUrl || serverData.url;
            setStreamingUrl(url || "");
          }
        } else {
          setStreamingUrl(defaultUrl || "");
          setActiveServer(null);
        }
      }
    } catch (err) {
      console.error("[EPISODE SCREEN] Error loading streaming url:", err);
    } finally {
      setLoadingVideo(false);
    }
  };

  // Load sidebar recommendations
  useEffect(() => {
    fetchRecommendations();
  }, [bookId]);

  const fetchRecommendations = async () => {
    try {
      console.log("[EPISODE SCREEN] Loading recommendations: completed & ongoing");
      
      // Top Rated / Completed series
      const completedData = await api.getCompleteAnime(1);
      const completedList = Array.isArray(completedData) ? completedData : (completedData as any)?.animeList || [];
      const filteredCompleted = completedList.filter((item: any) => item.animeId !== bookId);
      setRelatedSeries(filteredCompleted.slice(0, 4));

      // Ongoing series
      const ongoingData = await api.getOngoingAnime(1);
      const ongoingList = Array.isArray(ongoingData) ? ongoingData : (ongoingData as any)?.animeList || [];
      const filteredOngoing = ongoingList.filter((item: any) => item.animeId !== bookId);
      setSuggestedSeries(filteredOngoing.slice(0, 4));
    } catch (err) {
      console.error("[EPISODE SCREEN] Error loading recommendations:", err);
    }
  };

  useEffect(() => {
    if (!bookId) return;
    setIsPlayingWeb(false);
    fetchData();
    checkBookmarkStatus();
  }, [bookId, isAuthenticated]);

  // Track watch progress periodically on desktop
  useEffect(() => {
    if (!isDesktop || !isPlayingWeb || !activeEpisode) return;

    const start = Date.now();
    const episodeId = activeEpisode.chapterId;
    const totalSeconds = parseDurationToSeconds(activeEpisode.duration || detail?.duration);

    // Get current progress for this episode if any
    const existingProgress = watchProgress[episodeId]?.watchedSeconds || 0;

    console.log("[PROGRESS TRACKER] Started for:", episodeId, "with duration:", totalSeconds);

    const interval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const currentWatched = Math.min(existingProgress + elapsed, totalSeconds);

      // Update state
      setWatchProgress(prev => {
        const updated = {
          ...prev,
          [episodeId]: {
            watchedSeconds: currentWatched,
            totalSeconds,
          }
        };

        // Save to AsyncStorage
        AsyncStorage.setItem("anime_stream_watch_progress", JSON.stringify(updated))
          .catch(err => console.error("Gagal menyimpan progress tontonan:", err));

        return updated;
      });
    }, 5000); // Check and save every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isPlayingWeb, activeEpisode?.chapterId, isDesktop]);

  // ============================================
  // CHECK BOOKMARK STATUS FROM API
  // ============================================

  const checkBookmarkStatus = async () => {
    try {
      if (!isAuthenticated) {
        setIsBookmarked(false);
        return;
      }

      console.log("[EPISODE SCREEN] Checking bookmark status for:", bookId);
      const bookmarked = await api.isBookmarked(bookId);
      setIsBookmarked(bookmarked);
      console.log("[EPISODE SCREEN] Bookmark status:", bookmarked);
    } catch (error) {
      console.error("[EPISODE SCREEN] Failed to check bookmark:", error);
      setIsBookmarked(false);
    }
  };

  // ============================================
  // TOGGLE BOOKMARK WITH AUTHENTICATION CHECK
  // ============================================

  const toggleBookmark = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // On web, Alert.alert doesn't support multi-button callbacks — navigate directly
      navigation.navigate("Login", {
        returnTo: "Episode",
        onLoginSuccess: async () => {
          await performBookmarkToggle();
        },
      });
      return;
    }

    // User is authenticated, proceed with bookmark
    await performBookmarkToggle();
  };

  // ============================================
  // PERFORM BOOKMARK TOGGLE
  // ============================================

  const performBookmarkToggle = async () => {
    try {
      setBookmarkLoading(true);

      const bookmarkData: api.Bookmark = {
        anime_id: detail?.animeId || bookId,
        title: detail?.title || title,
        poster: detail?.poster || "",
      };

      console.log("[EPISODE SCREEN] Toggling bookmark:", bookmarkData);
      const newBookmarkStatus = await api.toggleBookmark(bookmarkData);
      setIsBookmarked(newBookmarkStatus);

      console.log(
        "[EPISODE SCREEN] Bookmark toggled successfully:",
        newBookmarkStatus,
      );
    } catch (error: any) {
      console.error("[EPISODE SCREEN] Failed to toggle bookmark:", error);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch watch history if logged in
      if (isAuthenticated) {
        try {
          const watched = await api.getWatchHistory(bookId);
          setWatchedEpisodes(watched || []);
        } catch (err) {
          console.error("Gagal memuat riwayat tontonan:", err);
        }
      } else {
        setWatchedEpisodes([]);
      }

      try {
        const stored = await AsyncStorage.getItem("anime_stream_watch_progress");
        if (stored) {
          setWatchProgress(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Gagal memuat progress tontonan lokal:", err);
      }

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

      // Sort episodes from newest to oldest
      const getEpisodeNumber = (title: string): number => {
        const match = title.match(/(?:Episode|Ep)\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      };

      const sortedEpisodes = [...mappedEpisodes].sort((a, b) => {
        const numA = getEpisodeNumber(a.chapterName);
        const numB = getEpisodeNumber(b.chapterName);
        if (numA !== numB) {
          return numB - numA; // Descending: newest (larger number) first
        }
        return 0; // Keep original order if numbers are same
      });

      setEpisodes(sortedEpisodes);
      setDetail(animeDetail);

      // Hot-select first episode on desktop load
      if (isDesktop && sortedEpisodes.length > 0) {
        setActiveEpisode(sortedEpisodes[0]);
        loadStreamingUrl(sortedEpisodes[0].chapterId);
      }
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

  // ============================================
  // SHARED ACTIONS (used by the stage, the rail and the side panel)
  // ============================================

  const markWatched = (episodeId: string) => {
    if (!isAuthenticated || !bookId || !episodeId) return;
    api
      .saveWatchHistory(bookId, episodeId)
      .then(() => setWatchedEpisodes((prev) => (prev.includes(episodeId) ? prev : [...prev, episodeId])))
      .catch((err) => console.error("Gagal menyimpan riwayat:", err));
  };

  // Desktop: pick an episode for the inline player
  const selectEpisode = (ep: Episode) => {
    setActiveEpisode(ep);
    setIsPlayingWeb(false);
    loadStreamingUrl(ep.chapterId);
    markWatched(ep.chapterId);
  };

  // Desktop: start the inline player for the active episode
  const startPlaying = () => {
    setIsPlayingWeb(true);
    if (activeEpisode?.chapterId) markWatched(activeEpisode.chapterId);
  };

  // Mobile: open an episode in the full-screen player
  const openInPlayer = (ep: Episode) => {
    markWatched(ep.chapterId);
    navigation.navigate("Video", { episode: ep, episodes, animeId: bookId });
  };

  const downloadActive = () => {
    const urls = episodeDetail?.downloadUrlqualities?.[0]?.urls;
    if (urls && urls.length > 0) {
      if (typeof globalThis !== "undefined" && (globalThis as any).window) {
        (globalThis as any).window.open(urls[0].url, "_blank");
      }
    } else {
      Alert.alert("Unduh", "Tautan unduhan tidak tersedia untuk episode ini.");
    }
  };

  const animeTitle = detail?.title || title;
  const isOngoing = (detail?.status || "").toLowerCase().includes("ongoing");
  const epNumber = (ep: Episode) => {
    const m = ep.chapterName.match(/(?:Episode|Ep)\s*(\d+)/i);
    return m ? m[1].padStart(2, "0") : "•";
  };
  const hoverBg = (base: any, hover: any) => ({ hovered, pressed }: any) => [base, (hovered || pressed) && hover];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, padding: isDesktop ? 24 : 12, paddingTop: isDesktop ? 24 : insets.top + 12 }]}>
        <View style={{ flexDirection: "row", gap: 16, flex: 1 }}>
          <Shimmer style={{ flex: 1, borderRadius: 28 }} />
          {isDesktop && width >= 1120 && <Shimmer style={{ width: 340, borderRadius: 28 }} />}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", padding: 20 }]}>
        <Glass radius={28} style={{ padding: 32, alignItems: "center", maxWidth: 440 }}>
          <Ionicons name="alert-circle-outline" size={56} color={colors.accent} />
          <Text style={{ marginTop: 16, fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "center" }}>
            Oops! Terjadi Kesalahan
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 }}>
            {error}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 24, gap: 12 }}>
            <Pressable style={[styles.pillBtn, { backgroundColor: colors.buttonPrimaryBg }]} onPress={fetchData}>
              <Text style={{ color: colors.buttonPrimaryText, fontWeight: "700" }}>Coba Lagi</Text>
            </Pressable>
            <Pressable
              style={[styles.pillBtn, { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>Kembali</Text>
            </Pressable>
          </View>
        </Glass>
      </View>
    );
  }

  // ---------------- hero text block (shared) ----------------
  const heroInfo = (compact: boolean) => (
    <View style={{ paddingHorizontal: compact ? 20 : 52, maxWidth: compact ? undefined : 760 }}>
      <FadeIn distance={22}>
        <Text
          style={[styles.heroTitle, compact ? { fontSize: 28, lineHeight: 34 } : { fontSize: 46, lineHeight: 52 }]}
          numberOfLines={3}
        >
          {animeTitle}
          {isDesktop && activeEpisode ? (
            <Text style={{ color: "rgba(255,255,255,0.55)" }}>
              {"  |  "}
              {getCleanEpisodeTitle(activeEpisode.chapterName, animeTitle)}
            </Text>
          ) : null}
        </Text>
      </FadeIn>
      <FadeIn delay={90} style={styles.heroMeta}>
        <Rating score={detail?.score || "N/A"} size={15} color="#FFF" />
        <View style={styles.dot} />
        <StatusPill kind={isOngoing ? "ongoing" : "completed"} label={detail?.status || "Ongoing"} onDark />
        <View style={styles.dot} />
        <Text style={styles.heroMetaText}>{detail?.type || "TV"}</Text>
        <View style={styles.dot} />
        <Text style={styles.heroMetaText}>{episodes.length} Episodes</Text>
      </FadeIn>
      <FadeIn delay={150} style={styles.genreRow}>
        {detail?.genreList?.slice(0, 5).map((genre, i) => (
          <View key={i} style={[styles.genreChip, glassWebStyle(12)]}>
            <Text style={styles.genreChipText}>{genre.title}</Text>
          </View>
        ))}
      </FadeIn>
      <FadeIn delay={210}>
        <Text style={styles.heroSynopsis} numberOfLines={compact ? 5 : 4}>
          {detail?.synopsis?.paragraphs?.join("\n\n") || "No synopsis available."}
        </Text>
      </FadeIn>
      <FadeIn delay={270} style={styles.heroActions}>
        <Lift
          hoverScale={1.05}
          lift={2}
          accessibilityLabel="Watch Now"
          onPress={() => {
            if (isDesktop) startPlaying();
            else if (episodes.length > 0) openInPlayer(episodes[episodes.length - 1]);
          }}
        >
          <View style={styles.watchBtn}>
            <Ionicons name="play" size={15} color="#0B0C0E" />
            <Text style={styles.watchBtnText}>Watch Now</Text>
          </View>
        </Lift>
        <Lift hoverScale={1.05} lift={2} onPress={toggleBookmark} disabled={bookmarkLoading} accessibilityLabel="My List">
          <View style={[styles.ghostBtn, glassWebStyle(14), isBookmarked && { backgroundColor: "rgba(255,255,255,0.28)" }]}>
            {bookmarkLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name={isBookmarked ? "bookmark" : "add"} size={16} color="#FFF" />
                <Text style={styles.ghostBtnText}>{isBookmarked ? "Saved to List" : "My List"}</Text>
              </>
            )}
          </View>
        </Lift>
        {isDesktop && (
          <Lift hoverScale={1.08} lift={2} onPress={downloadActive} accessibilityLabel="Download">
            <View style={[styles.roundBtn, glassWebStyle(14)]}>
              <Ionicons name="download-outline" size={17} color="#FFF" />
            </View>
          </Lift>
        )}
      </FadeIn>
    </View>
  );

  // ---------------- DESKTOP ----------------
  if (isDesktop) {
    const wide = width >= 1120;
    const stageMin = Math.max(windowHeight - 48, 640);

    const sidePanel = (
      <Glass radius={28} style={wide ? { width: 344, maxHeight: Math.max(stageMin, 720) } : { marginTop: 16, maxHeight: 640 }}>
        {/* Anime identity, like the channel header in the reference */}
        <View style={{ padding: 20, flexDirection: "row", gap: 14, alignItems: "center" }}>
          <Image source={{ uri: detail?.poster }} style={styles.panelAvatar as any} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 15.5, fontWeight: "800" }} numberOfLines={2}>
              {detail?.studios || animeTitle}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 3 }} numberOfLines={1}>
              {[detail?.releaseDate, detail?.duration].filter(Boolean).join(" · ") || "Anime"}
            </Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginBottom: 4 }} />

        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 12, paddingTop: 10 }}>
          {([
            ["Top Rated", relatedSeries, "completed", "Anime Completed", "Completed"],
            ["Ongoing Series", suggestedSeries, "ongoing", "Anime Ongoing", "Ongoing"],
          ] as const).map(([heading, list, type, listTitle, fallback], gi) => (
            <View key={heading} style={{ marginTop: gi === 0 ? 0 : 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, marginBottom: 6 }}>
                <Text style={[styles.panelTitle, { color: colors.text, flex: 1, marginBottom: 0, paddingHorizontal: 0 }]}>{heading}</Text>
                <Pressable onPress={() => navigation.navigate("AnimeList", { type, title: listTitle })}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "700" }}>VIEW ALL</Text>
                </Pressable>
              </View>
              {list.length > 0 ? (
                list.map((item: any, i: number) => (
                  <FadeIn key={item.animeId} delay={i * 60}>
                    <Pressable
                      onPress={() => navigation.push("Episode", { bookId: item.animeId, title: item.title })}
                      style={hoverBg(styles.recRow, { backgroundColor: colors.glass })}
                    >
                      <Image source={{ uri: item.poster }} style={styles.recPoster as any} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 19 }} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                          <Rating score={item.score} size={12} />
                          <StatusPill kind={type} label={item.status || fallback} small />
                        </View>
                      </View>
                    </Pressable>
                  </FadeIn>
                ))
              ) : (
                <ActivityIndicator size="small" color={colors.text} style={{ alignSelf: "flex-start", margin: 10 }} />
              )}
            </View>
          ))}
        </ScrollView>
      </Glass>
    );

    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar style="light" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 1480, alignSelf: "center" }}>
            <FadeIn duration={800} distance={26} style={{ zIndex: isServerMenuOpen ? 9999 : 2, position: "relative" }}>
              <View style={wide ? { flexDirection: "row", gap: 16, alignItems: "flex-start" } : undefined}>
                {/* STAGE */}
                <View style={[styles.stage, { flex: wide ? 1 : undefined, minHeight: stageMin, borderColor: colors.glassBorder, zIndex: isServerMenuOpen ? 9999 : 2 }]}>
                  {/* Background art (contained with rounded corners so dropdown can overflow gracefully) */}
                  <View style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: "hidden" }]}>
                    <View style={[StyleSheet.absoluteFill, webAnim.kenburns]}>
                      <Image source={{ uri: detail?.poster }} style={StyleSheet.absoluteFill as any} contentFit="cover" blurRadius={28} />
                    </View>
                    <LinearGradient
                      colors={["rgba(8,9,11,0.93)", "rgba(8,9,11,0.6)", "rgba(8,9,11,0.12)"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 0.9, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      colors={["rgba(8,9,11,0.35)", "rgba(8,9,11,0.5)", "rgba(8,9,11,0.96)"]}
                      locations={[0, 0.55, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>

                  {/* Back */}
                  <Pressable
                    onPress={() => navigation.goBack()}
                    style={hoverBg([styles.backBtn, glassWebStyle(14)], { backgroundColor: "rgba(255,255,255,0.26)" })}
                  >
                    <Ionicons name="arrow-back" size={16} color="#FFF" />
                    <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}>Kembali ke Beranda</Text>
                  </Pressable>

                  {isPlayingWeb ? (
                    /* PLAYER MODE */
                    <FadeIn style={{ paddingHorizontal: 28, paddingTop: 76 }}>
                      <View style={styles.playerFrame}>
                        {streamingUrl ? (
                          <iframe
                            key={streamingUrl}
                            src={api.getProxiedVideoUrl(streamingUrl)}
                            style={{ width: "100%", height: "100%", border: "none", backgroundColor: "black" }}
                            allowFullScreen
                            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <View style={styles.playerCenter}>
                            <ActivityIndicator size="large" color="#FFF" />
                            <Text style={{ color: "white", marginTop: 16 }}>Memuat Video...</Text>
                          </View>
                        )}
                        {loadingVideo && (
                          <View style={[StyleSheet.absoluteFill, styles.playerCenter, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                            <ActivityIndicator size="large" color="#FFF" />
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
                        <View style={{ flex: 1, minWidth: 260 }}>
                          <Text style={{ color: "#FFF", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 }} numberOfLines={2}>
                            {animeTitle}
                          </Text>
                          {activeEpisode && (
                            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "600", marginTop: 4 }}>
                              Sedang Menonton: {getCleanEpisodeTitle(activeEpisode.chapterName, animeTitle)}
                            </Text>
                          )}
                        </View>
                        <Pressable
                          onPress={toggleBookmark}
                          disabled={bookmarkLoading}
                          style={hoverBg([styles.ghostBtn, glassWebStyle(14), { height: 40 }], { backgroundColor: "rgba(255,255,255,0.26)" })}
                        >
                          {bookmarkLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={15} color="#FFF" />
                              <Text style={styles.ghostBtnText}>{isBookmarked ? "Saved to List" : "Save to List"}</Text>
                            </>
                          )}
                        </Pressable>
                        <Pressable
                          onPress={downloadActive}
                          style={hoverBg([styles.watchBtn, { height: 40 }], { opacity: 0.86 })}
                        >
                          <Ionicons name="download" size={15} color="#0B0C0E" />
                          <Text style={styles.watchBtnText}>Download</Text>
                        </Pressable>
                      </View>
                    </FadeIn>
                  ) : (
                    /* HERO MODE */
                    <View style={{ flex: 1, justifyContent: "flex-end", paddingTop: 90 }}>
                      <View style={[styles.keyArtWrap, webAnim.float]}>
                        <Image source={{ uri: detail?.poster }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                      </View>
                      {heroInfo(false)}
                    </View>
                  )}

                  {/* SERVER SELECTOR (Glassmorphic Vertical Dropdown) */}
                  <View style={[styles.serverRowWrap, { paddingHorizontal: isPlayingWeb ? 28 : 52 }]}>
                    <View style={styles.serverRowInner}>
                      <Text style={styles.serverLabel}>Servers</Text>

                      {/* Dropdown Anchor & Button */}
                      <View style={styles.dropdownAnchor}>
                        <Pressable
                          onPress={() => setIsServerMenuOpen((prev) => !prev)}
                          style={hoverBg(
                            [
                              styles.serverTriggerBtn,
                              {
                                backgroundColor: isServerMenuOpen
                                  ? "rgba(255,255,255,0.22)"
                                  : "rgba(255,255,255,0.13)",
                                borderColor: isServerMenuOpen
                                  ? colors.accent
                                  : "rgba(255,255,255,0.24)",
                              },
                              glassWebStyle(16),
                            ],
                            { backgroundColor: "rgba(255,255,255,0.22)" }
                          )}
                          accessibilityLabel="Pilih Server"
                        >
                          <Text style={styles.serverTriggerText} numberOfLines={1}>
                            {activeServerLabel}
                          </Text>
                          <Ionicons
                            name={isServerMenuOpen ? "chevron-up" : "chevron-down"}
                            size={14}
                            color="rgba(255,255,255,0.85)"
                          />
                        </Pressable>

                        {/* Downward Vertical List Menu */}
                        {isServerMenuOpen && (
                          <>
                            {/* Backdrop to close on click outside */}
                            <Pressable
                              style={styles.dropdownBackdrop as any}
                              onPress={() => setIsServerMenuOpen(false)}
                            />

                            <View
                              style={[
                                styles.serverDropdownList,
                                {
                                  backgroundColor: isDark ? "rgba(18, 20, 26, 0.96)" : "rgba(240, 242, 246, 0.96)",
                                  borderColor: colors.glassBorder,
                                },
                                glassWebStyle(28),
                              ]}
                            >
                              <ScrollView
                                nestedScrollEnabled
                                showsVerticalScrollIndicator={true}
                                style={{ maxHeight: 440 }}
                                contentContainerStyle={{ padding: 6 }}
                              >
                                {/* Default option */}
                                <Pressable
                                  onPress={() => {
                                    loadStreamingUrl(activeEpisode!.chapterId);
                                    setIsServerMenuOpen(false);
                                  }}
                                  style={hoverBg(
                                    [
                                      styles.serverOptionItem,
                                      (!activeServer || activeServer?.title === "Default" || activeServer?.serverId === "") && {
                                        backgroundColor: colors.accent,
                                      },
                                    ],
                                    (!activeServer || activeServer?.title === "Default" || activeServer?.serverId === "")
                                      ? { backgroundColor: colors.accent }
                                      : { backgroundColor: colors.glassHover }
                                  )}
                                >
                                  <Text
                                    style={[
                                      styles.serverOptionItemText,
                                      {
                                        color: (!activeServer || activeServer?.title === "Default" || activeServer?.serverId === "")
                                          ? "#FFF"
                                          : colors.text,
                                        fontWeight: (!activeServer || activeServer?.title === "Default" || activeServer?.serverId === "")
                                          ? "700"
                                          : "500",
                                      },
                                    ]}
                                  >
                                    Default
                                  </Text>
                                  {(!activeServer || activeServer?.title === "Default" || activeServer?.serverId === "") && (
                                    <Ionicons name="checkmark" size={15} color="#FFF" style={{ marginLeft: "auto" }} />
                                  )}
                                </Pressable>

                                {/* All quality servers listed downward */}
                                {allServerOptions.map((item: any) => {
                                  const isSelected = activeServer?.serverId === item.serverId;
                                  return (
                                    <Pressable
                                      key={item.serverId}
                                      onPress={() => {
                                        loadStreamingUrl(activeEpisode!.chapterId, item);
                                        setIsServerMenuOpen(false);
                                      }}
                                      style={hoverBg(
                                        [
                                          styles.serverOptionItem,
                                          isSelected && {
                                            backgroundColor: colors.accent,
                                          },
                                        ],
                                        isSelected
                                          ? { backgroundColor: colors.accent }
                                          : { backgroundColor: colors.glassHover }
                                      )}
                                    >
                                      <Text
                                        style={[
                                          styles.serverOptionItemText,
                                          {
                                            color: isSelected ? "#FFF" : colors.text,
                                            fontWeight: isSelected ? "700" : "500",
                                          },
                                        ]}
                                      >
                                        {item.label}
                                      </Text>
                                      {isSelected && (
                                        <Ionicons name="checkmark" size={15} color="#FFF" style={{ marginLeft: "auto" }} />
                                      )}
                                    </Pressable>
                                  );
                                })}
                              </ScrollView>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* EPISODE RAIL */}
                  <View style={{ marginTop: 26 }}>
                    <Text style={[styles.railTitle, { paddingHorizontal: isPlayingWeb ? 28 : 52 }]}>
                      List Episodes <Text style={{ color: "rgba(255,255,255,0.55)", fontWeight: "500" }}>({episodes.length} Eps)</Text>
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: isPlayingWeb ? 28 : 52, gap: 10, paddingBottom: 26, paddingTop: 6 }}
                    >
                      {episodes.map((ep, i) => {
                        const isActive = activeEpisode?.chapterId === ep.chapterId;
                        const isWatched = watchedEpisodes.includes(ep.chapterId) || !!watchProgress[ep.chapterId];
                        const prog = watchProgress[ep.chapterId];
                        const percent =
                          prog && prog.totalSeconds > 0 ? Math.min((prog.watchedSeconds / prog.totalSeconds) * 100, 100) : 0;
                        return (
                          <FadeIn key={ep.chapterId} delay={Math.min(i, 12) * 35}>
                            <Lift onPress={() => selectEpisode(ep)} style={{ width: 132 }} accessibilityLabel={ep.chapterName}>
                              <View
                                style={[
                                  styles.railCard,
                                  glassWebStyle(18),
                                  isActive && { backgroundColor: "#FFF", borderColor: "#FFF" },
                                  isWatched && !isActive && { opacity: 0.62 },
                                ]}
                              >
                                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                                  <Text style={[styles.railNumber, isActive && { color: "#0B0C0E" }]}>{epNumber(ep)}</Text>
                                  <Ionicons
                                    name={isActive ? "play" : isWatched ? "checkmark-circle" : "play-outline"}
                                    size={15}
                                    color={isActive ? "#0B0C0E" : "rgba(255,255,255,0.75)"}
                                  />
                                </View>
                                <Text style={[styles.railLabel, isActive && { color: "#0B0C0E" }]} numberOfLines={1}>
                                  {getCleanEpisodeTitle(ep.chapterName, animeTitle)}
                                </Text>
                                <Text style={[styles.railSub, isActive && { color: "rgba(11,12,14,0.6)" }]} numberOfLines={1}>
                                  {ep.releaseTime || ep.duration || "24 Min"}
                                </Text>
                                {percent > 0 && (
                                  <View style={styles.railProgress}>
                                    <View style={{ width: `${percent}%`, height: 3, backgroundColor: colors.accent }} />
                                  </View>
                                )}
                              </View>
                            </Lift>
                          </FadeIn>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {sidePanel}
              </View>
            </FadeIn>

            {/* COMMENTS */}
            <FadeIn delay={200} style={{ marginTop: 20, zIndex: 1, position: "relative" }}>
              <Glass radius={28} style={{ padding: 8 }}>
                <CommentSection animeId={bookId} navigation={navigation} />
              </Glass>
            </FadeIn>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------- MOBILE ----------------
  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 8 }}>
        <FadeIn duration={700} style={{ paddingHorizontal: 12 }}>
          <View style={[styles.stage, { borderColor: colors.glassBorder, minHeight: 560, justifyContent: "flex-end", paddingBottom: 24 }]}>
            <Image source={{ uri: detail?.poster }} style={StyleSheet.absoluteFill as any} contentFit="cover" />
            <LinearGradient
              colors={["rgba(8,9,11,0.25)", "rgba(8,9,11,0.6)", "rgba(8,9,11,0.97)"]}
              locations={[0, 0.45, 0.85]}
              style={StyleSheet.absoluteFill}
            />
            <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { paddingHorizontal: 0, width: 40, justifyContent: "center", left: 14, top: 14 }]}>
              <Ionicons name="arrow-back" size={18} color="#FFF" />
            </Pressable>
            {heroInfo(true)}
          </View>
        </FadeIn>

        <View style={styles.episodeHeader}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
            List Episodes <Text style={{ color: colors.textMuted, fontWeight: "500" }}>({episodes.length} Eps)</Text>
          </Text>
        </View>

        <EpisodeList
          episodes={episodes}
          posterUrl={detail?.poster}
          animeTitle={animeTitle}
          watchedEpisodes={watchedEpisodes}
          onEpisodePress={openInPlayer}
          maxHeight={episodes.length > 0 ? Math.min(episodes.length * 94 + 20, 380) : 380}
        />

        <FadeIn delay={200} style={{ marginHorizontal: 16, marginTop: 20, marginBottom: 32 }}>
          <Glass radius={24} style={{ padding: 6 }}>
            <CommentSection animeId={bookId} navigation={navigation} />
          </Glass>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stage: {
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: "#0B0C0E",
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 22,
    left: 24,
    zIndex: 5,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  keyArtWrap: {
    position: "absolute",
    right: "7%",
    top: 70,
    width: 250,
    height: 356,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    ...Platform.select({ web: { boxShadow: "0 40px 90px rgba(0,0,0,0.6)" } as any }),
  } as any,
  heroTitle: { color: "#FFF", fontWeight: "800", letterSpacing: -0.6 },
  heroMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 14 },
  heroMetaText: { color: "rgba(255,255,255,0.82)", fontSize: 15, fontWeight: "600" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  genreChipText: { color: "rgba(255,255,255,0.9)", fontSize: 12.5, fontWeight: "600" },
  heroSynopsis: { color: "rgba(255,255,255,0.74)", fontSize: 14, lineHeight: 21, marginTop: 14, maxWidth: 520 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22, flexWrap: "wrap" },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FFF",
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
  },
  watchBtnText: { color: "#0B0C0E", fontSize: 14, fontWeight: "700" },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  ghostBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  pillBtn: { height: 44, paddingHorizontal: 24, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  // Player
  playerFrame: {
    width: "100%",
    aspectRatio: 16 / 9,
    maxHeight: 620,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    ...Platform.select({ web: { boxShadow: "0 30px 80px rgba(0,0,0,0.55)" } as any }),
  } as any,
  playerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Rail
  railTitle: { color: "#FFF", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  railCard: {
    height: 104,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  railNumber: { color: "#FFF", fontSize: 30, fontWeight: "800", letterSpacing: -1, lineHeight: 32 },
  railLabel: { color: "#FFF", fontSize: 12.5, fontWeight: "700", marginTop: 10 },
  railSub: { color: "rgba(255,255,255,0.6)", fontSize: 11.5, marginTop: 2 },
  railProgress: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: "rgba(255,255,255,0.18)" },

  // Side panel
  panelAvatar: { width: 54, height: 54, borderRadius: 27 },
  panelTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8, paddingHorizontal: 8 },
  recRow: { flexDirection: "row", gap: 14, padding: 8, borderRadius: 16, marginBottom: 2 },
  recPoster: { width: 68, height: 96, borderRadius: 10 },

  episodeHeader: { paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },

  // Server selector
  serverRowWrap: {
    marginTop: 22,
    position: "relative",
    zIndex: 1000,
  },
  serverRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  serverLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownAnchor: {
    position: "relative",
    zIndex: 100,
  },
  serverTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 190,
  },
  serverTriggerText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  dropdownBackdrop: {
    position: (isWeb ? "fixed" : "absolute") as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 90,
  },
  serverDropdownList: {
    position: "absolute",
    top: 44,
    left: 0,
    minWidth: 220,
    maxHeight: 460,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 1000,
    ...Platform.select({
      web: {
        boxShadow: "0 18px 45px rgba(0,0,0,0.75)",
      } as any,
      default: {
        elevation: 16,
      },
    }),
  },
  serverOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    marginBottom: 2,
  },
  serverOptionItemText: {
    fontSize: 13,
  },
});
