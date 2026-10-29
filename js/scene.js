/**
 * Stub note: model path assets/models/bmw.glb
 * (loaded as /assets/models/bmw.glb)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = new URL('../assets/models/bmw.glb', import.meta.url).href;
const TARGET_HORIZONTAL_SIZE = 4.5;

/**
 * Create the BMW studio scene. Resolves after the GLB has loaded.
 * @param {HTMLCanvasElement} canvas
 * @param {{ onProgress?: (p: number) => void }} [options]
 * @returns {Promise<{ scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, car: THREE.Group, clock: THREE.Clock, resize: () => void, dispose: () => void }>}
 */
export async function createScene(canvas, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0c);
  scene.fog = new THREE.FogExp2(0x0a0a0c, 0.035);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(3.2, 1.4, 5.5);
  camera.lookAt(0, 0.6, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  // Dark studio lighting
  const hemi = new THREE.HemisphereLight(0xb0b8c8, 0x1a1a1e, 0.45);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(4.5, 8, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0002;
  scene.add(key);

  const fill = new THREE.PointLight(0x8aa0c0, 0.35, 40, 2);
  fill.position.set(-3.5, 2.2, -2);
  scene.add(fill);

  // Subtle reflective dark ground
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0e0e12,
    metalness: 0.85,
    roughness: 0.28,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const clock = new THREE.Clock();
  const car = new THREE.Group();
  scene.add(car);

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  }

  resize();

  try {
    const gltf = await loadGLTF(MODEL_URL, onProgress);
    const model = gltf.scene;

    normalizeHorizontalSize(model, TARGET_HORIZONTAL_SIZE);
    centerOnXZ(model);
    seatOnGround(model);

    model.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if (!mat) continue;
        polishMaterial(mat, obj.name || mat.name || '');
      }
    });

    car.add(model);
  } catch (err) {
    console.error('Failed to load BMW model:', MODEL_URL, err);
  }

  function dispose() {
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (!mat) continue;
          for (const key of Object.keys(mat)) {
            const value = mat[key];
            if (value && value.isTexture) value.dispose();
          }
          mat.dispose();
        }
      }
    });
    renderer.dispose();
  }

  return { scene, camera, renderer, car, clock, resize, dispose };
}

function loadGLTF(url, onProgress) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      resolve,
      (event) => {
        if (!onProgress || !event.total) return;
        onProgress(event.loaded / event.total);
      },
      reject,
    );
  });
}

/** Scale so longest horizontal (XZ) extent ≈ targetSize. */
function normalizeHorizontalSize(root, targetSize) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const horizontal = Math.max(size.x, size.z);
  if (!Number.isFinite(horizontal) || horizontal <= 0) return;
  const scale = targetSize / horizontal;
  root.scale.multiplyScalar(scale);
}

/** Center model on XZ using Box3 (keeps Y for ground seating). */
function centerOnXZ(root) {
  const box = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
}

/** Place wheels on the ground plane (y = 0). */
function seatOnGround(root) {
  const box = new THREE.Box3().setFromObject(root);
  root.position.y -= box.min.y;
}

/**
 * Premium studio materials; glass/window names become transparent.
 * @param {THREE.Material} mat
 * @param {string} nameHint
 */
function polishMaterial(mat, nameHint) {
  const name = String(nameHint).toLowerCase();
  const isGlass = /glass|window/.test(name);

  if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
    if (isGlass) {
      mat.transparent = true;
      mat.opacity = Math.min(mat.opacity ?? 1, 0.35);
      mat.metalness = 0;
      mat.roughness = 0.05;
      if ('transmission' in mat) mat.transmission = Math.max(mat.transmission || 0, 0.85);
      mat.depthWrite = false;
      mat.side = THREE.DoubleSide;
    } else {
      // Slightly richer paint / body defaults without wiping authored maps
      if (mat.metalness < 0.15 && mat.roughness > 0.6) {
        mat.metalness = 0.55;
        mat.roughness = 0.35;
      } else {
        mat.metalness = THREE.MathUtils.clamp(mat.metalness ?? 0.5, 0.2, 0.95);
        mat.roughness = THREE.MathUtils.clamp(mat.roughness ?? 0.4, 0.08, 0.75);
      }
      mat.envMapIntensity = mat.envMapIntensity ?? 1.1;
    }
    mat.needsUpdate = true;
    return;
  }

  // Non-PBR fallback: encourage transparency for glass names
  if (isGlass) {
    mat.transparent = true;
    mat.opacity = Math.min(mat.opacity ?? 1, 0.4);
    mat.depthWrite = false;
    mat.needsUpdate = true;
  }
}
