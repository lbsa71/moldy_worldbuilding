// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogueUI } from './DialogueUI';
import type { Dialogue } from '../../utils/ink';

const passage = (text = 'The lamp remains.\n\nA cup catches the light.', ending: string | null = null): Dialogue => ({
  text, choices: ending ? [] : [{ text: 'Wait quietly.', index: 0 }, { text: 'Ask about the cup.', index: 1 }] as Dialogue['choices'],
  scene: 'lamp', chapter: 'A place beside the light', mood: 'hushed', ending,
  position: { x: 0, z: 0 }, fog: 0.5, objects: ['lamp'], audio: null, direction: null, sound: null,
});
let host: HTMLElement;
let ui: DialogueUI;
const makeCallbacks = () => ({ onChoice: vi.fn<(index: number) => void>(), onRestart: vi.fn<() => void>(), onAudioToggle: vi.fn<() => void>(), onMotionToggle: vi.fn<() => void>(), onVolumeChange: vi.fn<(value: number) => void>(), onCardChange: vi.fn<(index: number) => void>() });
let callbacks: ReturnType<typeof makeCallbacks>;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
const buttons = () => [...host.querySelectorAll<HTMLButtonElement>('.dialogue-choice')];
const nextCard = () => host.querySelector<HTMLButtonElement>('[data-card-next]')!.click();
const lastCard = () => { while (host.querySelector('[data-card-next]')) nextCard(); };
const flushFrames = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); };

