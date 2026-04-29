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
import Slider from "@react-native-community/slider";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { Episode } from "../types/episode";
import { EpisodeDetail, StreamingServer } from "../types/drama";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { useKeepAwake } from "expo-keep-awake";
import * as ScreenOrientation from "expo-screen-orientation";
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
  const [isPlaying, setIsPlaying] = useState(true); // Track video playing state
  const [currentTime, setCurrentTime] = useState(0); // Current video time in seconds
  const [duration, setDuration] = useState(0); // Total video duration in seconds
  const [isFullscreen, setIsFullscreen] = useState(false); // Start in portrait mode
  const { colors } = useTheme();

  const webViewRef = useRef<WebView>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize orientation on mount and cleanup on unmount
  useEffect(() => {
    // Set initial orientation to portrait
    const initOrientation = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
        setIsFullscreen(false);
      } catch (error) {
        console.error("[SCREEN] Failed to set initial orientation:", error);
      }
    };

    initOrientation();

    // Listen to orientation changes
    const subscription = ScreenOrientation.addOrientationChangeListener(
      (event) => {
        const orientation = event.orientationInfo.orientation;
        console.log("[SCREEN] Orientation changed:", orientation);

        // Update fullscreen state based on orientation
        if (
          orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
          orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
        ) {
          setIsFullscreen(true);
        } else {
          setIsFullscreen(false);
        }
      },
    );

    // Cleanup: unlock orientation and reset to portrait when component unmounts
    return () => {
      subscription.remove();
      ScreenOrientation.unlockAsync().catch((error) =>
        console.error("[SCREEN] Failed to unlock orientation:", error),
      );
      // Reset to portrait when leaving video screen
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch((error) =>
        console.error("[SCREEN] Failed to reset to portrait:", error),
      );
    };
  }, []);

  // Fetch episode detail when episode changes
  useEffect(() => {
    fetchEpisodeDetail();
  }, [currentEpisode.chapterId]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      async () => {
        // Reset orientation to portrait before going back
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP,
          );
        } catch (error) {
          console.error("[SCREEN] Failed to reset orientation on back:", error);
        }
        navigation.goBack();
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  // Start progress update interval when video is playing
  useEffect(() => {
    if (isPlaying && currentVideoUrl) {
      // Request video progress every 500ms
      progressUpdateInterval.current = setInterval(() => {
        webViewRef.current?.injectJavaScript(`
          (function() {
            const video = document.querySelector('video');
            if (video) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'videoProgress',
                currentTime: video.currentTime,
                duration: video.duration
              }));
            } else {
              // Try iframe
              const iframes = document.querySelectorAll('iframe');
              iframes.forEach((iframe) => {
                try {
                  const iframeVideo = iframe.contentWindow.document.querySelector('video');
                  if (iframeVideo) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'videoProgress',
                      currentTime: iframeVideo.currentTime,
                      duration: iframeVideo.duration
                    }));
                  }
                } catch (e) {
                  // Cross-origin, ignore
                }
              });
            }
          })();
        `);
      }, 500);
    } else {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    }

    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    };
  }, [isPlaying, currentVideoUrl]);

  const fetchEpisodeDetail = async () => {
    try {
      setLoadingVideo(true);
      console.log("[VIDEO] Fetching episode detail:", currentEpisode.chapterId);

      const detail = await getEpisodeDetail(currentEpisode.chapterId);
      console.log("[VIDEO] Episode detail received");
      console.log(
        "[VIDEO] serverqualities count:",
        detail.serverqualities?.length || 0,
      );
      console.log("[VIDEO] Default URL:", detail.defaultStreamingUrl);

      // Log all available servers for debugging
      if (detail.serverqualities && detail.serverqualities.length > 0) {
        console.log("[VIDEO] Available servers:");
        detail.serverqualities.forEach((quality) => {
          if (quality.serverList && quality.serverList.length > 0) {
            quality.serverList.forEach((server) => {
              console.log(
                `  - ${quality.title}: ${server.title} (${server.serverId})`,
              );
            });
          }
        });
      }

      setEpisodeDetail(detail);

      // Check if default URL is from problematic servers
      const isProblematicServer =
        detail.defaultStreamingUrl &&
        (detail.defaultStreamingUrl.includes("/ondesu/v5/") ||
          detail.defaultStreamingUrl.includes("/ondesu3/v5/") ||
          detail.defaultStreamingUrl.includes("/updesu/v5/") ||
          detail.defaultStreamingUrl.includes("/otakuplay/v2/"));

      // PRIORITY 1: If default URL is from problematic server, try to find alternative first
      if (
        isProblematicServer &&
        detail.serverqualities &&
        detail.serverqualities.length > 0
      ) {
        console.log(
          "[VIDEO] Default URL is from problematic server, trying alternatives...",
        );

        // Try to find otakuwatch server (most reliable)
        for (const quality of detail.serverqualities) {
          if (quality.serverList && quality.serverList.length > 0) {
            const otakuwatchServer = quality.serverList.find((s) =>
              s.title.toLowerCase().includes("otakuwatch"),
            );

            if (otakuwatchServer) {
              console.log(
                "[VIDEO] Found otakuwatch server:",
                otakuwatchServer.title,
              );
              setSelectedQuality(quality.title);
              setSelectedServer(otakuwatchServer);
              await loadServerUrl(otakuwatchServer.serverId);
              return;
            }
          }
        }

        // If no otakuwatch, try any other server (avoid problematic servers)
        for (const quality of detail.serverqualities) {
          if (quality.serverList && quality.serverList.length > 0) {
            // Filter out problematic servers
            const goodServers = quality.serverList.filter((s) => {
              const serverId = s.serverId.toLowerCase();
              const title = s.title.toLowerCase();
              return (
                !serverId.includes("ondesu") &&
                !serverId.includes("updesu") &&
                !serverId.includes("otakuplay/v2") &&
                !title.includes("ondesu") &&
                !title.includes("updesu") &&
                !title.includes("otakuplay v2")
              );
            });

            if (goodServers.length > 0) {
              const firstServer = goodServers[0];
              console.log(
                "[VIDEO] Using alternative server:",
                firstServer.title,
              );
              setSelectedQuality(quality.title);
              setSelectedServer(firstServer);
              await loadServerUrl(firstServer.serverId);
              return;
            }

            // If all servers are problematic, use first one as last resort
            const firstServer = quality.serverList[0];
            console.log(
              "[VIDEO] Using fallback server (may be problematic):",
              firstServer.title,
            );
            setSelectedQuality(quality.title);
            setSelectedServer(firstServer);
            await loadServerUrl(firstServer.serverId);
            return;
          }
        }
      }

      // PRIORITY 2: Use defaultStreamingUrl if available and not problematic
      if (detail.defaultStreamingUrl) {
        console.log("[VIDEO] Using default streaming URL");
        setSelectedQuality("Default");
        setCurrentVideoUrl(detail.defaultStreamingUrl);
        setLoadingVideo(false);

        // Show warning if it's a problematic server
        if (isProblematicServer) {
          console.warn(
            "[VIDEO] Using problematic server - video may not play. Try selecting another server from quality menu.",
          );
        }
        return;
      }

      // PRIORITY 3: Try to find any available server (prefer non-problematic)
      let foundServer = false;

      if (detail.serverqualities && detail.serverqualities.length > 0) {
        console.log("[VIDEO] Checking serverqualities...");

        // Helper function to check if server is problematic
        const isServerProblematic = (server: StreamingServer) => {
          const serverId = server.serverId.toLowerCase();
          const title = server.title.toLowerCase();
          return (
            serverId.includes("ondesu") ||
            serverId.includes("updesu") ||
            serverId.includes("otakuplay/v2") ||
            title.includes("ondesu") ||
            title.includes("updesu") ||
            title.includes("otakuplay v2")
          );
        };

        // Try to find 480p quality first with non-problematic server
        const preferred480p = detail.serverqualities.find(
          (q) => q.title === "480p" && q.serverList && q.serverList.length > 0,
        );

        if (preferred480p && preferred480p.serverList.length > 0) {
          // Try to find non-problematic server first
          const goodServer = preferred480p.serverList.find(
            (s) => !isServerProblematic(s),
          );
          const firstServer = goodServer || preferred480p.serverList[0];

          console.log(
            "[VIDEO] Using 480p server:",
            firstServer.title,
            firstServer.serverId,
            goodServer ? "(good)" : "(may be problematic)",
          );
          setSelectedQuality("480p");
          setSelectedServer(firstServer);
          await loadServerUrl(firstServer.serverId);
          foundServer = true;
        } else {
          console.log("[VIDEO] No 480p, trying other qualities...");
          // If no 480p, find first available quality with servers
          for (const quality of detail.serverqualities) {
            console.log(
              "[VIDEO] Quality:",
              quality.title,
              "has",
              quality.serverList?.length || 0,
              "servers",
            );
            if (quality.serverList && quality.serverList.length > 0) {
              // Try to find non-problematic server first
              const goodServer = quality.serverList.find(
                (s) => !isServerProblematic(s),
              );
              const firstServer = goodServer || quality.serverList[0];

              console.log(
                "[VIDEO] Using",
                quality.title,
                "server:",
                firstServer.title,
                firstServer.serverId,
                goodServer ? "(good)" : "(may be problematic)",
              );
              setSelectedQuality(quality.title);
              setSelectedServer(firstServer);
              await loadServerUrl(firstServer.serverId);
              foundServer = true;
              break;
            }
          }
        }
      }

      if (!foundServer) {
        console.error("[VIDEO ERROR] No streaming URL available");
        setLoadingVideo(false);
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

      // API returns "url" field, not "streamingUrl"
      const streamingUrl = serverData.streamingUrl || serverData.url;

      if (streamingUrl) {
        console.log("[VIDEO] Setting streaming URL:", streamingUrl);
        setCurrentVideoUrl(streamingUrl);
      } else {
        console.error("[VIDEO ERROR] No streaming URL in server data");
        console.error("[VIDEO ERROR] Server data:", JSON.stringify(serverData));
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

  // Toggle play/pause
  const togglePlayPause = () => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        console.log('[CONTROL] Toggle play/pause');
        
        // Try to find video in parent page
        const video = document.querySelector('video');
        if (video) {
          if (video.paused) {
            video.play().then(() => {
              console.log('[CONTROL] Video playing');
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPlaying' }));
            }).catch(e => console.log('[CONTROL] Play failed:', e));
          } else {
            video.pause();
            console.log('[CONTROL] Video paused');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPaused' }));
          }
          return;
        }
        
        // Try to find video in iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe, i) => {
          try {
            const iframeVideo = iframe.contentWindow.document.querySelector('video');
            if (iframeVideo) {
              if (iframeVideo.paused) {
                iframeVideo.play();
                console.log('[CONTROL] Iframe video', i, 'playing');
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPlaying' }));
              } else {
                iframeVideo.pause();
                console.log('[CONTROL] Iframe video', i, 'paused');
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPaused' }));
              }
            }
          } catch (e) {
            console.log('[CONTROL] Cannot access iframe', i, ':', e.message);
          }
        });
        
        // Fallback: try to click play/pause buttons
        const pauseButtons = document.querySelectorAll('button[aria-label*="pause" i], button[title*="pause" i], .pause-button');
        const playButtons = document.querySelectorAll('button[aria-label*="play" i], button[title*="play" i], .play-button, .vjs-big-play-button');
        
        if (pauseButtons.length > 0) {
          pauseButtons[0].click();
          console.log('[CONTROL] Clicked pause button');
        } else if (playButtons.length > 0) {
          playButtons[0].click();
          console.log('[CONTROL] Clicked play button');
        }
      })();
    `);

    // Toggle state optimistically
    setIsPlaying(!isPlaying);
    resetAutoHideTimer();
  };

  // Seek to specific time
  const seekTo = (time: number) => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        console.log('[CONTROL] Seeking to', ${time});
        
        // Try to find video in parent page
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = ${time};
          console.log('[CONTROL] Seeked to', ${time});
          return;
        }
        
        // Try to find video in iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe, i) => {
          try {
            const iframeVideo = iframe.contentWindow.document.querySelector('video');
            if (iframeVideo) {
              iframeVideo.currentTime = ${time};
              console.log('[CONTROL] Iframe video', i, 'seeked to', ${time});
            }
          } catch (e) {
            console.log('[CONTROL] Cannot seek iframe', i, ':', e.message);
          }
        });
      })();
    `);
    setCurrentTime(time);
    resetAutoHideTimer();
  };

  // Toggle fullscreen/landscape
  const toggleFullscreen = async () => {
    try {
      if (isFullscreen) {
        // Exit fullscreen - lock to portrait
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
        setIsFullscreen(false);
        console.log("[SCREEN] Switched to portrait mode");
      } else {
        // Enter fullscreen - lock to landscape
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
        setIsFullscreen(true);
        console.log("[SCREEN] Switched to landscape mode");
      }
      resetAutoHideTimer();
    } catch (error) {
      console.error("[SCREEN] Failed to toggle orientation:", error);
    }
  };

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds === 0) return "00:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
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
      console.log('[INJECT] Script started');
      console.log('[INJECT] URL:', window.location.href);
      console.log('[INJECT] Document ready state:', document.readyState);
      
      // Check for CSP
      const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (metaCSP) {
        console.log('[INJECT] CSP meta tag found:', metaCSP.content);
      }
      
      // Hide page elements except video
      const style = document.createElement('style');
      style.textContent = \`
        body { margin: 0; padding: 0; background: #000; overflow: hidden; }
        video { width: 100vw !important; height: 100vh !important; object-fit: contain; }
        iframe { width: 100vw !important; height: 100vh !important; border: none; }
      \`;
      document.head.appendChild(style);
      
      // Reusable function to setup and play video
      function setupAndPlayVideo(video) {
        if (!video) return false;
        
        console.log('[INJECT] Setting up video element');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x5-playsinline', 'true');
        video.muted = false;
        video.volume = 1.0;
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('[INJECT] Video playing successfully');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPlaying' }));
          }).catch(e => {
            console.log('[INJECT] Autoplay prevented:', e.message);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'autoplayBlocked' }));
          });
        }
        return true;
      }
      
      // Function to trigger iframe playback via click simulation
      function triggerIframePlayback() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe, index) => {
          console.log('[INJECT] Triggering playback for iframe', index);
          // Simulate click on iframe
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          iframe.dispatchEvent(clickEvent);
          
          // Also try to focus iframe (may trigger autoplay)
          try {
            iframe.focus();
          } catch (e) {
            console.log('[INJECT] Cannot focus iframe', index);
          }
        });
      }
      
      // Main function to find and play video
      function findAndPlayVideo() {
        console.log('[INJECT] Looking for video element...');
        console.log('[INJECT] Iframes count:', document.querySelectorAll('iframe').length);
        console.log('[INJECT] Videos count:', document.querySelectorAll('video').length);
        
        // Try to find video element in parent page
        const video = document.querySelector('video');
        if (video) {
          console.log('[INJECT] Video found in parent page!');
          if (setupAndPlayVideo(video)) {
            return true;
          }
        }
        
        // Check for iframes
        const iframes = document.querySelectorAll('iframe');
        if (iframes.length > 0) {
          console.log('[INJECT] Found', iframes.length, 'iframes');
          
          // Try to access iframe content
          iframes.forEach((iframe, index) => {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              const iframeVideo = iframeDoc.querySelector('video');
              if (iframeVideo) {
                console.log('[INJECT] Video found in iframe', index);
                setupAndPlayVideo(iframeVideo);
              }
            } catch (e) {
              console.log('[INJECT] Cannot access iframe', index, '- cross-origin:', e.message);
              // Fallback: try to click iframe to trigger playback
              iframe.click();
            }
          });
          
          // Additional fallback: trigger iframe playback
          triggerIframePlayback();
        }
        
        // Try to find and click play button
        const playButtons = document.querySelectorAll('button[aria-label*="play" i], button[title*="play" i], .play-button, .vjs-big-play-button, [class*="play"]');
        if (playButtons.length > 0) {
          console.log('[INJECT] Found', playButtons.length, 'play buttons, clicking first one...');
          playButtons[0].click();
        }
        
        return false;
      }
      
      // Extended retry schedule with exponential backoff
      const retryDelays = [500, 1000, 2000, 3000, 5000, 8000, 12000];
      retryDelays.forEach((delay) => {
        setTimeout(findAndPlayVideo, delay);
      });
      
      // Listen for page load
      if (document.readyState === 'complete') {
        findAndPlayVideo();
      } else {
        window.addEventListener('load', findAndPlayVideo);
      }
      
      // MutationObserver for dynamically added video elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'VIDEO') {
              console.log('[INJECT] Video element added dynamically');
              setupAndPlayVideo(node);
              observer.disconnect();
            }
            // Also check if added node contains video
            if (node.querySelectorAll) {
              const video = node.querySelector('video');
              if (video) {
                console.log('[INJECT] Video found in dynamically added content');
                setupAndPlayVideo(video);
                observer.disconnect();
              }
            }
          });
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Add click listener to toggle play/pause video on any tap
      document.addEventListener('click', function(e) {
        console.log('[INJECT] Click detected');
        const video = document.querySelector('video');
        if (video) {
          if (video.paused) {
            console.log('[INJECT] Playing video after click');
            video.play().then(() => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPlaying' }));
            });
          } else {
            console.log('[INJECT] Pausing video after click');
            video.pause();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPaused' }));
          }
          return;
        }
        
        // Also try iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe, i) => {
          try {
            const iframeVideo = iframe.contentWindow.document.querySelector('video');
            if (iframeVideo) {
              if (iframeVideo.paused) {
                console.log('[INJECT] Playing iframe video', i, 'after click');
                iframeVideo.play();
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPlaying' }));
              } else {
                console.log('[INJECT] Pausing iframe video', i, 'after click');
                iframeVideo.pause();
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPaused' }));
              }
            }
          } catch (e) {
            // Cross-origin, ignore
          }
        });
      });
      
      // Monitor video state
      document.addEventListener('DOMContentLoaded', function() {
        const video = document.querySelector('video');
        if (video) {
          video.addEventListener('play', function() {
            console.log('[INJECT] Video play event');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPlaying' }));
          });
          
          video.addEventListener('pause', function() {
            console.log('[INJECT] Video pause event');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPaused' }));
          });
          
          video.addEventListener('error', function(e) {
            console.log('[INJECT] Video error:', e);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoError', error: e.message }));
          });
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

        {/* CENTER PLAY/PAUSE BUTTON - Hide on Web since iframe has its own */}
        {Platform.OS !== "web" && (
          <View style={styles.centerControls}>
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={togglePlayPause}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={50}
                color="white"
              />
            </TouchableOpacity>
          </View>
        )}

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

        {/* BOTTOM CONTROLS - PROGRESS BAR - Hide on Web */}
        {Platform.OS !== "web" && (
          <View style={styles.bottomControls}>
            <View style={styles.progressContainer}>
              {/* Time Display */}
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

              {/* Progress Slider */}
              <Slider
                style={styles.progressSlider}
                value={currentTime}
                minimumValue={0}
                maximumValue={duration || 1}
                minimumTrackTintColor="#FF4757"
                maximumTrackTintColor="rgba(255,255,255,0.3)"
                thumbTintColor="#FF4757"
                onSlidingComplete={(value) => seekTo(value)}
                onValueChange={(value) => setCurrentTime(value)}
              />

              {/* Duration Display */}
              <Text style={styles.timeText}>{formatTime(duration)}</Text>

              {/* Fullscreen Button */}
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={toggleFullscreen}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isFullscreen ? "contract" : "expand"}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
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
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              border: "none",
              backgroundColor: "black",
              zIndex: 1,
            }}
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
            mixedContentMode="always"
            originWhitelist={["*"]}
            userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            injectedJavaScript={injectedJavaScript}
            injectedJavaScriptBeforeContentLoaded={`
              console.log('[INJECT-EARLY] Script injected before content loaded');
              true;
            `}
            onLoadStart={() => {
              console.log("[WEBVIEW] Load started");
              setLoadingVideo(true);
            }}
            onLoadEnd={() => {
              console.log("[WEBVIEW] Load ended");
              setLoadingVideo(false);

              // Re-inject JavaScript after page loads to ensure it runs
              setTimeout(() => {
                console.log("[WEBVIEW] Re-injecting JavaScript...");
                webViewRef.current?.injectJavaScript(injectedJavaScript);
              }, 500);

              // Additional re-injection attempts for stubborn pages
              setTimeout(() => {
                console.log(
                  "[WEBVIEW] Re-injecting JavaScript (2nd attempt)...",
                );
                webViewRef.current?.injectJavaScript(injectedJavaScript);
              }, 2000);

              setTimeout(() => {
                console.log(
                  "[WEBVIEW] Re-injecting JavaScript (3rd attempt)...",
                );
                webViewRef.current?.injectJavaScript(injectedJavaScript);
              }, 5000);

              // Show tap to play hint after 8 seconds if video hasn't started
              setTimeout(() => {
                console.log("[WEBVIEW] Showing tap hint if needed");
                setShowTapToPlay(true);
              }, 8000);
            }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === "videoPlaying") {
                  setShowTapToPlay(false);
                  setIsPlaying(true);
                  console.log("[WEBVIEW] Video is playing");
                } else if (data.type === "videoPaused") {
                  setIsPlaying(false);
                  console.log("[WEBVIEW] Video is paused");
                } else if (data.type === "videoProgress") {
                  setCurrentTime(data.currentTime || 0);
                  setDuration(data.duration || 0);
                } else if (data.type === "autoplayBlocked") {
                  setShowTapToPlay(true);
                  console.log("[WEBVIEW] Autoplay blocked, showing tap hint");
                } else if (data.type === "log") {
                  console.log("[INJECT]", data.message);
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
            onLoadProgress={(event) => {
              console.log(
                "[WEBVIEW] Load progress:",
                event.nativeEvent.progress,
              );
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error(
                "[WEBVIEW HTTP ERROR]",
                nativeEvent.statusCode,
                nativeEvent.url,
              );
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
            // Inject aggressive playback script
            webViewRef.current?.injectJavaScript(`
              (function() {
                console.log('[TAP] User tapped to play');

                // Try direct video access
                const video = document.querySelector('video');
                if (video) {
                  video.muted = false;
                  video.play().then(() => {
                    console.log('[TAP] Video playing');
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'videoPlaying' }));
                  }).catch(e => console.log('[TAP] Play failed:', e));
                }

                // Try iframe access
                const iframes = document.querySelectorAll('iframe');
                iframes.forEach((iframe, i) => {
                  try {
                    const iframeVideo = iframe.contentWindow.document.querySelector('video');
                    if (iframeVideo) {
                      iframeVideo.play();
                      console.log('[TAP] Iframe video', i, 'playing');
                    }
                  } catch (e) {
                    // Click iframe as fallback
                    iframe.click();
                    console.log('[TAP] Clicked iframe', i);
                  }
                });

                // Click any play buttons
                const playButtons = document.querySelectorAll(
                  'button[aria-label*="play" i], button[title*="play" i], ' +
                  '.play-button, .vjs-big-play-button, [class*="play"]'
                );
                playButtons.forEach(btn => btn.click());

                // Click anywhere on the page as last resort
                document.body.click();
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

            {/* Show Default option if using defaultStreamingUrl */}
            {episodeDetail?.defaultStreamingUrl && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={[styles.qualityGroupTitle, { color: colors.text }]}
                >
                  Default
                </Text>
                <TouchableOpacity
                  style={[
                    styles.qualityItem,
                    {
                      backgroundColor:
                        selectedQuality === "Default"
                          ? colors.accent
                          : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedQuality("Default");
                    setSelectedServer(null);
                    setCurrentVideoUrl(episodeDetail.defaultStreamingUrl);
                    setShowQualityModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.qualityText,
                      {
                        color:
                          selectedQuality === "Default"
                            ? "#FFFFFF"
                            : colors.text,
                      },
                    ]}
                  >
                    Default Server
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
  centerControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
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
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    minWidth: 45,
  },
  progressSlider: {
    flex: 1,
    height: 40,
  },
  fullscreenButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
  },
});
