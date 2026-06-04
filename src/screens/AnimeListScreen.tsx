import React, { useEffect, useState, useCallback } from "react";
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
import { getOngoingAnime, getCompleteAnime, getAnimeByGenre, getGenreList } from "../services/api";
import { Anime } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

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

const AnimeListScreen: React.FC<AnimeListScreenProps> = ({
  route,
  navigation,
}) => {
  const { type, title } = route?.params || { type: "ongoing", title: "Anime Ongoing" };
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  let numColumns = 2;
  if (width >= 1200) numColumns = 5;
  else if (width >= 900) numColumns = 4;
  else if (width >= 600) numColumns = 3;

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
    if (loading || loadingMore) return;

    if (page === 1) {
      isRefresh ? setRefreshing(true) : setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let data: Anime[] = [];
      if (selectedGenre === "all") {
        console.log(`[PAGINATION] Fetching ${type} anime page ${page}`);
        const fetchFunction = type === "ongoing" ? getOngoingAnime : getCompleteAnime;
        data = await fetchFunction(page);
      } else {
        console.log(`[PAGINATION] Fetching genre ${selectedGenre} page ${page} for ${type} filter`);
        const genreData = await getAnimeByGenre(selectedGenre, page);
        data = genreData.filter((item: Anime) => {
          if (!item.status) return true; // Fallback if status is missing in genre response
          const statusLower = item.status.toLowerCase();
          if (type === "ongoing") {
            return statusLower.includes("ongoing");
          } else {
            return statusLower.includes("completed") || statusLower.includes("complete") || (!statusLower.includes("ongoing") && statusLower !== "");
          }
        });
      }

      if (data && data.length > 0) {
        if (page === 1) {
          setAnimeList(data);
        } else {
          setAnimeList((prev) => [...prev, ...data]);
        }
        setHasMore(selectedGenre === "all" ? (data.length >= 20) : (data.length >= 5));
      } else {
        if (page === 1) {
          setAnimeList([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error(`[PAGINATION ERROR] Failed to fetch page ${page}:`, error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setAnimeList([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchAnime(1);
  }, [type, selectedGenre]);

  const onRefresh = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchAnime(1, true);
  }, [type, selectedGenre]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchAnime(nextPage);
    }
  }, [currentPage, hasMore, loadingMore, loading, type, selectedGenre]);

  const renderAnimeItem = ({ item, index }: { item: Anime; index: number }) => {
    return (
      <TouchableOpacity
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
            <Text style={styles.rankText}>#{index + 1}</Text>
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
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Loading more...
        </Text>
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
      {/* Genre Tags Wrap */}
      <View style={styles.genreScroll}>
        {genres.map((g) => {
          const isActive = selectedGenre === g.id;
          return (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.genreTag,
                isActive
                  ? { backgroundColor: colors.accent }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }
              ]}
              onPress={() => setSelectedGenre(g.id)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.genreTagText,
                  { color: isActive ? "#FFF" : colors.textSecondary }
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  genreTagText: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
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
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  rankText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  typeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "bold",
    lineHeight: 18,
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardEpisode: {
    fontSize: 11,
    fontWeight: "normal",
  },
  cardScore: {
    fontSize: 11,
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
