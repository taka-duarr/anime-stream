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
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { useKeepAwake } from "expo-keep-awake";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { useTheme } from "../context/ThemeContext";
import { API_BASE_URL } from "../services/api";

interface SubtitleCue {
  startTime: number;
  endTime: number;
  text: string;
}

const timeToSeconds = (timeStr: string) => {
  const parts = timeStr.trim().split(":");
  let hh = 0, mm = 0, ss = 0, ms = 0;
  
  if (parts.length === 3) {
    hh = parseInt(parts[0], 10);
    mm = parseInt(parts[1], 10);
    // Handle both '.' (VTT) and ',' (SRT) for milliseconds
    const secsParts = parts[2].split(/[.,]/);
    ss = parseInt(secsParts[0], 10);
    ms = parseInt(secsParts[1], 10) || 0;
  } else if (parts.length === 2) {
    mm = parseInt(parts[0], 10);
    const secsParts = parts[1].split(/[.,]/);
    ss = parseInt(secsParts[0], 10);
    ms = parseInt(secsParts[1], 10) || 0;
  }

  return hh * 3600 + mm * 60 + ss + ms / 1000;
};

const parseVTT = (vttText: string): SubtitleCue[] => {
  const cues: SubtitleCue[] = [];
  const lines = vttText.replace(/\r/g, "").split("\n");
  let currentCue: Partial<SubtitleCue> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes("-->")) {
      const parts = line.split("-->");
      currentCue = {
        startTime: timeToSeconds(parts[0]),
        endTime: timeToSeconds(parts[1]),
        text: "",
      };
    } else if (currentCue && line !== "" && !line.match(/^\d+$/)) {
      currentCue.text = currentCue.text ? currentCue.text + "\n" + line : line;
    } else if (line === "" && currentCue) {
      if (currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
        cues.push(currentCue as SubtitleCue);
      }
      currentCue = null;
    }
  }
  if (currentCue && currentCue.startTime !== undefined) {
    cues.push(currentCue as SubtitleCue);
  }
  return cues;
};

const { width, height } = Dimensions.get("window");

