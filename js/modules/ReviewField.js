import { REVIEW_LAYOUT, BREAKPOINTS } from '../config.js';

/**
 * @module modules/ReviewField
 * Positions review bubbles at hand-picked-but-varied coordinates and
 * gives each one a randomized drift path/duration/delay so the field
 * reads as organic rather than a repeating pattern. Below the `md`
 * breakpoint the field degrades to a static stacked list (handled in
 * CSS) so this module simply no-ops on small viewports rather than
 * fighting the responsive layout.
 */
export class ReviewField {
  /** @param {HTMLElement} field */
  constructor(field) {
    this.field = field;
    this.bubbles = Array.from(field.querySelectorAll('.nx-bubble'));
  }

  init() {
    if (window.innerWidth <= BREAKPOINTS.md) return;

    this.bubbles.forEach((bubble, i) => {
      const position = REVIEW_LAYOUT[i % REVIEW_LAYOUT.length];
      const duration = 6 + Math.random() * 4;
      const dx = Math.round(Math.random() * 40 - 20);
      const dy = Math.round(Math.random() * 30 - 25);

      bubble.style.setProperty('--top', position.top);
      bubble.style.setProperty('--left', position.left);
      bubble.style.setProperty('--dx', `${dx}px`);
      bubble.style.setProperty('--dy', `${dy}px`);
      bubble.style.setProperty('--dur', `${duration}s`);
      bubble.style.setProperty('--delay', `${i * 0.4}s`);
    });
  }
}
