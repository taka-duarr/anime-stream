import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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

  const renderGenreItem = ({ item }: { item: Genre }) => {
    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          {
            backgroundColor: colors.card,
          },
        ]}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("GenreAnime", {
            genreId: item.genreId,
            genreName: item.title,
          })
        }
      >
        {/* Icon Section (Left) */}
        <View style={styles.iconContainer}>
          <Ionicons name="film-outline" size={32} color={colors.accent} />
        </View>

        {/* Title Section (Center) */}
        <View style={styles.titleContainer}>
          <Text
            style={[styles.genreTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>

        {/* Chevron Section (Right) */}
        <View style={styles.chevronContainer}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
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
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          )}
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
    padding: 0,
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 64,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  genreTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  chevronContainer: {
    marginLeft: 12,
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
