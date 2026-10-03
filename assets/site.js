// The shared mobile navigation initializes before the research-motion fallback.
(() => {
  const header = document.querySelector('.sr-header');
  const button = header?.querySelector('.sr-menu-button');
  const navigation = header?.querySelector('.sr-navigation');
  if (!header || !button || !navigation) return;

  const label = button.querySelector('.sr-menu-label');
  const symbol = button.querySelector('.sr-menu-symbol');
  const narrow = window.matchMedia('(max-width: 760px)');
  const setOpen = open => {
    button.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('sr-is-open', open);
    label.textContent = open ? 'Close' : 'Menu';
    symbol.textContent = open ? '−' : '+';
  };

  header.classList.add('menu-ready');
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!header.contains(event.target)) setOpen(false);
  });
  narrow.addEventListener('change', () => setOpen(false));
})();

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
