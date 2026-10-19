# IELTS Unpacked — MVP prototype

This project adapts the supplied Assessora React + TypeScript + Vite project into an IELTS Writing learning-platform prototype while retaining its visual foundation:
- Plus Jakarta Sans
- Deep blue / orange / white palette
- Rounded cards, subtle borders, compact navigation, responsive layouts

## Prototype areas
- Overview landing page
- Learning paths and lesson detail panel
- IELTS Mythbusters library with category filters, search, and save-for-later state
- Writing Practice Studio with a short Task 2 prompt
- Reflection/review screen

## Run locally
Requires Node.js (current LTS recommended).

```bash
npm install
npm run dev
```

The `dev` script uses the project's existing server entry point. For a static frontend build, run `npm run build`.

## Important MVP boundary
The review screen is a guided reflection demo, not live AI assessment. No official or estimated IELTS band score is generated. A production AI feedback service still needs a secure server-side model integration, prompt/versioning, validation, privacy controls, and proper feedback evaluation. Do not put API keys in the browser.

The original Assessora files and existing assessment modules remain in the project; the active `src/App.tsx` is now the IELTS Unpacked learning prototype.
