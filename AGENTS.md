# AGENTS.md - AI Agent Development Guide

This file provides essential information for AI coding agents working with the AutoCut.AI codebase.

## Project Overview

**AutoCut.AI** is a Next.js-based video editing SaaS that uses AI to analyze videos and recommend cuts for removing filler words, silences, and unwanted content. It integrates Google Gemini 2.5 Pro for video analysis, AssemblyAI for transcription, FFmpeg for video processing, and Stripe for payments.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Environment Variables Required

Create `.env.local` with:
- `GEMINI_API_KEY` - Google Gemini API key (https://ai.google.dev/api)
- `ASSEMBLY_API_KEY` - AssemblyAI API key (https://www.assemblyai.com/)
- `STRIPE_SECRET_KEY` - Stripe secret key (test or live)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

**Note:** Never commit actual API keys. Always use `.env.local.example` for templates.

## Tech Stack

- **Framework:** Next.js 15.5.2 with App Router
- **Runtime:** React 19.1.0, Node.js 20+
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **AI/ML:** Google Gemini 2.5 Pro, AssemblyAI
- **Video Processing:** FFmpeg, fluent-ffmpeg, @ffmpeg/ffmpeg (client-side)
- **Payments:** Stripe
- **UI Components:** Lucide React icons, React Dropzone

## Project Architecture

### Core Processing Pipeline

1. **Frame Extraction:** Extract video frames at 10fps (0.1s intervals) using FFmpeg
2. **Audio Extraction:** Extract full audio track for transcription
3. **Transcription:** AssemblyAI processes audio with word-level timestamps
4. **AI Analysis:** Gemini analyzes frames + transcript to recommend cuts
5. **Preview & Payment:** User reviews cuts, pays $1.00 via Stripe
6. **Video Generation:** FFmpeg applies cuts and outputs edited video

### Directory Structure

```
src/
├── app/
│   ├── api/                  # Next.js API routes
│   │   ├── analyze/          # Video analysis endpoint
│   │   ├── process-video/    # Video processing endpoint
│   │   ├── create-payment-intent/  # Stripe payment
│   │   └── test-apis/        # API testing endpoint
│   ├── page.tsx              # Main UI (active version)
│   ├── page-basic.tsx        # Simplified UI variant
│   ├── page-test-only.tsx    # Testing UI
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── VideoUploader.tsx     # Main video upload component
│   ├── AnalysisResults.tsx   # Cut recommendations display
│   ├── ProcessingStatus.tsx  # Progress indicator
│   ├── PaymentModal.tsx      # Stripe payment UI
│   ├── VideoPreview.tsx      # Video preview player
│   ├── VideoCompressor.tsx   # Client-side compression
│   └── [various backup files]
├── lib/
│   ├── types.ts              # TypeScript interfaces
│   ├── ffmpeg-utils.ts       # FFmpeg utilities
│   ├── gemini-client.ts      # Gemini API client
│   ├── assembly-client.ts    # AssemblyAI client
│   ├── stripe.ts             # Stripe config
│   ├── video-processor.ts    # Video editing logic
│   └── client-video-processor.ts  # Client-side processing
```

### Key Files to Understand

1. **`src/lib/types.ts`** - Core TypeScript interfaces for the entire app
2. **`src/app/api/analyze/route.ts`** - Main video analysis logic
3. **`src/lib/gemini-client.ts`** - Gemini API integration
4. **`src/lib/assembly-client.ts`** - AssemblyAI transcription
5. **`src/lib/ffmpeg-utils.ts`** - Video processing utilities
6. **`spec.md`** - Original product specification

## Code Style & Conventions

### TypeScript
- **Strict mode enabled** - All types must be properly defined
- **No implicit any** - Explicit typing required
- **Interfaces over types** - Use `interface` for object shapes
- **Export types** - Keep types in `src/lib/types.ts` when shared

### React Components
- **Functional components** with hooks (no class components)
- **'use client'** directive for client components
- **Server components by default** in App Router
- **Props interfaces** - Define props as TypeScript interfaces

### Naming Conventions
- **Components:** PascalCase (e.g., `VideoUploader.tsx`)
- **Utilities:** camelCase (e.g., `ffmpeg-utils.ts`)
- **API routes:** kebab-case folders (e.g., `process-video/`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `FRAMES_PER_SECOND`)

### File Organization
- **Backup files:** Multiple `-old`, `-backup`, `-broken` variants exist for experimentation
- **Active files:** Check imports in `page.tsx` to find current implementations
- **Multiple READMEs:** `README.md` (Next.js default), `README-AutoCut.md` (detailed), `README-Client-Compression.md`

## Critical Implementation Details

### Timestamp Synchronization
**CRITICAL:** All processing must maintain consistent timestamps at 0.1s intervals (10fps).
- Frame extraction: 10fps
- AssemblyAI: Word-level timestamps
- Gemini: Frame timestamps in prompts
- Cut recommendations: Precise start/end times

### API Integration Patterns

#### Gemini API
```typescript
// Use generative AI for frame analysis
// Include timestamps with each frame
// Prompt engineering in src/lib/gemini-prompts.ts
```

#### AssemblyAI
```typescript
// Upload audio for transcription
// Request word-level timestamps
// Match transcript timing with video frames
```

#### Stripe
```typescript
// PaymentIntent for $1.00
// Client-side Stripe.js integration
// Server-side payment confirmation
```

### FFmpeg Usage
- **Server-side:** `fluent-ffmpeg` for Node.js
- **Client-side:** `@ffmpeg/ffmpeg` for browser processing
- **Operations:** Frame extraction, audio extraction, video cutting
- **Format:** Maintain original video format when possible

### Error Handling
- Always return proper HTTP status codes
- Use try-catch for async operations
- Provide user-friendly error messages
- Log errors server-side for debugging

## Common Development Tasks

### Adding a New API Endpoint
1. Create folder in `src/app/api/your-endpoint/`
2. Add `route.ts` with `POST`, `GET`, etc. handlers
3. Import and use utilities from `src/lib/`
4. Update types in `src/lib/types.ts`
5. Add error handling and logging

### Adding a New Component
1. Create in `src/components/ComponentName.tsx`
2. Add `'use client'` if it uses hooks/interactivity
3. Import and use in `src/app/page.tsx`
4. Define prop types as interface

### Modifying AI Prompts
- Edit `src/lib/gemini-prompts.ts`
- Test with various video types
- Consider token limits and costs

### Updating Video Processing
- Modify `src/lib/ffmpeg-utils.ts` for FFmpeg operations
- Update `src/lib/video-processor.ts` for cut logic
- Test with different video formats

## Testing

### Manual Testing
- Use `src/app/page-test-only.tsx` for isolated testing
- Test with various video formats (mp4, mov, webm)
- Verify timestamp accuracy in cut recommendations
- Test Stripe payment flow with test keys

### API Testing
- Endpoint: `/api/test-apis` for quick API checks
- Test individual services (Gemini, AssemblyAI, Stripe)

### Common Issues
1. **FFmpeg not found:** Install FFmpeg system-wide
2. **API key errors:** Check `.env.local` configuration
3. **Memory issues:** Large videos may need streaming processing
4. **CORS errors:** Next.js API routes handle CORS automatically

## Performance Considerations

- **Video Size:** Large files should be compressed client-side before upload
- **Frame Limit:** Consider limiting frames sent to Gemini to control costs
- **Parallel Processing:** Frame and audio extraction can run concurrently
- **Cleanup:** Delete temporary files after processing

## Security Notes

- **API Keys:** Never expose server-side keys to client
- **File Validation:** Validate video format and size before processing
- **Payment Security:** Use Stripe's secure payment flow
- **User Data:** Clean up uploaded videos after processing

## Deployment

### Vercel (Recommended)
- Next.js optimized platform
- Environment variables via dashboard
- Automatic deployments from Git
- Edge functions for API routes

### Requirements
- Node.js 20+ runtime
- FFmpeg available in production environment
- Environment variables configured
- Sufficient memory for video processing

## External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/api)
- [AssemblyAI Docs](https://www.assemblyai.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

## Important Notes for AI Agents

1. **Multiple file versions exist** - Check imports in active pages to find current implementations
2. **Timestamp precision is critical** - Always maintain 0.1s intervals
3. **API costs matter** - Gemini and AssemblyAI charge per request
4. **Testing requires API keys** - Get test keys for all services
5. **FFmpeg must be installed** - Both system FFmpeg and npm packages used
6. **Client vs Server processing** - Some operations happen browser-side, some server-side
7. **Backup files are kept** - Don't delete `-old` or `-backup` files without checking usage

## Recent Changes

- **PR #1:** Added `.env.local.example` file with template environment variables and helpful comments for easier initial setup

## Questions or Issues?

When working on this codebase:
1. Check `spec.md` for original requirements
2. Review `README-AutoCut.md` for detailed architecture
3. Look at `src/lib/types.ts` for data structures
4. Test with small videos first
5. Monitor API usage and costs
