import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'db', 'quotes.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export type Quote = {
  id: string;
  text: string;
  text_zh?: string | null;
  author: string | null;
  tag: string | null;
  voice_gender: string | null;
  status: 'pending' | 'audio_ready' | 'rendered' | 'published';
  audio_path: string | null;
  video_path: string | null;
  created_at: string;
};

export type Publishing = {
  id: number;
  quote_id: string;
  platform: string;
  scheduled_time: string | null;
  posted_status: 'scheduled' | 'posted' | 'failed';
  drive_file_id: string | null;
};
