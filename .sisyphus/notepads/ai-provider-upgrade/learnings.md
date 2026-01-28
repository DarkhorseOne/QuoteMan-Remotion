## 2026-01-28T14:52:10Z Task: sdk-docs

- `@anthropic-ai/sdk` client supports `baseURL` in constructor options; normal usage is `client.messages.create({...})`.
- `@google/generative-ai` supports `RequestOptions` passed to `getGenerativeModel(..., requestOptions)` including `baseUrl` and `apiVersion` (e.g. `v1beta`).

## 2026-01-28T15:03:40Z Task: implementation-notes

- User-provided proxy bases may include full endpoint paths (`/v1/messages`, `/v1beta/models`); both SDKs append their own paths. We normalize env base URLs by stripping those suffixes before passing into official SDKs.
- Anthropic SDK enforces presence of `apiKey` even when proxying; use `ANTHROPIC_API_KEY` or a dummy key.
- Added `--dry-run` to `scripts/06_batch_process.ts` to allow verification without calling external AI.

## 2026-01-28T15:05:25Z Task: verification-fixes

- `openai` SDK throws at import-time if `apiKey` missing; set `OPENAI_API_KEY` to dummy by default in ai-service to allow dry-run and proxy usage.
- Switched `npm test` to `vitest run` so CI/verification doesn't hang in watch mode.
