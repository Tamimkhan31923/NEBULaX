/**
 * @module core/dom
 * Small, dependency-free DOM + performance helpers shared by every module.
 * Kept intentionally tiny: this is not a utility-belt library, it's the
 * five or six functions that would otherwise be copy-pasted per module.
 */

/** @param {string} selector @param {ParentNode} [scope] @returns {Element|null} */
export const qs = (selector, scope = document) => scope.querySelector(selector);

/** @param {string} selector @param {ParentNode} [scope] @returns {Element[]} */
export const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/**
 * Debounce: delays invocation until `wait` ms of silence.
 * Used for resize handlers, where every intermediate frame is wasted work.
 */
export function debounce(fn, wait = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Throttle via rAF: coalesces high-frequency events (pointermove, scroll)
 * to at most once per animation frame, which is the display's own budget.
 */
export function rafThrottle(fn) {
  let scheduled = false;
  let lastArgs;
  return (...args) => {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      fn(...lastArgs);
      scheduled = false;
    });
  };
}

/** Clamp a number between min and max. */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** Linear interpolation. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** True if the user's OS/browser requests reduced motion. Check this
 *  before starting any purely decorative rAF loop or CSS animation. */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Wraps `IntersectionObserver` so callers pass a plain callback instead
 * of re-deriving the observer boilerplate each time. Returns a `disconnect`
 * function for cleanup (important in an SPA-like teardown, harmless here).
 */
export function onIntersect(elements, callback, options = { threshold: 0.15 }) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => callback(entry, observer));
  }, options);
  elements.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}
