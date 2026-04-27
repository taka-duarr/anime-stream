import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";

// ============================================
// ANIME API CONFIGURATION
// ============================================

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_ANIME_API_BASE_URL ||
  "https://www.sankavollerei.com/anime";

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

axiosRetry(api, {
  retries: 3,
  retryDelay: (retryCount: number) => {
    console.log(`[API RETRY] Menunggu server... Percobaan ke-${retryCount}`);
    return retryCount * 2000;
  },
  retryCondition: (error: AxiosError) => {
    const status = error.response?.status;
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

  // Wait for rate limit before making request
  await waitForRateLimit();

  console.log(`[FETCHING API] Menarik data dari Endpoint: ${url}`);
  try {
    const data = await fetcher();
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
    return response.data.data;
  });
};

/**
 * GET SERVER STREAMING URL
 * Endpoint: /server/{serverId}
 * Returns: Actual streaming URL from selected server
 * Note: Cache disabled for streaming URLs (they may expire)
 */
export const getServerStreamingUrl = async (serverId: string) => {
  // Wait for rate limit before making request
  await waitForRateLimit();

  console.log(`[FETCHING] /server/${serverId}`);
  try {
    const response = await api.get(`/server/${serverId}`);
    console.log(`[SUCCESS] /server/${serverId}`);
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
    return response.data.data;
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
    return response.data.data;
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
