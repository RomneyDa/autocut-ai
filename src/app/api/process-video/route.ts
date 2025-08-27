import { NextRequest, NextResponse } from 'next/server';
import { VideoProcessor } from '@/lib/video-processor';
import { CutRecommendation } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const cutsData = formData.get('cuts') as string;

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    if (!cutsData) {
      return NextResponse.json({ error: 'No cuts data provided' }, { status: 400 });
    }

    const selectedCuts: CutRecommendation[] = JSON.parse(cutsData);

    // Process the video with the selected cuts
    const processedVideo = await VideoProcessor.applyRecommendedCuts(
      videoFile,
      selectedCuts
    );

    // Convert blob to buffer for response
    const buffer = Buffer.from(await processedVideo.arrayBuffer());

    // Return the processed video
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': videoFile.type,
        'Content-Disposition': `attachment; filename="edited-${videoFile.name}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Video processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}