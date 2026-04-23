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
- [ ] Vite + React + TypeScript project init
- [ ] Tailwind CSS with green theme configured
- [ ] Routing (React Router)
- [ ] Layout shell: nav, footer, page containers
- [ ] Firebase Hosting config (`firebase.json`, `.firebaserc`)

### Phase 2 — Module 1: Bit Visualizer
- [ ] Fixed-point math engine (TypeScript)
- [ ] Bit field visualization component
- [ ] Arithmetic operations with overflow detection
- [ ] Unit tests for math engine

### Phase 3 — Module 2: Format Advisor
- [ ] Multi-stage computation chain UI
- [ ] Precision/dynamic range analysis engine
- [ ] Format suggestion logic
- [ ] Unit tests

### Phase 4 — Module 3: C Code Analyzer
- [ ] TypeScript-based C expression interpreter (MVP)
- [ ] Value range sweep engine
- [ ] Error statistics and histogram
- [ ] CSV export
- [ ] Unit tests

### Phase 5 — Polish & Deploy
- [ ] Landing page
- [ ] Documentation page
- [ ] Firebase deployment pipeline
- [ ] E2E tests (Playwright)

---

*Last updated: 2026-04-23*
*Reference this spec before starting any development task.*
