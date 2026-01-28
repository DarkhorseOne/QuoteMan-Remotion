## 2026-01-28T14:40:30Z Task: research-remotion-staticFile

- `staticFile()` expects paths absolute relative to `public/` (use leading `/`), supports nested subfolders; does not support `../` or filesystem absolute paths.
- `calculateMetadata` receives merged `{ props }` (defaultProps + inputProps); can compute duration dynamically using `getAudioDurationInSeconds(staticFile('/...'))` per Remotion docs.
