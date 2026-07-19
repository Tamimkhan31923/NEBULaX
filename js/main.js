/**
 * @module main
 * -----------------------------------------------------------------------
 * Application entry point. Loaded as `<script type="module">`, which
 * gives us: strict mode by default, native import/export (no bundler
 * required to run this project, though see README §Performance for the
 * production build recommendation), and deferred execution (module
 * scripts don't block parsing, so no `defer` attribute needed).
 *
 * Boot order is deliberate:
 *   1. Loader runs first and awaits full page settle.
 *   2. Everything else initializes only once the loader has resolved,
 *      so no interactive module fights the loader for the main thread
 *      during the heaviest paint moment of the page's life.
 * ----------------------------------------------------------------------- */
import { qs, qsa } from './core/dom.js';
import { Loader } from './modules/Loader.js';
import { Navbar } from './modules/Navbar.js';
import { ParticleSystem } from './modules/ParticleSystem.js';
import { ParallaxStage } from './modules/ParallaxStage.js';
import { ScrollReveal } from './modules/ScrollReveal.js';
import { ReviewField } from './modules/ReviewField.js';
import { initMagneticButtons } from './modules/MagneticButton.js';
import { initTiltCards } from './modules/TiltCard.js';

/**
 * Registry of teardown functions. Not strictly needed on a static page
 * that never unmounts, but keeping the discipline of "every init returns
 * a cleanup" is what makes this code portable into an SPA shell later
 * without a rewrite.
 */
const teardowns = [];

async function bootstrap() {
  const loader = new Loader({
    root: qs('#nx-loader'),
    barFill: qs('#nx-loader-bar-fill'),
    pctLabel: qs('#nx-loader-pct'),
  });
  await loader.run();

  const navbar = new Navbar({
    header: qs('#nx-header'),
    sentinel: qs('#nx-scroll-sentinel'),
  });
  teardowns.push(navbar.init());

  const particles = new ParticleSystem(qs('#nx-particle-canvas'));
  teardowns.push(particles.init());

  const stage = qs('#nx-stage');
  if (stage) teardowns.push(new ParallaxStage(stage).init());

  teardowns.push(new ScrollReveal().init());

  const reviewField = qs('#nx-review-field');
  if (reviewField) new ReviewField(reviewField).init();

  teardowns.push(initMagneticButtons());
  teardowns.push(initTiltCards());
}

bootstrap().catch((error) => {
  // A failed module should never leave the loader stuck on screen —
  // surface the error but still reveal the site underneath.
  console.error('[NebulaX] bootstrap failed:', error);
  qs('#nx-loader')?.classList.add('nx-loader--hidden');
  document.body.style.overflow = '';
});

window.addEventListener('pagehide', () => {
  teardowns.forEach((fn) => fn?.());
});
