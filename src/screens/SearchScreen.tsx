import React, { useState } from "react";
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
} from "react-native";
import { Image } from "expo-image";
import { searchAnime } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const CARD_MARGIN = 8;

const SearchScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
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

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      setResults([]);

      const animeResults = await searchAnime(query);
      setResults(animeResults || []);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
    }
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
      <View style={[styles.searchHeader, { backgroundColor: colors.bg }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="search"
            size={20}
            color="#FF4757"
            style={styles.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari anime..."
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
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
        <View style={styles.resultInfoRow}>
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
        contentContainerStyle={{ paddingBottom: 40 }}
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

        {/* EMPTY STATE */}
        {!loading && query.trim() !== "" && totalResults === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="search-outline"
              size={64}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              Tidak ada hasil untuk "{query}"
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Coba kata kunci yang berbeda
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
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  searchIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, fontWeight: "500" },
  clearBtn: { padding: 6 },

  /* RESULT HEADER */
  resultInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  resultTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },

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
  ratingText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  statusBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
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
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  emptySub: { fontSize: 14, marginTop: 8, textAlign: "center" },
});
