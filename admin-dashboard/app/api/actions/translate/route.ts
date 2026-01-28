import { NextResponse } from 'next/server';
import { db, Quote } from '@/lib/db';

import { translate } from '@/lib/ai-service';

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
    const updateStmt = db.prepare('UPDATE quotes SET text_zh = ? WHERE id = ?');

    // Process sequentially to avoid rate limits
    for (const quote of quotes) {
      if (quote.text_zh) {
        // Skip logic could be added here if needed
      }

      const translatedText = await translate(quote.text);

      if (translatedText) {
        updateStmt.run(translatedText, quote.id);
        results.push({ id: quote.id, text_zh: translatedText });
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
      stdout: `Translated ${results.length} quotes.`,
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
