# AutoCut AI

AI-powered video editor that automatically detects and removes filler words, long pauses, and unnecessary content from your videos.

**Live at [dallinromney.com/autocut](https://dallinromney.com/autocut)**

## How it works

1. Drop a video into the browser
2. Enter your Gemini API key (stored locally, never sent to our servers)
3. AutoCut extracts frames and audio client-side using FFmpeg WASM
4. Gemini analyzes the content and recommends cuts
5. Review the suggestions, adjust as needed, and export

All video processing happens in your browser — nothing is uploaded to any server.

## Tech stack

- **Next.js** (App Router) deployed on Vercel
- **FFmpeg WASM** (`@ffmpeg/ffmpeg`) for client-side video processing
- **Google Gemini** (`@google/generative-ai`) for AI analysis
- **Tailwind CSS** for styling

## Development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000/autocut` (basePath is `/autocut`).

## License

MIT
