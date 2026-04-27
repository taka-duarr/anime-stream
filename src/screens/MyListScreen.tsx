import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
  DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CARD_MARGIN = 8;
const STORAGE_KEY = "@my_anime_list";

const MyListScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();

  let numColumns = 2;
  if (width >= 1200) numColumns = 5;
  else if (width >= 900) numColumns = 4;
  else if (width >= 600) numColumns = 3;

  const listPadding = 16;
  const availableWidth = width - listPadding * 2;
  const CARD_WIDTH = availableWidth / numColumns - CARD_MARGIN;

  const [myList, setMyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyList();

    // Refresh list when screen comes into focus
    const unsubscribe = navigation.addListener("focus", () => {
      loadMyList();
    });

    return unsubscribe;
  }, [navigation]);

  const loadMyList = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMyList(parsed);
      }
    } catch (error) {
      console.error("Failed to load my list:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromList = async (animeId: string) => {
    try {
      const updated = myList.filter((item) => item.animeId !== animeId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setMyList(updated);
    } catch (error) {
      console.error("Failed to remove from list:", error);
    }
  };

  const clearAll = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setMyList([]);
    } catch (error) {
      console.error("Failed to clear list:", error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.sidebar}
      />

      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            My List
          </Text>
          {myList.length > 0 && (
            <TouchableOpacity onPress={clearAll} style={styles.clearButton}>
              <Text style={[styles.clearButtonText, { color: colors.accent }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {myList.length > 0 && (
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {myList.length} anime tersimpan
          </Text>
        )}
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Memuat...
          </Text>
        </View>
      ) : myList.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="bookmark-outline"
            size={64}
            color={colors.textMuted}
          />
          <Text style={[styles.title, { color: colors.text }]}>
            Belum Ada Anime
          </Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Tambahkan anime favorit Anda ke My List
          </Text>
          <TouchableOpacity
            style={[styles.exploreButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate("Main", { screen: "HomeTab" })}
          >
            <Text style={styles.exploreButtonText}>Jelajahi Anime</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={styles.gridRow}>
            {myList.map((item, i) => (
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
                      uri: item.poster || "https://via.placeholder.com/180x240",
                    }}
                    style={styles.image}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromList(item.animeId)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF4757" />
                  </TouchableOpacity>
                  {item.score && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={10} color="#FBBF24" />
                      <Text style={styles.ratingText}>{item.score}</Text>
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
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  text: {
    fontSize: 14,
    textAlign: "center",
  },
  exploreButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16 - CARD_MARGIN / 2,
    paddingTop: 16,
  },
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
  image: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 7,
    right: 7,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
  },
  ratingBadge: {
    position: "absolute",
    bottom: 7,
    left: 7,
    backgroundColor: "rgba(15,23,42,0.8)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  ratingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginHorizontal: 8,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 11,
    marginHorizontal: 8,
    marginBottom: 8,
  },
});

export default MyListScreen;
