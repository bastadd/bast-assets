/* Couronne 3D — section Services de la Home (Three.js r170)
   Remplace la séquence d'images (crown-sequence.html) : même section, mêmes attributs.
   Besoin :
   - l'attribut data-crown-seq sur la section services ;
   - l'importmap de three dans le <head> de la page (la même que pour le chevalier) ;
   - GSAP + ScrollTrigger (déjà cochés dans Webflow).
   Three.js et le modèle ne sont téléchargés que quand la section approche de l'écran.
   Réglages : bloc DEFAULTS ci-dessous, ou <script type="application/json" id="crown3d-settings"> dans la page
   (le JSON copié depuis la page de test, collé tel quel). */

const BASE = new URL('./', import.meta.url).href;

const DEFAULTS = {
  model: BASE + 'couronne.glb',
  section: '[data-crown-seq]',
  size: 30, sizeMobile: 70,          // largeur de la couronne en % de l'écran
  ratio: 572 / 468,                  // format du cadre (le même que l'ancienne séquence)
  pad: 1.8,                          // le canvas est 1,8 fois plus grand que le cadre : la couronne ne se fait jamais couper en tournant (sa taille ne change pas)
  start: 'top top', end: 'bottom bottom',   // début / fin de la rotation
  maxDpr: 2,
  behind: '.home-service_philosophy-text, [data-crown-behind]',   // éléments qui passent DERRIÈRE la couronne
  // Fin de section : la couronne rétrécit puis se pose dans la div [data-crown-target] (sa largeur = largeur finale du cadre de la couronne)
  land: {
    target: '[data-crown-target]',
    zone: '.home-service_philosophy',   // la partie où tout se passe (la couronne reste à 100 % avant)
    shrinkAt: 1,            // le rétrécissement commence quand le haut de la zone entre en bas de l'écran (1 = bas, 0.5 = milieu)
    crossScale: 0.35,       // taille de la couronne quand elle traverse le texte (0.35 = 35 % de sa taille de départ)
    endScale: 0.3,
    glide: 'power2.in',     // arrivée sur la cible : reste au centre, puis rejoint la cible en douceur (power2.in = départ très doux)          // taille finale si aucune div [data-crown-target] (0.3 = 30 %)
    ease: 'power2.inOut',
  },
  // Texte qui s'ouvre en deux au passage de la couronne
  split: {
    text: '.home-service_philosophy-text',
    gap: 0.8,               // largeur de l'ouverture, en largeur de couronne (1 = toute la largeur du cadre)
    reach: 0.5,             // hauteur de la zone d'ouverture autour de la couronne (en hauteur de cadre)
    soft: 2,                // douceur verticale : les lignes commencent à s'écarter 2 lignes avant la couronne
    spread: 1.4,            // douceur horizontale : les lettres proches de la couronne s'écartent plus que celles du bord
    lag: 0.4,               // inertie des lettres en secondes (elles suivent avec un léger retard, comme dans l'eau)
  },
  light: { trigger: '.home-service_philosophy', color: '#E6E9E9', at: 'top 90%', duration: 0.6, ease: 'power2.inOut',
    texts: '.home-service_process',   // ces blocs passent en texte foncé avec le fond clair (et redeviennent clairs au retour)
    ink: '#0A090B' },   // at : le haut de la div philosophie passe à 90 % de l'écran (plus grand = plus tôt)
  // ── réglages de Clément (page de test, 2026-11-09) ──
  anim: { smooth: 0.12 },
  look: { toneMapping: 'AgX', exposure: 0.3, env: 0.15, envRotation: 0, vignette: 0.81 },
  grade: { on: true, mix: 1 },
  material: { tint: '#cccccc', brightness: 1.8, roughness: 0.83, metalness: 0.61, normalScale: 1.8 },
  key:  { on: true,  color: '#99b3ff', intensity: 2.9, x: 2,    y: 2.7, z: 2.2 },
  rim1: { on: true,  color: '#9eb3ff', intensity: 9.5, x: -2.1, y: 1.5, z: -2 },
  rim2: { on: false, color: '#a8beff', intensity: 2,   x: 3,    y: 0.5, z: -2.5 },
  ambient: { intensity: 0.58 },
  camera: { fov: 32, zoom: 1.38, height: 0.39 },
  mouse: { move: 4, tilt: 5, ease: 0.05 },
};
// courbes d'étalonnage (les mêmes que pour la séquence PNG), 256 × 1 px
const LUT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAABCAIAAAC+O+cgAAAAkklEQVR4nH1PQRLEMAgS8P9v3oOYmGymOqNARFuQJAlAEklJykxJLpk5kIEqpWxQsZGDXbiT1Cqk3P0d3VV4caIw3gkAqP9wLHXTKAAAnLgesJSi0XJEi5bCSkwc6LQWMYGHltPZE7F4mQzm1Hy7fHv6v9y2OLY96bHz2nhNHfTzyuXf/XVqrj13/l/98uNtmmt/q8gC4ScRXD4AAAAASUVORK5CYII=';

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => { for (const k in b) { if (isObj(b[k]) && isObj(a[k])) merge(a[k], b[k]); else if (k in a) a[k] = b[k]; } return a; };
const CFG = JSON.parse(JSON.stringify(DEFAULTS));
try { const el = document.getElementById('crown3d-settings'); if (el) merge(CFG, JSON.parse(el.textContent)); } catch (e) { console.warn('[crown3d] réglages illisibles', e); }

