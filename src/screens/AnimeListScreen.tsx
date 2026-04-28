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
} from "react-native";
import { Image } from "expo-image";
import { getOngoingAnime, getCompleteAnime } from "../services/api";
import { Anime } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

type AnimeListType = "ongoing" | "completed";

interface AnimeListScreenProps {
  route: {
    params: {
      type: AnimeListType;
      title?: string;
    };
  };
  navigation: any;
}

const AnimeListScreen: React.FC<AnimeListScreenProps> = ({
  route,
  navigation,
}) => {
  const { type, title } = route.params;
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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
      console.log(`[PAGINATION] Fetching ${type} anime page ${page}`);

      const fetchFunction =
        type === "ongoing" ? getOngoingAnime : getCompleteAnime;
      const data = await fetchFunction(page);

      if (data && data.length > 0) {
        if (page === 1) {
          setAnimeList(data);
        } else {
          setAnimeList((prev) => [...prev, ...data]);
        }

        // Check if there's more data
        // If we get less than expected (e.g., < 20), assume no more pages
        setHasMore(data.length >= 20);

        console.log(
          `[PAGINATION] Loaded ${data.length} items, total: ${page === 1 ? data.length : animeList.length + data.length}`,
        );
      } else {
        setHasMore(false);
        console.log(`[PAGINATION] No more data available`);
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
    fetchAnime(1);
  }, [type]);

  const onRefresh = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    fetchAnime(1, true);
  }, [type]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchAnime(nextPage);
    }
  }, [currentPage, hasMore, loadingMore, loading]);

  const renderAnimeItem = ({ item, index }: { item: Anime; index: number }) => {
    // Calculate responsive columns
    let numColumns = 2;
    if (width >= 1200) numColumns = 5;
    else if (width >= 900) numColumns = 4;
    else if (width >= 600) numColumns = 3;

    const cardWidth = width / numColumns - 24;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.card, width: cardWidth },
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top"]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.sidebar, borderBottomColor: colors.border },
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
            {screenTitle}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {animeList.length} anime • Page {currentPage}
          </Text>
        </View>
      </View>

      {/* Anime List */}
      {loading && currentPage === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading anime...
          </Text>
        </View>
      ) : (
        <FlatList
          data={animeList}
          renderItem={renderAnimeItem}
          keyExtractor={(item, index) => `${item.animeId}-${index}`}
          numColumns={1}
          key={`flatlist-${width}`} // Force re-render on width change
          contentContainerStyle={styles.listContent}
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
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
};

export default AnimeListScreen;

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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
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
    fontWeight: "800",
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
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
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
    fontWeight: "500",
  },
  cardScore: {
    fontSize: 11,
    fontWeight: "700",
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
    fontWeight: "600",
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
    fontWeight: "600",
  },
});
