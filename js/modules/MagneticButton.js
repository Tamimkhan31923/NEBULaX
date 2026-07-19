import { rafThrottle, prefersReducedMotion } from '../core/dom.js';

/**
 * @module modules/MagneticButton
 * -----------------------------------------------------------------------
 * MOUSE INTERACTION SPECIFICATION — magnetic pull
 *  - Trigger: pointermove within the element's bounding box.
 *  - Response: element translates toward the cursor at a fraction of the
 *    offset (0.25x horizontal, 0.35x vertical) — never 1:1, so the effect
 *    reads as "attraction" rather than "the button is glued to the cursor."
 *  - Release: on pointerleave, transform tweens back to (0, 0) via the
 *    element's own CSS transition (var(--nx-duration-base)), not JS,
 *    since a single-axis return is cheaper as a declarative transition.
 *  - Only `transform` is touched — no layout properties — so this runs
 *    entirely on the compositor thread.
 * ----------------------------------------------------------------------- */
export class MagneticButton {
  /** @param {HTMLElement} el */
  constructor(el) {
    this.el = el;
    this.strengthX = 0.25;
    this.strengthY = 0.35;
  }

  init() {
    if (prefersReducedMotion()) return () => {};

    const onMove = rafThrottle((event) => {
      const rect = this.el.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      this.el.style.transform = `translate(${x * this.strengthX}px, ${y * this.strengthY}px)`;
    });

    const onLeave = () => {
      this.el.style.transform = 'translate(0, 0)';
    };

    this.el.addEventListener('pointermove', onMove);
    this.el.addEventListener('pointerleave', onLeave);

    return () => {
      this.el.removeEventListener('pointermove', onMove);
      this.el.removeEventListener('pointerleave', onLeave);
    };
  }
}

/** Convenience: wires every `[data-magnetic]` element in one call. */
export function initMagneticButtons(root = document) {
  const teardowns = Array.from(root.querySelectorAll('[data-magnetic]')).map((el) =>
    new MagneticButton(el).init()
  );
  return () => teardowns.forEach((fn) => fn());
}
