import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'fs-extra';
import path from 'path';
import pLimit from 'p-limit';

const QUOTES_PATH = path.join(process.cwd(), 'quotes', 'normalized.json');
const OUT_DIR = path.join(process.cwd(), 'out');
const COMPOSITION_ID = 'QuoteVideo';
const CONCURRENCY = 2;

async function main() {
  await fs.ensureDir(OUT_DIR);
  
  console.log('📦 Bundling Remotion project...');
  const bundled = await bundle({
    entryPoint: path.join(process.cwd(), 'remotion', 'index.ts'),
  });
  console.log(`✅ Bundled to: ${bundled}`);

  // Copy public assets to bundle directory so they are served
  await fs.copy(path.join(process.cwd(), 'public', 'assets'), path.join(bundled, 'assets'));
  console.log('✅ Copied assets to bundle');

  const quotes = await fs.readJSON(QUOTES_PATH);
  console.log(`🎥 Starting batch render for ${quotes.length} quotes...`);

  const limit = pLimit(CONCURRENCY);

  const tasks = quotes.map((quote: any) => {
    return limit(async () => {
      const outFile = path.join(OUT_DIR, `${quote.id}.mp4`);
      
      if (fs.existsSync(outFile)) {
        console.log(`[${quote.id}] Skipped (Exists)`);
        return;
      }

      console.log(`[${quote.id}] Rendering...`);
      
      try {
        const composition = await selectComposition({
          serveUrl: bundled,
          id: COMPOSITION_ID,
          inputProps: { id: quote.id },
        });

        await renderMedia({
          composition,
          serveUrl: bundled,
          codec: 'h264',
          outputLocation: outFile,
          inputProps: { id: quote.id },
        });

        console.log(`[${quote.id}] ✅ Done`);
      } catch (err) {
        console.error(`[${quote.id}] ❌ Failed:`, err);
      }
    });
  });

  await Promise.all(tasks);
  console.log('🎉 Batch render complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
