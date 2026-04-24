# FixedFlow - Product Specification
*Fixed-Point Calculator for Embedded Software Engineers*

---

## Brand

- **Product Name:** FixedFlow
- **Tagline:** *Precision by design.*
- **Color Scheme:** Green — Primary `#00C853` (accent), `#1B5E20` (dark), `#F1F8E9` (background), `#212121` (text)
- **Typography:** Monospace for numbers/code (JetBrains Mono), Sans-serif for UI (Inter)
- **Hosting:** Firebase Hosting + Firebase Functions (if needed for backend logic)

---

## Tech Stack

- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS (green theme)
- **Math Engine:** Pure TypeScript (no external math libs — deterministic bit-level arithmetic)
- **Code Execution Feature:** WebAssembly (Emscripten) or server-side sandboxed execution via Firebase Functions
- **Testing:** Vitest (unit), Playwright (E2E)
- **Build Tool:** Vite
- **Deployment:** Firebase Hosting

---

## Feature Modules

### Module 1: Fixed-Point Bit Visualizer
*Core calculator — shows bit layout and precision loss*

**Inputs:**
- Signed / Unsigned toggle
- Total word size (bits): 8, 16, 32, 64, or custom
- Integer bits (I) and fractional bits (F) — radix position
- Two operands (A and B) as decimal or hex values
- Operation: `+`, `-`, `×`, `÷`

**Outputs:**
- Visual bit field diagram showing:
  - Sign bit (if signed)
  - Integer bits
  - Fractional bits
  - Overflow/underflow zone highlighted in red
- Result in: decimal, hex, binary
- Precision loss indicator: how many LSBs were discarded
- Overflow detection with wrap/saturate mode toggle
- Resolution display: `LSB = 2^(-F)`

**Behavior:**
- All arithmetic performed at full 64-bit float precision internally
- Result is then quantized to the target fixed-point format
- Quantization error displayed as absolute and relative values

---

### Module 2: Format Advisor
*Feedback on fixed-point format choices*

**Inputs:**
- Input data format: sign, integer bits, fractional bits
- Output data format: sign, integer bits, fractional bits
- Intermediate computation values (entered as floating-point — the "ideal" result)
- Chosen implementation format for intermediates

**Outputs:**
- Dynamic range analysis: does the chosen format cover the input range?
- Precision analysis: how much resolution is lost at each stage?
- Suggested format improvements (e.g., "Consider Q3.12 instead of Q4.11 for this range")
- SNR estimate: signal-to-noise ratio due to quantization
- Stage-by-stage breakdown showing where precision is lost

**Behavior:**
- User can chain multiple computation stages
- Each stage shows propagation of quantization error
- Color-coded feedback: green (good), yellow (marginal), red (precision loss risk)

---

### Module 3: C Code Analyzer *(Signature Feature)*
*Paste C code, test over a value range, get precision analytics*

**Inputs:**
- C code snippet (single function or expression)
  - Must define inputs as `int`, `int16_t`, `int32_t`, `uint16_t`, etc.
  - Must define fixed-point format via comments or UI fields: `// Q8.8`
- Input value range: min, max, step (or random sample count)
- Reference implementation: floating-point equivalent (optional — used for error comparison)

**Outputs:**
- Per-sample results table: input → fixed-point output → float reference → absolute error → relative error
- Error statistics: mean, max, RMS, histogram
- Overflow events: count and which inputs triggered them
- Precision heatmap over the input range
- Suggested improvements highlighted inline in the code

**Behavior:**
- C code is compiled to WebAssembly via Emscripten in Firebase Functions (sandboxed)
- Alternatively (MVP): a TypeScript interpreter for simple fixed-point C expressions
- Results streamed back to UI
- Export results as CSV

---

## Page Structure

```
/                   → Landing / Home (hero + feature overview)
/calculator         → Module 1: Bit Visualizer
/advisor            → Module 2: Format Advisor
/analyzer           → Module 3: C Code Analyzer
/docs               → Usage documentation
```

---

## .gitignore Policy

- Never commit: `node_modules/`, `.env`, `firebase-debug.log`, `.firebase/`
- Always commit: `src/`, `public/`, `firebase.json`, `.firebaserc`, `vite.config.ts`, test files

---

## Development Phases

### Phase 1 — Scaffold & Core UI
- [x] Vite + React + TypeScript project init
- [x] Tailwind CSS with green theme configured
- [x] Routing (React Router)
- [x] Layout shell: nav, footer, page containers
- [x] Firebase Hosting config (`firebase.json`, `.firebaserc`)

### Phase 2 — Module 1: Bit Visualizer
- [x] Fixed-point math engine (TypeScript)
- [x] Bit field visualization component
- [x] Arithmetic operations with overflow detection
- [x] Unit tests for math engine (16/16 passing)

### Phase 3 — Module 2: Format Advisor
- [x] Multi-stage computation chain UI
- [x] Precision/dynamic range analysis engine
- [x] Format suggestion logic
- [ ] Unit tests

### Phase 4 — Module 3: C Code Analyzer
- [x] TypeScript-based C expression interpreter (MVP)
- [x] Value range sweep engine
- [x] Error statistics
- [x] CSV export
- [ ] Unit tests
- [ ] Error histogram visualization (future)

### Phase 5 — Polish & Deploy
- [x] Landing page (hero + feature cards + facts strip)
- [x] Documentation page
- [x] Firebase deployment pipeline (live: https://fixedflow-33559.web.app)
- [x] E2E tests (Playwright) — tests written in e2e/app.spec.ts targeting https://fixedflow-33559.web.app; run with `playwright test` after installing browsers locally
- [ ] Service account auth for CI deploys (replace FIREBASE_TOKEN)

### Notes
- C Analyzer uses a TypeScript expression interpreter (MVP). Full C→WASM compilation via Emscripten is a future milestone.
- npm binary symlinks for vitest do not work on the host-mounted Docker filesystem; tests run via /tmp/node_modules/.bin/vitest.
- firebase-tools FIREBASE_TOKEN auth is deprecated; migrate to GOOGLE_APPLICATION_CREDENTIALS service account for production CI.

---

*Last updated: 2026-04-23*
*Reference this spec before starting any development task.*
