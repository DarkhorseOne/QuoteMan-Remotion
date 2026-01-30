import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return new NextResponse('Missing path', { status: 400 });
  }

  // Resolve against project root (one level up from admin-dashboard)
  // process.cwd() is normally the root of the running Next.js app (admin-dashboard).
  const projectRoot = path.resolve(process.cwd(), '..');
  const absolutePath = path.join(projectRoot, filePath);

  // Security check
  const resolvedPath = path.resolve(absolutePath);
  if (!resolvedPath.startsWith(projectRoot)) {
    return new NextResponse('Access denied', { status: 403 });
  }

  if (!fs.existsSync(resolvedPath)) {
    return new NextResponse('File not found', { status: 404 });
  }

  const stat = fs.statSync(resolvedPath);

  const ext = path.extname(resolvedPath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.mp3') contentType = 'audio/mpeg';
  if (ext === '.mp4') contentType = 'video/mp4';

  const fileBuffer = fs.readFileSync(resolvedPath);
  const fileName = path.basename(resolvedPath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
