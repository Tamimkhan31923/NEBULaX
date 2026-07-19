/**
 * @module config
 * Mirrors the subset of css/tokens.css that JavaScript needs to make
 * decisions (breakpoints for matchMedia, particle counts, etc). CSS custom
 * properties cannot be read into @media queries or JS logic cheaply at
 * scale, so these constants are duplicated deliberately — keep them in
 * sync with tokens.css by hand, or generate both from one JSON source in
 * a build step (see README §Performance / code-splitting philosophy).
 */

export const BREAKPOINTS = Object.freeze({
  sm: 640,
  md: 980,
  lg: 1280,
});

export const PARTICLE_CONFIG = Object.freeze({
  countDesktop: 90,
  countMobile: 40,
  maxRadius: 1.6,
  minRadius: 0.4,
  driftSpeed: 0.15,
  cursorInfluenceRadius: 160,
});

export const LOADER_CONFIG = Object.freeze({
  minDisplayMs: 2600,
  progressTickMs: 180,
});

export const REVIEW_LAYOUT = Object.freeze([
  { top: '2%', left: '4%' },
  { top: '8%', left: '58%' },
  { top: '40%', left: '0%' },
  { top: '34%', left: '70%' },
  { top: '68%', left: '22%' },
  { top: '62%', left: '50%' },
]);
