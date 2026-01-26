Got it. Here’s a **complete, TS-first implementation plan** for:

* **Azure Neural TTS** (BBC/IELTS-style UK English)
* **WordBoundary** timings (word-level highlight)
* **Remotion** rendering (9:16, **1440×2560**, **30fps**)
* **Black background**, default **light grey text**, current word **#ffffff + stroke/shadow**
* **Auto scroll credits-style** when the quote is long
* Video duration = **audioDuration + 300ms + 320ms**

I’ll keep this concrete and buildable.

---

## 1) Voice choices (UK “BBC/IELTS-ish”)

Pick one male + one female from **en-GB Neural**:

* **Male:** `en-GB-RyanNeural` ([json2video.com][1])
* **Female:** `en-GB-LibbyNeural` (alt: `en-GB-SoniaNeural`) ([json2video.com][1])

These are widely used, neutral UK accents (the “BBC-ish” feel comes from voice neutrality + your prosody settings).

---

## 2) Timing source: Azure WordBoundary

Azure Speech SDK gives word boundary events with:

* `audioOffset` (ticks, **100ns**)
* `duration` (ticks)
* `text`, `textOffset`, `wordLength`

So you can compute word-level highlight windows precisely. ([Microsoft Learn][2])

---

## 3) Output spec (fixed)

* Resolution: **1440×2560** (vertical “2K portrait”)
* FPS: **30**
* Duration frames:

  * `leadIn = 300ms = 0.3s = 9 frames`
  * `leadOut = 320ms = 0.32s ≈ 10 frames`
  * total padding = **19 frames**
  * `durationInFrames = ceil(audioSec * 30) + 19`

---

## 4) Pipeline (two-phase, scalable for 4000 quotes)

### Phase A — Preprocess (offline, cached)

For each quote `id`:

1. Parse & clean text (remove smart quotes, extract author)
2. Azure TTS → `assets/audio/<id>.mp3`
3. Collect WordBoundary → `assets/timing/<id>.raw.json`
4. Get `audioDurationSec` (ffprobe or remotion util)
5. Build render-ready timing: `assets/timing/<id>.json`
6. Layout decision + scroll params: `assets/layout/<id>.json`

### Phase B — Render (Remotion)

* Remotion composition uses only local `audio + timing + layout`
* Render mp4 to `out/<id>.mp4` with concurrency limit

This is the cheapest and most stable approach (no TTS calls during render).

---

## 5) Your input format handling (important)

Your JSON is:

```json
[
  { "quote": "“Carve your name ...” ― Shannon Alder" },
  { "quote": "“Still, there are times ...” ― Jhumpa Lahiri, Interpreter of Maladies" }
]
```

You should normalize each entry to:

```ts
type QuoteNorm = {
  id: string;
  text: string;        // quote body only
  author?: string;     // extracted after "―" or "-"
  raw: string;         // original
};
```

### Extraction logic (practical)

* Strip leading/trailing smart quotes `“”` and normal quotes `"`
* Split on `" ― "` (em dash) first; if not present, try `" — "` then `" - "`
* Keep author as the right side (trim)

---

## 6) Project structure (recommended)

```
quotes/quotes.json
assets/
  audio/
  timing/
  layout/
remotion/
  Root.tsx
  compositions/QuoteVideo.tsx
  compositions/calcMetadata.ts
  components/WordFlow.tsx
  components/ScrollingStage.tsx
  utils/timing.ts
  utils/layout.ts
scripts/
  01_normalize.ts
  02_tts_azure.ts
  03_postprocess.ts
  04_render.ts
```

---

## 7) Azure TTS script (TS, Node) — with WordBoundary capture

### Key SDK facts

* `audioOffset` and `duration` are **ticks (100ns)** ([Microsoft Learn][2])
* Output MP3 format enum exists (`Audio16Khz32KBitRateMonoMp3` etc.) ([Microsoft Learn][3])

### What you store

`assets/timing/<id>.raw.json`:

```ts
type RawBoundary = {
  text: string;
  textOffset: number;
  wordLength: number;
  audioOffsetTicks: number;
  durationTicks?: number;
};
```

### Prosody (BBC-ish)

Use SSML:

* rate: `0%` (or `-5%` for “presenter-ish clarity”)
* pitch: `0%`
* style: keep neutral (don’t force “cheerful” etc.)

---

## 8) Postprocess timings (raw → render-ready)

Convert each boundary to:

```ts
type WordTiming = {
  token: string;
  startSec: number;
  endSec: number;
};
```

How to compute `endSec`:

* If Azure provides `durationTicks`, then `end = start + duration`
* Else `end[i] = start[i+1]`, last word ends at `audioDurationSec`

