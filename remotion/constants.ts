export const OUTPUT_WIDTH = 1440;
export const OUTPUT_HEIGHT = 2560;
export const FPS = 60;

export const LEAD_IN_MS = 300;
export const LEAD_OUT_MS = 330;

export const LEAD_IN_FRAMES = Math.round((LEAD_IN_MS / 1000) * FPS);
export const LEAD_OUT_FRAMES = Math.round((LEAD_OUT_MS / 1000) * FPS);

export const BG_COLOR = '#070707';
export const TEXT_DEFAULT = '#dddddd';
export const TEXT_ACTIVE = '#ffffff';

export const GLOW_COLOR = 'rgba(255, 255, 255, 0.9)';
export const GLOW_BLUR_RADIUS = '12px';
export const GLOW_SPREAD_RADIUS = '9px';

export const ACTIVE_WORD_SHADOW = `0 0 ${GLOW_BLUR_RADIUS} ${GLOW_COLOR}, 0 0 ${parseInt(GLOW_BLUR_RADIUS) * 2}px ${GLOW_COLOR}`;

export const ACTIVE_WORD_STROKE = '0px rgba(248, 8, 8, 0.95)';

// Layout & Typography
export const PADDING_HORIZONTAL = 120;
export const PADDING_VERTICAL = 240;
export const FONT_SIZE = 120;
export const WORD_GAP = 36;
export const FONT_FAMILY = '"Andale Mono", "Arial Narrow", sans-serif';
export const TEXT_ALIGN: 'left' | 'center' | 'right' = 'left';
export const AUTHOR_FONT_SIZE = 72;
export const AUTHOR_COLOR = '#aaaaaa';
export const AUTHOR_MARGIN_TOP = 100;

export const COPYRIGHT_TEXT = 'Made With ❤️  DHO.AI';
export const COPYRIGHT_HEIGHT = 80;
