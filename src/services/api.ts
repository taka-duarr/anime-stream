import axios from "axios";
import { Platform } from "react-native";

// ============================================
// ANIME API CONFIGURATION
// ============================================

export const API_BASE_URL = process.env.EXPO_PUBLIC_ANIME_API_BASE_URL || "";
export const AUTH_API_BASE_URL =
  process.env.EXPO_PUBLIC_AUTH_API_BASE_URL || "";

// Helper: wrap a video embed URL through our backend proxy (web only) to strip ads
export const getProxiedVideoUrl = (embedUrl: string): string => {
  if (Platform.OS !== "web" || !embedUrl) return embedUrl;
  // Already proxied — don't double-wrap
  if (embedUrl.includes("/api/video-proxy")) return embedUrl;
  return `${AUTH_API_BASE_URL}/api/video-proxy?url=${encodeURIComponent(embedUrl)}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Separate axios instance for auth API
const authApi = axios.create({
  baseURL: AUTH_API_BASE_URL,
  timeout: 30000,
});

// ============================================
// AXIOS RETRY CONFIGURATION
// ============================================

// DISABLED: We'll implement manual retry with proper rate limit tracking
// axiosRetry is disabled because it doesn't count retries in rate limit
/*
axiosRetry(api, {
  retries: 3,
  retryDelay: (retryCount: number) => {
    console.log(`[API RETRY] Menunggu server... Percobaan ke-${retryCount}`);
    return retryCount * 2000; // 2s, 4s, 6s
  },
  retryCondition: (error: AxiosError) => {
    const status = error.response?.status;

    // Log detailed error info
    if (status) {
      console.log(
        `[API RETRY] Status ${status} - ${status === 500 ? "Server Error" : status === 502 ? "Bad Gateway" : status === 503 ? "Service Unavailable" : status === 504 ? "Gateway Timeout" : "Rate Limited"}`,
      );
    }

    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504
    );
  },
});
*/

// ============================================
// RATE LIMITING
// ============================================

const RATE_LIMIT_MAX_REQUESTS = 49; // Max requests per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

interface RateLimitEntry {
  timestamp: number;
}

const rateLimitQueue: RateLimitEntry[] = [];

/**
 * Check if we can make a request based on rate limit
 * Returns true if request is allowed, false otherwise
 */
const checkRateLimit = (): boolean => {
  const now = Date.now();

  // Remove entries older than 1 minute
  while (
    rateLimitQueue.length > 0 &&
    now - rateLimitQueue[0].timestamp > RATE_LIMIT_WINDOW_MS
  ) {
    rateLimitQueue.shift();
  }

  // Check if we've exceeded the limit
  if (rateLimitQueue.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestRequest = rateLimitQueue[0];
    const timeUntilReset =
      RATE_LIMIT_WINDOW_MS - (now - oldestRequest.timestamp);
    console.warn(
      `[RATE LIMIT] Exceeded ${RATE_LIMIT_MAX_REQUESTS} requests per minute. ` +
        `Wait ${Math.ceil(timeUntilReset / 1000)} seconds.`,
    );
    return false;
  }

  // Add current request to queue
  rateLimitQueue.push({ timestamp: now });
  console.log(
    `[RATE LIMIT] ${rateLimitQueue.length}/${RATE_LIMIT_MAX_REQUESTS} requests in current window`,
  );
  return true;
};

/**
 * Wait until rate limit allows next request
 */
const waitForRateLimit = async (): Promise<void> => {
  while (!checkRateLimit()) {
    const now = Date.now();
    const oldestRequest = rateLimitQueue[0];
    const timeUntilReset =
      RATE_LIMIT_WINDOW_MS - (now - oldestRequest.timestamp);

    console.log(
      `[RATE LIMIT] Waiting ${Math.ceil(timeUntilReset / 1000)} seconds...`,
    );
    await new Promise<void>((resolve) => setTimeout(() => resolve(), timeUntilReset + 100));
  }
};

/**
 * Manual retry with rate limit tracking and exponential backoff
 * Each retry counts towards rate limit
 *
 * Strategies to minimize 502 Bad Gateway:
 * 1. Exponential backoff with jitter (randomized delays)
 * 2. Longer delays for 502 errors (server needs recovery time)
 * 3. More retries for 502 (up to 5 attempts)
 * 4. Circuit breaker pattern (track consecutive failures)
 */

// Circuit breaker state
let consecutiveFailures = 0;
let circuitBreakerOpenUntil = 0;
const MAX_CONSECUTIVE_FAILURES = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

const retryWithRateLimit = async <T>(
  fetcher: () => Promise<T>,
  maxRetries: number = 5, // Increased from 3 to 5 for 502 errors
  baseDelay: number = 2000, // Base delay for exponential backoff
): Promise<T> => {
  let lastError: any;

  // Check circuit breaker
  const now = Date.now();
  if (now < circuitBreakerOpenUntil) {
    const waitTime = Math.ceil((circuitBreakerOpenUntil - now) / 1000);
    console.warn(
      `[CIRCUIT BREAKER] Circuit open, waiting ${waitTime}s before retry...`,
    );
    await new Promise<void>((resolve) =>
      setTimeout(() => resolve(), circuitBreakerOpenUntil - now),
    );
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Wait for rate limit before each attempt (including retries)
      await waitForRateLimit();

      if (attempt > 0) {
        console.log(`[API RETRY] Percobaan ke-${attempt} dari ${maxRetries}`);
      }

      const result = await fetcher();

      // Reset circuit breaker on success
      consecutiveFailures = 0;
      circuitBreakerOpenUntil = 0;

      return result;
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status;

      // Log error details
      if (status) {
        const errorType =
          status === 500
            ? "Server Error"
            : status === 502
              ? "Bad Gateway"
              : status === 503
                ? "Service Unavailable"
                : status === 504
                  ? "Gateway Timeout"
                  : status === 429
                    ? "Rate Limited"
                    : `HTTP ${status}`;
        console.log(`[API RETRY] Status ${status} - ${errorType}`);
      }

      // Check if we should retry
      const shouldRetry =
        attempt < maxRetries &&
        (status === 429 ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504 ||
          error.code === "ECONNABORTED" ||
          error.message?.includes("Network Error"));

      if (!shouldRetry) {
        // Track consecutive failures for circuit breaker
        if (status === 502 || status === 503) {
          consecutiveFailures++;
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
            console.warn(
              `[CIRCUIT BREAKER] Opened after ${consecutiveFailures} consecutive failures. ` +
                `Will retry after ${CIRCUIT_BREAKER_TIMEOUT / 1000}s`,
            );
          }
        }
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      // For 502 errors, use longer delays
      const multiplier = status === 502 ? 2 : 1;
      const exponentialDelay = baseDelay * Math.pow(2, attempt) * multiplier;

      // Add jitter (randomize ±25% to avoid thundering herd)
      const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
      const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30s

      console.log(
        `[API RETRY] ${status === 502 ? "502 detected - using longer delay." : ""} ` +
          `Menunggu ${(delay / 1000).toFixed(1)}s sebelum retry...`,
      );
      await new Promise<void>((resolve) => setTimeout(() => resolve(), delay));
    }
  }

  // Track consecutive failures for circuit breaker
  const status = lastError?.response?.status;
  if (status === 502 || status === 503) {
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
      console.warn(
        `[CIRCUIT BREAKER] Opened after ${consecutiveFailures} consecutive failures. ` +
          `Will retry after ${CIRCUIT_BREAKER_TIMEOUT / 1000}s`,
      );
    }
  }

  throw lastError;
};

// ============================================
// IN-MEMORY CACHE
// ============================================

const CACHE_EXPIRATION_MS = 1000 * 60 * 5; // 5 Menit
const cache: Record<string, { data: any; timestamp: number }> = {};

const fetchWithCache = async <T>(
  url: string,
  fetcher: () => Promise<T>,
  maxRetries?: number,
): Promise<T> => {
  const now = Date.now();
  if (cache[url] && now - cache[url].timestamp < CACHE_EXPIRATION_MS) {
    console.log(`[CACHE HIT] Mengambil ${url} dari Memori lokal`);
    return cache[url].data;
  }

  console.log(`[FETCHING API] Menarik data dari Endpoint: ${url}`);
  try {
    // Use manual retry with rate limit tracking
    const data = await retryWithRateLimit(fetcher, maxRetries);
    cache[url] = { data, timestamp: now };
    console.log(`[API SUCCESS] Berhasil menarik data: ${url}`);
    return data;
  } catch (error) {
    if (maxRetries === 0) {
      console.log(`[API ERROR] Gagal menarik data dari: ${url} (Silently handled)`);
    } else {
      console.error(`[API ERROR] Gagal menarik data dari: ${url}`, error);
    }
    throw error;
  }
};

// ============================================
// ANIME API ENDPOINTS
// ============================================

/**
 * GET HOME PAGE DATA
 * Endpoint: /home
 * Returns: Ongoing and completed anime lists
 */
export const getHomeData = async () => {
  return fetchWithCache("/home", async () => {
    const response = await api.get("/home");
    console.log(
      "[DEBUG API] Raw response:",
      JSON.stringify(response.data, null, 2),
    );

    // Handle actual API response structure
    const data = response.data?.data || response.data;

    if (data && data.ongoing && data.completed) {
      console.log("[DEBUG API] Found ongoing and completed structure");

      // Transform to expected format
      return {
        ongoingAnime: data.ongoing.animeList || [],
        completeAnime: data.completed.animeList || [],
      };
    }

    // Fallback: check if already in expected format
    if (data && (data.ongoingAnime || data.completeAnime)) {
      console.log("[DEBUG API] Already in expected format");
      return data;
    }

    console.error("[ERROR API] Unexpected response structure:", data);
    return {
      ongoingAnime: [],
      completeAnime: [],
    };
  });
};

/**
 * GET ANIME DETAIL
 * Endpoint: /anime/{animeId}
 * Returns: Complete anime information with episode list
 */
export const getAnimeDetail = async (animeId: string) => {
  return fetchWithCache(`/anime/${animeId}`, async () => {
    const response = await api.get(`/anime/${animeId}`);
    return response.data.data;
  });
};

/**
 * GET COMPLETED ANIME LIST
 * Endpoint: /complete-anime?page={page}
 * Returns: Paginated list of completed anime
 */
export const getCompleteAnime = async (page: number = 1) => {
  return fetchWithCache(`/complete-anime?page=${page}`, async () => {
    const response = await api.get(`/complete-anime?page=${page}`);
    return response.data.data.animeList;
  });
};

/**
 * GET ONGOING ANIME LIST
 * Endpoint: /ongoing-anime?page={page}
 * Returns: Paginated list of ongoing anime
 */
export const getOngoingAnime = async (page: number = 1) => {
  return fetchWithCache(`/ongoing-anime?page=${page}`, async () => {
    const response = await api.get(`/ongoing-anime?page=${page}`);
    return response.data.data.animeList;
  });
};

let cachedOngoingIds: Set<string> | null = null;

/**
 * FETCH AND MAP ALL ONGOING ANIME IDS
 * Fetches all ongoing anime pages sequentially to build a cached set of ongoing anime IDs.
 * Used to filter genre results.
 */
export const getOngoingAnimeIds = async (): Promise<Set<string>> => {
  if (cachedOngoingIds) return cachedOngoingIds;

  const ids = new Set<string>();
  let page = 1;
  while (page <= 12) {
    try {
      const list = await getOngoingAnime(page);
      if (!list || list.length === 0) break;
      list.forEach((item: any) => {
        if (item.animeId) ids.add(item.animeId);
      });
      if (list.length < 20) break;
      page++;
    } catch (err) {
      console.warn(`[API] Error fetching ongoing page ${page} for ID mapping:`, err);
      break;
    }
  }

  cachedOngoingIds = ids;
  return ids;
};


/**
 * SEARCH ANIME
 * Endpoint: /search/{query}
 * Returns: List of anime matching search query
 */
export const searchAnime = async (query: string) => {
  const encodedQuery = encodeURIComponent(query);
  return fetchWithCache(`/search/${encodedQuery}`, async () => {
    const response = await api.get(`/search/${encodedQuery}`);
    return response.data.data.animeList;
  }, 0);
};

/**
 * GET EPISODE DETAIL
 * Endpoint: /episode/{episodeId}
 * Returns: Episode information with streaming servers and download links
 */
export const getEpisodeDetail = async (episodeId: string) => {
  return fetchWithCache(`/episode/${episodeId}`, async () => {
    const response = await api.get(`/episode/${episodeId}`);
    const data = response.data.data;

    // Transform API response structure to match our types
    return {
      ...data,
      serverqualities: data.server?.qualities || [],
      downloadUrlqualities: data.downloadUrl?.qualities || [],
    };
  });
};

/**
 * GET SERVER STREAMING URL
 * Endpoint: /server/{serverId}
 * Returns: Actual streaming URL from selected server
 * Note: Cache disabled for streaming URLs (they may expire)
 *
 * Special handling for 502 errors:
 * - Uses longer retry delays
 * - More retry attempts (5 instead of 3)
 * - Exponential backoff with jitter
 */
export const getServerStreamingUrl = async (serverId: string) => {
  console.log(`[FETCHING] /server/${serverId}`);
  try {
    // Use manual retry with rate limit tracking
    // For streaming URLs, use more aggressive retry strategy
    const response = await retryWithRateLimit(
      () => api.get(`/server/${serverId}`),
      5, // max retries (increased for 502 handling)
      3000, // base delay (3s for exponential backoff)
    );
    console.log(`[SUCCESS] /server/${serverId}`);
    console.log(
      `[DEBUG] Server response:`,
      JSON.stringify(response.data, null, 2),
    );
    return response.data.data;
  } catch (error) {
    console.error(`[ERROR] /server/${serverId}`, error);
    throw error;
  }
};

/**
 * GET RELEASE SCHEDULE
 * Endpoint: /schedule
 * Returns: Anime release schedule by day
 */
export const getSchedule = async () => {
  return fetchWithCache("/schedule", async () => {
    const response = await api.get("/schedule");
    return response.data.data;
  });
};

/**
 * GET GENRE LIST
 * Endpoint: /genre
 * Returns: List of all available genres
 */
export const getGenreList = async () => {
  return fetchWithCache("/genre", async () => {
    const response = await api.get("/genre");
    return response.data.data.genreList || [];
  });
};

/**
 * GET ANIME BY GENRE
 * Endpoint: /genre/{genreId}?page={page}
 * Returns: Paginated list of anime filtered by genre
 */
export const getAnimeByGenre = async (genreId: string, page: number = 1) => {
  return fetchWithCache(`/genre/${genreId}?page=${page}`, async () => {
    const response = await api.get(`/genre/${genreId}?page=${page}`);
    // Return animeList from response data
    return response.data.data?.animeList || response.data.data || [];
  });
};

/**
 * GET BATCH DOWNLOAD
 * Endpoint: /batch/{batchId}
 * Returns: Batch download information with multiple quality options
 */
export const getBatchDetail = async (batchId: string) => {
  return fetchWithCache(`/batch/${batchId}`, async () => {
    const response = await api.get(`/batch/${batchId}`);
    return response.data.data;
  });
};

/**
 * GET ALL ANIME (UNLIMITED)
 * Endpoint: /unlimited
 * Returns: All anime grouped alphabetically (A-Z)
 */
export const getUnlimitedAnime = async () => {
  return fetchWithCache("/unlimited", async () => {
    const response = await api.get("/unlimited");
    return response.data.data;
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Clear all cached data
 */
export const clearCache = () => {
  Object.keys(cache).forEach((key) => delete cache[key]);
  console.log("[CACHE] Cleared all cached data");
};

/**
 * Clear specific cache entry
 */
export const clearCacheEntry = (url: string) => {
  if (cache[url]) {
    delete cache[url];
    console.log(`[CACHE] Cleared cache for ${url}`);
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const entries = Object.keys(cache).length;
  const totalSize = JSON.stringify(cache).length;
  return {
    entries,
    totalSize,
    sizeInKB: (totalSize / 1024).toFixed(2),
  };
};

/**
 * Get rate limit statistics
 */
export const getRateLimitStats = () => {
  const now = Date.now();

  // Clean old entries
  while (
    rateLimitQueue.length > 0 &&
    now - rateLimitQueue[0].timestamp > RATE_LIMIT_WINDOW_MS
  ) {
    rateLimitQueue.shift();
  }

  const remaining = RATE_LIMIT_MAX_REQUESTS - rateLimitQueue.length;
  const oldestRequest = rateLimitQueue[0];
  const resetIn = oldestRequest
    ? Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldestRequest.timestamp)) / 1000)
    : 0;

  return {
    used: rateLimitQueue.length,
    remaining,
    limit: RATE_LIMIT_MAX_REQUESTS,
    resetIn, // seconds until oldest request expires
  };
};

/**
 * Reset rate limit queue (for testing purposes)
 */
export const resetRateLimit = () => {
  rateLimitQueue.length = 0;
  console.log("[RATE LIMIT] Queue reset");
};

/**
 * Get circuit breaker status
 */
export const getCircuitBreakerStatus = () => {
  const now = Date.now();
  const isOpen = now < circuitBreakerOpenUntil;
  const resetIn = isOpen
    ? Math.ceil((circuitBreakerOpenUntil - now) / 1000)
    : 0;

  return {
    isOpen,
    consecutiveFailures,
    resetIn, // seconds until circuit closes
    threshold: MAX_CONSECUTIVE_FAILURES,
  };
};

/**
 * Reset circuit breaker (for testing purposes)
 */
export const resetCircuitBreaker = () => {
  consecutiveFailures = 0;
  circuitBreakerOpenUntil = 0;
  console.log("[CIRCUIT BREAKER] Reset");
};

// ============================================
// AUTHENTICATION & TOKEN MANAGEMENT
// ============================================

let authToken: string | null = null;
let refreshTokenInMemory: string | null = null;
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

/**
 * Set authentication token
 * This token will be used for all protected endpoints
 */
export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    authApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    console.log("[AUTH] Token set successfully");
  } else {
    delete authApi.defaults.headers.common["Authorization"];
    refreshTokenInMemory = null;
    console.log("[AUTH] Token cleared");
  }
};

/**
 * Set refresh token in memory
 */
export const setRefreshToken = (token: string | null) => {
  refreshTokenInMemory = token;
};

/**
 * Get current authentication token
 */
export const getAuthToken = (): string | null => {
  return authToken;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return authToken !== null && authToken !== "";
};

// ============================================
// AXIOS INTERCEPTOR — AUTO REFRESH TOKEN
// Saat API membalas 401, interceptor ini akan otomatis
// memanggil /api/auth/refresh dan mengulang request asli.
// ============================================

let onForceLogout: (() => void) | null = null;

/**
 * Daftarkan callback yang akan dipanggil saat refresh token gagal
 * (biasanya: logout user secara paksa)
 */
export const setForceLogoutCallback = (callback: () => void) => {
  onForceLogout = callback;
};

authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Kalau bukan 401, atau ini sudah request retry, lempar error langsung
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Kalau tidak ada refresh token, langsung force logout
    if (!refreshTokenInMemory) {
      console.log("[AUTH INTERCEPTOR] Tidak ada refresh token, force logout.");
      onForceLogout?.();
      return Promise.reject(error);
    }

    // Kalau sedang proses refresh, antrekan request yang gagal
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return authApi(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      console.log("[AUTH INTERCEPTOR] Access token expired, mencoba refresh...");
      const response = await authApi.post("/api/auth/refresh", {
        refresh_token: refreshTokenInMemory,
      });

      const { token: newAccessToken, refresh_token: newRefreshToken } = response.data;

      // Update token di memori
      setAuthToken(newAccessToken);
      setRefreshToken(newRefreshToken);

      // Simpan token baru ke AsyncStorage (via callback dari AuthContext)
      onTokenRefreshed?.(newAccessToken, newRefreshToken);

      console.log("[AUTH INTERCEPTOR] Token berhasil diperbarui (rolling).");

      processQueue(null, newAccessToken);

      // Ulangi request asli dengan token baru
      originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
      return authApi(originalRequest);
    } catch (refreshError) {
      console.log("[AUTH INTERCEPTOR] Refresh token gagal/expired, force logout.");
      processQueue(refreshError, null);
      onForceLogout?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

let onTokenRefreshed: ((newAccessToken: string, newRefreshToken: string) => void) | null = null;

/**
 * Daftarkan callback yang dipanggil saat token berhasil di-refresh
 * (digunakan AuthContext untuk menyimpan token baru ke AsyncStorage)
 */
export const setTokenRefreshedCallback = (callback: (newAccessToken: string, newRefreshToken: string) => void) => {
  onTokenRefreshed = callback;
};

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * REGISTER NEW USER
 * Endpoint: POST /api/auth/register
 * Body: { username: string, password: string }
 * Returns: { message: string, user: { id, username } }
 */
export const register = async (username: string, password: string) => {
  try {
    console.log("[AUTH] Registering user:", username);
    const response = await authApi.post("/api/auth/register", {
      username,
      password,
    });
    console.log("[AUTH] Registration successful");
    return response.data;
  } catch (error: any) {
    console.error(
      "[AUTH ERROR] Registration failed:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * LOGIN USER
 * Endpoint: POST /api/auth/login
 * Body: { username: string, password: string }
 * Returns: { token: string, user: { id, username } }
 */
export const login = async (username: string, password: string) => {
  try {
    console.log("[AUTH] Logging in user:", username);
    const response = await authApi.post("/api/auth/login", {
      username,
      password,
    });
    console.log("[AUTH] Login successful");

    // Set access token dan refresh token
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    if (response.data.refresh_token) {
      setRefreshToken(response.data.refresh_token);
    }

    return response.data;
  } catch (error: any) {
    console.error(
      "[AUTH ERROR] Login failed:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * LOGOUT USER
 * Clears the authentication token
 */
export const logout = () => {
  console.log("[AUTH] Logging out user");
  setAuthToken(null);
};

// ============================================
// WATCH HISTORY ENDPOINTS (PROTECTED)
// ============================================

/**
 * SAVE WATCH HISTORY
 * Endpoint: POST /api/history
 * Body: { anime_id: string, episode_id: string }
 * Returns: { message: string, history: ... }
 */
export const saveWatchHistory = async (animeId: string, episodeId: string) => {
  try {
    if (!isAuthenticated()) {
      return null;
    }
    console.log(`[HISTORY] Saving watch history: ${animeId} - ${episodeId}`);
    const response = await authApi.post("/api/history/", {
      anime_id: animeId,
      episode_id: episodeId,
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "[HISTORY ERROR] Failed to save watch history:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * GET WATCH HISTORY FOR ANIME
 * Endpoint: GET /api/history/:anime_id
 * Returns: Array of watched episode string IDs
 */
export const getWatchHistory = async (animeId: string): Promise<string[]> => {
  try {
    if (!isAuthenticated()) {
      return [];
    }
    console.log(`[HISTORY] Fetching watch history for anime: ${animeId}`);
    const response = await authApi.get(`/api/history/${animeId}`);
    const watchedEpisodes = response.data.watched_episodes || [];
    console.log(`[HISTORY] Fetched ${watchedEpisodes.length} watched episodes for ${animeId}`);
    return watchedEpisodes;
  } catch (error: any) {
    console.error(
      "[HISTORY ERROR] Failed to fetch watch history:",
      error.response?.data || error.message,
    );
    return [];
  }
};

// ============================================
// BOOKMARK ENDPOINTS (PROTECTED)
// ============================================

export interface Bookmark {
  anime_id: string;
  title: string;
  poster: string;
  created_at?: string;
}

/**
 * GET ALL BOOKMARKS
 * Endpoint: GET /api/bookmarks/
 * Requires: Authentication token
 * Returns: Array of bookmarks
 */
export const getBookmarks = async (): Promise<Bookmark[]> => {
  try {
    if (!isAuthenticated()) {
      throw new Error("User not authenticated. Please login first.");
    }

    console.log("[BOOKMARK] Fetching bookmarks");
    const response = await authApi.get("/api/bookmarks/");

    // Handle response structure: {bookmarks: [...]}
    const bookmarks = response.data.bookmarks || response.data || [];
    console.log("[BOOKMARK] Fetched", bookmarks.length || 0, "bookmarks");
    return bookmarks;
  } catch (error: any) {
    console.error(
      "[BOOKMARK ERROR] Failed to fetch bookmarks:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * ADD BOOKMARK
 * Endpoint: POST /api/bookmarks/
 * Requires: Authentication token
 * Body: { anime_id: string, title: string, poster: string }
 * Returns: Created bookmark
 */
export const addBookmark = async (bookmark: Bookmark) => {
  try {
    if (!isAuthenticated()) {
      throw new Error("User not authenticated. Please login first.");
    }

    console.log("[BOOKMARK] Adding bookmark:", bookmark.anime_id);
    const response = await authApi.post("/api/bookmarks/", bookmark);
    console.log("[BOOKMARK] Bookmark added successfully");
    return response.data;
  } catch (error: any) {
    console.error(
      "[BOOKMARK ERROR] Failed to add bookmark:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * DELETE BOOKMARK
 * Endpoint: DELETE /api/bookmarks/:anime_id
 * Requires: Authentication token
 * Returns: Success message
 */
export const deleteBookmark = async (animeId: string) => {
  try {
    if (!isAuthenticated()) {
      throw new Error("User not authenticated. Please login first.");
    }

    console.log("[BOOKMARK] Deleting bookmark:", animeId);
    const response = await authApi.delete(`/api/bookmarks/${animeId}`);
    console.log("[BOOKMARK] Bookmark deleted successfully");
    return response.data;
  } catch (error: any) {
    console.error(
      "[BOOKMARK ERROR] Failed to delete bookmark:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * CHECK IF ANIME IS BOOKMARKED
 * Helper function to check if an anime is in bookmarks
 */
export const isBookmarked = async (animeId: string): Promise<boolean> => {
  try {
    if (!isAuthenticated()) {
      return false;
    }

    const bookmarks = await getBookmarks();
    return bookmarks.some((bookmark) => bookmark.anime_id === animeId);
  } catch (error) {
    console.error("[BOOKMARK ERROR] Failed to check bookmark status:", error);
    return false;
  }
};

/**
 * TOGGLE BOOKMARK
 * Helper function to add or remove bookmark
 */
export const toggleBookmark = async (bookmark: Bookmark): Promise<boolean> => {
  try {
    if (!isAuthenticated()) {
      throw new Error("User not authenticated. Please login first.");
    }

    const bookmarked = await isBookmarked(bookmark.anime_id);

    if (bookmarked) {
      await deleteBookmark(bookmark.anime_id);
      console.log("[BOOKMARK] Removed bookmark:", bookmark.anime_id);
      return false; // Not bookmarked anymore
    } else {
      await addBookmark(bookmark);
      console.log("[BOOKMARK] Added bookmark:", bookmark.anime_id);
      return true; // Now bookmarked
    }
  } catch (error) {
    console.error("[BOOKMARK ERROR] Failed to toggle bookmark:", error);
    throw error;
  }
};

// ============================================
// TESTING UTILITIES
// ============================================

/**
 * Test authentication endpoints
 * This function tests register, login, and token management
 */
export const testAuthEndpoints = async () => {
  console.log("\n========================================");
  console.log("🧪 TESTING AUTHENTICATION ENDPOINTS");
  console.log("========================================\n");

  const testUsername = `testuser_${Date.now()}`;
  const testPassword = "testpass123";

  try {
    // Test 1: Register
    console.log("📝 Test 1: Register new user");
    console.log(`Username: ${testUsername}`);
    console.log(`Password: ${testPassword}`);
    const registerResult = await register(testUsername, testPassword);
    console.log("✅ Registration successful:", registerResult);
    console.log("");

    // Test 2: Login
    console.log("🔐 Test 2: Login with credentials");
    const loginResult = await login(testUsername, testPassword);
    console.log("✅ Login successful");
    console.log("Token:", loginResult.token?.substring(0, 20) + "...");
    console.log("User:", loginResult.user);
    console.log("");

    // Test 3: Check authentication status
    console.log("🔍 Test 3: Check authentication status");
    console.log("Is authenticated:", isAuthenticated());
    console.log("Has token:", getAuthToken() !== null);
    console.log("");

    // Test 4: Logout
    console.log("🚪 Test 4: Logout");
    logout();
    console.log("Is authenticated after logout:", isAuthenticated());
    console.log("");

    console.log("========================================");
    console.log("✅ ALL AUTHENTICATION TESTS PASSED");
    console.log("========================================\n");

    return {
      success: true,
      username: testUsername,
      token: loginResult.token,
    };
  } catch (error: any) {
    console.error("\n❌ AUTHENTICATION TEST FAILED");
    console.error("Error:", error.response?.data || error.message);
    console.log("========================================\n");
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * Test bookmark endpoints
 * This function tests add, get, and delete bookmarks
 * Requires: User must be logged in first
 */
export const testBookmarkEndpoints = async () => {
  console.log("\n========================================");
  console.log("🧪 TESTING BOOKMARK ENDPOINTS");
  console.log("========================================\n");

  if (!isAuthenticated()) {
    console.error("❌ User not authenticated. Please login first.");
    console.log("Run testAuthEndpoints() first to login.\n");
    return { success: false, error: "Not authenticated" };
  }

  const testBookmark: Bookmark = {
    anime_id: "naruto-shippuden",
    title: "Naruto Shippuden",
    poster: "https://example.com/naruto.jpg",
  };

  try {
    // Test 1: Add bookmark
    console.log("➕ Test 1: Add bookmark");
    console.log("Anime ID:", testBookmark.anime_id);
    console.log("Title:", testBookmark.title);
    const addResult = await addBookmark(testBookmark);
    console.log("✅ Bookmark added:", addResult);
    console.log("");

    // Test 2: Get all bookmarks
    console.log("📋 Test 2: Get all bookmarks");
    const bookmarks = await getBookmarks();
    console.log("✅ Fetched bookmarks:", bookmarks.length, "items");
    console.log("Bookmarks:", bookmarks);
    console.log("");

    // Test 3: Check if bookmarked
    console.log("🔍 Test 3: Check if anime is bookmarked");
    const bookmarked = await isBookmarked(testBookmark.anime_id);
    console.log("Is bookmarked:", bookmarked);
    console.log("");

    // Test 4: Delete bookmark
    console.log("🗑️  Test 4: Delete bookmark");
    const deleteResult = await deleteBookmark(testBookmark.anime_id);
    console.log("✅ Bookmark deleted:", deleteResult);
    console.log("");

    // Test 5: Verify deletion
    console.log("✔️  Test 5: Verify deletion");
    const bookmarksAfterDelete = await getBookmarks();
    console.log(
      "Bookmarks after delete:",
      bookmarksAfterDelete.length,
      "items",
    );
    const stillBookmarked = await isBookmarked(testBookmark.anime_id);
    console.log("Is still bookmarked:", stillBookmarked);
    console.log("");

    // Test 6: Toggle bookmark (add)
    console.log("🔄 Test 6: Toggle bookmark (add)");
    const toggleAdd = await toggleBookmark(testBookmark);
    console.log("Toggle result (should be true):", toggleAdd);
    console.log("");

    // Test 7: Toggle bookmark (remove)
    console.log("🔄 Test 7: Toggle bookmark (remove)");
    const toggleRemove = await toggleBookmark(testBookmark);
    console.log("Toggle result (should be false):", toggleRemove);
    console.log("");

    console.log("========================================");
    console.log("✅ ALL BOOKMARK TESTS PASSED");
    console.log("========================================\n");

    return { success: true };
  } catch (error: any) {
    console.error("\n❌ BOOKMARK TEST FAILED");
    console.error("Error:", error.response?.data || error.message);
    console.log("========================================\n");
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * Run all tests
 * This function runs both authentication and bookmark tests
 */
export const runAllTests = async () => {
  console.log("\n🚀 STARTING ALL API TESTS\n");

  // Test authentication first
  const authTest = await testAuthEndpoints();

  if (!authTest.success) {
    console.error("❌ Authentication tests failed. Skipping bookmark tests.\n");
    return { success: false, authTest };
  }

  // Login again for bookmark tests
  console.log("🔐 Logging in for bookmark tests...");
  if (authTest.token) {
    setAuthToken(authTest.token);
  }

  // Test bookmarks
  const bookmarkTest = await testBookmarkEndpoints();

  // Cleanup: logout
  logout();

  console.log("\n========================================");
  console.log("🏁 ALL TESTS COMPLETED");
  console.log("========================================");
  console.log(
    "Authentication tests:",
    authTest.success ? "✅ PASSED" : "❌ FAILED",
  );
  console.log(
    "Bookmark tests:",
    bookmarkTest.success ? "✅ PASSED" : "❌ FAILED",
  );
  console.log("========================================\n");

  return {
    success: authTest.success && bookmarkTest.success,
    authTest,
    bookmarkTest,
  };
};

// ============================================
// COMMENT ENDPOINTS
// ============================================

export interface Comment {
  id: number;
  user_id?: number;
  username?: string; // Flat structure (optional for backward compatibility)
  profile_picture?: string;
  anime_id: string;
  content: string;
  parent_id?: number;
  created_at: string;
  updated_at?: string;
  user?: {
    // Nested structure from server
    id: number;
    username: string;
    profile_picture?: string;
  };
  replies?: Comment[];
}

/**
 * GET COMMENTS FOR ANIME
 * Endpoint: GET /api/comments/:anime_id
 * Public endpoint - no authentication required
 * Returns: Array of comments with nested replies
 */
export const getComments = async (animeId: string): Promise<Comment[]> => {
  try {
    console.log("[COMMENTS] Fetching comments for anime:", animeId);
    const response = await authApi.get(`/api/comments/${animeId}`);

    console.log(
      "[COMMENTS] Raw response:",
      JSON.stringify(response.data, null, 2),
    );

    const rawComments = response.data.comments || response.data || [];
    console.log("[COMMENTS] Fetched", rawComments.length, "comments");

    // Transform comments to flatten user data
    const transformComment = (comment: any): Comment => {
      const transformed: Comment = {
        ...comment,
        // Flatten user data if it exists in nested structure
        username: comment.username || comment.user?.username || "Anonymous",
        user_id: comment.user_id || comment.user?.id,
        profile_picture:
          comment.profile_picture || comment.user?.profile_picture,
      };

      // Transform replies recursively
      if (comment.replies && comment.replies.length > 0) {
        transformed.replies = comment.replies.map(transformComment);
      }

      return transformed;
    };

    const comments = rawComments.map(transformComment);

    if (comments.length > 0) {
      console.log(
        "[COMMENTS] First comment after transform:",
        JSON.stringify(comments[0], null, 2),
      );
      console.log("[COMMENTS] First comment username:", comments[0].username);
      console.log("[COMMENTS] First comment user_id:", comments[0].user_id);
    }

    return comments;
  } catch (error: any) {
    console.error(
      "[COMMENTS ERROR] Failed to fetch comments:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * ADD COMMENT
 * Endpoint: POST /api/comments/
 * Requires: Authentication token
 * Body: { anime_id: string, content: string, parent_id?: number }
 * Returns: Created comment
 */
export const addComment = async (
  animeId: string,
  content: string,
  parentId?: number,
): Promise<Comment> => {
  try {
    if (!isAuthenticated()) {
      throw new Error("User not authenticated. Please login first.");
    }

    console.log("[COMMENTS] Adding comment for anime:", animeId);
    const body: any = { anime_id: animeId, content };
    if (parentId) {
      body.parent_id = parentId;
    }

    const response = await authApi.post("/api/comments/", body);
    console.log("[COMMENTS] Comment added successfully");
    return response.data;
  } catch (error: any) {
    console.error(
      "[COMMENTS ERROR] Failed to add comment:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * EDIT COMMENT
 * Endpoint: PUT /api/comments/:id
 * Requires: Authentication token (only own comments)
 * Body: { content: string }
 * Returns: Updated comment
 */
export const editComment = async (
  commentId: number,
  content: string,
): Promise<Comment> => {
  try {
    if (!isAuthenticated()) {
      throw new Error("User not authenticated. Please login first.");
    }

    console.log("[COMMENTS] Editing comment:", commentId);
    const response = await authApi.put(`/api/comments/${commentId}`, {
      content,
    });
    console.log("[COMMENTS] Comment edited successfully");
    return response.data;
  } catch (error: any) {
    console.error(
      "[COMMENTS ERROR] Failed to edit comment:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * DELETE COMMENT
 * Endpoint: DELETE /api/comments/:id
 * Requires: Authentication token (only own comments)
 * Deletes comment and all its replies
 * Returns: Success message
 */
export const deleteComment = async (commentId: number): Promise<any> => {
  try {
    if (!isAuthenticated()) {
      throw new Error("User not authenticated. Please login first.");
    }

    console.log("[COMMENTS] Deleting comment:", commentId);
    const response = await authApi.delete(`/api/comments/${commentId}`);
    console.log("[COMMENTS] Comment deleted successfully");
    return response.data;
  } catch (error: any) {
    console.error(
      "[COMMENTS ERROR] Failed to delete comment:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

// ============================================
// USER PROFILE ENDPOINTS
// ============================================

/**
 * GET CURRENT USER PROFILE
 * Endpoint: GET /api/users/profile
 * Requires: Authentication token
 * Returns: { user: { id, username, profile_picture } }
 */
export const getProfile = async () => {
  try {
    if (!isAuthenticated()) {
      throw new Error("User not authenticated. Please login first.");
    }

    console.log("[PROFILE] Fetching current user profile");
    const response = await authApi.get("/api/users/profile");
    return response.data;
  } catch (error: any) {
    console.error(
      "[PROFILE ERROR] Failed to fetch profile:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * UPLOAD PROFILE PICTURE
 * Endpoint: POST /api/users/profile-picture
 * Requires: Authentication token
 * Request: multipart/form-data with key 'profile_picture'
 * Returns: { message: string, profile_picture: string }
 */
export const uploadProfilePicture = async (imageUri: string): Promise<any> => {
  try {
    if (!isAuthenticated()) {
      throw new Error("User not authenticated. Please login first.");
    }

    console.log("[PROFILE] Uploading profile picture");

    // 3. Create upload directory if not exists (Handled by backend)

    // 4. Create FormData
    const formData = new FormData();

    // Extract extension and ensure it's valid for the backend
    let filename = imageUri.split("/").pop() || "profile.jpg";
    if (!filename.includes(".")) {
      filename += ".jpg"; // Default extension if missing
    }

    // 5. Append image to FormData (Handle Web vs Mobile)
    if (Platform.OS === "web" && imageUri.startsWith("blob:")) {
      // On Web, we need to fetch the blob to send it properly
      const blobResponse = await fetch(imageUri);
      const blob = await blobResponse.blob();

      // Force a valid filename with extension for the backend
      let extension = blob.type.split("/")[1] || "jpg";
      if (extension === "jpeg") extension = "jpg";
      const finalFilename = `profile_${Date.now()}.${extension}`;

      // FIX: Use File constructor for web (FormData.append only accepts 2 params in RN)
      const file = new File([blob], finalFilename, { type: blob.type });
      formData.append("profile_picture", file);
    } else {
      // On Mobile (iOS/Android), use the URI object format
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("profile_picture", {
        uri: imageUri, // Keep full uri including file:// for both iOS and Android
        name: filename,
        type: type,
      } as any);
    }

    // 6. Make request
    const response = await authApi.post(
      "/api/users/profile-picture",
      formData,
      {
        headers:
          Platform.OS !== "web"
            ? { "Content-Type": "multipart/form-data" }
            : {},
        transformRequest: (data) => data,
      },
    );

    console.log("[PROFILE] Profile picture uploaded successfully");
    return response.data;
  } catch (error: any) {
    console.error(
      "[PROFILE ERROR] Failed to upload profile picture:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

/**
 * GET PROFILE PICTURE URL
 * Helper function to construct profile picture URL
 */
export const getProfilePictureUrl = (path: string): string => {
  if (!path) return "";
  // If path is already a full URL, return it
  if (path.startsWith("http")) return path;

  const baseUrl = AUTH_API_BASE_URL.replace(/\/$/, "");

  // If path already starts with / (e.g. /uploads/profiles/...), just append
  if (path.startsWith("/")) {
    return `${baseUrl}${path}`;
  }

  // Otherwise, construct URL
  return `${baseUrl}/uploads/profiles/${path}`;
};
