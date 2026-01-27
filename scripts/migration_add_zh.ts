import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'admin-dashboard/db/quotes.db');
const db = new Database(dbPath);

console.log('Adding text_zh column to quotes table...');

try {
  db.prepare('ALTER TABLE quotes ADD COLUMN text_zh TEXT').run();
  console.log('Success: text_zh column added.');
} catch (error: any) {
  if (error.message.includes('duplicate column name')) {
    console.log('Info: text_zh column already exists.');
  } else {
    console.error('Error adding column:', error);
    process.exit(1);
  }
}

db.close();
