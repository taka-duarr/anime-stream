import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Platform,
  PanResponder,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { Episode } from "../types/episode";
import { EpisodeDetail, ServerQuality, StreamingServer } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { useKeepAwake } from "expo-keep-awake";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { useTheme } from "../context/ThemeContext";
import { getEpisodeDetail, getServerStreamingUrl } from "../services/api";

// Declare window for web platform
declare const window: any;

const { width, height } = Dimensions.get("window");

const VideoScreen = ({ route }: { route: RouteProp<any, any> }) => {
  useKeepAwake();
  const navigation = useNavigation();

  const { episode, episodes, animeId } = route.params as {
    episode: Episode;
    episodes: Episode[];
    animeId?: string;
  };

  const [episodeDetail, setEpisodeDetail] = useState<EpisodeDetail | null>(
    null,
  );
  const [selectedQuality, setSelectedQuality] = useState<string>("720p");
  const [selectedServer, setSelectedServer] = useState<StreamingServer | null>(
    null,
  );
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");
  const [loadingVideo, setLoadingVideo] = useState(true);

  const [currentEpisode, setCurrentEpisode] = useState<Episode>(episode);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const { colors } = useTheme();

  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<View>(null);
  const lastTapRef = useRef<number>(0);

  // Fetch episode detail when episode changes
  useEffect(() => {
    fetchEpisodeDetail();
  }, [currentEpisode.chapterId]);

  const fetchEpisodeDetail = async () => {
    try {
      setLoadingVideo(true);
      console.log("[VIDEO] Fetching episode detail:", currentEpisode.chapterId);

      const detail = await getEpisodeDetail(currentEpisode.chapterId);
      console.log(
        "[VIDEO] Episode detail received:",
        JSON.stringify(detail, null, 2),
      );

      setEpisodeDetail(detail);

      // Use default streaming URL if available
      if (detail.defaultStreamingUrl) {
        console.log(
          "[VIDEO] Using default streaming URL:",
          detail.defaultStreamingUrl,
        );
        setCurrentVideoUrl(detail.defaultStreamingUrl);
        setLoadingVideo(false);
      } else {
        console.log(
          "[VIDEO] No default streaming URL, checking serverqualities...",
        );

        // Otherwise, select first available server
        if (detail.serverqualities && detail.serverqualities.length > 0) {
          const firstQuality = detail.serverqualities[0];
          console.log("[VIDEO] First quality:", firstQuality.title);
          setSelectedQuality(firstQuality.title);

          if (firstQuality.serverList && firstQuality.serverList.length > 0) {
            const firstServer = firstQuality.serverList[0];
            console.log(
              "[VIDEO] First server:",
              firstServer.title,
              firstServer.serverId,
            );
            setSelectedServer(firstServer);
            await loadServerUrl(firstServer.serverId);
          } else {
            console.error(
              "[VIDEO ERROR] No servers available in quality group",
            );
            setLoadingVideo(false);
          }
        } else {
          console.error("[VIDEO ERROR] No serverqualities available");
          setLoadingVideo(false);
        }
      }
    } catch (error) {
      console.error("[VIDEO ERROR] Failed to fetch episode detail:", error);
      setLoadingVideo(false);
    }
  };

  const loadServerUrl = async (serverId: string) => {
    try {
      setLoadingVideo(true);
      console.log("[VIDEO] Loading server URL for:", serverId);

      const serverData = await getServerStreamingUrl(serverId);
      console.log(
        "[VIDEO] Server data received:",
        JSON.stringify(serverData, null, 2),
      );

      if (serverData && serverData.streamingUrl) {
        console.log("[VIDEO] Setting streaming URL:", serverData.streamingUrl);
        setCurrentVideoUrl(serverData.streamingUrl);
      } else {
        console.error("[VIDEO ERROR] No streaming URL in server data");
      }
      setLoadingVideo(false);
    } catch (error) {
      console.error("[VIDEO ERROR] Failed to load server URL:", error);
      setLoadingVideo(false);
    }
  };

  // Change quality and server
  const changeQualityAndServer = async (
    quality: string,
    server: StreamingServer,
  ) => {
    setSelectedQuality(quality);
    setSelectedServer(server);
    await loadServerUrl(server.serverId);
  };

  // Inisialisasi Player Video Modern
  const player = useVideoPlayer(
    {
      uri: currentVideoUrl || "https://via.placeholder.com/1920x1080.mp4",
    },
    (player) => {
      player.loop = false;
      player.muted = false;
      player.volume = 1.0;
      if (currentVideoUrl) {
        player.play();
      }
    },
  );

  // Saat video URL berubah, gunakan replace() agar Native Object tidak hancur
  useEffect(() => {
    if (currentVideoUrl && player) {
      const backupPos = player.currentTime;
      player.replaceAsync({ uri: currentVideoUrl });

      if (backupPos > 0) {
        player.currentTime = backupPos;
      }

      player.muted = false;
      player.volume = 1.0;
      player.play();
    }
  }, [currentVideoUrl]);

  // Event Listener Real-Time
  const { isPlaying: playerIsPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const { status: playerStatus } = useEvent(player, "statusChange", {
    status: player.status,
  });

  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setPositionMillis(player.currentTime);
        setDurationMillis(player.duration || 0);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, player]);

  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;
  const currentTime = formatTime(positionMillis * 1000);
  const totalTime = formatTime(durationMillis * 1000);

  useEffect(() => {
    setIsPlaying(playerIsPlaying);
  }, [playerIsPlaying]);

  // Auto-play next episode when current ends
  useEffect(() => {
    if (durationMillis > 0 && positionMillis >= durationMillis - 0.5) {
      playNextEpisode();
    }
  }, [positionMillis, durationMillis]);

  function formatTime(millis: number) {
    if (!millis || millis < 0) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

  const resetAutoHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  const togglePlayPause = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    resetAutoHideTimer();
  };

  // Web Only: Global Keyboard Shortcuts
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const keyHandler = (e: any) => {
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA")
        return;

      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const dest = player.currentTime + 10;
        player.currentTime =
          durationMillis > 0 && dest > durationMillis ? durationMillis : dest;
        resetAutoHideTimer();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        player.currentTime = Math.max(0, player.currentTime - 10);
        resetAutoHideTimer();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", keyHandler);
      return () => {
        window.removeEventListener("keydown", keyHandler);
      };
    }
  }, [player, durationMillis]);

  const handleProgressBarTap = (event: any) => {
    if (progressBarRef.current && durationMillis > 0) {
      progressBarRef.current.measure(
        (x, y, barWidth, barHeight, pageX, pageY) => {
          const tapX = event.nativeEvent.pageX - pageX;
          const progressPercentage = Math.max(0, Math.min(1, tapX / barWidth));
          const seekTime = progressPercentage * durationMillis;

          player.currentTime = seekTime;
          resetAutoHideTimer();
        },
      );
    }
  };

  const playNextEpisode = () => {
    const currentIndex = episodes.findIndex(
      (ep) => ep.chapterId === currentEpisode.chapterId,
    );

    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentIndex + 1];
      setCurrentEpisode(nextEpisode);
      setPositionMillis(0);
      resetAutoHideTimer();
    } else {
      player.pause();
      setShowControls(true);
    }
  };

  const playPreviousEpisode = () => {
    const currentIndex = episodes.findIndex(
      (ep) => ep.chapterId === currentEpisode.chapterId,
    );

    if (currentIndex > 0) {
      const prevEpisode = episodes[currentIndex - 1];
      setCurrentEpisode(prevEpisode);
      setPositionMillis(0);
      resetAutoHideTimer();
    }
  };

  // TikTok-style Swipe Gesture
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          return (
            Math.abs(gestureState.dy) > 30 &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2
          );
        },
        onPanResponderRelease: (evt, gestureState) => {
          if (gestureState.dy < -60) {
            playNextEpisode();
          } else if (gestureState.dy > 60) {
            playPreviousEpisode();
          }
        },
      }),
    [currentEpisode],
  );

  const handleScreenTap = (event: any) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const tapX = event.nativeEvent.pageX;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (tapX < width / 2) {
        player.currentTime = Math.max(0, player.currentTime - 10);
      } else {
        const dest = player.currentTime + 10;
        player.currentTime =
          durationMillis > 0 && dest > durationMillis ? durationMillis : dest;
      }
      lastTapRef.current = 0;
      setShowControls(true);
      resetAutoHideTimer();
    } else {
      lastTapRef.current = now;
      if (!showControls) {
        setShowControls(true);
        resetAutoHideTimer();
      } else {
        setShowControls(false);
      }
    }
  };

  useEffect(() => {
    resetAutoHideTimer();

    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && showControls) {
      resetAutoHideTimer();
    }
  }, [isPlaying, showControls]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <VideoView
        style={styles.video}
        player={player}
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        contentFit="contain"
      />

      {/* LOADING INDICATOR */}
      {(loadingVideo || playerStatus === "loading") && (
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.bufferingText}>Memuat Video...</Text>
        </View>
      )}

      {/* ERROR INDICATOR */}
      {playerStatus === "error" && (
        <View style={styles.centerOverlay}>
          <Ionicons
            name="warning"
            size={40}
            color="#FF4757"
            style={{ marginBottom: 10 }}
          />
          <Text
            style={[
              styles.bufferingText,
              { color: "#FFF", textAlign: "center", marginHorizontal: 20 },
            ]}
          >
            Gagal Memutar Video. Server menolak koneksi atau sesi habis.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchEpisodeDetail()}
          >
            <Text style={styles.retryButtonText}>Coba Ulang</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TIKTOK SWIPE GESTURE WRAPPER */}
      <View
        style={[StyleSheet.absoluteFillObject, { zIndex: 10 }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.fullScreenTouchable}
          activeOpacity={1}
          onPress={handleScreenTap}
          delayPressIn={0}
        >
          {showControls && (
            <>
              {/* TOP CONTROLS */}
              <View style={styles.topControls}>
                <Text style={styles.episodeTitle} numberOfLines={1}>
                  {episodeDetail?.title || currentEpisode.chapterName}
                </Text>

                <TouchableOpacity
                  style={styles.closePageButton}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>

              {/* PLAY/PAUSE BUTTON */}
              {!isPlaying && (
                <TouchableOpacity
                  style={styles.centerPlayButton}
                  onPress={togglePlayPause}
                  activeOpacity={0.8}
                >
                  <View style={styles.playButtonCircle}>
                    <Ionicons
                      name="play"
                      size={60}
                      color="rgba(255,255,255,0.9)"
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* PROGRESS BAR */}
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{currentTime}</Text>

                <View ref={progressBarRef} style={styles.progressBarWrapper}>
                  <TouchableOpacity
                    style={styles.progressBarTouchable}
                    activeOpacity={1}
                    onPress={handleProgressBarTap}
                  >
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${progress * 100}%`,
                            backgroundColor: colors.accent,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.progressThumb,
                          {
                            left: `${progress * 100}%`,
                            backgroundColor: colors.accent,
                          },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={styles.timeText}>{totalTime}</Text>
              </View>

              {/* BOTTOM CONTROLS */}
              <View style={styles.bottomControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={togglePlayPause}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={28}
                    color="white"
                  />
                  <Text style={styles.controlButtonText}>
                    {isPlaying ? "Pause" : "Play"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* RIGHT SIDE BUTTONS */}
          {showControls && (
            <View style={styles.rightButtons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  setShowQualityModal(true);
                  resetAutoHideTimer();
                }}
              >
                <Ionicons name="settings" size={28} color="white" />
                <Text style={styles.iconText}>{selectedQuality}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  setShowEpisodeList(true);
                  resetAutoHideTimer();
                }}
              >
                <Ionicons name="list" size={30} color="white" />
                <Text style={styles.iconText}>EP</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* EPISODE MODAL */}
      <Modal
        visible={showEpisodeList}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowEpisodeList(false);
          resetAutoHideTimer();
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setShowEpisodeList(false);
              resetAutoHideTimer();
            }}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Daftar Episode
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEpisodeList(false);
                  resetAutoHideTimer();
                }}
                style={styles.modalCloseIcon}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={episodes}
              keyExtractor={(item) => item.chapterId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.episodeItem,
                    {
                      backgroundColor:
                        item.chapterId === currentEpisode.chapterId
                          ? colors.accent
                          : colors.card,
                    },
                  ]}
                  onPress={() => {
                    setCurrentEpisode(item);
                    setShowEpisodeList(false);
                    resetAutoHideTimer();
                  }}
                >
                  <Text
                    style={[
                      styles.episodeText,
                      {
                        color:
                          item.chapterId === currentEpisode.chapterId
                            ? "#FFFFFF"
                            : colors.text,
                      },
                    ]}
                  >
                    {item.chapterName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* QUALITY & SERVER MODAL */}
      <Modal
        visible={showQualityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <View style={styles.qualityModalOverlay}>
          <TouchableOpacity
            style={styles.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowQualityModal(false)}
          />
          <View style={[styles.qualityModal, { backgroundColor: colors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Pilih Kualitas & Server
              </Text>
              <TouchableOpacity
                onPress={() => setShowQualityModal(false)}
                style={styles.modalCloseIcon}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {episodeDetail?.serverqualities?.map((qualityGroup) => (
              <View key={qualityGroup.title} style={{ marginBottom: 16 }}>
                <Text
                  style={[styles.qualityGroupTitle, { color: colors.text }]}
                >
                  {qualityGroup.title}
                </Text>
                {qualityGroup.serverList.map((server) => (
                  <TouchableOpacity
                    key={server.serverId}
                    style={[
                      styles.qualityItem,
                      {
                        backgroundColor:
                          selectedServer?.serverId === server.serverId
                            ? colors.accent
                            : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      changeQualityAndServer(qualityGroup.title, server);
                      setShowQualityModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.qualityText,
                        {
                          color:
                            selectedServer?.serverId === server.serverId
                              ? "#FFFFFF"
                              : colors.text,
                        },
                      ]}
                    >
                      {server.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VideoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 5,
  },
  bufferingText: {
    color: "#ccc",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  retryButton: {
    marginTop: 15,
    backgroundColor: "#FF4757",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  fullScreenTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  episodeTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "left",
    flex: 1,
  },
  closePageButton: {
    padding: 8,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
  },
  centerPlayButton: {
    position: "absolute",
    top: height / 2 - 60,
    alignSelf: "center",
    zIndex: 10,
  },
  playButtonCircle: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 60,
    padding: 20,
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 20,
  },
  timeText: {
    color: "white",
    fontSize: 14,
    minWidth: 45,
    textAlign: "center",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  progressBarWrapper: {
    flex: 1,
    height: 40,
    marginHorizontal: 15,
    justifyContent: "center",
  },
  progressBarTouchable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  progressBarBackground: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    position: "relative",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressThumb: {
    position: "absolute",
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  bottomControls: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 15,
  },
  controlButton: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  controlButtonText: {
    color: "white",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "500",
  },
  rightButtons: {
    position: "absolute",
    right: 16,
    bottom: 180,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  iconButton: {
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  iconText: {
    color: "white",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    height: "60%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalCloseIcon: {
    padding: 4,
  },
  episodeItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  episodeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  qualityModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  absoluteFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  qualityModal: {
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    maxHeight: "80%",
    elevation: 10,
  },
  qualityGroupTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  qualityItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
