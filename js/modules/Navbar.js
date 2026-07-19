/**
 * @module modules/Navbar
 * Toggles the "scrolled" visual state using an IntersectionObserver
 * watching a 1px sentinel near the top of the page, instead of a
 * `scroll` event listener. The sentinel approach fires only on the
 * boundary crossing (main-thread cost is effectively zero), whereas a
 * scroll listener fires on every pixel of movement even when throttled.
 */
export class Navbar {
  /** @param {{header: HTMLElement, sentinel: HTMLElement}} els */
  constructor({ header, sentinel }) {
    this.header = header;
    this.sentinel = sentinel;
  }

  init() {
    const observer = new IntersectionObserver(
      ([entry]) => {
        this.header.classList.toggle('nx-navbar--scrolled', !entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(this.sentinel);
    return () => observer.disconnect();
  }
}
