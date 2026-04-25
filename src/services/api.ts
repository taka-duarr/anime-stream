import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";
import { VipResponse } from "../types/drama";
import { Episode } from "../types/episode";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Timeout diperpanjang hingga 30 detik
});

// Konfigurasi axios-retry
axiosRetry(api, {
  retries: 3, // Coba lagi maksimal 3 kali
  retryDelay: (retryCount: number) => {
    console.log(`[API RETRY] Menunggu server... Percobaan ke-${retryCount}`);
    return retryCount * 2000; // jeda 2 detik, 4 detik, dst.
  },
  retryCondition: (error: AxiosError) => {
    // Jalankan retry jika status 429 atau 5xx
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

// Sederhana In-Memory Caching
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
    const data = await fetcher();
    cache[url] = { data, timestamp: now };
    console.log(`[API SUCCESS] Berhasil menarik data: ${url}`);
    return data;
  } catch (error) {
    console.error(`[API ERROR] Gagal menarik data dari: ${url}`, error);
    throw error;
  }
};

export const getVipDrama = async (page: number = 1): Promise<VipResponse> => {
  return fetchWithCache(`/dramabox/vip?page=${page}`, async () => {
    const response = await api.get<VipResponse>(`/dramabox/vip?page=${page}`);
    return response.data;
  });
};

export const getAllEpisodes = async (bookId: string): Promise<Episode[]> => {
  return fetchWithCache(`/dramabox/allepisode?bookId=${bookId}`, async () => {
    const res = await api.get<Episode[]>(
      `/dramabox/allepisode?bookId=${bookId}`,
    );
    return res.data;
  });
};

export const getLatestDrama = async (page: number = 1) => {
  return fetchWithCache(`/dramabox/latest?page=${page}`, async () => {
    const res = await api.get(`/dramabox/latest?page=${page}`);
    return res.data;
  });
};

export const getSearchDrama = async (query: string, page: number = 1) => {
  const encodedQuery = encodeURIComponent(query);
  return fetchWithCache(`/dramabox/search?query=${encodedQuery}&page=${page}`, async () => {
    const res = await api.get(`/dramabox/search?query=${encodedQuery}&page=${page}`);
    return res.data;
  });
};

export const getTrendingDrama = async (page: number = 1) => {
  return fetchWithCache(`/dramabox/trending?page=${page}`, async () => {
    const res = await api.get(`/dramabox/trending?page=${page}`);
    return res.data;
  });
};

export const getForYouDrama = async (page: number = 1) => {
  return fetchWithCache(`/dramabox/foryou?page=${page}`, async () => {
    const res = await api.get(`/dramabox/foryou?page=${page}`);
    return res.data;
  });
};

export const getDetailDrama = async (bookId: string) => {
  return fetchWithCache(`/dramabox/detail?bookId=${bookId}`, async () => {
    const res = await api.get(`/dramabox/detail?bookId=${bookId}`);
    return res.data;
  });
};

// SERVER 2: NETSHORT API
export const NETSHORT_BASE_URL = process.env.EXPO_PUBLIC_NETSHORT_BASE_URL || "https://netshort.sansekai.my.id/api";

const netshortApi = axios.create({
  baseURL: NETSHORT_BASE_URL,
  timeout: 30000,
});

axiosRetry(netshortApi, {
  retries: 3,
  retryDelay: (retryCount: number) => {
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

export const getNetshortForYou = async (page: number = 1): Promise<any> => {
  return fetchWithCache(`/netshort/foryou?page=${page}`, async () => {
    const res = await netshortApi.get(`/netshort/foryou?page=${page}`);
    return res.data;
  });
};

export const getNetshortSearch = async (query: string): Promise<any> => {
  const encodedQuery = encodeURIComponent(query);
  return fetchWithCache(`/netshort/search?query=${encodedQuery}`, async () => {
    const res = await netshortApi.get(`/netshort/search?query=${encodedQuery}`);
    return res.data;
  });
};

export const getNetshortDetailAndEpisodes = async (shortPlayId: string): Promise<{ detail: any, episodes: any[] }> => {
  return fetchWithCache(`/netshort/allepisode?shortPlayId=${shortPlayId}`, async () => {
    const response = await netshortApi.get(`/netshort/allepisode?shortPlayId=${shortPlayId}`);
    
    // Asumsi response.data langsung berupa Object Server 2 detail
    const detailData = response.data || {};
    const shortPlayEpisodeInfos = detailData.shortPlayEpisodeInfos || [];

    // Mapping ke schema Server 1 (Episode) agar komponen video player / episode screen bisa recycle logika
    const mappedEpisodes: any[] = shortPlayEpisodeInfos.map((ep: any) => ({
      chapterId: ep.episodeId,
      chapterIndex: ep.episodeNo,
      chapterName: `Episode ${ep.episodeNo}`,
      isCharge: ep.isLock ? 1 : 0,
      chapterImg: ep.episodeCover || detailData.shortPlayCover,
      
      // Original Server 2 properties for VideoScreen2
      episodeId: ep.episodeId,
      episodeNo: ep.episodeNo,
      playVoucher: ep.playVoucher,
      playClarity: ep.playClarity,
      subtitleList: ep.subtitleList || [],

      cdnList: [
        {
          cdnDomain: "awscdn.netshort.com",
          isDefault: 1,
          videoPathList: [
            {
              quality: parseInt(ep.playClarity) || 1080,
              videoPath: ep.playVoucher,
              isDefault: 1,
              isVipEquity: ep.isLock ? 1 : 0,
            }
          ]
        }
      ]
    }));

    // Mapping fields khusus Detail ke format Server 1 supaya UI EpisodeScreen tetap jalan
    const mappedDetail = {
      bookName: detailData.shortPlayName,
      coverWap: detailData.shortPlayCover,
      introduction: detailData.shotIntroduce,
      score: 9.0, // fallback
      tags: detailData.shortPlayLabels || []
    };

    return { detail: mappedDetail, episodes: mappedEpisodes };
  });
};
