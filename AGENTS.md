# QuoteMan-Remotion Agent Guide

## Project Overview

TypeScript + Remotion project for generating quote videos with Azure Neural TTS.
- **Output**: 1440×2560 (9:16 vertical), 30fps, MP4
- **Stack**: Node.js, TypeScript, Remotion, Azure Speech SDK
- **Scale**: Designed to process 4000+ quotes with batch rendering

---

## Build & Test Commands

### Setup
```bash
npm install                    # Install dependencies
```

### Development
```bash
npm run dev                    # Start Remotion Studio (port 3000)
npm run preview               # Preview with audio (if configured)
```

### Rendering
```bash
# Single video render
npm run render -- QuoteVideo --props='{"id":"q_000001"}'

# Batch render (custom script)
npm run batch-render          # Render all quotes with concurrency control
```

### Scripts (preprocessing pipeline)
```bash
npm run normalize             # Phase A.1: Parse quotes.json → normalized format
npm run tts                   # Phase A.2: Generate audio + word boundaries via Azure
npm run postprocess           # Phase A.3: Build timing.json + layout.json
npm run render-batch          # Phase B: Render all videos (uses Phase A outputs)
```

### Type Checking & Linting
```bash
npm run typecheck             # TypeScript compiler check (tsc --noEmit)
npm run lint                  # ESLint check
npm run lint:fix              # ESLint auto-fix
npm run format                # Prettier format
npm run format:check          # Prettier check only
```

### Testing
```bash
npm test                      # Run all tests
npm test -- --watch           # Watch mode
npm test -- path/to/file.test.ts  # Single test file
```

---

## Code Style Guidelines

### TypeScript

**Strictness**
- Use `strict: true` in tsconfig.json
- **NEVER** use `any`, `@ts-ignore`, `@ts-expect-error`
- Prefer explicit return types on exported functions
- Use `unknown` over `any` when type is truly unknown

**Type Definitions**
```typescript
// Good: Explicit, specific types
type WordTiming = {
  token: string;
  startSec: number;
  endSec: number;
};

type LayoutConfig = {
  mode: 'static' | 'scroll';
  scrollStartY?: number;
  scrollEndY?: number;
  contentHeight: number;
};

// Bad: Loose typing
type Config = {
  data: any;  // ❌ Never use 'any'
  settings?: object;  // ❌ Use specific types
};
```

### Imports

**Order** (ESLint enforced):
1. External packages (react, remotion, etc.)
2. Internal absolute imports (`@/utils`, `@/components`)
3. Relative imports (`./`, `../`)
4. Type imports (via `import type`)

```typescript
// Good
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media-utils';
import type { WordTiming } from '@/types';

import { calculateActiveWord } from '../utils/timing';
import styles from './WordFlow.module.css';

// Bad
import styles from './WordFlow.module.css';  // ❌ Should be last
import { AbsoluteFill } from 'remotion';
import { calculateActiveWord } from '../utils/timing';
```

### Naming Conventions

- **Files**: PascalCase for components (`QuoteVideo.tsx`), camelCase for utils (`timing.ts`)
- **Functions**: camelCase (`calculateActiveWord`, `buildTimingData`)
- **Components**: PascalCase (`WordFlow`, `ScrollingStage`)
- **Constants**: UPPER_SNAKE_CASE (`LEAD_IN_FRAMES`, `OUTPUT_WIDTH`)
- **Types/Interfaces**: PascalCase, prefer `type` over `interface` unless extending

```typescript
// Constants (top of file or separate constants.ts)
export const OUTPUT_WIDTH = 1440;
export const OUTPUT_HEIGHT = 2560;
export const FPS = 30;
export const LEAD_IN_MS = 300;
export const LEAD_OUT_MS = 320;

// Types
type QuoteNormalized = {
  id: string;
  text: string;
  author?: string;
  raw: string;
};

// Component
export const QuoteVideo: React.FC<{ id: string }> = ({ id }) => {
  // ...
};
```

