export interface TagV3 {
  tagId: number;
  tagName: string;
  tagEnName: string;
}

export interface Drama {
  bookId: string;
  bookName: string;
  coverWap: string;
  chapterCount: number;
  introduction: string;
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
