import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  BackHandler,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { Episode } from "../types/episode";
import { EpisodeDetail, StreamingServer } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { useKeepAwake } from "expo-keep-awake";
import { useTheme } from "../context/ThemeContext";
import { getEpisodeDetail, getServerStreamingUrl } from "../services/api";

const VideoScreenWebView = ({ route }: { route: RouteProp<any, any> }) => {
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
  const [selectedQuality, setSelectedQuality] = useState<string>("480p");
  const [selectedServer, setSelectedServer] = useState<StreamingServer | null>(
    null,
  );
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [currentEpisode, setCurrentEpisode] = useState<Episode>(episode);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showTapToPlay, setShowTapToPlay] = useState(false);
  const { colors } = useTheme();

  const webViewRef = useRef<WebView>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch episode detail when episode changes
  useEffect(() => {
    fetchEpisodeDetail();
  }, [currentEpisode.chapterId]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        navigation.goBack();
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  const fetchEpisodeDetail = async () => {
    try {
      setLoadingVideo(true);
      console.log("[VIDEO] Fetching episode detail:", currentEpisode.chapterId);

      const detail = await getEpisodeDetail(currentEpisode.chapterId);
      console.log("[VIDEO] Episode detail received");
      console.log("[VIDEO] Default URL:", detail.defaultStreamingUrl);

      setEpisodeDetail(detail);

      // Use default streaming URL if available
      if (detail.defaultStreamingUrl) {
        console.log("[VIDEO] Using default streaming URL");
        setCurrentVideoUrl(detail.defaultStreamingUrl);
        setLoadingVideo(false);
      } else {
        console.log("[VIDEO] No default URL, checking servers...");

        // Find first available server with non-empty serverList
        let foundServer = false;
        if (detail.serverqualities && detail.serverqualities.length > 0) {
          for (const quality of detail.serverqualities) {
            if (quality.serverList && quality.serverList.length > 0) {
              const firstServer = quality.serverList[0];
              console.log(
                "[VIDEO] Using server:",
                firstServer.title,
                "from",
                quality.title,
              );
              setSelectedQuality(quality.title);
              setSelectedServer(firstServer);
              await loadServerUrl(firstServer.serverId);
              foundServer = true;
              break;
            }
          }
        }

        if (!foundServer) {
          console.error("[VIDEO ERROR] No servers available");
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
      console.log("[VIDEO] Server data received");

      if (serverData && serverData.streamingUrl) {
        console.log("[VIDEO] Setting streaming URL");
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

  const resetAutoHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  const playNextEpisode = () => {
    const currentIndex = episodes.findIndex(
      (ep) => ep.chapterId === currentEpisode.chapterId,
    );

    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentIndex + 1];
      setCurrentEpisode(nextEpisode);
      resetAutoHideTimer();
    }
  };

  const playPreviousEpisode = () => {
    const currentIndex = episodes.findIndex(
      (ep) => ep.chapterId === currentEpisode.chapterId,
    );

    if (currentIndex > 0) {
      const prevEpisode = episodes[currentIndex - 1];
      setCurrentEpisode(prevEpisode);
      resetAutoHideTimer();
    }
  };

  const handleScreenTap = () => {
    if (!showControls) {
      setShowControls(true);
      resetAutoHideTimer();
    } else {
      setShowControls(false);
    }
  };

  useEffect(() => {
    resetAutoHideTimer();

    if (Platform.OS === "web") {
      const handleMouseMove = () => {
        resetAutoHideTimer();
      };
      // @ts-ignore
      window.addEventListener("mousemove", handleMouseMove);
      return () => {
        // @ts-ignore
        window.removeEventListener("mousemove", handleMouseMove);
        if (hideControlsTimeout.current) {
          clearTimeout(hideControlsTimeout.current);
        }
      };
    }

    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Inject JavaScript to make video fullscreen and handle controls
  const injectedJavaScript = `
    (function() {
      // Hide page elements except video
      const style = document.createElement('style');
      style.textContent = \`
        body { margin: 0; padding: 0; background: #000; overflow: hidden; }
        video { width: 100vw !important; height: 100vh !important; object-fit: contain; }
        iframe { width: 100vw !important; height: 100vh !important; border: none; }
      \`;
      document.head.appendChild(style);
      
      // Function to find and play video
      function findAndPlayVideo() {
        const video = document.querySelector('video');
        if (video) {
          console.log('Video found, attempting to play...');
          video.play().then(() => {
            console.log('Video playing successfully');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPlaying' }));
          }).catch(e => {
            console.log('Autoplay prevented, user interaction required');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'autoplayBlocked' }));
          });
        } else {
          console.log('Video not found, retrying...');
          setTimeout(findAndPlayVideo, 500);
        }
      }
      
      // Try to play video after page loads
      if (document.readyState === 'complete') {
        findAndPlayVideo();
      } else {
        window.addEventListener('load', findAndPlayVideo);
      }
      
      // Also try after a delay
      setTimeout(findAndPlayVideo, 1000);
      setTimeout(findAndPlayVideo, 2000);
      
      // Add click listener to play video on any tap
      document.addEventListener('click', function() {
        const video = document.querySelector('video');
        if (video && video.paused) {
          video.play();
        }
      });
      
      true;
    })();
  `;

  const renderControls = () => {
    if (!showControls) return null;
    return (
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

        {/* RIGHT SIDE BUTTONS */}
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

          {/* PREV EPISODE */}
          {episodes.findIndex(
            (ep) => ep.chapterId === currentEpisode.chapterId,
          ) > 0 && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={playPreviousEpisode}
            >
              <Ionicons name="play-skip-back" size={28} color="white" />
              <Text style={styles.iconText}>Prev</Text>
            </TouchableOpacity>
          )}

          {/* NEXT EPISODE */}
          {episodes.findIndex(
            (ep) => ep.chapterId === currentEpisode.chapterId,
          ) <
            episodes.length - 1 && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={playNextEpisode}
            >
              <Ionicons name="play-skip-forward" size={28} color="white" />
              <Text style={styles.iconText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };


  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* WEBVIEW FOR VIDEO */}
      {currentVideoUrl ? (
        Platform.OS === "web" ? (
          <iframe
            src={currentVideoUrl}
            style={{ width: "100%", height: "100%", position: "absolute", border: "none", backgroundColor: "black", zIndex: 1 }}
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            onLoad={() => setLoadingVideo(false)}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: currentVideoUrl }}
            style={styles.webview}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            injectedJavaScript={injectedJavaScript}
            onLoadStart={() => setLoadingVideo(true)}
            onLoadEnd={() => {
              setLoadingVideo(false);
              // Show tap to play hint after 2 seconds if video hasn't started
              setTimeout(() => setShowTapToPlay(true), 2000);
            }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === "videoPlaying") {
                  setShowTapToPlay(false);
                  console.log("[WEBVIEW] Video is playing");
                } else if (data.type === "autoplayBlocked") {
                  setShowTapToPlay(true);
                  console.log("[WEBVIEW] Autoplay blocked, showing tap hint");
                }
              } catch (e) {
                // Ignore parse errors
              }
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error("[WEBVIEW ERROR]", nativeEvent);
              setLoadingVideo(false);
            }}
          />
        )
      ) : null}

      {/* LOADING INDICATOR */}
      {loadingVideo && (
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.bufferingText}>Memuat Video...</Text>
        </View>
      )}

      {/* ERROR INDICATOR */}
      {!loadingVideo && !currentVideoUrl && (
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
              { textAlign: "center", marginHorizontal: 20 },
            ]}
          >
            Gagal Memuat Video. Coba pilih server lain.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setShowQualityModal(true)}
          >
            <Text style={styles.retryButtonText}>Pilih Server</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TAP TO PLAY HINT */}
      {showTapToPlay && !loadingVideo && currentVideoUrl && (
        <TouchableOpacity
          style={styles.tapToPlayOverlay}
          activeOpacity={0.9}
          onPress={() => {
            // Inject JavaScript to play video
            webViewRef.current?.injectJavaScript(`
              (function() {
                const video = document.querySelector('video');
                if (video) {
                  video.play();
                }
              })();
            `);
            setShowTapToPlay(false);
          }}
        >
          <View style={styles.tapToPlayContent}>
            <Ionicons name="play-circle" size={80} color="#FF4757" />
            <Text style={styles.tapToPlayText}>Tap untuk Memutar Video</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* CONTROLS OVERLAY */}
      {Platform.OS === "web" ? (
        <View
          style={[styles.controlsOverlay, { zIndex: 10 }]}
          pointerEvents="box-none"
        >
          {renderControls()}
        </View>
      ) : (
        <TouchableOpacity
          style={styles.controlsOverlay}
          activeOpacity={1}
          onPress={handleScreenTap}
        >
          {renderControls()}
        </TouchableOpacity>
      )}

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
                {qualityGroup.serverList &&
                qualityGroup.serverList.length > 0 ? (
                  qualityGroup.serverList.map((server) => (
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
                  ))
                ) : (
                  <Text
                    style={[
                      styles.noServerText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Tidak ada server tersedia
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VideoScreenWebView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  webview: {
    flex: 1,
    backgroundColor: "black",
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 5,
  },
  bufferingText: {
    color: "#FFF",
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
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
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
  rightButtons: {
    position: "absolute",
    right: 16,
    bottom: 100,
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
  noServerText: {
    fontSize: 12,
    fontStyle: "italic",
    marginLeft: 16,
  },
  tapToPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
  },
  tapToPlayContent: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 20,
  },
  tapToPlayText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 15,
  },
});
