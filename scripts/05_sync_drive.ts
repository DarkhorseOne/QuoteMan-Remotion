import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';
import Database from 'better-sqlite3';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const OUT_DIR = path.join(process.cwd(), 'out');
const DB_PATH = path.join(process.cwd(), 'admin-dashboard', 'db', 'quotes.db');

async function main() {
  const db = new Database(DB_PATH);

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(
      '❌ credentials.json not found. Please download OAuth 2.0 Client ID JSON from Google Cloud Console.',
    );
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: SCOPES,
  });

  const drive = google.drive({ version: 'v3', auth });

  const quotesToSync = db
    .prepare(
      `
    SELECT q.id, q.text, q.author 
    FROM quotes q
    LEFT JOIN publishing p ON q.id = p.quote_id
    WHERE q.status = 'rendered' 
      AND (p.drive_file_id IS NULL OR p.drive_file_id = '')
  `,
    )
    .all() as any[];

  console.log(`Found ${quotesToSync.length} quotes to sync.`);

  let folderId: string | undefined;

  const folderName = 'QuoteMan Videos';
  const folderRes = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (folderRes.data.files && folderRes.data.files.length > 0) {
    folderId = folderRes.data.files[0].id!;
    console.log(`📂 Using existing folder: ${folderName} (${folderId})`);
  } else {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    folderId = folder.data.id!;
    console.log(`📂 Created folder: ${folderName} (${folderId})`);
  }

  for (const quote of quotesToSync) {
    const filePath = path.join(OUT_DIR, `${quote.id}.mp4`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Video file missing for ${quote.id}, skipping.`);
      continue;
    }

    console.log(`⬆️ Uploading ${quote.id}...`);

    const fileMetadata = {
      name: `quote_${quote.id}.mp4`,
      parents: [folderId],
    };
    const media = {
      mimeType: 'video/mp4',
      body: fs.createReadStream(filePath),
    };

    try {
      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
      });

      const driveId = file.data.id;
      console.log(`✅ Uploaded ${quote.id} -> ${driveId}`);

      const insertPub = db.prepare(`
        INSERT INTO publishing (quote_id, platform, drive_file_id, posted_status)
        VALUES (?, 'google_drive', ?, 'uploaded')
      `);
      insertPub.run(quote.id, driveId);

      const updateQuote = db.prepare(`
        UPDATE quotes SET status = 'published' WHERE id = ?
      `);
      updateQuote.run(quote.id);
    } catch (err) {
      console.error(`❌ Failed to upload ${quote.id}:`, err);
    }
  }
}

main().catch(console.error);
