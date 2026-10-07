import type { Dialogue } from '../../utils/ink';
import { dialogueCards, preferredCardBreak, type DialogueCard } from './DialogueCards';

type Callbacks = {
  onChoice: (index: number) => void;
  onRestart: () => void;
  onAudioToggle: () => void;
  onMotionToggle: () => void;
  onVolumeChange: (value: number) => void;
  onCardChange?: (index: number) => void;
};

/** Reading a card never advances Ink, sound or the scene. */
export class DialogueUI {
  private panel: HTMLElement;
  private heading: HTMLElement;
  private text: HTMLElement;
  private choices: HTMLElement;
  private history: HTMLElement;
  private notice: HTMLElement;
  private navigation: HTMLElement;
  private progress: HTMLElement;
  private previous: HTMLButtonElement;
  private audioButton: HTMLButtonElement;
  private motionButton: HTMLButtonElement;
  private volume: HTMLInputElement;
  private current: Dialogue | null = null;
  private cards: DialogueCard[] = [];
  private cardIndex = 0;
  private disposed = false;
  private selectionLocked = false;
  private focusFrame = 0;
  private revision = 0;
  private layoutWidth = 0;
  private layoutHeight = 0;
  private reflowing = false;
  private resizeObserver?: ResizeObserver;
  private cleanup = new AbortController();

