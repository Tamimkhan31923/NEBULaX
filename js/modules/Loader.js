import { LOADER_CONFIG } from '../config.js';

/**
 * @module modules/Loader
 * Owns the boot-sequence overlay. Uses async/await rather than nested
 * setTimeout callbacks so the sequence (tick progress -> wait for
 * window `load` -> hold minimum display time -> reveal) reads top-to-bottom
 * as the story it actually is.
 */
export class Loader {
  /** @param {{root: HTMLElement, barFill: HTMLElement, pctLabel: HTMLElement}} els */
  constructor({ root, barFill, pctLabel }) {
    this.root = root;
    this.barFill = barFill;
    this.pctLabel = pctLabel;
    this.progress = 0;
  }

  /** Ticks a fake-but-honest progress readout while real assets settle. */
  #tickProgress() {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        this.progress = Math.min(100, this.progress + Math.random() * 14);
        this.barFill.style.width = `${this.progress}%`;
        this.pctLabel.textContent = `INITIALIZING CORE — ${Math.floor(this.progress)}%`;
        if (this.progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, LOADER_CONFIG.progressTickMs);
    });
  }

  /** Resolves once the window `load` event has fired (all assets settled). */
  #whenWindowLoaded() {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  }

  /**
   * Runs the full sequence and reveals the site. Marks <html> as
   * `js-ready` first — see main.css's `.no-js` gate — so CSS knows
   * scripting genuinely completed rather than assuming it will.
   */
  async run() {
    document.documentElement.classList.add('js-ready');
    document.body.style.overflow = 'hidden';

    await Promise.all([this.#tickProgress(), this.#whenWindowLoaded()]);

    this.root.setAttribute('aria-hidden', 'true');
    this.root.classList.add('nx-loader--hidden');
    document.body.style.overflow = '';
  }
}
