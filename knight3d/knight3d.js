/* Chevalier 3D — hero Webflow (Three.js r170)
   La tête suit le curseur. Réglages = ceux validés par Clément dans la page de test (2026-11-04).

   Utilisation dans Webflow :
   - un conteneur avec l'attribut data-knight3d (le canvas le remplit, fond transparent) ;
   - l'importmap de three dans le <head> de la page ;
   - <script type="module" src=".../knight3d.js"></script> avant </body> ;
   - optionnel : data-knight3d-hide sur l'image de secours du hero, masquée en fondu quand la 3D est prête.
   Le modèle et les textures sont chargés à côté de ce fichier (même dossier).

   Ordinateurs trop faibles (rendu logiciel, ou moins de ~28 images/s mesurées au premier chargement) :
   le chevalier est remplacé par une image fixe (poster.webp, même cadrage) ; le résultat est mémorisé
   dans le navigateur (localStorage "knight3d-perf"), les visites suivantes affichent l'image directement.
   window.Knight3DPrefetch() : télécharge Three.js et le modèle en avance (appelé depuis les autres pages). */


const CFG = {
  model: new URL('./chevalier.gltf', import.meta.url).href,
  poster: new URL('./poster.webp', import.meta.url).href,   // image de remplacement (rendu du chevalier, fond transparent)
  bench: { frames: 12, maxMs: 35 },   // test au 1er chargement : image médiane > 35 ms (moins de ~28 images/s) → image fixe à la place de la 3D
  headBone: 'DEF-spine.006', neckBone: 'DEF-spine.005',
  render: { exposure: 0.55, maxPixelRatio: 1.5, envIntensity: 1, envRotation: 0 },
  armor:  { tint: '#5e5e5e', roughness: 1.2, normalScale: 1.38, metalness: 0.71 },
  crown:  { tint: '#ffffff', roughness: 1.8, normalScale: 1.38 },
  helmet: { tint: '#d1d1d1', brightness: 2.8, roughness: 1.47, metalness: 0.75, normalScale: 1.67 },
  lights: {
    key:   { color: '#9dbcfb', intensity: 71.8, x: -0.4, y: 1.9, z: 0.9, angle: 1.5, penumbra: 0.7 },
    rimL:  { color: '#a8c2ff', intensity: 2.2, x: -2.65, y: -0.75, z: -4 },
    rimR:  { color: '#bcd0ff', intensity: 11.4, x: 2.9, y: 1.05, z: -4 },
    top:   { color: '#1a2c89', intensity: 25.2, x: -0.3, y: 1.45, z: -2.55 },
    front: { color: '#9dbcfb', intensity: 4, x: -0.2, y: 0.95, z: 0.4, width: 3.07, height: 3.22 },
  },
  shadows: { on: true, mapSize: 2048, bias: 0.0008, normalBias: 0.029, radius: 3.9, blurSamples: 21 },
  camera: { fov: 17, distance: 1.54, height: 0.35, lookY: 0.08 },
  head: { up: 28, down: 11.5, left: 44, right: 44, offsetPitch: 0, offsetYaw: 0, roll: 0, neckShare: 0.1, ease: 0.175 },
  minWidth: 768,          // en dessous (mobile), pas de 3D : on garde l'image / la séquence du hero
  fadeIn: 1.2,            // durée d'apparition du chevalier une fois chargé (s)
  vignette: { on: false, src: new URL('./vignette.webp', import.meta.url).href, opacity: 1 },   // désactivé : la vignette est gérée à part dans Webflow (vignette-arrivee.html)
  // arrivée : tête baissée qui remonte doucement (angle en degrés, durée et attente en secondes, part du cou dans le mouvement)
  rise: { on: true, angle: 30, delay: 0.3, duration: 3, neckShare: 0.4 },
  intro: { on: false, delay: 0.2, duration: 2.8, startExposure: 0.03 },   // désactivé : l'arrivée est gérée à part dans Webflow
};

/* Réglages copiés depuis la page de test (bouton « Copier les réglages ») et collés dans Webflow :
   <script type="application/json" id="knight3d-settings"> …JSON… </script>
   Ils remplacent les valeurs ci-dessus, sans toucher à ce fichier. */
