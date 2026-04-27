// ============================================
// ANIME TYPE DEFINITIONS
// API: Sanka Vollerei Anime API
// ============================================

// ============================================
// COMMON TYPES
// ============================================

export interface Genre {
  title: string;
  genreId: string;
  href: string;
  otakudesuUrl?: string;
}

// ============================================
// ANIME TYPES (Compatible with old Drama types)
// ============================================

export interface TagV3 {
  tagId: number;
  tagName: string;
  tagEnName: string;
}

export interface Drama {
  bookId: string; // animeId
  bookName: string; // title
  coverWap: string; // poster
  chapterCount: number; // totalEpisodes
  introduction: string; // synopsis
  tags: string[];
  tagV3s: TagV3[];
  playCount: string;
}

export interface Column {
  columnId: number;
  title: string;
  style: string;
  bookList: Drama[];
}

export interface VipResponse {
  bannerList: any[];
  watchHistory: any[];
  columnVoList: Column[];
}

// ============================================
// NEW ANIME TYPES
// ============================================

export interface Anime {
  animeId: string;
  title: string;
  poster: string;
  score?: string;
  type?: string;
  status?: string;
  totalEpisodes?: number;
  href: string;
  otakudesuUrl?: string;
}

export interface AnimeDetail {
  animeId: string;
  title: string;
  poster: string;
  japanese?: string;
  synonyms?: string;
  score: string;
  producers?: string;
  type: string;
  status: string;
  totalEpisodes: number;
  duration: string;
  releaseDate?: string;
  studios?: string;
  genreList: Genre[];
  synopsis: {
    paragraphs: string[];
  };
  episodeList: EpisodeListItem[];
  batchList?: BatchItem[];
}

export interface EpisodeListItem {
  title: string;
  eps: string;
  date: string;
  episodeId: string;
  href: string;
  otakudesuUrl?: string;
}

export interface BatchItem {
  title: string;
  batchId: string;
  href: string;
  otakudesuUrl?: string;
}

// ============================================
// HOME PAGE TYPES
// ============================================

export interface HomeData {
  ongoingAnime: Anime[];
  completeAnime: Anime[];
}

// ============================================
// EPISODE TYPES
// ============================================

export interface EpisodeDetail {
  title: string;
  animeId: string;
  releaseTime: string;
  defaultStreamingUrl: string;
  hasPrevEpisode: boolean;
  prevEpisode?: EpisodeNavigation;
  hasNextEpisode: boolean;
  nextEpisode?: EpisodeNavigation;
  serverqualities: ServerQuality[];
  downloadUrlqualities: DownloadQuality[];
  info: EpisodeInfo;
  episodeList: EpisodeListItem[];
}

export interface EpisodeNavigation {
  title: string;
  episodeId: string;
  href: string;
  otakudesuUrl?: string;
}

export interface ServerQuality {
  title: string; // "360p", "480p", "720p"
  serverList: StreamingServer[];
}

export interface StreamingServer {
  title: string; // "otakuwatch5", "odstream", "vidhide", "mega"
  serverId: string;
  href: string;
}

export interface DownloadQuality {
  title: string; // "360p", "480p", "720p"
  size: string;
  urls: DownloadUrl[];
}

export interface DownloadUrl {
  title: string;
  url: string;
}

export interface EpisodeInfo {
  credit: string;
  encoder: string;
  duration: string;
  type: string;
  genreList: Genre[];
}
