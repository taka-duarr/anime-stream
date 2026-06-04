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
  Linking,
  PanResponder,
} from "react-native";
import { Image } from "expo-image";
import { getHomeData } from "../services/api";
import { Anime } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import Swiper from "react-native-swiper";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { WebFooter } from "../components/WebFooter";

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
  const [desktopCarouselIndex, setDesktopCarouselIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [activeTab, setActiveTab] = useState<"ongoing" | "completed">("ongoing");
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const scrollViewRef = useRef<ScrollView>(null);
  const swiperRef = useRef<any>(null);
  const dragScrollRef = useRef<any>(null);
  const isDragging = useRef(false);
  const [spotlightWidth, setSpotlightWidth] = useState(800);
  const isMouseDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: any) => {
    if (Platform.OS !== "web") return;
    isMouseDown.current = true;
    startX.current = e.clientX;
    const domNode = dragScrollRef.current?.getScrollableNode?.() || dragScrollRef.current;
    if (domNode) {
      scrollLeft.current = domNode.scrollLeft;
      domNode.style.cursor = "grabbing";
      domNode.style.userSelect = "none";
    }
  };

  const onMouseMove = (e: any) => {
    if (!isMouseDown.current || Platform.OS !== "web") return;
    const domNode = dragScrollRef.current?.getScrollableNode?.() || dragScrollRef.current;
    if (domNode) {
      const x = e.clientX;
      const walk = (startX.current - x);
      domNode.scrollLeft = scrollLeft.current + walk;
      isDragging.current = Math.abs(walk) > 10;
    }
  };

  const onMouseUpOrLeave = () => {
    if (!isMouseDown.current || Platform.OS !== "web") return;
    isMouseDown.current = false;
    const domNode = dragScrollRef.current?.getScrollableNode?.() || dragScrollRef.current;
    if (domNode) {
      domNode.style.cursor = "grab";
      domNode.style.removeProperty("user-select");
      
      const cardWidth = domNode.clientWidth || spotlightWidth;
      const index = Math.round(domNode.scrollLeft / cardWidth);
      setDesktopCarouselIndex(index);
      domNode.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });
      setTimeout(() => {
        isDragging.current = false;
      }, 80);
    }
  };

  const mobilePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (Platform.OS !== "web") return false;
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx } = gestureState;
        if (Math.abs(dx) > 40) {
          if (dx < 0) {
            swiperRef.current?.scrollBy(1, true);
          } else {
            swiperRef.current?.scrollBy(-1, true);
          }
        }
        setTimeout(() => {
          isDragging.current = false;
        }, 80);
      },
    })
  ).current;

  // Auto-scroll for desktop carousel
  useEffect(() => {
    if (carouselItems.length > 0) {
      const interval = setInterval(() => {
        setDesktopCarouselIndex((prev) => (prev + 1) % carouselItems.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [carouselItems]);

  // Sync scroll offset with desktopCarouselIndex
  useEffect(() => {
    if (carouselItems.length > 0 && !isMouseDown.current) {
      if (Platform.OS === "web") {
        const domNode = dragScrollRef.current?.getScrollableNode?.() || dragScrollRef.current;
        if (domNode && typeof domNode.scrollTo === 'function') {
          domNode.scrollTo({
            left: desktopCarouselIndex * spotlightWidth,
            behavior: "smooth",
          });
        }
      } else {
        dragScrollRef.current?.scrollTo({
          x: desktopCarouselIndex * spotlightWidth,
          animated: true,
        });
      }
    }
  }, [desktopCarouselIndex, spotlightWidth, carouselItems.length]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setDesktopCarouselIndex(0);

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
          .map((anime: any) => {
            // Pick genres based on keywords in title, or default genres
            let genres = ["Action", "Sci-Fi"];
            const titleLower = anime.title.toLowerCase();
            if (titleLower.includes("gundam") || titleLower.includes("mecha") || titleLower.includes("witch from mercury")) {
              genres = ["Action", "Mecha"];
            } else if (titleLower.includes("romance") || titleLower.includes("love") || titleLower.includes("marriage")) {
              genres = ["Romance", "Comedy"];
            } else if (titleLower.includes("fantasy") || titleLower.includes("isekai") || titleLower.includes("reincarnat")) {
              genres = ["Fantasy", "Isekai"];
            } else if (titleLower.includes("slice") || titleLower.includes("life") || titleLower.includes("school")) {
              genres = ["Slice of Life", "School"];
            } else if (titleLower.includes("adventure") || titleLower.includes("quest") || titleLower.includes("world")) {
              genres = ["Adventure", "Fantasy"];
            } else {
              const defaultGenres = [
                ["Action", "Fantasy"],
                ["Comedy", "School"],
                ["Sci-Fi", "Adventure"],
                ["Drama", "Mystery"],
              ];
              let hash = 0;
              for (let i = 0; i < anime.title.length; i++) {
                hash += anime.title.charCodeAt(i);
              }
              genres = defaultGenres[hash % defaultGenres.length];
            }

            return {
              id: anime.animeId,
              cover: anime.poster,
              title: anime.title,
              meta: `${anime.episodes || anime.totalEpisodes || "?"} Episode`,
              description: anime.synopsis?.paragraphs?.[0] || "",
              label: "ONGOING",
              labelColor: "#FF4757",
              navTarget: "Episode",
              navBookId: anime.animeId,
              genres,
            };
          });

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

  const renderWebFooter = () => {
    return <WebFooter />;
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
          {/* Mobile Top Brand Logo & Right Controls */}
          <View style={styles.mobileWelcomeRow}>
            <TouchableOpacity
              style={styles.mobileLogoSection}
              onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
              activeOpacity={0.7}
            >
              <Image
                source={isDark ? require("../../assets/logogelap.png") : require("../../assets/logo.png")}
                style={styles.mobileLogoOne as any}
                contentFit="contain"
              />
              <Image
                source={require("../../assets/nganime.png")}
                style={styles.mobileLogoTwo as any}
                contentFit="contain"
              />
            </TouchableOpacity>

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

          {/* Mobile User Welcome Row (below the brand logo) */}
          <View style={styles.mobileUserGreetingRow}>
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
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.desktopScrollContent,
          isWeb && { paddingBottom: 0, flexGrow: 1 }
        ]}
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
        <View style={{ flex: 1 }}>
          {isDesktop ? (
            <View style={styles.desktopContainer}>
            {/* Left Main Column */}
            <View style={styles.leftColumn}>

              {/* Spotlight / Featured Card */}
              {carouselItems.length > 0 && (
                <View 
                  onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0) setSpotlightWidth(w);
                  }}
                  style={styles.spotlightWrapper}
                >
                  <ScrollView
                    ref={dragScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={(e) => {
                      const x = e.nativeEvent.contentOffset.x;
                      const index = Math.round(x / spotlightWidth);
                      setDesktopCarouselIndex(index);
                    }}
                    {...(Platform.OS === "web" ? {
                      onMouseDown: onMouseDown,
                      onMouseMove: onMouseMove,
                      onMouseUp: onMouseUpOrLeave,
                      onMouseLeave: onMouseUpOrLeave,
                      style: { cursor: "grab" } as any,
                    } : {})}
                  >
                    {carouselItems.map((item, index) => (
                      <View key={`spotlight-${item.id}-${index}`} style={{ width: spotlightWidth }}>
                        <TouchableOpacity
                          style={[styles.spotlightCard, { borderColor: colors.border }]}
                          activeOpacity={0.85}
                          onPress={() => {
                            if (isDragging.current) return;
                            navigation.navigate("Episode", {
                              bookId: item.navBookId,
                              title: item.title,
                            });
                          }}
                        >
                          <Image
                            source={{ uri: item.cover }}
                            style={styles.spotlightBackground as any}
                            contentFit="cover"
                            blurRadius={10}
                          />
                          <LinearGradient
                            colors={["rgba(13,13,13,0.2)", "rgba(13,13,13,0.6)", "rgba(13,13,13,0.95)"]}
                            style={styles.spotlightGradient}
                          />

                          <Image
                            source={{ uri: item.cover }}
                            style={styles.spotlightPoster as any}
                            contentFit="cover"
                          />
                          <View style={styles.spotlightInfo}>
                            <View style={styles.spotlightBadgeRow}>
                              {item.genres.map((genre: string, idx: number) => (
                                <View key={idx} style={styles.spotlightBadge}>
                                  <Text style={styles.spotlightBadgeText}>{genre}</Text>
                                </View>
                              ))}
                            </View>
                            <Text style={styles.spotlightTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={[styles.spotlightSynopsis, { color: "#CCCCCC" }]} numberOfLines={3}>
                              {item.description || `Tonton streaming ${item.title} Subtitle Indonesia gratis lengkap dengan kualitas terbaik. Ikuti kisah serunya sekarang juga!`}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
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
                  Enjoy Guys! 
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
              <View style={styles.sidebarSection}>
                <View style={styles.sidebarHeaderRow}>
                  <View style={styles.sidebarIndicator} />
                  <Text style={[styles.sidebarSectionTitle, { color: colors.text }]}>Top Rated Anime</Text>
                </View>

                <View style={styles.sidebarItemsList}>
                  {completedAnime.slice(0, 3).map((item, index) => (
                    <TouchableOpacity
                      key={`top-rated-${item.animeId}-${index}`}
                      style={styles.sidebarItemRow}
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
                        style={styles.sidebarPoster as any}
                        contentFit="cover"
                      />
                      <View style={styles.sidebarItemInfo}>
                        <Text style={[styles.sidebarItemTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.sidebarItemSubtitle, { color: colors.textSecondary }]}>
                          ⭐ {item.score || "9.0"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Ongoing Series */}
              <View style={styles.sidebarSection}>
                <View style={styles.sidebarHeaderRow}>
                  <View style={styles.sidebarIndicator} />
                  <Text style={[styles.sidebarSectionTitle, { color: colors.text }]}>Ongoing Series</Text>
                </View>

                <View style={styles.sidebarItemsList}>
                  {ongoingAnime.slice(0, 4).map((item, index) => (
                    <TouchableOpacity
                      key={`ongoing-series-${item.animeId}-${index}`}
                      style={styles.sidebarItemRow}
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
                        style={styles.sidebarPoster as any}
                        contentFit="cover"
                      />
                      <View style={styles.sidebarItemInfo}>
                        <Text style={[styles.sidebarItemTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.sidebarItemSubtitle, { color: colors.textSecondary }]}>
                          {item.totalEpisodes ? `Episode ${item.totalEpisodes}` : "Episode 1"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Old Mobile Layout */
          <View>
            {/* HERO CAROUSEL */}
            {carouselItems.length > 0 && (
              <View 
                {...Platform.select({
                  web: mobilePanResponder.panHandlers,
                  default: {},
                })}
                style={styles.heroContainer}
              >
                <Swiper
                  ref={swiperRef}
                  showsButtons={false}
                  autoplay={!isDragging.current}
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
                        blurRadius={5}
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
                            onPress={() => {
                              if (isDragging.current) return;
                              navigation.navigate(item.navTarget, {
                                bookId: item.navBookId,
                                title: item.title,
                              });
                            }}
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
        </View>

        {renderWebFooter()}
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
    fontWeight: "bold",
    marginBottom: 2,
  },
  mobileWelcomeSubtitle: {
    fontSize: 11,
    fontWeight: "normal",
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
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: "Inter",
    color: "#FFFFFF",
    fontSize: isWeb ? 22 : 17,
    fontWeight: "bold",
    lineHeight: isWeb ? 28 : 23,
    marginBottom: 4,
  },
  heroEpisodeCount: {
    color: "#CCCCCC",
    fontSize: 12,
    fontWeight: "normal",
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
    fontWeight: "bold",
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
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "bold",
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
    fontWeight: "normal",
  },
  cardViews: {
    fontSize: 11,
    fontWeight: "bold",
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
    paddingTop: 72,
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
  spotlightWrapper: {
    position: "relative",
    width: "100%",
  },

  spotlightCard: {
    flexDirection: "row",
    padding: 24,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    minHeight: 240,
  },
  spotlightBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    opacity: 0.5,
  },
  spotlightGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  spotlightPoster: {
    width: 140,
    height: 200,
    borderRadius: 5,
    marginRight: 24,
    zIndex: 1,
  },
  spotlightInfo: {
    flex: 1,
    justifyContent: "center",
    zIndex: 1,
  },
  spotlightBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  spotlightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(155, 92, 92, 0.25)",
  },
  spotlightBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#e30000ff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spotlightTitle: {
    fontSize: 22,
    fontWeight: "bold",
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
    borderRadius: 10,
  },
  spotlightBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
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
    borderRadius: 20,
  },
  desktopSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
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
    borderRadius: 5,
  },
  recentEpisode: {
    fontSize: 11,
    fontWeight: "normal",
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: "bold",
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
    fontWeight: "bold",
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
    borderRadius: 5,
  },
  sidebarCard: {
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  sidebarCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  announcementText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'justify',
  },
  discordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#5865F2",
    paddingVertical: 12,
    borderRadius: 10,
  },
  discordButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  sidebarSection: {
    marginBottom: 28,
  },
  sidebarHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sidebarIndicator: {
    width: 4,
    height: 18,
    backgroundColor: "#E63333",
    borderRadius: 20,
    marginRight: 8,
  },
  sidebarSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  sidebarItemsList: {
    gap: 16,
  },
  sidebarItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sidebarPoster: {
    width: 70,
    height: 95,
    borderRadius: 3,
  },
  sidebarItemInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  sidebarItemTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  sidebarItemSubtitle: {
    fontSize: 13,
    fontWeight: "normal",
  },
  webFooterContainer: {
    paddingTop: 48,
    borderTopWidth: 1,
    width: "100%",
    marginTop: 48,
    marginBottom: 0,
  },
  webFooterContent: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    flexWrap: "wrap",
    gap: 32,
  },
  footerBrandCol: {
    gap: 16,
  },
  footerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerLogoImg: {
    width: 48,
    height: 48,
  },
  footerLogoTextImg: {
    width: 120,
    height: 38,
  },
  footerDescription: {
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 450,
  },
  footerSocialsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  socialIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  footerLinkCol: {
    gap: 12,
  },
  footerColTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  footerLinkBtn: {
    paddingVertical: 2,
  },
  footerLinkText: {
    fontSize: 14,
  },
  taglineBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(230, 51, 51, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  taglineBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  footerBottomRow: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    marginTop: 40,
    alignItems: "center",
  },
  copyrightText: {
    fontSize: 13,
    textAlign: "center",
  },
  mobileLogoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mobileLogoOne: {
    width: 32,
    height: 32,
  },
  mobileLogoTwo: {
    width: 80,
    height: 28,
    marginTop: 1,
  },
  mobileUserGreetingRow: {
    paddingHorizontal: 4,
    marginTop: 12,
    marginBottom: 4,
  },
});
