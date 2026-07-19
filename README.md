# NebulaX — Engineering Documentation

Premium gaming tools marketing site. Pure HTML5, CSS3, and vanilla ES2023
JavaScript — no build tool, no framework, no backend. This document is the
architecture reference: what's where, why it's structured that way, and
the specs behind each interactive system.

## 1. Folder structure

```
nebulax-project/
├── index.html                 Single page, semantic HTML5
├── README.md                  This document
├── robots.txt                 Crawl directives
├── sitemap.xml                Single-URL sitemap (expand if pages are added)
├── site.webmanifest           PWA metadata (installable icon/theme color)
├── .eslintrc.json             Lint rules (ES2023, browser env)
├── .prettierrc                Formatting rules
├── css/
│   ├── tokens.css             Design tokens — the only file with raw values
│   ├── base.css                Reset + a11y primitives (skip link, focus ring)
│   ├── main.css                Entry point; @imports everything in cascade order
│   └── components/             One file per BEM block, no cross-file coupling
│       ├── loader.css
│       ├── navbar.css
│       ├── buttons.css
│       ├── hero.css
│       ├── cards.css
│       ├── showcase.css
│       ├── reviews.css
│       └── footer.css
├── js/
│   ├── main.js                 Entry point — boot order + module wiring
│   ├── config.js                Constants mirrored from CSS tokens
│   ├── core/
│   │   ├── animate.js           Vanilla tween engine (GSAP-style API) + easing
│   │   └── dom.js                qs/qsa, debounce, rafThrottle, IO wrapper
│   └── modules/                 One class per interactive system
│       ├── Loader.js
│       ├── Navbar.js
│       ├── ParticleSystem.js
│       ├── MagneticButton.js
│       ├── TiltCard.js
│       ├── ParallaxStage.js
│       ├── ScrollReveal.js
│       └── ReviewField.js
└── assets/
    └── icons/favicon.svg
```

**Why this shape:** CSS is split by *component*, JS is split by *system*.
Neither splits by *page* or *feature*, because there is one page — the
seams that matter here are "what does this look like" (CSS component)
and "what does this do" (JS module), and the two are linked only through
`data-*` attribute hooks (see §Component System), never by CSS classes
that JS also queries.

### Running it

Because `js/main.js` is loaded as an ES module (`<script type="module">`),
opening `index.html` directly via `file://` will fail in Chrome and
Firefox — both enforce CORS on module imports and refuse local file
origins. Serve the folder instead:

```
python3 -m http.server 8000        # or: npx serve .
```

This is standard for any real ES-module project and is *not* a NebulaX-
specific limitation.

---

## 2. HTML5 semantic standards

- One `<h1>` (hero headline); every subsequent heading (`<h2>`/`<h3>`)
  follows document order with no skipped levels.
- Landmarks: `<header>`, `<nav aria-label="Primary">`, `<main id="main-content">`,
  `<footer>` — a screen reader user can jump straight to any of these.
- `<section>` elements are always labelled via `aria-labelledby` pointing
  at their own heading `id`, so the accessibility tree exposes a named
  region rather than an anonymous `<section>`.
- Product cards and showcase rows use `<article>` because each is a
  self-contained, independently distributable unit of content (a single
  product).
- Stats use `<dl>/<dt>/<dd>` because they are literally a description
  list (label → value), not a generic `<div>` grid.
- Decorative-only elements (glow layers, particle canvas, glyphs, orbs)
  carry `aria-hidden="true"` so assistive tech never has to interpret
  visual noise as content.

---

## 3. CSS architecture

**BEM naming**, namespaced with `nx-` to avoid collisions if this CSS
is ever embedded inside another app shell:

```
.nx-block
.nx-block__element
.nx-block--modifier
```

Examples in this codebase: `.nx-navbar`, `.nx-navbar__link`,
`.nx-navbar--scrolled`; `.nx-btn`, `.nx-btn--primary`, `.nx-btn--ghost`.

**Design tokens** (`css/tokens.css`) are the *only* file allowed to
contain a raw color, pixel value, or duration. Every component file
consumes a `var(--nx-*)` token. This is what makes a full re-theme (dark
→ light, a seasonal palette swap) a one-file diff instead of a grep-and-
replace across a dozen files.

