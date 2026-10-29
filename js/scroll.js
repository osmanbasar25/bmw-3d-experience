import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js';
import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js';
import * as THREE from 'three';
import { sampleCamera } from './camera-path.js';

gsap.registerPlugin(ScrollTrigger);

let scrollProgress = 0;
let scrollTriggerInstance = null;
let onProgressCb = null;
const lookTarget = new THREE.Vector3();
let lookInitialized = false;

function parseRange(attr) {
  if (!attr) return null;
  const parts = attr.split(',').map((s) => Number.parseFloat(s.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  return { start: parts[0], end: parts[1] };
}

function syncSectionOverlays(progress) {
  const sections = document.querySelectorAll('[data-section]');
  let activeSection = null;
  let activeMid = Infinity;

  sections.forEach((el) => {
    const range = parseRange(el.getAttribute('data-range'));
    const active = range && progress >= range.start && progress <= range.end;
    el.classList.toggle('is-active', Boolean(active));
    if (active && range) {
      const mid = (range.start + range.end) / 2;
      if (Math.abs(progress - mid) < Math.abs(progress - activeMid)) {
        activeMid = mid;
        activeSection = el;
      }
    }
  });

  // Nearest section if none in range
  if (!activeSection && sections.length) {
    let best = null;
    let bestDist = Infinity;
    sections.forEach((el) => {
      const range = parseRange(el.getAttribute('data-range'));
      if (!range) return;
      const mid = (range.start + range.end) / 2;
      const dist = Math.abs(progress - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = el;
      }
    });
    activeSection = best;
  }

  const chapters = document.querySelectorAll('[data-chapter]');
  const activeId = activeSection?.getAttribute('data-section') ?? null;

  chapters.forEach((dot) => {
    const chapterId = dot.getAttribute('data-chapter');
    let isActive = false;

    if (activeId != null && chapterId === activeId) {
      isActive = true;
    } else if (!activeId && sections.length) {
      // Fallback: nearest section by chapter id matching data-section
      let bestDist = Infinity;
      let nearestId = null;
      sections.forEach((el) => {
        const range = parseRange(el.getAttribute('data-range'));
        if (!range) return;
        const mid = (range.start + range.end) / 2;
        const dist = Math.abs(progress - mid);
        if (dist < bestDist) {
          bestDist = dist;
          nearestId = el.getAttribute('data-section');
        }
      });
      isActive = chapterId === nearestId;
    }

    dot.classList.toggle('is-active', isActive);
    if (isActive) {
      dot.setAttribute('aria-current', 'true');
    } else {
      dot.removeAttribute('aria-current');
    }
  });
}

function setProgress(p, notify = true) {
  scrollProgress = THREE.MathUtils.clamp(p, 0, 1);
  syncSectionOverlays(scrollProgress);
  if (notify && typeof onProgressCb === 'function') {
    onProgressCb(scrollProgress);
  }
}

export function getScrollProgress() {
  return scrollProgress;
}

/**
 * @param {{ camera: THREE.Camera, getTargetState?: (p: number) => { position: THREE.Vector3, lookAt: THREE.Vector3, fov: number }, onProgress?: (p: number) => void, reducedMotion?: boolean }} options
 */
export function initScroll({ camera, getTargetState, onProgress, reducedMotion } = {}) {
  onProgressCb = onProgress ?? null;
  lookInitialized = false;

  if (scrollTriggerInstance) {
    scrollTriggerInstance.kill();
    scrollTriggerInstance = null;
  }

  if (reducedMotion) {
    setProgress(0);
    document.querySelectorAll('[data-section]').forEach((el) => {
      const id = el.getAttribute('data-section');
      el.classList.toggle('is-active', id === 'hero');
    });
    document.querySelectorAll('[data-chapter]').forEach((dot) => {
      dot.classList.toggle('is-active', dot.getAttribute('data-chapter') === 'hero');
    });
    if (typeof onProgressCb === 'function') onProgressCb(0);

    return {
      getScrollProgress,
      tickCamera(cam, dt) {
        tickCameraInternal(cam ?? camera, dt, getTargetState, 8);
      },
      kill() {
        onProgressCb = null;
      },
    };
  }

  scrollTriggerInstance = ScrollTrigger.create({
    trigger: '#scroll-track',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.85,
    onUpdate(self) {
      setProgress(self.progress);
    },
  });

  setProgress(scrollTriggerInstance.progress ?? 0);

  return {
    getScrollProgress,
    tickCamera(cam, dt) {
      tickCameraInternal(cam ?? camera, dt, getTargetState, 8);
    },
    kill() {
      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
        scrollTriggerInstance = null;
      }
      onProgressCb = null;
    },
  };
}

/**
 * @param {THREE.PerspectiveCamera} camera
 * @param {number} dt
 * @param {((p: number) => { position: THREE.Vector3, lookAt: THREE.Vector3, fov: number }) | undefined} getTargetState
 * @param {number} [dampFactor=8]
 */
function tickCameraInternal(camera, dt, getTargetState, dampFactor = 8) {
  if (!camera) return;

  const progress = scrollProgress;
  const sample =
    typeof getTargetState === 'function' ? getTargetState(progress) : sampleCamera(progress);

  const lambda = dampFactor;

  if (!lookInitialized) {
    camera.position.copy(sample.position);
    lookTarget.copy(sample.lookAt);
    if ('fov' in camera && typeof sample.fov === 'number') {
      camera.fov = sample.fov;
      camera.updateProjectionMatrix();
    }
    lookInitialized = true;
  } else {
    camera.position.x = THREE.MathUtils.damp(camera.position.x, sample.position.x, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, sample.position.y, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, sample.position.z, lambda, dt);

    lookTarget.x = THREE.MathUtils.damp(lookTarget.x, sample.lookAt.x, lambda, dt);
    lookTarget.y = THREE.MathUtils.damp(lookTarget.y, sample.lookAt.y, lambda, dt);
    lookTarget.z = THREE.MathUtils.damp(lookTarget.z, sample.lookAt.z, lambda, dt);

    if ('fov' in camera && typeof sample.fov === 'number') {
      camera.fov = THREE.MathUtils.damp(camera.fov, sample.fov, lambda, dt);
      camera.updateProjectionMatrix();
    }
  }

  camera.lookAt(lookTarget);
}

/**
 * Damp camera toward the sampled path pose for current scroll progress.
 * @param {THREE.PerspectiveCamera} camera
 * @param {number} dtOrDamp
 * @param {number} [dt]
 */
export function tickCamera(camera, dtOrDamp, dt) {
  if (dt !== undefined) {
    tickCameraInternal(camera, dt, undefined, dtOrDamp);
  } else {
    tickCameraInternal(camera, dtOrDamp, undefined, 8);
  }
}
