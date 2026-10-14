// Three small jobs: the mobile menu, the achievement filters, and marking
// which section you're reading in the navigation. The page works without any of it.
(() => {
  const rail = document.querySelector('.rail');
  const button = document.querySelector('.menu-btn');
  const nav = document.getElementById('site-nav');

  // ---------- mobile menu ----------
  function setMenu(open) {
    rail.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Close' : 'Menu';
    document.body.classList.toggle('lock', open);
  }
  button.addEventListener('click', () => setMenu(button.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rail.classList.contains('open')) { setMenu(false); button.focus(); }
  });
  window.matchMedia('(min-width: 62rem)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // ---------- achievement filters ----------
  const filters = document.querySelector('[data-filters]');
  if (filters) {
    const status = document.querySelector('[data-status]');
    const items = [...document.querySelectorAll('#achievements [data-category]')];
    filters.hidden = false;
    filters.addEventListener('click', (e) => {
      const choice = e.target.closest('button[data-filter]');
      if (!choice) return;
      const wanted = choice.dataset.filter;
      filters.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === choice)));
      let shown = 0;
      items.forEach((item) => {
        const show = wanted === 'all' || item.dataset.category === wanted;
        item.hidden = !show;
        if (show) shown++;
      });
      status.textContent = `Showing ${shown} of ${items.length}`;
    });
  }

  // ---------- current section in the navigation ----------
  if ('IntersectionObserver' in window) {
    const links = new Map([...nav.querySelectorAll('a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const link = links.get(entry.target.id);
          if (!link) continue;
          if (entry.isIntersecting) {
            links.forEach((a) => a.removeAttribute('aria-current'));
            link.setAttribute('aria-current', 'true');
          } else if (link.hasAttribute('aria-current')) {
            link.removeAttribute('aria-current');
          }
        }
      },
      { rootMargin: '-35% 0px -60% 0px' },
    );
    links.forEach((_, id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
  }
})();
