import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
  TextInput,
  Animated,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { getGenreList } from "../services/api";
import { WebFooter } from "../components/WebFooter";
import { FadeIn, Glass, NATIVE_DRIVER, Shimmer, glassWebStyle } from "../components/ui";

interface Genre {
  genreId: string;
  title: string;
  href: string;
  otakudesuUrl: string;
}

interface GenreListScreenProps {
  navigation: any;
}

// Lowercase and drop everything but letters/digits, so "scifi", "sci fi" and
// "Sci-Fi" all match, and "sliceof" finds "Slice of Life".
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// One hand-picked icon per genre (MaterialCommunityIcons has far more fitting
// glyphs than Ionicons: sword, karate, robot, bat, police badge, ...).
const GENRE_ICONS: Record<string, string> = {
  action: "sword-cross",
  adventure: "compass-rose",
  comedy: "emoticon-lol-outline",
  demons: "emoticon-devil-outline",
  drama: "drama-masks",
  ecchi: "fire",
  fantasy: "creation-outline",
  game: "gamepad-variant-outline",
  harem: "account-group-outline",
  historical: "pillar",
  horror: "skull-outline",
  josei: "flower-tulip-outline",
  magic: "wizard-hat",
  martialarts: "karate",
  mecha: "robot-outline",
  military: "shield-sword-outline",
  music: "music-note-outline",
  mystery: "magnify",
  psychological: "brain",
  parody: "party-popper",
  police: "police-badge-outline",
  romance: "heart-outline",
  samurai: "sword",
  school: "school-outline",
  scifi: "atom",
  seinen: "tie",
  shoujo: "ribbon",
  shoujoai: "heart-multiple-outline",
  shounen: "arm-flex-outline",
  sliceoflife: "coffee-outline",
  sports: "soccer",
  space: "rocket-launch-outline",
  superpower: "flash-outline",
  supernatural: "ghost-outline",
  thriller: "knife",
  vampire: "bat",
};

const genreIcon = (title: string): any => GENRE_ICONS[normalize(title)] || "movie-open-outline";