**Cascade layering by import order**, documented at the top of
`main.css`: tokens → base → backdrop → components. Native `@import` has
a real network-waterfall cost in production (each `@import` is a
blocking round-trip) — ship this concatenated and minified through
whatever bundling step your deployment already uses (esbuild, Vite,
even a one-line `cat` + `cssnano` in CI). During development, the
waterfall is worth the trade for being able to open one file per
component.

---

## 4. JavaScript architecture

- **ES2023 modules** throughout (`import`/`export`), no global namespace
  pollution — every module's public surface is exactly what it exports.
- **OOP where the domain has state and lifecycle** (`ParticleSystem`,
  `Loader`, `Navbar`, `TiltCard`, `MagneticButton`, `ParallaxStage`,
  `ScrollReveal`, `ReviewField` are all classes with an `init()` that
  returns a teardown function). Plain functions where there's no state
  to own (`core/dom.js`, `core/animate.js` are function libraries).
- **Private class fields** (`#field`) in `ParticleSystem` and the
  internal `Tween` class — internal mutable state is never accessible
  from outside the instance, which is enforced by the language rather
  than by convention/underscore-prefixing.
- **Async/await** in `Loader.js` and `main.js`'s `bootstrap()` — the
  boot sequence (tick progress → await window `load` → reveal) reads as
  a linear story instead of nested callbacks.
- **Consistent lifecycle contract**: every module's `init()` returns a
  cleanup function; `main.js` collects them in a `teardowns` array. This
  costs nothing on a static page that never unmounts, but it's the
  difference between "portable module" and "one-off script" — this
  codebase could be dropped into an SPA shell without a rewrite.

---

## 5. Animation engine

`js/core/animate.js` recreates the *ergonomics* of GSAP (numeric
`from`/`to` props, an easing curve, `onUpdate`/`onComplete` callbacks)
without importing GSAP, per the brief's no-external-framework
constraint. One shared `requestAnimationFrame` ticker per active
`Tween` — not a single global ticker for *all* tweens, since that would
require a scheduler; for this page's scale (short-lived UI tweens, not
hundreds of concurrent elements) a ticker-per-tween is the simpler
correct choice, and each stops itself the moment its tween completes.

Easing curves are pure `t → t` functions (`Easing.easeOutCubic`,
`easeOutBack`, `easeOutExpo`, etc.), so a new curve is a five-line
addition, not a new dependency.

**Scroll-driven and cursor-driven effects deliberately do NOT use the
tween engine** — `ParticleSystem`, `ParallaxStage`, and `TiltCard` write
directly to `transform`/canvas each frame because they're tracking a
continuously-moving input (cursor, particle velocity), not animating
between two fixed states. The tween engine is for the latter (e.g. a
future "fly a toast in and out").

---

## 6. Performance optimization

- **GPU-only properties**: every animation in this codebase touches only
  `transform`, `opacity`, or a CSS custom property consumed by a
  `background`/`filter` — never `top`/`left`/`width`/`height`, which
  would force layout recalculation every frame.
- **One IntersectionObserver instance per concern**, not per element:
  `ScrollReveal` observes N `[data-reveal]` targets with a single
  observer; `Navbar` observes one 1px sentinel instead of listening to
  `scroll`. Both patterns exist specifically to keep main-thread cost
  flat regardless of page length.
