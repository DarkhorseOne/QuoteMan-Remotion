import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const stmt = db.prepare('SELECT DISTINCT tag FROM quotes WHERE tag IS NOT NULL ORDER BY tag ASC');
  const tags = stmt.all();
  return NextResponse.json(tags);
}
