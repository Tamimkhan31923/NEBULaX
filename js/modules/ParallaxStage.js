import { rafThrottle, prefersReducedMotion } from '../core/dom.js';

/**
 * @module modules/ParallaxStage
 * -----------------------------------------------------------------------
 * MOUSE INTERACTION + 3D ILLUSION SPECIFICATION — hero product stage
 *  - Each product card carries a `data-depth` value (its distance from
 *    the "camera": lower = closer, moves more). Cards nearer the viewer
 *    should react more strongly to cursor movement than those further
 *    back — this single number drives translate AND rotate, so a card's
 *    apparent depth and its motion stay physically consistent.
 *  - Cursor position is normalized to [-0.5, 0.5] on both axes relative
 *    to the stage's own bounding box, not the viewport, so the effect
 *    stays centered regardless of where the stage sits on the page.
 *  - rotateY follows horizontal offset, rotateX follows the inverse of
 *    vertical offset (moving the mouse up tilts the top of the card
 *    away from the viewer, matching real parallax expectations).
 * ----------------------------------------------------------------------- */
export class ParallaxStage {
  /** @param {HTMLElement} stage */
  constructor(stage) {
    this.stage = stage;
    this.cards = Array.from(stage.querySelectorAll('.nx-product-card'));
  }

  init() {
    if (prefersReducedMotion()) return () => {};

    const onMove = rafThrottle((event) => {
      const rect = this.stage.getBoundingClientRect();
      const cx = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const cy = (event.clientY - rect.top - rect.height / 2) / rect.height;

      for (const card of this.cards) {
        const depth = Number(card.dataset.depth) || 30;
        card.style.transform =
          `translate(${cx * depth}px, ${cy * depth}px) ` +
          `rotateY(${cx * 10}deg) rotateX(${-cy * 10}deg)`;
      }
    });

    const onLeave = () => {
      for (const card of this.cards) card.style.transform = '';
    };

    this.stage.addEventListener('pointermove', onMove);
    this.stage.addEventListener('pointerleave', onLeave);

    return () => {
      this.stage.removeEventListener('pointermove', onMove);
      this.stage.removeEventListener('pointerleave', onLeave);
    };
  }
}
