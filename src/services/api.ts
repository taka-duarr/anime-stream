import axios from "axios";

// ============================================
// ANIME API CONFIGURATION
// ============================================

export const API_BASE_URL = process.env.EXPO_PUBLIC_ANIME_API_BASE_URL || "";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
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
    await new Promise((resolve) => setTimeout(resolve, timeUntilReset + 100));
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
    await new Promise((resolve) =>
      setTimeout(resolve, circuitBreakerOpenUntil - now),
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
      await new Promise((resolve) => setTimeout(resolve, delay));
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
): Promise<T> => {
  const now = Date.now();
  if (cache[url] && now - cache[url].timestamp < CACHE_EXPIRATION_MS) {
    console.log(`[CACHE HIT] Mengambil ${url} dari Memori lokal`);
    return cache[url].data;
  }

  console.log(`[FETCHING API] Menarik data dari Endpoint: ${url}`);
  try {
    // Use manual retry with rate limit tracking
    const data = await retryWithRateLimit(fetcher);
    cache[url] = { data, timestamp: now };
    console.log(`[API SUCCESS] Berhasil menarik data: ${url}`);
    return data;
  } catch (error) {
    console.error(`[API ERROR] Gagal menarik data dari: ${url}`, error);
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
  });
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
