/**
 * Unit Tests for Main Portfolio Navigation & Scroll Handlers (assets/js/main.js)
 * @jest-environment jsdom
 */

describe('Main Portfolio Handler Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header id="site-header"></header>
      <nav id="site-dock"></nav>
      <section id="hero">
        <a href="#projects" id="projects-link">Projects</a>
      </section>
      <section id="projects">Projects Content</section>
      <div class="fade-up">Fade Item</div>
    `;

    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should toggle scrolled class on header and dock when scroll Y exceeds 50px', () => {
    require('../assets/js/main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const header = document.getElementById('site-header');
    const dock = document.getElementById('site-dock');

    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(header.classList.contains('scrolled')).toBe(true);
    expect(dock.classList.contains('scrolled')).toBe(true);
  });

  test('should trigger smooth scrollIntoView on internal anchor clicks', () => {
    require('../assets/js/main.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const link = document.getElementById('projects-link');
    const targetSection = document.getElementById('projects');

    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(targetSection.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});
