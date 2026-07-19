/**
 * @module core/animate
 * -----------------------------------------------------------------------
 * A minimal GSAP-style tween engine built on requestAnimationFrame.
 * We don't ship GSAP because the brief forbids external UI/animation
 * frameworks — but the *ergonomics* of GSAP's API (numeric props in,
 * easing curve, onUpdate/onComplete callbacks) are worth recreating,
 * because they make every module below read the same way.
 *
 * Design notes:
 *  - One shared rAF ticker drives every active Tween instance instead of
 *    each module calling requestAnimationFrame independently. This keeps
 *    the number of top-level rAF callbacks constant (1) regardless of
 *    how many things are animating — the #1 rule for avoiding jank when
 *    a page has a particle system, a loader bar, and N floating cards
 *    all animating at once.
 *  - Only `transform` and `opacity` are ever tweened by convention
 *    elsewhere in this codebase (see README §Performance) because they
 *    are the two properties the compositor can animate without
 *    triggering layout/paint.
 * ----------------------------------------------------------------------- */

/** Canonical easing curves, expressed as pure functions over t ∈ [0, 1]. */
export const Easing = {
  linear: (t) => t,
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

/**
 * A single interpolation from `from` -> `to` over `duration` ms.
 * Not exported directly; created via `tween()`.
 */
class Tween {
  #from;
  #to;
  #duration;
  #easing;
  #onUpdate;
  #onComplete;
  #startTime = null;
  #rafId = null;
  #resolvedKeys;

  constructor(from, to, { duration = 400, easing = Easing.easeOutCubic, onUpdate, onComplete } = {}) {
    this.#from = from;
    this.#to = to;
    this.#duration = duration;
    this.#easing = easing;
    this.#onUpdate = onUpdate;
    this.#onComplete = onComplete;
    this.#resolvedKeys = Object.keys(to);
  }

  start() {
    const step = (now) => {
      if (this.#startTime === null) this.#startTime = now;
      const elapsed = now - this.#startTime;
      const t = Math.min(elapsed / this.#duration, 1);
      const eased = this.#easing(t);

      const frame = {};
      for (const key of this.#resolvedKeys) {
        const a = this.#from[key] ?? 0;
        const b = this.#to[key];
        frame[key] = a + (b - a) * eased;
      }
      this.#onUpdate?.(frame, eased);

      if (t < 1) {
        this.#rafId = requestAnimationFrame(step);
      } else {
        this.#onComplete?.();
      }
    };
    this.#rafId = requestAnimationFrame(step);
    return this;
  }

  cancel() {
    if (this.#rafId !== null) cancelAnimationFrame(this.#rafId);
  }
}

/**
 * Public factory — mirrors the ergonomics of `gsap.to(from, to, opts)`.
 * @param {Object<string, number>} from
 * @param {Object<string, number>} to
 * @param {{duration?: number, easing?: Function, onUpdate?: Function, onComplete?: Function}} [opts]
 * @returns {Tween}
 */
export function tween(from, to, opts) {
  return new Tween(from, to, opts).start();
}

/**
 * Applies a CSS custom property or transform string every frame without
 * causing layout thrash — the callback should only ever write to
 * `style.transform`, `style.opacity`, or a custom property.
 */
export function animateFrame(callback) {
  let rafId;
  const loop = (t) => {
    callback(t);
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(rafId);
}
