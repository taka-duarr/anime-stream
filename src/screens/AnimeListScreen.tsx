import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { getOngoingAnime, getCompleteAnime, getAnimeByGenre, getGenreList, getOngoingAnimeIds } from "../services/api";
import { Anime } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { WebFooter } from "../components/WebFooter";

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

const TouchableOpacityWeb = TouchableOpacity as any;

const AnimeListScreen: React.FC<AnimeListScreenProps> = ({
  route,
  navigation,
}) => {
  const { type, title } = route?.params || { type: "ongoing", title: "Anime Ongoing" };
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  let numColumns = 3;
  if (width >= 768) numColumns = 6;

  const flatListRef = useRef<FlatList>(null);

  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [genres, setGenres] = useState<any[]>([{ id: "all", label: "ALL CATEGORIES" }]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [showMobileGenres, setShowMobileGenres] = useState(false);

  // Sync state to reset pagination and list when navigation parameters change
  const [prevType, setPrevType] = useState(type);
  const [prevGenre, setPrevGenre] = useState(selectedGenre);

  if (type !== prevType || selectedGenre !== prevGenre) {
    setPrevType(type);
    setPrevGenre(selectedGenre);
    setCurrentPage(1);
    setAnimeList([]);
    setHasMore(true);
  }

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
            }))
          ];
          setGenres(mapped);
        }
      } catch (err) {
        console.error("Failed to load genres in AnimeListScreen:", err);
      }
    };
    fetchGenresList();
  }, []);

  const screenTitle =
    title || (type === "ongoing" ? "Anime Ongoing" : "Anime Completed");

  const fetchAnime = async (page: number, isRefresh: boolean = false) => {
    if (loading) return;

    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      let data: Anime[] = [];
      if (selectedGenre === "all") {
        console.log(`[PAGINATION] Fetching ${type} anime page ${page}`);
        const fetchFunction = type === "ongoing" ? getOngoingAnime : getCompleteAnime;
        data = await fetchFunction(page);
        
        const slicedData = (data || []).slice(0, 24);
        setAnimeList(slicedData);
        setHasMore(data && data.length >= 25);
      } else {
        console.log(`[PAGINATION] Fetching genre ${selectedGenre} page ${page} for ${type} filter`);
        const genreData = await getAnimeByGenre(selectedGenre, page);
        
        // Fetch ongoing IDs for local status mapping
        const ongoingIds = await getOngoingAnimeIds();
        
        data = (genreData || []).filter((item: Anime) => {
          const isOngoing = ongoingIds.has(item.animeId);
          return type === "ongoing" ? isOngoing : !isOngoing;
        });

        const slicedData = data.slice(0, 24);
        setAnimeList(slicedData);
        setHasMore(genreData && genreData.length >= 25);
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
  }, [type, selectedGenre, currentPage]);

  const onRefresh = useCallback(() => {
    fetchAnime(currentPage, true);
  }, [type, selectedGenre, currentPage]);

  const renderAnimeItem = ({ item, index }: { item: Anime; index: number }) => {
    const displayIndex = (currentPage - 1) * 25 + index + 1;
    return (
      <TouchableOpacityWeb
        className="web-card-hover"
        style={[
          styles.card,
          { 
            backgroundColor: colors.card, 
            width: Platform.OS === 'web' 
              ? `calc((100% - ${(numColumns - 1) * 16}px) / ${numColumns})` as any 
              : `${100 / numColumns}%` as any
          },
        ]}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("Episode", {
            bookId: item.animeId,
            title: item.title,
          })
        }
      >
        {/* Cover Image */}
        <View style={styles.cardImageWrap}>
          <Image
            source={{
              uri: item.poster || "https://via.placeholder.com/180x240",
            }}
            style={styles.cardImage}
            contentFit="cover"
          />
          {/* Rank badge */}
          <View style={[styles.rankBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.rankText}>#{displayIndex}</Text>
          </View>
          {/* Type badge */}
          <View
            style={[styles.typeBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}
          >
            <Text style={styles.typeText}>
              {type === "ongoing" ? "ONGOING" : "COMPLETED"}
            </Text>
          </View>
        </View>

        {/* Card Info */}
        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.title || "Unknown Anime"}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardEpisode, { color: colors.textSecondary }]}>
              {item.totalEpisodes || "?"} ep
            </Text>
            <Text style={[styles.cardScore, { color: colors.accent }]}>
              ⭐ {item.score || "N/A"}
            </Text>
          </View>
        </View>
      </TouchableOpacityWeb>
    );
  };

  const renderPagination = () => {
    if (loading || animeList.length === 0) return null;

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[
            styles.paginationButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            currentPage === 1 && styles.disabledButton,
          ]}
          disabled={currentPage === 1 || loading}
          onPress={() => {
            setCurrentPage((prev) => Math.max(prev - 1, 1));
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={currentPage === 1 ? colors.textMuted : colors.accent}
          />
          <Text
            style={[
              styles.paginationButtonText,
              { color: currentPage === 1 ? colors.textMuted : colors.text },
            ]}
          >
            Sebelumnya
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.pageIndicator,
            { backgroundColor: isDark ? "rgba(255, 71, 87, 0.15)" : "rgba(255, 71, 87, 0.08)" },
          ]}
        >
          <Text style={[styles.pageIndicatorText, { color: colors.accent }]}>
            Halaman {currentPage}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.paginationButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            !hasMore && styles.disabledButton,
          ]}
          disabled={!hasMore || loading}
          onPress={() => {
            setCurrentPage((prev) => prev + 1);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.paginationButtonText,
              { color: !hasMore ? colors.textMuted : colors.text },
            ]}
          >
            Berikutnya
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={!hasMore ? colors.textMuted : colors.accent}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (loading && currentPage === 1) return null;
    return (
      <View style={{ width: "100%" }}>
        {renderPagination()}
        <WebFooter />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="film-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          Tidak ada anime ditemukan
        </Text>
        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.retryButton, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.retryButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const filteredAnimeList = animeList.filter((item) =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = (isInsideScroll: boolean = false) => (
    <View style={[
      styles.searchGenreContainer,
      { backgroundColor: colors.sidebar, borderBottomColor: colors.border },
      (isDesktop && !isInsideScroll) && { paddingTop: 72 },
      (isDesktop && isInsideScroll) && { paddingHorizontal: 0, backgroundColor: "transparent", borderBottomWidth: 0, paddingTop: 16 }
    ]}>
      {/* Genre Carousel (Horizontal Scroll) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreScroll}
      >
        {genres.map((g) => {
          const isActive = selectedGenre === g.id;
          return (
            <TouchableOpacityWeb
              key={g.id}
              className="web-genre-tag-hover"
              style={[
                styles.genreTag,
                isActive
                  ? { 
                      backgroundColor: colors.accent,
                      borderColor: colors.accent,
                      borderWidth: 1,
                      shadowColor: colors.accent,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 4,
                    }
                  : { 
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)", 
                      borderColor: colors.border, 
                      borderWidth: 1 
                    }
              ]}
              onPress={() => setSelectedGenre(g.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.genreTagText,
                  { 
                    color: isActive ? "#FFF" : colors.textSecondary,
                    fontWeight: isActive ? "700" : "600"
                  }
                ]}
              >
                {g.label === "ALL CATEGORIES" ? "ALL" : g.label}
              </Text>
            </TouchableOpacityWeb>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading anime...
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.bg },
      ]}
      edges={["top"]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {!isDesktop && (
        <View style={[styles.mobileHeader, { backgroundColor: colors.sidebar, borderBottomColor: colors.border }]}>
          <View style={styles.mobileHeaderLeft}>
            <TouchableOpacity
              style={styles.mobileBackButton}
              onPress={() => navigation?.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.mobileHeaderTitle, { color: colors.text }]}>
              {screenTitle}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.filterToggleBtn,
              {
                backgroundColor: showMobileGenres ? colors.accent : colors.card,
                borderColor: showMobileGenres ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setShowMobileGenres(!showMobileGenres)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showMobileGenres ? "funnel" : "funnel-outline"}
              size={14}
              color={showMobileGenres ? "#FFF" : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.filterToggleText, { color: showMobileGenres ? "#FFF" : colors.textSecondary }]}>
              Filter
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {(!isDesktop && showMobileGenres) && renderHeader(false)}

      <FlatList
        ref={flatListRef}
        data={filteredAnimeList}
        renderItem={renderAnimeItem}
        keyExtractor={(item, index) => `${item.animeId}-${index}`}
        numColumns={numColumns}
        key={`flatlist-${numColumns}`} // Force re-render when column size shifts
        contentContainerStyle={[styles.listContent, isDesktop && { paddingTop: 72 }, { flexGrow: 1 }]}
        ListHeaderComponent={isDesktop ? renderHeader(true) : null}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={loading && currentPage === 1 ? renderLoading : renderEmpty}
      />
    </SafeAreaView>
  );
};

export default AnimeListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchGenreContainer: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 40,
    padding: 0,
    outlineStyle: "none",
  } as any,
  clearBtn: {
    padding: 4,
  },
  genreScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  genreTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  genreTagText: {
    fontSize: 12,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    padding: 12,
  },
  columnWrapper: {
    justifyContent: "flex-start",
    gap: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#1A1A1A",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  rankBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  typeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    color: "#FFF",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  cardInfo: {
    padding: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "bold",
    lineHeight: 15,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardEpisode: {
    fontSize: 10,
    fontWeight: "normal",
  },
  cardScore: {
    fontSize: 10,
    fontWeight: "bold",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
    width: "100%",
  },
  footerText: {
    marginTop: 8,
    fontSize: 12,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
    width: "100%",
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    width: "100%",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mobileHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  mobileBackButton: {
    padding: 4,
    marginRight: 12,
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  filterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
