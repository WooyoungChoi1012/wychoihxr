(() => {
  const story = document.querySelector('.detail-story');
  if (!story) return;
  const chapters = [...story.querySelectorAll('.story-chapter')];
  const figures = [...story.querySelectorAll('.story-figure')];
  if (!chapters.length || !figures.length) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 960px)');
  const figureOwners = new Map(figures.map(figure => [figure, figure.closest('.story-chapter')]));
  const pairedFigures = [];
  let lastFigure = figures[0];
  chapters.forEach(chapter => {
    lastFigure = chapter.querySelector('.story-figure') || lastFigure;
    pairedFigures.push(lastFigure);
  });

  let active = -1;
  let stage = null;
  let buttons = [];
  let placeholders = new Map();
  let queued = false;
  let nudge = null;

  function syncReveals() {
    const entranceLine = innerHeight * 0.86;
    const focusedElement = document.activeElement?.matches(':focus-visible') ? document.activeElement : null;
    chapters.forEach((chapter, index) => {
      const focused = chapter.contains(focusedElement);
      const reached = index < active || (index === active && (
        chapter.getBoundingClientRect().top < entranceLine || focused || stage?.contains(focusedElement)
      ));
      chapter.classList.toggle('is-revealed', !reducedMotion.matches && reached);
      const inlineFigure = chapter.querySelector('.story-figure');
      const figureReached = index < active || (index === active && reached && (
        !inlineFigure || inlineFigure.getBoundingClientRect().top < entranceLine || inlineFigure.contains(focusedElement)
      ));
      chapter.classList.toggle('is-figure-revealed', !reducedMotion.matches && figureReached);
    });
  }

  function preserveFocus(element, fallback = null) {
    if (!element) return;
    const target = element.isConnected ? element : fallback;
    if (!target || !story.contains(target)) return;
    if (target === fallback && !target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
    if (document.activeElement !== target) target.focus({ preventScroll: true });
  }

  function setActive(index, force = false) {
    if (index === active && !force) return;
    const focusedElement = document.activeElement?.matches(':focus-visible') ? document.activeElement : null;
    const focusedChapter = chapters.find(chapter => chapter.contains(focusedElement));
    if (!force && focusedChapter && focusedChapter !== chapters[index]) return;
    const focusedFigure = figures.find(figure => figure.contains(focusedElement));
    if (!force && focusedFigure && pairedFigures[index] !== focusedFigure) return;
    const previous = active;
    const previousFigure = pairedFigures[previous];
    active = index;
    chapters.forEach((chapter, i) => {
      chapter.classList.toggle('is-current', i === index);
      chapter.classList.toggle('is-before', i < index);
      chapter.classList.toggle('is-after', i > index);
    });
    syncReveals();
    if (!stage) return;
    const paired = pairedFigures[index];
    nudge?.cancel();
    figures.forEach(figure => {
      const ownerIndex = chapters.indexOf(figureOwners.get(figure));
      figure.classList.toggle('is-active', figure === paired);
      figure.classList.toggle('was-before', figure !== paired && ownerIndex < index);
      figure.classList.toggle('is-after', figure !== paired && ownerIndex > index);
      figure.setAttribute('aria-hidden', String(figure !== paired));
    });
    stage.querySelector('.story-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
    stage.querySelector('.story-current-label').textContent = chapters[index].dataset.storyLabel;
    stage.querySelector('.story-track-fill').style.width = `${((index + 1) / chapters.length) * 100}%`;
    buttons.forEach((button, i) => {
      button.classList.toggle('is-current', i === index);
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (!force && previous >= 0 && paired === previousFigure && !reducedMotion.matches && typeof paired.animate === 'function') {
      nudge = paired.animate([
        { transform: `translateY(${index > previous ? 26 : -26}px)`, opacity: 0.82 },
        { transform: 'translateY(0)', opacity: 1 }
      ], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  }

  function restore() {
    const focused = story.contains(document.activeElement) ? document.activeElement : null;
    nudge?.cancel();
    figures.forEach(figure => {
      placeholders.get(figure)?.replaceWith(figure);
      figure.classList.remove('is-active', 'was-before', 'is-after');
      figure.removeAttribute('aria-hidden');
    });
    placeholders.clear();
    stage?.remove();
    stage = null;
    buttons = [];
    story.classList.remove('story-enhanced');
    preserveFocus(focused, chapters[Math.max(active, 0)]);
  }

  function configureLayout() {
    story.classList.toggle('story-motion-ready', !reducedMotion.matches);
    const shouldEnhance = desktop.matches && !reducedMotion.matches && CSS.supports('position', 'sticky');
    if (!shouldEnhance) {
      if (stage) restore();
      return;
    }
    if (stage) return;
    const focused = story.contains(document.activeElement) ? document.activeElement : null;
    stage = document.createElement('aside');
    stage.className = 'story-stage';
    stage.setAttribute('aria-label', 'Figure paired with the current section');
    const status = document.createElement('div');
    status.className = 'story-status';
    const count = document.createElement('span');
    count.className = 'story-count';
    const label = document.createElement('span');
    label.className = 'story-current-label';
    status.append(count, label);
    const track = document.createElement('div');
    track.className = 'story-track';
    track.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.className = 'story-track-fill';
    track.append(fill);
    const deck = document.createElement('div');
    deck.className = 'story-deck';
    const nav = document.createElement('nav');
    nav.className = 'story-nav';
    nav.setAttribute('aria-label', 'Sections in this project');
    buttons = chapters.map((chapter, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'story-nav-button';
      button.textContent = chapter.dataset.storyLabel;
      button.addEventListener('click', () => {
        chapter.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
      });
      nav.append(button);
      return button;
    });
    figures.forEach(figure => {
      const placeholder = document.createComment('Inline figure position');
      figure.before(placeholder);
      placeholders.set(figure, placeholder);
      figure.querySelector('img').loading = 'eager';
      deck.append(figure);
    });
    stage.append(status, track, deck, nav);
    story.prepend(stage);
    story.classList.add('story-enhanced');
    setActive(Math.max(active, 0), true);
    preserveFocus(focused);
  }

  function update() {
    queued = false;
    const readingLine = innerHeight * 0.42;
    let index = 0;
    chapters.forEach((chapter, i) => {
      if (chapter.getBoundingClientRect().top <= readingLine) index = i;
    });
    setActive(index);
    syncReveals();
  }

  function queueUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  try {
    configureLayout();
    update();
    addEventListener('scroll', queueUpdate, { passive: true });
    addEventListener('resize', () => { configureLayout(); queueUpdate(); }, { passive: true });
    reducedMotion.addEventListener('change', () => { configureLayout(); queueUpdate(); });
    story.addEventListener('focusout', queueUpdate);
    chapters.forEach((chapter, index) => {
      chapter.addEventListener('focusin', () => { setActive(index); syncReveals(); });
    });
  } catch {
    restore();
    story.classList.remove('story-motion-ready');
    chapters.forEach(chapter => chapter.classList.remove('is-current', 'is-before', 'is-after', 'is-revealed', 'is-figure-revealed'));
  }
})();
