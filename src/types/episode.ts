// ============================================
// EPISODE TYPE DEFINITIONS
// Compatible with both old Drama API and new Anime API
// ============================================

export interface VideoPath {
  quality: number;
  videoPath: string;
  isDefault: number;
  isVipEquity: number;
  // New anime API fields
  serverName?: string;
  serverId?: string;
}

export interface Cdn {
  cdnDomain: string;
  isDefault: number;
  videoPathList: VideoPath[];
}

export interface Episode {
  chapterId: string; // episodeId
  chapterIndex: number;
  chapterName: string;
  isCharge: number;
  cdnList: Cdn[];
  chapterImg: string;
  // New anime API fields
  defaultStreamingUrl?: string;
  duration?: string;
  releaseTime?: string;
}
