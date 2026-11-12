import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
  Pressable,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { getHomeData } from "../services/api";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { WebFooter } from "../components/WebFooter";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FadeIn,
  Glass,
  Lift,
  NATIVE_DRIVER,
  Rating,
  Shimmer,
  StatusPill,
  glassWebStyle,
  webAnim,
} from "../components/ui";

const isWeb = Platform.OS === "web";
const SLIDE_MS = 6500;
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const JS_DAY_TO_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

interface HomeAnime {
  animeId: string;
  title: string;
  poster: string;
  score?: string;
  episodes?: number;
  releaseDay?: string;
  latestReleaseDate?: string;
  lastReleaseDate?: string;
}

const mapAnime = (a: any): HomeAnime => ({
  animeId: a.animeId,
  title: a.title,
  poster: a.poster,
  score: a.score,
  episodes: a.episodes || a.totalEpisodes || 0,
  releaseDay: a.releaseDay,
  latestReleaseDate: a.latestReleaseDate,
  lastReleaseDate: a.lastReleaseDate,
});

const hoverBg = (base: any, hover: any) => ({ hovered, pressed }: any) => [
  base,
  (hovered || pressed) && hover,
];

// ------------------------------------------------------------------
// Poster card used by the rows and grids below the stage
// ------------------------------------------------------------------
const PosterCard: React.FC<{
  item: HomeAnime;
  width: number | string;
  caption: string;
  rank?: number;
  onPress: () => void;
}> = ({ item, width, caption, rank, onPress }) => {
  const { colors } = useTheme();
  return (
    <Lift onPress={onPress} style={{ width: width as any }} accessibilityLabel={item.title}>
      <View style={[styles.posterFrame, { borderColor: colors.glassBorder, backgroundColor: colors.card }]}>
        <Image
          source={{ uri: item.poster }}
          style={StyleSheet.absoluteFill as any}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.78)"]}
          style={styles.posterShade}
        />
        {rank !== undefined && <Text style={styles.posterRank}>{rank}</Text>}
        <View style={styles.posterCaptionRow}>
          {item.score ? <Rating score={item.score} size={11} color="#FFF" /> : null}
          <Text style={styles.posterCaption} numberOfLines={1}>
            {caption}
          </Text>
        </View>
      </View>
      <Text style={[styles.posterTitle, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>
    </Lift>
  );
};

const SectionHead: React.FC<{
  title: string;
  hint?: string;
  action?: string;
  onAction?: () => void;
}> = ({ title, hint, action, onAction }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
          {hint ? <Text style={{ color: colors.textMuted, fontWeight: "500" }}>  {hint}</Text> : null}
        </Text>
      </View>
      {action && (
        <Pressable
          onPress={onAction}
          style={hoverBg(
            [styles.sectionAction, { backgroundColor: colors.glass, borderColor: colors.glassBorder }],
            { backgroundColor: colors.glassHover },
          )}
        >
          <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: "600" }}>{action}</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
};

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isAuthenticated, profilePicture } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isWide = width >= 1120;

  const [ongoing, setOngoing] = useState<HomeAnime[]>([]);
  const [completed, setCompleted] = useState<HomeAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [activeTab, setActiveTab] = useState<"ongoing" | "completed">("ongoing");
  const [index, setIndex] = useState(0);
  const [day, setDay] = useState<string>(JS_DAY_TO_ID[new Date().getDay()]);

  const scrollViewRef = useRef<ScrollView>(null);
  const stripRef = useRef<ScrollView>(null);
  const stripX = useRef(0);

  const featured = useMemo(() => ongoing.slice(0, 6), [ongoing]);
  const active = featured[index];

  // ---------------- data ----------------
  const fetchAll = async () => {
    try {
      setLoading(true);
      const homeData = await getHomeData();
      if (homeData && homeData.ongoingAnime && homeData.completeAnime) {
        setOngoing(homeData.ongoingAnime.map(mapAnime));
        setCompleted(homeData.completeAnime.map(mapAnime));
        setIndex(0);
      } else {
        console.error("[HOME ERROR] Invalid home data structure:", homeData);
        setOngoing([]);
        setCompleted([]);
      }
    } catch (e: any) {
      console.error("[HOME ERROR] Gagal fetch home:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, []);

  // ---------------- hero slideshow ----------------
  const fades = useRef(Array.from({ length: 6 }, (_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (featured.length === 0) return;
    fades.forEach((v, i) =>
      Animated.timing(v, {
        toValue: i === index ? 1 : 0,
        duration: 900,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: NATIVE_DRIVER,
      }).start(),
    );
    progress.setValue(0);
    const run = Animated.timing(progress, {
      toValue: 1,
      duration: SLIDE_MS,
      easing: Easing.linear,
      useNativeDriver: false, // animates width
    });
    run.start(({ finished }) => {
      if (finished) setIndex((p) => (p + 1) % featured.length);
    });
    return () => run.stop();
  }, [index, featured.length]);

  // ---------------- handlers ----------------
  const openAnime = (a: HomeAnime) =>
    navigation.navigate("Episode", { bookId: a.animeId, title: a.title });

  const shareAnime = async (a: HomeAnime) => {
    try {
      const url = isWeb ? (globalThis as any).location?.origin || "" : "";
      await Share.share({ message: `Nonton ${a.title} di NgAnime ${url}`.trim() });
    } catch {
      // user dismissed the share sheet, or sharing is unsupported on this browser
    }
  };

  const handleScroll = useCallback(
    (event: any) => {
      const y = event.nativeEvent.contentOffset.y;
      if (y > 500 && !showScrollToTop) setShowScrollToTop(true);
      else if (y <= 500 && showScrollToTop) setShowScrollToTop(false);
    },
    [showScrollToTop],
  );

  const nudgeStrip = (dir: 1 | -1) => {
    const next = Math.max(0, stripX.current + dir * 620);
    stripRef.current?.scrollTo({ x: next, animated: true });
    stripX.current = next;
  };

  // ---------------- schedule ----------------
  const byDay = useMemo(() => {
    const map: Record<string, HomeAnime[]> = {};
    ongoing.forEach((a) => {
      const d = a.releaseDay || "Lainnya";
      (map[d] = map[d] || []).push(a);
    });
    return map;
  }, [ongoing]);
  const dayList = useMemo(
    () => [...DAYS.filter((d) => byDay[d]), ...Object.keys(byDay).filter((d) => !DAYS.includes(d))],
    [byDay],
  );
  const shownDay = byDay[day] ? day : dayList[0];
  const today = JS_DAY_TO_ID[new Date().getDay()];

  // ---------------- layout numbers ----------------
  const pad = isDesktop ? 24 : 12;
  const stageHeight = isDesktop ? Math.min(Math.max(height - 110, 620), 860) : 600;
  const contentMax = 1480;
  const gridCols = width >= 1280 ? 6 : width >= 1000 ? 5 : width >= 768 ? 4 : 2;
  const gridGap = isDesktop ? 18 : 12;
  const innerWidth = Math.min(width, contentMax) - pad * 2;
  const gridCardWidth = (innerWidth - gridGap * (gridCols - 1)) / gridCols;
  const rowCardWidth = isDesktop ? 168 : 132;

  // ---------------- loading skeleton ----------------
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, padding: pad, paddingTop: isDesktop ? 84 : insets.top + 12 }]}>
        <View style={{ flexDirection: "row", gap: 16, flex: 1, maxHeight: stageHeight }}>
          <Shimmer style={{ flex: 1, borderRadius: 28 }} />
          {isWide && <Shimmer style={{ width: 320, borderRadius: 28 }} />}
        </View>
        <View style={{ flexDirection: "row", gap: 14, marginTop: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} style={{ width: rowCardWidth, height: rowCardWidth * 1.4 }} />
          ))}
        </View>
      </View>
    );
  }

  // ---------------- pieces ----------------
  const stage = (
    <View style={[styles.stage, { height: stageHeight, borderColor: colors.glassBorder }]}>
      {/* Crossfading artwork layers */}
      {featured.map((item, i) => (
        <Animated.View key={item.animeId} style={[StyleSheet.absoluteFill, { opacity: fades[i] }]}>
          <View
            style={[
              StyleSheet.absoluteFill,
              webAnim.kenburns,
            ]}
          >
            <Image
              source={{ uri: item.poster }}
              style={StyleSheet.absoluteFill as any}
              contentFit="cover"
              blurRadius={isDesktop ? 26 : 0}
            />
          </View>
          {/* Crisp key art floating on the right (desktop) */}
          {isDesktop && (
            <View
              style={[
                styles.keyArtWrap,
                { height: stageHeight * 0.66, width: stageHeight * 0.66 * 0.7 },
                webAnim.float,
              ]}
            >
              <Image source={{ uri: item.poster }} style={styles.keyArt as any} contentFit="cover" />
            </View>
          )}
        </Animated.View>
      ))}

      {/* Readability shades */}
      <LinearGradient
        colors={["rgba(8,9,11,0.92)", "rgba(8,9,11,0.55)", "rgba(8,9,11,0.05)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: isDesktop ? 0.85 : 1.4, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(8,9,11,0)", "rgba(8,9,11,0.55)", "rgba(8,9,11,0.96)"]}
        locations={[0.25, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Mobile header floats over the artwork */}
      {!isDesktop && (
        <View style={[styles.mobileHeader, { paddingTop: 14 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Image source={require("../../assets/logogelap.png")} style={{ width: 40, height: 26 }} contentFit="contain" />
            <Image source={require("../../assets/nganime.png")} style={{ width: 84, height: 22 }} contentFit="contain" />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable style={styles.heroIconBtn} onPress={toggleTheme} accessibilityLabel="Toggle theme">
              <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color="#FFF" />
            </Pressable>
            <Pressable style={styles.heroIconBtn} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={18} color="#FFF" />
            </Pressable>
            <Pressable
              style={[styles.heroIconBtn, { overflow: "hidden" }]}
              onPress={() => navigation.navigate(isAuthenticated ? "ProfileTab" : "Login")}
              accessibilityLabel={isAuthenticated ? "Profile" : "Login"}
            >
              {isAuthenticated && profilePicture ? (
                <Image source={{ uri: profilePicture }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              ) : (
                <Ionicons name={isAuthenticated ? "person" : "log-in-outline"} size={18} color="#FFF" />
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Title block */}
      {active && (
        <View style={[styles.heroBody, { paddingHorizontal: isDesktop ? 52 : 20, maxWidth: isDesktop ? 720 : undefined }]}>
          <FadeIn trigger={index} distance={22}>
            <Text
              style={[styles.heroTitle, { fontSize: isDesktop ? (width >= 1280 ? 54 : 44) : 30, lineHeight: isDesktop ? (width >= 1280 ? 60 : 50) : 36 }]}
              numberOfLines={isDesktop ? 2 : 3}
            >
              {active.title}
            </Text>
          </FadeIn>
          <FadeIn trigger={index} delay={90} style={styles.heroMeta}>
            <StatusPill kind="ongoing" onDark />
            <View style={styles.dot} />
            <Text style={styles.heroMetaText}>Episode {active.episodes || "?"}</Text>
            {active.releaseDay ? (
              <>
                <View style={styles.dot} />
                <Text style={styles.heroMetaText}>Tiap {active.releaseDay}</Text>
              </>
            ) : null}
          </FadeIn>
          <FadeIn trigger={index} delay={160}>
            <Text style={styles.heroDesc} numberOfLines={3}>
              Episode {active.episodes || "terbaru"} sudah bisa ditonton dengan subtitle Indonesia
              {active.latestReleaseDate ? `, diperbarui ${active.latestReleaseDate}` : ""}.
              {active.releaseDay ? ` Episode baru hadir setiap hari ${active.releaseDay}.` : ""}
            </Text>
          </FadeIn>
          <FadeIn trigger={index} delay={230} style={styles.heroActions}>
            <Lift onPress={() => openAnime(active)} hoverScale={1.05} lift={2} accessibilityLabel="Tonton sekarang">
              <View style={styles.watchBtn}>
                <Ionicons name="play" size={15} color="#0B0C0E" />
                <Text style={styles.watchBtnText}>Tonton Sekarang</Text>
              </View>
            </Lift>
            <Lift onPress={() => navigation.navigate("MyListTab")} hoverScale={1.05} lift={2} accessibilityLabel="My List">
              <View style={[styles.ghostBtn, glassWebStyle(14)]}>
                <Ionicons name="bookmark-outline" size={15} color="#FFF" />
                <Text style={styles.ghostBtnText}>My List</Text>
              </View>
            </Lift>
            <Lift onPress={() => shareAnime(active)} hoverScale={1.08} lift={2} accessibilityLabel="Bagikan">
              <View style={[styles.roundBtn, glassWebStyle(14)]}>
                <Ionicons name="share-social-outline" size={17} color="#FFF" />
              </View>
            </Lift>
          </FadeIn>

          {/* Slide indicators with timed fill */}
          <View style={styles.indicators}>
            {featured.map((f, i) => (
              <Pressable key={f.animeId} onPress={() => setIndex(i)} hitSlop={8} accessibilityLabel={`Slide ${i + 1}`}>
                <View style={[styles.indicatorTrack, { width: isDesktop ? 54 : 30 }]}>
                  {i === index ? (
                    <Animated.View
                      style={[
                        styles.indicatorFill,
                        { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
                      ]}
                    />
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* "Now airing" strip inside the stage, like an episode rail */}
      <View style={styles.stripWrap}>
        <Text style={[styles.stripTitle, { paddingHorizontal: isDesktop ? 52 : 20 }]}>
          Sedang Tayang <Text style={styles.stripCount}>({ongoing.length} judul)</Text>
        </Text>
        <ScrollView
          ref={stripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => (stripX.current = e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={32}
          contentContainerStyle={{ paddingHorizontal: isDesktop ? 52 : 20, gap: 12, paddingBottom: 22, paddingTop: 6 }}
        >
          {ongoing.map((a, i) => (
            <Lift
              key={a.animeId}
              onPress={() => openAnime(a)}
              onHoverIn={() => i < featured.length && setIndex(i)}
              style={{ width: isDesktop ? 196 : 150 }}
              accessibilityLabel={a.title}
            >
              <View
                style={[
                  styles.stripCard,
                  glassWebStyle(18),
                  i === index && { borderColor: "rgba(255,255,255,0.6)" },
                ]}
              >
                <Image source={{ uri: a.poster }} style={styles.stripImage as any} contentFit="cover" contentPosition="top" />
                <Text style={styles.stripLabel} numberOfLines={1}>
                  E{a.episodes || "?"} · {a.title}
                </Text>
              </View>
            </Lift>
          ))}
        </ScrollView>
        {isDesktop && (
          <Pressable style={[styles.stripArrow, glassWebStyle(12)]} onPress={() => nudgeStrip(1)} accessibilityLabel="Geser">
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </Pressable>
        )}
      </View>
    </View>
  );

  const sidePanel = (
    <Glass radius={28} style={isWide ? { width: 328, height: stageHeight } : { marginTop: 16 }}>
      <View style={styles.panelHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={[styles.brandBadge, { backgroundColor: colors.accent }]}>
            <Image source={require("../../assets/logogelap.png")} style={{ width: 40, height: 22 }} contentFit="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.brandName, { color: colors.text }]}>NGANIME</Text>
              <Ionicons name="checkmark-circle" size={16} color={colors.text} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12.5, marginTop: 2 }}>
              Sub Indo · bebas iklan
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          <Pressable
            style={hoverBg(
              [styles.panelBtn, { backgroundColor: colors.searchBg, borderColor: colors.glassBorder }],
              { backgroundColor: colors.glassHover },
            )}
          >
            <Ionicons name="logo-discord" size={15} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Join our Discord</Text>
          </Pressable>
          <Pressable
            onPress={toggleTheme}
            accessibilityLabel="Toggle theme"
            style={hoverBg(
              [styles.panelRound, { backgroundColor: colors.searchBg, borderColor: colors.glassBorder }],
              { backgroundColor: colors.glassHover },
            )}
          >
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={16} color={colors.text} />
          </Pressable>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 14 }}>
          Selamat datang di project tugas kuliah kami. Di sini kalian bisa streaming anime tanpa iklan dan bebas
          nonton kapan pun. Enjoy guys!
        </Text>
      </View>

      <View style={[styles.hairline, { backgroundColor: colors.border }]} />

      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }}>
        <Text style={[styles.panelTitle, { color: colors.text, flex: 1 }]}>Most popular</Text>
        <Pressable onPress={() => navigation.navigate("AnimeList", { type: "completed", title: "Anime Completed" })}>
          <Text style={{ color: colors.textSecondary, fontSize: 12.5, fontWeight: "600" }}>Lihat semua</Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 14 }}>
        {completed.slice(0, isWide ? 10 : 4).map((a, i) => (
          <FadeIn key={a.animeId} delay={120 + i * 70}>
            <Pressable
              onPress={() => openAnime(a)}
              style={hoverBg(styles.popRow, { backgroundColor: colors.glass })}
            >
              <Image source={{ uri: a.poster }} style={styles.popPoster as any} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.popTitle, { color: colors.text }]} numberOfLines={2}>
                  {a.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
                  {a.episodes ? `${a.episodes} Episode` : "Anime"}
                  {a.lastReleaseDate ? ` · ${a.lastReleaseDate}` : ""}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                  <Rating score={a.score} size={13} />
                  <StatusPill kind="completed" small />
                </View>
              </View>
            </Pressable>
            {i < (isWide ? 9 : 3) && <View style={[styles.hairline, { backgroundColor: colors.border, marginHorizontal: 8 }]} />}
          </FadeIn>
        ))}
      </ScrollView>
    </Glass>
  );

  const gridItems = activeTab === "ongoing" ? ongoing : completed;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: isDesktop ? 84 : insets.top + 8 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />
        }
      >
        <View style={{ width: "100%", maxWidth: contentMax, alignSelf: "center", paddingHorizontal: pad }}>
          {/* STAGE + SIDE PANEL */}
          <FadeIn duration={800} distance={26}>
            {isWide ? (
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1 }}>{stage}</View>
                {sidePanel}
              </View>
            ) : (
              <View>
                {stage}
                {sidePanel}
              </View>
            )}
          </FadeIn>

          {/* RELEASE CALENDAR */}
          {dayList.length > 0 && (
            <FadeIn delay={150} style={styles.section}>
              <SectionHead
                title="Jadwal Rilis"
                hint="episode baru tiap minggu"
                action="Semua ongoing"
                onAction={() => navigation.navigate("AnimeList", { type: "ongoing", title: "Anime Ongoing" })}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                {dayList.map((d) => {
                  const on = d === shownDay;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDay(d)}
                      style={hoverBg(
                        [
                          styles.dayChip,
                          {
                            backgroundColor: on ? colors.buttonPrimaryBg : colors.glass,
                            borderColor: on ? colors.buttonPrimaryBg : colors.glassBorder,
                          },
                        ],
                        !on && { backgroundColor: colors.glassHover },
                      )}
                    >
                      <Text style={{ color: on ? colors.buttonPrimaryText : colors.text, fontSize: 13.5, fontWeight: "700" }}>
                        {d}
                      </Text>
                      {d === today && (
                        <View style={[styles.todayDot, { backgroundColor: colors.accent }]} />
                      )}
                      <Text style={{ color: on ? colors.buttonPrimaryText : colors.textMuted, fontSize: 12, fontWeight: "600" }}>
                        {byDay[d].length}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: gridGap, paddingBottom: 6, paddingTop: 4 }}>
                {(byDay[shownDay] || []).map((a, i) => (
                  <FadeIn key={`${shownDay}-${a.animeId}`} delay={i * 60} trigger={shownDay}>
                    <PosterCard
                      item={a}
                      width={rowCardWidth}
                      caption={`Episode ${a.episodes || "?"}${a.latestReleaseDate ? ` · ${a.latestReleaseDate}` : ""}`}
                      onPress={() => openAnime(a)}
                    />
                  </FadeIn>
                ))}
              </ScrollView>
            </FadeIn>
          )}

          {/* RECENTLY UPDATED */}
          {ongoing.length > 0 && (
            <FadeIn delay={220} style={styles.section}>
              <SectionHead title="Baru Diperbarui" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: gridGap, paddingBottom: 6, paddingTop: 4 }}>
                {ongoing.slice(0, 10).map((a) => (
                  <PosterCard
                    key={a.animeId}
                    item={a}
                    width={rowCardWidth}
                    caption={`Episode ${a.episodes || "?"}`}
                    onPress={() => openAnime(a)}
                  />
                ))}
              </ScrollView>
            </FadeIn>
          )}

          {/* TRENDING / MOST POPULAR */}
          <FadeIn delay={290} style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={[styles.segment, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                {([
                  ["ongoing", "Trending"],
                  ["completed", "Most Popular"],
                ] as const).map(([key, label]) => {
                  const on = activeTab === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setActiveTab(key)}
                      style={[styles.segmentBtn, on && { backgroundColor: colors.buttonPrimaryBg }]}
                    >
                      <Text style={{ color: on ? colors.buttonPrimaryText : colors.textSecondary, fontSize: 13.5, fontWeight: "700" }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() =>
                  navigation.navigate("AnimeList",
                    activeTab === "ongoing"
                      ? { type: "ongoing", title: "Anime Ongoing" }
                      : { type: "completed", title: "Anime Completed" })
                }
                style={hoverBg(
                  [styles.sectionAction, { backgroundColor: colors.glass, borderColor: colors.glassBorder }],
                  { backgroundColor: colors.glassHover },
                )}
              >
                <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: "600" }}>Lihat Semua</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.text} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gridGap }}>
              {gridItems.map((a, i) => (
                <FadeIn key={`${activeTab}-${a.animeId}`} delay={i * 40} trigger={activeTab}>
                  <PosterCard
                    item={a}
                    width={gridCardWidth}
                    rank={i + 1}
                    caption={
                      activeTab === "ongoing"
                        ? `Episode ${a.episodes || "?"}`
                        : `${a.episodes || "?"} eps`
                    }
                    onPress={() => openAnime(a)}
                  />
                </FadeIn>
              ))}
            </View>
          </FadeIn>
        </View>

        <View style={{ height: 40 }} />
        <WebFooter />
      </ScrollView>

      {showScrollToTop && (
        <Pressable
          style={[
            styles.scrollTop,
            { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder },
            glassWebStyle(20),
          ]}
          onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
          accessibilityLabel="Kembali ke atas"
        >
          <Ionicons name="arrow-up" size={20} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Stage
  stage: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "#0B0C0E",
    justifyContent: "flex-end",
  },
  keyArtWrap: {
    position: "absolute",
    right: "7%",
    top: "9%",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    ...Platform.select({ web: { boxShadow: "0 40px 90px rgba(0,0,0,0.6)" } as any }),
  } as any,
  keyArt: { width: "100%", height: "100%" },
  mobileHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 5,
  },
  heroIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroBody: { paddingBottom: 26 },
  heroTitle: { color: "#FFF", fontWeight: "800", letterSpacing: -0.8 },
  heroMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 14 },
  heroMetaText: { color: "rgba(255,255,255,0.82)", fontSize: 15, fontWeight: "600" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  heroDesc: { color: "rgba(255,255,255,0.74)", fontSize: 14, lineHeight: 21, marginTop: 14, maxWidth: 470 },
  heroActions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 22 },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#FFF",
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
  },
  watchBtnText: { color: "#0B0C0E", fontSize: 14, fontWeight: "700" },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  ghostBtnText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  indicators: { flexDirection: "row", gap: 8, marginTop: 26 },
  indicatorTrack: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.28)", overflow: "hidden" },
  indicatorFill: { height: 3, backgroundColor: "#FFF" },

  // Strip
  stripWrap: { position: "relative" },
  stripTitle: { color: "#FFF", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  stripCount: { color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  stripCard: {
    padding: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  stripImage: { width: "100%", aspectRatio: 1.9, borderRadius: 10 },
  stripLabel: { color: "#FFF", fontSize: 12.5, fontWeight: "600", textAlign: "center", paddingVertical: 8, paddingHorizontal: 6 },
  stripArrow: {
    position: "absolute",
    right: 14,
    top: 62,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,21,24,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },

  // Side panel
  panelHeader: { padding: 20 },
  brandBadge: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: 17, fontWeight: "800", letterSpacing: 0.4 },
  panelBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  panelRound: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  hairline: { height: 1 },
  panelTitle: { fontSize: 17, fontWeight: "700" },
  popRow: { flexDirection: "row", gap: 14, padding: 8, borderRadius: 16, marginVertical: 4 },
  popPoster: { width: 74, height: 104, borderRadius: 10 },
  popTitle: { fontSize: 14.5, fontWeight: "700", lineHeight: 19 },

  // Sections
  section: { marginTop: 40 },
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: 1,
  },
  dayChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  todayDot: { width: 6, height: 6, borderRadius: 3 },
  segment: { flexDirection: "row", padding: 4, borderRadius: 22, borderWidth: 1 },
  segmentBtn: { height: 34, paddingHorizontal: 16, borderRadius: 17, justifyContent: "center" },

  // Poster card
  posterFrame: { width: "100%", aspectRatio: 0.7, borderRadius: 18, overflow: "hidden", borderWidth: 1 },
  posterShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%" },
  posterRank: {
    position: "absolute",
    top: 6,
    left: 12,
    color: "#FFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  posterCaptionRow: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  posterCaption: { color: "rgba(255,255,255,0.9)", fontSize: 11.5, fontWeight: "600", flex: 1 },
  posterTitle: { fontSize: 13.5, fontWeight: "600", lineHeight: 18, marginTop: 9 },

  scrollTop: {
    position: "absolute",
    bottom: 22,
    right: 22,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
