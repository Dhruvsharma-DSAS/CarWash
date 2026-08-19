# 24-Second Hub

**Live demo:** [car-wash-zeta-eight.vercel.app](https://car-wash-zeta-eight.vercel.app/)

A pitch piece for **CAR-A-THON** (ProcessFlows for Cars24): clean a car to
resale standard in a 24-second takt. Built as an interactive 3D factory-HMI
simulation in the browser — Vite + vanilla JavaScript + Three.js, no
framework, `three` is the only dependency.

## The idea

A single car cannot be fully cleaned — interior included — in 24 seconds.
Real interior work takes minutes, not seconds. So instead of one line with
equal-length stations, the hub runs two tracks joined by **Little's Law**:

```
cells needed = cell time ÷ takt
             = 360 s ÷ 24 s
             = 15
```

**Entry AI gate** (3s scan) → **15 parallel interior cells**, each running a
real 6-minute clean with a twin robot-arm rig → **merge queue** → a
**continuous 40 m exterior tunnel** (foam, wrap brushes, mitter, rinse,
coating, air-dry) admitting one car every 24 seconds → **AI exit QC**
(camera ring, ~1-in-8 reject → manual rework loop) → an **off-line ozone
bay** for odour cars that never blocks the tunnel takt.

## What's interactive

- **Cells slider** — drag active cells below 15 and watch the hub fall
  behind its own 24-second promise live: the merge queue starves, the
  verdict banner flips to "starved," and the last-output-gap metric climbs
  past takt.
- **Takt slider** (16–60s) — recomputes required cells, belt speed, and
  every derived metric live.
- **Cinematic tour** — flies the camera to each stage of the hub with a
  caption and sourced spec sheet for that specific machine. Click any stage
  in the right-hand panel to jump the tour straight there.
- **Parameters panel** — every number tagged sourced / derived / assumed,
  so nothing in the model is invented without saying so.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Project structure

```
index.html        HMI markup (panels, controls, tour UI)
src/main.js        wires scene + simulation + hub hardware + UI together
src/scene.js        renderer, camera, lights, environment map
src/car.js          procedural hatchback body, doors, wheels, paint/dirt state
src/simulation.js   the hub's queueing state machine (gate → cells → merge → tunnel → QC → rework/ozone) and derived metrics
src/stations.js     hub hardware: gate, 15 cell rigs, tunnel gear, QC ring, ozone bay
src/tour.js          cinematic camera flight between beats
src/ui.js            HMI panels: metrics, provenance, station stack, controls
src/style.css        instrument-panel styling
```

## Honesty notes

- Ozone dwell is compressed to 90s in the simulation for demo purposes; the
  real figure is 30–120 minutes.
- Reject rate (12.5%) and rework dwell are assumptions pending pilot data,
  flagged as such in the parameters panel.
- Two operators load/unload and the reject loop is manual — the hub is not
  claimed to be fully autonomous.
