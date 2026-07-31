document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('site-header');
  const dock = document.getElementById('site-dock');

  window.addEventListener('scroll', () => {
    const isScrolled = window.scrollY > 50;
    if (header) header.classList.toggle('scrolled', isScrolled);
    if (dock) dock.classList.toggle('scrolled', isScrolled);
  }, { passive: true });

  const fadeEls = document.querySelectorAll('.fade-up:not(.visible)');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10 });

  fadeEls.forEach(el => observer.observe(el));

  document.querySelectorAll('.skills-grid, .projects-list, .experience-grid, .footer-grid').forEach(container => {
    container.querySelectorAll('.fade-up').forEach((child, i) => {
      child.style.transitionDelay = (i * 0.1) + 's';
    });
  });

  let rafId;
  window.addEventListener('scroll', () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      const offset = Math.min(window.scrollY * 0.15, 80);
      const dots = document.querySelector('.hero-dots');
      if (dots) dots.style.transform = 'translateY(' + offset + 'px)';
      rafId = null;
    });
  }, { passive: true });

  // Smooth Anchor Scroll Handler (Prevents file:// security origin log in Chrome)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
});
