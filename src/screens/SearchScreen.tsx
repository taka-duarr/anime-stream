import React, { useState, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Pressable,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { searchAnime, getGenreList } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { EASE_OUT, FadeIn, Glass, Lift, NATIVE_DRIVER, Rating, Shimmer, StatusPill, glassWebStyle } from "../components/ui";

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

const hoverBg = (base: any, hover: any) => ({ hovered, pressed }: any) => [base, (hovered || pressed) && hover];

const SearchScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 768;

  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [genres, setGenres] = useState<any[]>([]);

  // The search capsule glows while focused
  const focus = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(focus, {
      toValue: isFocused ? 1 : 0,
      duration: 260,
      easing: EASE_OUT,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [isFocused]);

  useEffect(() => {
    const fetchPopularGenres = async () => {
      try {
        const data = await getGenreList();
        if (data && Array.isArray(data)) setGenres(data.slice(0, 8));
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
      setSubmitted(searchVal);
      const timeoutPromise = new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 7000),
      );
      const animeResults = await Promise.race([searchAnime(searchVal), timeoutPromise]);
      setResults(animeResults || []);
    } catch (e) {
      console.log("Search error or timeout (silently handled):", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchWithQuery = (searchVal: string) => {
    setQuery(searchVal);
    triggerSearch(searchVal);
  };

  const clearSearch = () => {
    setQuery("");
    setSubmitted("");
    setResults([]);
  };

  // Grid
  const pad = isDesktop ? 24 : 14;
  const contentMax = 1320;
  const cols = width >= 1280 ? 7 : width >= 1040 ? 6 : width >= 768 ? 5 : width >= 520 ? 3 : 2;
  const gap = isDesktop ? 18 : 12;
  const cardWidth = (Math.min(width, contentMax) - pad * 2 - gap * (cols - 1)) / cols;

  const showSuggestions = query.trim() === "" && !loading;
  const showEmpty = !loading && submitted !== "" && query.trim() !== "" && results.length === 0;

  const chip = (key: string | number, icon: any, label: string, onPress: () => void, delay: number) => (
    <FadeIn key={key} delay={delay} distance={10}>
      <Pressable
        onPress={onPress}
        style={hoverBg(
          [styles.chip, { backgroundColor: colors.searchBg, borderColor: colors.glassBorder }],
          { backgroundColor: colors.glassHover },
        )}
      >
        <Ionicons name={icon} size={14} color={colors.textSecondary} />
        <Text style={{ color: colors.text, fontSize: 13.5, fontWeight: "600" }}>{label}</Text>
      </Pressable>
    </FadeIn>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Ambient glow behind the search capsule */}
      <LinearGradient
        colors={[isDark ? "rgba(236,43,85,0.16)" : "rgba(225,29,72,0.10)", "transparent"]}
        style={styles.ambient}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + (isDesktop ? 56 : 18),
          paddingBottom: 48,
          paddingHorizontal: pad,
        }}
      >
        <View style={{ width: "100%", maxWidth: contentMax, alignSelf: "center" }}>
          {/* HEADLINE */}
          {isDesktop && (
            <FadeIn>
              <Text style={[styles.headline, { color: colors.text }]}>Cari anime apa hari ini?</Text>
            </FadeIn>
          )}

          {/* SEARCH CAPSULE */}
          <FadeIn delay={80} style={{ width: "100%", maxWidth: 760, alignSelf: "center" }}>
            <View style={styles.searchRow}>
              <Pressable
                onPress={() => navigation.goBack()}
                accessibilityLabel="Kembali"
                style={hoverBg(
                  [styles.roundBtn, { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder }, glassWebStyle(20)],
                  { backgroundColor: colors.glassHover },
                )}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </Pressable>

              <View style={{ flex: 1 }}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.focusRing,
                    {
                      borderColor: colors.accent,
                      opacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }),
                      transform: [{ scale: focus.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }],
                    },
                  ]}
                />
                <View
                  style={[
                    styles.searchBar,
                    { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder },
                    glassWebStyle(26),
                  ]}
                >
                  <Ionicons name="search" size={20} color={isFocused ? colors.text : colors.textSecondary} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search anime..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { color: colors.text }, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]}
                    onSubmitEditing={() => triggerSearch(query)}
                    returnKeyType="search"
                    autoFocus
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                  {query.length > 0 && (
                    <Pressable onPress={clearSearch} accessibilityLabel="Hapus pencarian" hitSlop={8}>
                      <Ionicons name="close-circle" size={19} color={colors.textSecondary} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => triggerSearch(query)}
                    accessibilityLabel="Cari"
                    style={hoverBg([styles.goBtn, { backgroundColor: colors.buttonPrimaryBg }], { opacity: 0.85 })}
                  >
                    <Ionicons name="arrow-forward" size={17} color={colors.buttonPrimaryText} />
                  </Pressable>
                </View>
              </View>
            </View>
          </FadeIn>

          {/* SUGGESTIONS */}
          {showSuggestions && (
            <FadeIn delay={160} style={{ marginTop: 28, width: "100%", maxWidth: 980, alignSelf: "center" }}>
              <View style={isDesktop ? { flexDirection: "row", gap: 16 } : { gap: 14 }}>
                <Glass radius={26} style={styles.suggestPanel}>
                  <Text style={[styles.panelTitle, { color: colors.text }]}>Pencarian Populer</Text>
                  <View style={styles.chips}>
                    {POPULAR_SEARCHES.map((item, i) =>
                      chip(i, "trending-up-outline", item, () => handleSearchWithQuery(item), 200 + i * 35),
                    )}
                  </View>
                </Glass>
                {genres.length > 0 && (
                  <Glass radius={26} style={styles.suggestPanel}>
                    <Text style={[styles.panelTitle, { color: colors.text }]}>Genre Terpopuler</Text>
                    <View style={styles.chips}>
                      {genres.map((genre, i) =>
                        chip(
                          genre.genreId ?? i,
                          getGenreIcon(genre.title),
                          genre.title,
                          () => navigation.navigate("GenreAnime", { genreId: genre.genreId, genreName: genre.title }),
                          240 + i * 35,
                        ),
                      )}
                    </View>
                  </Glass>
                )}
              </View>
            </FadeIn>
          )}

          {/* LOADING SKELETON */}
          {loading && (
            <View style={[styles.grid, { gap, marginTop: 34 }]}>
              {Array.from({ length: cols * 2 }).map((_, i) => (
                <Shimmer key={i} style={{ width: cardWidth, height: cardWidth / 0.7, borderRadius: 18 }} />
              ))}
            </View>
          )}

          {/* RESULTS */}
          {!loading && results.length > 0 && (
            <View style={{ marginTop: 34 }}>
              <FadeIn>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  Hasil untuk <Text style={{ color: colors.accent }}>"{submitted}"</Text>
                  <Text style={{ color: colors.textMuted, fontWeight: "500" }}>  {results.length} judul</Text>
                </Text>
              </FadeIn>
              <View style={[styles.grid, { gap }]}>
                {results.map((item, i) => {
                  const ongoing = (item.status || "").toLowerCase().includes("ongoing");
                  return (
                    <FadeIn key={item.animeId ?? i} delay={Math.min(i, 20) * 35}>
                      <Lift
                        onPress={() => navigation.navigate("Episode", { bookId: item.animeId, title: item.title })}
                        style={{ width: cardWidth }}
                        accessibilityLabel={item.title}
                      >
                        <View style={[styles.poster, { borderColor: colors.glassBorder, backgroundColor: colors.card }]}>
                          <Image
                            source={{ uri: item.poster || "https://via.placeholder.com/180x240" }}
                            style={StyleSheet.absoluteFill as any}
                            contentFit="cover"
                            transition={300}
                          />
                          <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.posterShade} />
                          {item.status ? (
                            <View style={{ position: "absolute", top: 9, left: 9 }}>
                              <StatusPill kind={ongoing ? "ongoing" : "completed"} label={item.status} small onDark />
                            </View>
                          ) : null}
                          <View style={styles.posterMeta}>
                            <Rating score={item.score || "N/A"} size={11} color="#FFF" />
                            <Text style={styles.posterMetaText} numberOfLines={1}>
                              {item.type || "TV"} • {item.totalEpisodes || "?"} Eps
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                          {item.title}
                        </Text>
                      </Lift>
                    </FadeIn>
                  );
                })}
              </View>
            </View>
          )}

          {/* EMPTY STATE */}
          {showEmpty && (
            <FadeIn style={{ marginTop: 44, alignSelf: "center", width: "100%", maxWidth: 460 }}>
              <Glass radius={28} style={{ padding: 32, alignItems: "center" }}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.searchBg, borderColor: colors.glassBorder }]}>
                  <Ionicons name="search" size={30} color={colors.text} />
                </View>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 18 }}>
                  Hasil Tidak Ditemukan
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 8 }}>
                  Tidak ada hasil penelusuran untuk{" "}
                  <Text style={{ color: colors.accent, fontWeight: "600" }}>"{submitted}"</Text>. Silakan coba gunakan
                  kata kunci yang berbeda.
                </Text>
              </Glass>
            </FadeIn>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambient: { position: "absolute", top: 0, left: 0, right: 0, height: 420 },
  headline: { fontSize: 40, fontWeight: "800", letterSpacing: -1, textAlign: "center", marginBottom: 26 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  roundBtn: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  focusRing: { position: "absolute", top: -4, left: -4, right: -4, bottom: -4, borderRadius: 31, borderWidth: 2 },
  searchBar: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 7,
    gap: 12,
  },
  input: { flex: 1, fontSize: 16, height: 54, paddingVertical: 0 },
  goBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  suggestPanel: { flex: 1, padding: 22 },
  panelTitle: { fontSize: 16, fontWeight: "800", marginBottom: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
  },
  resultTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, marginBottom: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  poster: { width: "100%", aspectRatio: 0.7, borderRadius: 18, overflow: "hidden", borderWidth: 1 },
  posterShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%" },
  posterMeta: { position: "absolute", left: 10, right: 10, bottom: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  posterMetaText: { color: "rgba(255,255,255,0.9)", fontSize: 11.5, fontWeight: "600", flex: 1 },
  cardTitle: { fontSize: 13.5, fontWeight: "600", lineHeight: 18, marginTop: 9 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
