import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { quoteIds } = await request.json();

    if (!quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0) {
      return NextResponse.json({ error: 'No quote IDs provided' }, { status: 400 });
    }

    const placeholders = quoteIds.map(() => '?').join(',');

    // Strict check: Only update quotes that are currently 'rendered'
    const stmt = db.prepare(
      `UPDATE quotes SET status = 'published' WHERE id IN (${placeholders}) AND status = 'rendered'`,
    );

    const result = stmt.run(...quoteIds);

    return NextResponse.json({
      success: true,
      stdout: `Published ${result.changes} quotes. (Skipped ${quoteIds.length - result.changes} non-rendered quotes)`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
