export const DEFAULT_AUDIO_VOLUME = 0.72;
export const DEFAULT_FADE_DURATION_MS = 1800;
export const DEFAULT_FADE_TICK_MS = 50;

export type AudioTransitionPlan =
  | { kind: "none" }
  | { kind: "keep"; targetTrack: string }
  | { kind: "start"; targetTrack: string; targetVolume: number }
  | {
      kind: "crossfade";
      targetTrack: string;
      targetVolume: number;
      fadeDurationMs: number;
      tickMs: number;
    };

type AudioTransitionInput = {
  currentTrack: string | null | undefined;
  requestedTrack: string | null | undefined;
  fadeDurationMs?: number;
  targetVolume?: number;
  tickMs?: number;
};

type CrossfadeInput = {
  elapsedMs: number;
  durationMs: number;
  incomingTargetVolume?: number;
  outgoingStartVolume?: number;
};

export function createAudioTransitionPlan({
  currentTrack,
  requestedTrack,
  fadeDurationMs = DEFAULT_FADE_DURATION_MS,
  targetVolume = DEFAULT_AUDIO_VOLUME,
  tickMs = DEFAULT_FADE_TICK_MS,
}: AudioTransitionInput): AudioTransitionPlan {
  const current = normalizeAudioTrackName(currentTrack);
  const requested = normalizeAudioTrackName(requestedTrack);

  if (!requested) {
    return { kind: "none" };
  }

  if (current === requested) {
    return { kind: "keep", targetTrack: requested };
  }

  if (!current) {
    return {
      kind: "start",
      targetTrack: requested,
      targetVolume,
    };
  }

  return {
    kind: "crossfade",
    targetTrack: requested,
    targetVolume,
    fadeDurationMs,
    tickMs,
  };
}

export function normalizeAudioAssetPath(track: string | null | undefined): string | null {
  const trackName = normalizeAudioTrackName(track);

  return trackName ? `/assets/${trackName}` : null;
}

export function normalizeAudioTrackName(track: string | null | undefined): string | null {
  const value = track?.trim();

  if (!value) {
    return null;
  }

  const withoutAssetPrefix = value.replace(/^\/assets\//, "");

  if (
    withoutAssetPrefix.includes("..") ||
    withoutAssetPrefix.includes("/") ||
    withoutAssetPrefix.includes("\\") ||
    /^[a-z][a-z0-9+.-]*:/i.test(withoutAssetPrefix)
  ) {
    return null;
  }

  return withoutAssetPrefix;
}

export function getCrossfadeVolumes({
  elapsedMs,
  durationMs,
  incomingTargetVolume = DEFAULT_AUDIO_VOLUME,
  outgoingStartVolume = 1,
}: CrossfadeInput): { incoming: number; outgoing: number } {
  const progress = clamp(durationMs <= 0 ? 1 : elapsedMs / durationMs, 0, 1);
  const easedProgress = progress * progress * (3 - 2 * progress);

  return {
    incoming: roundVolume(incomingTargetVolume * easedProgress),
    outgoing: roundVolume(outgoingStartVolume * (1 - easedProgress)),
  };
}

function roundVolume(value: number): number {
  return Math.round(clamp(value, 0, 1) * 1000) / 1000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
