import 'dotenv/config';
import fs from 'fs-extra';
import path from 'path';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import Database from 'better-sqlite3';

// Types
type QuoteNormalized = {
  id: string;
  text: string;
  author?: string;
  voice_gender?: string;
  tag?: string;
  raw: string;
};

type RawBoundary = {
  text: string;
  textOffset: number;
  wordLength: number;
  audioOffsetTicks: number;
  durationTicks?: number;
};

// Paths
const QUOTES_PATH = path.join(process.cwd(), 'quotes', 'normalized.json');
const AUDIO_DIR = path.join(process.cwd(), 'public', 'assets', 'audio');
const TIMING_DIR = path.join(process.cwd(), 'public', 'assets', 'timing');
const DB_PATH = path.join(process.cwd(), 'admin-dashboard', 'db', 'quotes.db');

// Azure Config
const SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

async function main() {
  await fs.ensureDir(AUDIO_DIR);
  await fs.ensureDir(TIMING_DIR);

  if (!fs.existsSync(QUOTES_PATH)) {
    throw new Error('Normalized quotes not found. Run "npm run normalize" first.');
  }

  const quotes: QuoteNormalized[] = await fs.readJSON(QUOTES_PATH);
  console.log(`Processing ${quotes.length} quotes...`);

  // Initialize DB
  const db = new Database(DB_PATH);
  const updateAudioPath = db.prepare('UPDATE quotes SET audio_path = ? WHERE id = ?');

  const mockMode = !SPEECH_KEY || !SPEECH_REGION;
  if (mockMode) {
    console.warn('⚠️  AZURE_SPEECH_KEY or REGION missing. Running in MOCK MODE.');
    console.warn('⚠️  Generated audio will be silent placeholders.');
  }

  for (const [index, quote] of quotes.entries()) {
    const tag = quote.tag || 'uncategorized';

    // Create tag subdirectories
    const audioTagDir = path.join(AUDIO_DIR, tag);
    const timingTagDir = path.join(TIMING_DIR, tag);
    await fs.ensureDir(audioTagDir);
    await fs.ensureDir(timingTagDir);

    const audioPath = path.join(audioTagDir, `${quote.id}.mp3`);
    const timingPath = path.join(timingTagDir, `${quote.id}.raw.json`);

    // Store relative path in DB (e.g., "public/assets/audio/motivational/q_123.mp3")
    // Or just relative from public/assets?
    // The requirement says "update audio_path". The previous code didn't use it much yet.
    // Let's store relative to project root to be safe and consistent.
    const relativeAudioPath = path.relative(process.cwd(), audioPath);

    if (fs.existsSync(audioPath) && fs.existsSync(timingPath)) {
      console.log(`[${quote.id}] Skipped (Cached)`);
      updateAudioPath.run(relativeAudioPath, quote.id);
      continue;
    }

    let voice = index % 2 === 0 ? 'en-GB-RyanNeural' : 'en-GB-LibbyNeural';
    if (quote.voice_gender === 'male') {
      voice = 'en-GB-RyanNeural';
    } else if (quote.voice_gender === 'female') {
      voice = 'en-GB-LibbyNeural';
    }

    console.log(`[${quote.id}] Synthesizing with ${voice}...`);

    if (mockMode) {
      await generateMockAssets(quote, audioPath, timingPath);
    } else {
      await synthesizeAzure(quote, voice, audioPath, timingPath);
    }

    updateAudioPath.run(relativeAudioPath, quote.id);
  }

  console.log('✅ TTS generation complete.');
}
async function synthesizeAzure(
  quote: QuoteNormalized,
  voice: string,
  audioPath: string,
  timingPath: string,
) {
  return new Promise<void>((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY!, SPEECH_REGION!);
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    speechConfig.speechSynthesisVoiceName = voice;

    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioPath);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    const boundaries: RawBoundary[] = [];

    synthesizer.wordBoundary = (s, e) => {
      boundaries.push({
        text: e.text,
        textOffset: e.textOffset,
        wordLength: e.wordLength,
        audioOffsetTicks: e.audioOffset,
        durationTicks: e.duration,
      });
    };
    const speechText = quote.author ? `${quote.text} . . . . ${quote.author}` : quote.text;
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-GB">
        <voice name="${voice}">
          <prosody rate="-10%" pitch="-5%">
            ${escapeXml(speechText)}
          </prosody>
        </voice>
      </speak>
    `;

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        synthesizer.close();

        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          fs.writeJSONSync(timingPath, boundaries, { spaces: 2 });
          resolve();
        } else {
          reject(new Error(`TTS Failed: ${result.errorDetails}`));
        }
      },
      (err) => {
        synthesizer.close();
        reject(err);
      },
    );
  });
}

async function generateMockAssets(quote: QuoteNormalized, audioPath: string, timingPath: string) {
  try {
    // Fetch a valid minimal MP3 file
    const res = await fetch('https://github.com/mathiasbynens/small/raw/master/mp3.mp3');
    if (!res.ok) throw new Error('Failed to fetch sample MP3');
    const arrayBuffer = await res.arrayBuffer();

    const frame = Buffer.from(arrayBuffer);
    const buffer = Buffer.concat(Array(200).fill(frame));

    await fs.writeFile(audioPath, buffer);
  } catch (e) {
    console.warn('Failed to fetch sample MP3, writing dummy buffer. Rendering WILL fail.', e);
    await fs.writeFile(audioPath, Buffer.alloc(1000));
  }

  const words = quote.text.split(' ');
  const boundaries: RawBoundary[] = words.map((word, i) => ({
    text: word,
    textOffset: 0,
    wordLength: word.length,
    audioOffsetTicks: i * 5000000,
    durationTicks: 4000000,
  }));

  await fs.writeJSON(timingPath, boundaries, { spaces: 2 });
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

async function runPostProcess() {
  console.log('🔄 Triggering auto-post-process...');
  const { exec } = await import('child_process');
  const util = await import('util');
  const execAsync = util.promisify(exec);
  try {
    const { stdout } = await execAsync('npm run postprocess');
    console.log(stdout);
  } catch (e: any) {
    console.error('Post-process failed:', e.message);
  }
}

main()
  .then(() => runPostProcess())
  .catch((err) => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
