# BMW M4 Competition — 3D Scroll Experience

Fan demo: a scroll-driven WebGL commercial for the BMW M4 Competition. Not affiliated with BMW AG.

## Run locally

Serve the project over HTTP (ES modules and the 3D model need a local server):

```bash
cd /home/razzaquebasar/work/bmw-3d-experience
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000).

## Model attribution

**BMW M4 Competition M Package** by [SRT Performance](https://sketchfab.com/SRTPerformance) on Sketchfab.

Licensed under [Creative Commons Attribution 4.0 (CC-BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

## Stack

- Three.js (CDN via import map)
- GSAP + ScrollTrigger (CDN ES modules)
- Vanilla HTML / CSS / JS
