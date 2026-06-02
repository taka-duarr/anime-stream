import React, { useEffect, useState, useCallback, useRef } from "react";
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
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { getHomeData } from "../services/api";
import { Anime } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import Swiper from "react-native-swiper";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const isWeb = Platform.OS === "web";

// Helper fungsi untuk mapping anime data ke format lama (backward compatibility)
const mapAnimeToDrama = (anime: any) => ({
  animeId: anime.animeId,
  title: anime.title,
  poster: anime.poster,
  score: anime.score,
  type: anime.type,
  status: anime.status,
  totalEpisodes: anime.totalEpisodes || 0,
  href: anime.href,
  otakudesuUrl: anime.otakudesuUrl,
});

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { isAuthenticated, username, profilePicture } = useAuth();

  const [ongoingAnime, setOngoingAnime] = useState<Anime[]>([]);
  const [completedAnime, setCompletedAnime] = useState<Anime[]>([]);
  const [carouselItems, setCarouselItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [activeTab, setActiveTab] = useState<"ongoing" | "completed">("ongoing");
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);

      const homeData = await getHomeData();

      console.log("[HOME] Home Data received");

      if (homeData && homeData.ongoingAnime && homeData.completeAnime) {
        console.log("[HOME] Valid home data structure");

        // Map anime data ke format lama untuk backward compatibility
        const ongoing = homeData.ongoingAnime.map(mapAnimeToDrama);
        const completed = homeData.completeAnime.map(mapAnimeToDrama);

        setOngoingAnime(ongoing);
        setCompletedAnime(completed);

        // Setup carousel dari ongoing anime (top 6)
        const carouselData = homeData.ongoingAnime
          .slice(0, 6)
          .map((anime: any) => ({
            id: anime.animeId,
            cover: anime.poster,
            title: anime.title,
            meta: `${anime.episodes || anime.totalEpisodes || "?"} Episode`,
            description: anime.synopsis?.paragraphs?.[0] || "",
            label: "ONGOING",
            labelColor: "#FF4757",
            navTarget: "Episode",
            navBookId: anime.animeId,
          }));

        setCarouselItems(carouselData);
      } else {
        console.error("[HOME ERROR] Invalid home data structure:", homeData);
        setOngoingAnime([]);
        setCompletedAnime([]);
        setCarouselItems([]);
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

  // Handle scroll event to show/hide scroll to top button
  const handleScroll = useCallback(
    (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY > 500 && !showScrollToTop) {
        setShowScrollToTop(true);
      } else if (offsetY <= 500 && showScrollToTop) {
        setShowScrollToTop(false);
      }
    },
    [showScrollToTop],
  );

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // Responsive percentage width for grid cards inside ScrollView
  const cardWidthPercent = isDesktop
    ? width >= 1200 ? "18%" : "23%" // 5 columns on desktop, 4 columns on small desktop/tablet web
    : "48%"; // 2 columns on mobile

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Grid card rendering
  const renderCard = (item: Anime, index: number, badgeText: string) => {
    return (
      <TouchableOpacity
        key={`${item.animeId}-${badgeText}-${index}`}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            width: cardWidthPercent as any,
            borderBottomWidth: 2.5,
            borderBottomColor: colors.accent,
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
            <Text style={styles.typeText}>{badgeText}</Text>
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
            <Text style={[styles.cardViews, { color: colors.accent }]}>
              ⭐ {item.score || "N/A"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.sidebar}
      />

      {/* Header (Only show on mobile/tablet, as desktop uses WebNavbar) */}
      {!isDesktop && (
        <View
          style={[
            styles.header,
            { backgroundColor: colors.sidebar, borderBottomColor: colors.border },
          ]}
        >
          {/* Mobile Top Welcome Header */}
          <View style={styles.mobileWelcomeRow}>
            <View style={styles.mobileWelcomeTextCol}>
              <Text style={[styles.mobileWelcomeTitle, { color: colors.text }]}>
                Halo {isAuthenticated && username ? username : "Guest"}
              </Text>
              <Text
                style={[
                  styles.mobileWelcomeSubtitle,
                  { color: colors.textSecondary },
                ]}
              >
                Tonton anime favoritmu di MyAnime
              </Text>
            </View>
            <View style={styles.mobileWelcomeRight}>
              <TouchableOpacity
                onPress={toggleTheme}
                style={styles.mobileThemeBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isDark ? "sunny" : "moon"}
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate(isAuthenticated ? "ProfileTab" : "Login")}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.mobileProfileAvatar,
                    { backgroundColor: isDark ? "#2C2C2C" : "#EEE" },
                  ]}
                >
                  {isAuthenticated && profilePicture ? (
                    <Image
                      source={{ uri: profilePicture }}
                      style={{ width: "100%", height: "100%", borderRadius: 16 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Ionicons
                      name={isAuthenticated ? "person" : "log-in"}
                      size={16}
                      color={colors.accent}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerRow}>
            {/* Fake Search Bar mengarah ke SearchScreen */}
            <TouchableOpacity
              style={[styles.searchBar, { backgroundColor: colors.searchBg }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Search")}
            >
              <Text
                style={[
                  styles.searchInput,
                  { color: colors.textMuted, lineHeight: 40 },
                ]}
              >
                Cari anime favoritmu...
              </Text>
              <View style={styles.searchIconWrap}>
                <Ionicons name="search" size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Genre Button */}
            <TouchableOpacity
              style={[styles.genreButton, { backgroundColor: colors.accent }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("GenreList")}
            >
              <Ionicons name="list" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.desktopScrollContent]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        }
      >
        {isDesktop ? (
          <View style={styles.desktopContainer}>
            {/* Left Main Column */}
            <View style={styles.leftColumn}>

              {/* Spotlight / Featured Card */}
              {carouselItems.length > 0 && (
                <TouchableOpacity
                  style={[styles.spotlightCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("Episode", {
                      bookId: carouselItems[0].navBookId,
                      title: carouselItems[0].title,
                    })
                  }
                >
                  <Image
                    source={{ uri: carouselItems[0].cover }}
                    style={styles.spotlightPoster as any}
                    contentFit="cover"
                  />
                  <View style={styles.spotlightInfo}>
                    <View style={styles.spotlightBadgeRow}>
                      <View style={[styles.spotlightBadge, { backgroundColor: "rgba(230,51,51,0.12)" }]}>
                        <Text style={[styles.spotlightBadgeText, { color: colors.accent }]}>Action</Text>
                      </View>
                      <View style={[styles.spotlightBadge, { backgroundColor: "rgba(230,51,51,0.12)" }]}>
                        <Text style={[styles.spotlightBadgeText, { color: colors.accent }]}>Mecha</Text>
                      </View>
                    </View>
                    <Text style={styles.spotlightTitle} numberOfLines={2}>
                      {carouselItems[0].title}
                    </Text>
                    <Text style={[styles.spotlightSynopsis, { color: colors.textSecondary }]} numberOfLines={3}>
                      {carouselItems[0].description || "In an era when a multitude of corporations have entered space and built a huge economic system, Suletta Mercury transfers..."}
                    </Text>

                    <TouchableOpacity
                      style={[styles.spotlightBtn, { backgroundColor: colors.accent }]}
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate("Episode", {
                          bookId: carouselItems[0].navBookId,
                          title: carouselItems[0].title,
                        })
                      }
                    >
                      <Ionicons name="play" size={14} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.spotlightBtnText}>Watch Now</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}

              {/* Recently Updated Section (first 5 ongoing items) */}
              {ongoingAnime.length > 0 && (
                <View style={styles.desktopSection}>
                  <View style={styles.desktopSectionHeader}>
                    <View style={styles.accentLine} />
                    <Text style={[styles.desktopSectionTitle, { color: colors.text }]}>Recently Updated</Text>
                  </View>
                  <View style={styles.horizontalRow}>
                    {ongoingAnime.slice(0, 5).map((item, index) => (
                      <TouchableOpacity
                        key={`recent-${item.animeId}-${index}`}
                        style={styles.recentCard}
                        activeOpacity={0.8}
                        onPress={() =>
                          navigation.navigate("Episode", {
                            bookId: item.animeId,
                            title: item.title,
                          })
                        }
                      >
                        <Image
                          source={{ uri: item.poster || "https://via.placeholder.com/180x240" }}
                          style={styles.recentPoster as any}
                          contentFit="cover"
                        />
                        <Text style={[styles.recentEpisode, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.totalEpisodes ? `Episode ${item.totalEpisodes}` : "Ongoing"}
                        </Text>
                        <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Tab Selector & Grid */}
              <View style={styles.desktopSection}>
                <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.tabButton}
                    onPress={() => setActiveTab("ongoing")}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabText, { color: activeTab === "ongoing" ? colors.text : colors.textSecondary }]}>
                      Trending
                    </Text>
                    {activeTab === "ongoing" && <View style={[styles.activeTabIndicator, { backgroundColor: colors.accent }]} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tabButton}
                    onPress={() => setActiveTab("completed")}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabText, { color: activeTab === "completed" ? colors.text : colors.textSecondary }]}>
                      Most Popular
                    </Text>
                    {activeTab === "completed" && <View style={[styles.activeTabIndicator, { backgroundColor: colors.accent }]} />}
                  </TouchableOpacity>
                </View>

                {/* Grid of items */}
                <View style={styles.desktopGrid}>
                  {(activeTab === "ongoing" ? ongoingAnime.slice(5, 15) : completedAnime.slice(0, 10)).map((item, index) => (
                    <TouchableOpacity
                      key={`grid-${item.animeId}-${index}`}
                      style={styles.gridCard}
                      activeOpacity={0.8}
                      onPress={() =>
                        navigation.navigate("Episode", {
                          bookId: item.animeId,
                          title: item.title,
                        })
                      }
                    >
                      <Image
                        source={{ uri: item.poster || "https://via.placeholder.com/180x240" }}
                        style={styles.gridPoster as any}
                        contentFit="cover"
                      />
                      <Text style={[styles.recentEpisode, { color: colors.textSecondary }]} numberOfLines={1}>
                        ⭐ {item.score || "N/A"} • {item.totalEpisodes ? `${item.totalEpisodes} eps` : "Ongoing"}
                      </Text>
                      <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

            </View>

            {/* Right Sidebar Column */}
            <View style={styles.rightColumn}>
              {/* Announcement Card */}
              <View style={[styles.sidebarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sidebarCardTitle, { color: colors.text }]}>Announcement</Text>
                <Text style={[styles.announcementText, { color: colors.textSecondary }]}>
                  Selamat datang di Project tugas kuliah kami,disini kalian bisa streaming anime tanpa iklan dan bebas nonton kapanpun
                </Text>
                <Text style={[styles.announcementText, { color: colors.textSecondary }]}>
                  Enjoy! 🔥
                </Text>
              </View>

              {/* Discord Button */}
              <TouchableOpacity
                style={styles.discordButton}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-discord" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.discordButtonText}>Join our Discord</Text>
              </TouchableOpacity>

              {/* Top Rating Widget */}
              <View style={[styles.sidebarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sidebarCardTitle, { color: colors.text, marginBottom: 8 }]}>Top Rated Anime</Text>

                {completedAnime.slice(0, 3).map((item, index) => (
                  <TouchableOpacity
                    key={`top-rated-${item.animeId}-${index}`}
                    style={[styles.sidebarItemRow, { borderBottomColor: colors.border, borderBottomWidth: index === 2 ? 0 : 1 }]}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate("Episode", {
                        bookId: item.animeId,
                        title: item.title,
                      })
                    }
                  >
                    <Image
                      source={{ uri: item.poster }}
                      style={styles.sidebarThumb as any}
                      contentFit="cover"
                    />
                    <View style={styles.sidebarItemInfo}>
                      <Text style={[styles.sidebarItemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.sidebarItemScore, { color: colors.accent }]}>
                        ⭐ {item.score || "9.0"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Ongoing Series */}
              <View style={[styles.sidebarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sidebarCardTitle, { color: colors.text, marginBottom: 8 }]}>Ongoing Series</Text>

                {ongoingAnime.slice(0, 4).map((item, index) => (
                  <TouchableOpacity
                    key={`ongoing-series-${item.animeId}-${index}`}
                    style={[styles.sidebarItemRow, { borderBottomColor: colors.border, borderBottomWidth: index === 3 ? 0 : 1 }]}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate("Episode", {
                        bookId: item.animeId,
                        title: item.title,
                      })
                    }
                  >
                    <Image
                      source={{ uri: item.poster }}
                      style={styles.sidebarThumbSquare as any}
                      contentFit="cover"
                    />
                    <View style={styles.sidebarItemInfo}>
                      <Text style={[styles.sidebarItemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.sidebarItemEpisodes, { color: colors.textSecondary }]}>
                        {item.totalEpisodes ? `${item.totalEpisodes} Episodes` : "Ongoing"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : (
          /* Old Mobile Layout */
          <View>
            {/* HERO CAROUSEL */}
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
                        blurRadius={8}
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
                          <Text
                            style={[styles.heroLabel, { color: item.labelColor }]}
                          >
                            {item.label}
                          </Text>

                          <Text style={styles.heroTitle} numberOfLines={2}>
                            {item.title}
                          </Text>

                          <Text style={styles.heroEpisodeCount}>{item.meta}</Text>

                          <Text style={styles.heroDescription} numberOfLines={2}>
                            {item.description ||
                              "Anime seru yang tak boleh kamu lewatkan."}
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

            {/* SECTION 1: ANIME ONGOING */}
            {ongoingAnime.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 4, height: 20, backgroundColor: colors.accent, marginRight: 8, borderRadius: 2 }} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Anime Ongoing
                      </Text>
                    </View>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginLeft: 12 }]}>
                      Anime yang sedang tayang saat ini
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("AnimeList", { type: "ongoing", title: "Anime Ongoing" })}
                    style={styles.seeAllButton}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.seeAllText, { color: colors.accent }]}>
                      Lihat Semua
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.accent} />
                  </TouchableOpacity>
                </View>

                <View style={styles.gridContainer}>
                  {ongoingAnime.slice(0, 10).map((item, index) => renderCard(item, index, "ONGOING"))}
                </View>
              </View>
            )}

            {/* SECTION 2: ANIME COMPLETED */}
            {completedAnime.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 4, height: 20, backgroundColor: colors.accent, marginRight: 8, borderRadius: 2 }} />
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Anime Completed
                      </Text>
                    </View>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginLeft: 12 }]}>
                      Anime yang sudah selesai tayang
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("AnimeList", { type: "completed", title: "Anime Completed" })}
                    style={styles.seeAllButton}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.seeAllText, { color: colors.accent }]}>
                      Lihat Semua
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.accent} />
                  </TouchableOpacity>
                </View>

                <View style={styles.gridContainer}>
                  {completedAnime.slice(0, 10).map((item, index) => renderCard(item, index, "COMPLETED"))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* SCROLL TO TOP BUTTON */}
      {showScrollToTop && (
        <TouchableOpacity
          style={[styles.scrollToTopButton, { backgroundColor: colors.accent }]}
          activeOpacity={0.8}
          onPress={scrollToTop}
        >
          <Ionicons name="arrow-up" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default HomeScreen;

/* styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingTop: isWeb ? 16 : 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
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
  genreButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroContainer: {
    height: isWeb ? 280 : 220,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 24,
    borderRadius: 14,
    overflow: "hidden",
  },
  heroSlide: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    position: "relative",
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    ...(isWeb
      ? { filter: "blur(10px) brightness(0.9)", transform: [{ scale: 1.1 }] }
      : {}),
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  heroGradBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
  },
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
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
    padding: 4,
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
  cardViews: {
    fontSize: 11,
    fontWeight: "700",
  },
  scrollToTopButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  desktopScrollContent: {
    paddingBottom: 60,
  },
  desktopContainer: {
    flexDirection: "row",
    paddingHorizontal: 32,
    paddingTop: 24,
    gap: 32,
    maxWidth: 1280,
    alignSelf: "center",
    width: "100%",
  },
  leftColumn: {
    flex: 3,
    gap: 28,
  },
  rightColumn: {
    flex: 1,
    gap: 24,
  },
  spotlightCard: {
    flexDirection: "row",
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  spotlightPoster: {
    width: 140,
    height: 200,
    borderRadius: 8,
    marginRight: 24,
  },
  spotlightInfo: {
    flex: 1,
    justifyContent: "center",
  },
  spotlightBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  spotlightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  spotlightBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spotlightTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 8,
  },
  spotlightSynopsis: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  spotlightBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
  },
  spotlightBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  desktopSection: {
    gap: 16,
  },
  desktopSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accentLine: {
    width: 4,
    height: 18,
    backgroundColor: "#E63333",
    borderRadius: 2,
  },
  desktopSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  horizontalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  recentCard: {
    flex: 1,
    gap: 6,
  },
  recentPoster: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
  },
  recentEpisode: {
    fontSize: 11,
    fontWeight: "500",
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    gap: 24,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  tabButton: {
    paddingVertical: 12,
    position: "relative",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  desktopGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  gridCard: {
    width: "18%",
    gap: 6,
    marginBottom: 8,
  },
  gridPoster: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
  },
  sidebarCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  sidebarCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  announcementText: {
    fontSize: 13,
    lineHeight: 18,
  },
  discordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5865F2",
    paddingVertical: 12,
    borderRadius: 15,
  },
  discordButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  sidebarItemRow: {
    flexDirection: "row",
    paddingVertical: 12,
    gap: 12,
    alignItems: "center",
  },
  sidebarThumb: {
    width: 32,
    height: 48,
    borderRadius: 4,
  },
  sidebarThumbSquare: {
    width: 38,
    height: 38,
    borderRadius: 6,
  },
  sidebarItemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  sidebarItemTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  sidebarItemScore: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  sidebarItemEpisodes: {
    fontSize: 11,
    marginTop: 2,
  },
});
