import { rafThrottle, prefersReducedMotion } from '../core/dom.js';

/**
 * @module modules/TiltCard
 * -----------------------------------------------------------------------
 * 3D ILLUSION SPECIFICATION — feature card tilt
 *  - The card is not actually 3D geometry; the illusion is a CSS
 *    `perspective()` wrapper plus a `rotateX`/`rotateY` driven by cursor
 *    position within the card's bounds, normalized to a signed range.
 *  - Rotation is capped at ±8deg — beyond that the "premium" tilt reads
 *    as a gimmick rather than depth.
 *  - A companion CSS custom property pair (--mx, --my, in card's local
 *    px) drives a radial-gradient "spotlight" in cards.css, so the card
 *    appears lit from the cursor's direction — light and rotation
 *    reinforce the same depth cue instead of fighting each other.
 * ----------------------------------------------------------------------- */
export class TiltCard {
  /** @param {HTMLElement} el */
  constructor(el, { maxTilt = 8 } = {}) {
    this.el = el;
    this.maxTilt = maxTilt;
  }

  init() {
    if (prefersReducedMotion()) return () => {};

    const onMove = rafThrottle((event) => {
      const rect = this.el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      this.el.style.setProperty('--mx', `${x}px`);
      this.el.style.setProperty('--my', `${y}px`);

      const rotateX = ((y / rect.height) - 0.5) * -this.maxTilt;
      const rotateY = ((x / rect.width) - 0.5) * this.maxTilt;
      this.el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    const onLeave = () => {
      this.el.style.transform = '';
    };

    this.el.addEventListener('pointermove', onMove);
    this.el.addEventListener('pointerleave', onLeave);

    return () => {
      this.el.removeEventListener('pointermove', onMove);
      this.el.removeEventListener('pointerleave', onLeave);
    };
  }
}

/** Convenience: wires every `[data-tilt]` element in one call. */
export function initTiltCards(root = document) {
  const teardowns = Array.from(root.querySelectorAll('[data-tilt]')).map((el) =>
    new TiltCard(el).init()
  );
  return () => teardowns.forEach((fn) => fn());
}
