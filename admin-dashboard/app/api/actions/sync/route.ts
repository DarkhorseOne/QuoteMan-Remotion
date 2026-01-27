import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execAsync = util.promisify(exec);
const ROOT_DIR = path.join(process.cwd(), '..');

export async function POST() {
  try {
    const { stdout, stderr } = await execAsync('npx tsx scripts/05_sync_drive.ts', {
      cwd: ROOT_DIR,
    });
    if (stderr) console.error(stderr);

    return NextResponse.json({ success: true, stdout });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, details: error.stderr }, { status: 500 });
  }
}
