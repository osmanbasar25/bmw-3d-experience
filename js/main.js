/**
 * BMW M4 scroll commercial — boot, loader, render loop.
 */
import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js';
import { createScene } from './scene.js';
import { initScroll } from './scroll.js';
import { CAMERA_KEYFRAMES } from './camera-path.js';

const canvas = document.querySelector('#webgl');
const loaderEl = document.querySelector('#loader');
const loaderBar = document.querySelector('#loader-bar');
const loaderPct = document.querySelector('#loader-pct');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setLoader(progress) {
  const p = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  if (loaderBar) loaderBar.style.width = `${p}%`;
  if (loaderPct) loaderPct.textContent = `${p}%`;
}

function wireChapterRail() {
  const track = document.querySelector('#scroll-track');
  if (!track) return;

  document.querySelectorAll('[data-chapter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-chapter');
      const section = document.querySelector(`[data-section="${id}"]`);
      if (!section) return;

      if (reducedMotion) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      const frame = CAMERA_KEYFRAMES.find((k) => k.id === id);
      const progress = frame ? frame.progress : 0;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      window.scrollTo({ top: progress * maxScroll, behavior: 'smooth' });
    });
  });
}

async function boot() {
  setLoader(0.05);

  const { scene, camera, renderer, clock, resize, dispose } = await createScene(canvas, {
    onProgress: (p) => setLoader(0.05 + p * 0.9),
  });

  setLoader(1);

  const scrollApi = initScroll({
    camera,
    reducedMotion,
    onProgress: () => {},
  });

  wireChapterRail();
  resize();
  window.addEventListener('resize', () => {
    resize();
    ScrollTrigger.refresh();
  });
  requestAnimationFrame(() => ScrollTrigger.refresh());

  if (loaderEl) {
    loaderEl.classList.add('is-hidden');
    loaderEl.setAttribute('aria-busy', 'false');
    window.setTimeout(() => loaderEl.remove(), 900);
  }

  let raf = 0;
  let running = true;

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    scrollApi.tickCamera(camera, dt);
    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else {
      running = true;
      clock.getDelta();
      frame();
    }
  });

  frame();

  window.addEventListener('beforeunload', () => {
    running = false;
    cancelAnimationFrame(raf);
    scrollApi.kill();
    dispose();
  });
}

boot().catch((err) => {
  console.error(err);
  if (loaderPct) loaderPct.textContent = 'Failed to load';
  if (loaderEl) loaderEl.classList.add('is-error');
});
