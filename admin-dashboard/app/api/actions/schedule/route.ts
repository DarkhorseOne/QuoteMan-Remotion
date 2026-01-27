import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const { quoteIds, startDate, frequency, platform, status } = body;

  if (!quoteIds || !Array.isArray(quoteIds)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const targetPlatform = platform || 'google_drive';
  const targetStatus = status || 'scheduled';

  let start: Date | null = null;
  let interval = 0;

  if (startDate) {
    start = new Date(startDate);
    const freqMap: Record<string, number> = {
      daily: 24 * 60 * 60 * 1000,
      hourly: 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
    };
    interval = freqMap[frequency] || freqMap['daily'];
  }

  const upsertStmt = db.prepare(`
    INSERT INTO publishing (quote_id, platform, scheduled_time, posted_status)
    VALUES (@quote_id, @platform, @scheduled_time, @posted_status)
    ON CONFLICT(id) DO UPDATE SET
        scheduled_time = excluded.scheduled_time,
        posted_status = excluded.posted_status
  `);

  const deleteStmt = db.prepare('DELETE FROM publishing WHERE quote_id = ? AND platform = ?');
  const insertStmt = db.prepare(`
    INSERT INTO publishing (quote_id, platform, scheduled_time, posted_status)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = db.transaction((ids: string[]) => {
    ids.forEach((id: string, index: number) => {
      const existing = db
        .prepare('SELECT id FROM publishing WHERE quote_id = ? AND platform = ?')
        .get(id, targetPlatform) as { id: number } | undefined;

      let timeStr = null;
      if (start) {
        const time = new Date(start.getTime() + index * interval);
        timeStr = time.toISOString();
      }

      if (existing) {
        db.prepare('UPDATE publishing SET scheduled_time = ?, posted_status = ? WHERE id = ?').run(
          timeStr,
          targetStatus,
          existing.id,
        );
      } else {
        insertStmt.run(id, targetPlatform, timeStr, targetStatus);
      }
    });
  });

  try {
    transaction(quoteIds);
    return NextResponse.json({ success: true, count: quoteIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
