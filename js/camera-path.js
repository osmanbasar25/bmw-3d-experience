import * as THREE from 'three';

/** @type {{ id: string, progress: number, position: [number, number, number], lookAt: [number, number, number], fov: number }[]} */
export const CAMERA_KEYFRAMES = [
  {
    id: 'hero',
    progress: 0,
    position: [3.2, 1.35, 5.2],
    lookAt: [0, 0.55, 0],
    fov: 40,
  },
  {
    id: 'grille',
    progress: 0.14,
    position: [0.15, 0.55, 3.1],
    lookAt: [0, 0.45, 1.8],
    fov: 32,
  },
  {
    id: 'headlights',
    progress: 0.28,
    position: [2.0, 0.55, 2.4],
    lookAt: [1.1, 0.5, 1.6],
    fov: 30,
  },
  {
    id: 'wheels',
    progress: 0.42,
    position: [2.4, 0.25, 0.4],
    lookAt: [1.0, 0.35, 0.3],
    fov: 34,
  },
  {
    id: 'side',
    progress: 0.58,
    position: [0.2, 1.15, 5.8],
    lookAt: [0, 0.7, 0],
    fov: 38,
  },
  {
    id: 'rear',
    progress: 0.74,
    position: [-2.6, 1.15, -4.8],
    lookAt: [0, 0.7, -1.5],
    fov: 36,
  },
  {
    id: 'cta',
    progress: 1.0,
    position: [3.0, 1.5, 5.0],
    lookAt: [0, 0.6, 0],
    fov: 42,
  },
];

const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();
const _lookA = new THREE.Vector3();
const _lookB = new THREE.Vector3();
const _outPos = new THREE.Vector3();
const _outLook = new THREE.Vector3();

/**
 * Sample camera pose along the storyboard keyframes.
 * @param {number} progress
 * @returns {{ position: THREE.Vector3, lookAt: THREE.Vector3, fov: number }}
 */
export function sampleCamera(progress) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  const frames = CAMERA_KEYFRAMES;

  if (p <= frames[0].progress) {
    _outPos.set(...frames[0].position);
    _outLook.set(...frames[0].lookAt);
    return { position: _outPos.clone(), lookAt: _outLook.clone(), fov: frames[0].fov };
  }

  const last = frames[frames.length - 1];
  if (p >= last.progress) {
    _outPos.set(...last.position);
    _outLook.set(...last.lookAt);
    return { position: _outPos.clone(), lookAt: _outLook.clone(), fov: last.fov };
  }

  let i = 0;
  while (i < frames.length - 1 && frames[i + 1].progress < p) i += 1;

  const a = frames[i];
  const b = frames[i + 1];
  const span = b.progress - a.progress;
  const t = span > 0 ? (p - a.progress) / span : 0;

  _posA.set(...a.position);
  _posB.set(...b.position);
  _lookA.set(...a.lookAt);
  _lookB.set(...b.lookAt);

  _outPos.lerpVectors(_posA, _posB, t);
  _outLook.lerpVectors(_lookA, _lookB, t);
  const fov = THREE.MathUtils.lerp(a.fov, b.fov, t);

  return {
    position: _outPos.clone(),
    lookAt: _outLook.clone(),
    fov,
  };
}
