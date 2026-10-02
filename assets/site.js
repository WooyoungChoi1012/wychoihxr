(() => {
  const rows = [...document.querySelectorAll('.research-row')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!rows.length || reducedMotion.matches || !('IntersectionObserver' in window)) return;

  let observer;
  const show = row => {
    row.classList.add('is-visible');
  };
  const showAll = () => {
    rows.forEach(show);
    observer?.disconnect();
  };

  try {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const focused = entry.target.querySelector(':focus-visible') !== null;
        entry.target.classList.toggle('is-visible', entry.isIntersecting || focused);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -12% 0px' });

    rows.forEach(row => {
      row.classList.add('reveal-pending');
      row.addEventListener('focusin', () => show(row));
      observer.observe(row);
    });
    document.documentElement.classList.add('motion-ready');
    reducedMotion.addEventListener('change', event => {
      if (event.matches) showAll();
    });
  } catch {
    document.documentElement.classList.remove('motion-ready');
    showAll();
  }
})();