function start() {
  const section = document.querySelector(CFG.section);
  if (!section) return;
  if (!window.gsap || !window.ScrollTrigger) { console.warn('[crown3d] GSAP ou ScrollTrigger introuvable'); return; }
  gsap.registerPlugin(ScrollTrigger);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── styles (les mêmes que la séquence) ──
  const css = document.createElement('style');
  css.textContent = `
    .crown-seq_layer{position:absolute;inset:0;pointer-events:none;z-index:1}
    ${CFG.section}{isolation:isolate;transition:none!important}
    .crown-seq_sticky{position:sticky;top:0;height:100vh;height:100svh;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0}
    .crown-seq_vig{position:absolute;inset:0;background:radial-gradient(ellipse farthest-side at 50% 50%,rgba(0,0,0,0) 45%,rgba(0,0,0,var(--crown-vig-dark,.4)) 100%)}
    .crown-seq_canvas{display:block;position:relative}`;
  document.head.appendChild(css);

  // ── calque collant + vignette + canvas, en premier enfant de la section ──
  const layer = document.createElement('div'); layer.className = 'crown-seq_layer'; layer.setAttribute('aria-hidden', 'true');
  const sticky = document.createElement('div'); sticky.className = 'crown-seq_sticky';
  const vig = document.createElement('div'); vig.className = 'crown-seq_vig'; vig.style.setProperty('--crown-vig-dark', CFG.look.vignette);
  const canvas = document.createElement('canvas'); canvas.className = 'crown-seq_canvas';
  sticky.append(vig, canvas); layer.appendChild(sticky); section.insertBefore(layer, section.firstChild);

  // ── plans : contenu (z 2) > couronne (z 1) > éléments « behind » ──
  if (getComputedStyle(section).position === 'static') section.style.position = 'relative';
  const behind = CFG.behind ? [...section.querySelectorAll(CFG.behind)] : [];
  const holds = el => behind.some(b => el.contains(b));
  (function lift(parent) {
    for (const el of parent.children) {
      if (el === layer || behind.includes(el)) continue;
      if (holds(el)) { lift(el); continue; }
      const cs = getComputedStyle(el);
      if (cs.position === 'static') el.style.position = 'relative';
      if (cs.zIndex === 'auto') el.style.zIndex = '2';
    }
  })(section);

  // ── taille du cadre ──
  let W = 0, H = 0, CW = 0, CH = 0;
  function size() {
    const vw = matchMedia('(max-width: 767px)').matches ? CFG.sizeMobile : CFG.size;
    let w = innerWidth * vw / 100, h = w / CFG.ratio;
    if (h > innerHeight * 0.9) { h = innerHeight * 0.9; w = h * CFG.ratio; }
    W = Math.round(w); H = Math.round(h); CW = Math.round(w * CFG.pad); CH = Math.round(h * CFG.pad);
    canvas.style.width = CW + 'px'; canvas.style.height = CH + 'px'; canvas.style.flex = 'none';
  }
  size();

  // ── texte coupé en deux : chaque lettre dans un span, regroupées par ligne ──
  const ease = gsap.parseEase(CFG.land.ease);
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const smooth = t => t * t * (3 - 2 * t);
  let textEl = !reduce && CFG.split.text ? section.querySelector(CFG.split.text) : null;
  // si ce texte est déjà animé par le système global (data-anim / data-scramble, SplitText), on n'y touche pas :
  // les deux découpages se marcheraient dessus et casseraient les autres animations
  if (textEl && (textEl.closest('[data-anim],[data-scramble]') || textEl.querySelector('[data-anim],[data-scramble]'))) {
    console.warn('[crown3d] le texte philosophie a un attribut data-anim / data-scramble : retire-le pour que le texte s\'ouvre au passage de la couronne', textEl);
    textEl = null;
  }
  let chars = [], lines = [];
  if (textEl) {
    const walk = node => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const part of n.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.append(document.createTextNode(part)); continue; }
            const w = document.createElement('span'); w.style.whiteSpace = 'nowrap'; w.style.display = 'inline-block';
            for (const ch of part) { const c = document.createElement('span'); c.textContent = ch; c.style.display = 'inline-block'; c.style.willChange = 'transform'; w.append(c); chars.push({ el: c, x: 0, line: 0, off: 0 }); }
            frag.append(w);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      }
    };
    try { walk(textEl); } catch (e) { console.warn('[crown3d] découpage du texte impossible', e); textEl = null; chars = []; }
  }
  function measure() {
    if (!textEl) return;
    chars.forEach(c => { if (c.qx) c.qx(0, 0); else gsap.set(c.el, { x: 0 }); c.off = 0; });
    const r0 = textEl.getBoundingClientRect(), map = new Map();
    lines = [];
    for (const c of chars) {
      const r = c.el.getBoundingClientRect(), key = Math.round(r.top - r0.top);
      let L = map.get(key);
      if (!L) { L = { top: key, h: r.height, chars: [] }; map.set(key, L); lines.push(L); }
      c.x = r.left - r0.left + r.width / 2; L.chars.push(c);
    }
  }
  // chaque lettre suit sa position cible avec un léger amorti
  chars.forEach(c => { c.qx = gsap.quickTo(c.el, 'x', { duration: CFG.split.lag, ease: 'power3.out' }); });
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); layout(); });

  // ── position / taille de la couronne + ouverture du texte, recalculées à chaque scroll ──
  const targetEl = section.querySelector(CFG.land.target);
  const zoneEl = section.querySelector(CFG.land.zone);
  const textRef = CFG.split.text ? section.querySelector(CFG.split.text) : null;
  const mp = { x: 0, y: 0 };   // décalage souris en px
  let ready = false;
  /* Tout est calé sur des positions de scroll (px), mesurées au refresh :
     A → B : la couronne rétrécit jusqu'à crossScale (avant d'arriver au texte), toujours au centre de l'écran
     B → C : le texte défile à travers la couronne (qui reste au centre, petite) et s'ouvre à son passage
     C → D : la cible monte vers le centre ; la couronne finit de rétrécir à la taille de la cible
     D     : la cible est au centre de l'écran → la couronne s'y pose (fin de la rotation), puis défile avec elle */
  const Y = { A: 0, B: 0, C: 0, D: 0 };
  const docTop = el => el.getBoundingClientRect().top + scrollY;
  function anchors() {
    const vh = innerHeight, half = H * CFG.land.crossScale * 0.42;   // demi-hauteur visible de la couronne à la traversée
    const ref = textRef || zoneEl;
    const refTop = ref ? docTop(ref) : 0, refBot = ref ? refTop + ref.offsetHeight : 0;
    Y.B = refTop - (vh / 2 + half);                        // le haut du texte touche le bas de la couronne
    Y.A = zoneEl ? Math.min(docTop(zoneEl) - vh * CFG.land.shrinkAt, Y.B - vh * 0.3) : Y.B - vh * 0.6;
    Y.C = refBot - (vh / 2 - half);                        // le bas du texte a dépassé le haut de la couronne
    if (targetEl) { const r = targetEl.getBoundingClientRect(); Y.D = r.top + scrollY + r.height / 2 - vh / 2; }
    else Y.D = Y.C + vh * 0.3;
    // si la section se termine avant (bloc collant relâché), on se pose à ce moment-là
    Y.D = Math.min(Y.D, docTop(section) + section.offsetHeight - vh);
    Y.D = Math.max(Y.D, Y.C + vh * 0.25);   // toujours un vrai trajet vers la cible, jamais de saut
  }

  function layout() {
    if (!ready) return;
    const vw = innerWidth, vh = innerHeight, sy = scrollY;
    let sEnd = CFG.land.endScale, tx = vw / 2, ty = vh / 2;
    if (targetEl) { const r = targetEl.getBoundingClientRect(); sEnd = r.width / W; tx = r.left + r.width / 2; ty = r.top + r.height / 2; }
    const sCross = Math.max(CFG.land.crossScale, sEnd);
    const k1 = ease(clamp01((sy - Y.A) / Math.max(1, Y.B - Y.A)));   // rétrécissement avant le texte
    const k3 = ease(clamp01((sy - Y.C) / Math.max(1, Y.D - Y.C)));   // dernier rétrécissement vers la cible
    const sc = sy < Y.C ? 1 + (sCross - 1) * k1 : sCross + (sEnd - sCross) * k3;
    // position : centre de l'écran, puis collée à la cible une fois qu'elle a atteint le centre
    const sr = sticky.getBoundingClientRect(), cx0 = sr.left + sr.width / 2, cy0 = sr.top + sr.height / 2;
    // immobile au centre de l'écran pendant toute la traversée (le texte défile à travers elle), puis de C à D
    // la cible remonte vers elle et la couronne la rejoint en douceur : sa vitesse part de 0 et atteint
    // exactement celle du scroll en D, donc aucun à-coup quand elle se colle à la cible
    const kp = gsap.parseEase(CFG.land.glide)(clamp01((sy - Y.C) / Math.max(1, Y.D - Y.C)));
    const kx = gsap.parseEase('sine.inOut')(clamp01((sy - Y.C) / Math.max(1, Y.D - Y.C)));
    const wantX = cx0 + (tx - cx0) * kx, wantY = cy0 + (ty - cy0) * kp;
    const dx = wantX - cx0, dy = wantY - cy0;
    canvas.style.transform = `translate(${(dx + mp.x).toFixed(2)}px,${(dy + mp.y).toFixed(2)}px) scale(${sc.toFixed(4)})`;
    if (!textEl || !lines.length) return;
    const cx = cx0 + dx + mp.x, cy = cy0 + dy + mp.y, cw = W * sc, ch = H * sc;
    const r0 = textEl.getBoundingClientRect(), relX = cx - r0.left;
    for (const L of lines) {
      const ly = r0.top + L.top + L.h / 2, d = Math.abs(ly - cy);
      const t = smooth(clamp01(1 - (d - ch * CFG.split.reach / 2) / (L.h * CFG.split.soft)));
      const half = cw * CFG.split.gap * t / 2;
      for (const c of L.chars) {
        const dist = Math.abs(c.x - relX), w = Math.exp(-Math.max(0, dist - cw * 0.15) / (cw * CFG.split.spread));
        const off = t < 0.001 ? 0 : (c.x < relX ? -1 : 1) * half * w;
        if (Math.abs(off - c.off) > 0.3) { c.off = off; c.qx(off); }
      }
    }
  }

  // ── rotation : du haut de la section jusqu'à la pose sur la cible ──
  const st = { target: reduce ? 1 : 0 };
  const trig = reduce ? null : ScrollTrigger.create({
    trigger: section, start: CFG.start, end: () => { anchors(); return Y.D; },
    invalidateOnRefresh: true, refreshPriority: -2,
    onUpdate: s => { st.target = s.progress; wake(); },
  });
  // la position de la couronne suit le scroll sur toute la section (y compris après la pose)
  ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', refreshPriority: -3, onUpdate: () => layout() });
  ScrollTrigger.addEventListener('refreshInit', () => { chars.forEach(c => { if (c.qx) c.qx(0, 0); else gsap.set(c.el, { x: 0 }); c.off = 0; }); });
  if (trig) st.target = trig.progress;
  ready = true;
  anchors(); layout();
  ScrollTrigger.addEventListener('refresh', () => { anchors(); layout(); });
  addEventListener('resize', () => { size(); measure(); anchors(); layout(); });

  // ── fond sombre → fond clair (comme avant) ──
  let lightTl = null;
  const lightEl = section.querySelector(CFG.light.trigger);
  if (lightEl) {
    const L = CFG.light;
    lightTl = gsap.timeline({ paused: true, defaults: { duration: L.duration, ease: L.ease },
      scrollTrigger: { trigger: lightEl, start: L.at, toggleActions: 'play none none reverse', refreshPriority: -2 } })
      .to(section, { backgroundColor: L.color }, 0).to(vig, { autoAlpha: 0 }, 0);
    // textes du process : chaque élément qui contient du texte passe à la couleur foncée,
    // en gardant sa transparence d'origine (un texte gris à 60 % reste à 60 %)
    if (L.texts) {
      const els = [];
      section.querySelectorAll(L.texts).forEach(root => {
        [root, ...root.querySelectorAll('*')].forEach(el => {
          if (el === canvas || layer.contains(el)) return;
          if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) els.push(el);
        });
      });
      const ink = gsap.utils.splitColor(L.ink);
      els.forEach(el => {
        const c = gsap.utils.splitColor(getComputedStyle(el).color), a = c.length > 3 ? c[3] : 1;
        lightTl.to(el, { color: `rgba(${ink[0]},${ink[1]},${ink[2]},${a})` }, 0);
      });
    }
  }

  // ── souris ──
  const m = { x: 0, y: 0, tx: 0, ty: 0 };
  let visible = false;
  new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) wake(); }).observe(section);
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onMove = e => { if (!visible) return; m.tx = e.clientX / innerWidth * 2 - 1; m.ty = e.clientY / innerHeight * 2 - 1; wake(); };
  if (!reduce && fine) addEventListener('mousemove', onMove, { passive: true });

  // ── chargement de Three.js + du modèle quand la section approche ──
  let api = null, raf = 0;
  function wake() { if (api && !raf) raf = requestAnimationFrame(api.tick); }
  // préchargé en arrière-plan dès que la page a fini de charger (le hero passe en premier), ou tout de suite
  // si on arrive près de la section avant : la couronne est prête quand on y arrive, même en scrollant vite
  let started = false;
  const start = async () => {
    if (started) return; started = true; io.disconnect();
    try { api = await init(); wake(); } catch (err) { console.error('[crown3d]', err); }
  };
  const io = new IntersectionObserver(e => { if (e[0].isIntersecting) start(); }, { rootMargin: '250% 0px' });
  io.observe(section);
  const idle = () => (window.requestIdleCallback || (f => setTimeout(f, 200)))(start, { timeout: 1500 });
  if (document.readyState === 'complete') setTimeout(idle, 300); else addEventListener('load', () => setTimeout(idle, 300), { once: true });

  async function init() {
    // tout en parallèle (modèle compris) au lieu de l'un après l'autre
    const A = 'three/addons/';
    const glbBuf = fetch(CFG.model).then(r => r.arrayBuffer());
    const [THREE, { GLTFLoader }, { MeshoptDecoder }, { RoomEnvironment }, { EffectComposer }, { RenderPass }, { ShaderPass }, { OutputPass }] = await Promise.all([
      import('three'), import(A + 'loaders/GLTFLoader.js'), import(A + 'libs/meshopt_decoder.module.js'), import(A + 'environments/RoomEnvironment.js'),
      import(A + 'postprocessing/EffectComposer.js'), import(A + 'postprocessing/RenderPass.js'), import(A + 'postprocessing/ShaderPass.js'), import(A + 'postprocessing/OutputPass.js')]);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = { AgX: THREE.AgXToneMapping, ACES: THREE.ACESFilmicToneMapping, Neutral: THREE.NeutralToneMapping, Aucun: THREE.NoToneMapping }[CFG.look.toneMapping] ?? THREE.AgXToneMapping;
    renderer.toneMappingExposure = CFG.look.exposure;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = CFG.look.env;
    scene.environmentRotation.y = THREE.MathUtils.degToRad(CFG.look.envRotation);
    const camera = new THREE.PerspectiveCamera(CFG.camera.fov, CFG.ratio, 0.01, 100);

    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new OutputPass());
    if (CFG.grade.on) {
      const lut = await new THREE.TextureLoader().loadAsync(LUT);
      lut.colorSpace = THREE.NoColorSpace; lut.minFilter = lut.magFilter = THREE.LinearFilter; lut.generateMipmaps = false;
      composer.addPass(new ShaderPass({
        uniforms: { tDiffuse: { value: null }, tLut: { value: lut }, mixAmt: { value: CFG.grade.mix } },
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `uniform sampler2D tDiffuse,tLut;uniform float mixAmt;varying vec2 vUv;
          float L(float v,int c){vec4 s=texture2D(tLut,vec2((clamp(v,0.,1.)*255.+.5)/256.,.5));return c==0?s.r:c==1?s.g:s.b;}
          void main(){vec4 t=texture2D(tDiffuse,vUv);vec3 g=mix(t.rgb,vec3(L(t.r,0),L(t.g,1),L(t.b,2)),mixAmt);gl_FragColor=vec4(min(g,vec3(t.a)),t.a);}`,
      }));
    }

    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await glbBuf, '');
    const root = gltf.scene, pivot = new THREE.Group();
    pivot.add(root); scene.add(pivot);
    let mat;
    root.traverse(o => { if (o.isMesh) { mat = o.material; mat.side = THREE.FrontSide; } });
    const M = CFG.material;
    mat.color.set(M.tint).multiplyScalar(M.brightness);
    mat.roughness = M.roughness; mat.metalness = M.metalness; mat.normalScale.set(M.normalScale, M.normalScale);
    if (mat.map) mat.map.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const clip = gltf.animations[0];
    let mixer = null, action = null;
    if (clip) { mixer = new THREE.AnimationMixer(root); action = mixer.clipAction(clip); action.play(); action.paused = true; }

    // cadrage : sphère englobante sur toute l'animation, centrée sur le point de pivot
    const pts = [], b = new THREE.Box3();
    for (let i = 0; i <= 24; i++) {
      if (action) { action.time = clip.duration * i / 24; mixer.update(0); }
      root.updateMatrixWorld(true); b.setFromObject(root, true); pts.push(b.min.clone(), b.max.clone());
    }
    const all = new THREE.Box3().setFromPoints(pts), center = all.getCenter(new THREE.Vector3());
    const sph = new THREE.Sphere(); new THREE.Box3().setFromObject(root, true).getBoundingSphere(sph);
    const radius = Math.max(sph.radius, all.getSize(new THREE.Vector3()).length() / 2 * 0.75);
    pivot.position.copy(center); root.position.sub(center);

    const lights = ['key', 'rim1', 'rim2'].map(k => {
      const c = CFG[k]; if (!c.on) return null;
      const l = new THREE.DirectionalLight(c.color, c.intensity);
      l.position.set(c.x, c.y, c.z).multiplyScalar(radius * 3); scene.add(l); return l;
    });
    scene.add(new THREE.AmbientLight(0xffffff, CFG.ambient.intensity));

    function frame() {
      size();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CFG.maxDpr));
      renderer.setSize(CW, CH, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(CW, CH);
      camera.aspect = W / H;
      const vf = THREE.MathUtils.degToRad(CFG.camera.fov) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(vf) * CFG.pad));   // même perspective, champ élargi au canvas agrandi
      const d = radius / Math.sin(Math.min(vf, hf)) / CFG.camera.zoom;
      camera.position.set(0, CFG.camera.height * radius, d); camera.lookAt(0, 0, 0);
      camera.near = d / 50; camera.far = d * 10; camera.updateProjectionMatrix();
      dirty = true;
    }
    let dirty = true, prog = st.target, last = performance.now(), rt;
    frame();
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { frame(); wake(); }, 100); });

    canvas.style.opacity = 0;
    gsap.to(canvas, { opacity: 1, duration: 0.8, ease: 'power2.out' });
    document.dispatchEvent(new CustomEvent('crown3d:ready'));

    function tick(now) {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      let moving = false;
      if (action) {
        const k = CFG.anim.smooth > 0 ? 1 - Math.pow(1 - CFG.anim.smooth, dt * 60) : 1;
        if (Math.abs(st.target - prog) > 1e-5) { prog += (st.target - prog) * k; moving = true; dirty = true; } else prog = st.target;
        action.time = Math.min(prog, 0.9999) * clip.duration; mixer.update(0);
      }
      if (Math.abs(m.tx - m.x) + Math.abs(m.ty - m.y) > 1e-4) {
        const ke = 1 - Math.pow(1 - CFG.mouse.ease, dt * 60);
        m.x += (m.tx - m.x) * ke; m.y += (m.ty - m.y) * ke; moving = true; dirty = true;
        mp.x = m.x * CFG.mouse.move; mp.y = m.y * CFG.mouse.move; layout();
        pivot.rotation.y = THREE.MathUtils.degToRad(m.x * CFG.mouse.tilt);
        pivot.rotation.x = THREE.MathUtils.degToRad(m.y * CFG.mouse.tilt);
      }
      if (dirty && visible) { composer.render(); dirty = false; }
      if (moving && visible) raf = requestAnimationFrame(tick);   // ne tourne que si quelque chose bouge et que la section est visible
    }

    return {
      tick,
      destroy() { renderer.dispose(); composer.dispose(); pmrem.dispose(); },
    };
  }

  window.Crown3D = {
    get progress() { return st.target; },
    destroy() {
      cancelAnimationFrame(raf); io.disconnect();
      if (trig) trig.kill();
      if (lightTl) { lightTl.scrollTrigger && lightTl.scrollTrigger.kill(); lightTl.kill(); section.style.backgroundColor = ''; }
      removeEventListener('mousemove', onMove);
      if (api) api.destroy();
      layer.remove(); css.remove();
    },
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
