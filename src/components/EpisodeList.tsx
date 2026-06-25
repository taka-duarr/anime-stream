import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useTheme } from "../context/ThemeContext";
import { Episode } from "../types/episode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";

interface EpisodeListProps {
  episodes: Episode[];
  posterUrl?: string;
  animeTitle?: string;
  onEpisodePress: (episode: Episode) => void;
  maxHeight?: number;
  watchedEpisodes?: string[];
}

const getCleanEpisodeTitle = (episodeName: string, animeTitle?: string) => {
  if (!episodeName) return "";

  // Ekstrak pola episode/OVA/Movie/Special secara cerdas
  const episodePattern = /(Episode\s+\d+|Ep\s+\d+|OVA\s+\d+|Special\s+\d+|Movie\s+\d+|SP\s+\d+)/i;
  const match = episodeName.match(episodePattern);

  if (match) {
    return match[0];
  }

  let cleanName = episodeName;
  if (animeTitle) {
    const escapedTitle = animeTitle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedTitle, 'gi');
    cleanName = cleanName.replace(regex, '').trim();
  }

  cleanName = cleanName.replace(/Subtitle Indonesia/gi, '')
                        .replace(/Sub Indo/gi, '')
                        .trim();

  cleanName = cleanName.replace(/^[:\-\s\s]+/, '').trim();

  return cleanName || episodeName;
};

const EpisodeList: React.FC<EpisodeListProps> = ({
  episodes,
  posterUrl,
  animeTitle,
  onEpisodePress,
  maxHeight = 400,
  watchedEpisodes = [],
}) => {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [watchProgress, setWatchProgress] = useState<Record<string, { watchedSeconds: number; totalSeconds: number }>>({});

  useEffect(() => {
    if (isFocused) {
      const loadProgress = async () => {
        try {
          const stored = await AsyncStorage.getItem("anime_stream_watch_progress");
          if (stored) {
            setWatchProgress(JSON.parse(stored));
          }
        } catch (err) {
          console.error("Gagal memuat progress tontonan lokal:", err);
        }
      };
      loadProgress();
    }
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { maxHeight }]}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      >
        {episodes.map((item, index) => {
          const cleanTitle = getCleanEpisodeTitle(item.chapterName, animeTitle);
          const isWatched = watchedEpisodes.includes(item.chapterId);
          return (
            <TouchableOpacity
              key={item.chapterId}
              style={[
                styles.episodeCard,
                { backgroundColor: colors.card },
                isWatched && { opacity: 0.45 },
              ]}
              activeOpacity={0.8}
              onPress={() => onEpisodePress(item)}
            >
               <View style={styles.episodeImageWrapper}>
                <Image
                  source={{ uri: item.chapterImg || posterUrl }}
                  style={styles.episodeImage}
                />
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>
                    {item.duration || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.episodeInfo}>
                <Text
                  style={[styles.episodeTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {cleanTitle}
                </Text>
                <Text
                  style={[
                    styles.episodeSubtitle,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {item.releaseTime || "Release date unknown"}{(() => {
                    const prog = watchProgress[item.chapterId];
                    if (prog && prog.watchedSeconds > 0) {
                      const mins = Math.round(prog.watchedSeconds / 60);
                      return ` • Ditonton ${mins}m`;
                    }
                    return "";
                  })()}
                </Text>
              </View>
              {(() => {
                const prog = watchProgress[item.chapterId];
                if (prog && prog.watchedSeconds > 0 && prog.totalSeconds > 0) {
                  const percent = Math.min(Math.round((prog.watchedSeconds / prog.totalSeconds) * 100), 100);
                  return (
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: colors.accent }]} />
                    </View>
                  );
                }
                return null;
              })()}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  scrollView: {
    width: "100%",
  },
  episodeCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    position: "relative",
    overflow: "hidden",
  },
  episodeImageWrapper: {
    position: "relative",
    width: 120,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 14,
  },
  episodeImage: {
    width: "100%",
    height: "100%",
  },
  durationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 12,
  },
  durationText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  episodeInfo: {
    flex: 1,
    justifyContent: "center",
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  episodeSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressBarBg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: 4,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  progressBarFill: {
    height: "100%",
    zIndex: 11,
  },
});

export default EpisodeList;
