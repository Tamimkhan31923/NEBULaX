import { PARTICLE_CONFIG, BREAKPOINTS } from '../config.js';
import { debounce, prefersReducedMotion } from '../core/dom.js';

/**
 * @module modules/ParticleSystem
 * -----------------------------------------------------------------------
 * PARTICLE SYSTEM SPECIFICATION
 *  - Renders on a single <canvas> covering the viewport (position: fixed
 *    in CSS), NOT the full document height — particles are an ambient
 *    backdrop, not a scroll-tracked layer, so they never need to be
 *    larger than one screen.
 *  - Particle count is device-scaled: 90 on desktop, 40 below the `md`
 *    breakpoint, keeping per-frame cost roughly constant relative to
 *    typical mobile GPU/CPU budgets.
 *  - Each particle drifts at a constant sub-pixel velocity and wraps at
 *    the viewport edges (a torus, not a bounce) — wrapping avoids the
 *    visually distracting "billiard ball" bounce pattern.
 *  - Cursor proximity increases a particle's alpha (never its size or
 *    velocity) within a 160px radius, using a linear falloff. Only alpha
 *    changes on interaction so the field never feels like it's being
 *    "pushed" — it's a light source passing over the particles.
 *  - `prefers-reduced-motion: reduce` disables the animation loop
 *    entirely and renders one static frame instead of skipping the
 *    canvas altogether, so the ambient depth cue is preserved without
 *    motion.
 * ----------------------------------------------------------------------- */
class Particle {
  constructor(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = Math.random() * (PARTICLE_CONFIG.maxRadius - PARTICLE_CONFIG.minRadius) + PARTICLE_CONFIG.minRadius;
    this.vx = (Math.random() - 0.5) * PARTICLE_CONFIG.driftSpeed;
    this.vy = (Math.random() - 0.5) * PARTICLE_CONFIG.driftSpeed;
    this.baseAlpha = Math.random() * 0.6 + 0.2;
    this.hue = Math.random() > 0.5 ? '181,101,255' : '56,189,248';
  }

  step(width, height) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
  }

  draw(ctx, mouseX, mouseY) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.hypot(dx, dy);
    const influence = PARTICLE_CONFIG.cursorInfluenceRadius;
    const alpha = dist < influence ? Math.min(1, this.baseAlpha + (influence - dist) / influence) : this.baseAlpha;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.hue},${alpha})`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = `rgba(${this.hue},0.8)`;
    ctx.fill();
  }
}

export class ParticleSystem {
  #canvas;
  #ctx;
  #particles = [];
  #width = 0;
  #height = 0;
  #mouseX = 0;
  #mouseY = 0;
  #rafId = null;
  #reducedMotion = false;

  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
    this.#reducedMotion = prefersReducedMotion();
  }

  #resize = () => {
    this.#width = this.#canvas.width = window.innerWidth;
    this.#height = this.#canvas.height = window.innerHeight;
  };

  #spawn() {
    const count = window.innerWidth < BREAKPOINTS.md
      ? PARTICLE_CONFIG.countMobile
      : PARTICLE_CONFIG.countDesktop;
    this.#particles = Array.from({ length: count }, () => new Particle(this.#width, this.#height));
  }

  #onPointerMove = (event) => {
    this.#mouseX = event.clientX;
    this.#mouseY = event.clientY;
  };

  #renderFrame = () => {
    this.#ctx.clearRect(0, 0, this.#width, this.#height);
    for (const particle of this.#particles) {
      if (!this.#reducedMotion) particle.step(this.#width, this.#height);
      particle.draw(this.#ctx, this.#mouseX, this.#mouseY);
    }
    if (!this.#reducedMotion) {
      this.#rafId = requestAnimationFrame(this.#renderFrame);
    }
  };

  init() {
    this.#resize();
    this.#spawn();
    this.#mouseX = this.#width / 2;
    this.#mouseY = this.#height / 2;

    window.addEventListener('resize', debounce(() => {
      this.#resize();
      this.#spawn();
    }, 200));
    window.addEventListener('pointermove', this.#onPointerMove, { passive: true });

    this.#renderFrame();

    return () => {
      if (this.#rafId) cancelAnimationFrame(this.#rafId);
      window.removeEventListener('pointermove', this.#onPointerMove);
    };
  }
}
