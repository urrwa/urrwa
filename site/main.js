(() => {
  /* mobile nav */
  const btn = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav');
  let lang = 'de';
  const label = (open) => lang === 'en' ? (open ? 'Close menu' : 'Open menu') : (open ? 'Menü schließen' : 'Menü öffnen');
  const setNav = (open) => {
    if (!btn || !nav) return;
    nav.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', label(open));
  };
  if (btn && nav) {
    btn.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });
  }

  /* language: German text lives in the markup, English in data-en */
  const nodes = document.querySelectorAll('[data-en]');
  nodes.forEach((el) => { el.dataset.de = el.textContent; });
  const META = {
    de: { title: 'ARVENTAS – Go-to-Market- & Wachstumsstrategie', logo: 'ARVENTAS Startseite', group: 'Sprache / Language', main: 'Hauptnavigation' },
    en: { title: 'ARVENTAS – Go-to-Market & Growth Strategy', logo: 'ARVENTAS home', group: 'Language / Sprache', main: 'Main navigation' }
  };
  const setLang = (l, save) => {
    lang = l === 'en' ? 'en' : 'de';
    nodes.forEach((el) => { el.textContent = lang === 'en' ? el.getAttribute('data-en') : el.dataset.de; });
    document.documentElement.lang = lang;
    const logo = document.querySelector('.header .logo'); if (logo) logo.setAttribute('aria-label', META[lang].logo);
    const grp = document.querySelector('.lang'); if (grp) grp.setAttribute('aria-label', META[lang].group);
    if (nav) nav.setAttribute('aria-label', META[lang].main);
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    setNav(nav ? nav.classList.contains('is-open') : false);
    if (save) { try { localStorage.setItem('arventas-lang', lang); } catch (e) {} }
  };
  document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang, true)));

  let initial = null;
  try { initial = localStorage.getItem('arventas-lang'); } catch (e) {}
  if (!initial) initial = (navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en';
  if (initial === 'en') setLang('en', false);
})();
