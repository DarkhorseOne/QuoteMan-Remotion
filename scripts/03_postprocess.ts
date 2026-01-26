import fs from 'fs-extra';
import path from 'path';
import { getAudioDurationInSeconds } from '@remotion/media-utils';

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
    const rawTimingPath = path.join(ASSETS_DIR, 'timing', `${id}.raw.json`);
    const audioPath = path.join(ASSETS_DIR, 'audio', `${id}.mp3`);
    
    if (!fs.existsSync(rawTimingPath)) {
      console.warn(`[${id}] Missing raw timing. Skipping.`);
      continue;
    }

    const rawTimings: RawBoundary[] = await fs.readJSON(rawTimingPath);
    
    let audioDuration = 0;
    try {
      audioDuration = await getAudioDurationInSeconds(audioPath);
    } catch (e) {
      console.warn(`[${id}] Could not get audio duration (Mock mode?). Using fallback.`);
      const last = rawTimings[rawTimings.length - 1];
      const endTicks = last.audioOffsetTicks + (last.durationTicks || 5000000);
      audioDuration = (endTicks / 10000000) + 0.5; 
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
        endSec
      };
    });

    const CHARS_PER_LINE = 22; 
    const LINE_HEIGHT = 130; 
    const estimatedLines = Math.ceil(quote.text.length / CHARS_PER_LINE);
    const contentHeight = estimatedLines * LINE_HEIGHT;
    
    const VIEWPORT_HEIGHT = 2560 - 240 - 240; 
    const mode = contentHeight > VIEWPORT_HEIGHT ? 'scroll' : 'static';

    const layout: LayoutConfig = {
      mode,
      contentHeight
    };

    if (mode === 'scroll') {
      layout.scrollStartY = 2560 - 240; 
      layout.scrollEndY = -contentHeight - 240;
    }

    await fs.writeJSON(path.join(ASSETS_DIR, 'timing', `${id}.json`), finalTimings, { spaces: 2 });
    await fs.writeJSON(path.join(ASSETS_DIR, 'layout', `${id}.json`), layout, { spaces: 2 });
    
    console.log(`[${id}] Processed. Duration: ${audioDuration.toFixed(2)}s. Mode: ${mode}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
