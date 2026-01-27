import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'admin-dashboard/db/quotes.db');
const db = new Database(dbPath);

console.log('Adding topics_en and topics_zh columns to quotes table...');

try {
  db.prepare('ALTER TABLE quotes ADD COLUMN topics_en TEXT').run();
  console.log('Success: topics_en column added.');
} catch (error: any) {
  if (error.message.includes('duplicate column name')) {
    console.log('Info: topics_en column already exists.');
  } else {
    console.error('Error adding topics_en:', error);
  }
}

try {
  db.prepare('ALTER TABLE quotes ADD COLUMN topics_zh TEXT').run();
  console.log('Success: topics_zh column added.');
} catch (error: any) {
  if (error.message.includes('duplicate column name')) {
    console.log('Info: topics_zh column already exists.');
  } else {
    console.error('Error adding topics_zh:', error);
  }
}

db.close();
