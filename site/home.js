/* ARVENTAS homepage engine.
   One pinned stage; scroll position drives video time. All chapter timing
   lives in CHAPTERS below (video seconds + scroll length in viewport heights). */
(() => {
  'use strict';

  /* ── configuration ─────────────────────────────────────── */
  // start/end: video seconds (last end is clamped to the real duration).
  // scroll: how many viewport heights this chapter occupies.
  // fx: horizontal focus (0-1) used as object-position on narrow screens.
  const CHAPTERS = [
    { id: 'ch1', label: 'Überblick',    start: 0.0, end: 1.2, scroll: 90,  fx: 0.52 },
    { id: 'ch2', label: 'Eigentümer',   start: 1.2, end: 3.0, scroll: 120, fx: 0.46 },
    { id: 'ch3', label: 'Objektreport', start: 3.0, end: 4.7, scroll: 120, fx: 0.52 },
    { id: 'ch4', label: 'Investoren',   start: 4.7, end: 6.1, scroll: 120, fx: 0.38 },
    { id: 'ch5', label: 'Begleitung',   start: 6.1, end: 7.6, scroll: 100, fx: 0.62 },
    { id: 'ch6', label: 'Kontakt',      start: 7.6, end: null, scroll: 150, fx: 0.55 }
  ];
  const FADE = 0.14;          // fraction of a chapter used for fading in / out
  const SMOOTHING = 18;       // higher = snappier, less lag
  const FORM_ENDPOINT = '';   // set to a real URL to enable sending (see README)

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const track = $('#track'), stage = $('#stage'), video = $('#film');
  const fallback = $('#fallback'), note = $('#video-note');
  const chapterEls = CHAPTERS.map((c) => $('#' + c.id));
  const railBtns = $$('.rail [data-goto]');
  const rail = $('.rail');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (v) => v * v * (3 - 2 * v);

  /* ── metrics ───────────────────────────────────────────── */
  let spans = [], starts = [], total = 0, duration = 10.13;

  function measure() {
    if (reduce.matches) { track.style.height = ''; return; }
    const h = stage.getBoundingClientRect().height;
    spans = CHAPTERS.map((c) => (c.scroll / 100) * h);
    starts = spans.map((_, i) => spans.slice(0, i).reduce((a, b) => a + b, 0));
    total = spans.reduce((a, b) => a + b, 0);
    track.style.height = (total + h) + 'px';
  }
  const chapterEnd = (i) => CHAPTERS[i].end == null ? duration : CHAPTERS[i].end;

  function locate(y) {
    let i = CHAPTERS.length - 1;
    for (let k = 0; k < CHAPTERS.length; k++) {
      if (y < starts[k] + spans[k]) { i = k; break; }
    }
    return { i, p: clamp((y - starts[i]) / spans[i]) };
  }

  /* ── video scrubbing ───────────────────────────────────── */
  let target = 0, cur = 0, raf = 0, lastT = 0, videoOK = true;

  function seek(t) {
    if (!videoOK || video.readyState < 1) return;
    if (video.seeking) return;               // never stack seeks; 'seeked' re-runs us
    if (Math.abs(video.currentTime - t) < 1 / 60) return;
    try { video.currentTime = t; } catch (e) { /* ignore */ }
  }
  video.addEventListener('seeked', () => seek(cur));

  function loop(now) {
    raf = 0;
    const dt = Math.min((now - lastT) / 1000, 0.1) || 0.016;
    lastT = now;
    cur += (target - cur) * (1 - Math.exp(-dt * SMOOTHING));
    if (Math.abs(target - cur) < 0.005) cur = target;
    seek(cur);
    if (cur !== target) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }

  /* ── per-frame UI (chapters, rail, focus) ──────────────── */
  let ticking = false, activeIdx = -1, shownFallback = -1;

  function update() {
    ticking = false;
    if (reduce.matches) return;
    const y = clamp(-track.getBoundingClientRect().top, 0, total);
    const { i, p } = locate(y);
    const c = CHAPTERS[i];
    target = c.start + (chapterEnd(i) - c.start) * p;
    kick();

    // chapter text: soft fade + small vertical drift
    let strongest = -1, best = 0.5;
    chapterEls.forEach((el, k) => {
      let o = 0, ty = 0;
      if (k === i) {
        const inA = k === 0 ? 1 : smooth(clamp(p / FADE));
        const outA = k === CHAPTERS.length - 1 ? 1 : smooth(clamp((1 - p) / FADE));
        o = Math.min(inA, outA);
        ty = (1 - inA) * 18 - (1 - outA) * 18;
      }
      el.style.opacity = o.toFixed(3);
      el.firstElementChild.style.transform = `translate3d(0,${ty.toFixed(1)}px,0)`;
      if (o > best) { best = o; strongest = k; }
    });
    if (strongest !== activeIdx) {
      activeIdx = strongest;
      chapterEls.forEach((el, k) => {
        const on = k === strongest;
        el.inert = !on;
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
    }

    // rail: highlight chapter by scroll position (not by text opacity)
    railBtns.forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    rail.classList.toggle('is-hidden', y >= total + 4 && track.getBoundingClientRect().bottom < innerHeight * 0.6);

    // narrow screens: slide object-position between chapter focus points
    const next = CHAPTERS[Math.min(i + 1, CHAPTERS.length - 1)];
    const fx = c.fx + (next.fx - c.fx) * smooth(clamp((p - 0.7) / 0.3));
    stage.style.setProperty('--fx', (fx * 100).toFixed(1) + '%');

    // fallback still when the film is unavailable
    if (!videoOK && shownFallback !== i) {
      shownFallback = i;
      fallback.src = `img/still-${i + 1}.jpg`;
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  /* ── navigation to chapters ────────────────────────────── */
  function goTo(n, opts = {}) {
    const i = n - 1;
    if (reduce.matches) {
      chapterEls[i].scrollIntoView({ behavior: 'auto', block: 'start' });
      return;
    }
    const y = i === 0 ? 0 : starts[i] + spans[i] * 0.32;
    scrollTo({ top: y, behavior: opts.instant ? 'auto' : 'smooth' });
  }
  $$('[data-goto]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    closeMenu();
    goTo(+el.dataset.goto);
  }));

  /* ── mobile menu ───────────────────────────────────────── */
  const menuBtn = $('.menu-btn'), nav = $('#site-nav');
  function closeMenu() {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
  }
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) $('a', nav).focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); menuBtn.focus(); }
  });
  matchMedia('(min-width: 861px)').addEventListener('change', closeMenu);

  /* ── video lifecycle ───────────────────────────────────── */
  function videoFailed() {
    videoOK = false;
    stage.classList.add('no-video');
    note.hidden = false;
    shownFallback = -1;
    update();
  }
  video.addEventListener('error', videoFailed);
  const source = $('source', video);
  if (source) source.addEventListener('error', videoFailed);
  video.addEventListener('loadedmetadata', () => {
    if (isFinite(video.duration) && video.duration > 1) duration = video.duration;
    video.pause();
    update();
  });
  // the error event can fire before this script runs, so also inspect the state
  const failedNow = () => video.error || video.networkState === 3;
  if (failedNow()) videoFailed();
  setTimeout(() => { if (!reduce.matches && videoOK && (failedNow() || video.readyState < 1)) videoFailed(); }, 12000);

  /* ── inquiry panel ─────────────────────────────────────── */
  const dlg = $('#inquiry'), form = $('#inq-form'), status = $('#inq-status');
  let opener = null;
  const groups = { owner: $('#grp-owner'), investor: $('#grp-investor') };

  function setRole(role) {
    $$('input[name=role]', form).forEach((r) => { r.checked = r.value === role; });
    Object.entries(groups).forEach(([k, g]) => {
      const on = k === role;
      g.hidden = !on;
      $$('input,select', g).forEach((f) => { f.disabled = !on; });
    });
  }
  function openInquiry(btn) {
    opener = btn;
    const role = btn.dataset.role || '';
    setRole(role);
    const msg = $('#f-msg');
    if (btn.dataset.topic === 'report' && !msg.value.trim()) {
      msg.value = 'Ich interessiere mich für den ARVENTAS Objektreport.';
    }
    status.textContent = ''; status.className = 'status';
    clearErrors();
    document.documentElement.style.overflow = 'hidden';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    $(role ? '#f-name' : 'input[name=role]', form).focus();
  }
  function closeInquiry() {
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    if (opener && document.contains(opener)) opener.focus();
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeInquiry(); });
  $('#inq-close').addEventListener('click', closeInquiry);
  $$('[data-open-inquiry]').forEach((b) => b.addEventListener('click', () => { closeMenu(); openInquiry(b); }));
  $$('input[name=role]', form).forEach((r) => r.addEventListener('change', () => { setRole(r.value); clearError('role'); }));

  const rules = {
    role:  () => form.elements.role.value ? '' : 'Bitte wählen Sie, ob Sie Eigentümer oder Investor sind.',
    name:  () => form.elements.name.value.trim() ? '' : 'Bitte nennen Sie uns Ihren Namen.',
    email: () => {
      const v = form.elements.email.value.trim();
      if (!v) return 'Bitte geben Sie Ihre E-Mail-Adresse an.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Bitte prüfen Sie die E-Mail-Adresse (z. B. name@beispiel.de).';
    },
    message: () => form.elements.message.value.trim().length >= 10 ? '' : 'Bitte beschreiben Sie Ihr Anliegen in mindestens einem Satz.'
  };
  const errId = { role: 'err-role', name: 'err-name', email: 'err-mail', message: 'err-msg' };
  const fieldOf = (k) => k === 'role' ? $('input[name=role]', form) : form.elements[k];

  function showError(k, msg) {
    const p = $('#' + errId[k]); p.textContent = msg; p.hidden = false;
    if (k !== 'role') fieldOf(k).setAttribute('aria-invalid', 'true');
  }
  function clearError(k) {
    const p = $('#' + errId[k]); p.textContent = ''; p.hidden = true;
    if (k !== 'role') fieldOf(k).removeAttribute('aria-invalid');
  }
  function clearErrors() { Object.keys(rules).forEach(clearError); }
  ['name', 'email', 'message'].forEach((k) => {
    // validate on blur only once something was typed, so an error message never shifts the layout under a click on "Anfrage senden"
    form.elements[k].addEventListener('blur', () => {
      if (!form.elements[k].value.trim()) return;
      const m = rules[k](); m ? showError(k, m) : clearError(k);
    });
    form.elements[k].addEventListener('input', () => { if (!rules[k]()) clearError(k); });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    let first = null;
    Object.keys(rules).forEach((k) => {
      const m = rules[k]();
      if (m) { showError(k, m); first = first || fieldOf(k); }
    });
    if (first) {
      status.className = 'status is-warn';
      status.textContent = 'Bitte prüfen Sie die markierten Felder.';
      first.focus();
      return;
    }
    if (!FORM_ENDPOINT) {
      // No backend supplied: never pretend the inquiry was delivered.
      status.className = 'status is-warn';
      status.textContent = 'Der Versand ist noch nicht eingerichtet. Ihre Anfrage wurde nicht übermittelt.';
      return;
    }
    status.className = 'status'; status.textContent = 'Wird gesendet …';
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(String(res.status));
      status.className = 'status is-ok';
      status.textContent = 'Danke. Ihre Anfrage wurde übermittelt.';
      form.reset(); setRole('');
    } catch (err) {
      status.className = 'status is-warn';
      status.textContent = 'Das Senden ist fehlgeschlagen. Bitte versuchen Sie es später erneut.';
    }
  });

  /* ── boot ──────────────────────────────────────────────── */
  function boot() { measure(); update(); }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  reduce.addEventListener('change', () => {
    if (reduce.matches) {
      chapterEls.forEach((el) => { el.inert = false; el.removeAttribute('aria-hidden'); el.style.opacity = ''; el.firstElementChild.style.transform = ''; });
    }
    boot();
  });
  if (reduce.matches) chapterEls.forEach((el) => { el.inert = false; });
  else chapterEls.forEach((el, k) => { if (k) el.inert = true; });
  boot();
  // honour #hash on load (works once layout is measured)
  const h = location.hash.match(/^#(eigentuemer|objektreport|investoren|begleitung|kontakt)$/);
  if (h) goTo({ eigentuemer: 2, objektreport: 3, investoren: 4, begleitung: 5, kontakt: 6 }[h[1]], { instant: true });
})();
