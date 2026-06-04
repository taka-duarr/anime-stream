import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  DimensionValue,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { searchAnime, getGenreList } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const CARD_MARGIN = 8;

const POPULAR_SEARCHES = [
  "One Piece",
  "Solo Leveling",
  "Demon Slayer",
  "Jujutsu Kaisen",
  "Chainsaw Man",
  "Naruto",
  "Boruto",
  "Black Clover",
];

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

const SearchScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  let numColumns = 2;
  if (width >= 1200) numColumns = 5;
  else if (width >= 900) numColumns = 4;
  else if (width >= 600) numColumns = 3;

  const listPadding = 16;
  const availableWidth = width - listPadding * 2;
  const CARD_WIDTH = availableWidth / numColumns - CARD_MARGIN;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [genres, setGenres] = useState<any[]>([]);

  useEffect(() => {
    const fetchPopularGenres = async () => {
      try {
        const data = await getGenreList();
        if (data && Array.isArray(data)) {
          // Take first 8 genres
          setGenres(data.slice(0, 8));
        }
      } catch (err) {
        console.error("Error fetching popular genres:", err);
      }
    };
    fetchPopularGenres();
  }, []);

  const triggerSearch = async (searchVal: string) => {
    if (!searchVal.trim()) return;
    try {
      setLoading(true);
      setResults([]);

      const timeoutPromise = new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 7000)
      );

      const animeResults = await Promise.race([
        searchAnime(searchVal),
        timeoutPromise,
      ]);

      setResults(animeResults || []);
    } catch (e) {
      console.log("Search error or timeout (silently handled):", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    triggerSearch(query);
  };

  const handleSearchWithQuery = (searchVal: string) => {
    setQuery(searchVal);
    triggerSearch(searchVal);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  const totalResults = results.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style="auto" />

      {/* SEARCH BAR */}
      <View
        style={[
          styles.searchHeader,
          { backgroundColor: colors.bg },
          isDesktop && { maxWidth: 800, width: "100%", alignSelf: "center" },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.03)",
              borderColor: isFocused ? colors.accent : colors.border,
            },
            isFocused && Platform.select({
              web: {
                boxShadow: `0 0 0 3px ${colors.accent}33`,
              } as any,
              default: {
                shadowColor: colors.accent,
                shadowOpacity: 0.15,
                shadowRadius: 6,
                elevation: 4,
              }
            })
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color={isFocused ? colors.accent : colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search anime..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* RESULT HEADER */}
      {!loading && totalResults > 0 && (
        <View style={[styles.resultInfoRow, isDesktop && { maxWidth: 1200, width: "100%", alignSelf: "center" }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            Hasil untuk <Text style={{ color: "#FF4757" }}>"{query}"</Text>
          </Text>
          <View style={[styles.resultBadge, { backgroundColor: "#FF4757" }]}>
            <Text style={styles.resultBadgeText}>{totalResults}</Text>
          </View>
        </View>
      )}

      {loading && (
        <ActivityIndicator size="large" color="#FF4757" style={styles.loader} />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          { paddingBottom: 40 },
          isDesktop && { maxWidth: 1200, width: "100%", alignSelf: "center" }
        ]}
      >
        {/* ===== SEARCH RESULTS ===== */}
        {results.length > 0 && (
          <View style={styles.section}>
            <View style={styles.gridRow}>
              {results.map((item, i) => {
                return (
                  <TouchableOpacity
                    key={item.animeId ?? i}
                    style={[
                      styles.card,
                      {
                        width: CARD_WIDTH as DimensionValue,
                        backgroundColor: colors.card,
                      },
                    ]}
                    activeOpacity={0.82}
                    onPress={() =>
                      navigation.navigate("Episode", {
                        bookId: item.animeId,
                        title: item.title,
                      })
                    }
                  >
                    <View style={styles.imageContainer}>
                      <Image
                        source={{
                          uri:
                            item.poster ||
                            "https://via.placeholder.com/180x240",
                        }}
                        style={styles.image}
                        contentFit="cover"
                      />
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={10} color="#FBBF24" />
                        <Text style={styles.ratingText}>
                          {item.score || "N/A"}
                        </Text>
                      </View>
                      {item.status && (
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                item.status === "Ongoing"
                                  ? "#10B981"
                                  : "#6366F1",
                            },
                          ]}
                        >
                          <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.cardTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.cardSub, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.type || "TV"} • {item.totalEpisodes || "?"} Eps
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ===== POPULAR SUGGESTIONS ===== */}
        {query.trim() === "" && !loading && (
          <View style={[styles.suggestContainer, isDesktop && styles.desktopSuggestRow]}>
            {/* Popular Searches Column */}
            <View style={styles.suggestSection}>
              <Text style={[styles.suggestTitle, { color: colors.text }]}>
                Pencarian Populer
              </Text>
              <View style={styles.chipsContainer}>
                {POPULAR_SEARCHES.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleSearchWithQuery(item)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="trending-up-outline"
                      size={14}
                      color={colors.accent}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.chipText, { color: colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Popular Genres Column */}
            {genres.length > 0 && (
              <View style={[styles.suggestSection, isDesktop && { marginLeft: 24 }]}>
                <Text style={[styles.suggestTitle, { color: colors.text }]}>
                  Genre Terpopuler
                </Text>
                <View style={styles.chipsContainer}>
                  {genres.map((genre, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() =>
                        navigation.navigate("GenreAnime", {
                          genreId: genre.genreId,
                          genreName: genre.title,
                        })
                      }
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={getGenreIcon(genre.title)}
                        size={14}
                        color={colors.accent}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.chipText, { color: colors.text }]}>{genre.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* EMPTY STATE */}
        {!loading && query.trim() !== "" && totalResults === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <LinearGradient
                colors={isDark ? ["rgba(255, 71, 87, 0.15)", "rgba(255, 71, 87, 0.03)"] as const : ["rgba(255, 71, 87, 0.08)", "rgba(255, 71, 87, 0.01)"] as const}
                style={styles.emptyGlow}
              />
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "rgba(255, 71, 87, 0.12)" : "rgba(255, 71, 87, 0.06)" }]}>
                <Ionicons
                  name="search"
                  size={36}
                  color={colors.accent}
                />
              </View>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Hasil Tidak Ditemukan
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Tidak ada hasil penelusuran untuk <Text style={{ color: colors.accent, fontWeight: "600" }}>"{query}"</Text>. Silakan coba gunakan kata kunci yang berbeda.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* HEADER */
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: { marginRight: 14 },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  searchIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "normal",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },
  clearBtn: { padding: 6 },

  /* RESULT HEADER */
  resultInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  resultTitle: { flex: 1, fontSize: 16, fontWeight: "bold" },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultBadgeText: { color: "#fff", fontSize: 13, fontWeight: "bold" },

  loader: { marginTop: 40 },

  /* SECTION */
  section: { marginBottom: 8 },

  /* GRID */
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16 - CARD_MARGIN / 2,
  },

  /* CARD */
  card: {
    marginBottom: 20,
    marginHorizontal: CARD_MARGIN / 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 0.67,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#E2E8F0",
  },
  image: { width: "100%", height: "100%" },
  ratingBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    backgroundColor: "rgba(15,23,42,0.8)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  statusBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  cardTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginHorizontal: 8,
    marginBottom: 2,
  },
  cardSub: { fontSize: 11, marginHorizontal: 8, marginBottom: 8 },

  /* EMPTY */
  emptyContainer: {
    marginTop: 80,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    justifyContent: "center",
    alignItems: "center",
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  emptyGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 12,
    textAlign: "center",
  },
  emptySub: { 
    fontSize: 14, 
    marginTop: 8, 
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },

  /* SUGGESTIONS */
  suggestContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 28,
  },
  desktopSuggestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 0,
  },
  suggestSection: {
    flex: 1,
  },
  suggestTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