**Ticks to seconds:** `sec = ticks / 10_000_000` ([Microsoft Learn][2])

Also store a `tokens[]` array that matches exactly what you will render (use boundary `text` as the token so you don’t fight punctuation mismatches).

---

## 9) Layout + scrolling decision

### Visual rules

* Background: `#000000`
* Default text color: `#bdbdbd`
* Active word: `#ffffff`
* Active styling: stroke + shadow

  * `WebkitTextStroke: "1.25px rgba(0,0,0,0.95)"`
  * `textShadow: "0 3px 14px rgba(0,0,0,0.9), 0 0 2px rgba(255,255,255,0.35)"`

### Safe margins (2K portrait)

* left/right padding: **120px**
* top/bottom: **240px**

### When to scroll

You need a deterministic test. Two workable options:

**Option A (fast, good enough):** estimate lines by char count.

* Compute `approxCharsPerLine` based on font size
* If `estimatedLines > threshold` → scroll

**Option B (better):** do server-side measurement using a canvas font measure in Node (more work).

Given you’re doing 4000 items, I’d start with **Option A**, then tune thresholds after sampling 50 outputs.

### Scroll math (credits-style)

Let:

* `contentHeightPx = estimatedLines * lineHeightPx`
* `viewportHeight = 2560 - topPadding - bottomPadding`

If `contentHeightPx <= viewportHeight` → no scroll (center vertically)
Else scroll:

* Start: content begins below bottom edge (`startY = viewportHeight + 200`)
* End: content leaves top edge (`endY = -contentHeightPx - 200`)
* Scroll time: **audioDuration + 0.62s** (matches your total)
* Keep motion linear (credits feel)

---

## 10) Remotion composition (dynamic duration)

Use `calculateMetadata`:

* Load audio duration
* `durationFrames = ceil(audioSec * 30) + 19` (9 + 10 frames padding)

Also keep `leadInFrames = 9`, `leadOutFrames = 10`.

---

## 11) Rendering logic (word highlight + scroll)

### Core idea

At time `tSec = (frame - leadInFrames) / fps`:

* If frame < leadInFrames: don’t highlight anything yet (or highlight first word very faint)
* Find active word where `startSec <= tSec < endSec`
* Render tokens as `<span>` sequence
* Apply active style to the active token

### Important: token spacing

Azure boundary `text` returns words; you must re-insert spaces between tokens in rendering:

* Render token + trailing space (except before punctuation tokens if you decide to split punctuation)
  Simplest: don’t split punctuation; just accept boundary tokens as they arrive.

---

## 12) Batch rendering (4000 videos)

Use concurrency limiting:

* 2–4 concurrent renders on a typical dev machine
* 6–10 on a strong server

Do not render 4000 sequentially in one process if you want resilience:

* Write a “done marker” file per id (e.g., `out/<id>.mp4` exists)
* On restart, skip completed ids

---

## 13) Concrete “next steps” I would implement immediately

1. `01_normalize.ts`

   * read your quotes json
   * create `id = q_000001` etc.
   * extract `text/author`
2. `02_tts_azure.ts`

   * for each id, synthesize (choose voice based on your preference or alternate M/F)
   * capture word boundaries
3. `03_postprocess.ts`

   * run ffprobe to get audio duration
   * build `timing.json` with start/end
   * build `layout.json` with scroll params
4. Remotion side:

   * `QuoteVideo` component supports both non-scroll and scroll
   * `calculateMetadata` enforces your duration formula
5. `04_render.ts`

   * call Remotion renderer
   * concurrency + resume

---

## 14) Two clarifications I’ll assume (unless you say otherwise)

* You want **one video per quote**, not one mega compilation.
* Voice selection strategy:

  * Default: **all male** or **alternate male/female**.
    If you don’t say, I’d alternate for variety.

---

If you want, I can now produce the **actual runnable TS files** (scripts + Remotion components) in one go, but I’ll need one thing from you: do you want to **alternate** voices (Ryan/Libby) or stick to **male-only**?

[1]: https://json2video.com/ai-voices/azure/languages/english/?utm_source=chatgpt.com "Azure AI Voices in English"
[2]: https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/speechsynthesiswordboundaryeventargs?view=azure-node-latest&utm_source=chatgpt.com "SpeechSynthesisWordBoundary..."
[3]: https://learn.microsoft.com/en-us/dotnet/api/microsoft.cognitiveservices.speech.speechsynthesisoutputformat?view=azure-dotnet&utm_source=chatgpt.com "SpeechSynthesisOutputFormat Enum"

