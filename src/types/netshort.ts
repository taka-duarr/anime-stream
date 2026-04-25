export interface NetshortContentInfo {
  shortPlayId: string;
  shortPlayLibraryId: string;
  shortPlayName: string;
  shortPlayLabels: string;
  labelArray: string[];
  isNewLabel: boolean;
  labelLanguageIds: string[];
  shortPlayCover: string;
  isChase: boolean;
  script: number;
  scriptName: string;
  scriptType: number;
  highImage: string;
  isNeedHighImage: boolean;
  heatScoreShow: string;
}

export interface NetshortForYouResponse {
  contentType: number;
  groupId: string;
  contentName: string;
  contentModel: number;
  contentInfos: NetshortContentInfo[];
}
