# AGENTS.md - AI Agent Guide for AutoCut.AI

This file provides essential information for AI coding agents working with the AutoCut.AI codebase.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see PR #1)
cp .env.local.example .env.local
# Then add your API keys to .env.local

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Project Overview

**AutoCut.AI** is an AI-powered video editing SaaS that analyzes videos and recommends cuts to remove filler words, silent parts, and unnecessary content.

**Tech Stack:**
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js API Routes
- **AI Services:** Google Gemini 2.5 Pro, AssemblyAI
- **Video Processing:** FFmpeg, fluent-ffmpeg, @ffmpeg/ffmpeg (client-side)
- **Payments:** Stripe ($1.00 processing fee)
- **File Handling:** react-dropzone

## Architecture Overview

### Core Processing Pipeline

1. **Video Upload** → User uploads via drag-and-drop or file dialog
2. **Frame Extraction** → FFmpeg extracts frames at 10fps (every 0.1s)
3. **Audio Extraction** → FFmpeg extracts full audio track
4. **Transcription** → AssemblyAI transcribes audio with word-level timestamps
5. **AI Analysis** → Gemini analyzes frames + transcript for cut recommendations
6. **Review & Payment** → User reviews cuts, pays $1.00 via Stripe
7. **Video Processing** → FFmpeg applies cuts and generates final video

### Critical Design Requirement

⚠️ **TIMESTAMP SYNCHRONIZATION IS CRITICAL**

- Everything operates at **10fps (0.1 second intervals)**
- Frame extraction, transcription timestamps, and AI analysis MUST align
- Any timestamp mismatch will cause cuts to be applied incorrectly
- Always preserve and validate timestamps through the entire pipeline

## Key Files & Components

### API Routes (`src/app/api/`)
- `analyze/route.ts` - Video analysis endpoint (frames + transcript → AI recommendations)
- `process-video/route.ts` - Applies cuts and returns edited video
- `create-payment-intent/route.ts` - Stripe payment processing

### Core Libraries (`src/lib/`)
- `types.ts` - TypeScript interfaces (VideoFrame, CutRecommendation, etc.)
- `ffmpeg-utils.ts` - Server-side FFmpeg operations
- `client-video-processor.ts` - Client-side FFmpeg.wasm operations
- `gemini-client.ts` - Google Gemini API integration
- `gemini-prompts.ts` - AI prompts and examples
- `assembly-client.ts` - AssemblyAI transcription integration
- `video-processor.ts` - Video editing logic
- `stripe.ts` - Stripe configuration

### UI Components (`src/components/`)
- `VideoUploader.tsx` - Drag & drop video upload
- `AnalysisResults.tsx` - Cut recommendations display
- `VideoPreviewWithCuts.tsx` - Interactive video preview with cut markers
- `PaymentModal.tsx` - Stripe payment integration
- `ProcessingStatus.tsx` - Progress indicators

## Code Conventions

### TypeScript
- Strict typing enforced
- All interfaces defined in `src/lib/types.ts`
- Use `interface` for object shapes, `type` for unions/primitives
- No implicit `any` types

### React Components
- Functional components with hooks
- Use `"use client"` directive for client components
- State management via `useState`, `useEffect`
- Async operations handled with proper error boundaries

### Naming Conventions
- Components: PascalCase (`VideoUploader.tsx`)
- Files: kebab-case for utilities (`ffmpeg-utils.ts`), PascalCase for components
- API routes: kebab-case (`create-payment-intent`)
- Types/Interfaces: PascalCase (`CutRecommendation`)

### API Response Pattern
```typescript
// Success response
{ success: true, data: { ... } }

// Error response
{ success: false, error: "Error message" }
```

## Environment Variables

