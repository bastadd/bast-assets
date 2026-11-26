/* Chevalier 3D — partie Three.js (chargée seulement si l'ordinateur peut l'afficher).
   Point d'entrée et réglages : knight3d.js */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

export function init(host, K) {
  const { CFG, getPerf, setPerf, setLow, isSoftware, poster, fallback } = K;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  RectAreaLightUniformsLib.init();

  const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (isSoftware(R)) { R.dispose(); R.forceContextLoss(); setLow(); return poster(host); }   // pas de vraie carte graphique
  R.setClearColor(0x000000, 0);
  R.setPixelRatio(Math.min(devicePixelRatio, CFG.render.maxPixelRatio));
  const TONE = { 'ACES Filmic': THREE.ACESFilmicToneMapping, 'AgX': THREE.AgXToneMapping, 'Neutral': THREE.NeutralToneMapping, 'Reinhard': THREE.ReinhardToneMapping, 'Cineon': THREE.CineonToneMapping, 'Aucun': THREE.NoToneMapping };
  R.toneMapping = TONE[CFG.render.toneMapping] ?? THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = CFG.render.exposure;
  R.shadowMap.enabled = CFG.shadows.on;
  const SHADOW = { 'PCF doux': THREE.PCFSoftShadowMap, 'PCF': THREE.PCFShadowMap, 'VSM (très doux)': THREE.VSMShadowMap, 'Basique': THREE.BasicShadowMap };
  R.shadowMap.type = SHADOW[CFG.shadows.type] ?? THREE.VSMShadowMap;
  const cv = R.domElement;
  Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', opacity: '0', transition: `opacity ${CFG.fadeIn}s ease`, pointerEvents: 'none' });
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.appendChild(cv);
  let vig = null;
  if (CFG.vignette.on) {
    vig = document.createElement('div');
    vig.className = 'knight3d_vignette';
    Object.assign(vig.style, { position: 'absolute', inset: '0', pointerEvents: 'none', opacity: String(CFG.vignette.opacity),
      background: `url("${CFG.vignette.src}") center / 100% 100% no-repeat` });
    host.appendChild(vig);
  }

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = CFG.render.envIntensity;
  scene.environmentRotation.y = CFG.render.envRotation * Math.PI / 180;
  const cam = new THREE.PerspectiveCamera(CFG.camera.fov, 1, 0.05, 50);

  const Lc = CFG.lights;
  const key = new THREE.SpotLight(Lc.key.color, Lc.key.intensity, 0, Lc.key.angle, Lc.key.penumbra, 2);
  const front = new THREE.RectAreaLight(Lc.front.color, Lc.front.intensity, Lc.front.width, Lc.front.height);
  const rimL = new THREE.DirectionalLight(Lc.rimL.color, Lc.rimL.intensity);
  const rimR = new THREE.DirectionalLight(Lc.rimR.color, Lc.rimR.intensity);
  const top = new THREE.DirectionalLight(Lc.top.color, Lc.top.intensity);
  scene.add(key, key.target, front, rimL, rimR, top);
  const A = CFG.lights.ambient;
  if (A && A.on) scene.add(new THREE.AmbientLight(A.color, A.intensity));
  const S = CFG.shadows;
  key.castShadow = S.on;
  key.shadow.mapSize.set(S.mapSize, S.mapSize);
  key.shadow.bias = S.bias; key.shadow.normalBias = S.normalBias; key.shadow.radius = S.radius; key.shadow.blurSamples = S.blurSamples;
  key.shadow.camera.near = 0.3; key.shadow.camera.far = 8;

  let head, neck, baseH, baseN, ready = false;
  const hp = new THREE.Vector3();

  function size() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    R.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    needsRender = true;
  }
  function placeCamera() {
    const c = CFG.camera, narrow = cam.aspect < 1;
    cam.position.set(hp.x, hp.y + c.height, hp.z + c.distance * (narrow ? 1.7 : 1));
    cam.lookAt(hp.x, hp.y + c.lookY - (narrow ? 0.12 : 0), hp.z);
  }

  let alive = true;
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(CFG.model, g => {
    if (!alive) return;
    const model = g.scene, aniso = Math.min(8, R.capabilities.getMaxAnisotropy());
    const HELMET = /KnightHiPoly_002|Mask|HeadBase/;
    let helmetMat = null;
    const done = new Set();
    const style = (m, s, bright = 1) => {
      m.color.set(s.tint).multiplyScalar(bright);
      m.roughness = s.roughness; m.normalScale.set(s.normalScale, s.normalScale);
      if (s.metalness !== undefined) m.metalness = s.metalness;
    };
    model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true;
      const m = o.material;
      for (const k of ['map', 'normalMap', 'roughnessMap']) if (m[k]) m[k].anisotropy = aniso;
      m.metalnessMap = null;
      if (HELMET.test(o.name)) {
        if (!helmetMat) { helmetMat = m.clone(); style(helmetMat, CFG.helmet, CFG.helmet.brightness); }
        o.material = helmetMat;
      } else if (!done.has(m)) {
        done.add(m);
        style(m, /Wood|Metalcrown/.test(m.name) ? CFG.crown : CFG.armor);
      }
    });
    scene.add(model);
    const find = n => model.getObjectByName(n) || model.getObjectByName(n.replace('.', ''));
    head = find(CFG.headBone); neck = find(CFG.neckBone);
    baseH = head.quaternion.clone(); baseN = neck.quaternion.clone();
    model.updateMatrixWorld(true);
    head.getWorldPosition(hp);

    for (const [l, s] of [[key, Lc.key], [front, Lc.front], [rimL, Lc.rimL], [rimR, Lc.rimR], [top, Lc.top]]) l.position.set(hp.x + s.x, hp.y + s.y, hp.z + s.z);
    key.target.position.copy(hp); front.lookAt(hp);
    for (const l of [rimL, rimR, top]) l.target.position.copy(hp), scene.add(l.target);

    size(); placeCamera();
    R.compile(scene, cam);
    // test de performance (canvas encore invisible) : la 1re fois seulement
    if (getPerf() === 'ok') reveal();
    else bench(ms => {
      if (!alive) return;
      if (ms > CFG.bench.maxMs) { setLow(); destroy(); fallback(); }
      else { setPerf('ok'); reveal(); }
    });
  }, undefined, err => console.error('[knight3d] modèle non chargé', err));

  // temps réel de dessin d'une image : la lecture d'un pixel oblige à attendre la fin du travail de la carte graphique
  function bench(done) {
    const ts = [], gl = R.getContext(), px = new Uint8Array(4);
    (function f() {
      if (!alive) return;
      const t = performance.now();
      R.render(scene, cam);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      ts.push(performance.now() - t);
      if (ts.length < CFG.bench.frames) requestAnimationFrame(f);
      else { ts.sort((a, b) => a - b); done(ts[ts.length >> 1]); }
    })();
  }

  function reveal() {
    ready = true; needsRender = true;
    if (CFG.intro.on && !reduce) playIntro();
    if (CFG.rise.on && !reduce) playRise();
    requestAnimationFrame(() => {
      cv.style.opacity = '1';
      // éléments à masquer quand la 3D est prête (ex. l'image ou la séquence du hero) : attribut data-knight3d-hide
      document.querySelectorAll('[data-knight3d-hide]').forEach(el => { el.style.transition = `opacity ${CFG.fadeIn}s ease`; el.style.opacity = '0'; });
    });
    host.dispatchEvent(new CustomEvent('knight3d:ready', { bubbles: true }));
  }

  // ── arrivée : exposition qui monte du noir vers la valeur réglée ──
  let intro = null;
  function playIntro() {
    intro = { t0: performance.now() + CFG.intro.delay * 1000 };
    R.toneMappingExposure = CFG.render.exposure * CFG.intro.startExposure;
    needsRender = true;
  }
  function stepIntro(now) {
    if (!intro) return;
    const k = Math.min(1, Math.max(0, (now - intro.t0) / (CFG.intro.duration * 1000)));
    const e = 1 - Math.pow(1 - k, 3);                      // easeOutCubic
    const s0 = CFG.intro.startExposure;
    R.toneMappingExposure = CFG.render.exposure * (s0 + (1 - s0) * e);
    needsRender = true;
    if (k >= 1) intro = null;
  }
  // ── arrivée : la tête part baissée et remonte vers sa position ──
  let rise = null, riseAngle = 0;
  function playRise() {
    rise = { t0: performance.now() + CFG.rise.delay * 1000 };
    riseAngle = CFG.rise.angle; poseDirty = true;
  }
  function stepRise(now) {
    if (!rise) return;
    const k = Math.min(1, Math.max(0, (now - rise.t0) / (CFG.rise.duration * 1000)));
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // easeInOutCubic : départ et arrivée tout en douceur
    const a = CFG.rise.angle * (1 - e);
    if (a !== riseAngle) { riseAngle = a; poseDirty = true; }
    if (k >= 1) rise = null;
  }
  window.Knight3D = { playIntro: () => { if (ready) playIntro(); }, playRise: () => { if (ready) playRise(); } };   // à rappeler plus tard depuis Barba   // à rappeler plus tard depuis Barba

  // ── suivi du curseur ──
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  const onPointer = e => { target.x = e.clientX / innerWidth * 2 - 1; target.y = e.clientY / innerHeight * 2 - 1; };
  addEventListener('pointermove', onPointer, { passive: true });
  // souris hors de la fenêtre : la tête garde sa dernière position (pas de retour au centre)

  // ── boucle : ne dessine que si le hero est visible et que la tête bouge ──
  let visible = true, needsRender = true, poseDirty = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }); io.observe(host);
  const ro = new ResizeObserver(() => { size(); if (ready) placeCamera(); }); ro.observe(host);

  const q = new THREE.Quaternion(), eu = new THREE.Euler(), D = Math.PI / 180, h = CFG.head;
  let raf = 0;
  function tick() {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (!ready || !visible || document.hidden) return;
    const now = performance.now();
    stepIntro(now); stepRise(now);
    const dx = target.x - cur.x, dy = target.y - cur.y;
    const moving = !reduce && (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4);
    if (moving || poseDirty) {
      if (moving) { cur.x += dx * h.ease; cur.y += dy * h.ease; }
      poseDirty = false;
      const pitch = (cur.y > 0 ? cur.y * h.down : cur.y * h.up) + h.offsetPitch;
      const yaw = (cur.x > 0 ? cur.x * h.right : cur.x * h.left) + h.offsetYaw;
      const roll = -cur.x * h.roll, hs = 1 - h.neckShare, ns = h.neckShare;
      const rH = riseAngle * (1 - CFG.rise.neckShare), rN = riseAngle * CFG.rise.neckShare;   // tête baissée de l'arrivée
      eu.set((pitch * hs + rH) * D, yaw * hs * D, roll * hs * D); head.quaternion.copy(baseH).multiply(q.setFromEuler(eu));
      eu.set((pitch * ns + rN) * D, yaw * ns * D, roll * ns * D); neck.quaternion.copy(baseN).multiply(q.setFromEuler(eu));
      needsRender = true;
    }
    if (needsRender) { R.render(scene, cam); needsRender = false; }
  }
  tick();

  // Barba : tout arrêter quand on quitte la page
  return destroy;
  function destroy() {
    if (!alive) return;
    alive = false; ready = false; cancelAnimationFrame(raf);
    removeEventListener('pointermove', onPointer); io.disconnect(); ro.disconnect();
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); });
    R.dispose(); R.forceContextLoss(); cv.remove(); if (vig) vig.remove();
  }
}
