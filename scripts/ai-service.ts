import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

export type AiProvider = 'openai' | 'anthropic' | 'gemini';

export type TopicsResult = {
  en: string;
  zh: string;
};

const DEFAULT_AI_PROVIDER: AiProvider = 'openai';

const getAiProvider = (): AiProvider => {
  const raw = (process.env.AI_PROVIDER || DEFAULT_AI_PROVIDER).toLowerCase();
  if (raw === 'anthropic' || raw === 'gemini' || raw === 'openai') return raw;
  return DEFAULT_AI_PROVIDER;
};

const normalizeBaseUrl = (url: string): string => {
  return url.replace(/\/+$/u, '');
};

const normalizeAnthropicBaseUrl = (rawUrl: string | undefined): string | undefined => {
  if (!rawUrl) return undefined;
  const url = normalizeBaseUrl(rawUrl);
  // Anthropic SDK appends /v1/messages. If user provides full endpoint, strip it.
  return url.replace(/\/v1\/messages$/u, '').replace(/\/v1$/u, '');
};

const normalizeGeminiBaseUrl = (rawUrl: string | undefined): string | undefined => {
  if (!rawUrl) return undefined;
  const url = normalizeBaseUrl(rawUrl);
  // Gemini SDK appends /{apiVersion}/models/... If user provides /v1beta/models, strip it.
  return url
    .replace(/\/v1beta\/models$/u, '')
    .replace(/\/v1beta$/u, '')
    .replace(/\/v1$/u, '');
};

// OpenAI model rotation (used by CLI batch script)
const openaiModels = (process.env.OPENAI_MODELS || process.env.OPENAI_MODEL || 'gpt-3.5-turbo')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

let currentOpenAiModelIndex = 0;

export const getCurrentOpenAiModel = (): string => {
  return openaiModels[currentOpenAiModelIndex % openaiModels.length] || 'gpt-3.5-turbo';
};

export const rotateOpenAiModel = (): string => {
  currentOpenAiModelIndex++;
  const newModel = getCurrentOpenAiModel();
  console.log(`  ! Rotating model to: ${newModel}`);
  return newModel;
};

console.log('process.env.OPENAI_API_KEY', process.env.OPENAI_API_KEY);
console.log('process.env.OPENAI_BASE_URL', process.env.OPENAI_BASE_URL);
console.log('process.env.OPENAI_MODEL', process.env.OPENAI_MODEL, getCurrentOpenAiModel());
const openai = new OpenAI({
  // OpenAI SDK enforces apiKey presence even if you proxy locally.
  apiKey: process.env.OPENAI_API_KEY || 'dummy',
  baseURL: process.env.OPENAI_BASE_URL,
});

// Anthropic SDK enforces apiKey presence even if your proxy doesn't.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy',
  baseURL: normalizeAnthropicBaseUrl(process.env.ANTHROPIC_BASE_URL),
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy');

const extractJsonObject = (text: string): string => {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new Error(`No JSON object found in model output: ${text.slice(0, 200)}`);
  }
  return text.slice(first, last + 1);
};

export const translate = async (text: string): Promise<string | null> => {
  const provider = getAiProvider();
  if (provider === 'anthropic') return translateAnthropic(text);
  if (provider === 'gemini') return translateGemini(text);
  return translateOpenAi(text);
};

export const generateTopics = async (text: string, tag: string): Promise<TopicsResult | null> => {
  const provider = getAiProvider();
  if (provider === 'anthropic') return generateTopicsAnthropic(text, tag);
  if (provider === 'gemini') return generateTopicsGemini(text, tag);
  return generateTopicsOpenAi(text, tag);
};