Required API keys (see `.env.local.example` added in PR #1):
- `GEMINI_API_KEY` - Google Gemini API key
- `ASSEMBLY_API_KEY` - AssemblyAI API key
- `STRIPE_SECRET_KEY` - Stripe secret key (test mode)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

## Cut Recommendation Types

Valid cut types defined in `types.ts`:
- `'silence'` - Pauses longer than 2 seconds
- `'filler'` - Filler words ("um", "uh", "like")
- `'repetition'` - Repeated content or mistakes
- `'visual_pause'` - Visual pauses (no significant movement)
- `'poor_quality'` - Low quality video segments
- `'transition'` - Awkward transitions
- `'other'` - Custom criteria from user prompt

### Audio vs Video Cut Types
- Audio-based: `'silence'`, `'filler'`, `'repetition'`
- Video-based: `'visual_pause'`, `'poor_quality'`, `'transition'`
- Gemini client validates cut types based on whether audio is present

## Common Development Tasks

### Adding a New Cut Type
1. Add type to `CutRecommendation['type']` union in `src/lib/types.ts`
2. Update validation in `gemini-client.ts` (`validateCutType()`)
3. Update AI prompts in `gemini-prompts.ts` with examples
4. Update UI in `AnalysisResults.tsx` for display/styling

### Modifying AI Analysis
- Edit prompts in `src/lib/gemini-prompts.ts`
- Update `GeminiClient.analyzeVideo()` in `src/lib/gemini-client.ts`
- Test with various video types to ensure quality recommendations

### Adjusting Frame Rate
- Currently hardcoded at 10fps (0.1s intervals)
- To change: update frame extraction in `ffmpeg-utils.ts`
- **CRITICAL:** Update all timestamp logic accordingly
- Test thoroughly to ensure synchronization remains intact

### Adding New Payment Tiers
- Update Stripe product/price in dashboard
- Modify `create-payment-intent/route.ts` pricing logic
- Update UI in `PaymentModal.tsx`

## Testing

### Manual Testing Checklist
- [ ] Video upload (drag-drop and file dialog)
- [ ] Frame extraction (verify 10fps timing)
- [ ] Audio transcription (check timestamp alignment)
- [ ] AI analysis (validate cut recommendations)
- [ ] Cut preview (verify timestamps match video)
- [ ] Payment flow (use Stripe test cards)
- [ ] Video processing (verify cuts applied correctly)
- [ ] Download final video

### Test Video Characteristics
- Include filler words ("um", "uh", "like")
- Have silence gaps (> 2 seconds)
- Include repetitive content
- Mix of static and dynamic scenes
- Duration: 30 seconds - 2 minutes for testing

### Stripe Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## Troubleshooting

### FFmpeg Issues
- **Server-side:** Ensure FFmpeg installed in PATH
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt install ffmpeg`
- **Client-side:** Uses @ffmpeg/ffmpeg (WASM), no installation needed

### Timestamp Misalignment
- Verify frame extraction is exactly 10fps
- Check AssemblyAI word timestamps are properly mapped
- Validate Gemini receives correct timestamp data
- Test with known video and verify cut boundaries

### API Rate Limits
- Gemini: Monitor token usage, implement batching if needed
- AssemblyAI: Check concurrent request limits
- Consider caching for development/testing

### Memory Issues
- Large videos may require streaming processing
- Implement cleanup for temporary files in `/tmp`
- Monitor Next.js API route memory usage

### Build Errors
- Run `npm install` to ensure dependencies are up to date
- Clear `.next` directory: `rm -rf .next`
- Check Node.js version (requires 18+)

## Important Notes for AI Agents

### When Making Changes
1. **Always preserve timestamp synchronization** - this is the most critical aspect
2. **Test with real video files** - edge cases appear with actual content
3. **Validate API responses** - external APIs can return unexpected data
4. **Handle errors gracefully** - provide user-friendly messages
5. **Consider performance** - video processing is resource-intensive

### Code Quality Standards
- Write clear, self-documenting code
- Add comments for complex logic (especially timestamp handling)
- Use TypeScript types strictly
- Follow existing patterns and conventions
- Test edge cases (empty videos, no audio, corrupted files)

### Security Considerations
- Never commit API keys (use .env.local)
- Validate file uploads (type, size limits)
- Sanitize user prompts before sending to AI
- Use Stripe test mode for development
- Clean up temporary files after processing

### Performance Optimization
- Frame extraction can be parallelized
- Consider limiting frame analysis count for large videos
- Implement progress callbacks for long operations
- Use streaming for large file uploads/downloads

## Useful Commands

```bash
# Check FFmpeg installation
ffmpeg -version

# Clear Next.js cache
rm -rf .next

# Check TypeScript types
npx tsc --noEmit

# Format code (if prettier is added)
npm run format

# View dependency tree
npm list --depth=0
```

## Related Documentation

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/api)
- [AssemblyAI API](https://www.assemblyai.com/docs/api-reference/overview)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Stripe API Docs](https://stripe.com/docs/api)
- [React Dropzone](https://react-dropzone.js.org/)

## Recent Changes

- **PR #1:** Added `.env.local.example` file with all required environment variables and helpful comments for obtaining API keys

---

**Last Updated:** 2025-12-06

This file should be updated whenever architectural decisions, critical patterns, or development workflows change.