const VideoScreen2 = ({ route }: { route: RouteProp<any, any> }) => {
  useKeepAwake();
  const navigation = useNavigation();

  const { episode, episodes } = route.params as {
    episode: Episode;
    episodes: Episode[];
  };
const [selectedQuality, setSelectedQuality] = useState<number>(720);
const [showQualityModal, setShowQualityModal] = useState(false);

  const [currentEpisode, setCurrentEpisode] = useState<Episode>(episode);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true); 
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string>("");
  const { colors } = useTheme();

  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<View>(null);
  const lastTapRef = useRef<number>(0);

  // MISTERI TERPECAHKAN (Lagi): Sertifikat SSL awscdn.netshort.com ditolak mentah-mentah oleh Engine Native Android.
  // Karena kita tak bisa pakai HTTP (karena dilarang AWS), satu-satunya jalan menembusnya adalah kita MENGGUNAKAN PROXY Server 1.
  // Kita menumpang endpoint Server 1 yang memiliki SSL tepercaya (api.sansekai.my.id) untuk menjadi jembatan!
  const rawVideoUrl = ((currentEpisode as any).playVoucher || "").replace(/^http:\/\//i, "https://");
  const decryptedVideoUrl = `${API_BASE_URL}/dramabox/decrypt-stream?url=${encodeURIComponent(rawVideoUrl)}`;

  useEffect(() => {
    console.log("[DEBUG] Memuat Video Server 2 (Netshort):", decryptedVideoUrl);
  }, [decryptedVideoUrl]);

  // Header spoofing untuk menghindari blokir CDN di production APK
  const playerHeaders = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
  };

  // Inisialisasi Player Video Modern tanpa Rerender Ulang Objek
  const player = useVideoPlayer({ 
    uri: decryptedVideoUrl, 
    headers: playerHeaders 
  }, (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
    player.play();
  });

  // Saat kualitas berubah atau episode beda, gunakan replace() agar Native Object tidak hancur
  useEffect(() => {
    const backupPos = player.currentTime; // Simpan durasi terakhir sebelum ditarik
    player.replaceAsync({ 
      uri: decryptedVideoUrl, 
      headers: playerHeaders 
    }); // Secara ajaib load Source tanpa membunuh Player secara asinkron
    
    // Geser instan kembali ke menit terakhir secara aman
    if (backupPos > 0) {
       player.currentTime = backupPos;
    }
    
    // Paksa nyalakan ulang suara yang kerap direset oleh modul Native pasca Replace!
    player.muted = false;
    player.volume = 1.0;

    player.play();

    // Reset subtitles when episode changes
    setCues([]);
    setActiveSubtitle("");

    // Fetch subtitles if available (Server 2: subtitleList)
    const subList = (currentEpisode as any).subtitleList;
    let subUrl = subList?.[0]?.url;
    
    if (subUrl) {
      // Sama seperti Video, Subtitle juga akan Network Request Failed jika tidak di-proxy oleh server tepercaya.
      subUrl = subUrl.replace(/^http:\/\//i, "https://");
      const safeRawSubUrl = encodeURI(subUrl.replace(/比/g, "%E6%AF%94"));
      const proxiedSubUrl = `${API_BASE_URL}/dramabox/decrypt-stream?url=${encodeURIComponent(safeRawSubUrl)}`;
      
      console.log("[DEBUG] Fetching Subtitle Server 2 via Proxy:", proxiedSubUrl);
      
      fetch(proxiedSubUrl)
        .then(res => {
          if (!res.ok) throw new Error("HTTP Status " + res.status);
          return res.text();
        })
        .then(text => {
          const parsed = parseVTT(text);
          setCues(parsed);
        })
        .catch(err => console.error("Error fetching subtitles:", err));
    }
  }, [decryptedVideoUrl]);

  // Event Listener Real-Time tanpa Lag/Buffering berat (expo terbaru)
  const { isPlaying: playerIsPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status: playerStatus } = useEvent(player, 'statusChange', { status: player.status });
  
  // Karena hook event native tidak me-Rerender State UI setiap detik (hanya trigger under-the-hood expo)
  // Kita hubungkan ke State lokal dengan interval saat video Play
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        const currentTime = player.currentTime;
        setPositionMillis(currentTime);
        setDurationMillis(player.duration || 0);

        // Update active subtitle
        if (cues.length > 0) {
          const cue = cues.find(c => currentTime >= c.startTime && currentTime <= c.endTime);
          setActiveSubtitle(cue ? cue.text : "");
        }
      }, 500); // UI Rerender setiap 500ms agar bar maju mulus
    }
    return () => clearInterval(interval);
  }, [isPlaying, player, cues]);
  
  // Hitung persentase progress
  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;
  const currentTime = formatTime(positionMillis * 1000); // fungsi kita butuh hitungan ms
  const totalTime = formatTime(durationMillis * 1000);

  // Status sinkron PlayPause ke state lokal
  useEffect(() => {
    setIsPlaying(playerIsPlaying);
  }, [playerIsPlaying]);

  // Efek ganti episode saat duration mentok selesai (End of video)
  useEffect(() => {
    if (durationMillis > 0 && positionMillis >= durationMillis - 0.5) { // toleransi milisekon kecil
        playNextEpisode();
    }
  }, [positionMillis, durationMillis]);

  // Format waktu
  function formatTime(millis: number) {
    if (!millis || millis < 0) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

  // Fungsi untuk reset timer auto-hide
  const resetAutoHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 4000); // 4 detik 
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    resetAutoHideTimer();
  };

  // Web Only: Global Keyboard Shortcuts (Space, ArrowLeft, ArrowRight)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const keyHandler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const dest = player.currentTime + 10;
        player.currentTime = (durationMillis > 0 && dest > durationMillis) ? durationMillis : dest;
        resetAutoHideTimer();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        player.currentTime = Math.max(0, player.currentTime - 10);
        resetAutoHideTimer();
      }
    };

    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
    };
  }, [player, durationMillis]);

  // Handler untuk tap di progress bar
  const handleProgressBarTap = (event: any) => {
    if (progressBarRef.current && durationMillis > 0) {
      progressBarRef.current.measure(
        (x, y, barWidth, barHeight, pageX, pageY) => {
          const tapX = event.nativeEvent.pageX - pageX;
          const progressPercentage = Math.max(0, Math.min(1, tapX / barWidth));
          const seekTime = progressPercentage * durationMillis; // hitungan satuan second (s)

          // Seek video instan dari modul modern
          player.currentTime = seekTime;
          resetAutoHideTimer();
        }
      );
    }
  };

  const playNextEpisode = () => {
    const currentIndex = episodes.findIndex(
      (ep) => ep.chapterId === currentEpisode.chapterId
    );

    // Kalau masih ada episode berikutnya
    if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
      const nextEpisode = episodes[currentIndex + 1];

      setCurrentEpisode(nextEpisode);

      // Reset auto-play next episode (player will reactive immediately due to mount effect)
      setPositionMillis(0);
      resetAutoHideTimer();
    } else {
      // Episode terakhir
      player.pause();
      setShowControls(true);
    }
  };

  const playPreviousEpisode = () => {
    const currentIndex = episodes.findIndex(
      (ep) => ep.chapterId === currentEpisode.chapterId
    );

    // Kalau ada episode sebelumnya
    if (currentIndex > 0) {
      const prevEpisode = episodes[currentIndex - 1];
      setCurrentEpisode(prevEpisode);
      setPositionMillis(0);
      resetAutoHideTimer();
    }
  };

  // TikTok-style Swipe Gesture (Up = Next, Down = Prev)
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Hanya respons jika swipe vertikal cukup kuat (mencegah klik biasa tertangkap)
        return Math.abs(gestureState.dy) > 30 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 2;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy < -60) {
          // Swipe Naik -> Episode Selanjutnya
          playNextEpisode();
        } else if (gestureState.dy > 60) {
          // Swipe Turun -> Episode Sebelumnya
          playPreviousEpisode();
        }
      },
    }),
    [currentEpisode] // Rekreasi PanResponder tiap episode ganti supaya closure state tidak basi
  );

  // Handler untuk tap di layar (Single Tap & Double Tap Seek)
  const handleScreenTap = (event: any) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const tapX = event.nativeEvent.pageX;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // DOUBLE TAP: Cek sisi mana layar ditekan
      if (tapX < width / 2) {
        // Sisi Kiri -> Mundur 10 detik
        player.currentTime = Math.max(0, player.currentTime - 10);
      } else {
        // Sisi Kanan -> Maju 10 detik
        const dest = player.currentTime + 10;
        player.currentTime = (durationMillis > 0 && dest > durationMillis) ? durationMillis : dest;
      }
      lastTapRef.current = 0; // reset hitungan
      setShowControls(true);
      resetAutoHideTimer();
    } else {
      // SINGLE TAP
      lastTapRef.current = now;
      if (!showControls) {
        setShowControls(true);
        resetAutoHideTimer();
      } else {
        setShowControls(false);
      }
    }
  };

  // Cleanup timeout saat komponen unmount
  useEffect(() => {
    // Set timeout awal saat komponen mount
    resetAutoHideTimer();

    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Auto-hide ketika video sedang diputar
  useEffect(() => {
    if (isPlaying && showControls) {
      resetAutoHideTimer();
    }
  }, [isPlaying, showControls]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* NATIVE VIDEO KINERJA TINGGI DARI EXPO-VIDEO */}
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={false}
        allowsFullscreen={false} // Atur true jika Anda butuh modal fullscreen native (fitur OS)
        allowsPictureInPicture={false}
        contentFit="contain"
      />

      {/* INDIKATOR LOADING / BUFFERING */}
      {playerStatus === 'loading' && (
         <View style={styles.centerOverlay}>
           <ActivityIndicator size="large" color="#FF4757" />
           <Text style={styles.bufferingText}>Memuat Video...</Text>
         </View>
      )}

      {/* CUSTOM SUBTITLE OVERLAY */}
      {activeSubtitle !== "" && (
        <View style={styles.subtitleContainer} pointerEvents="none">
          <Text style={styles.subtitleText}>{activeSubtitle}</Text>
        </View>
      )}

      {/* INDIKATOR ERROR & RETRY (TOKEN EXPIRED/URL BLOCKED) */}
      {playerStatus === 'error' && (
         <View style={styles.centerOverlay}>
           <Ionicons name="warning" size={40} color="#FF4757" style={{ marginBottom: 10 }} />
           <Text style={[styles.bufferingText, { color: '#FFF', textAlign: 'center', marginHorizontal: 20 }]}>
             Gagal Memutar Video. Server menolak koneksi atau sesi habis.
           </Text>
           <TouchableOpacity
             style={styles.retryButton}
            onPress={async () => {
                const retryDecryptedUrl = ((currentEpisode as any).playVoucher || "").replace(/^http:\/\//i, "https://");
                await player.replaceAsync({ 
                   uri: retryDecryptedUrl, 
                   headers: playerHeaders 
                });
                player.play();
             }}
           >
             <Text style={styles.retryButtonText}>Coba Ulang Server</Text>
           </TouchableOpacity>
         </View>
      )}

      {/* TIKTOK SWIPE GESTURE WRAPPER */}
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 10 }]} {...panResponder.panHandlers}>
        {/* FULL SCREEN TOUCH AREA - untuk mendeteksi tap */}
        <TouchableOpacity
          style={styles.fullScreenTouchable}
        activeOpacity={1}
        onPress={handleScreenTap}
        delayPressIn={0}
      >
        {/* OVERLAY KONTROL - hanya muncul jika showControls true */}
        {showControls && (
          <>
            {/* TOP CONTROLS - Judul Episode */}
            <View style={styles.topControls}>
              {/* TITLE */}
              <Text style={styles.episodeTitle} numberOfLines={1}>
                {currentEpisode.chapterName}
              </Text>

              {/* CLOSE BUTTON (X) */}
              <TouchableOpacity
                style={styles.closePageButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {/* PLAY/PAUSE BUTTON DI TENGAH - hanya muncul saat pause */}
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

            {/* PROGRESS BAR DAN WAKTU DI BAWAH */}
            <View style={styles.progressContainer}>
              {/* Waktu saat ini */}
              <Text style={styles.timeText}>{currentTime}</Text>

              {/* Progress Bar Container */}
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
                        { width: `${progress * 100}%`, backgroundColor: colors.accent },
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

              {/* Total waktu */}
              <Text style={styles.timeText}>{totalTime}</Text>
            </View>

            {/* BOTTOM CONTROL BUTTONS */}
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
            {/* Sesuai instruksi: Server 2 tidak butuh ganti kualitas karena playVoucher biasanya single link */}
            {/* <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setShowQualityModal(true);
                resetAutoHideTimer();
              }}
            >
              <Ionicons name="settings" size={28} color="white" />
              <Text style={styles.iconText}>{selectedQuality}p</Text>
            </TouchableOpacity> */}

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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Daftar Episode</Text>
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
                    { backgroundColor: item.chapterId === currentEpisode.chapterId ? colors.accent : colors.card }
                  ]}
                  onPress={() => {
                    setCurrentEpisode(item);
                    setShowEpisodeList(false);
                    resetAutoHideTimer();
                  }}
                >
                  <Text style={[styles.episodeText, { color: item.chapterId === currentEpisode.chapterId ? "#FFFFFF" : colors.text }]}>{item.chapterName}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showQualityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <View style={styles.qualityModalOverlay}>
          <TouchableOpacity style={styles.absoluteFill} activeOpacity={1} onPress={() => setShowQualityModal(false)} />
          <View style={[styles.qualityModal, { backgroundColor: colors.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Pilih Resolusi</Text>
              <TouchableOpacity onPress={() => setShowQualityModal(false)} style={styles.modalCloseIcon}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {currentEpisode.cdnList[0].videoPathList.map((item) => (
              <TouchableOpacity
                key={item.quality}
                style={[
                  styles.qualityItem,
                  { backgroundColor: item.quality === selectedQuality ? colors.accent : colors.card, borderColor: colors.border }
                ]}
                  onPress={() => {
                  setSelectedQuality(item.quality);
                  setShowQualityModal(false);
                }}
              >
                <Text style={[styles.qualityText, { color: item.quality === selectedQuality ? "#FFFFFF" : colors.text }]}>{item.quality}p</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default VideoScreen2;

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
  subtitleContainer: {
    position: "absolute",
    bottom: 160,
    left: 20,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 8,
  },
  subtitleText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
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

  /* TOP CONTROLS */
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50, // aman untuk notch
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

  /* CENTER PLAY BUTTON */
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

  /* PROGRESS BAR - FIXED */
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
    fontVariant: ["tabular-nums"], // Bikin angka-angka tidak bergeser tebal/tipisnya
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

  /* BOTTOM CONTROLS */
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

  /* RIGHT BUTTONS */
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

  /* MODAL */
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
  closeModalButton: {
    alignSelf: "center",
    marginTop: 15,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
    borderRadius: 12,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
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
    width: "75%",
    maxWidth: 320,
    elevation: 10,
  },
  qualityItem: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  qualityText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