beforeEach(() => {
  document.body.innerHTML = '<main id="experience"></main>';
  host = document.getElementById('experience')!;
  callbacks = makeCallbacks();
  frames = new Map(); nextFrame = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  ui = new DialogueUI(host, callbacks);
});
afterEach(() => { ui.dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('semantic narrative controls', () => {
  it('reads forward and back without choosing, repeating history or restarting any experience callback', () => {
    const source = passage('First paragraph.\n\nSecond paragraph.\n\nLast paragraph.');
    ui.render(source);
    nextCard();
    nextCard();
    expect(ui.getCardIndex()).toBe(2);
    expect(callbacks.onCardChange.mock.calls).toEqual([[1], [2]]);
    const staleChoice = host.querySelector<HTMLButtonElement>('[data-story-choice="0"]')!;
    host.querySelector<HTMLButtonElement>('[data-card-previous]')!.click();
    staleChoice.click();
    expect(ui.getCardIndex()).toBe(1);
    expect(host.querySelector('.dialogue-text')?.textContent).toBe('Second paragraph.');
    expect(callbacks.onChoice).not.toHaveBeenCalled();
    expect(callbacks.onRestart).not.toHaveBeenCalled();
    expect(callbacks.onAudioToggle).not.toHaveBeenCalled();
    expect(callbacks.onMotionToggle).not.toHaveBeenCalled();
    expect(host.querySelectorAll('.conversation-history article')).toHaveLength(1);
    expect(host.querySelector('.conversation-history article p')?.textContent).toBe(source.text);
    nextCard();
    host.querySelector<HTMLButtonElement>('[data-story-choice="1"]')!.click();
    expect(callbacks.onChoice).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('restores the saved source anchor before the numeric page index and clamps obsolete cursors', () => {
    const source = passage('First paragraph.\n\nSecond paragraph.\n\nLast paragraph.');
    const start = source.text.indexOf('Second');
    ui.render(source, 99, start);
    expect(ui.getCardIndex()).toBe(1);
    expect(ui.getCardAnchor()).toBe(start);
    expect(callbacks.onCardChange).not.toHaveBeenCalled();
    ui.render(source, 99);
    expect(ui.getCardIndex()).toBe(2);
    ui.render(source, -4);
    expect(ui.getCardIndex()).toBe(0);
  });

  it('reveals all four authored responses together and enables the fourth shortcut only on that card', () => {
    const source = passage('An invitation.\n\nA cost to consider.');
    source.choices = ['Promise.', 'Ask permission.', 'Offer a practical task.', 'Leave the question open.']
      .map((text, index) => ({ text, index })) as Dialogue['choices'];
    ui.render(source);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
    expect(callbacks.onChoice).not.toHaveBeenCalled();
    expect(host.querySelectorAll('[data-story-choice]')).toHaveLength(0);
    nextCard();
    expect([...host.querySelectorAll('[data-story-choice]')].map(button => button.getAttribute('aria-keyshortcuts'))).toEqual(['1', '2', '3', '4']);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
    expect(callbacks.onChoice).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('makes detached Continue controls inert after a new passage or disposal', () => {
    ui.render(passage());
    const first = host.querySelector<HTMLButtonElement>('[data-card-next]')!;
    ui.render(passage('A different first paragraph.\n\nA different last paragraph.'));
    first.click();
    expect(ui.getCardIndex()).toBe(0);
    const second = host.querySelector<HTMLButtonElement>('[data-card-next]')!;
    ui.dispose();
    second.click();
    expect(callbacks.onCardChange).not.toHaveBeenCalled();
    expect(callbacks.onChoice).not.toHaveBeenCalled();
  });

  it('subdivides to measured space, preserves every word, and keeps the current source location when text size changes', () => {
    let allowance = 70;
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('dialogue-text') ? allowance : 500;
    });
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('dialogue-text') ? this.textContent!.length : 0;
    });
    const source = passage('You hold the cup gently. The handle is warm, the rim rough beneath your thumb. She knows precisely where the damage is, and turns it away before you can warn her.');
    ui.render(source);
    expect(ui.getCardCount()).toBeGreaterThan(2);
    const read: string[] = [];
    for (;;) {
      read.push(host.querySelector('.dialogue-text')!.textContent!);
      if (!host.querySelector('[data-card-next]')) break;
      nextCard();
    }
    expect(read.filter(Boolean).join(' ')).toBe(source.text);
    expect(host.querySelectorAll('[data-story-choice]')).toHaveLength(2);
    ui.render(source);
    nextCard();
    const anchor = ui.getCardAnchor();
    allowance = 35;
    const select = host.querySelector('select')!;
    select.value = '1.4'; select.dispatchEvent(new Event('change'));
    const current = host.querySelector('.dialogue-text')!.textContent!;
    expect(ui.getCardAnchor()).toBeLessThanOrEqual(anchor);
    expect(ui.getCardAnchor() + current.length).toBeGreaterThanOrEqual(anchor);
    expect(current.length).toBeLessThanOrEqual(allowance);
    expect(callbacks.onChoice).not.toHaveBeenCalled();
    expect(host.querySelectorAll('.conversation-history article')).toHaveLength(2);
  });

  it('detects painted choice boxes crossing the notice even when every scroll dimension reports a fit', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(0);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const expanded = host.querySelector('.dialogue-panel')?.getAttribute('data-expanded') === 'true';
      if (this.classList.contains('dialogue-card-body')) return new DOMRect(0, 20, 300, 80);
      if (this.classList.contains('experience-notice')) return new DOMRect(0, 105, 300, 20);
      if (this.hasAttribute('data-story-choice')) return new DOMRect(0, 55, 300, expanded ? 35 : 60);
      return new DOMRect(0, 20, 300, 30);
    });
    ui.render(passage('A short question.'));
    expect(ui.getCardCount()).toBe(2);
    expect(host.querySelector('.dialogue-panel')?.getAttribute('data-expanded')).toBe('true');
    lastCard();
    expect(host.querySelector('.dialogue-panel')?.getAttribute('data-card-kind')).toBe('decision');
    expect(host.querySelectorAll('[data-story-choice]')).toHaveLength(2);
  });

  it('renders story text as plain paragraphs and exposes native choices with focus', () => {
    ui.render(passage('<img src=x onerror=alert(1)>\n\n"Will you stay?"'));
    expect(host.querySelector('.dialogue-text img')).toBeNull();
    expect(host.querySelectorAll('.dialogue-text p')).toHaveLength(1);
    expect(host.querySelector('.dialogue-text')?.getAttribute('aria-live')).toBe('polite');
    expect(buttons()[0].textContent).toBe('Continue');
    nextCard();
    expect(buttons().map(button => button.getAttribute('aria-keyshortcuts'))).toEqual(['1', '2']);
    expect(buttons()[0].querySelector('.choice-shortcut')?.getAttribute('aria-hidden')).toBe('true');
    flushFrames();
    expect(document.activeElement).toBe(host.querySelector('#dialogue-heading'));
  });

  it('locks repeated selection until the next passage and records the selected response', () => {
    ui.render(passage());
    lastCard();
    buttons()[1].click();
    buttons()[0].click();
    expect(callbacks.onChoice).toHaveBeenCalledExactlyOnceWith(1);
    expect(host.querySelector('.history-response')?.textContent).toBe('You: Ask about the cup.');
    ui.render(passage('The cup has a chipped rim.'));
    buttons()[0].click();
    expect(callbacks.onChoice).toHaveBeenCalledTimes(2);
  });

  it('uses numeric shortcuts while leaving settings input and modified keys alone', () => {
    ui.render(passage());
    const slider = host.querySelector('input')!;
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', repeat: true }));
    expect(callbacks.onChoice).not.toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(callbacks.onChoice).not.toHaveBeenCalled();
    lastCard();
    const event = new KeyboardEvent('keydown', { key: '2', cancelable: true, bubbles: true });
    document.body.dispatchEvent(event);
    expect(callbacks.onChoice).toHaveBeenCalledExactlyOnceWith(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('wires audio, motion, volume and text settings to accessible controls', () => {
    (host.querySelector('[data-audio]') as HTMLButtonElement).click();
    (host.querySelector('[data-motion]') as HTMLButtonElement).click();
    const slider = host.querySelector('input')!;
    slider.value = '0.3'; slider.dispatchEvent(new Event('input'));
    const select = host.querySelector('select')!;
    select.value = '1.4'; select.dispatchEvent(new Event('change'));
    expect(callbacks.onAudioToggle).toHaveBeenCalledOnce();
    expect(callbacks.onMotionToggle).toHaveBeenCalledOnce();
    expect(callbacks.onVolumeChange).toHaveBeenCalledExactlyOnceWith(0.3);
    expect(host.style.getPropertyValue('--text-scale')).toBe('1.4');
    ui.setAudioEnabled(false); ui.setReducedMotion(true); ui.setVolume(0.3);
    expect(host.querySelector('[data-audio]')?.getAttribute('aria-pressed')).toBe('false');
    expect(host.dataset.reducedMotion).toBe('true');
    expect(slider.value).toBe('0.3');
  });

  it('renders a terminal coda and clears history when beginning again', () => {
    ui.render(passage());
    buttons()[0].click();
    ui.render(passage('The room rests.', 'rest'));
    expect(host.querySelector('.dialogue-panel')?.getAttribute('data-ending')).toBe('true');
    expect(buttons()).toHaveLength(1);
    expect(buttons()[0].textContent).toBe('Begin again');
    const settings = host.querySelector('details')!; settings.open = true;
    buttons()[0].click();
    expect(callbacks.onRestart).toHaveBeenCalledOnce();
    expect(host.querySelector('.conversation-history')?.children).toHaveLength(0);
    expect(settings.open).toBe(false);
  });

  it('bounds conversation history over repeated renders', () => {
    for (let index = 0; index < 100; index++) ui.render(passage(`Passage ${index}.`));
    expect(host.querySelector('.conversation-history')?.children).toHaveLength(80);
    expect(host.querySelector('.conversation-history')?.textContent).not.toContain('Passage 0.');
    expect(host.querySelector('.conversation-history')?.textContent).toContain('Passage 99.');
    expect(frames.size).toBe(1);
  });

  it('ignores detached choices from an older passage rather than selecting a new response', () => {
    ui.render(passage());
    const staleButton = buttons()[0];
    ui.render(passage('This is the next passage.'));
    staleButton.click();
    expect(callbacks.onChoice).not.toHaveBeenCalled();
    buttons()[1].click();
    expect(callbacks.onChoice).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('removes shortcuts and makes retained buttons inert after disposal', () => {
    ui.render(passage());
    const oldChoice = buttons()[0];
    const oldAudio = host.querySelector('[data-audio]') as HTMLButtonElement;
    ui.dispose();
    oldChoice.click(); oldAudio.click();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    flushFrames();
    expect(callbacks.onChoice).not.toHaveBeenCalled();
    expect(callbacks.onAudioToggle).not.toHaveBeenCalled();
    expect(host.hidden).toBe(true);
    expect(host.childElementCount).toBe(0);
  });

  it('makes a retained coda restart control inert after disposal', () => {
    ui.render(passage('The light stays.', 'keep'));
    const oldRestart = buttons()[0];
    ui.dispose();
    oldRestart.click();
    expect(callbacks.onRestart).not.toHaveBeenCalled();
  });
});
