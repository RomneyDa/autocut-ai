# AutoCut AI

AI-powered video editor that detects and removes filler words, pauses, and unnecessary content.

Served at `dallinromney.com/autocut` via Vercel, proxied from the main site on Netlify.
`basePath: "/autocut"` is required in next.config.ts — do not remove it.

## Architecture

### Client-side (BYOK flow — current)

Everything runs in the browser when the user provides their own Gemini API key:

1. **Video processing**: `@ffmpeg/ffmpeg` WASM extracts frames (2fps) and audio (WAV) from the video entirely client-side
2. **Analysis**: `@google/generative-ai` SDK calls Gemini directly from the browser with frames + audio inline
3. **Result**: Gemini returns cut recommendations and transcript as JSON

No video data ever touches our server. The API key is stored in localStorage and sent directly to Gemini.

Key files:
- `src/lib/client-analyzer.ts` — orchestrates client-side extraction + Gemini call
- `src/lib/gemini-client.ts` — Gemini SDK wrapper (works in both browser and Node)
- `src/lib/client-video-processor.ts` — WASM ffmpeg for compression
- `src/lib/gemini-prompts.ts` — analysis prompts

### Server-side (future paid tier)

API routes exist for a future flow where users pay to use a server-side Gemini key:
- `src/app/api/analyze/route.ts` — server-side extraction + Gemini call
- `src/app/api/test-apis/route.ts` — key validation
- `src/app/api/process-video/route.ts` — apply cuts and export edited video
- `src/app/api/create-payment-intent/route.ts` — Stripe payment (scaffolded, not wired up)

Server-side extraction uses `fluent-ffmpeg` (requires ffmpeg binary on the host).

### Direction

The BYOK client-side flow is the primary path. Server routes should only be used when:
- User pays to use our Gemini key (no BYOK)
- Server-side processing is needed for export (applying cuts to produce final video)

The Gemini call itself could stay client-side even in the paid tier — only the API key source changes. Avoid routing video through the server unless necessary.

## Tech

- Next.js 16 with App Router, deployed on Vercel
- `@ffmpeg/ffmpeg` WASM for client-side video processing
- `@google/generative-ai` for Gemini API (client + server compatible)
- `fluent-ffmpeg` for server-side extraction (future/paid tier)
- Stripe scaffolded for payments (not active)
- Tailwind CSS, Lucide icons

## Notes

- `NEXT_PUBLIC_BASE_PATH` env var must be `/autocut` — all client-side fetch calls use it
- The test-apis route uses `ListModels` endpoint (no tokens consumed) to validate keys
- GeminiClient auto-discovers the latest flash model via ListModels API
