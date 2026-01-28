# Upgrade AI Provider Support

## TL;DR

> **Quick Summary**: Upgrade the AI translation and topic generation pipeline (CLI & WebUI) to support Anthropic and Gemini protocols alongside OpenAI.
>
> **Deliverables**:
>
> - Updated `package.json` (root & dashboard) with new SDKs.
> - New `ai-service.ts` module (replicated in scripts/lib and dashboard/lib).
> - Updated `.env` configuration support.
> - Refactored `scripts/06_batch_process.ts` and Dashboard API routes.
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Install SDKs → Create Service → Refactor Consumers

---

## Context

### Original Request

Upgrade CLI script and WebUI to support Anthropic (base: `http://127.0.0.1:8972/v1/messages`) and Gemini (base: `http://127.0.0.1:8972/v1beta/models`) using official TS libraries. Config via `.env`.

### Analysis

- **Current State**: Hardcoded usage of `openai` SDK in `scripts/06_batch_process.ts` and `admin-dashboard/app/api/...`.
- **Constraint**: Must use official SDKs (`@anthropic-ai/sdk`, `@google/generative-ai`).
- **Challenge**: `GoogleGenerativeAI` SDK base URL configuration is non-standard.
- **Approach**: Abstraction layer (`ai-service.ts`) to handle provider switching.

---

## Work Objectives

### Core Objective

Enable seamless switching between OpenAI, Anthropic, and Gemini for all AI operations.

### Concrete Deliverables

- `scripts/ai-service.ts`
- `admin-dashboard/lib/ai-service.ts`
- Updated `scripts/06_batch_process.ts`
- Updated `admin-dashboard/app/api/actions/translate/route.ts`
- Updated `admin-dashboard/app/api/actions/generate-topics/route.ts`

### Definition of Done

- [x] `npm run batch-render` (or relevant script) runs successfully with `AI_PROVIDER=anthropic`.
- [x] `npm run batch-render` (or relevant script) runs successfully with `AI_PROVIDER=gemini`.
- [x] Dashboard API endpoints return valid results with new providers.

### Must Have

- Configurable via `.env` (`AI_PROVIDER`, `ANTHROPIC_BASE_URL`, etc.).
- Robust error handling for new providers.
- Type safety using official SDK types.

### Must NOT Have (Guardrails)

- Do not remove OpenAI support.
- Do not break existing model rotation logic (keep it for OpenAI at least).

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (`vitest`).
- **User wants tests**: Implied quality requirement, but manual verification of the script is primary.
- **Approach**: Manual verification via CLI dry-runs and API tests.

### Automated Verification Procedures

**For CLI Script**:

```bash
# Verify Anthropic
AI_PROVIDER=anthropic ANTHROPIC_BASE_URL=http://127.0.0.1:8972/v1/messages npx tsx scripts/06_batch_process.ts --workers=1 --dry-run
# (Note: Script might need a --dry-run flag added or just check logs)

# Verify Gemini
AI_PROVIDER=gemini GEMINI_BASE_URL=http://127.0.0.1:8972/v1beta/models npx tsx scripts/06_batch_process.ts --workers=1
```

**For Dashboard API**:

```bash
# Curl test for translate endpoint
curl -X POST http://localhost:3000/api/actions/translate \
  -H "Content-Type: application/json" \
  -d '{"quoteIds":["q_test"]}'
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1:
├── Task 1: Install Dependencies (Root & Dashboard)
├── Task 2: Create AI Service Abstraction (Scripts)
└── Task 3: Create AI Service Abstraction (Dashboard)

Wave 2:
├── Task 4: Refactor CLI Script
├── Task 5: Refactor Dashboard APIs
└── Task 6: Update Environment Configuration
```

---

## TODOs

- [x] 1. Install AI SDKs

  **What to do**:
  - Install `@anthropic-ai/sdk` and `@google/generative-ai` in root.
  - Install same in `admin-dashboard`.
  - Use `--legacy-peer-deps` if needed for zod conflict.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`bash`]

  **Verification**:

  ```bash
  grep "@anthropic-ai/sdk" package.json
  grep "@anthropic-ai/sdk" admin-dashboard/package.json
  ```

- [x] 2. Create Scripts AI Service

  **What to do**:
  - Create `scripts/ai-service.ts`.
  - Implement `translate` and `generateTopics` functions.
  - Implement provider switching (OpenAI, Anthropic, Gemini).
  - Handle `baseUrl` for Gemini (use `fetch` if SDK fails, or check SDK config options).
  - **Reference**: Use the draft implementation logic.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`typescript`, `node`]

  **References**:
  - `scripts/06_batch_process.ts` (original logic)

  **Acceptance Criteria**:
  - [ ] `tsx scripts/ai-service.ts` (if testable) compiles without error.
  - [ ] Functions export correct types.

- [x] 3. Create Dashboard AI Service

  **What to do**:
  - Create `admin-dashboard/lib/ai-service.ts`.
  - Copy logic from `scripts/ai-service.ts` (adjusting imports if needed).
  - Ensure it works in Next.js environment.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`typescript`, `nextjs`]

  **Acceptance Criteria**:
  - [ ] File exists at `admin-dashboard/lib/ai-service.ts`.

- [x] 4. Refactor CLI Script

  **What to do**:
  - Update `scripts/06_batch_process.ts`.
  - Remove direct OpenAI usage.
  - Import `translate` and `generateTopics` from `./ai-service`.
  - Update main loop to use these functions.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-medium`
  - **Skills**: [`typescript`]

  **Verification**:

  ```bash
  # Check for residual OpenAI imports (should only be in ai-service)
  grep "import OpenAI" scripts/06_batch_process.ts # Should be gone or unused
  ```

- [x] 5. Refactor Dashboard APIs

  **What to do**:
  - Update `admin-dashboard/app/api/actions/translate/route.ts`.
  - Update `admin-dashboard/app/api/actions/generate-topics/route.ts`.
  - Replace OpenAI logic with `import { translate, generateTopics } from '@/lib/ai-service'`.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-medium`
  - **Skills**: [`nextjs`]

- [x] 6. Update Environment & Verify

  **What to do**:
  - Create/Update `.env` (or `.env.example`) with new keys.
  - Test the CLI script with a sample run (or dry run).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`bash`]

  **Acceptance Criteria**:
  - [ ] `.env` contains `AI_PROVIDER`, `ANTHROPIC_BASE_URL`, `GEMINI_BASE_URL`.
