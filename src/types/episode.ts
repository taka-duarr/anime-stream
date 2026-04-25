export interface VideoPath {
  quality: number;
  videoPath: string;
  isDefault: number;
  isVipEquity: number;
}

export interface Cdn {
  cdnDomain: string;
  isDefault: number;
  videoPathList: VideoPath[];
}

export interface Episode {
  chapterId: string;
  chapterIndex: number;
  chapterName: string;
  isCharge: number;
  cdnList: Cdn[];
  chapterImg: string;
}
