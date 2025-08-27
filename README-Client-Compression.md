# Client-Side Video Compression for AutoCut.AI

## Overview

AutoCut.AI now includes **client-side video compression** using FFmpeg WebAssembly, allowing users to compress videos directly in their browser before upload. This provides several benefits:

- **Privacy**: Videos never leave the user's device during compression
- **Faster Uploads**: Smaller file sizes mean quicker uploads
- **Cost Efficiency**: Reduced server bandwidth and processing costs
- **Better UX**: Automatic compression suggestions for large files

## Technical Implementation

### Core Technology

- **FFmpeg.wasm**: WebAssembly version of FFmpeg running in browser
- **Streaming Compression**: Process large videos without memory issues
- **Quality Presets**: Optimized settings for different use cases
- **Progress Tracking**: Real-time compression progress updates

### Components

#### `ClientVideoProcessor` (`src/lib/client-video-processor.ts`)
```typescript
// Main compression engine
const processor = new ClientVideoProcessor();
await processor.initialize();

const compressed = await processor.compressVideo(file, {
  quality: 'medium',
  maxSizeMB: 25,
  onProgress: (progress) => console.log(`${progress}%`)
});
```

#### `VideoCompressor` (`src/components/VideoCompressor.tsx`)
- Interactive compression UI
- Quality settings (low/medium/high)
- Real-time progress display
- Compression statistics
- Skip option for users

#### `VideoUploader` (Enhanced)
- Automatic compression detection (files > 25MB)
- Seamless integration with existing upload flow
- Compression recommendations
- File preview with controls

## Features

### 🎛️ **Quality Presets**
- **High**: CRF 18, 1920p, 2Mbps - Best quality, larger size
- **Medium**: CRF 23, 1080p, 1Mbps - Balanced quality/size
- **Low**: CRF 28, 720p, 500kbps - Smallest size, acceptable quality

### 📊 **Smart Compression**
- Automatic quality adjustment based on target file size
- Progressive compression if initial attempt is still too large
- Preserves aspect ratios and important video metadata

### 🔄 **User Experience**
- Non-blocking initialization (loads FFmpeg in background)
- Real-time progress updates with percentage
- Compression statistics (original vs compressed size)
- One-click skip option for users who prefer original files

### 🛡️ **Privacy & Security**
- All processing happens locally in browser
- No video data sent to servers during compression
- Original files never uploaded unless user chooses to skip

## Usage Flow

1. **Upload Detection**: When user selects video > 25MB
2. **Compression Offer**: Show compression interface with settings
3. **Processing**: User can watch real-time compression progress
4. **Results**: Show compression stats and file size reduction
5. **Upload**: Proceed with compressed file or skip to use original

## Configuration Options

```typescript
interface CompressionOptions {
  quality: 'low' | 'medium' | 'high';
  maxSizeMB: number;          // Target max file size
  onProgress?: (progress: number) => void;
}
```

### Quality Settings Breakdown

| Quality | CRF | Resolution | Bitrate | Use Case |
|---------|-----|------------|---------|----------|
| High    | 18  | 1920p      | 2Mbps   | Professional content, important details |
| Medium  | 23  | 1080p      | 1Mbps   | General use, good balance |
| Low     | 28  | 720p       | 500kbps | Quick uploads, acceptable quality |

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 57+
- ✅ Firefox 52+  
- ✅ Safari 15+
- ✅ Edge 79+

### Requirements
- WebAssembly support
- SharedArrayBuffer (for better performance)
- Modern JavaScript features (async/await, modules)

## Performance Considerations

### Memory Usage
- FFmpeg.wasm uses significant memory for video processing
- Automatic cleanup after compression
- Streams large files to prevent memory overflow

### Processing Time
- ~1-3x realtime for most videos (3min video = 1-9min compression)
- Depends on:
  - Video resolution and duration
  - Device CPU performance
  - Selected quality settings
  - Browser optimizations

### File Size Reductions
Typical compression results:
- **High Quality**: 30-50% size reduction
- **Medium Quality**: 50-70% size reduction  
- **Low Quality**: 70-85% size reduction

## Error Handling

### Graceful Degradation
- If FFmpeg fails to load: Show skip option
- If compression fails: Fall back to original file
- Memory errors: Suggest lower quality settings
- Network errors: Retry initialization

### User Messaging
```typescript
// Clear error states with actionable messages
{
  ffmpegLoadError: "Video compression unavailable. Continue without compression?",
  compressionError: "Compression failed. Upload original file instead?",
  memoryError: "File too large for compression. Try a shorter video or upload original."
}
```

## Integration with Analysis Pipeline

The compressed videos work seamlessly with the existing analysis pipeline:

1. **Frame Extraction**: FFmpeg server-side processes compressed video normally
2. **Audio Extraction**: Compressed audio maintains quality for transcription
3. **AI Analysis**: Gemini processes frames from compressed video effectively
4. **Timestamp Accuracy**: Compression preserves timing for precise cut recommendations

## Benefits

### For Users
- **Faster uploads** (2-5x speed improvement for large files)
- **Privacy protection** (local processing)
- **Cost awareness** (smaller files = lower processing costs)
- **Better experience** (progress feedback, control over quality)

### For Service
- **Reduced bandwidth costs** (smaller uploads)
- **Faster server processing** (smaller files to process)
- **Better scalability** (less server resources per user)
- **Improved reliability** (smaller files = fewer network issues)

## Future Enhancements

### Planned Features
- **Batch compression** for multiple videos
- **Custom compression profiles** for different content types
- **Thumbnail extraction** during compression
- **Video analysis preview** (duration, resolution, bitrate)
- **Advanced settings** for power users (custom CRF, filters, etc.)

### Optimization Opportunities
- **Worker threads** for background compression
- **Streaming uploads** while compressing
- **Progressive compression** (start with low quality, enhance gradually)
- **Smart presets** based on content analysis

## Development Notes

### Dependencies
```json
{
  "@ffmpeg/ffmpeg": "^0.12.6",
  "@ffmpeg/core": "^0.12.6",
  "@ffmpeg/util": "^0.12.1"
}
```

### Build Considerations
- FFmpeg WASM files are ~30MB total
- Consider CDN hosting for core files
- Lazy loading prevents blocking app startup
- SharedArrayBuffer requires proper headers in production

This client-side compression feature significantly enhances AutoCut.AI's user experience while maintaining privacy and reducing server costs.