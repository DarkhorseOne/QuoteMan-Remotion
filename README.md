# QuoteMan-Remotion

A scalable engine for generating thousands of quote videos using **Remotion** and **Azure Neural TTS**.

Designed to process 4000+ quotes into vertical (9:16) MP4 videos with word-level synchronization and auto-scrolling credits.

## Features

- **Azure Neural TTS**: High-quality "BBC-style" UK English voices (Ryan/Libby).
- **Word-Level Sync**: Exact word highlighting using Azure WordBoundary events.
- **Dynamic Layout**: Automatically switches between static centering and credit-style scrolling based on text length.
- **Batch Processing**: Concurrency-controlled rendering pipeline for mass generation.
- **Output**: 1440×2560 (2K Portrait) @ 30fps.

## Prerequisites

- Node.js 18+
- Ffmpeg (usually installed via Remotion)
- Azure Speech Services Resource Key (Cognitive Services)

## Setup

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd QuoteMan-Remotion
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root:
   ```bash
   # Required for TTS generation
   AZURE_SPEECH_KEY=your_key_here
   AZURE_SPEECH_REGION=your_region (e.g., uksouth)
   ```

## Workflow

The generation process is split into two phases to ensure stability and minimize API costs.

### Phase A: Preprocessing (Data & Audio)

1. **Normalize Data**
   Parses `quotes/quotes.json` into a standardized format.
   ```bash
   npm run normalize
   ```

2. **Generate Audio & Timings**
   Calls Azure TTS for each quote, saving MP3s and raw timing data.
   ```bash
   npm run tts
   ```

3. **Post-Process**
   Calculates layout decisions (scroll vs static) and final word timings.
   ```bash
   npm run postprocess
   ```

### Phase B: Rendering

1. **Development Preview**
   Open Remotion Studio to view and debug compositions.
   ```bash
   npm run dev
   ```

2. **Render Single Video**
   ```bash
   npm run render -- QuoteVideo --props='{"id":"q_000001"}'
   ```

3. **Batch Render**
   Renders all processed quotes with concurrency control.
   ```bash
   npm run batch-render
   ```

## Project Structure

```
/
├── quotes/             # Input data
├── assets/             # Generated assets (audio, timing, layout)
├── remotion/           # Video components & composition logic
├── scripts/            # Node.js pipeline scripts
└── out/                # Final MP4 video output
```

## Tech Stack

- **Framework**: [Remotion](https://www.remotion.dev/)
- **Language**: TypeScript
- **TTS**: Microsoft Azure Cognitive Services (Speech SDK)
- **Test**: Vitest

## License

Private / Proprietary