### Formatting

**Prettier Config** (enforce):
- Semi: true
- Single quotes: true
- Trailing comma: 'all'
- Print width: 100
- Tab width: 2

### Error Handling

**Always handle errors explicitly**:
```typescript
// Good: Explicit error handling
async function synthesizeAudio(text: string, id: string): Promise<string> {
  try {
    const audioPath = await azureTTS.synthesize(text, id);
    return audioPath;
  } catch (error) {
    if (error instanceof AzureError) {
      throw new Error(`Azure TTS failed for ${id}: ${error.message}`);
    }
    throw new Error(`Unknown error synthesizing ${id}: ${String(error)}`);
  }
}

// Bad
async function synthesizeAudio(text: string, id: string) {
  try {
    return await azureTTS.synthesize(text, id);
  } catch (e) {
    // ❌ Empty catch or generic logging
    console.log('error');
  }
}
```

**Script-level error handling**:
- Exit with non-zero code on failure
- Log structured errors (include quote ID, stage, timestamp)
- For batch operations: continue on individual failures, collect errors, report at end

### Async/Await

- Always use `async/await`, never raw Promises with `.then()`
- Use `Promise.all()` for parallel operations
- Use concurrency limiting for batch operations (p-limit or similar)

```typescript
// Good: Parallel with concurrency control
import pLimit from 'p-limit';

const limit = pLimit(4); // 4 concurrent renders
const tasks = quoteIds.map((id) =>
  limit(() => renderQuote(id))
);
await Promise.all(tasks);
```

### Remotion-Specific

**Compositions**:
- Use `calculateMetadata` for dynamic duration
- Keep compositions pure (no side effects in render)
- Use `useCurrentFrame()` and `useVideoConfig()` for timing calculations

```typescript
export const QuoteVideo: React.FC<{ id: string }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const timeSec = (frame - LEAD_IN_FRAMES) / fps;
  const activeWordIndex = calculateActiveWord(timeSec, wordTimings);
  
  return <AbsoluteFill>{/* ... */}</AbsoluteFill>;
};
```

**calculateMetadata pattern**:
```typescript
export const calcMetadata = async ({ id }: { id: string }): Promise<Metadata> => {
  const audioPath = path.join('assets', 'audio', `${id}.mp3`);
  const audioDurationSec = await getAudioDurationInSeconds(audioPath);
  
  const durationInFrames = Math.ceil(audioDurationSec * FPS) + LEAD_IN_FRAMES + LEAD_OUT_FRAMES;
  
  return { durationInFrames };
};
```

---

## Project-Specific Rules

### File Organization

```
/
├── quotes/quotes.json          # Original quote data
├── assets/
│   ├── audio/                  # Azure TTS output (.mp3)
│   ├── timing/                 # Word boundary data (.json)
│   └── layout/                 # Scroll/layout configs (.json)
├── remotion/
│   ├── Root.tsx                # Remotion entry
│   ├── compositions/
│   │   ├── QuoteVideo.tsx      # Main composition
│   │   └── calcMetadata.ts     # Dynamic duration calculation
│   ├── components/
│   │   ├── WordFlow.tsx        # Word-by-word highlight renderer
│   │   └── ScrollingStage.tsx  # Credits-style scroll logic
│   └── utils/
│       ├── timing.ts           # Word timing calculations
│       └── layout.ts           # Scroll decision logic
├── scripts/
│   ├── 01_normalize.ts         # Parse quotes.json → normalized format
│   ├── 02_tts_azure.ts         # Generate audio + word boundaries
│   ├── 03_postprocess.ts       # Build timing.json + layout.json
│   └── 04_render.ts            # Batch render with concurrency
└── out/                        # Rendered videos
```

### Data Contracts

**Normalized Quote** (`quotes/normalized.json`):
```typescript
type QuoteNormalized = {
  id: string;           // e.g., "q_000001"
  text: string;         // Quote body only
  author?: string;      // Extracted after "―" or "-"
  raw: string;          // Original string
};
```

