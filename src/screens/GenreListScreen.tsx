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
  TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getGenreList } from "../services/api";
import { WebFooter } from "../components/WebFooter";

interface Genre {
  genreId: string;
  title: string;
  href: string;
  otakudesuUrl: string;
}

interface GenreListScreenProps {
  navigation: any;
}

const GENRE_COLORS = [
  "#FF4757", "#2ED573", "#1E90FF", "#FFA502", "#9B59B6", 
  "#1ABC9C", "#E67E22", "#E84393", "#00CEC9", "#6C5CE7",
  "#FF7675", "#0984E3", "#D63031", "#E17055", "#FD79A8"
];

const GenreListScreen: React.FC<GenreListScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const numColumns = isDesktop ? 6 : 2;
  const cardPercent = isDesktop ? "15.5%" : "48%";

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

  const getGenreIcon = (title: string): any => {
    const t = title.toLowerCase();
    if (t.includes("action") || t.includes("aksi")) return "flame-outline";
    if (t.includes("adventure") || t.includes("petualangan")) return "compass-outline";
    if (t.includes("comedy") || t.includes("komedi")) return "happy-outline";
    if (t.includes("drama")) return "people-outline";
    if (t.includes("fantasy") || t.includes("fantasi")) return "sparkles-outline";
    if (t.includes("romance") || t.includes("romantis")) return "heart-outline";
    if (t.includes("sci-fi") || t.includes("science fiction")) return "planet-outline";
    if (t.includes("slice of life")) return "cafe-outline";
    if (t.includes("mystery") || t.includes("misteri")) return "search-outline";
    if (t.includes("horror") || t.includes("horor")) return "skull-outline";
    if (t.includes("psychological") || t.includes("psikologi")) return "pulse-outline";
    if (t.includes("mecha")) return "hardware-chip-outline";
    if (t.includes("sports") || t.includes("olahraga")) return "baseball-outline";
    if (t.includes("supernatural") || t.includes("supranatural")) return "moon-outline";
    if (t.includes("thriller")) return "alert-circle-outline";
    if (t.includes("music") || t.includes("musik")) return "musical-notes-outline";
    if (t.includes("magic") || t.includes("sihir")) return "color-wand-outline";
    if (t.includes("game") || t.includes("permainan")) return "game-controller-outline";
    if (t.includes("martial arts") || t.includes("bela diri")) return "fitness-outline";
    if (t.includes("school") || t.includes("sekolah")) return "school-outline";
    if (t.includes("historical") || t.includes("sejarah")) return "hourglass-outline";
    if (t.includes("military") || t.includes("militer")) return "shield-outline";
    
    return "film-outline";
  };

  const getGenreColor = (title: string): string => {
    // Both Mobile & Desktop use the same hash-based diverse colors
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % GENRE_COLORS.length;
    return GENRE_COLORS[index];
  };

  const renderGenreItem = ({ item }: { item: Genre }) => {
    const iconColor = getGenreColor(item.title);

    return (
      <TouchableOpacity
        style={[
          styles.genreCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            width: cardPercent as any,
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
        {/* Icon Container with subtle background tint matching the icon color */}
        <View style={[
          styles.cardIconContainer, 
          { 
            backgroundColor: isDark 
              ? `${iconColor}18` 
              : `${iconColor}12` 
          }
        ]}>
          <Ionicons name={getGenreIcon(item.title)} size={30} color={iconColor} />
        </View>

        {/* Title */}
        <Text
          style={[styles.genreCardTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Loading genres...
      </Text>
    </View>
  );

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

  const filteredGenres = genres.filter((g) =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = (isInsideScroll: boolean = false) => (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.sidebar, borderBottomColor: colors.border, paddingVertical: 14 },
        (isDesktop && !isInsideScroll) && { paddingTop: 72 },
        (isDesktop && isInsideScroll) && { paddingHorizontal: 0, backgroundColor: "transparent", borderBottomWidth: 0 }
      ]}
    >
      <View style={[styles.searchBar, { backgroundColor: colors.searchBg }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          placeholder="Cari genre..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
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
        data={filteredGenres}
        renderItem={renderGenreItem}
        keyExtractor={(item, index) => `${item.genreId}-${index}`}
        numColumns={numColumns}
        key={`genre-grid-${numColumns}`} // Force re-layout when column size shifts
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
        ListFooterComponent={WebFooter}
        ListEmptyComponent={loading && !refreshing ? renderLoading : renderEmpty}
      />
    </SafeAreaView>
  );
};

export default GenreListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
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
    padding: 16,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  genreCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  genreCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
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
