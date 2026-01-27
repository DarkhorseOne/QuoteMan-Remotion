import { NextResponse } from 'next/server';
import { db, Quote } from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

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
      // Prompt engineering: JSON output with 5 English and 5 Chinese topics, starting with #
      const prompt = `
        Analyze the following quote and generate 5 relevant hashtags in English and 5 in Chinese.
        The hashtags should be relevant to the quote's content, mood, and potential audience.
        Return strictly valid JSON with no other text:
        {
          "en": ["#topic1", "#topic2", ...],
          "zh": ["#话题1", "#话题2", ...]
        }

        Quote: "${quote.text}"
        Tag: "${quote.tag || ''}"
      `;

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a social media expert. Generate relevant hashtags.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          const topicsEn = parsed.en.join(' ');
          const topicsZh = parsed.zh.join(' ');

          updateStmt.run(topicsEn, topicsZh, quote.id);
          results.push({ id: quote.id, topics_en: topicsEn, topics_zh: topicsZh });
        } catch (e) {
          console.error(`Failed to parse JSON for quote ${quote.id}:`, e);
        }
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
