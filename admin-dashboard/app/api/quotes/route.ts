import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const tag = searchParams.get('tag');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const platform = searchParams.get('platform');
  const translated = searchParams.get('translated');
  const hasTopics = searchParams.get('has_topics');

  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (tag) {
    whereClause += ' AND tag = ?';
    params.push(tag);
  }

  if (search) {
    whereClause += ' AND (text LIKE ? OR author LIKE ?)';
    params.push(`%${search}%`);
    params.push(`%${search}%`);
  }

  if (status) {
    if (['scheduled', 'posted', 'failed'].includes(status)) {
      whereClause += ` AND EXISTS (SELECT 1 FROM publishing p WHERE p.quote_id = quotes.id AND p.posted_status = ?)`;
      params.push(status);
    } else {
      whereClause += ' AND status = ?';
      params.push(status);
    }
  }

  if (translated === 'yes') {
    whereClause += " AND text_zh IS NOT NULL AND text_zh <> ''";
  } else if (translated === 'no') {
    whereClause += " AND (text_zh IS NULL OR text_zh = '')";
  }

  if (hasTopics === 'yes') {
    whereClause += ' AND (topics_en IS NOT NULL OR topics_zh IS NOT NULL)';
  } else if (hasTopics === 'no') {
    whereClause += ' AND (topics_en IS NULL AND topics_zh IS NULL)';
  }

  if (platform) {
    whereClause += ` AND EXISTS (SELECT 1 FROM publishing p WHERE p.quote_id = quotes.id AND p.platform = ?)`;
    params.push(platform);
  }

  const query = `SELECT * FROM quotes ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const countQuery = `SELECT COUNT(*) as total FROM quotes ${whereClause}`;

  const stmt = db.prepare(query);
  const countStmt = db.prepare(countQuery);

  const quotes = stmt.all(...params, limit, offset) as any[];
  const totalResult = countStmt.get(...params) as { total: number };

  if (quotes.length === 0) {
    return NextResponse.json({
      data: [],
      meta: {
        total: 0,
        page,
        limit,
        totalPages: 0,
      },
    });
  }

  const quoteIds = quotes.map((q) => q.id);
  const placeholders = quoteIds.map(() => '?').join(',');

  const pubStmt = db.prepare(`SELECT * FROM publishing WHERE quote_id IN (${placeholders})`);
  const publishingRecords = pubStmt.all(...quoteIds) as any[];

  const quotesWithPub = quotes.map((q: any) => {
    const pubs = publishingRecords.filter((p: any) => p.quote_id === q.id);
    return {
      ...q,
      publishing: pubs,
    };
  });

  return NextResponse.json({
    data: quotesWithPub,
    meta: {
      total: totalResult.total,
      page,
      limit,
      totalPages: Math.ceil(totalResult.total / limit),
    },
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const stmt = db.prepare('UPDATE quotes SET status = ? WHERE id = ?');
    const result = stmt.run(status, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