const translateOpenAi = async (text: string): Promise<string | null> => {
  const model = getCurrentOpenAiModel();
  const completion = await openai.chat.completions.create({
    model,
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
  return completion.choices[0]?.message?.content?.trim() || null;
};

const generateTopicsOpenAi = async (text: string, tag: string): Promise<TopicsResult | null> => {
  const model = getCurrentOpenAiModel();
  const prompt = `
Analyze the following quote and generate 5 relevant hashtags in English and 5 in Chinese.
The hashtags should be relevant to the quote's content, mood, and potential audience.
Return strictly valid JSON with no other text:
{
  "en": ["#topic1", "#topic2", "#topic3", "#topic4", "#topic5"],
  "zh": ["#话题1", "#话题2", "#话题3", "#话题4", "#话题5"]
}

Quote: "${text}"
Tag: "${tag || ''}"
`;

  const completion = await openai.chat.completions.create({
    model,
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

  const content = completion.choices[0]?.message?.content;
  if (!content) return null;
  const parsed = JSON.parse(content) as { en: string[]; zh: string[] };
  return {
    en: parsed.en.join(' '),
    zh: parsed.zh.join(' '),
  };
};

const translateAnthropic = async (text: string): Promise<string | null> => {
  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
    max_tokens: 1024,
    system:
      'You are a professional translator. Translate the following English quote to Chinese. Only return the translated text, no other words.',
    messages: [{ role: 'user', content: text }],
  });

  const out = message.content
    .map((c) => (c.type === 'text' ? c.text : ''))
    .join('')
    .trim();
  return out || null;
};

const generateTopicsAnthropic = async (text: string, tag: string): Promise<TopicsResult | null> => {
  const prompt = `
Analyze the following quote and generate 5 relevant hashtags in English and 5 in Chinese.
The hashtags should be relevant to the quote's content, mood, and potential audience.
Return strictly valid JSON with no other text. Do not include markdown.
{
  "en": ["#topic1", "#topic2", "#topic3", "#topic4", "#topic5"],
  "zh": ["#话题1", "#话题2", "#话题3", "#话题4", "#话题5"]
}

Quote: "${text}"
Tag: "${tag || ''}"
`;

  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
    max_tokens: 1024,
    system: 'You are a social media expert. Generate relevant hashtags.',
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
  const json = extractJsonObject(raw);
  const parsed = JSON.parse(json) as { en: string[]; zh: string[] };
  return {
    en: parsed.en.join(' '),
    zh: parsed.zh.join(' '),
  };
};

const translateGemini = async (text: string): Promise<string | null> => {
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const baseUrl = normalizeGeminiBaseUrl(process.env.GEMINI_BASE_URL);
  const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';

  const model = gemini.getGenerativeModel(
    { model: modelName },
    {
      baseUrl,
      apiVersion,
    },
  );

  const prompt =
    'You are a professional translator. Translate the following English quote to Chinese. Only return the translated text, no other words.\n\n' +
    text;
  const result = await model.generateContent(prompt);
  const out = result.response.text().trim();
  return out || null;
};

const generateTopicsGemini = async (text: string, tag: string): Promise<TopicsResult | null> => {
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const baseUrl = normalizeGeminiBaseUrl(process.env.GEMINI_BASE_URL);
  const apiVersion = process.env.GEMINI_API_VERSION || 'v1beta';

  const model = gemini.getGenerativeModel(
    { model: modelName },
    {
      baseUrl,
      apiVersion,
    },
  );

  const prompt = `
Analyze the following quote and generate 5 relevant hashtags in English and 5 in Chinese.
The hashtags should be relevant to the quote's content, mood, and potential audience.
Return strictly valid JSON with no other text. Do not include markdown.
{
  "en": ["#topic1", "#topic2", "#topic3", "#topic4", "#topic5"],
  "zh": ["#话题1", "#话题2", "#话题3", "#话题4", "#话题5"]
}

Quote: "${text}"
Tag: "${tag || ''}"
`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const json = extractJsonObject(raw);
  const parsed = JSON.parse(json) as { en: string[]; zh: string[] };
  return {
    en: parsed.en.join(' '),
    zh: parsed.zh.join(' '),
  };
};
