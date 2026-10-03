// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioSystem } from './AudioSystem';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

class MockAudio {
  static instances: MockAudio[] = [];
  static nextPlay: Promise<void> | null = null;
  src: string;
  paused = true;
  volume = 1;
  loop = false;
  preload = '';
  onended: (() => void) | null = null;
  private initialPlay: Promise<void> | null;
  constructor(src: string) {
    this.src = src;
    this.initialPlay = MockAudio.nextPlay;
    MockAudio.nextPlay = null;
    MockAudio.instances.push(this);
  }
  play = vi.fn(() => {
    this.paused = false;
    const promise = this.initialPlay ?? Promise.resolve();
    this.initialPlay = null;
    return promise;
  });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
  load = vi.fn();
}

let music: AudioSystem;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
  MockAudio.instances = [];
  MockAudio.nextPlay = null;
  vi.stubGlobal('Audio', MockAudio);
  music = new AudioSystem();
});

describe('the one-shot bedside taps', () => {
  it('plays once at the master volume and releases itself when ended', async () => {
    music.setVolume(0.3);
    await music.playTapCue();
    const taps = last();
    expect(taps.src).toBe('/assets/fading-taps.mp3');
    expect(taps.loop).toBe(false);
    expect(taps.volume).toBe(0.3);
    music.setVolume(0.2);
    expect(taps.volume).toBe(0.2);
    taps.onended?.();
    expect(taps.src).toBe('');
    expect(taps.paused).toBe(true);
    expect(taps.onended).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds taps to one element and cannot resurrect a superseded pending effect', async () => {
    const slow = deferred();
    MockAudio.nextPlay = slow.promise;
    const earlier = music.playTapCue();
    const old = last();
    await music.playTapCue();
    const newest = last();
    slow.resolve();
    await earlier;
    expect(old.src).toBe('');
    expect(old.paused).toBe(true);
    expect(newest.src).toBe('/assets/fading-taps.mp3');
    expect(MockAudio.instances.filter(audio => audio.src)).toHaveLength(1);
  });

  it.each(['muted', 'paused', 'disposed', 'next scene'] as const)('cancels a pending effect when %s', async reason => {
    const slow = deferred();
    MockAudio.nextPlay = slow.promise;
    const pending = music.playTapCue();
    const taps = last();
    if (reason === 'muted') music.setEnabled(false);
    if (reason === 'paused') music.setPaused(true);
    if (reason === 'disposed') music.dispose();
    if (reason === 'next scene') music.setMood('warm');
    slow.resolve();
    await pending;
    expect(taps.src).toBe('');
    expect(taps.paused).toBe(true);
    expect(taps.onended).toBeNull();
  });

  it('creates no effect while muted, paused, or disposed', async () => {
    music.setEnabled(false);
    await music.playTapCue();
    music.setPaused(true);
    await music.playTapCue();
    music.dispose();
    await music.playTapCue();
    expect(MockAudio.instances).toHaveLength(0);
  });

  it('handles a cancelled pending rejection without interrupting the current score', async () => {
    await music.play();
    const score = last();
    const slow = deferred();
    MockAudio.nextPlay = slow.promise;
    const pending = music.playTapCue();
    const taps = last();
    music.setMood('hushed');
    slow.reject(new Error('AbortError'));
    await expect(pending).resolves.toBeUndefined();
    expect(taps.src).toBe('');
    expect(score.src).toBe('/assets/fading-hushed.mp3');
    expect(score.paused).toBe(false);
  });

  it('reports a current denied effect for the caller to handle and allows a later retry', async () => {
    const denied = new Error('NotAllowedError');
    MockAudio.nextPlay = Promise.reject(denied);
    await expect(music.playTapCue()).rejects.toBe(denied);
    expect(last().src).toBe('');
    await music.playTapCue();
    expect(last().src).toBe('/assets/fading-taps.mp3');
    expect(last().loop).toBe(false);
  });
});
afterEach(() => { music.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const last = () => MockAudio.instances.at(-1)!;

describe('original adaptive music lifecycle', () => {
  it('sets a desired mood without playing until requested', async () => {
    music.setMood('uneasy');
    expect(MockAudio.instances).toHaveLength(0);
    await music.play();
    expect(last().src).toBe('/assets/fading-uneasy.mp3');
    expect(last().loop).toBe(true);
    expect(last().volume).toBe(0);
    await vi.advanceTimersByTimeAsync(2240);
    expect(last().volume).toBeCloseTo(0.55);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ['soundtrack_1.mp3', 'fading-hushed.mp3'],
    ['soundtrack_2.mp3', 'fading-warm.mp3'],
    ['soundtrack_3.mp3', 'fading-resolved.mp3'],
    ['end_credits.mp3', 'fading-resolved.mp3'],
  ])('maps authored legacy asset %s to original cue %s', async (legacy, cue) => {
    await music.playAudio(legacy);
    expect(last().src).toBe(`/assets/${cue}`);
  });

  it('overlaps outgoing and incoming music, then releases the outgoing element', async () => {
    await music.play();
    const outgoing = last();
    await vi.advanceTimersByTimeAsync(2240);
    music.setMood('warm');
    await music.play();
    const incoming = last();
    await vi.advanceTimersByTimeAsync(1100);
    expect(outgoing.volume).toBeGreaterThan(0);
    expect(incoming.volume).toBeGreaterThan(0);
    expect(outgoing.paused).toBe(false);
    expect(incoming.paused).toBe(false);
    await vi.advanceTimersByTimeAsync(1140);
    expect(outgoing.src).toBe('');
    expect(outgoing.paused).toBe(true);
    expect(incoming.volume).toBeCloseTo(0.55);
  });

  it('lets the newest pending request win when an earlier play resolves late', async () => {
    const slow = deferred();
    MockAudio.nextPlay = slow.promise;
    music.setMood('warm');
    const earlier = music.play();
    const superseded = last();
    music.setMood('resolved');
    await music.play();
    const newest = last();
    slow.resolve();
    await earlier;
    await vi.advanceTimersByTimeAsync(2240);
    expect(superseded.src).toBe('');
    expect(superseded.paused).toBe(true);
    expect(newest.src).toBe('/assets/fading-resolved.mp3');
    expect(newest.volume).toBeCloseTo(0.55);
  });

  it('cancels a pending different cue when the newest request returns to the active cue', async () => {
    await music.play();
    const active = last();
    await vi.advanceTimersByTimeAsync(2240);
    const slow = deferred();
    MockAudio.nextPlay = slow.promise;
    music.setMood('warm');
    const pending = music.play();
    const stale = last();
    music.setMood('hushed');
    await music.play();
    slow.resolve();
    await pending;
    await vi.advanceTimersByTimeAsync(2240);
    expect(active.src).toBe('/assets/fading-hushed.mp3');
    expect(active.paused).toBe(false);
    expect(stale.src).toBe('');
    expect(stale.paused).toBe(true);
  });

  it('keeps at most two unreleased voices during rapid successful cue changes', async () => {
    await music.play();
    await vi.advanceTimersByTimeAsync(2240);
    for (const mood of ['warm', 'uneasy', 'resolved', 'hushed', 'warm'] as const) {
      music.setMood(mood);
      await music.play();
      await vi.advanceTimersByTimeAsync(120);
      expect(MockAudio.instances.filter(audio => audio.src)).toHaveLength(2);
    }
    await vi.advanceTimersByTimeAsync(2240);
    expect(MockAudio.instances.filter(audio => audio.src)).toHaveLength(1);
  });

  it('pauses, mutes, and resumes without creating extra tracks or overriding volume', async () => {
    await music.play();
    const active = last();
    await vi.advanceTimersByTimeAsync(2240);
    music.setVolume(0.3);
    expect(active.volume).toBeCloseTo(0.3);
    music.setPaused(true);
    expect(active.paused).toBe(true);
    expect(active.volume).toBe(0);
    music.setEnabled(false);
    music.setPaused(false);
    await Promise.resolve();
    expect(active.paused).toBe(true);
    music.setEnabled(true);
    await Promise.resolve();
    expect(active.paused).toBe(false);
    expect(active.volume).toBeCloseTo(0.3);
    expect(MockAudio.instances).toHaveLength(1);
    music.setVolume(Infinity);
    expect(active.volume).toBeCloseTo(0.3);
    music.setVolume(2);
    expect(active.volume).toBe(1);
  });

  it('reports denied playback, releases its element, and supports retry', async () => {
    const error = new Error('NotAllowedError');
    MockAudio.nextPlay = Promise.reject(error);
    await expect(music.play()).rejects.toBe(error);
    expect(last().src).toBe('');
    await music.play();
    expect(last().src).toBe('/assets/fading-hushed.mp3');
  });

  it('keeps a pending cue silent when muted, then resumes it after unmuting', async () => {
    const slow = deferred();
    MockAudio.nextPlay = slow.promise;
    const pending = music.play();
    const audio = last();
    music.setEnabled(false);
    slow.resolve();
    await pending;
    await vi.advanceTimersByTimeAsync(2240);
    expect(audio.paused).toBe(true);
    expect(audio.volume).toBe(0);
    music.setEnabled(true);
    await Promise.resolve();
    expect(audio.paused).toBe(false);
    expect(audio.volume).toBeCloseTo(0.55);
    expect(MockAudio.instances).toHaveLength(1);
  });

  it('treats a paused pending playback rejection as cancellation and retries on resume', async () => {
    const slow = deferred();
    MockAudio.nextPlay = slow.promise;
    const pending = music.play();
    music.setPaused(true);
    slow.reject(new Error('AbortError'));
    await expect(pending).resolves.toBeUndefined();
    expect(last().src).toBe('');
    music.setPaused(false);
    await Promise.resolve();
    expect(last().src).toBe('/assets/fading-hushed.mp3');
    expect(last().paused).toBe(false);
  });

  it('disposes a pending play and never resurrects music when it resolves', async () => {
    const slow = deferred();
    MockAudio.nextPlay = slow.promise;
    const pending = music.play();
    const audio = last();
    music.dispose();
    music.dispose();
    slow.resolve();
    await pending;
    await vi.advanceTimersByTimeAsync(3000);
    music.setEnabled(true);
    music.setPaused(false);
    await music.play();
    expect(audio.src).toBe('');
    expect(audio.paused).toBe(true);
    expect(MockAudio.instances).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects unknown assets without creating a playback element', async () => {
    await expect(music.playAudio('untracked.mp3')).rejects.toThrow('Unknown music cue');
    expect(MockAudio.instances).toHaveLength(0);
  });
});