**Raw Timing** (`assets/timing/<id>.raw.json`):
```typescript
type RawBoundary = {
  text: string;
  textOffset: number;
  wordLength: number;
  audioOffsetTicks: number;  // Azure uses 100ns ticks
  durationTicks?: number;
};
```

**Render-Ready Timing** (`assets/timing/<id>.json`):
```typescript
type WordTiming = {
  token: string;
  startSec: number;
  endSec: number;
};
```

**Layout Config** (`assets/layout/<id>.json`):
```typescript
type LayoutConfig = {
  mode: 'static' | 'scroll';
  contentHeight: number;
  scrollStartY?: number;
  scrollEndY?: number;
};
```

### Visual Specs (Hardcoded Constants)

```typescript
// Dimensions
export const OUTPUT_WIDTH = 1440;
export const OUTPUT_HEIGHT = 2560;
export const FPS = 30;

// Timing
export const LEAD_IN_MS = 300;   // 9 frames @ 30fps
export const LEAD_OUT_MS = 320;  // 10 frames @ 30fps
export const LEAD_IN_FRAMES = Math.round((LEAD_IN_MS / 1000) * FPS);
export const LEAD_OUT_FRAMES = Math.round((LEAD_OUT_MS / 1000) * FPS);

// Colors
export const BG_COLOR = '#000000';
export const TEXT_DEFAULT = '#bdbdbd';
export const TEXT_ACTIVE = '#ffffff';

// Typography
export const ACTIVE_WORD_STROKE = '1.25px rgba(0,0,0,0.95)';
export const ACTIVE_WORD_SHADOW = '0 3px 14px rgba(0,0,0,0.9), 0 0 2px rgba(255,255,255,0.35)';

// Layout
export const PADDING_HORIZONTAL = 120;
export const PADDING_VERTICAL = 240;
```

### Azure TTS Rules

- **Voices**: Alternate `en-GB-RyanNeural` (male) and `en-GB-LibbyNeural` (female)
- **SSML**: Use rate=0% or rate=-5%, pitch=0%, neutral style
- **Output format**: MP3, 16kHz or higher
- **Word boundaries**: Always capture, convert ticks to seconds via `ticks / 10_000_000`

---

## Common Pitfalls

1. **Don't mutate state in Remotion components**: All calculations must be pure functions of `frame`
2. **Audio sync**: Remember to subtract `LEAD_IN_FRAMES` before calculating `timeSec`
3. **Batch rendering**: Always use concurrency limiting (2-4 on dev, 6-10 on server)
4. **Error recovery**: Write marker files (`out/<id>.mp4` exists) to enable resume on crash
5. **Type safety**: Azure SDK types are loose; wrap in strict internal types immediately
6. **Scroll timing**: Ensure scroll animation duration matches `audioDuration + LEAD_IN_MS + LEAD_OUT_MS`

---

## Dependencies (Expected)

```json
{
  "dependencies": {
    "remotion": "^4.x",
    "@remotion/cli": "^4.x",
    "@remotion/media-utils": "^4.x",
    "react": "^18.x",
    "microsoft-cognitiveservices-speech-sdk": "^1.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "eslint": "^8.x",
    "prettier": "^3.x",
    "vitest": "^1.x",
    "p-limit": "^5.x"
  }
}
```

---

## Verification Checklist

Before marking any task complete:
- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run lint` passes with no errors
- [ ] Changed files have no LSP diagnostics errors
- [ ] If rendering: verify output video plays correctly
- [ ] If batch script: test with 2-3 quotes before running full 4000

---

## Notes for AI Agents

- This is a **greenfield project**: establish patterns early, be consistent
- **Remotion is reactive**: Never use external state management; derive everything from `frame`
- **Azure costs money**: Cache all TTS outputs; never re-synthesize unnecessarily
- **Batch operations**: Always implement resume logic (check for existing outputs)
- **Type everything**: This project deals with complex timing data; loose types will cause bugs