const GenreTile: React.FC<{
  genre: Genre;
  icon: any;
  index: number;
  width: number;
  query: string;
  onPress: () => void;
}> = ({ genre, icon, index, width, query, onPress }) => {
  const { colors } = useTheme();
  const [hovered, setHovered] = useState(false);
  const v = useRef(new Animated.Value(0)).current; // -1 pressed, 0 rest, 1 hovered
  const to = (toValue: number) =>
    Animated.spring(v, { toValue, useNativeDriver: NATIVE_DRIVER, speed: 22, bounciness: 6 }).start();

  // Bold the part of the name that matches the search
  const name = genre.title;
  const q = query.trim().toLowerCase();
  const at = q ? name.toLowerCase().indexOf(q) : -1;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(-1)}
      onPressOut={() => to(hovered ? 1 : 0)}
      {...({
        onHoverIn: () => {
          setHovered(true);
          to(1);
        },
        onHoverOut: () => {
          setHovered(false);
          to(0);
        },
      } as any)}
      accessibilityRole="button"
      accessibilityLabel={`Genre ${name}`}
      style={{ width }}
    >
      <Animated.View
        style={{
          transform: [
            { scale: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.97, 1, 1.03] }) },
            { translateY: v.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, -4] }) },
          ],
        }}
      >
        <View
          style={[
            styles.tile,
            {
              backgroundColor: hovered ? colors.glassHover : colors.glass,
              borderColor: hovered ? colors.accent : colors.glassBorder,
            },
            glassWebStyle(22),
          ]}
        >
          {/* Oversized, tilted copy of the icon as a cropped watermark */}
          <View style={styles.watermark} pointerEvents="none">
            <MaterialCommunityIcons name={icon} size={118} color={colors.text} />
          </View>

          <View style={styles.tileTop}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: hovered ? colors.accent : colors.searchBg,
                  borderColor: hovered ? colors.accent : colors.glassBorder,
                },
              ]}
            >
              <MaterialCommunityIcons name={icon} size={22} color={hovered ? "#FFF" : colors.text} />
            </View>
            <Text style={[styles.tileIndex, { color: colors.textMuted }]}>
              {String(index + 1).padStart(2, "0")}
            </Text>
          </View>

          <View style={styles.tileBottom}>
          <Text style={[styles.tileName, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {at >= 0 ? (
              <>
                {name.slice(0, at)}
                <Text style={{ color: colors.accent, fontWeight: "800" }}>{name.slice(at, at + q.length)}</Text>
                {name.slice(at + q.length)}
              </>
            ) : (
              name
            )}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={15}
            color={hovered ? colors.accent : colors.textMuted}
            style={{ transform: [{ rotate: "-45deg" }], opacity: hovered ? 1 : 0.5 }}
          />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const GenreListScreen: React.FC<GenreListScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 768;

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const fetchGenres = async (isRefresh: boolean = false) => {
    if (loading) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setFailed(false);
    try {
      const data = await getGenreList();
      if (data && Array.isArray(data)) {
        setGenres(data);
      } else {
        setGenres([]);
        setFailed(true);
        console.error("[GENRE ERROR] Invalid genre data structure");
      }
    } catch (error) {
      console.error("[GENRE ERROR] Failed to fetch genres:", error);
      setGenres([]);
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, []);

  const indexOf = useMemo(() => {
    const m: Record<string, number> = {};
    genres.forEach((g, i) => (m[g.genreId] = i));
    return m;
  }, [genres]);

  // Search covers genres only, matched loosely by name
  const filteredGenres = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return genres;
    return genres.filter((g) => normalize(g.title).includes(q));
  }, [genres, searchQuery]);

  // Grid
  const pad = isDesktop ? 24 : 12;
  const contentMax = 1320;
  const cols = width >= 1280 ? 6 : width >= 1000 ? 5 : width >= 768 ? 4 : width >= 520 ? 3 : 2;
  const gap = isDesktop ? 14 : 10;
  const tileWidth = (Math.min(width, contentMax) - pad * 2 - gap * (cols - 1)) / cols;

  const openGenre = (g: Genre) => navigation.navigate("GenreAnime", { genreId: g.genreId, genreName: g.title });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: isDesktop ? 84 : insets.top + 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchGenres(true)} colors={[colors.accent]} tintColor={colors.accent} />
        }
      >
        <View style={{ width: "100%", maxWidth: contentMax, alignSelf: "center", paddingHorizontal: pad, paddingBottom: 48, flexGrow: 1 }}>
          {/* HEADER PANEL */}
          <FadeIn duration={700} distance={20}>
            <Glass radius={28} style={styles.header}>
              <LinearGradient
                colors={[isDark ? "rgba(236,43,85,0.18)" : "rgba(225,29,72,0.10)", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.headerInner, { padding: isDesktop ? 30 : 20, flexDirection: isDesktop ? "row" : "column" }]}>
                <View style={{ flex: isDesktop ? 1 : undefined }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12.5, fontWeight: "700", letterSpacing: 1.2 }}>
                    JELAJAHI
                  </Text>
                  <Text style={[styles.title, { color: colors.text, fontSize: isDesktop ? 44 : 32 }]}>Genre</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
                    {genres.length > 0 ? `${genres.length} genre · pilih satu untuk melihat animenya` : "Pilih genre untuk melihat animenya"}
                  </Text>
                </View>

                {/* Genre-only search */}
                <View style={{ width: isDesktop ? 380 : "100%", marginTop: isDesktop ? 0 : 18 }}>
                  <View
                    style={[
                      styles.searchBar,
                      {
                        backgroundColor: colors.glassStrong,
                        borderColor: focused ? colors.accent : colors.glassBorder,
                      },
                      glassWebStyle(20),
                    ]}
                  >
                    <Ionicons name="search" size={18} color={focused ? colors.text : colors.textSecondary} />
                    <TextInput
                      placeholder={genres.length > 0 ? `Cari di ${genres.length} genre...` : "Cari genre..."}
                      placeholderTextColor={colors.textMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      returnKeyType="search"
                      onSubmitEditing={() => filteredGenres.length === 1 && openGenre(filteredGenres[0])}
                      style={[styles.searchInput, { color: colors.text }]}
                      accessibilityLabel="Cari genre"
                    />
                    {searchQuery.length > 0 && (
                      <Pressable onPress={() => setSearchQuery("")} hitSlop={8} accessibilityLabel="Hapus pencarian">
                        <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                      </Pressable>
                    )}
                  </View>
                  {searchQuery.trim() !== "" && (
                    <Text style={{ color: colors.textMuted, fontSize: 12.5, marginTop: 8, marginLeft: 6 }}>
                      {filteredGenres.length} genre cocok
                      {filteredGenres.length === 1 ? " · tekan Enter untuk membuka" : ""}
                    </Text>
                  )}
                </View>
              </View>
            </Glass>
          </FadeIn>

          {/* GRID */}
          {loading && !refreshing ? (
            <View style={[styles.grid, { gap, marginTop: 20 }]}>
              {Array.from({ length: cols * 3 }).map((_, i) => (
                <Shimmer key={i} style={{ width: tileWidth, height: 132, borderRadius: 20 }} />
              ))}
            </View>
          ) : filteredGenres.length > 0 ? (
            <View style={[styles.grid, { gap, marginTop: 20 }]}>
              {filteredGenres.map((g, i) => (
                <FadeIn key={g.genreId} delay={Math.min(i, 24) * 22} distance={12} trigger={searchQuery === "" ? "all" : "filtered"}>
                  <GenreTile
                    genre={g}
                    icon={genreIcon(g.title)}
                    index={indexOf[g.genreId] ?? i}
                    width={tileWidth}
                    query={searchQuery}
                    onPress={() => openGenre(g)}
                  />
                </FadeIn>
              ))}
            </View>
          ) : (
            <FadeIn style={{ alignSelf: "center", width: "100%", maxWidth: 420, marginTop: 36 }}>
              <Glass radius={26} style={{ padding: 28, alignItems: "center" }}>
                <MaterialCommunityIcons name="tag-search-outline" size={38} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 6, textAlign: "center" }}>
                  {searchQuery.trim() ? `Genre "${searchQuery.trim()}" tidak ada` : failed ? "Gagal memuat genre" : "Tidak ada genre ditemukan"}
                </Text>
                <Pressable
                  onPress={() => (searchQuery.trim() ? setSearchQuery("") : fetchGenres())}
                  style={({ hovered }: any) => [
                    styles.emptyBtn,
                    { backgroundColor: colors.buttonPrimaryBg, opacity: hovered ? 0.86 : 1 },
                  ]}
                >
                  <Text style={{ color: colors.buttonPrimaryText, fontSize: 14, fontWeight: "700" }}>
                    {searchQuery.trim() ? "Hapus pencarian" : "Muat ulang"}
                  </Text>
                </Pressable>
              </Glass>
            </FadeIn>
          )}
        </View>

        {Platform.OS === "web" && <WebFooter />}
      </ScrollView>
    </View>
  );
};

export default GenreListScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { overflow: "hidden" },
  headerInner: { gap: 20, alignItems: "flex-start" },
  title: { fontWeight: "800", letterSpacing: -1, marginTop: 2 },
  searchBar: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10,
    ...Platform.select({ web: { transition: "border-color 0.2s ease" } as any }),
  } as any,
  searchInput: { flex: 1, fontSize: 15, height: 52, padding: 0, outlineStyle: "none" } as any,
  grid: { flexDirection: "row", flexWrap: "wrap" },
  tile: {
    height: 132,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
    justifyContent: "space-between",
    ...Platform.select({ web: { transition: "background-color 0.2s ease, border-color 0.2s ease", cursor: "pointer" } as any }),
  } as any,
  watermark: {
    position: "absolute",
    right: -22,
    bottom: -26,
    opacity: 0.06,
    transform: [{ rotate: "-14deg" }],
  },
  tileTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  tileBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ web: { transition: "background-color 0.2s ease, border-color 0.2s ease" } as any }),
  } as any,
  tileIndex: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  tileName: { fontSize: 14.5, fontWeight: "700", letterSpacing: -0.2 },
  emptyBtn: { marginTop: 18, height: 42, paddingHorizontal: 22, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
