/**
 * @module modules/ScrollReveal
 * -----------------------------------------------------------------------
 * SCROLL ANIMATION SPECIFICATION
 *  - Every element carrying `[data-reveal]` starts hidden (see the
 *    corresponding rule in css/components/cards.css) and animates to its
 *    resting state the first time it crosses 15% into the viewport.
 *  - One IntersectionObserver instance is shared across every matched
 *    element, rather than instantiating one observer per element — the
 *    browser's observer bookkeeping cost is per-instance, not per-target,
 *    so N elements on 1 observer is O(1) instances instead of O(N).
 *  - Reveal is one-directional and one-time: once visible, an element is
 *    unobserved. Scroll-linked, reversible animations (parallax-on-scroll)
 *    are handled by dedicated modules (e.g. ParallaxStage), not here —
 *    mixing "reveal once" and "track continuously" in one class would
 *    make both harder to reason about.
 * ----------------------------------------------------------------------- */
export class ScrollReveal {
  /**
   * @param {string} [selector]
   * @param {IntersectionObserverInit} [options]
   */
  constructor(selector = '[data-reveal]', options = { threshold: 0.15 }) {
    this.selector = selector;
    this.options = options;
  }

  init(root = document) {
    const targets = Array.from(root.querySelectorAll(this.selector));
    if (targets.length === 0) return () => {};

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, this.options);

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }
}
