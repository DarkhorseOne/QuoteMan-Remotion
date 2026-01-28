import Database from 'better-sqlite3';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import pLimit from 'p-limit';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbPath = path.join(process.cwd(), 'admin-dashboard/db/quotes.db');
const db = new Database(dbPath);

// Model rotation logic
const models = (process.env.OPENAI_MODELS || process.env.OPENAI_MODEL || 'gpt-3.5-turbo').split(
  ',',
);
let currentModelIndex = 0;

function getCurrentModel() {
  return models[currentModelIndex % models.length].trim();
}

function rotateModel() {
  currentModelIndex++;
  const newModel = getCurrentModel();
  console.log(`  ! Rotating model to: ${newModel}`);
  return newModel;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Reuse logic from API routes
async function translate(text: string): Promise<string | null> {
  const model = getCurrentModel();
  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translator. Translate the following English quote to Chinese. Only return the translated text, no other words.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
    });
    return completion.choices[0].message.content?.trim() || null;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

async function generateTopics(
  text: string,
  tag: string,
): Promise<{ en: string; zh: string } | null> {
  const model = getCurrentModel();
  const prompt = `
    Analyze the following quote and generate 5 relevant hashtags in English and 5 in Chinese.
    The hashtags should be relevant to the quote's content, mood, and potential audience.
    Return strictly valid JSON with no other text:
    {
      "en": ["#topic1", "#topic2", ...],
      "zh": ["#话题1", "#话题2", ...]
    }

    Quote: "${text}"
    Tag: "${tag || ''}"
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a social media expert. Generate relevant hashtags.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        en: parsed.en.join(' '),
        zh: parsed.zh.join(' '),
      };
    }
    return null;
  } catch (error) {
    console.error('Topic generation error:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const workersArg = args.find((arg) => arg.startsWith('--workers='));
  const workers = workersArg ? parseInt(workersArg.split('=')[1], 10) : 2;

  console.log(`Using ${workers} concurrent workers.`);

  const limit = pLimit(workers);

  // Find quotes that need processing
  // Logic:
  // 1. Missing translation (text_zh IS NULL OR text_zh = '')
  // 2. Missing topics (topics_en IS NULL OR topics_en = '')
  const query = `
    SELECT * FROM quotes 
    WHERE (text_zh IS NULL OR text_zh = '') 
       OR (topics_en IS NULL OR topics_en = '')
  `;

  const quotes = db.prepare(query).all() as any[];
  console.log(`Found ${quotes.length} quotes requiring processing.`);

  const updateTransStmt = db.prepare('UPDATE quotes SET text_zh = ? WHERE id = ?');
  const updateTopicsStmt = db.prepare(
    'UPDATE quotes SET topics_en = ?, topics_zh = ? WHERE id = ?',
  );

  let processed = 0;
  let failed = 0;

  const tasks = quotes.map((quote) => {
    return limit(async () => {
      console.log(`Processing [${quote.id.substring(0, 8)}]: ${quote.text.substring(0, 30)}...`);
      let changed = false;

      // Retry wrapper
      const withRetry = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (e: any) {
            // Handle rate limits (429) specifically
            const isRateLimit = e.status === 429 || (e.message && e.message.includes('429'));
            // Handle "Token pool is empty" (503) or generic quota issues
            const isTokenPoolEmpty =
              e.status === 503 && e.message && e.message.includes('Token pool is empty');

            if (isRateLimit || isTokenPoolEmpty) {
              console.warn(
                `  ! ${isRateLimit ? 'Rate limit' : 'Token pool empty'} hit on ${getCurrentModel()}. Rotating...`,
              );
              rotateModel();
              // Retry immediately with new model (or short delay)
              await sleep(1000);
              continue; // Skip the normal retry decrement logic effectively giving fresh retries for new model?
              // Or just continue loop. The 'i' still increments so we don't loop forever if all models fail.
            }

            if (i === retries - 1) throw e;
            console.warn(`  Retry ${i + 1}/${retries} due to error: ${e.message}`);
            // Random backoff to avoid thundering herd on retry
            await sleep(2000 * (i + 1) + Math.random() * 1000);
          }
        }
        throw new Error('Retries exhausted');
      };

      // 1. Translate if needed
      if (!quote.text_zh) {
        try {
          // process.stdout.write causes interleaving issues in parallel output, use console.log
          // console.log(`  > Translating ${quote.id.substring(0, 8)}...`);
          const trans = await withRetry(() => translate(quote.text));
          if (trans) {
            updateTransStmt.run(trans, quote.id);
            // console.log(`  > Translated ${quote.id.substring(0, 8)}.`);
            changed = true;
          }
        } catch (e: any) {
          console.error(`  X Failed translation [${quote.id.substring(0, 8)}]: ${e.message}`);
          failed++;
        }
      }

      // 2. Generate Topics if needed
      if (!quote.topics_en) {
        try {
          // console.log(`  > Generating topics ${quote.id.substring(0, 8)}...`);
          const topics = await withRetry(() => generateTopics(quote.text, quote.tag));
          if (topics) {
            updateTopicsStmt.run(topics.en, topics.zh, quote.id);
            // console.log(`  > Topics generated ${quote.id.substring(0, 8)}.`);
            changed = true;
          }
        } catch (e: any) {
          console.error(`  X Failed topics [${quote.id.substring(0, 8)}]: ${e.message}`);
          failed++;
        }
      }

      if (changed) {
        processed++;
        console.log(`Completed [${quote.id.substring(0, 8)}]`);
      }

      const delay = Math.floor(Math.random() * 3000) + 2000;
      await sleep(delay);
    });
  });

  await Promise.all(tasks);

  console.log('-----------------------------------');
  console.log(`Batch complete.`);
  console.log(`Processed: ${processed}`);
  console.log(`Failed (operations): ${failed}`);
}

main().catch(console.error);
