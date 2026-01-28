import { NextResponse } from 'next/server';
import { db, Quote } from '@/lib/db';

import { generateTopics } from '@/lib/ai-service';

export async function POST(request: Request) {
  try {
    const { quoteIds } = await request.json();

    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      return NextResponse.json({ error: 'Invalid quoteIds' }, { status: 400 });
    }

    const placeholders = quoteIds.map(() => '?').join(',');
    const quotes = db
      .prepare(`SELECT * FROM quotes WHERE id IN (${placeholders})`)
      .all(...quoteIds) as Quote[];

    if (quotes.length === 0) {
      return NextResponse.json({ error: 'No quotes found' }, { status: 404 });
    }

    const results = [];
    const updateStmt = db.prepare('UPDATE quotes SET topics_en = ?, topics_zh = ? WHERE id = ?');

    // Process sequentially to avoid rate limits
    for (const quote of quotes) {
      const topics = await generateTopics(quote.text, quote.tag || '');
      if (topics) {
        updateStmt.run(topics.en, topics.zh, quote.id);
        results.push({ id: quote.id, topics_en: topics.en, topics_zh: topics.zh });
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
      stdout: `Generated topics for ${results.length} quotes.`,
    });
  } catch (error: any) {
    console.error('Topic generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
