import React, { useEffect, useState } from "react";
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
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getGenreList } from "../services/api";

interface Genre {
  genreId: string;
  title: string;
  href: string;
  otakudesuUrl: string;
}

interface GenreListScreenProps {
  navigation: any;
}

const GenreListScreen: React.FC<GenreListScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGenres = async (isRefresh: boolean = false) => {
    if (loading) return;

    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      console.log("[GENRE] Fetching genre list");
      const data = await getGenreList();

      if (data && Array.isArray(data)) {
        setGenres(data);
        console.log(`[GENRE] Loaded ${data.length} genres`);
      } else {
        setGenres([]);
        console.error("[GENRE ERROR] Invalid genre data structure");
      }
    } catch (error) {
      console.error("[GENRE ERROR] Failed to fetch genres:", error);
      setGenres([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const onRefresh = () => {
    fetchGenres(true);
  };

  const renderGenreItem = ({ item, index }: { item: Genre; index: number }) => {
    // Generate random gradient colors for each genre
    const gradients = [
      ["#FF6B6B", "#C92A2A"],
      ["#4ECDC4", "#1A535C"],
      ["#FFE66D", "#FF6B35"],
      ["#A8DADC", "#457B9D"],
      ["#F1FAEE", "#E63946"],
      ["#06FFA5", "#00B4D8"],
      ["#B8F2E6", "#5E60CE"],
      ["#FFD6A5", "#FDFFB6"],
    ];

    const gradient = gradients[index % gradients.length];

    return (
      <TouchableOpacity
        style={[
          styles.genreCard,
          {
            backgroundColor: colors.card,
          },
        ]}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("GenreAnime", {
            genreId: item.genreId,
            genreName: item.title,
          })
        }
      >
        <View
          style={[
            styles.genreGradient,
            {
              backgroundColor: gradient[0],
            },
          ]}
        >
          <View style={styles.genreIconWrap}>
            <Ionicons name="film" size={32} color="#FFF" />
          </View>
        </View>

        <View style={styles.genreInfo}>
          <Text
            style={[styles.genreName, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={styles.genreArrow}>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={colors.textSecondary}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="list-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          Tidak ada genre ditemukan
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
            Genre Anime
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {genres.length} genre tersedia
          </Text>
        </View>
      </View>

      {/* Genre List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading genres...
          </Text>
        </View>
      ) : (
        <FlatList
          data={genres}
          renderItem={renderGenreItem}
          keyExtractor={(item, index) => `${item.genreId}-${index}`}
          numColumns={2}
          key="genre-list-2-columns"
          contentContainerStyle={styles.listContent}
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
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
};

export default GenreListScreen;

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
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  genreCard: {
    flex: 1,
    maxWidth: "48%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  genreGradient: {
    width: "100%",
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  genreIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  genreInfo: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  genreName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  genreArrow: {
    marginLeft: 8,
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
