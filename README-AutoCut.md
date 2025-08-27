# AutoCut.AI - AI-Powered Video Editing SaaS

AutoCut.AI is a simple video editing SaaS app with AI features that analyzes videos and provides recommended cuts/deletions for removing filler words, silent parts, and unnecessary content.

## Features

- **AI Video Analysis**: Uses Google Gemini 2.5 Pro to analyze video frames and content
- **Audio Transcription**: Leverages AssemblyAI for accurate speech-to-text with timestamps
- **Smart Cut Recommendations**: Identifies filler words, silences, repetitive content
- **Interactive Preview**: Review and adjust cut boundaries before processing
- **Payment Integration**: $1.00 processing fee via Stripe
- **Video Processing**: FFmpeg-based video editing with precise timestamp matching

## Architecture

### Core Components

1. **Frame Extraction**: FFmpeg extracts images at 10fps (every 0.1 seconds)
2. **Audio Processing**: Full audio extraction for transcription
3. **AI Analysis**: Gemini analyzes video frames + transcript for cut recommendations
4. **Timestamp Matching**: Critical synchronization between video, audio, and AI analysis
5. **Payment Processing**: Stripe integration for $1.00 service fee
6. **Video Output**: FFmpeg applies cuts and generates final edited video

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI Services**: Google Gemini 2.5 Pro, AssemblyAI
- **Video Processing**: FFmpeg, fluent-ffmpeg
- **Payments**: Stripe
- **File Handling**: React Dropzone for drag & drop uploads

## Setup Instructions

### Prerequisites

- Node.js 18+
- FFmpeg installed on your system
- API keys for:
  - Google Gemini API
  - AssemblyAI
  - Stripe (for payments)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

4. Add your API keys to `.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ASSEMBLY_API_KEY=your_assembly_ai_api_key_here
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Getting API Keys

#### Google Gemini API
1. Go to [Google AI Studio](https://ai.google.dev/api)
2. Create a new project and enable the Gemini API
3. Generate an API key

#### AssemblyAI
1. Sign up at [AssemblyAI](https://www.assemblyai.com/)
2. Get your API key from the dashboard

#### Stripe
1. Create a Stripe account
2. Get your test API keys from the dashboard
3. Create a $1.00 product/price and use that Price ID

## How It Works

### 1. Video Upload
- Users drag & drop or select a video file
- Optional custom instructions for AI analysis
- File validation (format, size limits)

### 2. Processing Pipeline
- **Extract Frames**: FFmpeg generates images every 0.1 seconds
- **Extract Audio**: Convert video audio to format suitable for transcription
- **Transcribe**: AssemblyAI processes audio with word-level timestamps
- **AI Analysis**: Gemini analyzes frames + transcript to identify cuts

### 3. Cut Recommendations
The AI identifies several types of content to remove:
- **Filler Words**: "um", "uh", "like", "you know"
- **Silence**: Pauses longer than 2 seconds
- **Repetition**: Repeated content or mistakes
- **Other**: Custom criteria based on user instructions

### 4. Review & Payment
- Interactive UI to review/adjust recommended cuts
- Real-time preview of time savings
- Stripe payment processing for $1.00 fee

### 5. Video Generation
- Apply selected cuts using FFmpeg
- Maintain quality and format consistency
- Download processed video file

## API Endpoints

### POST /api/analyze
Analyzes uploaded video and returns cut recommendations.

**Request:**
- FormData with video file and optional prompt

**Response:**
```json
{
  "success": true,
  "data": {
    "frames": 120,
    "transcript": 45,
    "description": "AI-generated video description",
    "recommendedCuts": [
      {
        "startTime": 1.2,
        "endTime": 2.1,
        "reason": "Filler word 'um'",
        "confidence": 0.9,
        "type": "filler"
      }
    ],
    "fullTranscript": [...]
  }
}
```

### POST /api/process-video
Processes video with selected cuts and returns edited file.

### POST /api/create-payment-intent
Creates Stripe payment intent for $1.00 processing fee.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts          # Video analysis endpoint
│   │   ├── process-video/route.ts    # Video processing endpoint
│   │   └── create-payment-intent/route.ts
│   ├── page.tsx                      # Main application page
│   └── layout.tsx
├── components/
│   ├── VideoUploader.tsx             # Drag & drop video upload
│   ├── ProcessingStatus.tsx          # Progress indicator
│   ├── AnalysisResults.tsx           # Cut recommendations UI
│   └── PaymentModal.tsx              # Stripe payment form
├── lib/
│   ├── types.ts                      # TypeScript interfaces
│   ├── ffmpeg-utils.ts               # Video processing utilities
│   ├── gemini-client.ts              # Google Gemini API client
│   ├── assembly-client.ts            # AssemblyAI API client
│   ├── stripe.ts                     # Stripe configuration
│   └── video-processor.ts            # Video editing logic
```

## Key Features Implementation

### Timestamp Synchronization
- All processing maintains 10fps (0.1s intervals)
- Frame extraction, transcription, and analysis use consistent timing
- Cut recommendations preserve precise timestamp matching

### Error Handling
- Comprehensive error handling for API failures
- User-friendly error messages
- Graceful degradation for processing issues

### Performance Optimization
- Parallel processing of frames and audio extraction
- Limited frame analysis to manage API costs
- Efficient video processing with FFmpeg

### User Experience
- Real-time progress updates during processing
- Interactive cut review with visual indicators
- Seamless payment integration
- One-click video download

## Future Enhancements

- **Advanced Cut Types**: Scene transitions, topic changes
- **Batch Processing**: Multiple video support
- **Custom Pricing**: Different service tiers
- **Preview Playback**: Video preview with cuts applied
- **Export Options**: Multiple formats and quality settings
- **User Accounts**: Save preferences and processing history

## Troubleshooting

### FFmpeg Issues
- Ensure FFmpeg is installed and accessible in PATH
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt install ffmpeg`

### API Limits
- Monitor API usage for Gemini and AssemblyAI
- Implement rate limiting if needed
- Consider caching for repeated requests

### Memory Management
- Large video files may require streaming processing
- Implement file cleanup for temporary files
- Monitor server memory usage

---

This application demonstrates a complete AI-powered SaaS workflow with real-world payment processing and professional video editing capabilities.