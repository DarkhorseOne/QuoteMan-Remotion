import { NextResponse } from 'next/server';
import { db, Quote } from '@/lib/db';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const NORMALIZED_PATH = path.join(process.cwd(), '..', 'quotes', 'normalized.json');
const ROOT_DIR = path.join(process.cwd(), '..');

function cleanText(raw: string): string {
  let text = raw;
  const delimiters = [' ― ', ' — ', ' - '];

  for (const delimiter of delimiters) {
    if (text.includes(delimiter)) {
      const parts = text.split(delimiter);
      parts.pop();
      text = parts.join(delimiter).trim();
      break;
    }
  }
  return text.replace(/^["“”]|["“”]$/g, '').trim();
}

export async function POST(request: Request) {
  const body = await request.json();
  const { quoteIds } = body;

  if (!quoteIds || !Array.isArray(quoteIds)) {
    return NextResponse.json({ error: 'Invalid quoteIds' }, { status: 400 });
  }

  const placeholders = quoteIds.map(() => '?').join(',');
  const quotes = db
    .prepare(`SELECT * FROM quotes WHERE id IN (${placeholders})`)
    .all(...quoteIds) as Quote[];

  const normalized = quotes.map((q) => ({
    id: q.id,
    text: cleanText(q.text),
    author: q.author || undefined,
    tag: q.tag || undefined,
    voice_gender: q.voice_gender || undefined,
    raw: q.text,
  }));

  await fs.writeJSON(NORMALIZED_PATH, normalized, { spaces: 2 });

  try {
    const { stderr } = await execAsync('npm run tts', { cwd: ROOT_DIR });
    if (stderr) console.error(stderr);

    const updateStmt = db.prepare("UPDATE quotes SET status = 'audio_ready' WHERE id = ?");
    const updateMany = db.transaction((ids: string[]) => {
      for (const id of ids) updateStmt.run(id);
    });
    updateMany(quoteIds);

    return NextResponse.json({ success: true, count: quotes.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, details: error.stderr }, { status: 500 });
  }
}