function applyPanelSettings() {
  const el = document.getElementById('knight3d-settings');
  let P = window.Knight3DSettings;   // Barba : réglages passés par le code global (window.Knight3DSettings)
  if (!P) {
    if (!el) return;
    try { P = JSON.parse(el.textContent); } catch (e) { console.error('[knight3d] réglages illisibles (JSON invalide)', e); return; }
  }
  const pick = (dst, src) => { if (src) for (const k in dst) if (src[k] !== undefined && typeof dst[k] !== 'object') dst[k] = src[k]; };
  if (P.render) {
    pick(CFG.render, P.render);
    if (P.render.pixelRatio !== undefined) CFG.render.maxPixelRatio = P.render.pixelRatio;
    if (P.render.toneMapping) CFG.render.toneMapping = P.render.toneMapping;
  }
  for (const k of ['armor', 'crown', 'helmet', 'camera', 'head', 'rise']) pick(CFG[k], P[k]);
  if (P.lights) for (const k of Object.keys(CFG.lights)) if (P.lights[k]) {
    pick(CFG.lights[k], P.lights[k]);
    if (P.lights[k].on === false) CFG.lights[k].intensity = 0;
  }
  if (P.lights && P.lights.ambient) CFG.lights.ambient = P.lights.ambient;
  if (P.shadows) { pick(CFG.shadows, P.shadows); CFG.shadows.type = P.shadows.type; }
  // plafonds de performance (le panneau de réglages allait jusqu'à ×2 et 4096)
  CFG.render.maxPixelRatio = Math.min(CFG.render.maxPixelRatio, 1.5);
  CFG.shadows.mapSize = Math.min(CFG.shadows.mapSize, 2048);
}

/* ── Ordinateurs faibles : image fixe ── */
const PERF_KEY = 'knight3d-perf';
function getPerf() { try { return localStorage.getItem(PERF_KEY); } catch (e) { return null; } }
function setPerf(v) { try { localStorage.setItem(PERF_KEY, v); } catch (e) {} }
function setLow() { setPerf('low'); }
function isSoftware(R) {
  const gl = R.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
}
// même cadrage que la 3D : la caméra garde son angle vertical, donc l'image suit la hauteur du conteneur, centrée
function poster(host) {
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const img = new Image();
  img.alt = ''; img.decoding = 'async';
  Object.assign(img.style, { position: 'absolute', top: '0', left: '50%', height: '100%', width: 'auto', maxWidth: 'none',
    transform: 'translateX(-50%)', opacity: '0', transition: `opacity ${CFG.fadeIn}s ease`, pointerEvents: 'none' });
  img.onload = () => {
    img.style.opacity = '1';
    document.querySelectorAll('[data-knight3d-hide]').forEach(el => { el.style.transition = `opacity ${CFG.fadeIn}s ease`; el.style.opacity = '0'; });
    host.dispatchEvent(new CustomEvent('knight3d:ready', { bubbles: true }));
  };
  img.src = CFG.poster;
  host.appendChild(img);
  return () => img.remove();
}

/* ── Téléchargement en avance (depuis les autres pages) : modèle + textures dans le cache du navigateur ── */
let prefetched = false;
async function prefetch() {
  if (prefetched || getPerf() === 'low' || innerWidth < CFG.minWidth || (navigator.connection && navigator.connection.saveData)) return;
  prefetched = true;
  try {
    import('./knight3d-3d.js').catch(() => {});   // Three.js aussi
    const res = await fetch(CFG.model, { priority: 'low' }), g = await res.json();
    const urls = [].concat(g.buffers || [], g.images || []).filter(x => x.uri).map(x => new URL(x.uri, CFG.model).href);
    for (const u of urls) await fetch(u, { priority: 'low' });   // un par un, sans gêner la page
  } catch (e) {}
}
window.Knight3DPrefetch = prefetch;
let stop = null, token = 0;
function start() {
  if (stop) { stop(); stop = null; }
  const host = document.querySelector('[data-knight3d]'), my = ++token;
  if (!host || innerWidth < CFG.minWidth) return;
  applyPanelSettings();
  if (getPerf() === 'low') { stop = poster(host); return; }   // image directement : Three.js n'est même pas téléchargé
  import('./knight3d-3d.js').then(m => {
    if (my !== token) return;   // page quittée entre-temps
    const K = { CFG, getPerf, setPerf, setLow, isSoftware, poster, fallback: () => { if (my === token) stop = poster(host); } };
    stop = m.init(host, K);
  }).catch(e => console.error('[knight3d]', e));
}
// Barba : window.Knight3DStart() relance le chevalier sur la nouvelle page, window.Knight3DStop() l'arrête
window.Knight3DStart = start;
window.Knight3DStop = () => { token++; if (stop) { stop(); stop = null; } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
