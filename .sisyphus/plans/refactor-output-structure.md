# Refactor: Output Organization & DB Sync

## TL;DR

> **Quick Summary**: Refactor the entire TTS-to-Render pipeline to organize output files into `[tag]/[id]` subdirectories and update the SQLite database with file paths.
>
> **Deliverables**:
>
> - Scripts (`02_tts`, `03_postprocess`, `04_render`) updated for folder structure.
> - Remotion component (`QuoteVideo`) updated to accept `tag` prop.
> - SQLite database (`quotes` table) updated with `audio_path` and `video_path`.
>
> **Estimated Effort**: Medium
> **Parallel Execution**: Sequential (Pipeline dependency)
> **Critical Path**: Update Remotion → Update Scripts → Verify

---

## Context

### Original Request

Modify pipeline to:

1. Save audio/timing/video in `[tag]/[id]` folders.
2. Update `audio_path` and `video_path` in `quotes` database table.

### Technical Analysis

- **Database**: `admin-dashboard/db/quotes.db` (better-sqlite3).
- **Schema**: Table `quotes` already has `audio_path` and `video_path` columns.
- **Data Source**: `quotes/normalized.json` contains `tag` field.
- **Remotion**: `QuoteVideo.tsx` resolves assets via `staticFile`. Needs `tag` to construct correct path.

---

## Work Objectives

### Core Objective

Ensure all generated assets are organized by tag and verifiable via database records.

### Concrete Deliverables

- `remotion/compositions/QuoteVideo.tsx`: Accepts `tag` prop.
- `scripts/02_tts_azure.ts`: Creates `public/assets/audio/[tag]/` and updates DB.
- `scripts/03_postprocess.ts`: Reads/Writes to `[tag]/` folders.
- `scripts/04_render.ts`: Outputs to `out/[tag]/` and updates DB.

### Definition of Done

- [ ] `npm run tts` (mock) creates folders `public/assets/audio/[tag]/`.
- [ ] SQLite `quotes` table shows correct `audio_path`.
- [ ] `npm run render` outputs to `out/[tag]/` and updates `video_path`.
- [ ] Video renders correctly with assets loaded.

---

## Execution Strategy

### Dependency Matrix

| Task                  | Depends On | Blocks |
| --------------------- | ---------- | ------ |
| 1. Remotion Update    | None       | 4      |
| 2. TTS Script         | None       | 3      |
| 3. Postprocess Script | 2          | 4      |
| 4. Render Script      | 1, 3       | None   |

---

## TODOs

- [ ] 1. Refactor Remotion Component (`QuoteVideo`)

  **What to do**:
  - Update `QuoteVideoProps` in `remotion/compositions/QuoteVideo.tsx` to include `tag: string`.
  - Update `staticFile` calls to include `tag` in path: `assets/{type}/{tag}/{id}.{ext}`.
  - Update `remotion/compositions/calcMetadata.ts` to accept `tag` in props and update `audioPath`.

  **References**:
  - `remotion/compositions/QuoteVideo.tsx`
  - `remotion/compositions/calcMetadata.ts`

  **Acceptance Criteria**:
  - [ ] Component compiles without type errors.
  - [ ] Metadata calculation uses correct path.

- [ ] 2. Update TTS Script (`02_tts_azure.ts`)

  **What to do**:
  - Import `better-sqlite3` and `Database`.
  - Update `QuoteNormalized` type to include `tag: string`.
  - In the loop:
    - Extract `tag` (fallback to 'uncategorized' if missing).
    - Construct paths: `public/assets/audio/{tag}/{id}.mp3`.
    - Ensure directory exists: `fs.ensureDir(path.dirname(audioPath))`.
    - Connect to DB (`admin-dashboard/db/quotes.db`).
    - Normalize path to forward slashes (replace `\` with `/`).
    - After successful generation (or skip), update DB:
      ```sql
      UPDATE quotes SET audio_path = ? WHERE id = ?
      ```

  **References**:
  - `scripts/02_tts_azure.ts`
  - `scripts/ingest-db.ts` (for DB connection pattern)

  **Acceptance Criteria**:
  - [ ] Run `npm run tts` (mock mode).
  - [ ] Verify `public/assets/audio/attitude/` exists (example tag).
  - [ ] Verify DB `audio_path` column is populated.

- [ ] 3. Update Postprocess Script (`03_postprocess.ts`)

  **What to do**:
  - Update paths to read from `[tag]` subdirectories.
  - Update paths to write `timing` and `layout` to `[tag]` subdirectories.
  - Ensure output directories exist.
  - Handle cases where `tag` might be missing (fallback or error).

  **References**:
  - `scripts/03_postprocess.ts`

  **Acceptance Criteria**:
  - [ ] Run `npm run postprocess`.
  - [ ] Verify `public/assets/layout/[tag]/` files exist.

- [ ] 4. Update Render Script (`04_render.ts`)

  **What to do**:
  - Update input props to pass `{ id, tag }`.
  - Update output location to `out/{tag}/{id}.mp4`.
  - Ensure output directory exists.
  - Connect to DB.
  - After render, update DB:
    ```sql
    UPDATE quotes SET video_path = ? WHERE id = ?
    ```

  **References**:
  - `scripts/04_render.ts`

  **Acceptance Criteria**:
  - [ ] Run `npm run render-batch` (or similar).
  - [ ] Verify `out/[tag]/` folder creation.
  - [ ] Verify DB `video_path` updated.

---

## Success Criteria

### Verification Commands

```bash
# 1. Mock TTS run
npm run tts

# 2. Check DB
sqlite3 admin-dashboard/db/quotes.db "SELECT id, audio_path FROM quotes WHERE audio_path IS NOT NULL LIMIT 5;"

# 3. Postprocess
npm run postprocess

# 4. Render (limit to 1 for test)
npm run render -- QuoteVideo --props='{"id":"<valid-id>","tag":"<valid-tag>"}'
```
