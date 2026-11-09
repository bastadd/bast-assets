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
  light: { trigger: '.home-service_philosophy', color: '#E6E9E9', at: 'top 60%', duration: 0.9, ease: 'power2.inOut' },
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

  // ── progression au scroll (ScrollTrigger), lissée dans la boucle de rendu ──
  const st = { target: reduce ? 1 : 0 };
  const trig = reduce ? null : ScrollTrigger.create({
    trigger: section, start: CFG.start, end: CFG.end, invalidateOnRefresh: true, refreshPriority: -2,
    onUpdate: s => { st.target = s.progress; wake(); },
  });
  if (trig) st.target = trig.progress;

  // ── fond sombre → fond clair (comme avant) ──
  let lightTl = null;
  const lightEl = section.querySelector(CFG.light.trigger);
  if (lightEl) {
    const L = CFG.light;
    lightTl = gsap.timeline({ paused: true, defaults: { duration: L.duration, ease: L.ease },
      scrollTrigger: { trigger: lightEl, start: L.at, toggleActions: 'play none none reverse', refreshPriority: -2 } })
      .to(section, { backgroundColor: L.color }, 0).to(vig, { autoAlpha: 0 }, 0);
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
  const io = new IntersectionObserver(async e => {
    if (!e[0].isIntersecting) return;
    io.disconnect();
    try { api = await init(); wake(); } catch (err) { console.error('[crown3d]', err); }
  }, { rootMargin: '150% 0px' });
  io.observe(section);

  async function init() {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
    const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
    const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');
    const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');

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

    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(CFG.model);
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
        canvas.style.transform = `translate(${(m.x * CFG.mouse.move).toFixed(2)}px,${(m.y * CFG.mouse.move).toFixed(2)}px)`;
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
