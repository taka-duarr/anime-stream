import React, { useEffect, useState } from "react";
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
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 768;

  // Desktop Streaming States
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [activeServer, setActiveServer] = useState<any>(null);
  const [streamingUrl, setStreamingUrl] = useState<string>("");
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [episodeDetail, setEpisodeDetail] = useState<any>(null);
  const [relatedSeries, setRelatedSeries] = useState<any[]>([]);
  const [suggestedSeries, setSuggestedSeries] = useState<any[]>([]);

  // Load streaming URL for desktop player
  const loadStreamingUrl = async (episodeId: string, server?: any) => {
    try {
      setLoadingVideo(true);
      console.log("[EPISODE SCREEN] Loading streaming url for:", episodeId);
      const epDetail = await api.getEpisodeDetail(episodeId);
      setEpisodeDetail(epDetail);

      // Save watch history on desktop if logged in
      if (isAuthenticated && bookId && episodeId) {
        try {
          api.saveWatchHistory(bookId, episodeId)
            .then(() => {
              setWatchedEpisodes((prev) => {
                if (!prev.includes(episodeId)) {
                  return [...prev, episodeId];
                }
                return prev;
              });
            })
            .catch((err) => console.error("Gagal menyimpan riwayat tontonan desktop:", err));
        } catch (err) {
          console.error("Gagal menyimpan riwayat tontonan desktop:", err);
        }
      }

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
    fetchData();
    checkBookmarkStatus();
  }, [bookId, isAuthenticated]);

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
      {isDesktop ? (
        <View style={styles.desktopHeaderContainer}>
          <ImageBackground
            source={{
              uri: detail?.poster || "https://via.placeholder.com/400x600",
            }}
            style={styles.desktopBgImage}
            resizeMode="cover"
            blurRadius={20}
          >
            <View
              style={[
                styles.desktopBgOverlay,
                {
                  backgroundColor: isDark
                    ? "rgba(0,0,0,0.85)"
                    : "rgba(255,255,255,0.85)",
                },
              ]}
            />

            <View
              style={[
                styles.toolbar,
                { paddingTop: 20, paddingHorizontal: 32 },
              ]}
            >
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.desktopContentRow}>
              <View style={styles.desktopPosterWrap}>
                <Image
                  source={{ uri: detail?.poster }}
                  style={styles.desktopPosterImage}
                  contentFit="cover"
                />
              </View>

              <View style={styles.desktopInfoCol}>
                <Text
                  style={[
                    styles.titleText,
                    { color: colors.text, fontSize: 36, marginBottom: 16 },
                  ]}
                >
                  {detail?.title || title}
                </Text>

                <View style={[styles.statsRow, { marginBottom: 20 }]}>
                  <Ionicons name="star" size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.scoreText,
                      { color: colors.accent, fontSize: 16 },
                    ]}
                  >
                    {detail?.score || "N/A"}
                  </Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text
                    style={[
                      styles.statText,
                      { color: colors.textSecondary, fontSize: 16 },
                    ]}
                  >
                    {detail?.type || "TV"}
                  </Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text
                    style={[
                      styles.statText,
                      { color: colors.textSecondary, fontSize: 16 },
                    ]}
                  >
                    {detail?.status || "Ongoing"}
                  </Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text
                    style={[
                      styles.statText,
                      { color: colors.textSecondary, fontSize: 16 },
                    ]}
                  >
                    {episodes.length} Episodes
                  </Text>
                </View>

                <View style={[styles.tagsRow, { marginBottom: 24 }]}>
                  {detail?.genreList?.slice(0, 5).map((genre, i) => (
                    <View
                      key={i}
                      style={[
                        styles.tagBadge,
                        {
                          backgroundColor: isDark
                            ? "rgba(230,51,51,0.15)"
                            : "#FFE5E8",
                          paddingHorizontal: 16,
                          paddingVertical: 6,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          { color: colors.accent, fontSize: 14 },
                        ]}
                      >
                        {genre.title}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.actionsRow,
                    { justifyContent: "flex-start", marginBottom: 32 },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.watchButton,
                      {
                        backgroundColor: colors.accent,
                        maxWidth: 200,
                        paddingVertical: 16,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (episodes.length > 0) {
                        const targetEp = episodes[episodes.length - 1];
                        if (isAuthenticated && bookId && targetEp.chapterId) {
                          api.saveWatchHistory(bookId, targetEp.chapterId)
                            .then(() => {
                              setWatchedEpisodes(prev => {
                                if (!prev.includes(targetEp.chapterId)) {
                                  return [...prev, targetEp.chapterId];
                                }
                                return prev;
                              });
                            })
                            .catch(err => console.error("Gagal menyimpan riwayat:", err));
                        }
                        navigation.navigate("Video", {
                          episode: targetEp,
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
                    style={[
                      styles.secondaryButton,
                      {
                        backgroundColor: colors.card,
                        marginLeft: 16,
                        height: 56,
                        width: 56,
                      },
                    ]}
                    onPress={toggleBookmark}
                    disabled={bookmarkLoading}
                  >
                    {bookmarkLoading ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Ionicons
                        name={isBookmarked ? "bookmark" : "bookmark-outline"}
                        size={26}
                        color={isBookmarked ? colors.accent : colors.text}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, fontSize: 20 },
                  ]}
                >
                  Synopsis
                </Text>
                <Text
                  style={[
                    styles.synopsisText,
                    {
                      color: colors.textSecondary,
                      fontSize: 15,
                      lineHeight: 24,
                    },
                  ]}
                  numberOfLines={6}
                >
                  {detail?.synopsis?.paragraphs?.join("\n\n") ||
                    "No synopsis available."}
                </Text>
              </View>
            </View>
          </ImageBackground>
        </View>
      ) : (
        <>
          <View style={styles.heroContainer}>
            <ImageBackground
              source={{
                uri: detail?.poster || "https://via.placeholder.com/400x600",
              }}
              style={styles.heroImage}
              resizeMode="cover"
            >
              <View style={[styles.toolbar, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
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
          <View
            style={[styles.contentContainer, { backgroundColor: colors.bg }]}
          >
            <Text style={[styles.titleText, { color: colors.text }]}>
              {detail?.title || title}
            </Text>
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
            <View style={styles.tagsRow}>
              {detail?.genreList?.slice(0, 5).map((genre, i) => (
                <View
                  key={i}
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(230,51,51,0.15)"
                        : "#FFE5E8",
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: colors.accent }]}>
                    {genre.title}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.watchButton, { backgroundColor: colors.accent }]}
                activeOpacity={0.8}
                onPress={() => {
                  if (episodes.length > 0) {
                    const targetEp = episodes[episodes.length - 1];
                    if (isAuthenticated && bookId && targetEp.chapterId) {
                      api.saveWatchHistory(bookId, targetEp.chapterId)
                        .then(() => {
                          setWatchedEpisodes(prev => {
                            if (!prev.includes(targetEp.chapterId)) {
                              return [...prev, targetEp.chapterId];
                            }
                            return prev;
                          });
                        })
                        .catch(err => console.error("Gagal menyimpan riwayat:", err));
                    }
                    navigation.navigate("Video", {
                      episode: targetEp,
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
                style={[
                  styles.secondaryButton,
                  { backgroundColor: colors.card },
                ]}
                onPress={toggleBookmark}
                disabled={bookmarkLoading}
              >
                {bookmarkLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons
                    name={isBookmarked ? "bookmark" : "bookmark-outline"}
                    size={24}
                    color={isBookmarked ? colors.accent : colors.text}
                  />
                )}
              </TouchableOpacity>
            </View>
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
          </View>
        </>
      )}

      <View
        style={[
          styles.episodeHeader,
          isDesktop && { paddingHorizontal: 32, marginTop: 10 },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontSize: isDesktop ? 22 : 18 },
          ]}
        >
          Episodes
        </Text>
      </View>
    </>
  );

  if (isDesktop) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor="transparent" translucent />
        
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 40, paddingVertical: 32 }}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={[styles.desktopBackBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.desktopBackText, { color: colors.text }]}>Kembali ke Beranda</Text>
          </TouchableOpacity>

          {/* TWO COLUMN STREAMING VIEW */}
          <View style={styles.desktopMainRow}>
            {/* Left Column: Player, Dropdowns, Comments */}
            <View style={styles.desktopLeftCol}>
              
              {/* VIDEO PLAYER WINDOW */}
              <View style={[styles.playerContainer, { backgroundColor: "black" }]}>
                {streamingUrl ? (
                  <iframe
                    src={streamingUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      backgroundColor: "black",
                    }}
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <View style={styles.playerPlaceholder}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={{ color: "white", marginTop: 16 }}>Memuat Video...</Text>
                  </View>
                )}
                {loadingVideo && (
                  <View style={styles.playerLoadingOverlay}>
                    <ActivityIndicator size="large" color={colors.accent} />
                  </View>
                )}
              </View>

              {/* WATCH NOW SECTION WITH RED VERTICAL LINE */}
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.verticalAccentBar, { backgroundColor: colors.accent }]} />
                <Text style={[styles.desktopWatchNowText, { color: colors.text }]}>Watch Now</Text>
              </View>

              {/* CONTROLS CARD */}
              <View style={[styles.controlsCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
                <View style={styles.dropdownsRow}>
                  {/* Episode Selector */}
                  <View style={styles.controlGroup}>
                    <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Episodes</Text>
                    <View style={styles.episodeSelectWrap}>
                      <select
                        value={activeEpisode?.chapterId || ""}
                        onChange={(e) => {
                          const selectedEp = episodes.find(ep => ep.chapterId === (e.target as any).value);
                          if (selectedEp) {
                            setActiveEpisode(selectedEp);
                            loadStreamingUrl(selectedEp.chapterId);
                          }
                        }}
                        style={{
                          backgroundColor: colors.card,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          padding: "10px 16px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          outline: "none",
                          width: "180px",
                          cursor: "pointer",
                        }}
                      >
                        {episodes.map((ep) => {
                          const cleanTitle = getCleanEpisodeTitle(ep.chapterName, detail?.title || title);
                          const isWatched = watchedEpisodes.includes(ep.chapterId);
                          return (
                            <option
                              key={ep.chapterId}
                              value={ep.chapterId}
                              style={{ color: isWatched ? colors.textMuted : colors.text }}
                            >
                              {cleanTitle}
                            </option>
                          );
                        })}
                      </select>
                      
                      {/* Arrows Nav */}
                      <View style={styles.epNavRow}>
                        <TouchableOpacity
                          style={[
                            styles.navArrowBtn,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            episodes.findIndex(ep => ep.chapterId === activeEpisode?.chapterId) === episodes.length - 1 && { opacity: 0.5 }
                          ]}
                          disabled={episodes.findIndex(ep => ep.chapterId === activeEpisode?.chapterId) === episodes.length - 1}
                          onPress={() => {
                            const curIdx = episodes.findIndex(ep => ep.chapterId === activeEpisode?.chapterId);
                            if (curIdx < episodes.length - 1) {
                              const prevEp = episodes[curIdx + 1];
                              setActiveEpisode(prevEp);
                              loadStreamingUrl(prevEp.chapterId);
                            }
                          }}
                        >
                          <Ionicons name="arrow-back" size={14} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.navArrowBtn,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            episodes.findIndex(ep => ep.chapterId === activeEpisode?.chapterId) === 0 && { opacity: 0.5 }
                          ]}
                          disabled={episodes.findIndex(ep => ep.chapterId === activeEpisode?.chapterId) === 0}
                          onPress={() => {
                            const curIdx = episodes.findIndex(ep => ep.chapterId === activeEpisode?.chapterId);
                            if (curIdx > 0) {
                              const nextEp = episodes[curIdx - 1];
                              setActiveEpisode(nextEp);
                              loadStreamingUrl(nextEp.chapterId);
                            }
                          }}
                        >
                          <Ionicons name="arrow-forward" size={14} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Server Selector */}
                  <View style={styles.controlGroup}>
                    <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>Servers</Text>
                    <select
                      value={activeServer?.serverId || ""}
                      onChange={async (e) => {
                        if (episodeDetail?.serverqualities) {
                          for (const q of episodeDetail.serverqualities) {
                            const found = q.serverList?.find((s: any) => s.serverId === (e.target as any).value);
                            if (found) {
                              loadStreamingUrl(activeEpisode!.chapterId, found);
                              break;
                            }
                          }
                        }
                      }}
                      style={{
                        backgroundColor: colors.card,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                        padding: "10px 16px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        outline: "none",
                        width: "160px",
                        cursor: "pointer",
                      }}
                    >
                      {episodeDetail?.serverqualities?.flatMap((q: any) => 
                        q.serverList?.map((s: any) => (
                          <option key={s.serverId} value={s.serverId}>
                            {s.title} ({q.title})
                          </option>
                        ))
                      ) || <option>Official</option>}
                    </select>
                  </View>
                </View>

                {/* Action Buttons: Save to My List & Download */}
                <View style={styles.desktopActionBtnGroup}>
                  {/* Save to My List Button */}
                  <TouchableOpacity
                    style={[
                      styles.desktopBookmarkBtn,
                      {
                        backgroundColor: isBookmarked ? colors.card : colors.accent,
                        borderColor: colors.border,
                        borderWidth: isBookmarked ? 1 : 0,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={toggleBookmark}
                    disabled={bookmarkLoading}
                  >
                    {bookmarkLoading ? (
                      <ActivityIndicator size="small" color={isBookmarked ? colors.accent : "white"} />
                    ) : (
                      <>
                        <Ionicons
                          name={isBookmarked ? "bookmark" : "bookmark-outline"}
                          size={16}
                          color={isBookmarked ? colors.accent : "white"}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.downloadBtnText,
                            { color: isBookmarked ? colors.accent : "white" },
                          ]}
                        >
                          {isBookmarked ? "Saved to List" : "Save to List"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Download Button */}
                  <TouchableOpacity
                    style={[styles.desktopDownloadBtn, { backgroundColor: colors.accent }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (episodeDetail?.downloadUrlqualities && episodeDetail.downloadUrlqualities.length > 0) {
                        const urls = episodeDetail.downloadUrlqualities[0].urls;
                        if (urls && urls.length > 0) {
                          if (typeof globalThis !== "undefined" && (globalThis as any).window) {
                            (globalThis as any).window.open(urls[0].url, "_blank");
                          }
                        }
                      } else {
                        Alert.alert("Unduh", "Tautan unduhan tidak tersedia untuk episode ini.");
                      }
                    }}
                  >
                    <Ionicons name="download" size={16} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.downloadBtnText}>Download</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* COMMENTS SECTION */}
              <View style={{ marginTop: 12 }}>
                <CommentSection animeId={bookId} navigation={navigation} />
              </View>

            </View>

            {/* Right Column: Recommendations Sidebars */}
            <View style={styles.desktopRightCol}>
              
              {/* TOP RATED */}
              <View style={styles.sidebarGroup}>
                <View style={styles.sidebarHeader}>
                  <Text style={[styles.sidebarTitle, { color: colors.text }]}>Top Rated</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("AnimeList", { type: "completed", title: "Anime Completed" })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.viewAllLink, { color: colors.accent }]}>VIEW ALL</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.sidebarList}>
                  {relatedSeries.length > 0 ? (
                    relatedSeries.map((item) => (
                      <TouchableOpacity
                        key={item.animeId}
                        style={[styles.sidebarCard, { backgroundColor: colors.card }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          navigation.push("Episode", {
                            bookId: item.animeId,
                            title: item.title,
                          });
                        }}
                      >
                        <Image
                          source={{ uri: item.poster }}
                          style={styles.sidebarPoster as any}
                          contentFit="cover"
                        />
                        <View style={styles.sidebarInfo}>
                          <Text style={[styles.sidebarCardTitle, { color: colors.text }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={[styles.sidebarCardSub, { color: colors.textSecondary }]}>
                            {item.status || "Completed"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <ActivityIndicator size="small" color={colors.accent} style={{ alignSelf: "flex-start", marginTop: 10 }} />
                  )}
                </View>
              </View>

              {/* ONGOING SERIES */}
              <View style={[styles.sidebarGroup, { marginTop: 40 }]}>
                <View style={styles.sidebarHeader}>
                  <Text style={[styles.sidebarTitle, { color: colors.text }]}>Ongoing Series</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("AnimeList", { type: "ongoing", title: "Anime Ongoing" })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.viewAllLink, { color: colors.accent }]}>VIEW ALL</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.sidebarList}>
                  {suggestedSeries.length > 0 ? (
                    suggestedSeries.map((item) => (
                      <TouchableOpacity
                        key={item.animeId}
                        style={[styles.sidebarCard, { backgroundColor: colors.card }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          navigation.push("Episode", {
                            bookId: item.animeId,
                            title: item.title,
                          });
                        }}
                      >
                        <Image
                          source={{ uri: item.poster }}
                          style={styles.sidebarPoster as any}
                          contentFit="cover"
                        />
                        <View style={styles.sidebarInfo}>
                          <Text style={[styles.sidebarCardTitle, { color: colors.text }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={[styles.sidebarCardSub, { color: colors.textSecondary }]}>
                            {item.status || "Episode 1"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <ActivityIndicator size="small" color={colors.accent} style={{ alignSelf: "flex-start", marginTop: 10 }} />
                  )}
                </View>
              </View>

            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header Section */}
        {renderHeader()}

        {/* Episode List Section with Separate Scroll */}
        <View
          style={[
            styles.episodeHeader,
            isDesktop && { paddingHorizontal: 32, marginTop: 10 },
          ]}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontSize: isDesktop ? 22 : 18 },
            ]}
          >
            Episodes ({episodes.length})
          </Text>
        </View>

        <EpisodeList
          episodes={episodes}
          posterUrl={detail?.poster}
          animeTitle={detail?.title || title}
          watchedEpisodes={watchedEpisodes}
          onEpisodePress={(episode) => {
            if (isAuthenticated && bookId && episode.chapterId) {
              api.saveWatchHistory(bookId, episode.chapterId)
                .then(() => {
                  setWatchedEpisodes(prev => {
                    if (!prev.includes(episode.chapterId)) {
                      return [...prev, episode.chapterId];
                    }
                    return prev;
                  });
                })
                .catch(err => console.error("Gagal menyimpan riwayat:", err));
            }
            navigation.navigate("Video", {
              episode,
              episodes,
              animeId: bookId,
            });
          }}
          maxHeight={episodes.length > 0 ? Math.min(episodes.length * 94 + 20, 380) : 380}
        />

        {/* Comment Section */}
        <CommentSection animeId={bookId} navigation={navigation} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  desktopHeaderContainer: {
    width: "100%",
    minHeight: 500,
    marginBottom: 20,
  },
  desktopBgImage: {
    width: "100%",
    minHeight: 500,
  },
  desktopBgOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  desktopContentRow: {
    flexDirection: "row",
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 40,
  },
  desktopPosterWrap: {
    width: 250,
    height: 350,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  desktopPosterImage: {
    width: "100%",
    height: "100%",
  },
  desktopInfoCol: {
    flex: 1,
    justifyContent: "center",
  },
  heroContainer: {
    width: "100%",
    height: 400,
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
    fontFamily: "Inter",
    fontSize: 26,
    fontWeight: "bold",
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
    fontWeight: "bold",
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
    fontWeight: "normal",
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
    fontWeight: "bold",
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
    paddingHorizontal: 16,
  },
  listPaddingWrapper: {
    paddingHorizontal: 16,
  },
  desktopBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  desktopBackText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  desktopMainRow: {
    flexDirection: "row",
    gap: 32,
    alignItems: "flex-start",
  },
  desktopLeftCol: {
    flex: 2.3,
  },
  desktopRightCol: {
    flex: 1,
    maxWidth: 320,
    width: "100%",
  },
  playerContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  playerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  playerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    gap: 10,
  },
  verticalAccentBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  desktopWatchNowText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  controlsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  dropdownsRow: {
    flexDirection: "row",
    gap: 24,
  },
  controlGroup: {
    gap: 8,
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  episodeSelectWrap: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  epNavRow: {
    flexDirection: "row",
    gap: 6,
  },
  navArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  desktopDownloadBtn: {
    flexDirection: "row",
    height: 38,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  desktopBookmarkBtn: {
    flexDirection: "row",
    height: 38,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  desktopActionBtnGroup: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  downloadBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  sidebarGroup: {
    width: "100%",
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: "bold",
  },
  sidebarList: {
    gap: 12,
  },
  sidebarCard: {
    flexDirection: "row",
    borderRadius: 5,
    padding: 8,
    gap: 12,
  },
  sidebarPoster: {
    width: 50,
    height: 70,
    borderRadius: 3,
  },
  sidebarInfo: {
    flex: 1,
    justifyContent: "center",
  },
  sidebarCardTitle: {
    fontSize: 13,
    fontWeight: "medium",
    lineHeight: 17,
    marginBottom: 4,
  },
  sidebarCardSub: {
    fontSize: 11,
    fontWeight: "normal",
  },
});
