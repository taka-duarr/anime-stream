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
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { getAnimeByGenre } from "../services/api";
import { Anime } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { WebFooter } from "../components/WebFooter";

interface GenreAnimeScreenProps {
  route?: {
    params: {
      genreId: string;
      genreName: string;
    };
  };
  navigation?: any;
}

const TouchableOpacityWeb = TouchableOpacity as any;

const GenreAnimeScreen: React.FC<GenreAnimeScreenProps> = ({
  route,
  navigation,
}) => {
  const { genreId, genreName } = route?.params || { genreId: "", genreName: "" };
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;


  let numColumns = 3;
  if (width >= 768) numColumns = 6;

  const flatListRef = useRef<FlatList>(null);

  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Sync state to reset pagination and list when genreId parameter changes
  const [prevGenreId, setPrevGenreId] = useState(genreId);
  if (genreId !== prevGenreId) {
    setPrevGenreId(genreId);
    setCurrentPage(1);
    setAnimeList([]);
    setHasMore(true);
  }

  const fetchAnime = async (page: number, isRefresh: boolean = false) => {
    if (loading) return;

    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      console.log(`[GENRE PAGINATION] Fetching genre ${genreId} page ${page}`);

      const data = await getAnimeByGenre(genreId, page);

      if (data && Array.isArray(data) && data.length > 0) {
        // Slice to exactly 24 items (4 rows of 6 cards)
        const slicedData = data.slice(0, 24);
        setAnimeList(slicedData);
        setHasMore(data.length >= 25);
        
        console.log(`[GENRE PAGINATION] Loaded ${slicedData.length} items (sliced from ${data.length}), hasMore: ${data.length >= 25}`);
      } else {
        setAnimeList([]);
        setHasMore(false);
        console.log(`[GENRE PAGINATION] No data available`);
      }
    } catch (error) {
      console.error(`[GENRE PAGINATION ERROR] Failed to fetch page ${page}:`, error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnime(currentPage);
  }, [genreId, currentPage]);

  const onRefresh = useCallback(() => {
    fetchAnime(currentPage, true);
  }, [genreId, currentPage]);

  const renderAnimeItem = ({ item, index }: { item: Anime; index: number }) => {
    const displayIndex = (currentPage - 1) * 24 + index + 1;
    return (
      <TouchableOpacityWeb
        className="web-card-hover"
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            width: Platform.OS === 'web' 
              ? `calc((100% - ${(numColumns - 1) * 16}px) / ${numColumns})` as any 
              : `${100 / numColumns}%` as any,
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
          {/* Status badge */}
          {item.status && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: "rgba(0,0,0,0.6)" },
              ]}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          )}
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

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading anime...
      </Text>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="film-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          Tidak ada anime ditemukan untuk genre ini
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

  const renderHeader = (isInsideScroll: boolean = false) => (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.sidebar, borderBottomColor: colors.border },
        (isDesktop && !isInsideScroll) && { paddingTop: 72 },
        (isDesktop && isInsideScroll) && { paddingHorizontal: 0, backgroundColor: "transparent", borderBottomWidth: 0 }
      ]}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {genreName}
        </Text>
        <Text
          style={[styles.headerSubtitle, { color: colors.textSecondary }]}
        >
          {animeList.length} anime • Page {currentPage}
        </Text>
      </View>
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

      {!isDesktop && renderHeader(false)}
      <FlatList
        ref={flatListRef}
        data={animeList}
        renderItem={renderAnimeItem}
        keyExtractor={(item, index) => `${item.animeId}-${index}`}
        numColumns={numColumns}
        key={`genre-anime-${numColumns}-columns`}
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

export default GenreAnimeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontWeight: "700",
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
  statusBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: "#FFF",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
