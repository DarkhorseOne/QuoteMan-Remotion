import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import fs from 'fs-extra';
import path from 'path';
import pLimit from 'p-limit';
import Database from 'better-sqlite3';

const QUOTES_PATH = path.join(process.cwd(), 'quotes', 'normalized.json');
const OUT_DIR = path.join(process.cwd(), 'out');
const DB_PATH = path.join(process.cwd(), 'admin-dashboard', 'db', 'quotes.db');
const COMPOSITION_ID = 'QuoteVideo';
const CONCURRENCY = 2;

async function main() {
  await fs.ensureDir(OUT_DIR);

  // Initialize DB
  const db = new Database(DB_PATH);
  const updateVideoPath = db.prepare('UPDATE quotes SET video_path = ? WHERE id = ?');

  console.log('📦 Bundling Remotion project...');
  const bundled = await bundle({
    entryPoint: path.join(process.cwd(), 'remotion', 'index.ts'),
  });
  console.log(`✅ Bundled to: ${bundled}`);

  // Copy public assets to bundle directory so they are served
  await fs.copy(path.join(process.cwd(), 'public', 'assets'), path.join(bundled, 'assets'));
  console.log('✅ Copied assets to bundle');

  const args = process.argv.slice(2);
  const idArgIndex = args.indexOf('--id');
  const targetId = idArgIndex !== -1 ? args[idArgIndex + 1] : null;

  let quotes = await fs.readJSON(QUOTES_PATH);

  if (targetId) {
    console.log(`🎯 Target ID specified: ${targetId}`);
    quotes = quotes.filter((q: any) => q.id === targetId);
    if (quotes.length === 0) {
      console.error(`❌ Quote with ID ${targetId} not found.`);
      process.exit(1);
    }
  }

  console.log(`🎥 Starting batch render for ${quotes.length} quotes...`);

  const limit = pLimit(CONCURRENCY);

  const tasks = quotes.map((quote: any) => {
    return limit(async () => {
      const tag = quote.tag || 'uncategorized';
      const tagDir = path.join(OUT_DIR, tag);
      await fs.ensureDir(tagDir);

      const outFile = path.join(tagDir, `${quote.id}.mp4`);
      const relativeVideoPath = path.relative(process.cwd(), outFile);

      if (fs.existsSync(outFile)) {
        console.log(`[${quote.id}] Skipped (Exists)`);
        updateVideoPath.run(relativeVideoPath, quote.id);
        return;
      }

      console.log(`[${quote.id}] Rendering...`);

      try {
        const composition = await selectComposition({
          serveUrl: bundled,
          id: COMPOSITION_ID,
          inputProps: { id: quote.id, tag },
        });

        await renderMedia({
          composition,
          serveUrl: bundled,
          codec: 'h264',
          outputLocation: outFile,
          inputProps: { id: quote.id, tag },
        });

        updateVideoPath.run(relativeVideoPath, quote.id);
        console.log(`[${quote.id}] ✅ Done`);
      } catch (err) {
        console.error(`[${quote.id}] ❌ Failed:`, err);
      }
    });
  });

  await Promise.all(tasks);
  console.log('🎉 Batch render complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
