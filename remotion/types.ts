export type WordTiming = {
  token: string;
  startSec: number;
  endSec: number;
  isAuthor?: boolean;
  isSeparator?: boolean;
};

export type LayoutConfig = {
  mode: 'static' | 'scroll';
  contentHeight: number;
  scrollStartY?: number;
  scrollEndY?: number;
};
