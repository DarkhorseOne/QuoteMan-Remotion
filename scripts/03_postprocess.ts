import fs from 'fs-extra';
import path from 'path';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import {
  PADDING_VERTICAL,
  OUTPUT_HEIGHT,
  AUTHOR_MARGIN_TOP,
  AUTHOR_FONT_SIZE,
} from '../remotion/constants';

type RawBoundary = {
  text: string;
  textOffset: number;
  wordLength: number;
  audioOffsetTicks: number;
  durationTicks?: number;
};

type WordTiming = {
  token: string;
  startSec: number;
  endSec: number;
  isAuthor?: boolean;
  isSeparator?: boolean;
};

type LayoutConfig = {
  mode: 'static' | 'scroll';
  contentHeight: number;
  scrollStartY?: number;
  scrollEndY?: number;
};

const QUOTES_PATH = path.join(process.cwd(), 'quotes', 'normalized.json');
const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets');

async function main() {
  const quotes = await fs.readJSON(QUOTES_PATH);
  console.log(`Processing ${quotes.length} quotes...`);

  for (const quote of quotes) {
    const id = quote.id;
    const tag = quote.tag || 'uncategorized';

    // Paths
    const timingDir = path.join(ASSETS_DIR, 'timing', tag);
    const layoutDir = path.join(ASSETS_DIR, 'layout', tag);
    const audioDir = path.join(ASSETS_DIR, 'audio', tag);

    await fs.ensureDir(timingDir);
    await fs.ensureDir(layoutDir);

    const rawTimingPath = path.join(timingDir, `${id}.raw.json`);
    const audioPath = path.join(audioDir, `${id}.mp3`);

    if (!fs.existsSync(rawTimingPath)) {
      console.warn(`[${id}] Missing raw timing. Skipping.`);
      continue;
    }

    if (!fs.existsSync(audioPath)) {
      console.warn(`[${id}] Missing audio file at ${audioPath}. Skipping.`);
      continue;
    }

    const rawTimings: RawBoundary[] = await fs.readJSON(rawTimingPath);

    let audioDuration = 0;
    try {
      audioDuration = await getAudioDurationInSeconds(audioPath);
    } catch (err) {
      console.warn(`[${id}] Could not get audio duration: ${err}. Using fallback.`);
      const last = rawTimings[rawTimings.length - 1];
      const endTicks = last.audioOffsetTicks + (last.durationTicks || 5000000);
      audioDuration = endTicks / 10000000 + 0.5;
    }

    const finalTimings: WordTiming[] = rawTimings.map((t, i) => {
      const startSec = t.audioOffsetTicks / 10000000;
      let endSec = startSec + (t.durationTicks ? t.durationTicks / 10000000 : 0);

      if (!t.durationTicks) {
        if (i < rawTimings.length - 1) {
          endSec = rawTimings[i + 1].audioOffsetTicks / 10000000;
        } else {
          endSec = audioDuration;
        }
      }

      return {
        token: t.text,
        startSec,
        endSec,
      };
    });

    // Identify author separator
    if (quote.author) {
      let separatorIndex = -1;
      let separatorType: 'sequence' | 'merged' = 'sequence';

      // Strategy 1: Look for sequence of 4 dots (Case A)
      for (let i = finalTimings.length - 4; i >= 0; i--) {
        if (
          finalTimings[i].token === '.' &&
          finalTimings[i + 1].token === '.' &&
          finalTimings[i + 2].token === '.' &&
          finalTimings[i + 3].token === '.'
        ) {
          separatorIndex = i;
          separatorType = 'sequence';
          break;
        }
      }

      // Strategy 2: Look for merged token containing ". . ." (Case B - 3 or more dots)
      // This handles ". . . . Author" and ". . . Author"
      if (separatorIndex === -1) {
        for (let i = finalTimings.length - 1; i >= 0; i--) {
          if (finalTimings[i].token.includes('. . .')) {
            separatorIndex = i;
            separatorType = 'merged';
            break;
          }
        }
      }

      if (separatorIndex !== -1) {
        if (separatorType === 'sequence') {
          // Mark separator tokens
          for (let i = separatorIndex; i < separatorIndex + 4; i++) {
            finalTimings[i].isSeparator = true;
          }
          // Mark author tokens
          for (let i = separatorIndex + 4; i < finalTimings.length; i++) {
            finalTimings[i].isAuthor = true;
          }
        } else {
          // Handle merged token
          // Strip the separator (dots and spaces) from the start of the token
          finalTimings[separatorIndex].token = finalTimings[separatorIndex].token
            .replace(/^(\.\s)+/, '') // Remove leading ". . " sequence
            .replace(/^\.\s*/, '') // Remove any remaining leading dot
            .trim();

          // Mark this token and all subsequent as author
          for (let i = separatorIndex; i < finalTimings.length; i++) {
            finalTimings[i].isAuthor = true;
          }
        }
      } else {
        console.warn(`[${id}] Author present but separator not found in timings.`);
      }
    }

    const CHARS_PER_LINE = 22;
    const LINE_HEIGHT = 130;
    const estimatedLines = Math.ceil(quote.text.length / CHARS_PER_LINE);
    let contentHeight = estimatedLines * LINE_HEIGHT;

    // Add author height to contentHeight calculation
    // This ensures scrolling logic accounts for the author text and margin
    if (quote.author) {
      contentHeight += AUTHOR_MARGIN_TOP + AUTHOR_FONT_SIZE * 1.5;
    }

    const VIEWPORT_HEIGHT = OUTPUT_HEIGHT - PADDING_VERTICAL * 2;
    const mode = contentHeight > VIEWPORT_HEIGHT ? 'scroll' : 'static';

    const layout: LayoutConfig = {
      mode,
      contentHeight,
    };

    if (mode === 'scroll') {
      layout.scrollStartY = OUTPUT_HEIGHT;
      layout.scrollEndY = -contentHeight;
    }

    await fs.writeJSON(path.join(timingDir, `${id}.json`), finalTimings, { spaces: 2 });
    await fs.writeJSON(path.join(layoutDir, `${id}.json`), layout, { spaces: 2 });

    console.log(`[${id}] Processed. Duration: ${audioDuration.toFixed(2)}s. Mode: ${mode}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
