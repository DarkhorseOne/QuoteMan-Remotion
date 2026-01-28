import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs-extra';

const execAsync = util.promisify(exec);
const ROOT_DIR = path.join(process.cwd(), '..');
const NORMALIZED_PATH = path.join(process.cwd(), '..', 'quotes', 'normalized.json');

export async function POST() {
  try {
    const ASSETS_DIR = path.join(ROOT_DIR, 'public', 'assets');
    const timingDir = path.join(ASSETS_DIR, 'timing');

    const needsPostProcess = !fs.existsSync(timingDir) || fs.readdirSync(timingDir).length === 0;

    if (needsPostProcess) {
      console.log('Triggering pre-render postprocess...');
      await execAsync('npm run postprocess', { cwd: ROOT_DIR });
    }

    const { stdout, stderr } = await execAsync('npm run batch-render', { cwd: ROOT_DIR });
    if (stderr) console.error(stderr);

    if (fs.existsSync(NORMALIZED_PATH)) {
      const quotes = await fs.readJSON(NORMALIZED_PATH);
      const ids = quotes.map((q: any) => q.id);

      const updateStmt = db.prepare("UPDATE quotes SET status = 'rendered' WHERE id = ?");
      const updateMany = db.transaction((ids: string[]) => {
        for (const id of ids) updateStmt.run(id);
      });
      updateMany(ids);
    }

    return NextResponse.json({ success: true, stdout });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, details: error.stderr }, { status: 500 });
  }
}