- **rAF-throttled pointer handlers** (`core/dom.js`'s `rafThrottle`):
  `pointermove` can fire far faster than the display refresh rate;
  coalescing to once-per-frame means the cursor-tracked effects
  (tilt, magnetic buttons, parallax stage, particle cursor influence)
  never do more work than the screen can show.
- **Debounced resize**: canvas resize + particle re-spawn only run
  200ms after resizing stops, not on every intermediate frame.
- **Device-scaled particle count**: 90 particles desktop, 40 below the
  `md` breakpoint (see `js/config.js`) — a deliberate concession that
  mobile GPUs get less simultaneous canvas work.
- **`prefers-reduced-motion` short-circuits, rather than just shortens,
  every purely decorative rAF loop** (`ParticleSystem`, `TiltCard`,
  `MagneticButton`, `ParallaxStage`) — see §Accessibility.
- **Code-splitting philosophy (no bundler present)**: this project ships
  as authored, one `<script type="module">` entry that the browser's
  native module graph resolves lazily. If this project graduates to a
  bundler, the natural split points are already drawn: `core/` (shared,
  load first, cache-friendly since it changes rarely) vs `modules/`
  (feature code, could become dynamic `import()` per section if the
  page grows additional below-the-fold interactive sections).
- **Fonts**: `preconnect` before the stylesheet request, `display=swap`
  in the Google Fonts URL to avoid invisible-text flash (FOIT) — text
  renders in a fallback font immediately, swaps once the webfont loads.

---

## 7. Responsive strategy

Mobile-first: base component CSS targets the smallest viewport; a single
`max-width: 980px` breakpoint (`--nx-bp-md`, mirrored in `js/config.js`
as `BREAKPOINTS.md`) collapses multi-column layouts (hero grid, feature
grid, showcase rows) to single-column and disables JS-driven position
math that doesn't make sense at that width (review bubble drift).

**Fluid typography via `clamp()`** — every text size in `tokens.css`
(`--nx-text-xs` through `--nx-text-3xl`) is `clamp(min, preferred, max)`,
so type scales continuously with viewport width instead of jumping at
breakpoints. Example: `--nx-text-3xl: clamp(2.6rem, 1.8rem + 4vw, 5.2rem)`
— never smaller than 2.6rem, never larger than 5.2rem, linearly
interpolated between.

Fluid spacing follows the same pattern for section padding
(`--nx-space-section-y`, `--nx-space-section-x`), so large gaps shrink
gracefully rather than needing a breakpoint override.

---

## 8. Accessibility (WCAG 2.2)

- **2.4.1 Bypass Blocks** — visible-on-focus skip link to `#main-content`.
- **2.4.11 / 2.4.13 Focus visible / Focus appearance** — a single
  `:focus-visible` rule in `base.css` gives every interactive element a
  consistent, high-contrast outline; never removed without replacement.
- **2.3.3 Animation from Interactions** — `@media (prefers-reduced-motion:
  reduce)` in `base.css` zeroes out all CSS animation/transition
  durations globally; every JS-driven rAF loop (`ParticleSystem`,
  `TiltCard`, `MagneticButton`, `ParallaxStage`) independently checks
  `prefersReducedMotion()` before starting, so motion is suppressed at
  both the CSS and JS layer.
- **1.1.1 Non-text Content** — every decorative visual (glow layers,
  glyphs, orbs, particle canvas) is `aria-hidden="true"`; the hero stage
  gets one `role="img"` with a descriptive `aria-label` standing in for
  the whole illustrative cluster.
- **1.3.1 Info and Relationships** — stats use `<dl>`, product cards use
  `<article>` with real headings, sections are labelled landmarks.
- **2.1.1 Keyboard** — all interactive elements are real `<a>`/`<button>`
  (never a `<div onclick>`), so they're natively focusable and
  activatable; feature cards carry `tabindex="0"` so keyboard users can
  reach the same focus-triggered spotlight (`:focus-within`) that mouse
  users get from hover.
- **4.1.3 Status Messages** — the loader carries `role="status"
  aria-live="polite"` so its progress readout is announced without
  stealing focus.

---

## 9. SEO optimization

- Unique, descriptive `<title>` and `<meta name="description">`.
- `rel="canonical"` to prevent duplicate-content ambiguity.
- Open Graph + Twitter Card meta for social share previews.
- `JSON-LD` structured data (`SoftwareApplication` schema) describing
  the product, platforms, and aggregate rating for rich-result eligibility.
- `robots.txt` + `sitemap.xml` for crawl discovery.
- Semantic heading hierarchy doubles as an SEO signal — a crawler reads
  the same `h1 → h2 → h3` structure a screen reader does.

---

## 10. Image optimization

This build is illustration-free by design (every visual is CSS gradient/
canvas), so there are no raster images to optimize yet — but the
moment product photography or screenshots are added, follow this
checklist:

- Serve modern formats with fallback: `<picture>` with `avif` → `webp` →
  `jpg` sources.
- Always set explicit `width`/`height` (or `aspect-ratio` in CSS) to
  reserve layout space and prevent Cumulative Layout Shift.
- `loading="lazy"` + `decoding="async"` on every below-the-fold `<img>`;
  the hero's LCP image (if one is added) should instead be `loading="eager"
  fetchpriority="high"` to win the race for Largest Contentful Paint.
- Responsive `srcset`/`sizes` for any image that spans more than one
  layout width, so mobile never downloads a desktop-resolution asset.
- The Open Graph image referenced in `index.html`
  (`assets/images/og-cover.jpg`, currently a placeholder path) should be
  exactly 1200×630 and under ~300KB.

---

## 11. Typography system

| Role | Face | Used for |
|---|---|---|
| Display | Space Grotesk | Headlines, product names, section titles — geometric, futuristic without being a cliché tech-mono |
| Body | Inter | Paragraph copy, nav links — neutral, highly legible at small sizes |
| Mono | JetBrains Mono | Eyebrows, platform tags, stat-style labels — signals "data/system" register |

Scale is fluid (`clamp()`, see §Responsive strategy) rather than fixed
per-breakpoint, defined once in `tokens.css` and consumed everywhere via
`var(--nx-text-*)`.

---

## 12. Color system

Two-tier: raw **palette** tokens (`--nx-palette-*`, numeric hues, never
referenced outside `tokens.css`) feeding semantic **color** tokens
(`--nx-color-*`, what components actually use — `--nx-color-accent-primary`,
`--nx-color-border-hover`, etc.). This indirection means a future light
theme only has to redefine the semantic layer, not touch component CSS.

| Token | Hex/Value | Role |
|---|---|---|
| `--nx-palette-void-950` | `#050310` | Page background |
| `--nx-palette-purple-700` | `#1a0f3d` | Deep surface gradient stop |
| `--nx-palette-violet-600` | `#7c3aed` | Primary accent / brand gradient start |
| `--nx-palette-violet-400` | `#b565ff` | Electric highlight, glow color |
| `--nx-palette-blue-500` | `#38bdf8` | Secondary accent / brand gradient end |
| `--nx-palette-white-100` | `#f6f3ff` | Primary text |

---

## 13. Component system

Rule: **CSS classes describe appearance, `data-*` attributes describe
behavior.** A component's look (`nx-feature-card`) and what JS hooks
into it (`data-tilt`, `data-reveal`) are never the same selector — this
means restyling a component never risks silently breaking its behavior
wiring, and vice versa.

| Component | CSS file | Behavior hook(s) |
|---|---|---|
| Loader | `components/loader.css` | `Loader.js` (id-based, singleton) |
| Navbar | `components/navbar.css` | `Navbar.js` via sentinel `id` |
| Buttons | `components/buttons.css` | `[data-magnetic]` |
| Hero / Stage | `components/hero.css` | `[data-intro]`, `ParallaxStage.js` via `id` |
| Feature cards | `components/cards.css` | `[data-tilt]`, `[data-reveal]` |
| Showcase rows | `components/showcase.css` | `[data-reveal]` |
| Review bubbles | `components/reviews.css` | `ReviewField.js` via `id` |
| CTA / Footer | `components/footer.css` | `[data-reveal]` |

---

## 14. Hero section specification

- **Layout**: two-column grid (copy + 3D stage) above 980px, single
  column (stage below copy) beneath it.
- **Entrance choreography**: five direct children animate in sequence
  via `[data-intro]` + an inline `--d` delay custom property — eyebrow
  (0.2s) → headline (0.35s) → subhead (0.55s) → CTAs (0.75s) → stats
  (0.95s). Each is a 24px translateY + opacity fade over 1000ms
  (`--nx-duration-cinematic`) with `easeOut`-style cubic-bezier.
- **Headline**: gradient-clipped text (`background-clip: text`), two
  manually-broken lines rather than a wrapping single string, so the
  line break is art-directed rather than accidental.
- **CTA hierarchy**: one filled gradient primary button, one glass
  ghost secondary — never two primaries competing for attention.

---

## 15. Particle system specification

See the full spec comment block in `js/modules/ParticleSystem.js`.
Summary: fixed-position full-viewport canvas, device-scaled particle
count (90 desktop / 40 mobile), constant-velocity edge-wrapping drift,
cursor-proximity alpha boost (never size/velocity) within a 160px
radius, single shared rAF loop, `prefers-reduced-motion` renders one
static frame instead of removing the canvas.

---

## 16. 3D illusion specification

Two independent implementations, both CSS-`perspective`-based (no WebGL,
per the brief's constraint):

1. **Hero stage** (`ParallaxStage.js`) — three product cards each carry
   a `data-depth` value; cursor offset (normalized to the stage's own
   bounding box) drives both `translate` and `rotateX/rotateY` scaled by
   that depth, so apparent distance and motion magnitude stay coupled.
2. **Feature card tilt** (`TiltCard.js`) — cursor position within a
   single card drives `rotateX`/`rotateY` capped at ±8°, paired with a
   `radial-gradient` "spotlight" positioned at the same cursor
   coordinates (`--mx`/`--my`), so the lighting cue and the rotation cue
   agree with each other instead of contradicting.

---

## 17. Mouse interaction specification

| Interaction | Module | Behavior |
|---|---|---|
| Magnetic buttons | `MagneticButton.js` | Translates toward cursor at 0.25x/0.35x offset within bounds; snaps back via CSS transition on leave |
| Card tilt + spotlight | `TiltCard.js` | See §3D illusion spec |
| Hero stage parallax | `ParallaxStage.js` | See §3D illusion spec |
| Particle field | `ParticleSystem.js` | Alpha-only boost near cursor, 160px radius, linear falloff |

All pointer handlers are rAF-throttled (`core/dom.js`) and skipped
entirely under `prefers-reduced-motion: reduce`.

---

## 18. Scroll animation specification

`ScrollReveal.js`: one `IntersectionObserver` (15% visibility threshold)
watches every `[data-reveal]` element; on first intersection, adds
`.is-visible` (which `cards.css` animates via `opacity`/`transform`
transition) and unobserves — the reveal is one-time and one-directional
by design. Continuous scroll-linked effects (parallax-while-scrolling)
are explicitly out of scope for this module; see `ParallaxStage.js` for
the cursor-linked equivalent this page uses instead.

---

## 19. Premium micro-interactions

- Nav links: underline draws in from the left on hover/focus (`width: 0
  → 100%` transition), not a static border.
- Primary button: lifts 3px + shadow intensifies on hover; both revert
  on blur/mouseleave via the same transition (no separate "leave"
  animation to author).
- Showcase "get" links: arrow glyph slides right 6px on hover/focus.
- All hover states are paired with `:focus-visible` equivalents — a
  micro-interaction that only fires on `:hover` excludes keyboard users
  from the same feedback.

---

## 20. Code quality rules

- `eqeqeq`, `no-var`, `prefer-const` enforced via `.eslintrc.json`.
- Every module file opens with a JSDoc block explaining *why*, not just
  *what* — see §Comments and documentation standards.
- No class exceeds one responsibility: `ParticleSystem` only owns
  particles; `Navbar` only owns the scrolled-state toggle. If a module
  needs to reach into another module's DOM, it does so through `main.js`
  composition, never through a hidden cross-import.
- CSS selectors never mix a type selector and a BEM class in a way that
  creates specificity fights (e.g. no `.nx-section.nx-feature-card`
  overrides) — every override is a modifier class, not a compound
  selector.

---

## 21. Security considerations (no backend)

Even a static, backend-free page has a real attack surface:

- **No inline scripts, no inline event handlers** (`onclick="..."`) —
  everything is wired in `main.js` via `addEventListener`, which keeps a
  strict `Content-Security-Policy` (e.g. `script-src 'self'`) actually
  enforceable if this is deployed behind one.
- **No `innerHTML`/`document.write` with dynamic data anywhere in this
  codebase** — every DOM write is either static markup or a `style`/
  custom-property assignment, which eliminates DOM-based XSS as a
  category for this page.
- **External resources are limited to Google Fonts** over HTTPS with
  `rel="preconnect"`; no third-party script includes are ever introduced,
  since exactly one compromised third-party script is the single most
  common real-world vector on marketing pages.
- **All outbound links are same-document anchors or same-origin** in
  this build; if external links are added later, they must carry
  `rel="noopener noreferrer"` to prevent the linked page from getting a
  `window.opener` reference back into this one.
- **JSON-LD is static, author-controlled content**, never built by
  string-concatenating user input — the moment structured data
  incorporates any user-supplied value, it must be `JSON.stringify`-
  escaped, not template-interpolated.

---

## 22. Comments and documentation standards

- Every CSS component file opens with a block comment naming its BEM
  block/element/modifier set and any JS behavior hooks it cooperates
  with.
- Every JS module opens with a `@module` JSDoc block; anything that is
  a *specification* (particle behavior, tilt math, magnetic pull curve)
  is documented as a spec in that comment, not just described — the
  comment states the actual numbers (160px radius, ±8° cap, 0.25x/0.35x
  strength) so the spec and the implementation can never silently drift
  apart.
- Public class methods and factory functions carry `@param`/`@returns`
  JSDoc so editor tooling gets real autocomplete without a separate
  TypeScript build step.

---

## 23. Browser compatibility

Target: last 2 versions of Chrome, Firefox, Safari, Edge; iOS Safari and
Android Chrome for mobile. Every feature used is broadly supported in
that set — `IntersectionObserver`, ES modules, CSS custom properties,
`clamp()`, `backdrop-filter` (with `-webkit-` prefix included),
`prefers-reduced-motion`. No experimental/behind-a-flag API is used.
`backdrop-filter` is the one property worth a real fallback: browsers
without it simply render the glass panels as solid-tinted rather than
blurred, which still reads correctly (see §Progressive enhancement).

---

## 24. Progressive enhancement

- **No-JS baseline**: `<html class="no-js">` starts pessimistic; the
  first line of `Loader.js` adds `js-ready` once scripting is confirmed
  running. `main.css`'s `.no-js [data-intro], .no-js [data-reveal]`
  rule forces all entrance/reveal content to its final visible state —
  a user with JS disabled sees the complete page immediately, never a
  page stuck at opacity 0.
- **`<noscript>` block** additionally hides the loader overlay outright
  and neutralizes intro/reveal opacity as a second line of defense, in
  case the `no-js`/`js-ready` class toggle is ever bypassed by a
  non-standard user agent.
- **`@supports` candidates**: if `backdrop-filter` support needs an
  explicit fallback beyond the graceful solid-tint default, wrap the
  blur-dependent rule in `@supports (backdrop-filter: blur(1px))`.
- **Content-first**: every headline, stat, and product description
  exists as real text in the HTML — none of it is generated or injected
  by JavaScript, so it is present, indexable, and readable regardless of
  script execution.

---

## 25. Final quality checklist

- [x] Single `<h1>`, correct heading order, no skipped levels
- [x] Skip link, visible focus ring, keyboard-operable interactive elements
- [x] `prefers-reduced-motion` respected at both CSS and JS layers
- [x] All decorative visuals `aria-hidden`
- [x] No raw color/spacing/timing values outside `tokens.css`
- [x] BEM naming with zero cross-file class coupling
- [x] Every animation GPU-bound (`transform`/`opacity`/custom property only)
- [x] Single shared `IntersectionObserver` per concern, not per element
- [x] Device-scaled particle count; debounced resize
- [x] Mobile-first CSS with fluid `clamp()` type and spacing
- [x] SEO meta, Open Graph, Twitter Card, JSON-LD, sitemap, robots.txt
- [x] No inline scripts/handlers; no dynamic `innerHTML`
- [x] No-JS and `<noscript>` fallback leaves content fully visible
- [x] ESLint + Prettier configs present and enforced
- [x] Every module documented with a `@module` JSDoc spec block
