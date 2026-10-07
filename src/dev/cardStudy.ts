import { DialogueUI } from '../game/experience/DialogueUI';
import '../game/experience/experience.css';
import cssSource from '../game/experience/experience.css?raw';
import uiSource from '../game/experience/DialogueUI.ts?raw';
import paginationSource from '../game/experience/DialogueCards.ts?raw';
import inkSource from '../ink/journey.ink?raw';
import auditSource from './cardStudy.ts?raw';
import collectorSource from './collectStoryCards.ts?raw';
import { collectStoryCards, type RenderedCardVariant } from './collectStoryCards';

const style = document.createElement('style');
style.textContent = `
html,body{margin:0;min-width:320px;min-height:100%;background:#101a20;color:#e9e9dc;font-family:system-ui,sans-serif}body{overflow:hidden}*,*::before,*::after{box-sizing:border-box}
#card-study-tools{position:fixed;right:8px;top:8px;z-index:100;background:#12252af5;color:#edf1e8;border:1px solid #69817b;font:14px/1.45 system-ui,sans-serif;max-width:calc(100vw - 16px)}
#card-study-tools>summary{cursor:pointer;min-height:44px;padding:10px;max-width:340px}#card-study-tools>div{padding:12px;width:min(560px,calc(100vw - 18px));max-height:calc(100dvh - 66px);overflow:auto}
#card-study-tools label{display:block}#card-study-tools button,#card-study-tools select{font:inherit;min-height:44px;padding:8px;margin:4px;color:#edf1e8;background:#25413e;border:1px solid #9caeaf}
#card-study-tools pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.4 monospace}#card-study-tools p{font-size:13px}
`;
document.head.append(style);

const host = document.getElementById('experience-ui')!;
const tools = document.getElementById('card-study-tools') as HTMLDetailsElement;
const scaleControl = document.getElementById('card-study-scale') as HTMLSelectElement;
const runButton = document.getElementById('card-study-run') as HTMLButtonElement;
const previewButton = document.getElementById('card-study-preview') as HTMLButtonElement;
const status = document.getElementById('card-study-status')!;
const output = document.getElementById('card-study-report')!;
const noop = () => {};
const ui = new DialogueUI(host, { onChoice: noop, onRestart: noop, onAudioToggle: noop,
  onMotionToggle: noop, onVolumeChange: noop, onCardChange: noop }, 'The account we leave');
