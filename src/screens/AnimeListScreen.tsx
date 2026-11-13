import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  TextInput,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getOngoingAnime,
  getCompleteAnime,
  getAnimeByGenre,
  getGenreList,
  getOngoingAnimeIds,
} from "../services/api";
import { Anime } from "../types/drama";
import { useTheme } from "../context/ThemeContext";
import { WebFooter } from "../components/WebFooter";
import {
  FadeIn,
  Glass,
  Lift,
  Rating,
  Shimmer,
  StatusPill,
  glassWebStyle,
} from "../components/ui";

type AnimeListType = "ongoing" | "completed";

interface AnimeListScreenProps {
  route?: {
    params: {
      type: AnimeListType;
      title?: string;
    };
  };
  navigation?: any;
}

const isWeb = Platform.OS === "web";

const AnimeListScreen: React.FC<AnimeListScreenProps> = ({
  route,
  navigation,
}) => {
  const routeType = route?.params?.type || "ongoing";
  const [currentType, setCurrentType] = useState<AnimeListType>(routeType);

  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Responsive layout measurements aligned with HomeScreen
  const pad = isDesktop ? 24 : 12;
  const contentMax = 1480;
  const gridCols = width >= 1280 ? 6 : width >= 1000 ? 5 : width >= 768 ? 4 : width >= 480 ? 3 : 2;
  const gridGap = isDesktop ? 18 : 12;
  const innerWidth = Math.min(width, contentMax) - pad * 2;
  const cardWidth = Math.floor((innerWidth - gridGap * (gridCols - 1)) / gridCols);

  const flatListRef = useRef<FlatList>(null);

  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<any[]>([{ id: "all", label: "ALL CATEGORIES" }]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  // Sync state if navigation route params change (e.g. via persistent navbar)
  useEffect(() => {
    if (route?.params?.type && route.params.type !== currentType) {
      setCurrentType(route.params.type);
      setCurrentPage(1);
      setAnimeList([]);
      setHasMore(true);
      setSelectedGenre("all");
      setSearchQuery("");
    }
  }, [route?.params?.type]);

  const switchType = (newType: AnimeListType) => {
    if (newType === currentType) return;
    setCurrentType(newType);
    setCurrentPage(1);
    setAnimeList([]);
    setHasMore(true);
    setSelectedGenre("all");
    setSearchQuery("");
    navigation?.setParams?.({
      type: newType,
      title: newType === "ongoing" ? "Anime Ongoing" : "Anime Completed",
    });
  };

  // Fetch genre categories
  useEffect(() => {
    const fetchGenresList = async () => {
      try {
        const data = await getGenreList();
        if (data && Array.isArray(data)) {
          const mapped = [
            { id: "all", label: "ALL CATEGORIES" },
            ...data.map((g: any) => ({
              id: g.genreId,
              label: g.title.toUpperCase(),
            })),
          ];
          setGenres(mapped);
        }
      } catch (err) {
        console.error("Failed to load genres in AnimeListScreen:", err);
      }
    };
    fetchGenresList();
  }, []);

  // Fetch Anime Data
  const fetchAnime = async (page: number, isRefresh: boolean = false) => {
    if (loading) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      let data: Anime[] = [];
      if (selectedGenre === "all") {
        const fetchFunction = currentType === "ongoing" ? getOngoingAnime : getCompleteAnime;
        data = await fetchFunction(page);

        const slicedData = (data || []).slice(0, 24);
        setAnimeList(slicedData);
        setHasMore(data && data.length >= 24);
      } else {
        const genreData = await getAnimeByGenre(selectedGenre, page);
        const ongoingIds = await getOngoingAnimeIds();

        data = (genreData || []).filter((item: Anime) => {
          const isOngoing = ongoingIds.has(item.animeId);
          return currentType === "ongoing" ? isOngoing : !isOngoing;
        });

        const slicedData = data.slice(0, 24);
        setAnimeList(slicedData);
        setHasMore(genreData && genreData.length >= 24);
      }
    } catch (error) {
      console.error(`[PAGINATION ERROR] Failed to fetch page ${page}:`, error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnime(currentPage);
  }, [currentType, selectedGenre, currentPage]);

  const onRefresh = useCallback(() => {
    fetchAnime(currentPage, true);
  }, [currentType, selectedGenre, currentPage]);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y > 450 && !showScrollToTop) setShowScrollToTop(true);
    else if (y <= 450 && showScrollToTop) setShowScrollToTop(false);
  };

  const filteredAnimeList = useMemo(() => {
    if (!searchQuery.trim()) return animeList;
    const q = searchQuery.toLowerCase();
    return animeList.filter((item) => item.title?.toLowerCase().includes(q));
  }, [animeList, searchQuery]);

  // Card Item Renderer with Glassmorphism
  const renderAnimeItem = ({ item, index }: { item: Anime; index: number }) => {
    const displayIndex = (currentPage - 1) * 24 + index + 1;
    const isOngoing = currentType === "ongoing";

    return (
      <FadeIn key={`${currentType}-${item.animeId}-${index}`} delay={Math.min(index * 30, 300)}>
        <Lift
          onPress={() =>
            navigation.navigate("Episode", {
              bookId: item.animeId,
              title: item.title,
            })
          }
          style={{ width: cardWidth }}
          accessibilityLabel={item.title}
        >
          <View
            style={[
              styles.posterFrame,
              {
                borderColor: colors.glassBorder,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Image
              source={{
                uri: item.poster || "https://via.placeholder.com/180x240",
              }}
              style={StyleSheet.absoluteFill as any}
              contentFit="cover"
              transition={250}
            />

            {/* Bottom gradient shade */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.88)"]}
              locations={[0.35, 1]}
              style={styles.posterShade}
            />

            {/* Top-left rank badge */}
            <View
              style={[
                styles.rankPill,
                { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder },
                glassWebStyle(12),
              ]}
            >
              <Text style={styles.rankPillText}>#{displayIndex}</Text>
            </View>

            {/* Top-right status badge */}
            <View style={styles.statusPillWrap}>
              <StatusPill kind={isOngoing ? "ongoing" : "completed"} small onDark />
            </View>

            {/* Bottom poster caption row */}
            <View style={styles.posterCaptionRow}>
              {item.score ? <Rating score={item.score} size={11} color="#FFF" /> : null}
              <View
                style={[
                  styles.episodeChip,
                  {
                    backgroundColor: "rgba(0,0,0,0.55)",
                    borderColor: "rgba(255,255,255,0.18)",
                  },
                  glassWebStyle(8),
                ]}
              >
                <Text style={styles.episodeChipText}>
                  {isOngoing
                    ? `Ep ${item.totalEpisodes || "?"}`
                    : `${item.totalEpisodes || "?"} Eps`}
                </Text>
              </View>
            </View>
          </View>

          {/* Title below poster */}
          <Text style={[styles.posterTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title || "Unknown Anime"}
          </Text>
        </Lift>
      </FadeIn>
    );
  };

  // Glassmorphic Hero Banner & Filter Header
  const renderHeader = () => {
    const isOngoing = currentType === "ongoing";

    return (
      <View style={styles.headerContainer}>
        <Glass
          radius={24}
          strong
          style={[
            styles.heroGlassCard,
            { borderColor: colors.glassBorder },
          ]}
        >
          {/* Subtle hero glow overlay inside */}
          <LinearGradient
            colors={
              isOngoing
                ? [
                    isDark ? "rgba(214,190,96,0.14)" : "rgba(160,132,24,0.08)",
                    "transparent",
                  ]
                : [
                    isDark ? "rgba(92,184,122,0.14)" : "rgba(34,139,74,0.08)",
                    "transparent",
                  ]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.heroContent}>
            {/* Title & Description */}
            <View style={styles.heroMetaRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  {isOngoing ? "Anime Ongoing" : "Anime Completed"}
                </Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  {isOngoing
                    ? "Koleksi anime yang sedang aktif tayang setiap minggu dengan pembaruan episode terbaru sub Indonesia."
                    : "Koleksi anime yang sudah tamat secara lengkap, bebas kamu tonton maraton kapan saja tanpa iklan."}
                </Text>
              </View>
            </View>

            {/* Bottom Row: Genre Filters Carousel */}
            <View style={[styles.genreContainer, { borderTopColor: colors.border }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genreScroll}
              >
                {genres.map((g) => {
                  const isActive = selectedGenre === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => {
                        setSelectedGenre(g.id);
                        setCurrentPage(1);
                      }}
                      style={({ hovered }: any) => [
                        styles.genreChip,
                        {
                          backgroundColor: isActive
                            ? colors.buttonPrimaryBg
                            : hovered
                            ? colors.glassHover
                            : colors.glass,
                          borderColor: isActive ? colors.buttonPrimaryBg : colors.glassBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.genreChipText,
                          {
                            color: isActive ? colors.buttonPrimaryText : colors.textSecondary,
                            fontWeight: isActive ? "700" : "600",
                          },
                        ]}
                      >
                        {g.label === "ALL CATEGORIES" ? "Semua Genre" : g.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Glass>
      </View>
    );
  };

  // Glassmorphic Pagination Capsule
  const renderPagination = () => {
    if (loading || filteredAnimeList.length === 0) return null;

    return (
      <View style={styles.paginationWrapper}>
        <Glass
          radius={22}
          strong
          style={[styles.paginationCapsule, { borderColor: colors.glassBorder }]}
        >
          <Pressable
            disabled={currentPage === 1 || loading}
            onPress={() => {
              setCurrentPage((prev) => Math.max(prev - 1, 1));
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={({ hovered }: any) => [
              styles.pageBtn,
              currentPage === 1 && { opacity: 0.35 },
              hovered && currentPage !== 1 && { backgroundColor: colors.glassHover },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={currentPage === 1 ? colors.textMuted : colors.text}
            />
            <Text
              style={[
                styles.pageBtnText,
                { color: currentPage === 1 ? colors.textMuted : colors.text },
              ]}
            >
              Sebelumnya
            </Text>
          </Pressable>

          <View
            style={[
              styles.pageBadge,
              {
                backgroundColor: isDark
                  ? "rgba(236, 43, 85, 0.18)"
                  : "rgba(225, 29, 72, 0.12)",
                borderColor: colors.accent,
              },
            ]}
          >
            <Text style={[styles.pageBadgeText, { color: colors.accent }]}>
              Halaman {currentPage}
            </Text>
          </View>

          <Pressable
            disabled={!hasMore || loading}
            onPress={() => {
              setCurrentPage((prev) => prev + 1);
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={({ hovered }: any) => [
              styles.pageBtn,
              !hasMore && { opacity: 0.35 },
              hovered && hasMore && { backgroundColor: colors.glassHover },
            ]}
          >
            <Text
              style={[
                styles.pageBtnText,
                { color: !hasMore ? colors.textMuted : colors.text },
              ]}
            >
              Berikutnya
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={!hasMore ? colors.textMuted : colors.text}
            />
          </Pressable>
        </Glass>
      </View>
    );
  };

  const renderFooter = () => {
    if (loading && currentPage === 1) return null;
    return (
      <View style={{ width: "100%", marginTop: 16 }}>
        {renderPagination()}
        <WebFooter />
      </View>
    );
  };

  // Glassmorphic Empty State
  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyWrapper}>
        <Glass
          radius={24}
          strong
          style={[styles.emptyCard, { borderColor: colors.glassBorder }]}
        >
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.glass, borderColor: colors.glassBorder },
            ]}
          >
            <Ionicons name="film-outline" size={38} color={colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Tidak Ada Anime Ditemukan
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {searchQuery
              ? `Tidak ada anime dengan kata kunci "${searchQuery}". Coba gunakan judul lain.`
              : "Belum ada anime untuk kategori genre ini."}
          </Text>
          <Pressable
            onPress={onRefresh}
            style={({ hovered }: any) => [
              styles.emptyRefreshBtn,
              { backgroundColor: colors.buttonPrimaryBg },
              hovered && { opacity: 0.88 },
            ]}
          >
            <Ionicons name="reload" size={15} color={colors.buttonPrimaryText} />
            <Text
              style={[
                styles.emptyRefreshBtnText,
                { color: colors.buttonPrimaryText },
              ]}
            >
              Muat Ulang
            </Text>
          </Pressable>
        </Glass>
      </View>
    );
  };

  // Shimmer skeleton loading state
  const renderLoadingSkeleton = () => (
    <View style={{ width: "100%", maxWidth: contentMax, alignSelf: "center", paddingHorizontal: pad }}>
      <Shimmer style={{ height: 160, borderRadius: 24, marginBottom: 24 }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gridGap }}>
        {Array.from({ length: isDesktop ? 12 : 6 }).map((_, i) => (
          <View key={i} style={{ width: cardWidth, marginBottom: 16 }}>
            <Shimmer
              style={{
                width: cardWidth,
                aspectRatio: 3 / 4.4,
                borderRadius: 18,
              }}
            />
            <Shimmer
              style={{
                width: "80%",
                height: 14,
                borderRadius: 6,
                marginTop: 10,
              }}
            />
            <Shimmer
              style={{
                width: "45%",
                height: 12,
                borderRadius: 6,
                marginTop: 6,
              }}
            />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top"]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Decorative ambient background glows */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={[
            styles.ambientGlow,
            {
              backgroundColor:
                currentType === "ongoing"
                  ? isDark
                    ? "rgba(214,190,96,0.12)"
                    : "rgba(160,132,24,0.06)"
                  : isDark
                  ? "rgba(92,184,122,0.12)"
                  : "rgba(34,139,74,0.06)",
              top: -60,
              left: "15%",
            },
          ]}
        />
        <View
          style={[
            styles.ambientGlow,
            {
              backgroundColor: isDark
                ? "rgba(236,43,85,0.09)"
                : "rgba(225,29,72,0.05)",
              top: 60,
              right: "12%",
            },
          ]}
        />
      </View>

      {/* Mobile Top Bar */}
      {!isDesktop && (
        <View
          style={[
            styles.mobileTopBar,
            { backgroundColor: colors.glassStrong, borderBottomColor: colors.glassBorder },
            glassWebStyle(20),
          ]}
        >
          <Pressable
            style={styles.mobileBackBtn}
            onPress={() => navigation?.goBack()}
            accessibilityLabel="Kembali"
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.mobileTopTitle, { color: colors.text }]} numberOfLines={1}>
            {currentType === "ongoing" ? "Anime Ongoing" : "Anime Completed"}
          </Text>
          <View style={{ width: 36 }} />
        </View>
      )}

      {loading && currentPage === 1 ? (
        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            isDesktop && { paddingTop: 96 },
          ]}
        >
          {renderHeader()}
          {renderLoadingSkeleton()}
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredAnimeList}
          renderItem={renderAnimeItem}
          keyExtractor={(item, index) => `${currentType}-${item.animeId}-${index}`}
          numColumns={gridCols}
          key={`flatlist-grid-${gridCols}`}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && { paddingTop: 96 },
            { flexGrow: 1 },
          ]}
          ListHeaderComponent={renderHeader}
          columnWrapperStyle={[styles.columnWrapper, { gap: gridGap, marginBottom: gridGap }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* Floating Scroll To Top Button */}
      {showScrollToTop && (
        <Lift
          onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
          style={styles.scrollToTopBtn}
          accessibilityLabel="Kembali ke atas"
        >
          <View
            style={[
              styles.scrollToTopInner,
              { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder },
              glassWebStyle(16),
            ]}
          >
            <Ionicons name="chevron-up" size={20} color={colors.text} />
          </View>
        </Lift>
      )}
    </SafeAreaView>
  );
};

export default AnimeListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientGlow: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 220,
    opacity: 0.85,
    ...(isWeb ? { filter: "blur(110px)" } : {}),
  } as any,
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 24,
  },
  headerContainer: {
    width: "100%",
    maxWidth: 1480,
    alignSelf: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  heroGlassCard: {
    borderWidth: 1,
    overflow: "hidden",
  },
  heroContent: {
    padding: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  segmentContainer: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  segmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 240,
    flex: isWeb ? 0 : 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    height: 40,
    padding: 0,
    ...(isWeb ? { outlineStyle: "none" } : {}),
  } as any,
  clearBtn: {
    padding: 4,
  },
  heroMetaRow: {
    marginBottom: 16,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    maxWidth: 720,
  },
  genreContainer: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginHorizontal: -20,
    marginBottom: -6,
  },
  genreScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  genreChipText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    maxWidth: 1480,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  posterFrame: {
    aspectRatio: 3 / 4.3,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  posterShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  rankPill: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  rankPillText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  statusPillWrap: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  posterCaptionRow: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  episodeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  episodeChipText: {
    color: "#FFF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  posterTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
  },
  paginationWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  paginationCapsule: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pageBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  pageBadgeText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  emptyWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 16,
    width: "100%",
    maxWidth: 1480,
    alignSelf: "center",
  },
  emptyCard: {
    alignItems: "center",
    padding: 36,
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 420,
    width: "100%",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyRefreshBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  mobileTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mobileBackBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileTopTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  scrollToTopBtn: {
    position: "absolute",
    right: 24,
    bottom: 28,
    zIndex: 999,
  },
  scrollToTopInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
