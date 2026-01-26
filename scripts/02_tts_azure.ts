import 'dotenv/config';
import fs from 'fs-extra';
import path from 'path';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

import { execSync } from 'child_process';

// Types
type QuoteNormalized = {
  id: string;
  text: string;
  author?: string;
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

  const mockMode = !SPEECH_KEY || !SPEECH_REGION;
  if (mockMode) {
    console.warn('⚠️  AZURE_SPEECH_KEY or REGION missing. Running in MOCK MODE.');
    console.warn('⚠️  Generated audio will be silent placeholders.');
  }

  for (const [index, quote] of quotes.entries()) {
    const audioPath = path.join(AUDIO_DIR, `${quote.id}.mp3`);
    const timingPath = path.join(TIMING_DIR, `${quote.id}.raw.json`);

    if (fs.existsSync(audioPath) && fs.existsSync(timingPath)) {
      console.log(`[${quote.id}] Skipped (Cached)`);
      continue;
    }

    const voice = index % 2 === 0 ? 'en-GB-RyanNeural' : 'en-GB-LibbyNeural';
    
    console.log(`[${quote.id}] Synthesizing with ${voice}...`);

    if (mockMode) {
      await generateMockAssets(quote, audioPath, timingPath);
    } else {
      await synthesizeAzure(quote, voice, audioPath, timingPath);
    }
  }

  console.log('✅ TTS generation complete.');
}

async function synthesizeAzure(
  quote: QuoteNormalized,
  voice: string,
  audioPath: string,
  timingPath: string
) {
  return new Promise<void>((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY!, SPEECH_REGION!);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
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
        durationTicks: e.duration
      });
    };

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-GB">
        <voice name="${voice}">
          <prosody rate="0%" pitch="0%">
            ${escapeXml(quote.text)}
          </prosody>
        </voice>
      </speak>
    `;

    synthesizer.speakSsmlAsync(
      ssml,
      result => {
        synthesizer.close();
        
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          fs.writeJSONSync(timingPath, boundaries, { spaces: 2 });
          resolve();
        } else {
          reject(new Error(`TTS Failed: ${result.errorDetails}`));
        }
      },
      err => {
        synthesizer.close();
        reject(err);
      }
    );
  });
}

async function generateMockAssets(quote: QuoteNormalized, audioPath: string, timingPath: string) {
  try {
    // Fetch a valid minimal MP3 file
    const res = await fetch("https://github.com/mathiasbynens/small/raw/master/mp3.mp3");
    if (!res.ok) throw new Error("Failed to fetch sample MP3");
    const arrayBuffer = await res.arrayBuffer();
    
    const frame = Buffer.from(arrayBuffer);
    const buffer = Buffer.concat(Array(200).fill(frame)); 
    
    await fs.writeFile(audioPath, buffer);
  } catch (e) {
    console.warn("Failed to fetch sample MP3, writing dummy buffer. Rendering WILL fail.", e);
    await fs.writeFile(audioPath, Buffer.alloc(1000));
  }
  
  const words = quote.text.split(' ');
  const boundaries: RawBoundary[] = words.map((word, i) => ({
    text: word,
    textOffset: 0,
    wordLength: word.length,
    audioOffsetTicks: i * 5000000, 
    durationTicks: 4000000 
  }));

  await fs.writeJSON(timingPath, boundaries, { spaces: 2 });
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
