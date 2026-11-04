/* Chevalier 3D — hero Webflow (Three.js r170)
   La tête suit le curseur. Réglages = ceux validés par Clément dans la page de test (2026-11-04).

   Utilisation dans Webflow :
   - un conteneur avec l'attribut data-knight3d (le canvas le remplit, fond transparent) ;
   - l'importmap de three dans le <head> de la page ;
   - <script type="module" src=".../knight3d.js"></script> avant </body> ;
   - optionnel : data-knight3d-hide sur l'image de secours du hero, masquée en fondu quand la 3D est prête.
   Le modèle et les textures sont chargés à côté de ce fichier (même dossier). */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const CFG = {
  model: new URL('./chevalier.gltf', import.meta.url).href,
  headBone: 'DEF-spine.006', neckBone: 'DEF-spine.005',
  render: { exposure: 0.55, maxPixelRatio: 2, envIntensity: 1, envRotation: 0 },
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
  shadows: { on: true, mapSize: 4096, bias: 0.0008, normalBias: 0.029, radius: 3.9, blurSamples: 21 },
  camera: { fov: 17, distance: 1.54, height: 0.35, lookY: 0.08 },
  head: { up: 28, down: 11.5, left: 44, right: 44, offsetPitch: 0, offsetYaw: 0, roll: 0, neckShare: 0.1, ease: 0.175 },
  minWidth: 768,          // en dessous (mobile), pas de 3D : on garde l'image / la séquence du hero
  fadeIn: 1.2,            // durée d'apparition du chevalier une fois chargé (s)
};

function init(host) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  RectAreaLightUniformsLib.init();

  const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  R.setClearColor(0x000000, 0);
  R.setPixelRatio(Math.min(devicePixelRatio, CFG.render.maxPixelRatio));
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = CFG.render.exposure;
  R.shadowMap.enabled = CFG.shadows.on;
  R.shadowMap.type = THREE.VSMShadowMap;
  const cv = R.domElement;
  Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', opacity: '0', transition: `opacity ${CFG.fadeIn}s ease`, pointerEvents: 'none' });
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.appendChild(cv);

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

  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(CFG.model, g => {
    const model = g.scene, aniso = R.capabilities.getMaxAnisotropy();
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
    ready = true; needsRender = true;
    requestAnimationFrame(() => {
      cv.style.opacity = '1';
      // éléments à masquer quand la 3D est prête (ex. l'image ou la séquence du hero) : attribut data-knight3d-hide
      document.querySelectorAll('[data-knight3d-hide]').forEach(el => { el.style.transition = `opacity ${CFG.fadeIn}s ease`; el.style.opacity = '0'; });
    });
    host.dispatchEvent(new CustomEvent('knight3d:ready', { bubbles: true }));
  }, undefined, err => console.error('[knight3d] modèle non chargé', err));

  // ── suivi du curseur ──
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener('pointermove', e => { target.x = e.clientX / innerWidth * 2 - 1; target.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  document.addEventListener('mouseleave', () => { target.x = 0; target.y = 0; });

  // ── boucle : ne dessine que si le hero est visible et que la tête bouge ──
  let visible = true, needsRender = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(host);
  new ResizeObserver(() => { size(); if (ready) placeCamera(); }).observe(host);

  const q = new THREE.Quaternion(), eu = new THREE.Euler(), D = Math.PI / 180, h = CFG.head;
  function tick() {
    requestAnimationFrame(tick);
    if (!ready || !visible || document.hidden) return;
    const dx = target.x - cur.x, dy = target.y - cur.y;
    if (!reduce && (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4)) {
      cur.x += dx * h.ease; cur.y += dy * h.ease;
      const pitch = (cur.y > 0 ? cur.y * h.down : cur.y * h.up) + h.offsetPitch;
      const yaw = (cur.x > 0 ? cur.x * h.right : cur.x * h.left) + h.offsetYaw;
      const roll = -cur.x * h.roll, hs = 1 - h.neckShare, ns = h.neckShare;
      eu.set(pitch * hs * D, yaw * hs * D, roll * hs * D); head.quaternion.copy(baseH).multiply(q.setFromEuler(eu));
      eu.set(pitch * ns * D, yaw * ns * D, roll * ns * D); neck.quaternion.copy(baseN).multiply(q.setFromEuler(eu));
      needsRender = true;
    }
    if (needsRender) { R.render(scene, cam); needsRender = false; }
  }
  tick();
}

function start() {
  const host = document.querySelector('[data-knight3d]');
  if (!host || innerWidth < CFG.minWidth) return;
  try { init(host); } catch (e) { console.error('[knight3d]', e); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
