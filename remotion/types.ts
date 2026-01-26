export type WordTiming = {
  token: string;
  startSec: number;
  endSec: number;
};

export type LayoutConfig = {
  mode: 'static' | 'scroll';
  contentHeight: number;
  scrollStartY?: number;
  scrollEndY?: number;
};
