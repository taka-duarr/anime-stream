import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  TextInput,
  useWindowDimensions,
  DimensionValue,
} from "react-native";
import { Image } from "expo-image";
import {
  getVipDrama,
  getLatestDrama,
  getTrendingDrama,
  getForYouDrama,
  getNetshortForYou,
} from "../services/api";
import { Drama } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import Swiper from "react-native-swiper";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

const isWeb = Platform.OS === "web";

type TabType = "vip" | "latest" | "trending" | "foryou" | "allvideo";

// Helper fungsi diekstraksi ke luar agar hemat memori (tidak di-recreate tiap render)
const safeS2Cover = (url?: string) => {
  const enc = (url || "").replace(/比/g, "%E6%AF%94");
  return enc.includes("awscover.netshort.com")
    ? `https://wsrv.nl/?url=${enc.replace(/^https?:\/\//, "")}`
    : enc;
};

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("vip");
  const [trendingDramas, setTrendingDramas] = useState<Drama[]>([]);
  const [forYouDramas, setForYouDramas] = useState<Drama[]>([]);
  const [allVideoDramas, setAllVideoDramas] = useState<any[]>([]);
  const [carouselItems, setCarouselItems] = useState<any[]>([]);
  const [loadingForYou, setLoadingForYou] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingAllVideo, setLoadingAllVideo] = useState(false);
  const [allVideoPage, setAllVideoPage] = useState(1);
  const [allVideoIsFetchingMore, setAllVideoIsFetchingMore] = useState(false);
  const [allVideoHasMore, setAllVideoHasMore] = useState(true);
  const [vipDramas, setVipDramas] = useState<Drama[]>([]);
  const [latestDramas, setLatestDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const fetchAll = async () => {
    try {
      setLoading(true);

      const [vipRes, latestRes] = await Promise.all([
        getVipDrama(),
        getLatestDrama(),
      ]);

      const vipBooks = vipRes.columnVoList.flatMap((c: any) => c.bookList);
      const latestBooks = latestRes;

      setVipDramas(vipBooks);
      setLatestDramas(latestBooks);
    } catch (e) {
      console.error("Gagal fetch home:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTrending = async () => {
    try {
      setLoadingTrending(true);
      // Fetch S1 & S2 carousel items secara paralel
      const [s1Res, s2Res] = await Promise.allSettled([
        getTrendingDrama(),
        getNetshortForYou(1),
      ]);

      const s1Items: any[] = s1Res.status === "fulfilled"
        ? (s1Res.value as any[]).slice(0, 4).map((d: any) => ({
            id: d.bookId,
            cover: d.coverWap,
            title: d.bookName,
            meta: `${d.chapterCount} Episode`,
            description: d.introduction || "",
            label: "TRENDING",
            labelColor: "#FF4757",
            server: 1,
            navTarget: "Episode",
            navBookId: d.bookId,
          }))
        : [];

      const s2Raw: any[] = s2Res.status === "fulfilled"
        ? (s2Res.value?.contentInfos || []).slice(0, 4)
        : [];

      const s2Items: any[] = s2Raw.map((d: any) => ({
        id: d.shortPlayId,
        cover: safeS2Cover(d.shortPlayCover),
        title: d.shortPlayName,
        meta: d.heatScoreShow ? `${d.heatScoreShow} penonton` : "Server 2",
        description: d.shotIntroduce || "",
        label: "ALL VIDEO",
        labelColor: "#6C63FF",
        server: 2,
        navTarget: "Episode2",
        navBookId: d.shortPlayId,
      }));

      // Gabungkan: S1, S2, S1, S2 ... hingga max 8 slide
      const merged: any[] = [];
      const maxLen = Math.max(s1Items.length, s2Items.length);
      for (let i = 0; i < maxLen; i++) {
        if (s1Items[i]) merged.push(s1Items[i]);
        if (s2Items[i]) merged.push(s2Items[i]);
      }

      console.log(`[DEBUG] Carousel Berhasil Digabung: ${s1Items.length} (S1) + ${s2Items.length} (S2) = ${merged.length} Slide`);
      
      setTrendingDramas(s1Res.status === "fulfilled" ? (s1Res.value as any[]) : []);
      setCarouselItems(merged);
    } catch (e) {
      console.error("Gagal fetch trending:", e);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchForYou = async () => {
    try {
      setLoadingForYou(true);
      const res = await getForYouDrama();
      setForYouDramas(res);
    } catch (e) {
      console.error("Gagal fetch for you:", e);
    } finally {
      setLoadingForYou(false);
    }
  };

  const fetchAllVideo = async () => {
    try {
      setLoadingAllVideo(true);
      const res = await getNetshortForYou(1);
      // response: { contentInfos: [...] }
      setAllVideoDramas(res.contentInfos || []);
      setAllVideoPage(1);
      setAllVideoHasMore((res.contentInfos?.length || 0) > 0);
    } catch (e) {
      console.error("Gagal fetch All Video (Server 2):", e);
    } finally {
      setLoadingAllVideo(false);
    }
  };

  const fetchNextPageAllVideo = async () => {
    if (allVideoIsFetchingMore || !allVideoHasMore || loadingAllVideo) return;
    try {
      setAllVideoIsFetchingMore(true);
      const nextPage = allVideoPage + 1;
      const res = await getNetshortForYou(nextPage);
      if (res.contentInfos && res.contentInfos.length > 0) {
        setAllVideoDramas((prev) => [...prev, ...res.contentInfos]);
        setAllVideoPage(nextPage);
      } else {
        setAllVideoHasMore(false);
      }
    } catch (e) {
      console.error("Gagal fetch next page All Video:", e);
    } finally {
      setAllVideoIsFetchingMore(false);
    }
  };

  useEffect(() => {
    if (activeTab === "trending" && trendingDramas.length === 0) {
      fetchTrending();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "foryou" && forYouDramas.length === 0) {
      fetchForYou();
    }
    if (activeTab === "allvideo" && allVideoDramas.length === 0) {
      fetchAllVideo();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchAll();
    // Memanggil fetchTrending di awal rendering agar Slider selalu terisi data
    fetchTrending();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
    fetchTrending();
    if (activeTab === "foryou") {
      fetchForYou();
    }
    if (activeTab === "allvideo") {
      fetchAllVideo();
    }
  };

  const handleScroll = (event: any) => {
    if (activeTab !== "allvideo") return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 500;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      fetchNextPageAllVideo();
    }
  };

  const currentData = (() => {
    if (activeTab === "allvideo") return []; // pakai allVideoDramas sendiri
    const raw =
      activeTab === "vip"
        ? vipDramas
        : activeTab === "latest"
          ? latestDramas
          : activeTab === "trending"
            ? trendingDramas
            : forYouDramas;
    return raw;
  })();

  const currentTabTitle =
    activeTab === "vip"
      ? "Eksklusif VIP"
      : activeTab === "latest"
        ? "Baru Dirilis"
        : activeTab === "trending"
          ? "Sedang Hangat"
          : activeTab === "allvideo"
            ? "All Video"
            : "Pilihan Editor";

  const currentSubtitle =
    activeTab === "vip"
      ? "Akses konten premium tanpa batas hanya untuk Anda"
      : activeTab === "latest"
        ? "Jangan lewatkan episode terbaru minggu ini"
        : activeTab === "trending"
          ? "Tontonan yang paling banyak dibicarakan saat ini"
          : activeTab === "allvideo"
            ? "Koleksi video dari Server 2 — Netshort"
            : "Koleksi drama terbaik yang dikurasi khusus untuk Anda";

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Grid card ala Epic Games — cover image besar di atas, info di bawah
  const renderDramaItem = (item: Drama, index: number, cardWidth: DimensionValue) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, width: cardWidth }]}
      key={item.bookId}
      activeOpacity={0.82}
      onPress={() =>
        navigation.navigate("Episode", {
          bookId: item.bookId,
          title: item.bookName,
        })
      }
    >
      {/* Cover Image */}
      <View style={styles.cardImageWrap}>
        <Image
          source={{
            uri: item.coverWap || "https://via.placeholder.com/180x240",
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
            {activeTab === "vip"
              ? "VIP"
              : activeTab === "latest"
                ? "NEW"
                : activeTab === "trending"
                  ? "HOT"
                  : "FOR YOU"}
          </Text>
        </View>
      </View>

      {/* Card Info */}
      <View style={styles.cardInfo}>
        <Text
          style={[styles.cardTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.bookName || "Unknown Drama"}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardEpisode, { color: colors.textSecondary }]}>
            {item.chapterCount || "?"} ep
          </Text>
          <Text style={[styles.cardViews, { color: colors.accent }]}>
            {(Math.random() * 20 + 1).toFixed(1)}M
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.sidebar}
      />

      <View
        style={[
          styles.header,
          { backgroundColor: colors.sidebar, borderBottomColor: colors.border },
        ]}
      >
        {/* Mobile Top Welcome Header */}
        {!isDesktop && (
          <View style={styles.mobileWelcomeRow}>
            <View style={styles.mobileWelcomeTextCol}>
              <Text style={[styles.mobileWelcomeTitle, { color: colors.text }]}>Halo Hasan</Text>
              <Text style={[styles.mobileWelcomeSubtitle, { color: colors.textSecondary }]}>Tonton drama favoritmu di Mydrama</Text>
            </View>
            <View style={styles.mobileWelcomeRight}>
              <TouchableOpacity onPress={toggleTheme} style={styles.mobileThemeBtn} activeOpacity={0.7}>
                <Ionicons name={isDark ? "sunny" : "moon"} size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("ProfileTab")} activeOpacity={0.8}>
                <View style={[styles.mobileProfileAvatar, { backgroundColor: isDark ? "#2C2C2C" : "#EEE" }]}>
                  <Ionicons name="person" size={16} color={colors.accent} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.headerRow}>
          {/* Fake Search Bar mengarah ke SearchScreen */}
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: colors.searchBg }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Search")}
          >
            <Text style={[styles.searchInput, { color: colors.textMuted, lineHeight: 40 }]}>
              Cari drama favoritmu...
            </Text>
            <View style={styles.searchIconWrap}>
              <Ionicons
                name="search"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT WITH SLIDER & TABS */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        {/* HERO CAROUSEL — gabungan S1 & S2 */}
        <View style={{ zIndex: 0 }}>
          {carouselItems.length > 0 && (
            <View style={styles.heroContainer}>
              <Swiper
                showsButtons={false}
                autoplay
                autoplayTimeout={5}
                showsPagination
                dot={<View style={styles.heroDot} />}
                activeDot={
                  <View
                    style={[
                      styles.heroActiveDot,
                      { backgroundColor: colors.accent },
                    ]}
                  />
                }
              >
                {carouselItems.map((item) => (
                  <View key={`hero-${item.id}`} style={styles.heroSlide}>
                    <Image
                      source={{ uri: item.cover }}
                      style={styles.heroImage}
                      contentFit="cover"
                      blurRadius={isWeb ? 0 : 8}
                    />
                    <LinearGradient
                      colors={[
                        "rgba(0,0,0,0.85)",
                        "rgba(0,0,0,0.6)",
                        "rgba(0,0,0,0.4)",
                        "rgba(0,0,0,0.7)",
                      ]}
                      style={styles.heroGradient}
                    />
                    <View style={styles.heroGradBottom} />

                    <View style={styles.heroContentRow}>
                      <View style={styles.heroPosterWrap}>
                        <Image
                          source={{ uri: item.cover }}
                          style={styles.heroPoster}
                          contentFit="cover"
                        />
                      </View>

                      <View style={styles.heroInfoPanel}>
                        <Text style={[styles.heroLabel, { color: item.labelColor }]}>
                          {item.label}
                        </Text>

                        <Text style={styles.heroTitle} numberOfLines={2}>
                          {item.title}
                        </Text>

                        <Text style={styles.heroEpisodeCount}>{item.meta}</Text>

                        <Text style={styles.heroDescription} numberOfLines={2}>
                          {item.description || "Drama seru yang tak boleh kamu lewatkan."}
                        </Text>

                        <TouchableOpacity
                          style={[
                            styles.heroBtn,
                            { backgroundColor: item.labelColor },
                          ]}
                          activeOpacity={0.85}
                          onPress={() =>
                            navigation.navigate(item.navTarget, {
                              bookId: item.navBookId,
                              title: item.title,
                            })
                          }
                        >
                          <Ionicons
                            name="play"
                            size={14}
                            color="#FFF"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.heroBtnText}>Watch Now</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </Swiper>
            </View>
          )}
        </View>

        {/* TAB SELECTOR — underline minimalist */}
        <View style={{ backgroundColor: colors.bg, zIndex: 10 }}>
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: colors.sidebar,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {(
              [
              { key: "vip", label: "VIP", count: vipDramas.length },
              { key: "latest", label: "Latest", count: latestDramas.length },
              {
                key: "trending",
                label: "Trending",
                count: trendingDramas.length,
              },
              { key: "foryou", label: "For You", count: forYouDramas.length },
              { key: "allvideo", label: "All Video", count: allVideoDramas.length },
            ] as const
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: active ? colors.text : colors.textSecondary },
                      active && styles.tabLabelActive,
                    ]}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <Text style={{ fontSize: 10, fontWeight: "400" }}>
                        {" "}
                        {tab.count}
                      </Text>
                    )}
                  </Text>
                  {/* Active underline */}
                  {active && (
                    <View
                      style={[
                        styles.tabUnderline,
                        { backgroundColor: colors.accent },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {currentTabTitle}
          </Text>
          <Text
            style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
          >
            {currentSubtitle}
          </Text>
        </View>

        {/* Drama Grid */}
        {activeTab === "allvideo" ? (
          // SERVER 2 GRID — format data berbeda
          <View style={[styles.dramaGrid, { backgroundColor: colors.card }]}>
            {loadingAllVideo ? (
              <ActivityIndicator size="large" color={colors.accent} style={{ margin: 40 }} />
            ) : allVideoDramas.length > 0 ? (
              <View style={styles.gridRow}>
                {allVideoDramas.map((item: any, index: number) => {
                  let numColumns = 2;
                  if (width >= 1200) numColumns = 5;
                  else if (width >= 900) numColumns = 4;
                  else if (width >= 600) numColumns = 3;
                  const cardWidth = `${100 / numColumns - 2}%` as DimensionValue;
                  // Sanitize cover URL for Server 2
                  const rawCover = item.shortPlayCover || "";
                  const encoded = rawCover.replace(/比/g, "%E6%AF%94");
                  const cover = encoded.includes("awscover.netshort.com")
                    ? `https://wsrv.nl/?url=${encoded.replace(/^https?:\/\//, "")}`
                    : encoded;
                  return (
                    <TouchableOpacity
                      key={item.shortPlayId}
                      style={[styles.card, { backgroundColor: colors.card, width: cardWidth }]}
                      activeOpacity={0.82}
                      onPress={() =>
                        navigation.navigate("Episode2", {
                          bookId: item.shortPlayId,
                          title: item.shortPlayName,
                        })
                      }
                    >
                      <View style={styles.cardImageWrap}>
                        <Image
                          source={{ uri: cover || "https://via.placeholder.com/180x240" }}
                          style={styles.cardImage}
                          contentFit="cover"
                        />
                        <View style={[styles.rankBadge, { backgroundColor: colors.accent }]}>
                          <Text style={styles.rankText}>#{index + 1}</Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                          <Text style={styles.typeText}>S2</Text>
                        </View>
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                          {item.shortPlayName || "Unknown"}
                        </Text>
                        <View style={styles.cardMeta}>
                          <Text style={[styles.cardEpisode, { color: colors.textSecondary }]}>
                            {item.scriptName || "Drama"}
                          </Text>
                          <Text style={[styles.cardViews, { color: colors.accent }]}>
                            {item.heatScoreShow || ""}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Tidak ada video dari Server 2
                </Text>
                <TouchableOpacity
                  onPress={fetchAllVideo}
                  style={[styles.retryButton, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Footer loading saat fetch halaman berikutnya */}
            {allVideoIsFetchingMore && (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 16 }} />
            )}
            {!allVideoHasMore && allVideoDramas.length > 0 && (
              <Text style={[styles.totalText, { color: colors.textMuted, textAlign: "center", padding: 16 }]}>
                Semua video sudah ditampilkan
              </Text>
            )}
          </View>
        ) : (
          // SERVER 1 GRID
          <View style={[styles.dramaGrid, { backgroundColor: colors.card }]}>
            {currentData.length > 0 ? (
              <View style={styles.gridRow}>
                {currentData.map((item, index) => {
                   let numColumns = 2;
                   if (width >= 1200) numColumns = 5;
                   else if (width >= 900) numColumns = 4;
                   else if (width >= 600) numColumns = 3;
                   const cardWidth = `${100 / numColumns - 2}%` as DimensionValue;
                   return renderDramaItem(item, index, cardWidth);
                })}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Tidak ada drama di kategori ini
                </Text>
                <TouchableOpacity
                  onPress={onRefresh}
                  style={[styles.retryButton, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={[styles.totalContainer, { borderColor: colors.border }]}>
          <Text style={[styles.totalText, { color: colors.textMuted }]}>
            Menampilkan {activeTab === "allvideo" ? allVideoDramas.length : currentData.length} drama
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

/* ⬇⬇⬇ STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: isWeb ? 16 : 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  /* MOBILE WELCOME HEADER */
  mobileWelcomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
    
  },
  mobileWelcomeTextCol: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  mobileWelcomeTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  mobileWelcomeSubtitle: {
    fontSize: 11,
    fontWeight: "500",
  },
  mobileWelcomeRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mobileThemeBtn: {
    padding: 4,
  },
  mobileProfileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  /* Search bar — inline dengan icon kanan */
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    height: 40,
  },
  searchIconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  /* TAB BAR — underline minimalist */
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabLabelActive: {
    fontWeight: "700",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "10%",
    right: "10%",
    height: 2,
    borderRadius: 1,
  },
  /* kept for compatibility */
  tabScrollContainer: { maxHeight: 48, paddingVertical: 8 },
  tabContentContainer: { paddingHorizontal: 12, gap: 8 },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
  },
  activeTab: { backgroundColor: "#E63333" },
  tabText: { fontSize: 12, fontWeight: "600" },
  activeTabText: { color: "#FFFFFF" },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#000000",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "#666666",
    fontSize: 12,
  },

  /* HERO CAROUSEL — Poster + Info layout */
  heroContainer: {
    height: isWeb ? 280 : 220,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    overflow: "hidden",
  },
  heroSlide: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    position: "relative",
  },
  /* Background image fills entire slide (blurred on mobile) */
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    ...(isWeb ? { filter: "blur(10px) brightness(0.9)", transform: [{ scale: 1.1 }] } : {}),
  },
  /* Dark overlay gradient */
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  /* Bottom fade so dots are readable */
  heroGradBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  /* Content row: poster left + info right */
  heroContentRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: isWeb ? 24 : 16,
    paddingBottom: 30,
  },
  /* Poster preview thumbnail */
  heroPosterWrap: {
    width: isWeb ? 140 : 100,
    height: isWeb ? 200 : 145,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  heroPoster: {
    width: "100%",
    height: "100%",
  },
  /* Info panel next to poster */
  heroInfoPanel: {
    flex: 1,
    marginLeft: isWeb ? 20 : 14,
    justifyContent: "center",
  },
  heroLabel: {
    color: "#A8A8A8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: "calibri",
    color: "#FFFFFF",
    fontSize: isWeb ? 22 : 17,
    fontWeight: "800",
    lineHeight: isWeb ? 28 : 23,
    marginBottom: 4,
  },
  heroEpisodeCount: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  heroDescription: {
    color: "#999999",
    fontSize: isWeb ? 13 : 11,
    lineHeight: isWeb ? 18 : 16,
    marginBottom: 12,
  },
  heroMeta: {
    color: "#AAAAAA",
    fontSize: 12,
    marginBottom: 14,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
  },
  heroBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  heroDot: {
    backgroundColor: "rgba(255,255,255,0.35)",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  heroActiveDot: {
    width: 18,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  heroPagination: {
    bottom: 10,
    left: 16,
    right: "auto",
    justifyContent: "flex-start",
  },
  /* old slider kept for potential reuse */
  sliderContainer: {
    height: 320,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 25,
  },
  slide: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  imageWrapper: { flex: 1, justifyContent: "center", alignItems: "center" },
  slideImgPortrait: { width: "100%", height: "100%", resizeMode: "cover" },
  slideOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  slideTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  slideSubtitle: { color: "#ccc", fontSize: 12 },
  dot: {
    backgroundColor: "rgba(255,255,255,0.3)",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    marginBottom: -20,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    marginBottom: -20,
  },

  /* ─── GRID CARD (Epic Games style) ─── */
  dramaGrid: {
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    justifyContent: "space-between",
  },
  card: {
    width: isWeb ? "23%" : "47%",
    borderRadius: 10,
    overflow: "hidden",
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  cardImageWrap: {
    width: "100%",
    aspectRatio: 3 / 4, // portrait drama poster ratio
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
  cardViews: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* ─── EMPTY / RETRY ─── */
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  totalContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  totalText: {
    fontSize: 12,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  logo2: {
    width: 100,
    height: 50,
    marginRight: 10,
  },
  creditBadge: {
    backgroundColor: "rgba(230, 51, 51, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(230, 51, 51, 0.35)",
  },
  creditText: {
    color: "#E63333",
    fontSize: 10,
    fontWeight: "600",
  },
  /* ─── OLD STYLES (slider still uses these) ─── */
  dramaListContainer: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
  },
  dramaCard: { paddingVertical: 12, paddingHorizontal: 12 },
  cardContent: { flexDirection: "row", alignItems: "center" },
  numberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vipNumber: { backgroundColor: "#E63333" },
  latestNumber: { backgroundColor: "#E63333" },
  numberText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
  coverImage: { width: 56, height: 74, borderRadius: 6, marginRight: 12 },
  dramaInfo: { flex: 1 },
  dramaTitle: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 20,
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  badgeText: { fontSize: 10, fontWeight: "500" },
  statsContainer: { flexDirection: "row", alignItems: "center" },
  statsText: { fontSize: 13, fontWeight: "600" },
  divider: {
    height: 1,
    backgroundColor: "#2A2A2A",
    marginLeft: 36,
    marginTop: 12,
  },
});
