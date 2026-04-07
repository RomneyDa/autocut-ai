import { CutRecommendation } from './types';

export interface SkipRegion {
  start: number;
  end: number;
  type: 'cut' | 'gap-fill';
}

export interface PlaySegment {
  actualStart: number;
  actualEnd: number;
  virtualStart: number;
  virtualEnd: number;
}

/**
 * Build a deterministic segment map from cuts + min gap.
 * Returns skip regions (for timeline markers) and play segments (for time mapping).
 */
export function buildSegmentMap(
  cuts: CutRecommendation[],
  selectedCuts: Set<number>,
  duration: number,
  minSegmentMs: number = 0,
) {
  // 1. Get selected cuts sorted
  const selected = cuts
    .map((c, i) => ({ ...c, index: i }))
    .filter(c => selectedCuts.has(c.index))
    .sort((a, b) => a.startTime - b.startTime);

  // 2. Build skip regions from cuts
  const skipRegions: SkipRegion[] = selected.map(c => ({
    start: c.startTime,
    end: c.endTime,
    type: 'cut' as const,
  }));

  // 3. Find gaps between adjacent cuts shorter than minSegmentMs → gap-fill
  const minSec = minSegmentMs / 1000;
  const gapFills: SkipRegion[] = [];
  for (let i = 0; i < selected.length - 1; i++) {
    const gap = selected[i + 1].startTime - selected[i].endTime;
    if (gap > 0 && gap < minSec) {
      gapFills.push({
        start: selected[i].endTime,
        end: selected[i + 1].startTime,
        type: 'gap-fill',
      });
    }
  }

  // 4. Merge all skip regions (cuts + gap-fills) into non-overlapping sorted list
  const allSkips = [...skipRegions, ...gapFills].sort((a, b) => a.start - b.start);
  const merged: SkipRegion[] = [];
  for (const region of allSkips) {
    const last = merged[merged.length - 1];
    if (last && region.start <= last.end) {
      last.end = Math.max(last.end, region.end);
      // Keep type as 'cut' if either is a cut
      if (region.type === 'cut') last.type = 'cut';
    } else {
      merged.push({ ...region });
    }
  }

  // 5. Build play segments (the non-skipped parts)
  const segments: PlaySegment[] = [];
  let virtualTime = 0;
  let pos = 0;

  for (const skip of merged) {
    if (skip.start > pos) {
      const segLen = skip.start - pos;
      segments.push({
        actualStart: pos,
        actualEnd: skip.start,
        virtualStart: virtualTime,
        virtualEnd: virtualTime + segLen,
      });
      virtualTime += segLen;
    }
    pos = skip.end;
  }
  // Final segment after last skip
  if (pos < duration) {
    const segLen = duration - pos;
    segments.push({
      actualStart: pos,
      actualEnd: duration,
      virtualStart: virtualTime,
      virtualEnd: virtualTime + segLen,
    });
    virtualTime += segLen;
  }

  const editedDuration = virtualTime;

  return { skipRegions, gapFills, merged, segments, editedDuration };
}

/** Convert actual video time → virtual (edited) time */
export function actualToVirtual(actualTime: number, segments: PlaySegment[]): number {
  for (const seg of segments) {
    if (actualTime >= seg.actualStart && actualTime <= seg.actualEnd) {
      return seg.virtualStart + (actualTime - seg.actualStart);
    }
  }
  // Past the end or in a skip region — find nearest segment
  const last = segments[segments.length - 1];
  if (last && actualTime > last.actualEnd) return last.virtualEnd;
  // In a skip — return the virtual time at the start of the next segment
  for (const seg of segments) {
    if (actualTime < seg.actualStart) return seg.virtualStart;
  }
  return 0;
}

/** Convert virtual (edited) time → actual video time */
export function virtualToActual(virtualTime: number, segments: PlaySegment[]): number {
  for (const seg of segments) {
    if (virtualTime >= seg.virtualStart && virtualTime <= seg.virtualEnd) {
      return seg.actualStart + (virtualTime - seg.virtualStart);
    }
  }
  const last = segments[segments.length - 1];
  return last ? last.actualEnd : 0;
}

/** Check if an actual time falls within any skip region. Returns the end time to skip to, or null. */
export function getSkipTarget(actualTime: number, merged: SkipRegion[]): number | null {
  for (const region of merged) {
    if (actualTime >= region.start && actualTime < region.end) {
      return region.end;
    }
  }
  return null;
}
