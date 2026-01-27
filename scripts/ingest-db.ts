import fs from 'fs-extra';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = path.join(process.cwd(), 'admin-dashboard', 'db', 'quotes.db');
const BANK_PATH = path.join(process.cwd(), 'quotes', 'bank');

async function main() {
  console.log('📦 Initializing Database at:', DB_PATH);

  fs.ensureDirSync(path.dirname(DB_PATH));
  const db = new Database(DB_PATH);

  // Create Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      author TEXT,
      tag TEXT,
      voice_gender TEXT,
      status TEXT DEFAULT 'pending',
      audio_path TEXT,
      video_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS publishing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id TEXT REFERENCES quotes(id),
      platform TEXT,
      scheduled_time DATETIME,
      posted_status TEXT,
      drive_file_id TEXT
    );
  `);

  console.log('✅ Tables ensured.');

  // Read Bank
  if (!fs.existsSync(BANK_PATH)) {
    console.error('❌ Bank path not found:', BANK_PATH);
    process.exit(1);
  }

  const files = fs.readdirSync(BANK_PATH).filter((f) => f.endsWith('.json'));
  console.log(`found ${files.length} json files in bank.`);

  const insert = db.prepare(`
    INSERT INTO quotes (id, text, author, tag, voice_gender)
    VALUES (@id, @text, @author, @tag, @voice_gender)
    ON CONFLICT(id) DO UPDATE SET
      text = excluded.text,
      author = excluded.author,
      tag = excluded.tag,
      voice_gender = excluded.voice_gender
  `);

  const insertMany = db.transaction((quotes: any[]) => {
    for (const quote of quotes) {
      insert.run({
        id: quote.id,
        text: quote.quote,
        author: quote.author,
        tag: quote.tag,
        voice_gender: quote.voice_gender,
      });
    }
  });

  let total = 0;
  for (const file of files) {
    const filePath = path.join(BANK_PATH, file);
    const data = await fs.readJSON(filePath);
    if (Array.isArray(data)) {
      insertMany(data);
      total += data.length;
      console.log(`   Imported ${data.length} from ${file}`);
    }
  }

  console.log(`🎉 Ingestion complete. Total quotes: ${total}`);
}

main().catch(console.error);