  constructor(private host: HTMLElement, private callbacks: Callbacks, chapterLabel = 'A place beside the light') {
    host.innerHTML = `
      <header class="experience-header">
        <span class="experience-wordmark">Fading</span>
        <details class="experience-settings">
          <summary>Settings &amp; history</summary>
          <div class="settings-content">
            <h2>Your experience</h2>
            <button type="button" data-audio aria-pressed="true">Sound on</button>
            <label class="volume-control">Volume <input type="range" min="0" max="1" step="0.05" value="0.55" aria-label="Volume" /></label>
            <button type="button" data-motion aria-pressed="false">Reduce motion</button>
            <label class="text-control">Text size <select aria-label="Text size"><option value="1">Standard</option><option value="1.2">Large</option><option value="1.4">Extra large</option></select></label>
            <p>Read at your pace. Choose with a click, Tab and Enter, or keys 1–4 when responses appear. There is no time limit.</p>
            <details class="history-disclosure"><summary>Read the conversation</summary><div class="conversation-history"></div></details>
            <button type="button" data-restart>Begin again</button>
            <p class="settings-credit">A story about memory, care, and what we leave unfinished.</p>
          </div>
        </details>
      </header>
      <section class="dialogue-panel" aria-labelledby="dialogue-heading">
        <div class="dialogue-heading-row">
          <div class="dialogue-titles"><h2 id="dialogue-heading" tabindex="-1"></h2><span class="chapter-marker"></span></div>
          <nav class="card-navigation" aria-label="Reading cards"><button type="button" data-card-previous>Back</button><span class="card-progress" aria-live="off"></span></nav>
        </div>
        <div class="dialogue-card-body">
          <div class="dialogue-text" aria-live="polite" aria-atomic="true"></div>
          <div class="dialogue-choices" role="group" aria-label="Your response"></div>
        </div>
        <p class="experience-notice" role="status"></p>
      </section>`;
    host.querySelector('.chapter-marker')!.textContent = chapterLabel;
    this.panel = host.querySelector('.dialogue-panel')!;
    this.heading = host.querySelector('#dialogue-heading')!;
    this.text = host.querySelector('.dialogue-text')!;
    this.choices = host.querySelector('.dialogue-choices')!;
    this.history = host.querySelector('.conversation-history')!;
    this.notice = host.querySelector('.experience-notice')!;
    this.navigation = host.querySelector('.card-navigation')!;
    this.progress = host.querySelector('.card-progress')!;
    this.previous = host.querySelector('[data-card-previous]')!;
    this.audioButton = host.querySelector('[data-audio]')!;
    this.motionButton = host.querySelector('[data-motion]')!;
    this.volume = host.querySelector('input[type="range"]')!;
    const options = { signal: this.cleanup.signal };
    this.audioButton.addEventListener('click', () => callbacks.onAudioToggle(), options);
    this.motionButton.addEventListener('click', () => callbacks.onMotionToggle(), options);
    this.volume.addEventListener('input', () => callbacks.onVolumeChange(Number(this.volume.value)), options);
    host.querySelector('select')!.addEventListener('change', (event) => {
      host.style.setProperty('--text-scale', (event.target as HTMLSelectElement).value);
      this.reflow();
    }, options);
    this.previous.addEventListener('click', () => this.changeCard(this.cardIndex - 1), options);
    host.querySelector('[data-restart]')!.addEventListener('click', () => this.restart(), options);
    window.addEventListener('keydown', this.onKeyDown, options);
    window.addEventListener('resize', this.onResize, options);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(host);
    }
    host.hidden = false;
  }

  private onResize = () => {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (width === this.layoutWidth && height === this.layoutHeight) return;
    this.layoutWidth = width; this.layoutHeight = height;
    this.reflow();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || this.host.hidden || this.disposed) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, select, textarea, details[open]')) return;
    const index = Number(event.key) - 1;
    if (/^[1-4]$/.test(event.key) && this.cardIndex === this.cards.length - 1 && this.current?.choices[index]) {
      event.preventDefault();
      this.select(index);
    }
  };

  private select(index: number): void {
    if (this.disposed || this.selectionLocked || this.cardIndex !== this.cards.length - 1 || !this.current?.choices[index]) return;
    this.selectionLocked = true;
    const response = document.createElement('p');
    response.className = 'history-response';
    response.textContent = `You: ${this.current.choices[index].text}`;
    this.history.appendChild(response);
    this.callbacks.onChoice(index);
  }

  private restart(): void {
    if (this.disposed) return;
    this.history.replaceChildren();
    this.host.querySelectorAll('details').forEach((details) => details.open = false);
    this.callbacks.onRestart();
  }

  private changeCard(index: number): void {
    if (this.disposed || this.selectionLocked || index < 0 || index >= this.cards.length || index === this.cardIndex) return;
    this.cardIndex = index;
    this.drawCard();
    this.callbacks.onCardChange?.(index);
    this.focusHeading();
  }

  private focusHeading(): void {
    cancelAnimationFrame(this.focusFrame);
    const revision = this.revision;
    this.focusFrame = requestAnimationFrame(() => {
      if (!this.disposed && revision === this.revision) this.heading.focus({ preventScroll: true });
    });
  }

  private drawCard(): void {
    if (!this.current) return;
    const revision = ++this.revision;
    const card = this.cards[this.cardIndex];
    const final = this.cardIndex === this.cards.length - 1;
    this.panel.dataset.cardKind = card.decision ? 'decision' : final ? 'response' : 'text';
    this.panel.dataset.cardIndex = String(this.cardIndex);
    this.panel.dataset.cardCount = String(this.cards.length);
    this.previous.disabled = this.cardIndex === 0;
    this.navigation.hidden = this.cards.length < 2;
    this.progress.textContent = `${this.cardIndex + 1} / ${this.cards.length}`;
    this.text.replaceChildren();
    if (card.text) {
      const paragraph = document.createElement('p');
      paragraph.textContent = card.text;
      this.text.appendChild(paragraph);
    }
    this.choices.replaceChildren();
    if (!final) {
      const next = document.createElement('button');
      next.type = 'button'; next.className = 'dialogue-choice card-continue'; next.dataset.cardNext = '';
      next.textContent = 'Continue';
      next.addEventListener('click', () => { if (revision === this.revision) this.changeCard(this.cardIndex + 1); });
      this.choices.appendChild(next);
      this.choices.setAttribute('aria-label', 'Continue reading');
      return;
    }
    this.choices.setAttribute('aria-label', this.current.choices.length ? 'Your response' : 'Chapter complete');
    this.current.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'dialogue-choice'; button.dataset.storyChoice = String(index);
      const shortcut = document.createElement('span');
      shortcut.className = 'choice-shortcut'; shortcut.setAttribute('aria-hidden', 'true'); shortcut.textContent = String(index + 1);
      const label = document.createElement('span'); label.textContent = choice.text;
      button.append(shortcut, label);
      if (index < 4) button.setAttribute('aria-keyshortcuts', String(index + 1));
      button.addEventListener('click', () => { if (revision === this.revision) this.select(index); });
      this.choices.appendChild(button);
    });
    if (!this.current.choices.length) {
      const coda = document.createElement('p'); coda.className = 'ending-note';
      coda.textContent = 'The chapter is complete. You can stay a while.';
      const restart = document.createElement('button');
      restart.type = 'button'; restart.className = 'dialogue-choice restart-choice'; restart.textContent = 'Begin again';
      restart.addEventListener('click', () => { if (revision === this.revision) this.restart(); });
      this.choices.append(coda, restart);
    }
  }

  private overflows(): boolean {
    if (!this.panel.clientHeight || !this.panel.clientWidth) return false;
    const body = this.host.querySelector<HTMLElement>('.dialogue-card-body')!;
    if (this.panel.scrollHeight > this.panel.clientHeight + 1 || this.text.scrollHeight > this.text.clientHeight + 1
      || body.scrollHeight > body.clientHeight + 1 || this.choices.scrollHeight > this.choices.clientHeight + 1) return true;
    // Grid children can cross into the following notice while the parent still
    // reports a fitting scrollHeight. Check their painted boxes as well.
    const bounds = body.getBoundingClientRect();
    if (!bounds.height || !bounds.width) return false;
    const notice = this.notice.getBoundingClientRect();
    const bottom = notice.height ? Math.min(bounds.bottom, notice.top) : bounds.bottom;
    return [...body.querySelectorAll<HTMLElement>('.dialogue-text > p, .dialogue-choices > *')].some(element => {
      const rect = element.getBoundingClientRect();
      return rect.height > 0 && rect.width > 0 && (rect.bottom > bottom + 0.5 || rect.top < bounds.top - 0.5
        || rect.left < bounds.left - 0.5 || rect.right > bounds.right + 0.5);
    });
  }

  /** Measure real typography; larger text adds reading cards instead of shrinking. */
  private reflow(initialCardIndex?: number, initialAnchor?: number): void {
    if (!this.current || this.disposed || this.reflowing) return;
    this.reflowing = true;
    const oldIndex = this.cardIndex;
    const oldCard = this.cards[oldIndex];
    const anchor = oldCard?.decision ? Infinity : oldCard?.start ?? 0;
    this.cards = dialogueCards(this.current.text);
    this.panel.dataset.expanded = 'false';
    try {
      for (let index = 0; index < this.cards.length; index++) {
        this.cardIndex = index;
        this.drawCard();
        if (!this.overflows()) continue;
        let card = this.cards[index];
        if (index === this.cards.length - 1 && card.text) {
          // Preserve the final paragraph with its choices when it fits. On a
          // short or enlarged-text layout, give the complete choice set a card.
          this.cards.push({ text: '', start: card.start + card.text.length, decision: true });
          this.drawCard();
          if (!this.overflows()) continue;
        }
        if (!card.text) {
          this.panel.dataset.expanded = 'true';
          this.drawCard();
          continue;
        }
        const words = [...card.text.matchAll(/\S+/g)];
        let low = 1, high = words.length - 1, fits = 0;
        while (low <= high) {
          const count = Math.floor((low + high) / 2);
          const end = words[count - 1].index! + words[count - 1][0].length;
          this.cards[index] = { ...card, text: card.text.slice(0, end) };
          this.drawCard();
          if (this.overflows()) high = count - 1;
          else { fits = count; low = count + 1; }
        }
        if (!fits || words.length < 2) {
          this.cards[index] = card;
          this.panel.dataset.expanded = 'true';
          this.drawCard();
          continue;
        }
        const maximum = words[fits - 1].index! + words[fits - 1][0].length;
        const end = preferredCardBreak(card.text, maximum);
        const tail = card.text.slice(end), remainder = tail.trimStart();
        this.cards.splice(index, 1, { ...card, text: card.text.slice(0, end) },
          { text: remainder, start: card.start + end + tail.length - remainder.length });
      }
      this.cardIndex = initialAnchor !== undefined || initialCardIndex === undefined
        ? Math.max(0, this.cards.findLastIndex(card => card.start <= (initialAnchor ?? anchor)))
        : Math.min(this.cards.length - 1, Math.max(0, Number.isFinite(initialCardIndex) ? Math.floor(initialCardIndex) : 0));
      this.drawCard();
      if (initialCardIndex === undefined && this.cardIndex !== oldIndex) this.callbacks.onCardChange?.(this.cardIndex);
    } finally { this.reflowing = false; }
  }

  public render(dialogue: Dialogue, initialCardIndex = 0, initialAnchor?: number): void {
    if (this.disposed) return;
    this.current = dialogue;
    this.selectionLocked = false;
    this.heading.textContent = dialogue.chapter || 'The lamp';
    this.panel.dataset.ending = dialogue.ending ? 'true' : 'false';
    this.host.dataset.mood = dialogue.mood || 'hushed';
    const entry = document.createElement('article');
    const title = document.createElement('h3'); title.textContent = this.heading.textContent;
    const prose = document.createElement('p'); prose.textContent = dialogue.text.trim();
    entry.append(title, prose); this.history.appendChild(entry);
    while (this.history.children.length > 80) this.history.firstElementChild?.remove();
    this.reflow(initialCardIndex, initialAnchor);
    this.focusHeading();
  }

  public getCardIndex(): number { return this.cardIndex; }
  public getCardAnchor(): number { return this.cards[this.cardIndex]?.start ?? 0; }
  public getCardCount(): number { return this.cards.length; }
  public setNotice(message: string): void { this.notice.textContent = message; this.reflow(); }
  public setVolume(value: number): void { this.volume.value = String(value); }
  public setAudioEnabled(enabled: boolean): void {
    this.audioButton.textContent = enabled ? 'Sound on' : 'Sound off';
    this.audioButton.setAttribute('aria-pressed', String(enabled));
  }
  public setReducedMotion(reduced: boolean): void {
    this.motionButton.textContent = reduced ? 'Reduced motion on' : 'Reduce motion';
    this.motionButton.setAttribute('aria-pressed', String(reduced));
    this.host.dataset.reducedMotion = String(reduced);
  }
  public dispose(): void {
    this.disposed = true; this.cleanup.abort(); this.resizeObserver?.disconnect();
    cancelAnimationFrame(this.focusFrame);
    this.host.replaceChildren(); this.host.hidden = true;
  }
}
