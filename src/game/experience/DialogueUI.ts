import type { Dialogue } from '../../utils/ink';

type Callbacks = {
  onChoice: (index: number) => void;
  onRestart: () => void;
  onAudioToggle: () => void;
  onMotionToggle: () => void;
  onVolumeChange: (value: number) => void;
};

/** Semantic controls stay independent of the renderer and its frame rate. */
export class DialogueUI {
  private panel: HTMLElement;
  private heading: HTMLElement;
  private text: HTMLElement;
  private choices: HTMLElement;
  private history: HTMLElement;
  private notice: HTMLElement;
  private audioButton: HTMLButtonElement;
  private motionButton: HTMLButtonElement;
  private volume: HTMLInputElement;
  private current: Dialogue | null = null;
  private disposed = false;
  private selectionLocked = false;
  private focusFrame = 0;
  private revision = 0;
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
            <p>Choose with a click, Tab and Enter, or keys 1–4. The scene follows your choices. There is no time limit.</p>
            <details class="history-disclosure"><summary>Read the conversation</summary><div class="conversation-history"></div></details>
            <button type="button" data-restart>Begin again</button>
            <p class="settings-credit">A story about memory, care, and what we leave unfinished.</p>
          </div>
        </details>
      </header>
      <section class="dialogue-panel" aria-labelledby="dialogue-heading">
        <div class="dialogue-heading-row"><h2 id="dialogue-heading" tabindex="-1"></h2><span class="chapter-marker">A place beside the light</span></div>
        <div class="dialogue-text" aria-live="polite" aria-atomic="true"></div>
        <div class="dialogue-choices" role="group" aria-label="Your response"></div>
        <p class="experience-notice" role="status"></p>
      </section>`;
    host.querySelector('.chapter-marker')!.textContent = chapterLabel;
    this.panel = host.querySelector('.dialogue-panel')!;
    this.heading = host.querySelector('#dialogue-heading')!;
    this.text = host.querySelector('.dialogue-text')!;
    this.choices = host.querySelector('.dialogue-choices')!;
    this.history = host.querySelector('.conversation-history')!;
    this.notice = host.querySelector('.experience-notice')!;
    this.audioButton = host.querySelector('[data-audio]')!;
    this.motionButton = host.querySelector('[data-motion]')!;
    this.volume = host.querySelector('input[type="range"]')!;
    const options = { signal: this.cleanup.signal };
    this.audioButton.addEventListener('click', () => callbacks.onAudioToggle(), options);
    this.motionButton.addEventListener('click', () => callbacks.onMotionToggle(), options);
    this.volume.addEventListener('input', () => callbacks.onVolumeChange(Number(this.volume.value)), options);
    host.querySelector('select')!.addEventListener('change', (event) => {
      host.style.setProperty('--text-scale', (event.target as HTMLSelectElement).value);
    }, options);
    host.querySelector('[data-restart]')!.addEventListener('click', () => this.restart(), options);
    window.addEventListener('keydown', this.onKeyDown, options);
    host.hidden = false;
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || this.host.hidden) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, select, textarea, details[open]')) return;
    const index = Number(event.key) - 1;
    if (/^[1-4]$/.test(event.key) && this.current?.choices[index]) {
      event.preventDefault();
      this.select(index);
    }
  };

  private select(index: number): void {
    if (this.disposed || this.selectionLocked || !this.current?.choices[index]) return;
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

  public render(dialogue: Dialogue): void {
    if (this.disposed) return;
    this.current = dialogue;
    const revision = ++this.revision;
    this.selectionLocked = false;
    this.heading.textContent = dialogue.chapter || 'The lamp';
    this.panel.dataset.ending = dialogue.ending ? 'true' : 'false';
    this.host.dataset.mood = dialogue.mood || 'hushed';
    this.text.replaceChildren();
    for (const line of dialogue.text.trim().split(/\n+/).filter(Boolean)) {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      this.text.appendChild(paragraph);
    }
    const entry = document.createElement('article');
    const title = document.createElement('h3');
    title.textContent = this.heading.textContent;
    const prose = document.createElement('p');
    prose.textContent = dialogue.text.trim();
    entry.append(title, prose);
    this.history.appendChild(entry);
    while (this.history.children.length > 80) this.history.firstElementChild?.remove();
    this.choices.replaceChildren();
    dialogue.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dialogue-choice';
      const shortcut = document.createElement('span');
      shortcut.className = 'choice-shortcut';
      shortcut.setAttribute('aria-hidden', 'true');
      shortcut.textContent = String(index + 1);
      const label = document.createElement('span');
      label.textContent = choice.text;
      button.append(shortcut, label);
      if (index < 4) button.setAttribute('aria-keyshortcuts', String(index + 1));
      button.addEventListener('click', () => { if (revision === this.revision) this.select(index); });
      this.choices.appendChild(button);
    });
    if (!dialogue.choices.length) {
      const coda = document.createElement('p');
      coda.className = 'ending-note';
      coda.textContent = 'The chapter is complete. You can stay a while.';
      const restart = document.createElement('button');
      restart.type = 'button';
      restart.className = 'dialogue-choice restart-choice';
      restart.textContent = 'Begin again';
      restart.addEventListener('click', () => { if (revision === this.revision) this.restart(); });
      this.choices.append(coda, restart);
    }
    this.panel.scrollTop = 0;
    cancelAnimationFrame(this.focusFrame);
    this.focusFrame = requestAnimationFrame(() => {
      if (!this.disposed) this.heading.focus({ preventScroll: true });
    });
  }

  public setNotice(message: string): void { this.notice.textContent = message; }
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
    this.disposed = true;
    this.cleanup.abort();
    cancelAnimationFrame(this.focusFrame);
    this.host.replaceChildren();
    this.host.hidden = true;
  }
}
