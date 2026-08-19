import * as THREE from 'three';
import { createRenderer, createCamera, createControls, createSceneWithLights, createEnvironmentMap, handleResize } from './scene.js';
import { createCarGeometryKit } from './car.js';
import { createHub, updateEntryGate, updateCellRig, updateOzoneBay, updateTunnelHardware, updateQCGate } from './stations.js';
import { createSimulationState, advanceSimulation, getScaledDelta, computeMetrics, getCellAnimState, getOzoneBayAnimState, OZONE_SLOTS } from './simulation.js';
import { createTourState, updateTour } from './tour.js';
import { setupUI, updateUI } from './ui.js';
import './style.css';

const canvas = document.getElementById('scene-canvas');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = createRenderer(canvas);
const camera = createCamera();
const scene = createSceneWithLights();
const controls = createControls(camera, renderer.domElement);
createEnvironmentMap(renderer, scene);

if (!reducedMotion) {
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });
}

const geometryKit = createCarGeometryKit();
const simulationState = createSimulationState(scene, geometryKit);
const hub = createHub(scene);
const tourState = createTourState(reducedMotion);

const uiContext = {
  state: simulationState,
  tourState: tourState,
  camera: camera,
  controls: controls
};

setupUI(uiContext);

window.addEventListener('resize', () => {
  handleResize(camera, renderer);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const rawDelta = clock.getDelta();

  advanceSimulation(simulationState, rawDelta);

  const scaledDelta = getScaledDelta(simulationState, rawDelta);
  const elapsedTime = simulationState.totalElapsedSeconds;
  const metrics = computeMetrics(simulationState);

  updateEntryGate(hub.gate.refs, scaledDelta, elapsedTime, metrics.gateBusy);

  let cellIndex = 0;
  for (const rig of hub.cellRigs) {
    const animState = getCellAnimState(simulationState, cellIndex);
    updateCellRig(rig, scaledDelta, elapsedTime, animState);
    cellIndex += 1;
  }

  const bayAnimStates = [];
  for (let bayIndex = 0; bayIndex < OZONE_SLOTS; bayIndex += 1) {
    bayAnimStates.push(getOzoneBayAnimState(simulationState, bayIndex));
  }
  updateOzoneBay(hub.ozone.refs, bayAnimStates);

  updateTunnelHardware(hub.tunnel.refs, scaledDelta, elapsedTime, metrics.tunnelCarCount > 0, reducedMotion);
  updateQCGate(hub.qc.refs, elapsedTime, metrics.qcBusy, simulationState.beaconFlashSeconds);

  updateTour(tourState, camera, controls, rawDelta);
  if (!tourState.active) {
    controls.update();
  }

  updateUI(uiContext);

  renderer.render(scene, camera);
}

animate();
