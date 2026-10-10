/* 3D hero: a small city of towers; a few gold ones are the "off-market" objects. */
(() => {
  const canvas = document.getElementById('scene');
  const hero = document.getElementById('top');
  if (!canvas || !hero || typeof THREE === 'undefined') return;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const city = new THREE.Group();
  scene.add(city);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 10, 4);
  scene.add(sun);

  /* seeded random so the skyline is the same every visit */
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const N = window.innerWidth < 640 ? 9 : 13, GAP = 1.5;
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 });
  const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.35 });
  const glowMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 });
  const glowEdge = new THREE.LineBasicMaterial();
  const beamMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.18, depthWrite: false });
  const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, side: THREE.DoubleSide });

  const marked = new Set(['4,6', '8,3', '6,9']);
  const rings = [];
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const unitEdges = new THREE.EdgesGeometry(unit);

  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = (i - (N - 1) / 2) * GAP, z = (j - (N - 1) / 2) * GAP;
    const d = Math.hypot(x, z) / (N * GAP * 0.5);
    const isMark = marked.has(i + ',' + j) || (N < 13 && marked.has((i + 2) + ',' + (j + 2)));
    const h = isMark ? 2.6 + rnd() * 0.8 : 0.35 + rnd() * rnd() * 3.2 * (1.15 - d * 0.6);
    const w = 0.8 + rnd() * 0.15;
    const m = new THREE.Mesh(unit, isMark ? glowMat : bodyMat);
    m.scale.set(w, h, w);
    m.position.set(x, h / 2, z);
    city.add(m);
    const e = new THREE.LineSegments(unitEdges, isMark ? glowEdge : edgeMat);
    e.scale.copy(m.scale); e.position.copy(m.position);
    city.add(e);
    if (isMark) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 8, 1, true), beamMat);
      beam.position.set(x, h + 3, z);
      city.add(beam);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.82, 48), ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.02, z);
      city.add(ring); rings.push(ring);
    }
  }
  const ground = new THREE.GridHelper(N * GAP + 6, N * 2 + 4, 0x000000, 0x000000);
  const gm = ground.material; gm.transparent = true; gm.opacity = 0.22;
  city.add(ground);

  function theme() {
    const bg = css('--bg'), surf = css('--surface'), acc = css('--accent'), mut = css('--muted'), line = css('--line');
    scene.fog = new THREE.Fog(new THREE.Color(bg), 12, 30);
    bodyMat.color.set(surf); edgeMat.color.set(mut);
    glowMat.color.set(acc); glowEdge.color.set(acc); beamMat.color.set(acc); ringMat.color.set(acc);
    ground.material.color.set(line);
  }
  theme();
  matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', theme);
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let w = 0, h = 0, mx = 0, my = 0, tx = 0, ty = 0;
  function resize() {
    w = hero.clientWidth; h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* on wide screens push the city to the right so the text keeps clear space */
    if (w > 900) camera.setViewOffset(w, h, -w * 0.2, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    draw(performance.now());
  }
  new ResizeObserver(resize).observe(hero);
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
  });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(t) {
    const a = reduce ? 0.9 : 0.9 + t * 0.00006 + mx * 0.6;
    const r = window.innerWidth < 640 ? 17 : 15;
    camera.position.set(Math.cos(a) * r, 7.5 - my * 3, Math.sin(a) * r);
    camera.lookAt(0, 1, 0);
    rings.forEach((g, i) => {
      const s = 1 + 0.35 * ((t * 0.0008 + i * 0.33) % 1);
      g.scale.set(s, s, s); g.material.opacity = reduce ? 0.8 : 0.8 * (1 - ((t * 0.0008 + i * 0.33) % 1) * 0.8);
    });
    renderer.render(scene, camera);
  }

  let visible = true, raf = 0;
  function loop(t) {
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    draw(t);
    raf = visible ? requestAnimationFrame(loop) : 0;
  }
  if (!reduce) {
    new IntersectionObserver((en) => {
      visible = en[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    }).observe(hero);
    raf = requestAnimationFrame(loop);
  }
})();