const collection = collectStoryCards(inkSource);
const notices = ['', 'Your last passage has been restored.', 'Progress cannot be saved in this browser. Keep this tab open to finish.'];
const normalized = (text: string) => text.replace(/\s+/g, ' ').trim();
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const hash = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
const visible = (element: Element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
const snapshotRect = (rect: DOMRect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
const identity = (element: Element) => element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;

type Witness = { variant: string; scene: string | null; route: number[]; page: number; pages: number; notice: string };
type Failure = Witness & { check: string; element?: string; detail: unknown };
type Worst = { witness: Witness; overflow: number; usedHeight: number; panel: ReturnType<typeof snapshotRect>; text: string; choices: string[] };
let worst: Worst | undefined;
let running = false;

function applyScale() {
  host.style.setProperty('--text-scale', scaleControl.value);
  const productionScale = host.querySelector('select') as HTMLSelectElement;
  productionScale.value = scaleControl.value;
  productionScale.dispatchEvent(new Event('change'));
}

function preview(value: Worst) {
  const variant = collection.variants.find(card => card.id === value.witness.variant)!;
  applyScale();
  ui.setNotice(value.witness.notice);
  ui.render(variant.dialogue, value.witness.page);
  tools.open = false;
}

async function audit() {
  if (running) return;
  running = true;
  runButton.disabled = true;
  previewButton.disabled = true;
  tools.open = false;
  output.textContent = '';
  worst = undefined;
  const started = performance.now();
  const scale = Number(scaleControl.value);
  const failures: Failure[] = [];
  const failureCounts: Record<string, number> = {};
  let failureCount = 0;
  let pagesChecked = 0;
  let noticeVariantsChecked = 0;
  let maximumPages = 0;
  const fail = (witness: Witness, check: string, detail: unknown, element?: string) => {
    failureCount++;
    failureCounts[check] = (failureCounts[check] ?? 0) + 1;
    if (failures.length < 10) failures.push({ ...witness, check, detail, ...(element ? { element } : {}) });
  };
  try {
    await document.fonts.ready;
    applyScale();
    await frame(); // Flush viewport resize observers before the synchronous fixture loop.
    const viewport = window.visualViewport;
    const bounds = { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0,
      right: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? innerWidth), bottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) };
    const outside = (rect: DOMRect, region: typeof bounds) => Math.max(0, region.left - rect.left, region.top - rect.top, rect.right - region.right, rect.bottom - region.bottom);
    const first: Witness = { variant: 'header', scene: null, route: [], page: 0, pages: 0, notice: '' };
    for (const element of host.querySelectorAll<HTMLElement>('.experience-settings > summary')) {
      const rect = element.getBoundingClientRect();
      if (rect.height < 43.5 || rect.width < 43.5) fail(first, 'header-touch-target', snapshotRect(rect), identity(element));
      if (outside(rect, bounds) > 1) fail(first, 'header-outside-viewport', snapshotRect(rect), identity(element));
    }
    for (let variantIndex = 0; variantIndex < collection.variants.length; variantIndex++) {
      const variant: RenderedCardVariant = collection.variants[variantIndex];
      for (const notice of notices) {
        noticeVariantsChecked++;
        ui.setNotice(notice);
        ui.render(variant.dialogue, 0);
        const textSeen: string[] = [];
        let page = 0;
        while (true) {
          if (page > 200) throw new Error(`Pagination did not finish: ${variant.id}`);
          const pageCount = ui.getCardCount();
          maximumPages = Math.max(maximumPages, pageCount);
          const witness: Witness = { variant: variant.id, scene: variant.dialogue.scene, route: variant.witness, page, pages: pageCount, notice };
          pagesChecked++;
          const panel = host.querySelector<HTMLElement>('.dialogue-panel')!;
          const rect = panel.getBoundingClientRect();
          const panelBounds = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
          let overflow = Math.max(0, panel.scrollHeight - panel.clientHeight, panel.scrollWidth - panel.clientWidth, outside(rect, bounds));
          const documentWidth = document.documentElement.clientWidth;
          const documentScrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          if (documentScrollWidth > documentWidth + 1) fail(witness, 'document-scroll-x', { client: documentWidth, scroll: documentScrollWidth });
          overflow = Math.max(overflow, documentScrollWidth - documentWidth);
          if (panel.scrollHeight > panel.clientHeight + 1) fail(witness, 'panel-scroll-y', { client: panel.clientHeight, scroll: panel.scrollHeight });
          if (panel.scrollWidth > panel.clientWidth + 1) fail(witness, 'panel-scroll-x', { client: panel.clientWidth, scroll: panel.scrollWidth });
          if (outside(rect, bounds) > 1) fail(witness, 'panel-outside-viewport', snapshotRect(rect));
          let usedBottom = rect.top;
          for (const child of panel.querySelectorAll<HTMLElement>('h2,p,button,span')) {
            if (!visible(child)) continue;
            const childRect = child.getBoundingClientRect();
            usedBottom = Math.max(usedBottom, childRect.bottom);
            const amount = Math.max(outside(childRect, panelBounds), outside(childRect, bounds));
            overflow = Math.max(overflow, amount);
            if (amount > 1) fail(witness, 'child-outside-card-or-viewport', snapshotRect(childRect), identity(child));
            if (child.tagName === 'BUTTON' && (childRect.height < 43.5 || childRect.width < 43.5)) fail(witness, 'touch-target', snapshotRect(childRect), identity(child));
          }
          for (const element of panel.querySelectorAll<HTMLElement>('p,button')) {
            if (!visible(element)) continue;
            const horizontal = element.scrollWidth - element.clientWidth;
            const vertical = element.scrollHeight - element.clientHeight;
            overflow = Math.max(overflow, horizontal, vertical);
            if (horizontal > 1 || vertical > 1) fail(witness, 'text-internal-scroll', {
              clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
              clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
            }, identity(element));
          }
          // DOM textContent can survive CSS clipping. Inspect actual laid-out
          // text fragments and every ancestor that establishes a clipping box.
          const clipping = new Map<HTMLElement, { x: boolean; y: boolean; bounds: typeof bounds }>();
          for (const element of panel.querySelectorAll<HTMLElement>('h2,p,button,.chapter-marker,.card-progress')) {
            if (!visible(element)) continue;
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const node = walker.currentNode;
              if (!node.textContent?.trim() || !node.parentElement || !visible(node.parentElement)) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              for (const fragment of range.getClientRects()) {
                const amount = Math.max(outside(fragment, panelBounds), outside(fragment, bounds));
                overflow = Math.max(overflow, amount);
                if (amount > 1) fail(witness, 'text-fragment-outside-card-or-viewport', snapshotRect(fragment), identity(element));
                for (let ancestor: HTMLElement | null = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
                  let clip = clipping.get(ancestor);
                  if (!clip) {
                    const computed = getComputedStyle(ancestor);
                    const box = ancestor.getBoundingClientRect();
                    clip = {
                      x: /^(hidden|clip|scroll|auto)$/.test(computed.overflowX), y: /^(hidden|clip|scroll|auto)$/.test(computed.overflowY),
                      bounds: { left: box.left + ancestor.clientLeft, top: box.top + ancestor.clientTop,
                        right: box.left + ancestor.clientLeft + ancestor.clientWidth, bottom: box.top + ancestor.clientTop + ancestor.clientHeight },
                    };
                    clipping.set(ancestor, clip);
                  }
                  const clippedBy = Math.max(0,
                    clip.x ? clip.bounds.left - fragment.left : 0, clip.x ? fragment.right - clip.bounds.right : 0,
                    clip.y ? clip.bounds.top - fragment.top : 0, clip.y ? fragment.bottom - clip.bounds.bottom : 0);
                  overflow = Math.max(overflow, clippedBy);
                  if (clippedBy > 1) fail(witness, 'text-fragment-clipped', { ancestor: identity(ancestor), amount: clippedBy, fragment: snapshotRect(fragment) }, identity(element));
                }
              }
            }
          }
          for (const textElement of panel.querySelectorAll<HTMLElement>('.dialogue-text p')) {
            if (!visible(textElement)) continue;
            const fontSize = parseFloat(getComputedStyle(textElement).fontSize);
            if (fontSize + 0.05 < 16 * scale) fail(witness, 'body-font-minimum', { actual: fontSize, required: 16 * scale });
          }
          for (const button of panel.querySelectorAll<HTMLElement>('.dialogue-choice')) {
            if (!visible(button)) continue;
            const fontSize = parseFloat(getComputedStyle(button).fontSize);
            if (fontSize + 0.05 < 14 * scale) fail(witness, 'choice-font-minimum', { actual: fontSize, required: 14 * scale });
          }
          for (const header of host.querySelectorAll<HTMLElement>('.experience-wordmark,.experience-settings > summary')) {
            const headerRect = header.getBoundingClientRect();
            const overlapX = Math.min(rect.right, headerRect.right) - Math.max(rect.left, headerRect.left);
            const overlapY = Math.min(rect.bottom, headerRect.bottom) - Math.max(rect.top, headerRect.top);
            if (overlapX > 1 && overlapY > 1) fail(witness, 'header-overlap', { width: overlapX, height: overlapY }, identity(header));
          }
          // Check independently occupied regions, not parent/child rectangles:
          // text must not run under a button, heading, navigation or notice.
          const regions = [...panel.querySelectorAll<HTMLElement>('#dialogue-heading,.chapter-marker,.card-navigation,.dialogue-text p,.dialogue-choices > *,.experience-notice')]
            .filter(visible).map(element => ({ element, rect: element.getBoundingClientRect() }));
          for (let firstIndex = 0; firstIndex < regions.length; firstIndex++) {
            for (let secondIndex = firstIndex + 1; secondIndex < regions.length; secondIndex++) {
              const firstRegion = regions[firstIndex], secondRegion = regions[secondIndex];
              if (firstRegion.element.contains(secondRegion.element) || secondRegion.element.contains(firstRegion.element)) continue;
              const overlapX = Math.min(firstRegion.rect.right, secondRegion.rect.right) - Math.max(firstRegion.rect.left, secondRegion.rect.left);
              const overlapY = Math.min(firstRegion.rect.bottom, secondRegion.rect.bottom) - Math.max(firstRegion.rect.top, secondRegion.rect.top);
              if (overlapX > 1 && overlapY > 1) {
                overflow = Math.max(overflow, Math.min(overlapX, overlapY));
                fail(witness, 'internal-overlap', {
                  first: identity(firstRegion.element), second: identity(secondRegion.element), width: overlapX, height: overlapY,
                });
              }
            }
          }
          const shown = [...panel.querySelectorAll<HTMLElement>('.dialogue-text p')].filter(visible).map(element => element.textContent ?? '').join(' ');
          if (shown) textSeen.push(shown);
          const candidate: Worst = { witness, overflow, usedHeight: usedBottom - rect.top, panel: snapshotRect(rect), text: shown,
            choices: [...panel.querySelectorAll<HTMLButtonElement>('.dialogue-choice')].filter(visible).map(button => button.textContent?.trim() ?? '') };
          if (!worst || candidate.overflow > worst.overflow || (candidate.overflow === worst.overflow && candidate.usedHeight > worst.usedHeight)) worst = candidate;
          const next = panel.querySelector<HTMLButtonElement>('[data-card-next]');
          if (!next || !visible(next)) {
            if (page !== pageCount - 1) fail(witness, 'unreachable-page', { current: page, count: pageCount });
            const offered = [...panel.querySelectorAll<HTMLButtonElement>('.dialogue-choice:not([data-card-next]):not([data-card-previous])')].filter(visible);
            if (offered.length !== (variant.dialogue.choices.length || 1)) fail(witness, 'final-choice-count', { expected: variant.dialogue.choices.length || 1, actual: offered.length });
            const choices = [...panel.querySelectorAll<HTMLButtonElement>('[data-story-choice]')].filter(visible);
            const actualLabels = choices.map(button => button.querySelector('span:last-child')?.textContent ?? '');
            const expectedLabels = variant.dialogue.choices.map(choice => choice.text);
            if (JSON.stringify(actualLabels) !== JSON.stringify(expectedLabels)) fail(witness, 'choice-label-integrity', { expected: expectedLabels, actual: actualLabels });
            if (choices.some((button, index) => Number(button.dataset.storyChoice) !== index)) fail(witness, 'choice-index-integrity', choices.map(button => button.dataset.storyChoice));
            break;
          }
          if ([...panel.querySelectorAll('[data-story-choice]')].some(visible)) fail(witness, 'choices-before-final-card', true);
          next.click();
          if (ui.getCardIndex() !== page + 1) { fail(witness, 'navigation-did-not-advance', ui.getCardIndex()); break; }
          page++;
        }
        if (normalized(textSeen.join(' ')) !== normalized(variant.dialogue.text)) {
          fail({ variant: variant.id, scene: variant.dialogue.scene, route: variant.witness, page, pages: ui.getCardCount(), notice }, 'text-not-preserved',
            { expectedCharacters: normalized(variant.dialogue.text).length, actualCharacters: normalized(textSeen.join(' ')).length });
        }
      }
      if (variantIndex % 8 === 0) { status.textContent = `Running ${variantIndex + 1}/${collection.variants.length}`; await frame(); }
    }
    const bodyStyle = getComputedStyle(host.querySelector('.dialogue-text')!);
    const choiceStyle = getComputedStyle(host.querySelector('.dialogue-choice')!);
    const report = {
      schemaVersion: 1, generatedAt: new Date().toISOString(), durationMs: Math.round(performance.now() - started),
      browser: { userAgent: navigator.userAgent, platform: navigator.platform, language: navigator.language },
      viewport: { width: innerWidth, height: innerHeight, visualWidth: viewport?.width, visualHeight: viewport?.height, offsetLeft: viewport?.offsetLeft, offsetTop: viewport?.offsetTop, scale: viewport?.scale },
      textScale: scale, sources: { ink: await hash(inkSource), css: await hash(cssSource), dialogueUI: await hash(uiSource), dialogueCards: await hash(paginationSource),
        audit: await hash(auditSource), collector: await hash(collectorSource) },
      fonts: { body: bodyStyle.fontFamily, bodySize: bodyStyle.fontSize, bodyLineHeight: bodyStyle.lineHeight, choices: choiceStyle.fontFamily, choiceSize: choiceStyle.fontSize },
      coverage: { prefixes: collection.prefixes, routes: collection.routes, uniqueVariants: collection.variants.length, noticeVariantsChecked, pagesChecked, maximumPages },
      passed: failureCount === 0, failureCount, failureCounts, examples: failures, worst,
      limits: 'Development DOM fit audit in the reported browser, viewport and font environment. Tests every rendered text/label/ending variant under three notice states. Does not establish visual quality, human reading comfort or other browser font metrics.',
    };
    output.textContent = JSON.stringify(report, null, 2);
    status.textContent = `${failureCount ? 'FAIL' : 'PASS'} · ${collection.variants.length} variants · ${pagesChecked} pages · ${failureCount} failures`;
    previewButton.disabled = !worst;
    if (worst) preview(worst);
    tools.open = true;
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    output.textContent = JSON.stringify({ passed: false, error: message }, null, 2);
    status.textContent = 'Audit error';
    tools.open = true;
  } finally { running = false; runButton.disabled = false; }
}

scaleControl.addEventListener('change', applyScale);
runButton.addEventListener('click', () => { void audit(); });
previewButton.addEventListener('click', () => { if (worst) preview(worst); });
ui.render(collection.variants[0].dialogue, 0);
status.textContent = `${collection.variants.length} variants ready`;
runButton.disabled = false;
